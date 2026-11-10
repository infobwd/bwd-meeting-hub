import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const portal=readFileSync("portal.js","utf8");
const css=readFileSync("portal.css","utf8");
const html=readFileSync("workspace.html","utf8");
const migration=readFileSync("supabase/migrations/202611100008_task_assignment_withdrawal.sql","utf8");
const isolated=portal.replace(/\nmain\(\);\n\}\)\(\);\s*$/,
 '\nglobalThis.__ux11={state,taskCard,assigneeOptionMarkup,usersOptions};\n})();');
assert.notEqual(isolated,portal,"Portal JavaScript isolation failed");
const ctx={window:{BWD_SUPABASE_CONFIG:{}},document:{getElementById:()=>({})}};
vm.runInNewContext(isolated,ctx,{timeout:2500,filename:"portal.js"});
const {state,taskCard,assigneeOptionMarkup,usersOptions}=ctx.__ux11;
function seed(status="submitted",owner="u1"){
 state.user={id:"u1",email:"owner@example.com"};state.member={role:"admin"};
 state.profiles=[{id:"u1",display_name:""}];
 state.meetings=[{id:"m1",title:"ประชุมคณะกรรมการ",kind:"board",status:"draft",scheduled_on:"2026-11-10"}];
 state.tasks=[{id:"t1",title:"จัดทำหนังสือขอบคุณ",owner_id:owner,status,version:7,due_on:"2026-11-23",description:"งาน"}];
 state.links=[{task_id:"t1",meeting_id:"m1"}];state.updates=[];state.evidence=[];state.access=[];
 state.agendas=[];state.decisions=[];state.minutes=[];state.documents=[];state.taskDetailsOpen={};
}
test("UX-11 names active choices and never exposes UUID as option label",()=>{
 seed();
 const u="80be82b8-9a3d-45eb-8ef8-4b9b8339bc6f";
 const markup=assigneeOptionMarkup([
  {user_id:u,display_name:"คุณครูผู้รับผิดชอบ",member_role:"member"},
  {user_id:"u1",display_name:"ผู้บริหาร",member_role:"admin"}
 ],u);
 assert.match(markup,/คุณครูผู้รับผิดชอบ · คุณครู/);
 assert.match(markup,/ผู้บริหาร \(บัญชีของฉัน\) · ผู้บริหาร/);
 assert.match(markup,/value="80be82b8-9a3d-45eb-8ef8-4b9b8339bc6f"/);
 assert.doesNotMatch(markup,/>80be82b8-/);
 assert.match(usersOptions("u1"),/owner@example\.com/);
 assert.doesNotMatch(usersOptions("u1"),/>u1<\/option>/);
 const hostile=assigneeOptionMarkup([{user_id:u,display_name:'<script>alert(1)</script>',member_role:"member"}],u);
 assert.doesNotMatch(hostile,/<script>/);
 assert.match(hostile,/&lt;script&gt;/);
});
test("UX-11 submitted task allows only its owner to recall, no owner reassignment while submitted",()=>{
 seed();
 const own=taskCard(state.tasks[0],true);
 assert.match(own,/data-action="taskWithdraw"/);
 assert.match(own,/ดึงงานกลับมาแก้ไข/);
 assert.doesNotMatch(own,/data-action="taskOwner"/);
 assert.doesNotMatch(own,/data-action="taskApprove"/);
 seed("submitted","u2");
 const reviewer=taskCard(state.tasks[0],true);
 assert.match(reviewer,/data-action="taskApprove"/);
 assert.match(reviewer,/data-action="taskReject"/);
 assert.doesNotMatch(reviewer,/data-action="taskWithdraw"/);
 assert.doesNotMatch(reviewer,/data-action="taskOwner"/);
 seed("approved");
 const approved=taskCard(state.tasks[0],true);
 assert.doesNotMatch(approved,/data-action="taskWithdraw"/);
});
test("UX-11 preserves assignment control in active state and reason-required dialogs",()=>{
 seed("doing");
 const active=taskCard(state.tasks[0],true);
 assert.match(active,/data-action="taskOwner"/);
 assert.match(portal,/mode==="taskWithdraw"&&t/);
 assert.match(portal,/field\("เหตุผลที่ดึงงานกลับ \*","reason",textarea\("reason","",true\)\)/);
 assert.match(portal,/field\("เหตุผลที่เปลี่ยนผู้รับผิดชอบ \*","reason",textarea\("reason","",true\)\)/);
 assert.match(portal,/method="r2_withdraw_task_submission"/);
 assert.match(portal,/p_reason:g\("reason",2000\)/);
 assert.match(portal,/method="r2_set_task_owner"/);
 assert.match(portal,/r2_task_assignee_options/);
 assert.match(portal,/r2_meeting_assignee_options/);
 assert.match(portal,/entries\.length<=1/);
 assert.match(css,/\.assignee-lookup-help/);
});
test("UX-11 migration restricts withdraw to current owner and submitted version",()=>{
 assert.match(migration,/private\.is_active_member\(\)/);
 assert.match(migration,/v_task\.owner_id is distinct from auth\.uid\(\)/);
 assert.match(migration,/if v_task\.status<>'submitted'/);
 assert.match(migration,/v_task\.version<>p_expected_version/);
 assert.match(migration,/if v_reason=''/);
 assert.match(migration,/insert into public\.task_updates\(task_id,author_id,note,new_status\)/);
 assert.match(migration,/withdraw_submission/);
 assert.match(migration,/grant execute on function public\.r2_withdraw_task_submission\(uuid,text,integer\) to authenticated/);
 assert.match(migration,/revoke all on function public\.r2_withdraw_task_submission\(uuid,text,integer\) from public,anon/);
});
test("UX-11 prevents silent reassignment during pending review and enforces audit reason",()=>{
 assert.match(migration,/v_task\.status in \('submitted','approved','cancelled'\)/);
 assert.match(migration,/if v_reason='' then raise exception 'Reassignment reason required'/);
 assert.match(migration,/old_owner.*new_owner/s);
 assert.match(migration,/reason.*version/s);
 assert.match(migration,/grant execute on function public\.r2_set_task_owner\(uuid,uuid,integer,text\) to authenticated/);
 assert.match(migration,/revoke all on function public\.r2_set_task_owner\(uuid,uuid,integer\) from public,anon,authenticated/);
 assert.match(migration,/Reassignment requires a reason; refresh the website/);
});
test("UX-11 assignee options are only active staff, scoped to authorized reviewers",()=>{
 assert.match(migration,/private\.can_review_task\(p_task_id\)/);
 assert.match(migration,/private\.can_edit_meeting\(p_meeting_id\)/);
 assert.match(migration,/where wm\.active and wm\.role in \('admin','secretary','member'\)/);
 assert.doesNotMatch(migration,/staff_directory|inviteUser|auth\.admin/);
 assert.match(migration,/grant execute on function public\.r2_task_assignee_options\(uuid\) to authenticated/);
 assert.match(migration,/grant execute on function public\.r2_meeting_assignee_options\(uuid\) to authenticated/);
 assert.doesNotMatch(html,/service_role/);
 assert.equal((html.match(/data-page="(overview|meetings|tasks)"/g)||[]).length,3);
});
