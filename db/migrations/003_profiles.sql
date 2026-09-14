-- ---------------------------------------------------------------- profiles
-- User Profiles table for LedgerSentinel analysts and customers.
-- Linked 1:1 with Supabase Auth (auth.users).

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) >= 1),
  username    text not null unique check (char_length(username) between 3 and 30 and username ~ '^[a-zA-Z0-9_-]+$'),
  email       text not null unique,
  role        text not null default 'Fraud Operations Analyst',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Case-insensitive index for fast username lookup
create unique index if not exists idx_profiles_username_lower on public.profiles (lower(username));
create unique index if not exists idx_profiles_email_lower on public.profiles (lower(email));

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies:
-- 1. Users can view their own profile
create policy profiles_select_self on public.profiles
  for select
  using (auth.uid() = id);

-- 2. Staff can view all profiles
create policy profiles_select_staff on public.profiles
  for select
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', 'customer') in ('analyst', 'admin')
  );

-- 3. Users can update their own profile
create policy profiles_update_self on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4. Insert allowed for authenticated user's own profile
create policy profiles_insert_self on public.profiles
  for insert
  with check (auth.uid() = id);

-- Safe lookup function for username login (Security Definer)
-- Returns associated email for a username without leaking other profile fields
create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email
  from public.profiles
  where lower(username) = lower(trim(p_username))
  limit 1;

  return v_email;
end;
$$;

-- Grant execution to anon and authenticated for login lookup
grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- Automatic trigger to populate public.profiles on auth.users creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_full_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));

  -- Ensure username is valid format
  v_username := regexp_replace(v_username, '[^a-zA-Z0-9_-]', '', 'g');
  if length(v_username) < 3 then
    v_username := v_username || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into public.profiles (id, full_name, username, email, role)
  values (
    new.id,
    v_full_name,
    v_username,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'Fraud Operations Analyst')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
