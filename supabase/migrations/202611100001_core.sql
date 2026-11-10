-- BWD Meeting Hub R2 / 001_core.sql
-- Apply in a private Supabase project using a privileged migration role.
-- R1 localStorage data is NOT migrated automatically.
begin;

create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  constraint profile_display_name_length check (char_length(display_name) <= 160)
);

create table if not exists public.workspace_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','secretary','member','guest')),
  active boolean not null default true,
  added_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  kind text not null check (kind in ('board','teacher','management','working','community','other')),
  scheduled_on date,
  location text not null default '' check (char_length(location) <= 180),
  status text not null default 'draft' check (status in ('draft','scheduled','held','minutes_review','reviewed','ratified','archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_access (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','attendee','guest')),
  invited_by uuid references auth.users(id),
  added_at timestamptz not null default now(),
  primary key (meeting_id,user_id)
);

create table if not exists public.agendas (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  section smallint not null check (section between 1 and 5),
  position integer not null default 0 check (position >= 0),
  title text not null check (char_length(title) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 8000),
  created_at timestamptz not null default now(),
  unique (id,meeting_id)
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null unique references public.agendas(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 16000),
  status text not null default 'recorded' check (status in ('draft','recorded','ratified')),
  recorded_by uuid not null references auth.users(id),
  ratified_at timestamptz,
  ratified_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 100000),
  status text not null default 'draft' check (status in ('draft','submitted','approved')),
  version integer not null default 1 check (version >= 1),
  updated_by uuid not null references auth.users(id),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 12000),
  owner_id uuid references auth.users(id),
  due_on date,
  status text not null default 'todo' check (status in ('todo','doing','blocked','submitted','approved','cancelled')),
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_meeting_links (
  task_id uuid not null references public.tasks(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  agenda_id uuid,
  link_kind text not null default 'origin' check (link_kind in ('origin','followup')),
  linked_by uuid not null references auth.users(id),
  linked_at timestamptz not null default now(),
  primary key (task_id,meeting_id),
  foreign key (agenda_id,meeting_id) references public.agendas(id,meeting_id)
);

create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  note text not null default '' check (char_length(note) <= 4000),
  new_status text not null check (new_status in ('todo','doing','blocked','submitted','approved','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.task_evidence (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  object_path text not null unique check (char_length(object_path) <= 512),
  original_name text not null check (char_length(original_name) <= 200),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  target_table text not null,
  target_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists meeting_access_user_idx on public.meeting_access(user_id,meeting_id);
create index if not exists agendas_meeting_idx on public.agendas(meeting_id,section,position);
create index if not exists tasks_owner_idx on public.tasks(owner_id,status);
create index if not exists tasks_due_idx on public.tasks(due_on);
create index if not exists task_links_meeting_idx on public.task_meeting_links(meeting_id,task_id);
create index if not exists task_updates_task_idx on public.task_updates(task_id,created_at desc);
create index if not exists task_evidence_task_idx on public.task_evidence(task_id);
create index if not exists audit_events_target_idx on public.audit_events(target_table,target_id,created_at desc);

-- A new Auth user does NOT automatically gain access to any meetings.
create or replace function private.profile_on_auth_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name',''),160))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists bwd_auth_profile_created on auth.users;
create trigger bwd_auth_profile_created
after insert on auth.users
for each row execute function private.profile_on_auth_insert();

-- Privilege and policy definitions live in 002_security.sql, no public writes.
commit;
