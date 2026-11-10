-- EXT-02: narrowly scoped participant actions for external meeting UI.
-- No existing meeting, minutes, agenda, task or external report rows are updated.
begin;

-- A real attendee may confirm THEIR OWN status; meeting access is not evidence of attendance.
create function public.r2_ext_set_attendance(
 p_meeting_id uuid,p_attendance_status text,p_expected_status text
) returns text language plpgsql security definer set search_path=''
as $fn$
declare v_old text;
begin
 if auth.uid() is null or not private.is_staff() or
    not private.can_view_meeting(p_meeting_id)
   then raise exception 'Access denied'; end if;
 if p_attendance_status is null or
    p_attendance_status not in ('planned','attended','absent')
   then raise exception 'Invalid attendance status'; end if;
 if not exists(select 1 from public.meetings
   where id=p_meeting_id and meeting_mode='externally_hosted'
     and status not in ('archived','ratified'))
   then raise exception 'Not an editable external event'; end if;
 select attendance_status into v_old
 from public.meeting_participations
 where meeting_id=p_meeting_id and user_id=auth.uid()
 for update;
 if not found then raise exception 'No participation record'; end if;
 if v_old is distinct from p_expected_status
   then raise exception 'Version conflict; reload'; end if;
 if p_attendance_status='absent' and exists(
   select 1 from public.external_attendance_reports
   where meeting_id=p_meeting_id and author_id=auth.uid()
     and status in ('submitted','reviewed'))
   then raise exception 'Cannot mark absent with a submitted or reviewed report'; end if;
 if v_old is distinct from p_attendance_status then
   update public.meeting_participations
   set attendance_status=p_attendance_status
   where meeting_id=p_meeting_id and user_id=auth.uid();
   insert into public.audit_events(actor_id,action,target_table,target_id,details)
   values(auth.uid(),'ext_set_attendance','meetings',p_meeting_id,
     jsonb_build_object('previous',v_old,'current',p_attendance_status));
 end if;
 return p_attendance_status;
end;
$fn$;

-- Referencing a file is NOT sharing it. Google Drive's own ACL still controls access.
-- A participant may attach a document for their event; the file reference is
-- visible to authorized viewers of that meeting through existing meeting_documents RLS.
create function public.r2_ext_attach_document(
 p_meeting_id uuid,p_drive_file_id text,p_title text
) returns uuid language plpgsql security definer set search_path=''
as $fn$
declare v_id uuid;
begin
 if auth.uid() is null or not private.is_staff()
   or not private.can_view_meeting(p_meeting_id)
   then raise exception 'Access denied'; end if;
 if not exists(select 1 from public.meeting_participations
   where meeting_id=p_meeting_id and user_id=auth.uid()
     and attendance_status<>'absent')
   then raise exception 'Not an eligible participant'; end if;
 if not exists(select 1 from public.meetings
   where id=p_meeting_id and meeting_mode='externally_hosted'
     and status not in ('ratified','archived'))
   then raise exception 'Meeting not accepting documents'; end if;
 if exists(select 1 from public.external_attendance_reports
   where meeting_id=p_meeting_id and author_id=auth.uid()
     and status in ('submitted','reviewed'))
   then raise exception 'Report under review or already reviewed'; end if;
 if p_drive_file_id is null or
    p_drive_file_id !~ '^[a-zA-Z0-9_-]{10,128}$'
   then raise exception 'Invalid Google Drive file ID'; end if;
 if nullif(btrim(coalesce(p_title,'')),'') is null
    or char_length(p_title)>200
   then raise exception 'Invalid document title'; end if;
 insert into public.meeting_documents(
   meeting_id,drive_file_id,title,document_type,added_by,source)
 values(p_meeting_id,p_drive_file_id,btrim(p_title),'other',auth.uid(),'user')
 on conflict(meeting_id,drive_file_id) do nothing
 returning id into v_id;
 if v_id is null then
   select id into v_id from public.meeting_documents
   where meeting_id=p_meeting_id and drive_file_id=p_drive_file_id;
 else
   insert into public.audit_events(actor_id,action,target_table,target_id,details)
   values(auth.uid(),'ext_attach_document','meeting_documents',v_id,
     jsonb_build_object('meeting_id',p_meeting_id,'source','participant'));
 end if;
 return v_id;
end;
$fn$;

revoke all on function
 public.r2_ext_set_attendance(uuid,text,text),
 public.r2_ext_attach_document(uuid,text,text)
 from public,anon,authenticated;
grant execute on function
 public.r2_ext_set_attendance(uuid,text,text),
 public.r2_ext_attach_document(uuid,text,text)
 to authenticated;

commit;
