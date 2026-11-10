-- EXT-01: External meeting origin, participants, and privately reviewed attendance reports.
-- Additive only: leave all existing meeting, agenda, minutes and task rows untouched.
begin;

alter table public.meetings
  add column meeting_mode text,
  add column host_organization text,
  add column host_type text,
  add column starts_at timestamptz,
  add column ends_at timestamptz;
alter table public.meetings
  add constraint meetings_mode_contract check
    (meeting_mode is null or meeting_mode in ('school_hosted','externally_hosted','co_hosted')),
  add constraint meetings_host_contract check
    (host_organization is null or char_length(host_organization) between 1 and 200),
  add constraint meetings_host_type_contract check
    (host_type is null or host_type in ('area','network','school','other')),
  add constraint meetings_time_contract check
    (starts_at is null or ends_at is null or ends_at >= starts_at);

comment on column public.meetings.meeting_mode is
  'NULL means unclassified legacy meeting; do not infer hosting from meetings.kind.';

create table public.meeting_participations (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  participation_role text not null default 'attendee'
    check (participation_role in ('attendee','representative','observer','committee','coordinator')),
  attendance_status text not null default 'unknown'
    check (attendance_status in ('unknown','planned','attended','absent')),
  added_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (meeting_id,user_id)
);
create index meeting_participations_user_idx
  on public.meeting_participations(user_id,meeting_id);
comment on table public.meeting_participations is
  'Actual participation/attendance distinct from meeting_access authorization. Unknown until verified.';

create table public.external_attendance_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  summary text not null default '' check (char_length(summary)<=20000),
  directives text not null default '' check (char_length(directives)<=10000),
  school_impact text not null default '' check (char_length(school_impact)<=10000),
  proposed_actions text not null default '' check (char_length(proposed_actions)<=10000),
  status text not null default 'draft'
    check (status in ('draft','submitted','returned','reviewed')),
  version integer not null default 1 check (version >= 1),
  review_note text not null default '' check (char_length(review_note)<=2000),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id,author_id)
);
create index ext_reports_author_idx
  on public.external_attendance_reports(author_id,updated_at desc);
comment on table public.external_attendance_reports is
  'Staff-owned attendance summaries; never imply these are ratified minutes of the external host.';

alter table public.meeting_participations enable row level security;
alter table public.external_attendance_reports enable row level security;
create policy "participation: editor or self" on public.meeting_participations
 for select to authenticated using (
  private.can_edit_meeting(meeting_id)
  or (user_id=(select auth.uid()) and private.can_view_meeting(meeting_id))
 );
create policy "external reports: editor or author" on public.external_attendance_reports
 for select to authenticated using (
  private.can_edit_meeting(meeting_id)
  or (author_id=(select auth.uid()) and private.is_staff()
      and private.can_view_meeting(meeting_id))
 );
revoke all on public.meeting_participations,public.external_attendance_reports
  from public,anon,authenticated;
grant select on public.meeting_participations,public.external_attendance_reports
  to authenticated;

-- A teacher may register their OWN external event without gaining blanket editor powers.
create function public.r2_ext_create_meeting(
 p_title text,p_kind text,p_host_organization text,p_host_type text,
 p_scheduled_on date default null,p_location text default ''
) returns uuid language plpgsql security definer set search_path=''
as $fn$
declare v_id uuid;v_user uuid;
begin
 v_user:=auth.uid();
 if v_user is null or not private.is_staff() then raise exception 'Access denied'; end if;
 if nullif(btrim(coalesce(p_title,'')),'') is null or char_length(p_title)>180
   then raise exception 'Invalid meeting title'; end if;
 if p_kind is null or p_kind not in ('board','teacher','management','working','community','other')
   then raise exception 'Invalid meeting type'; end if;
 if nullif(btrim(coalesce(p_host_organization,'')),'') is null
   or char_length(p_host_organization)>200 then raise exception 'Host required'; end if;
 if p_host_type is null or p_host_type not in ('area','network','school','other')
   then raise exception 'Invalid host type'; end if;
 if char_length(coalesce(p_location,''))>180 then raise exception 'Invalid location'; end if;
 insert into public.meetings(title,kind,scheduled_on,location,created_by,
                             meeting_mode,host_organization,host_type)
 values (btrim(p_title),p_kind,p_scheduled_on,coalesce(p_location,''),v_user,
         'externally_hosted',btrim(p_host_organization),p_host_type)
 returning id into v_id;
 insert into public.meeting_access(meeting_id,user_id,role,invited_by)
 values (v_id,v_user,case when private.can_create_meeting() then 'editor' else 'attendee' end,v_user);
 insert into public.meeting_participations(meeting_id,user_id,added_by)
 values (v_id,v_user,v_user);
 insert into public.audit_events(actor_id,action,target_table,target_id)
 values (v_user,'ext_create','meetings',v_id);
 return v_id;
end;
$fn$;

