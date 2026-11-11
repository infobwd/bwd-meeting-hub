-- UX-11: archive obsolete Google Drive meeting-document references without
-- deleting historical metadata or changing Google Drive original permissions.
-- Applies to all meetings; live data retirement is a separately reviewed
-- and audited operation, never hardcoded in a public migration.
alter table public.meeting_documents
  add column if not exists archived_at timestamptz;

comment on column public.meeting_documents.archived_at is
  'Non-null hides a legacy link from signed-in meeting readers while retaining its metadata/history';

-- Keep the existing meeting-scoped access predicate and additionally exclude
-- retired document links at the database boundary (including Edge Function).
drop policy if exists "meeting documents: invited only" on public.meeting_documents;
create policy "meeting documents: invited only"
  on public.meeting_documents
  for select to authenticated
  using (archived_at is null and private.can_view_meeting(meeting_id));

-- No DML privileges are granted to authenticated/anon here.
