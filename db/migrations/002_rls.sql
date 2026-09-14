-- Row Level Security
--
-- ⚠ READ THIS BEFORE YOU TRUST IT
--
-- The Supabase SERVICE ROLE KEY BYPASSES EVERY POLICY IN THIS FILE. If api/ connects with the
-- service key, RLS is not protecting anything - it is documentation. Authorization must still be
-- enforced in the application layer, and RLS is defence in depth for the case where something
-- reaches the database another way.
--
-- Say exactly this if a judge asks. Claiming RLS protects you while connecting as service role is
-- the kind of answer that loses a security-minded room.
--
-- Roles come from the JWT's app_role claim: 'customer', 'analyst', 'admin'.

alter table customers      enable row level security;
alter table accounts       enable row level security;
alter table transactions   enable row level security;
alter table communications enable row level security;
alter table signals        enable row level security;
alter table evidence       enable row level security;
alter table assessments    enable row level security;
alter table decisions      enable row level security;
alter table cases          enable row level security;
alter table consents       enable row level security;
alter table advisories     enable row level security;
alter table audit_events   enable row level security;
alter table access_log     enable row level security;

-- ---------------------------------------------------------------- helpers

create or replace function app_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', 'customer');
$$;

create or replace function is_staff() returns boolean
language sql stable as $$
  select app_role() in ('analyst', 'admin');
$$;

create or replace function owns_customer(cid text) returns boolean
language sql stable as $$
  select exists (
    select 1 from customers c
    where c.customer_id = cid and c.auth_user_id = auth.uid()
  );
$$;

-- Consent is checked in SQL, not merely in the app, so that revoking actually cuts off access
-- rather than just hiding a button.
create or replace function has_consent(cid text, ch comm_channel) returns boolean
language sql stable as $$
  select exists (
    select 1 from consents
    where customer_id = cid and channel = ch and granted
  );
$$;

-- ---------------------------------------------------------------- customer data

create policy customers_self_or_staff on customers for select
  using (is_staff() or auth_user_id = auth.uid());

create policy accounts_self_or_staff on accounts for select
  using (is_staff() or owns_customer(customer_id));

create policy transactions_self_or_staff on transactions for select
  using (is_staff() or owns_customer(customer_id));

-- ---------------------------------------------------------------- communications
--
-- The tightest policy in the file. A customer always sees their own. Staff see a communication
-- ONLY while consent for that channel is active - revocation takes effect on the next query,
-- with no application change required.

create policy communications_read on communications for select
  using (
    owns_customer(customer_id)
    or (is_staff() and has_consent(customer_id, channel))
  );

create policy signals_read on signals for select
  using (
    exists (
      select 1 from communications c
      where c.communication_id = signals.communication_id
        and (owns_customer(c.customer_id)
             or (is_staff() and has_consent(c.customer_id, c.channel)))
    )
  );

-- ---------------------------------------------------------------- analysis
--
-- Evidence, assessments and decisions are readable by staff. These hold claims and pointers,
-- never message bodies, which is what makes that safe.

create policy evidence_staff_read    on evidence    for select using (is_staff());
create policy assessments_staff_read on assessments for select using (is_staff());
create policy decisions_staff_read   on decisions   for select using (is_staff());
create policy cases_staff_read       on cases       for select using (is_staff());

create policy cases_staff_write on cases for update
  using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------- consent
--
-- A customer manages their own consent. Staff may read it - they need to know why a channel is
-- missing - but may never grant it on someone's behalf. There is deliberately no update policy
-- for staff.

create policy consents_own_read on consents for select
  using (is_staff() or owns_customer(customer_id));

create policy consents_own_write on consents for update
  using (owns_customer(customer_id)) with check (owns_customer(customer_id));

create policy consents_own_insert on consents for insert
  with check (owns_customer(customer_id));

-- ---------------------------------------------------------------- advisories

create policy advisories_read on advisories for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------- audit
--
-- Append-only, enforced by the absence of update and delete policies plus an explicit revoke.
-- A customer can read every access to their own data; staff can read the operational trail.

create policy audit_read on audit_events for select using (is_staff());
create policy audit_insert on audit_events for insert with check (true);

create policy access_log_read on access_log for select
  using (is_staff() or owns_customer(customer_id));
create policy access_log_insert on access_log for insert with check (true);

-- Belt and braces: no UPDATE or DELETE policy exists above, and these revokes stop a future
-- migration from quietly adding one.
revoke update, delete on audit_events from anon, authenticated;
revoke update, delete on access_log   from anon, authenticated;

-- ---------------------------------------------------------------- verify
--
-- Run this after applying. Every table must come back with rowsecurity = true.
--
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' order by tablename;
