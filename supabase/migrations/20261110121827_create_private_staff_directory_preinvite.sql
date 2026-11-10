-- BWD Meeting Hub — private staff contact directory, deployed 2026-11-10.
-- Schema only. Never commit teacher names or email addresses to this public repository.
-- Existing live rows are stored exclusively in Supabase's private schema.
begin;
create table if not exists private.staff_directory (
  id uuid primary key default gen_random_uuid(),
  roster_number smallint not null unique check (roster_number between 1 and 500),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 160),
  primary_email text not null check (char_length(btrim(primary_email)) between 3 and 254),
  backup_email_raw text not null default '' check (char_length(backup_email_raw) <= 254),
  contact_review_status text not null default 'format_ok_unverified'
    check (contact_review_status in ('format_ok_unverified','needs_confirmation','confirmed')),
  contact_review_note text not null default '',
  invitation_status text not null default 'not_invited'
    check (invitation_status in ('not_invited','invited','active','cancelled')),
  invited_at timestamptz,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  source_label text not null default 'school_admin_supplied_20261110',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_directory_preinvite_consistent
    check (invitation_status <> 'not_invited' or (invited_at is null and auth_user_id is null))
);
create unique index if not exists staff_directory_primary_email_ci_unique
  on private.staff_directory (lower(btrim(primary_email)));
alter table private.staff_directory enable row level security;
revoke all on private.staff_directory from public, anon, authenticated, service_role;
comment on table private.staff_directory is
  'Confidential staff contact roster; records may be not_invited and must never be exported to public GitHub or exposed by Data API.';
commit;
