-- R2: Private meeting document references (Google Drive). No Drive links in public fixtures.
begin;
create table if not exists public.meeting_documents (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  document_type text not null default 'other'
    check (document_type in ('agenda_draft','proposed_resolution','minutes_draft','other')),
  review_state text not null default 'draft' check (review_state in ('draft')),
  drive_file_id text not null check (drive_file_id ~ '^[a-zA-Z0-9_-]{10,128}$'),
  added_by uuid references auth.users(id),
  source text not null default 'user' check (source in ('user','admin_import')),
  added_at timestamptz not null default now(),
  unique (meeting_id, drive_file_id)
);
create index if not exists meeting_documents_meeting_idx on public.meeting_documents(meeting_id,added_at desc);
alter table public.meeting_documents enable row level security;
drop policy if exists "meeting documents: invited only" on public.meeting_documents;
create policy "meeting documents: invited only" on public.meeting_documents
  for select to authenticated using (private.can_view_meeting(meeting_id));
revoke all on public.meeting_documents from public,anon,authenticated;
grant select on public.meeting_documents to authenticated;

create or replace function public.r2_attach_drive_document(
  p_meeting_id uuid,p_drive_file_id text,p_title text,p_document_type text default 'other'
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not private.can_edit_meeting(p_meeting_id) then raise exception 'Access denied'; end if;
  if not exists (select 1 from public.meetings m
                 where m.id=p_meeting_id and m.status not in ('ratified','archived')) then
    raise exception 'Meeting cannot accept new draft documents';
  end if;
  if p_drive_file_id is null or p_drive_file_id !~ '^[a-zA-Z0-9_-]{10,128}$' then
    raise exception 'Invalid Google Drive file ID';
  end if;
  if nullif(btrim(p_title),'') is null or char_length(p_title)>200 then
    raise exception 'Invalid document title';
  end if;
  if p_document_type not in ('agenda_draft','proposed_resolution','minutes_draft','other') then
    raise exception 'Invalid document type';
  end if;
  insert into public.meeting_documents(meeting_id,drive_file_id,title,document_type,added_by)
  values(p_meeting_id,p_drive_file_id,btrim(p_title),p_document_type,auth.uid())
  on conflict(meeting_id,drive_file_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.meeting_documents
    where meeting_id=p_meeting_id and drive_file_id=p_drive_file_id;
  else
    insert into public.audit_events(actor_id,action,target_table,target_id,details)
    values(auth.uid(),'attach_drive_document','meeting_documents',v_id,
      jsonb_build_object('meeting_id',p_meeting_id,'type',p_document_type));
  end if;
  return v_id;
end;
$$;
revoke all on function public.r2_attach_drive_document(uuid,text,text,text) from public,anon;
grant execute on function public.r2_attach_drive_document(uuid,text,text,text) to authenticated;
commit;
