-- BWD Meeting Hub R2 / 004_private_evidence.sql
-- Uploads are private, task-scoped, and limited to familiar document/image types.
begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('meeting-evidence','meeting-evidence',false,10485760,
       array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set
 public=false,
 file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.storage_task_id(p_name text)
returns uuid language sql immutable set search_path = ''
as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]{36}\.(pdf|png|jpg|jpeg|webp)$'
    then split_part(p_name,'/',1)::uuid
    else null::uuid
  end;
$$;

create policy "bwd evidence: read only visible tasks"
on storage.objects for select to authenticated
using (
  bucket_id='meeting-evidence'
  and private.can_view_task(private.storage_task_id(name))
);

create policy "bwd evidence: upload only owned or editable tasks"
on storage.objects for insert to authenticated
with check (
  bucket_id='meeting-evidence'
  and private.storage_task_id(name) is not null
  and (
    private.can_review_task(private.storage_task_id(name))
    or exists (
      select 1 from public.tasks t
      where t.id=private.storage_task_id(name) and t.owner_id=auth.uid()
    )
  )
);

-- Deliberately no UPDATE or DELETE policy for browser users.
-- Removal / retention requires audited administrative server workflow.
grant execute on function private.storage_task_id(text) to authenticated;
commit;
