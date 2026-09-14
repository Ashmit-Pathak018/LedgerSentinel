-- LedgerSentinel schema
--
-- Run in the Supabase SQL editor, or: supabase db push
--
-- The frozen contracts are enforced here as CHECK constraints, not only in Python. If someone
-- bypasses the API and writes directly, an ESCALATE without human_required still fails, and a
-- decision with no rationale still fails. Defence in depth, and it costs nothing.
--
-- Rule 7 shapes this schema: there is no column anywhere that holds a message body. Communications
-- store metadata plus a short redacted excerpt, and evidence stores a claim plus a pointer. The
-- corpus of someone's messages cannot exist here because there is nowhere to put it.

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ---------------------------------------------------------------- enums

create type action_type as enum ('APPROVE', 'VERIFY', 'COOL_OFF', 'HOLD', 'ESCALATE');
create type identity_assurance as enum ('NONE', 'BASIC', 'VERIFIED', 'STRONG');
create type source_type as enum ('communication', 'transaction', 'advisory', 'identity');
create type case_status as enum ('open', 'verifying', 'awaiting_customer', 'resolved', 'closed');
create type comm_channel as enum ('sms', 'email', 'chat', 'call');

-- The eight frozen scam-intent labels. Adding a ninth is a contract change.
create type signal_type as enum (
  'urgency', 'authority_impersonation', 'secrecy_request', 'remote_access_request',
  'payment_redirect', 'otp_request', 'threat', 'investment_lure'
);

-- ---------------------------------------------------------------- core

create table customers (
  customer_id        text primary key,
  auth_user_id       uuid references auth.users (id) on delete set null,
  age_band           text,
  account_age_days   integer check (account_age_days >= 0),
  identity_assurance identity_assurance not null default 'BASIC',
  normal_activity    text,
  created_at         timestamptz not null default now()
);

create table accounts (
  account_id      text primary key,
  customer_id     text not null references customers (customer_id) on delete cascade,
  balance_band    text,
  country         text,
  normal_activity text,
  created_at      timestamptz not null default now()
);

create table transactions (
  transaction_id         text primary key,
  account_id             text references accounts (account_id) on delete cascade,
  customer_id            text not null references customers (customer_id) on delete cascade,
  amount                 numeric(14, 2) not null check (amount > 0),
  currency               char(3) not null,
  destination_country    char(2),
  destination_ref        text,
  occurred_at            timestamptz not null,
  location               text,
  device                 text,
  first_time_beneficiary boolean not null default false,
  created_at             timestamptz not null default now()
);

create index on transactions (customer_id, occurred_at desc);

-- Communications. Note what is absent: the message body.
create table communications (
  communication_id   text primary key,
  customer_id        text not null references customers (customer_id) on delete cascade,
  channel            comm_channel not null,
  occurred_at        timestamptz not null,

  -- Short, already-redacted excerpt for the analyst view. Capped deliberately: this is a quote,
  -- not a transcript. Redaction runs before anything is written here (rule 6).
  redacted_excerpt   text check (char_length(redacted_excerpt) <= 400),
  redaction_applied  text[] not null default '{}',

  -- Rule 7. Evidence keeps a claim and a pointer; the source text does not outlive its purpose.
  retention_expires_at timestamptz not null default now() + interval '30 days',
  created_at         timestamptz not null default now()
);

create index on communications (customer_id, occurred_at desc);

-- ---------------------------------------------------------------- analysis

create table signals (
  id              bigserial primary key,
  communication_id text not null references communications (communication_id) on delete cascade,
  signal_type     signal_type not null,
  value           double precision not null check (value between 0 and 1),
  confidence      double precision not null check (confidence between 0 and 1),
  evidence_span   int[],
  redacted_quote  text check (char_length(redacted_quote) <= 200),
  model_version   text not null,
  created_at      timestamptz not null default now()
);

create table evidence (
  evidence_id    text primary key check (evidence_id like 'ev\_%'),
  source_type    source_type not null,
  source_ref     text not null,
  claim          text not null check (char_length(claim) between 1 and 400),
  confidence     double precision not null check (confidence between 0 and 1),
  occurred_at    timestamptz not null,
  signal_refs    text[] not null default '{}',
  redacted_quote text check (char_length(redacted_quote) <= 200),
  critical       boolean not null default false,
  created_at     timestamptz not null default now()
);

