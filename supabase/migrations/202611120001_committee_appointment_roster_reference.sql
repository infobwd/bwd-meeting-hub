-- Appointment roster as an independently sourced private meeting reference.
-- No names/person data are seeded in the public repository.
-- Historic committee minutes, agenda items and DOC-02 draft versions are untouched.
begin;

create table public.meeting_committee_appointment_rosters (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  revision integer not null check (revision >= 1),
  authority_label text not null check (char_length(authority_label) between 1 and 250),
  source_title text not null check (char_length(source_title) between 1 and 250),
  source_kind text not null check (source_kind in ('chat_uploaded_scan','verified_original','other')),
  source_reference text not null check (char_length(source_reference) between 1 and 500),
  announced_on date,
  term_ends_on date,
  verification_status text not null default 'transcribed_pending_verification'
    check (verification_status in ('transcribed_pending_verification','school_verified','superseded')),
  entries jsonb not null
    check (jsonb_typeof(entries)='array' and jsonb_array_length(entries) between 1 and 30
      and octet_length(entries::text) <= 30000),
  created_at timestamptz not null default now(),
  unique(meeting_id,revision)
);
create index meeting_appointment_latest_idx
  on public.meeting_committee_appointment_rosters(meeting_id,revision desc);

comment on table public.meeting_committee_appointment_rosters is
  'Scoped, revisioned committee appointment evidence only, NOT meeting attendance or committee ratification. Private source data is never seeded in public GitHub.';
comment on column public.meeting_committee_appointment_rosters.entries is
  'Each item has appointment order, official role, representation, optional name and review flag. No meeting attendees inferred.';

alter table public.meeting_committee_appointment_rosters enable row level security;
create policy "Appointment reference permitted meeting reader"
  on public.meeting_committee_appointment_rosters
  for select to authenticated
  using (private.can_view_meeting(meeting_id));

revoke all on public.meeting_committee_appointment_rosters from public,anon,authenticated;
grant select on public.meeting_committee_appointment_rosters to authenticated;
-- No direct client insert, update, or delete; private assistant import after source review.

commit;
