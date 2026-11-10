-- UX-10: RLS-scoped meeting photo catalog. File bytes stay in Google Drive.
begin;
alter table public.meetings add column if not exists photo_drive_folder_id text
  check (photo_drive_folder_id is null or photo_drive_folder_id ~ '^[A-Za-z0-9_-]{10,128}$');

create table if not exists public.meeting_photo_catalog (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  drive_file_id text not null check (drive_file_id ~ '^[A-Za-z0-9_-]{10,128}$'),
  file_name text not null check (char_length(file_name) between 1 and 250),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/gif')),
  last_seen_at timestamptz not null default now(),
  constraint meeting_photo_catalog_unique unique (meeting_id,drive_file_id)
);
create index if not exists meeting_photo_catalog_meeting_idx
  on public.meeting_photo_catalog (meeting_id,file_name);
alter table public.meeting_photo_catalog enable row level security;
drop policy if exists "meeting photos: permitted meeting viewers" on public.meeting_photo_catalog;
create policy "meeting photos: permitted meeting viewers"
on public.meeting_photo_catalog for select to authenticated
using (private.can_view_meeting(meeting_id));
revoke all on public.meeting_photo_catalog from public,anon,authenticated;
grant select on public.meeting_photo_catalog to authenticated;

-- Editors can configure a folder, but never modify the photo catalog directly.
create or replace function public.r2_set_meeting_photo_folder(p_meeting_id uuid,p_folder_id text)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if not private.can_edit_meeting(p_meeting_id) then raise exception 'Access denied'; end if;
  if p_folder_id is not null and p_folder_id !~ '^[A-Za-z0-9_-]{10,128}$'
    then raise exception 'Invalid folder ID'; end if;
  if not exists (select 1 from public.meetings where id=p_meeting_id and status<>'archived')
    then raise exception 'Meeting not editable'; end if;
  update public.meetings
     set photo_drive_folder_id=p_folder_id, updated_at=now()
   where id=p_meeting_id;
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
    values(auth.uid(),'set_meeting_photo_folder','meetings',p_meeting_id,
      jsonb_build_object('configured',p_folder_id is not null));
end;
$$;
revoke all on function public.r2_set_meeting_photo_folder(uuid,text) from public,anon;
grant execute on function public.r2_set_meeting_photo_folder(uuid,text) to authenticated;

-- Seed a reviewed folder for the 10-Nov-2026 school board meeting only.
-- Identify the meeting by actual business attributes, never a generated UUID.
do $$
declare v_meeting uuid;
begin
  if (select count(*) from public.meetings where scheduled_on='2026-11-10'
      and kind='board' and title like '%คณะกรรมการสถานศึกษา%') <> 1
    then raise exception 'Expected exactly one meeting on 2026-11-10'; end if;
  select id into v_meeting from public.meetings
    where scheduled_on='2026-11-10' and kind='board'
      and title like '%คณะกรรมการสถานศึกษา%';
  update public.meetings set photo_drive_folder_id='17I88923xLL8ThcYShXdjGTr1QUiUtwjz'
    where id=v_meeting and (photo_drive_folder_id is null or photo_drive_folder_id='17I88923xLL8ThcYShXdjGTr1QUiUtwjz');
  insert into public.meeting_photo_catalog(meeting_id,drive_file_id,file_name,mime_type)
  select v_meeting,x.id,x.file_name,'image/jpeg' from (values
    ('14YrX4ugl_LILSZ8CaLfi_9ZdciuMyVQZ','IMG_9531.jpeg'),
    ('1rcYvkfSzFlyZUv4tYu6M2bW6vBRdcoPm','IMG_9530.jpeg'),
    ('1SiG85PMItgS8XMRzjKmyI-hiI9OPZEiw','IMG_9529.jpeg'),
    ('1ouWjsWyXcNlytqkCRQ57lve8aLhLTm1F','IMG_9528.jpeg'),
    ('1PD-Hajmqu4gi3J4k6oyulLqtumZDml3m','IMG_9527.jpeg'),
    ('1Hivf-qoAz4rzPaNcph8WKS9UsEI41KFq','IMG_9526.jpeg'),
    ('1K82grR0S4-Iz8dTIOmosgFiCtsZ58dpB','IMG_9525.jpeg'),
    ('1HY4m3EmleDxqgTdZ0bdJchGDCL5BMA42','IMG_9524.jpeg'),
    ('1ZFgM0z4OeQ9BOWuHIhI8mexLOdyNwpD2','IMG_9523.jpeg'),
    ('10SUGM1Yld0zm6OSmVduLJrw7ypsojDuQ','IMG_9522(1).jpeg')
  ) as x(id,file_name)
  on conflict (meeting_id,drive_file_id) do nothing;
end $$;
commit;