create table assessments (
  assessment_id            text primary key check (assessment_id like 'as\_%'),
  transaction_id           text not null references transactions (transaction_id) on delete cascade,

  -- Rule 2. Two columns, two meanings, two types. They are never combined.
  risk_score               smallint not null check (risk_score between 0 and 100),
  confidence               double precision not null check (confidence between 0 and 1),

  -- Never show a risk score without the factors behind it (rule 4).
  factors                  text[] not null check (array_length(factors, 1) >= 1),
  evidence_ids             text[] not null default '{}',
  identity_assurance       identity_assurance,
  critical_evidence_present boolean not null default false,
  degraded                 boolean not null default false,
  model_version            text not null,
  created_at               timestamptz not null default now()
);

create table decisions (
  decision_id         text primary key check (decision_id like 'dec\_%'),
  transaction_id      text not null references transactions (transaction_id) on delete cascade,
  assessment_id       text references assessments (assessment_id) on delete set null,
  action              action_type not null,
  human_required      boolean not null,
  policy_version      text not null,

  -- A decision nobody can explain is a bug (rule 4).
  rationale_refs      text[] not null check (array_length(rationale_refs, 1) >= 1),
  trace_id            text not null,
  proposal_rejected   boolean not null default false,
  cool_off_seconds    integer check (cool_off_seconds is null or cool_off_seconds >= 1),
  hold_expires_at     timestamptz,
  verification_channel text,
  created_at          timestamptz not null default now(),

  -- The conditional rules from decision.schema.json, enforced by the database.
  constraint escalate_requires_human
    check (action <> 'ESCALATE' or human_required),
  constraint cooloff_requires_seconds
    check (action <> 'COOL_OFF' or cool_off_seconds is not null),
  constraint verify_requires_channel
    check (action <> 'VERIFY' or verification_channel is not null)
);

create index on decisions (transaction_id, created_at desc);
create index on decisions (trace_id);

-- ---------------------------------------------------------------- workflow

create table cases (
  case_id        text primary key,
  transaction_id text not null references transactions (transaction_id) on delete cascade,
  decision_id    text references decisions (decision_id) on delete set null,
  status         case_status not null default 'open',
  analyst_id     uuid references auth.users (id) on delete set null,
  notes          text,
  resolution     text,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,

  constraint resolved_cases_have_a_resolution
    check (status not in ('resolved', 'closed') or resolution is not null)
);

create index on cases (status, created_at desc);

-- Per-channel, revocable. Revoking must actually cut off access, which is why the RLS policy on
-- communications reads this table rather than the application merely checking a flag.
create table consents (
  customer_id text not null references customers (customer_id) on delete cascade,
  channel     comm_channel not null,
  granted     boolean not null default false,
  granted_at  timestamptz,
  revoked_at  timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (customer_id, channel)
);

-- ---------------------------------------------------------------- knowledge

create table advisories (
  advisory_id  text primary key,
  publisher    text not null,
  title        text not null,
  published_at date,
  content      text not null,
  tags         text[] not null default '{}',
  embedding    vector(768),
  created_at   timestamptz not null default now()
);

create index on advisories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------- audit

-- Append-only. See 002_rls.sql: update and delete are revoked from everyone, including the
-- service role. An audit trail an operator can edit is not an audit trail.
create table audit_events (
  event_id      text primary key,
  actor         text not null,
  object_id     text not null,
  action        text not null,
  occurred_at   timestamptz not null default now(),
  trace_id      text,
  policy_version text,
  model_version text,
  degraded      boolean not null default false,
  metadata      jsonb not null default '{}'
);

create index on audit_events (object_id, occurred_at desc);
create index on audit_events (trace_id);

-- Every read of a customer's communications is itself auditable. The customer can be shown this.
create table access_log (
  id          bigserial primary key,
  actor       uuid references auth.users (id) on delete set null,
  customer_id text not null,
  reason      text not null,
  occurred_at timestamptz not null default now()
);

create index on access_log (customer_id, occurred_at desc);
