-- DOC-01: Optional per-meeting agenda templates + formal document version/evidence contract.
-- No changes to existing minutes, ratification statuses, or any old agenda values.
begin;

create table public.meeting_document_settings (
 meeting_id uuid primary key references public.meetings(id) on delete cascade,
 agenda_template_key text not null check (agenda_template_key in ('legacy5','school6')),
 minutes_format text not null default 'legacy_text'
   check (minutes_format in ('legacy_text','standard11')),
 template_version integer not null default 1 check (template_version>=1),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
comment on table public.meeting_document_settings is
 'Optional configuration: missing row means do not interpret or renumber legacy agendas.';

-- Explicitly relax ONLY the numeric storage bound for new six-part templates.
-- Existing r2_add_agenda still checks 1..5; new RPC below is gated by school6.
alter table public.agendas drop constraint agendas_section_check;
alter table public.agendas add constraint agendas_section_check
 check (section between 1 and 6);

create table public.meeting_official_minutes_versions (
 id uuid primary key default gen_random_uuid(),
 meeting_id uuid not null references public.meetings(id) on delete cascade,
 revision integer not null check (revision>=1),
 document_fields jsonb not null default '{}'::jsonb
   check (jsonb_typeof(document_fields)='object' and octet_length(document_fields::text)<=150000),
 document_status text not null default 'draft'
   check (document_status in ('draft','reviewed','ratified')),
 recorded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique (meeting_id,revision),
 unique (id,meeting_id)
);
comment on table public.meeting_official_minutes_versions is
 'Reserved immutable draft/reviewed snapshots for future DOC-02/03: no client write functions in DOC-01. Not an automatic official record.';

create table public.meeting_ratifications (
 id uuid primary key default gen_random_uuid(),
 meeting_id uuid not null references public.meetings(id) on delete cascade,
 minutes_version_id uuid not null,
 ratified_on date not null,
 ratification_method text not null
   check (ratification_method in ('meeting_resolution','written_circulation','other_authorized')),
 evidence_reference text not null
   check (char_length(evidence_reference) between 1 and 1000),
 recorded_by uuid not null references auth.users(id),
 recorded_at timestamptz not null default now(),
 unique(minutes_version_id),
 foreign key (minutes_version_id,meeting_id)
   references public.meeting_official_minutes_versions(id,meeting_id)
);
comment on table public.meeting_ratifications is
 'Recorded evidence of committee ratification when legally verified; separate from admin review. No client write RPC yet.';

alter table public.meeting_document_settings enable row level security;
alter table public.meeting_official_minutes_versions enable row level security;
alter table public.meeting_ratifications enable row level security;

create policy "document settings: permitted meeting" on public.meeting_document_settings
 for select to authenticated using (private.can_view_meeting(meeting_id));
create policy "formal snapshots: editor or released" on public.meeting_official_minutes_versions
 for select to authenticated using (
  private.can_edit_meeting(meeting_id)
  or (document_status <> 'draft' and private.can_view_meeting(meeting_id))
 );
create policy "ratifications: permitted meeting" on public.meeting_ratifications
 for select to authenticated using (private.can_view_meeting(meeting_id));

revoke all on public.meeting_document_settings,
  public.meeting_official_minutes_versions,public.meeting_ratifications
 from public,anon,authenticated;
grant select on public.meeting_document_settings,
  public.meeting_official_minutes_versions,public.meeting_ratifications
 to authenticated;

-- Template choice is deliberate; do not auto-convert legacy meetings with agenda rows.
create function public.r2_doc_set_template(p_meeting_id uuid,p_template_key text)
returns integer language plpgsql security definer set search_path=''
as $fn$
declare v_row public.meeting_document_settings%rowtype;v_version integer;
begin
 if auth.uid() is null or not private.can_edit_meeting(p_meeting_id)
   then raise exception 'Editor only'; end if;
 if p_template_key is null or p_template_key not in ('legacy5','school6')
   then raise exception 'Invalid agenda template'; end if;
 if not exists(select 1 from public.meetings
   where id=p_meeting_id and status in ('draft','scheduled')
     and (meeting_mode is null or meeting_mode in ('school_hosted','co_hosted')))
   then raise exception 'Meeting not eligible for official agenda'; end if;
 select * into v_row from public.meeting_document_settings
 where meeting_id=p_meeting_id for update;
 if found and v_row.agenda_template_key=p_template_key then return v_row.template_version; end if;
 if exists(select 1 from public.agendas where meeting_id=p_meeting_id)
   then raise exception 'Existing agenda cannot be silently remapped'; end if;
 if found then
  update public.meeting_document_settings
  set agenda_template_key=p_template_key,template_version=template_version+1,
      updated_by=auth.uid(),updated_at=now()
  where meeting_id=p_meeting_id returning template_version into v_version;
 else
  insert into public.meeting_document_settings
     (meeting_id,agenda_template_key,updated_by)
  values(p_meeting_id,p_template_key,auth.uid())
  returning template_version into v_version;
 end if;
 insert into public.audit_events(actor_id,action,target_table,target_id,details)
 values(auth.uid(),'doc_set_template','meetings',p_meeting_id,
        jsonb_build_object('template',p_template_key,'version',v_version));
 return v_version;
end;
$fn$;

-- New versioned route for sixth group. Legacy r2_add_agenda remains 1..5 unchanged.
create function public.r2_doc_add_agenda(
 p_meeting_id uuid,p_section integer,p_title text,p_notes text default ''
) returns uuid language plpgsql security definer set search_path=''
as $fn$
declare v_id uuid;v_position integer;v_key text;
begin
 if auth.uid() is null or not private.can_edit_meeting(p_meeting_id)
   then raise exception 'Editor only'; end if;
 if not exists(select 1 from public.meetings
               where id=p_meeting_id and status in ('draft','scheduled','held')
                 and meeting_mode is distinct from 'externally_hosted')
   then raise exception 'Meeting not editable'; end if;
 if p_section is null or p_section not between 1 and 6
   or nullif(btrim(coalesce(p_title,'')),'') is null
   or char_length(p_title)>200 or char_length(coalesce(p_notes,''))>8000
   then raise exception 'Invalid agenda'; end if;
 select agenda_template_key into v_key from public.meeting_document_settings
 where meeting_id=p_meeting_id;
 if p_section=6 and v_key is distinct from 'school6'
   then raise exception 'Sixth section requires selected six-part template'; end if;
 if v_key='legacy5' and p_section>5
   then raise exception 'Agenda section not enabled'; end if;
 select coalesce(max(position),0)+1 into v_position
 from public.agendas where meeting_id=p_meeting_id;
 insert into public.agendas(meeting_id,section,position,title,notes)
 values(p_meeting_id,p_section,v_position,btrim(p_title),coalesce(p_notes,''))
 returning id into v_id;
 insert into public.audit_events(actor_id,action,target_table,target_id)
 values(auth.uid(),'doc_add_agenda','agendas',v_id);
 return v_id;
end;
$fn$;

revoke all on function
 public.r2_doc_set_template(uuid,text),
 public.r2_doc_add_agenda(uuid,integer,text,text)
 from public,anon,authenticated;
grant execute on function
 public.r2_doc_set_template(uuid,text),
 public.r2_doc_add_agenda(uuid,integer,text,text)
 to authenticated;
commit;