-- Only authorized meeting editors can enroll other ACTIVE staff; no Auth invitation.
create function public.r2_ext_add_participant(
 p_meeting_id uuid,p_user_id uuid,p_participation_role text default 'attendee'
) returns void language plpgsql security definer set search_path=''
as $fn$
begin
 if auth.uid() is null or not private.can_edit_meeting(p_meeting_id)
   then raise exception 'Editor only'; end if;
 if not exists (select 1 from public.meetings
                where id=p_meeting_id and meeting_mode='externally_hosted'
                  and status not in ('ratified','archived'))
   then raise exception 'Invalid external meeting'; end if;
 if p_participation_role is null or
    p_participation_role not in ('attendee','representative','observer','committee','coordinator')
   then raise exception 'Invalid participation role'; end if;
 if not exists (select 1 from public.workspace_members
                where user_id=p_user_id and active
                  and role in ('admin','secretary','member'))
   then raise exception 'Only active staff may participate'; end if;
 insert into public.meeting_access(meeting_id,user_id,role,invited_by)
 values (p_meeting_id,p_user_id,'attendee',auth.uid())
 on conflict(meeting_id,user_id) do nothing;
 insert into public.meeting_participations(meeting_id,user_id,participation_role,added_by)
 values (p_meeting_id,p_user_id,p_participation_role,auth.uid())
 on conflict(meeting_id,user_id) do nothing;
 insert into public.audit_events(actor_id,action,target_table,target_id,details)
 values (auth.uid(),'ext_add_participant','meetings',p_meeting_id,
         jsonb_build_object('participant_id',p_user_id));
end;
$fn$;

-- Reports can only be authored by the attending active staff themselves.
create function public.r2_ext_save_report(
 p_meeting_id uuid,p_summary text,p_directives text,p_school_impact text,
 p_proposed_actions text,p_expected_version integer default 0
) returns integer language plpgsql security definer set search_path=''
as $fn$
declare v_row public.external_attendance_reports%rowtype;v_version integer;v_report uuid;
begin
 if auth.uid() is null or not private.is_staff() then raise exception 'Access denied'; end if;
 if not private.can_view_meeting(p_meeting_id)
    or not exists (select 1 from public.meetings
                   where id=p_meeting_id and meeting_mode='externally_hosted'
                     and status <> 'archived')
    or not exists (select 1 from public.meeting_participations
                   where meeting_id=p_meeting_id and user_id=auth.uid()
                     and attendance_status <> 'absent')
   then raise exception 'Not an authorized participant'; end if;
 if char_length(coalesce(p_summary,''))>20000
    or char_length(coalesce(p_directives,''))>10000
    or char_length(coalesce(p_school_impact,''))>10000
    or char_length(coalesce(p_proposed_actions,''))>10000
   then raise exception 'Report field too long'; end if;
 select * into v_row from public.external_attendance_reports
 where meeting_id=p_meeting_id and author_id=auth.uid() for update;
 if found then
   if v_row.version is distinct from p_expected_version then raise exception 'Version conflict; reload'; end if;
   if v_row.status not in ('draft','returned') then raise exception 'Report locked for review'; end if;
   update public.external_attendance_reports set
    summary=coalesce(p_summary,''),directives=coalesce(p_directives,''),
    school_impact=coalesce(p_school_impact,''),proposed_actions=coalesce(p_proposed_actions,''),
    version=version+1,status='draft',updated_at=now()
   where id=v_row.id returning id,version into v_report,v_version;
 else
   if p_expected_version is distinct from 0 then raise exception 'Version conflict; reload'; end if;
   insert into public.external_attendance_reports
      (meeting_id,author_id,summary,directives,school_impact,proposed_actions)
   values(p_meeting_id,auth.uid(),coalesce(p_summary,''),coalesce(p_directives,''),
          coalesce(p_school_impact,''),coalesce(p_proposed_actions,''))
   returning id,version into v_report,v_version;
 end if;
 insert into public.audit_events(actor_id,action,target_table,target_id,details)
 values(auth.uid(),'ext_save_report','external_attendance_reports',v_report,
        jsonb_build_object('version',v_version));
 return v_version;
end;
$fn$;

create function public.r2_ext_submit_report(p_meeting_id uuid,p_expected_version integer)
returns integer language plpgsql security definer set search_path=''
as $fn$
declare v_row public.external_attendance_reports%rowtype;v_version integer;
begin
 if auth.uid() is null or not private.is_staff() or not private.can_view_meeting(p_meeting_id)
   or not exists(select 1 from public.meeting_participations where meeting_id=p_meeting_id and user_id=auth.uid())
   or not exists(select 1 from public.meetings where id=p_meeting_id and meeting_mode='externally_hosted' and status<>'archived')
   then raise exception 'Access denied'; end if;
 select * into v_row from public.external_attendance_reports
   where meeting_id=p_meeting_id and author_id=auth.uid() for update;
 if not found or v_row.version is distinct from p_expected_version
   then raise exception 'Version conflict; reload'; end if;
 if v_row.status<>'draft' or nullif(btrim(v_row.summary),'') is null
   then raise exception 'Completed draft required'; end if;
 update public.external_attendance_reports set status='submitted',
   version=version+1,updated_at=now()
   where id=v_row.id returning version into v_version;
 insert into public.audit_events(actor_id,action,target_table,target_id,details)
 values(auth.uid(),'ext_submit_report','external_attendance_reports',v_row.id,
        jsonb_build_object('version',v_version));
 return v_version;
