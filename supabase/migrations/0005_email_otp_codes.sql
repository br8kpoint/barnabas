-- =====================================================================
-- Email OTP codes for Auth.js Credentials provider
-- =====================================================================
-- One active code per email. New codes overwrite old. Service-role only.
-- =====================================================================

create table if not exists public.email_otp_codes (
  email      text        primary key,
  code_hash  text        not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists email_otp_codes_expires_at_idx
  on public.email_otp_codes (expires_at);

alter table public.email_otp_codes enable row level security;
-- No policies: only the service role (admin client) reads/writes this table.
