-- DOC-02: separate immutable agenda and formal-minutes draft versions, not ratifications.
-- Additive: NO existing public.minutes, agendas, meetings, tasks or decisions rows modified.
begin;

create table public.meeting_agenda_document_versions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  revision integer not null check (revision >= 1),
  document_fields jsonb not null check (
    jsonb_typeof(document_fields)='object' and octet_length(document_fields::text)<=150000
  ),
  document_status text not null default 'draft'
    check (document_status in ('draft','submitted','returned','reviewed')),
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(meeting_id,revision)
);
create index meeting_agenda_versions_latest on public.meeting_agenda_document_versions(meeting_id,revision desc);
create index meeting_official_minutes_versions_latest on public.meeting_official_minutes_versions(meeting_id,revision desc);

-- The existing structured minutes table was introduced in DOC-01 and has ZERO rows
-- at baseline. Do not modify public.minutes.status/version/body.
alter table public.meeting_official_minutes_versions
  drop constraint meeting_official_minutes_versions_document_status_check;
alter table public.meeting_official_minutes_versions
  add constraint meeting_official_minutes_versions_document_status_check
  check(document_status in ('draft','submitted','returned','reviewed','ratified'));

alter table public.meeting_agenda_document_versions enable row level security;
create policy "agenda document versions: editor or reviewed" on public.meeting_agenda_document_versions
 for select to authenticated using (
   private.can_edit_meeting(meeting_id)
   or (document_status='reviewed' and private.can_view_meeting(meeting_id))
 );
drop policy "formal snapshots: editor or released" on public.meeting_official_minutes_versions;
create policy "formal snapshots: editor or reviewed ratified" on public.meeting_official_minutes_versions
 for select to authenticated using (
   private.can_edit_meeting(meeting_id)
   or (document_status in ('reviewed','ratified') and private.can_view_meeting(meeting_id))
 );

revoke all on public.meeting_agenda_document_versions from public,anon,authenticated;
grant select on public.meeting_agenda_document_versions to authenticated;

comment on table public.meeting_agenda_document_versions is
 'Append-only DOC-02 drafts; only DOC-03 may implement official issue/ratification workflow.';
comment on table public.meeting_official_minutes_versions is
 'Append-only draft snapshots; DOC-02 cannot create ratified status or alter legacy minutes.';

-- Validate that a version faithfully references ALL and ONLY the source meeting's
-- agenda entries. Snapshot fields are independent from source rows and never overwrite them.
create function private.doc02_valid_fields(p_meeting_id uuid,p_fields jsonb)
returns boolean language plpgsql stable security definer set search_path=''
as $fn$
declare v_items jsonb;v_count integer;
begin
 if p_fields is null or jsonb_typeof(p_fields)<>'object'
    or octet_length(p_fields::text)>150000 then return false; end if;
 if jsonb_typeof(p_fields->'header')<>'object'
    or jsonb_typeof(p_fields->'items')<>'array'
    then return false; end if;
 v_items:=p_fields->'items';
 v_count:=jsonb_array_length(v_items);
 if v_count>100 or v_count<>(select count(*) from public.agendas a where a.meeting_id=p_meeting_id)
    then return false; end if;
 if exists(
   select 1 from jsonb_array_elements(v_items) item
   where jsonb_typeof(item)<>'object'
      or not exists(
        select 1 from public.agendas a where a.meeting_id=p_meeting_id
           and a.id::text=item->>'agenda_id'
           and (item->>'title') is not distinct from a.title
           and (item->>'notes') is not distinct from a.notes
           and (item->>'section') is not distinct from a.section::text
           and (item->>'position') is not distinct from a.position::text
      )
 ) then return false; end if;
 if (select count(distinct item->>'agenda_id') from jsonb_array_elements(v_items) item)<>v_count
    then return false; end if;
 return true;
end;
$fn$;
revoke all on function private.doc02_valid_fields(uuid,jsonb) from public,anon,authenticated;

