-- UX-08: optional Google Drive meeting cover reference; access controlled by existing meeting SELECT RLS.
begin;
alter table public.meetings add column if not exists cover_drive_file_id text
  check (cover_drive_file_id is null or cover_drive_file_id ~ '^[A-Za-z0-9_-]{10,128}$');
create or replace function public.r2_set_meeting_cover(
  p_meeting_id uuid, p_drive_file_id text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.can_edit_meeting(p_meeting_id) then raise exception 'Access denied'; end if;
  if p_drive_file_id is not null and p_drive_file_id !~ '^[A-Za-z0-9_-]{10,128}$' then
    raise exception 'Invalid Google Drive file ID';
  end if;
  if not exists (select 1 from public.meetings m where m.id=p_meeting_id and m.status<>'archived') then
    raise exception 'Meeting archived or not found';
  end if;
  update public.meetings
    set cover_drive_file_id=p_drive_file_id, updated_at=now()
    where id=p_meeting_id;
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
  values(auth.uid(),'set_meeting_cover','meetings',p_meeting_id,jsonb_build_object('has_cover',p_drive_file_id is not null));
end;
$$;
revoke all on function public.r2_set_meeting_cover(uuid,text) from public,anon;
grant execute on function public.r2_set_meeting_cover(uuid,text) to authenticated;
commit;