end;
$fn$;

create function public.r2_ext_withdraw_report(
 p_meeting_id uuid,p_reason text,p_expected_version integer
) returns integer language plpgsql security definer set search_path=''
as $fn$
declare v_row public.external_attendance_reports%rowtype;v_version integer;v_reason text;
begin
 if auth.uid() is null or not private.is_staff() then raise exception 'Access denied'; end if;
 if not private.can_view_meeting(p_meeting_id)
   or not exists(select 1 from public.meeting_participations where meeting_id=p_meeting_id and user_id=auth.uid())
   or not exists(select 1 from public.meetings where id=p_meeting_id and meeting_mode='externally_hosted' and status<>'archived')
   then raise exception 'Access denied'; end if;
 v_reason:=btrim(coalesce(p_reason,''));
 if v_reason='' or char_length(v_reason)>2000 then raise exception 'Withdrawal reason required'; end if;
 select * into v_row from public.external_attendance_reports
 where meeting_id=p_meeting_id and author_id=auth.uid() for update;
 if not found or v_row.version is distinct from p_expected_version
   then raise exception 'Version conflict; reload'; end if;
 if v_row.status<>'submitted' then raise exception 'Only pending report may be withdrawn'; end if;
 update public.external_attendance_reports set status='draft',
   version=version+1,updated_at=now()
 where id=v_row.id returning version into v_version;
 insert into public.audit_events(actor_id,action,target_table,target_id,details)
 values(auth.uid(),'ext_withdraw_report','external_attendance_reports',v_row.id,
        jsonb_build_object('reason',v_reason,'version',v_version));
 return v_version;
end;
$fn$;

create function public.r2_ext_review_report(
 p_meeting_id uuid,p_author_id uuid,p_approve boolean,
 p_note text,p_expected_version integer
) returns integer language plpgsql security definer set search_path=''
as $fn$
declare v_row public.external_attendance_reports%rowtype;v_version integer;v_note text;
begin
 if auth.uid() is null or not private.can_edit_meeting(p_meeting_id)
   then raise exception 'Reviewer only'; end if;
 if not exists(select 1 from public.meetings where id=p_meeting_id and meeting_mode='externally_hosted' and status<>'archived')
   then raise exception 'Invalid external meeting'; end if;
 if p_author_id is not distinct from auth.uid() then raise exception 'Independent reviewer required'; end if;
 v_note:=btrim(coalesce(p_note,''));
 if not coalesce(p_approve,false) and v_note='' then raise exception 'Return reason required'; end if;
 if char_length(v_note)>2000 then raise exception 'Review note too long'; end if;
 select * into v_row from public.external_attendance_reports
 where meeting_id=p_meeting_id and author_id=p_author_id for update;
 if not found or v_row.version is distinct from p_expected_version
   then raise exception 'Version conflict; reload'; end if;
 if v_row.status<>'submitted' then raise exception 'Report not pending review'; end if;
 update public.external_attendance_reports set
   status=case when p_approve then 'reviewed' else 'returned' end,
   review_note=v_note,reviewed_by=auth.uid(),
   reviewed_at=case when p_approve then now() else null end,
   version=version+1,updated_at=now()
 where id=v_row.id returning version into v_version;
 insert into public.audit_events(actor_id,action,target_table,target_id,details)
 values(auth.uid(),case when p_approve then 'ext_review_report' else 'ext_return_report' end,
        'external_attendance_reports',v_row.id,
        jsonb_build_object('version',v_version,'note',v_note));
 return v_version;
end;
$fn$;

revoke all on function
 public.r2_ext_create_meeting(text,text,text,text,date,text),
 public.r2_ext_add_participant(uuid,uuid,text),
 public.r2_ext_save_report(uuid,text,text,text,text,integer),
 public.r2_ext_submit_report(uuid,integer),
 public.r2_ext_withdraw_report(uuid,text,integer),
 public.r2_ext_review_report(uuid,uuid,boolean,text,integer)
from public,anon,authenticated;
grant execute on function
 public.r2_ext_create_meeting(text,text,text,text,date,text),
 public.r2_ext_add_participant(uuid,uuid,text),
 public.r2_ext_save_report(uuid,text,text,text,text,integer),
 public.r2_ext_submit_report(uuid,integer),
 public.r2_ext_withdraw_report(uuid,text,integer),
 public.r2_ext_review_report(uuid,uuid,boolean,text,integer)
to authenticated;
commit;