-- Serialize version operations on the meeting record; never lock or change source data.
create function public.r2_doc02_save_draft(
 p_meeting_id uuid,p_doc_type text,p_fields jsonb,p_expected_revision integer
) returns integer language plpgsql security definer set search_path=''
as $fn$
declare v_status text;v_latest integer;v_new integer;
begin
 if auth.uid() is null or not private.can_edit_meeting(p_meeting_id)
   then raise exception 'Editor only'; end if;
 if p_doc_type is null or p_doc_type not in ('agenda','minutes')
   then raise exception 'Invalid document type'; end if;
 perform 1 from public.meetings m where m.id=p_meeting_id
   and m.meeting_mode is distinct from 'externally_hosted'
   and m.meeting_mode is distinct from 'co_hosted'
   and m.status not in ('ratified','archived') for update;
 if not found then raise exception 'Meeting not eligible for DOC-02'; end if;
 if not private.doc02_valid_fields(p_meeting_id,p_fields)
   then raise exception 'Invalid document fields or agenda source mismatch'; end if;
 if p_doc_type='agenda' then
   select revision,document_status into v_latest,v_status
   from public.meeting_agenda_document_versions
   where meeting_id=p_meeting_id order by revision desc limit 1;
 else
   select revision,document_status into v_latest,v_status
   from public.meeting_official_minutes_versions
   where meeting_id=p_meeting_id order by revision desc limit 1;
 end if;
 if coalesce(v_latest,0) is distinct from p_expected_revision
   then raise exception 'Version conflict; reload'; end if;
 if v_status in ('submitted','ratified')
   then raise exception 'Document locked for review or already ratified'; end if;
 v_new:=coalesce(v_latest,0)+1;
 if p_doc_type='agenda' then
   insert into public.meeting_agenda_document_versions(
     meeting_id,revision,document_fields,document_status,recorded_by)
   values(p_meeting_id,v_new,p_fields,'draft',auth.uid());
 else
   insert into public.meeting_official_minutes_versions(
     meeting_id,revision,document_fields,document_status,recorded_by)
   values(p_meeting_id,v_new,p_fields,'draft',auth.uid());
 end if;
 insert into public.audit_events(actor_id,action,target_table,target_id,details)
 values(auth.uid(),'doc02_save_draft','meetings',p_meeting_id,
   jsonb_build_object('type',p_doc_type,'revision',v_new));
 return v_new;
end;
$fn$;

create function public.r2_doc02_submit(
 p_meeting_id uuid,p_doc_type text,p_expected_revision integer
) returns integer language plpgsql security definer set search_path=''
as $fn$
declare v_status text;v_latest integer;v_fields jsonb;v_new integer;v_header jsonb;
begin
 if auth.uid() is null or not private.can_edit_meeting(p_meeting_id)
   then raise exception 'Editor only'; end if;
 if p_doc_type is null or p_doc_type not in ('agenda','minutes')
   then raise exception 'Invalid document type'; end if;
 perform 1 from public.meetings m where m.id=p_meeting_id
   and m.meeting_mode is distinct from 'externally_hosted'
   and m.meeting_mode is distinct from 'co_hosted'
   and m.status not in ('ratified','archived') for update;
 if not found then raise exception 'Meeting not eligible for DOC-02'; end if;
 if p_doc_type='agenda' then
   select revision,document_status,document_fields into v_latest,v_status,v_fields
   from public.meeting_agenda_document_versions where meeting_id=p_meeting_id
   order by revision desc limit 1;
 else
   select revision,document_status,document_fields into v_latest,v_status,v_fields
   from public.meeting_official_minutes_versions where meeting_id=p_meeting_id
   order by revision desc limit 1;
 end if;
 if v_latest is null or v_latest is distinct from p_expected_revision
    then raise exception 'Version conflict; reload'; end if;
 if v_status<>'draft' then raise exception 'Only draft may be submitted'; end if;
 if not private.doc02_valid_fields(p_meeting_id,v_fields)
    then raise exception 'Source agenda changed; prepare a new draft'; end if;
 v_header:=v_fields->'header';
 if nullif(btrim(coalesce(v_header->>'meeting_no','')),'') is null
   then raise exception 'Meeting number required before submission'; end if;
 if p_doc_type='minutes' and (
   nullif(btrim(coalesce(v_header->>'chair','')),'') is null or
   nullif(btrim(coalesce(v_header->>'recorder','')),'') is null or
   nullif(btrim(coalesce(v_header->>'attendees','')),'') is null or
   nullif(btrim(coalesce(v_header->>'start_time','')),'') is null or
   nullif(btrim(coalesce(v_header->>'end_time','')),'') is null
 ) then raise exception 'Complete minutes recorder, chair, participants and times'; end if;
 v_new:=v_latest+1;
 if p_doc_type='agenda' then
   insert into public.meeting_agenda_document_versions(
     meeting_id,revision,document_fields,document_status,recorded_by)
   values(p_meeting_id,v_new,v_fields,'submitted',auth.uid());
 else
   insert into public.meeting_official_minutes_versions(
     meeting_id,revision,document_fields,document_status,recorded_by)
   values(p_meeting_id,v_new,v_fields,'submitted',auth.uid());
 end if;
 insert into public.audit_events(actor_id,action,target_table,target_id,details)
 values(auth.uid(),'doc02_submit','meetings',p_meeting_id,
   jsonb_build_object('type',p_doc_type,'revision',v_new));
 return v_new;
