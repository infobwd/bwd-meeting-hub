-- UX-11: Assignment labels, auditable reassignment, and owner submission withdrawal.
-- No task data is updated by this migration; only RPC permissions and behavior change.
begin;

-- Server-scoped options: only an editor/reviewer for this task can list assignable members.
-- Private pre-invitation staff directory is intentionally never queried.
create or replace function public.r2_task_assignee_options(p_task_id uuid)
returns table(user_id uuid,display_name text,member_role text)
language plpgsql security definer set search_path=''
as $fn$
begin
  if auth.uid() is null or not private.can_review_task(p_task_id)
    then raise exception 'Editor only'; end if;
  return query
  select wm.user_id,
    coalesce(nullif(btrim(p.display_name),''),
             nullif(btrim(u.email),''),
             'บัญชีที่ยังไม่ระบุชื่อ')::text as display_name,
    wm.role::text as member_role
  from public.workspace_members wm
  left join public.profiles p on p.id=wm.user_id
  left join auth.users u on u.id=wm.user_id
  where wm.active and wm.role in ('admin','secretary','member')
  order by display_name,wm.user_id;
end;
$fn$;
revoke all on function public.r2_task_assignee_options(uuid) from public,anon;
grant execute on function public.r2_task_assignee_options(uuid) to authenticated;

-- Withdraw only your own still-submitted task, never an approved/cancelled/reviewed one.
-- Preserve the original submitted history; append a new status change with the reason.
create or replace function public.r2_withdraw_task_submission(
  p_task_id uuid,p_reason text,p_expected_version integer
) returns integer
language plpgsql security definer set search_path=''
as $fn$
declare v_task public.tasks%rowtype;v_version integer;v_reason text;
begin
  if auth.uid() is null or not private.is_active_member()
    then raise exception 'Access denied'; end if;
  v_reason := btrim(coalesce(p_reason,''));
  if v_reason='' then raise exception 'Withdrawal reason required'; end if;
  if char_length(v_reason)>2000 then raise exception 'Reason too long'; end if;
  select * into v_task from public.tasks where id=p_task_id for update;
  if not found or v_task.version<>p_expected_version
    then raise exception 'Version conflict; reload'; end if;
  if v_task.owner_id is distinct from auth.uid()
    then raise exception 'Only the assignee may withdraw submission'; end if;
  if v_task.status<>'submitted'
    then raise exception 'Only pending submissions may be withdrawn'; end if;
  update public.tasks
    set status='doing',version=version+1,updated_at=now()
    where id=p_task_id returning version into v_version;
  insert into public.task_updates(task_id,author_id,note,new_status)
    values(p_task_id,auth.uid(),'ดึงงานกลับมาแก้ไข: '||v_reason,'doing');
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
    values(auth.uid(),'withdraw_submission','tasks',p_task_id,
      jsonb_build_object('from_status','submitted','to_status','doing',
                         'version',v_version,'reason',v_reason));
  return v_version;
end;
$fn$;
revoke all on function public.r2_withdraw_task_submission(uuid,text,integer) from public,anon;
grant execute on function public.r2_withdraw_task_submission(uuid,text,integer) to authenticated;

-- Legacy 3-argument task-owner RPC must not bypass the mandatory reason.
revoke all on function public.r2_set_task_owner(uuid,uuid,integer) from public,anon,authenticated;
create or replace function public.r2_set_task_owner(
  p_task_id uuid,p_owner_id uuid,p_expected_version integer
) returns integer
language plpgsql security definer set search_path=''
as $fn$
begin
  raise exception 'Reassignment requires a reason; refresh the website';
end;
$fn$;
revoke all on function public.r2_set_task_owner(uuid,uuid,integer) from public,anon,authenticated;

-- New audit-safe operation: no reassignment while waiting for review.
create or replace function public.r2_set_task_owner(
  p_task_id uuid,p_owner_id uuid,p_expected_version integer,p_reason text
) returns integer
language plpgsql security definer set search_path=''
as $fn$
declare
  v_task public.tasks%rowtype;
  v_version integer;
  v_reason text;
  v_old_label text;
  v_new_label text;
begin
  if auth.uid() is null or not private.can_review_task(p_task_id)
    then raise exception 'Editor only'; end if;
  v_reason := btrim(coalesce(p_reason,''));
  if v_reason='' then raise exception 'Reassignment reason required'; end if;
  if char_length(v_reason)>2000 then raise exception 'Reason too long'; end if;
  if p_owner_id is not null and not exists(
    select 1 from public.workspace_members wm
    where wm.user_id=p_owner_id and wm.active
      and wm.role in ('admin','secretary','member')
  ) then raise exception 'Assignee must be an active staff member'; end if;
  select * into v_task from public.tasks where id=p_task_id for update;
  if not found or v_task.version<>p_expected_version
    then raise exception 'Version conflict; reload'; end if;
  if v_task.status in ('submitted','approved','cancelled')
    then raise exception 'Task locked while pending review or completed'; end if;
  if v_task.owner_id is not distinct from p_owner_id
    then raise exception 'Assignee has not changed'; end if;

  select coalesce(nullif(btrim(p.display_name),''),'บัญชีผู้รับผิดชอบเดิม')
    into v_old_label from public.profiles p where p.id=v_task.owner_id;
  select coalesce(nullif(btrim(p.display_name),''),'บัญชีผู้รับผิดชอบใหม่')
    into v_new_label from public.profiles p where p.id=p_owner_id;

  update public.tasks
    set owner_id=p_owner_id,version=version+1,updated_at=now()
    where id=p_task_id returning version into v_version;
  insert into public.task_updates(task_id,author_id,note,new_status)
    values(p_task_id,auth.uid(),
      'เปลี่ยนผู้รับผิดชอบ: '||
      coalesce(v_old_label,'ยังไม่มอบหมาย')||' → '||
      coalesce(v_new_label,'ยังไม่มอบหมาย')||'. เหตุผล: '||v_reason,
      v_task.status);
  insert into public.audit_events(actor_id,action,target_table,target_id,details)
    values(auth.uid(),'assign','tasks',p_task_id,
      jsonb_build_object('old_owner',v_task.owner_id,'new_owner',p_owner_id,
                         'reason',v_reason,'version',v_version));
  return v_version;
end;
$fn$;
revoke all on function public.r2_set_task_owner(uuid,uuid,integer,text) from public,anon;
grant execute on function public.r2_set_task_owner(uuid,uuid,integer,text) to authenticated;
commit;
