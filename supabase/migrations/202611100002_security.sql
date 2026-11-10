-- BWD Meeting Hub R2 / 002_security.sql
-- All writes are handled by narrowly-scoped RPCs in 003_operations.sql.
begin;

create or replace function private.is_active_member()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.workspace_members wm
    where wm.user_id = (select auth.uid()) and wm.active
  );
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.workspace_members wm
    where wm.user_id = (select auth.uid()) and wm.active and wm.role = 'admin'
  );
$$;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.workspace_members wm
    where wm.user_id = (select auth.uid()) and wm.active
      and wm.role in ('admin','secretary','member')
  );
$$;

create or replace function private.can_create_meeting()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.workspace_members wm
    where wm.user_id = (select auth.uid()) and wm.active
      and wm.role in ('admin','secretary')
  );
$$;

create or replace function private.can_view_meeting(p_meeting uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_active_member() and
    (private.is_admin() or exists(
      select 1 from public.meeting_access a
      where a.meeting_id = p_meeting and a.user_id = (select auth.uid())
    ));
$$;

create or replace function private.can_edit_meeting(p_meeting uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_active_member() and
    (private.is_admin() or exists(
      select 1 from public.meeting_access a
      where a.meeting_id = p_meeting and a.user_id = (select auth.uid())
        and a.role = 'editor'
    ));
$$;

create or replace function private.can_view_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_active_member() and
    (private.is_admin()
      or exists(select 1 from public.tasks t where t.id = p_task and t.owner_id = (select auth.uid()))
      or exists(
        select 1 from public.task_meeting_links l
        join public.meeting_access ma on ma.meeting_id = l.meeting_id
        where l.task_id = p_task and ma.user_id = (select auth.uid())
      ));
$$;

create or replace function private.can_review_task(p_task uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_active_member() and
    (private.is_admin()
      or exists(
        select 1 from public.task_meeting_links l
        join public.meeting_access ma on ma.meeting_id = l.meeting_id
        where l.task_id = p_task and ma.user_id = (select auth.uid())
          and ma.role = 'editor'
      ));
$$;

create or replace function private.can_view_profile(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_user = (select auth.uid())
    or (private.is_active_member() and (
      private.is_admin()
      or (private.is_staff() and exists (
        select 1 from public.workspace_members wm
        where wm.user_id = p_user and wm.active and wm.role <> 'guest'
      ))
      or exists (
        select 1 from public.meeting_access a
        where a.user_id = p_user and private.can_view_meeting(a.meeting_id)
      )
    ));
$$;

-- Limit exposed schemas to public, not private. All tables default-deny.
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_access enable row level security;
alter table public.agendas enable row level security;
alter table public.decisions enable row level security;
alter table public.minutes enable row level security;
alter table public.tasks enable row level security;
alter table public.task_meeting_links enable row level security;
alter table public.task_updates enable row level security;
alter table public.task_evidence enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles: visible identities" on public.profiles
for select to authenticated using (private.can_view_profile(id));

create policy "workspace: my membership or admin" on public.workspace_members
for select to authenticated using (
  user_id = (select auth.uid()) or (select private.is_admin())
);

create policy "meetings: invited only" on public.meetings
for select to authenticated using (private.can_view_meeting(id));

create policy "access: participants of visible meetings" on public.meeting_access
for select to authenticated using (private.can_view_meeting(meeting_id));

create policy "agendas: visible meetings" on public.agendas
for select to authenticated using (private.can_view_meeting(meeting_id));

create policy "decisions: visible agenda meeting" on public.decisions
for select to authenticated using (
  exists(select 1 from public.agendas a
         where a.id = agenda_id and private.can_view_meeting(a.meeting_id))
);

create policy "minutes: visible meetings" on public.minutes
for select to authenticated using (private.can_view_meeting(meeting_id));

create policy "tasks: assigned or invited" on public.tasks
for select to authenticated using (private.can_view_task(id));

create policy "task links: visible tasks + meetings" on public.task_meeting_links
for select to authenticated using (
  private.can_view_task(task_id) and private.can_view_meeting(meeting_id)
);

create policy "updates: visible tasks" on public.task_updates
for select to authenticated using (private.can_view_task(task_id));

create policy "evidence metadata: visible tasks" on public.task_evidence
for select to authenticated using (private.can_view_task(task_id));

create policy "audit: administrators only" on public.audit_events
for select to authenticated using ((select private.is_admin()));

-- Revoke inherited public/anonymous access, grant only SELECT to authenticated.
revoke all on table
  public.profiles,public.workspace_members,public.meetings,public.meeting_access,
  public.agendas,public.decisions,public.minutes,public.tasks,public.task_meeting_links,
  public.task_updates,public.task_evidence,public.audit_events
from public,anon,authenticated;

grant usage on schema public to authenticated;
grant select on table
  public.profiles,public.workspace_members,public.meetings,public.meeting_access,
  public.agendas,public.decisions,public.minutes,public.tasks,public.task_meeting_links,
  public.task_updates,public.task_evidence,public.audit_events
to authenticated;

-- Private schema is NOT exposed in Supabase Data API; policies can call these functions.
grant usage on schema private to authenticated;
revoke all on function
  private.is_active_member(),private.is_admin(),private.is_staff(),
  private.can_create_meeting(),private.can_view_meeting(uuid),
  private.can_edit_meeting(uuid),private.can_view_task(uuid),
  private.can_review_task(uuid),private.can_view_profile(uuid)
from public;
grant execute on function
  private.is_active_member(),private.is_admin(),private.is_staff(),
  private.can_create_meeting(),private.can_view_meeting(uuid),
  private.can_edit_meeting(uuid),private.can_view_task(uuid),
  private.can_review_task(uuid),private.can_view_profile(uuid)
to authenticated;

-- Bootstrap instructions: an administrator must explicitly grant role to an Auth user.
-- DO NOT seed demo persons or use auth.user_metadata as a role source.
commit;