end;
$fn$;

create function public.r2_doc02_review(
 p_meeting_id uuid,p_doc_type text,p_expected_revision integer,
 p_approve boolean,p_note text default ''
) returns integer language plpgsql security definer set search_path=''
as $fn$
declare v_status text;v_latest integer;v_fields jsonb;v_actor uuid;v_new integer;
begin
 if auth.uid() is null or not private.is_admin()
   or not private.can_edit_meeting(p_meeting_id) then raise exception 'Reviewer only'; end if;
 if p_doc_type is null or p_doc_type not in ('agenda','minutes')
   then raise exception 'Invalid document type'; end if;
 if char_length(coalesce(p_note,''))>2000 or
    (p_approve is distinct from true and nullif(btrim(coalesce(p_note,'')),'') is null)
   then raise exception 'Review reason required or too long'; end if;
 perform 1 from public.meetings where id=p_meeting_id
   and meeting_mode is distinct from 'externally_hosted'
   and meeting_mode is distinct from 'co_hosted'
   and status not in ('ratified','archived') for update;
 if not found then raise exception 'Meeting not eligible for DOC-02'; end if;
 if p_doc_type='agenda' then
   select revision,document_status,document_fields,recorded_by
   into v_latest,v_status,v_fields,v_actor
   from public.meeting_agenda_document_versions
   where meeting_id=p_meeting_id order by revision desc limit 1;
 else
   select revision,document_status,document_fields,recorded_by
   into v_latest,v_status,v_fields,v_actor
   from public.meeting_official_minutes_versions
   where meeting_id=p_meeting_id order by revision desc limit 1;
 end if;
 if v_latest is null or v_latest is distinct from p_expected_revision
   then raise exception 'Version conflict; reload'; end if;
 if v_status<>'submitted' then raise exception 'Document not awaiting review'; end if;
 if v_actor=auth.uid() then raise exception 'Independent reviewer required'; end if;
 v_new:=v_latest+1;
 v_fields:=jsonb_set(v_fields,'{review_note}',to_jsonb(coalesce(p_note,'')),true);
 if p_doc_type='agenda' then
   insert into public.meeting_agenda_document_versions(
     meeting_id,revision,document_fields,document_status,recorded_by)
   values(p_meeting_id,v_new,v_fields,case when p_approve then 'reviewed' else 'returned' end,auth.uid());
 else
   insert into public.meeting_official_minutes_versions(
     meeting_id,revision,document_fields,document_status,recorded_by)
   values(p_meeting_id,v_new,v_fields,case when p_approve then 'reviewed' else 'returned' end,auth.uid());
 end if;
 insert into public.audit_events(actor_id,action,target_table,target_id,details)
 values(auth.uid(),'doc02_review','meetings',p_meeting_id,
   jsonb_build_object('type',p_doc_type,'revision',v_new,'reviewed',p_approve,
                      'note',coalesce(p_note,'')));
 return v_new;
end;
$fn$;

revoke all on function
 public.r2_doc02_save_draft(uuid,text,jsonb,integer),
 public.r2_doc02_submit(uuid,text,integer),
 public.r2_doc02_review(uuid,text,integer,boolean,text)
 from public,anon,authenticated;
grant execute on function
 public.r2_doc02_save_draft(uuid,text,jsonb,integer),
 public.r2_doc02_submit(uuid,text,integer),
 public.r2_doc02_review(uuid,text,integer,boolean,text)
 to authenticated;
commit;
