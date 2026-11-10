-- R2 follow-up: retire withdrawn source topics without deleting history.
-- No real meeting data or person names in this public migration.
begin;

alter table public.agendas
  add column if not exists retired_at timestamptz;
comment on column public.agendas.retired_at is
  'Null means active. Non-null preserves withdrawn agenda ID and original contents for audit.';
create index if not exists agendas_active_meeting_idx
  on public.agendas(meeting_id,section,position) where retired_at is null;

create table if not exists private.agenda_source_correction_batches (
  batch_id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id),
  reason text not null,
  before_rows jsonb not null,
  after_rows jsonb not null,
  recorded_at timestamptz not null default now()
);
alter table private.agenda_source_correction_batches enable row level security;
revoke all on private.agenda_source_correction_batches from public,anon,authenticated;
comment on table private.agenda_source_correction_batches is
  'Protected administrative before/after source snapshots. Not an official meeting document.';

-- DOC-02 validates only currently active source topics. Immutable old versions
-- continue to contain their original source snapshots (including retired topics).
create or replace function private.doc02_valid_fields(p_meeting_id uuid,p_fields jsonb)
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
 if v_count>100 or v_count<>(
   select count(*) from public.agendas a
   where a.meeting_id=p_meeting_id and a.retired_at is null
 ) then return false; end if;
 if exists(
   select 1 from jsonb_array_elements(v_items) item
   where jsonb_typeof(item)<>'object'
      or not exists(
        select 1 from public.agendas a
        where a.meeting_id=p_meeting_id and a.retired_at is null
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

commit;
