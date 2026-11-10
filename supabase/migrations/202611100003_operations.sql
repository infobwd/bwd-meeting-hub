-- BWD Meeting Hub R2 / 003_operations.sql
-- Explicit, audited, authenticated RPC writes. No direct table DML to browser.
begin;

create or replace function public.r2_save_profile(p_display_name text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_active_member() then raise exception 'Access denied'; end if;
  if nullif(btrim(p_display_name),'') is null or char_length(p_display_name)>160 then
    raise exception 'Invalid display name';
  end if;
  insert into public.profiles(id,display_name)
  values (auth.uid(), btrim(p_display_name))
  on conflict(id) do update set display_name=excluded.display_name;
end;
$$;

create or replace function public.r2_create_meeting(
  p_title text, p_kind text, p_scheduled_on date default null, p_location text default ''
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not private.can_create_meeting() then raise exception 'Access denied'; end if;
  if nullif(btrim(p_title),'') is null or char_length(p_title)>180 then raise exception 'Invalid meeting title'; end if;
  insert into public.meetings(title,kind,scheduled_on,location,created_by)
  values (btrim(p_title),p_kind,p_scheduled_on,coalesce(p_location,''),auth.uid())
  returning id into v_id;
  insert into public.meeting_access(meeting_id,user_id,role,invited_by)
  values(v_id,auth.uid(),'editor',auth.uid());
  insert into public.audit_events(actor_id,action,target_table,target_id)
  values(auth.uid(),'create','meetings',v_id);
  return v_id;
end;
$$;

create or replace function public.r2_add_access(
  p_meeting_id uuid,p_user_id uuid,p_role text
) returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.can_edit_meeting(p_meeting_id) then raise exception 'Access denied'; end if;
  if p_role not in ('editor','attendee','guest') then raise exception 'Invalid access role'; end if;
  if not exists(select 1 from public.workspace_members w
      where w.user_id=p_user_id and w.active
      and (w.role <> 'guest' or p_role = 'guest')) then
    raise exception 'Account is not active or requested access exceeds guest role';
  end if;
  if exists(select 1 from public.meetings m where m.id=p_meeting_id and m.status='archived') then
    raise exception 'Meeting is archived';
  end if;
  insert into public.meeting_access(meeting_id,user_id,role,invited_by)
  values(p_meeting_id,p_user_id,p_role,auth.uid())
  on conflict(meeting_id,user_id) do update set role=excluded.role,invited_by=excluded.invited_by,added_at=now();
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
  values(auth.uid(),'grant_access','meetings',p_meeting_id,
    jsonb_build_object('user',p_user_id,'role',p_role));
end;
$$;

create or replace function public.r2_add_agenda(
  p_meeting_id uuid,p_section integer,p_title text,p_notes text default ''
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;v_position integer;
begin
  if not private.can_edit_meeting(p_meeting_id) then raise exception 'Access denied'; end if;
  if exists(select 1 from public.meetings m where m.id=p_meeting_id and m.status in ('minutes_review','ratified','archived')) then
    raise exception 'Cannot edit ratified or archived meeting';
  end if;
  if p_section not between 1 and 5 or nullif(btrim(p_title),'') is null then raise exception 'Invalid agenda'; end if;
  select coalesce(max(position),0)+1 into v_position from public.agendas where meeting_id=p_meeting_id;
  insert into public.agendas(meeting_id,section,title,notes,position)
  values(p_meeting_id,p_section,btrim(p_title),coalesce(p_notes,''),v_position)
  returning id into v_id;
  insert into public.audit_events(actor_id,action,target_table,target_id)
  values(auth.uid(),'create','agendas',v_id);
  return v_id;
end;
$$;

create or replace function public.r2_record_decision(
  p_agenda_id uuid,p_body text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_meeting uuid;v_id uuid;
begin
  select meeting_id into v_meeting from public.agendas where id=p_agenda_id;
  if v_meeting is null or not private.can_edit_meeting(v_meeting) then raise exception 'Access denied'; end if;
  if exists(select 1 from public.meetings where id=v_meeting and status in ('ratified','archived')) then
    raise exception 'Cannot change ratified minutes';
  end if;
  if exists(select 1 from public.minutes where meeting_id=v_meeting and status <> 'draft') then
    raise exception 'Minutes under review';
  end if;
  if nullif(btrim(p_body),'') is null then raise exception 'Decision body required'; end if;
  insert into public.decisions(agenda_id,body,status,recorded_by)
  values(p_agenda_id,btrim(p_body),'recorded',auth.uid())
  on conflict(agenda_id) do update
    set body=excluded.body,status='recorded',recorded_by=excluded.recorded_by,updated_at=now(),ratified_at=null,ratified_by=null
  returning id into v_id;
  insert into public.audit_events(actor_id,action,target_table,target_id)
  values(auth.uid(),'record','decisions',v_id);
  return v_id;
end;
$$;

create or replace function public.r2_save_minutes(
  p_meeting_id uuid,p_body text,p_expected_version integer default null
) returns integer language plpgsql security definer set search_path = ''
as $$
declare v_version integer;v_current public.minutes%rowtype;
begin
  if not private.can_edit_meeting(p_meeting_id) then raise exception 'Access denied'; end if;
  if not exists(select 1 from public.meetings where id=p_meeting_id and status not in ('ratified','archived')) then
    raise exception 'Meeting not editable';
  end if;
  if char_length(coalesce(p_body,''))>100000 then raise exception 'Minutes too long'; end if;
  select * into v_current from public.minutes where meeting_id=p_meeting_id for update;
  if found then
    if v_current.status<>'draft' then raise exception 'Minutes locked for review'; end if;
    if p_expected_version is null or v_current.version<>p_expected_version then raise exception 'Version conflict; reload'; end if;
    update public.minutes
    set body=coalesce(p_body,''),version=version+1,updated_at=now(),updated_by=auth.uid()
    where id=v_current.id returning version into v_version;
  else
    if p_expected_version is not null and p_expected_version<>0 then raise exception 'Version conflict'; end if;
    insert into public.minutes(meeting_id,body,updated_by)
    values(p_meeting_id,coalesce(p_body,''),auth.uid()) returning version into v_version;
  end if;
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
  values(auth.uid(),'save','minutes',p_meeting_id,jsonb_build_object('version',v_version));
  return v_version;
end;
$$;

create or replace function public.r2_submit_minutes(p_meeting_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_row public.minutes%rowtype;
begin
  if not private.can_edit_meeting(p_meeting_id) then raise exception 'Access denied'; end if;
  select * into v_row from public.minutes where meeting_id=p_meeting_id for update;
  if not found or v_row.status<>'draft' or nullif(btrim(v_row.body),'') is null then
    raise exception 'Draft minutes must be saved first';
  end if;
  update public.minutes set status='submitted',updated_at=now() where id=v_row.id;
  update public.meetings set status='minutes_review',updated_at=now() where id=p_meeting_id;
  insert into public.audit_events(actor_id,action,target_table,target_id)
  values(auth.uid(),'submit_review','minutes',p_meeting_id);
end;
$$;

create or replace function public.r2_review_minutes(
  p_meeting_id uuid,p_approve boolean,p_note text default ''
) returns void language plpgsql security definer set search_path = ''
as $$
declare v_row public.minutes%rowtype;
begin
  if not private.is_admin() then raise exception 'Administrator only'; end if;
  select * into v_row from public.minutes where meeting_id=p_meeting_id for update;
  if not found or v_row.status<>'submitted' then raise exception 'Minutes not submitted'; end if;
  if not p_approve and nullif(btrim(p_note),'') is null then raise exception 'Rejection reason required'; end if;
  update public.minutes set
    status=case when p_approve then 'approved' else 'draft' end,
    approved_by=case when p_approve then auth.uid() else null end,
    approved_at=case when p_approve then now() else null end,
    updated_at=now()
  where id=v_row.id;
  update public.meetings
  set status=case when p_approve then 'ratified' else 'held' end,updated_at=now()
  where id=p_meeting_id;
  if p_approve then
    update public.decisions d set status='ratified',ratified_by=auth.uid(),ratified_at=now()
    from public.agendas a where d.agenda_id=a.id and a.meeting_id=p_meeting_id
      and d.status='recorded';
  end if;
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
  values(auth.uid(),case when p_approve then 'approve' else 'reject' end,
    'minutes',p_meeting_id,jsonb_build_object('note',left(coalesce(p_note,''),2000)));
end;
$$;

create or replace function public.r2_create_task(
  p_meeting_id uuid,p_title text,p_description text default '',
  p_owner_id uuid default null,p_due_on date default null,p_agenda_id uuid default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not private.can_edit_meeting(p_meeting_id) then raise exception 'Access denied'; end if;
  if nullif(btrim(p_title),'') is null then raise exception 'Task title required'; end if;
  if p_owner_id is not null and not exists(
    select 1 from public.workspace_members w where w.user_id=p_owner_id and w.active
  ) then raise exception 'Assignee is not an active workspace member'; end if;
  if p_agenda_id is not null and not exists(
    select 1 from public.agendas a where a.id=p_agenda_id and a.meeting_id=p_meeting_id
  ) then raise exception 'Agenda does not belong to meeting'; end if;
  insert into public.tasks(title,description,owner_id,due_on,created_by)
  values(btrim(p_title),coalesce(p_description,''),p_owner_id,p_due_on,auth.uid())
  returning id into v_id;
  insert into public.task_meeting_links(task_id,meeting_id,agenda_id,link_kind,linked_by)
  values(v_id,p_meeting_id,p_agenda_id,'origin',auth.uid());
  insert into public.audit_events(actor_id,action,target_table,target_id)
  values(auth.uid(),'create','tasks',v_id);
  return v_id;
end;
$$;

create or replace function public.r2_link_task(
  p_task_id uuid,p_meeting_id uuid,p_agenda_id uuid default null
) returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.can_review_task(p_task_id) or not private.can_edit_meeting(p_meeting_id) then
    raise exception 'Editor access to both tasks and meeting required';
  end if;
  if p_agenda_id is not null and not exists(
    select 1 from public.agendas where id=p_agenda_id and meeting_id=p_meeting_id
  ) then raise exception 'Agenda does not belong to meeting'; end if;
  insert into public.task_meeting_links(task_id,meeting_id,agenda_id,link_kind,linked_by)
  values(p_task_id,p_meeting_id,p_agenda_id,'followup',auth.uid())
  on conflict(task_id,meeting_id) do nothing;
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
  values(auth.uid(),'link_meeting','tasks',p_task_id,jsonb_build_object('meeting_id',p_meeting_id));
end;
$$;

create or replace function public.r2_set_task_owner(
  p_task_id uuid,p_owner_id uuid,p_expected_version integer
) returns integer language plpgsql security definer set search_path = ''
as $$
declare v_task public.tasks%rowtype;v_version integer;
begin
  if not private.can_review_task(p_task_id) then raise exception 'Editor only'; end if;
  if p_owner_id is not null and not exists(
    select 1 from public.workspace_members where user_id=p_owner_id and active
  ) then raise exception 'Assignee is not active'; end if;
  select * into v_task from public.tasks where id=p_task_id for update;
  if not found or v_task.version<>p_expected_version then raise exception 'Version conflict; reload'; end if;
  if v_task.status in ('approved','cancelled') then raise exception 'Task locked'; end if;
  update public.tasks set owner_id=p_owner_id,version=version+1,updated_at=now()
  where id=p_task_id returning version into v_version;
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
  values(auth.uid(),'assign','tasks',p_task_id,jsonb_build_object('new_owner',p_owner_id));
  return v_version;
end;
$$;

create or replace function public.r2_change_task(
  p_task_id uuid,p_new_status text,p_note text,p_expected_version integer
) returns integer language plpgsql security definer set search_path = ''
as $$
declare v_task public.tasks%rowtype;v_is_owner boolean;v_version integer;
begin
  if not private.can_view_task(p_task_id) then raise exception 'Access denied'; end if;
  select * into v_task from public.tasks where id=p_task_id for update;
  if not found or v_task.version<>p_expected_version then raise exception 'Version conflict; reload'; end if;
  v_is_owner := (v_task.owner_id=auth.uid());
  if not v_is_owner and not private.can_review_task(p_task_id) then raise exception 'Not task owner or editor'; end if;
  if v_task.status in ('approved','cancelled','submitted') then raise exception 'Task status locked for review'; end if;
  if p_new_status not in ('doing','blocked','submitted') then raise exception 'Unsupported transition'; end if;
  if p_new_status='submitted' and nullif(btrim(coalesce(p_note,'')),'') is null then
    raise exception 'Work summary required when submitting';
  end if;
  update public.tasks set status=p_new_status,version=version+1,updated_at=now()
  where id=p_task_id returning version into v_version;
  insert into public.task_updates(task_id,author_id,note,new_status)
  values(p_task_id,auth.uid(),left(coalesce(p_note,''),4000),p_new_status);
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
  values(auth.uid(),'status','tasks',p_task_id,jsonb_build_object('status',p_new_status,'version',v_version));
  return v_version;
end;
$$;

create or replace function public.r2_review_task(
  p_task_id uuid,p_approve boolean,p_note text,p_expected_version integer
) returns integer language plpgsql security definer set search_path = ''
as $$
declare v_task public.tasks%rowtype;v_new_status text;v_version integer;
begin
  if not private.can_review_task(p_task_id) then raise exception 'Reviewer only'; end if;
  select * into v_task from public.tasks where id=p_task_id for update;
  if not found or v_task.version<>p_expected_version then raise exception 'Version conflict; reload'; end if;
  if v_task.status<>'submitted' then raise exception 'Work not submitted for review'; end if;
  if not p_approve and nullif(btrim(coalesce(p_note,'')),'') is null then
    raise exception 'Rejection reason required';
  end if;
  v_new_status := case when p_approve then 'approved' else 'doing' end;
  update public.tasks
  set status=v_new_status,version=version+1,updated_at=now(),
      approved_at=case when p_approve then now() else null end,
      approved_by=case when p_approve then auth.uid() else null end
  where id=p_task_id returning version into v_version;
  insert into public.task_updates(task_id,author_id,note,new_status)
  values(p_task_id,auth.uid(),left(coalesce(p_note,''),4000),v_new_status);
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
  values(auth.uid(),case when p_approve then 'approve' else 'reject' end,'tasks',p_task_id,
    jsonb_build_object('version',v_version));
  return v_version;
end;
$$;

create or replace function public.r2_add_task_note(
  p_task_id uuid,p_note text
) returns void language plpgsql security definer set search_path = ''
as $$
declare v_status text;
begin
  if not private.can_view_task(p_task_id) then raise exception 'Access denied'; end if;
  if not private.can_review_task(p_task_id) and not exists(
    select 1 from public.tasks where id=p_task_id and owner_id=auth.uid()
  ) then raise exception 'Not task editor or assignee'; end if;
  if nullif(btrim(coalesce(p_note,'')),'') is null or char_length(p_note)>4000 then
    raise exception 'Note required';
  end if;
  select status into v_status from public.tasks where id=p_task_id;
  insert into public.task_updates(task_id,author_id,note,new_status)
  values(p_task_id,auth.uid(),btrim(p_note),v_status);
  insert into public.audit_events(actor_id,action,target_table,target_id)
  values(auth.uid(),'note','tasks',p_task_id);
end;
$$;

-- An evidence record can only point to a private object uploaded by this user.
create or replace function public.r2_register_evidence(
  p_task_id uuid,p_object_path text,p_original_name text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not private.can_review_task(p_task_id) and not exists(
    select 1 from public.tasks where id=p_task_id and owner_id=auth.uid()
  ) then raise exception 'Not a task owner or editor'; end if;
  if left(p_object_path,char_length(p_task_id::text)+1)<>(p_task_id::text||'/') then
    raise exception 'Object path must start with task ID';
  end if;
  if not exists(
    select 1 from storage.objects o where o.bucket_id='meeting-evidence'
      and o.name=p_object_path and o.owner_id=auth.uid()::text
  ) then raise exception 'Private object is missing or not yours'; end if;
  insert into public.task_evidence(task_id,object_path,original_name,uploaded_by)
  values(p_task_id,p_object_path,left(coalesce(p_original_name,''),200),auth.uid())
  returning id into v_id;
  insert into public.audit_events(actor_id,action,target_table,target_id)
  values(auth.uid(),'add_evidence','tasks',p_task_id);
  return v_id;
end;
$$;

-- Function EXECUTE permissions (Postgres grants EXECUTE to PUBLIC by default).
revoke all on function
 public.r2_save_profile(text),
 public.r2_create_meeting(text,text,date,text),
 public.r2_add_access(uuid,uuid,text),
 public.r2_add_agenda(uuid,integer,text,text),
 public.r2_record_decision(uuid,text),
 public.r2_save_minutes(uuid,text,integer),
 public.r2_submit_minutes(uuid),
 public.r2_review_minutes(uuid,boolean,text),
 public.r2_create_task(uuid,text,text,uuid,date,uuid),
 public.r2_link_task(uuid,uuid,uuid),
 public.r2_set_task_owner(uuid,uuid,integer),
 public.r2_change_task(uuid,text,text,integer),
 public.r2_review_task(uuid,boolean,text,integer),
 public.r2_add_task_note(uuid,text),
 public.r2_register_evidence(uuid,text,text)
from public,anon;

grant execute on function
 public.r2_save_profile(text),
 public.r2_create_meeting(text,text,date,text),
 public.r2_add_access(uuid,uuid,text),
 public.r2_add_agenda(uuid,integer,text,text),
 public.r2_record_decision(uuid,text),
 public.r2_save_minutes(uuid,text,integer),
 public.r2_submit_minutes(uuid),
 public.r2_review_minutes(uuid,boolean,text),
 public.r2_create_task(uuid,text,text,uuid,date,uuid),
 public.r2_link_task(uuid,uuid,uuid),
 public.r2_set_task_owner(uuid,uuid,integer),
 public.r2_change_task(uuid,text,text,integer),
 public.r2_review_task(uuid,boolean,text,integer),
 public.r2_add_task_note(uuid,text),
 public.r2_register_evidence(uuid,text,text)
to authenticated;

commit;
