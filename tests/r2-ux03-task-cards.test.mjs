import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const portal=readFileSync("portal.js","utf8");
const css=readFileSync("portal.css","utf8");
const html=readFileSync("workspace.html","utf8");
const testable=portal.replace(/\nmain\(\);\n\}\)\(\);\s*$/, '\nglobalThis.__ux03={state,taskCard,renderTasks,renderMeeting};\n})();');
assert.notEqual(testable,portal,"Could not isolate portal pure renderer");
const ctx={document:{getElementById:()=>({})},window:{BWD_SUPABASE_CONFIG:{}}};
vm.runInNewContext(testable,ctx,{timeout:2200,filename:"portal.js"});
const {state,taskCard,renderTasks,renderMeeting}=ctx.__ux03;
const task={id:"task-1",title:"จัดเตรียมอาหารนักกีฬา",owner_id:"teacher-1",due_on:"2026-11-12",
  status:"doing",description:"สรุปจำนวนผู้เข้าร่วมและแนบเอกสาร",created_at:"2026-11-10"};
const meeting={id:"meeting-1",kind:"board",title:"ประชุมกรรมการสถานศึกษา",status:"draft",scheduled_on:"2026-11-10"};
const evidence={task_id:task.id,object_path:"proofs/private-proof.pdf",original_name:"เอกสารประกอบ.pdf"};
const update={task_id:task.id,created_at:"2026-11-10T09:00:00",author_id:"teacher-1",new_status:"doing",note:"ประสานข้อมูลแล้ว"};
function seed(userId="teacher-1",role="member"){
 state.user={id:userId};state.member={role};state.tasks=[{...task}];state.meetings=[meeting];
 state.access=[];state.links=[{task_id:task.id,meeting_id:meeting.id}];state.profiles=[{id:"teacher-1",display_name:"คุณครู"}];
 state.evidence=[evidence];state.updates=[update];state.agendas=[];state.documents=[];state.minutes=[];
 state.decisions=[];state.taskFilter="all";state.taskDetailsOpen={};
}

test("owner sees next action immediately with all supporting controls in disclosure",()=>{
 seed();
 const card=taskCard(task,true);
 assert.match(card,/ผู้รับผิดชอบ/);
 assert.match(card,/กำหนดส่ง/);
 assert.match(card,/กำลังดำเนินการ/);
 assert.match(card,/data-action="taskState"/);
 assert.match(card,/details class="task-details"/);
 assert.match(card,/data-action="taskNote"/);
 assert.match(card,/data-evidence-upload="task-1"/);
 assert.match(card,/data-action="previewEvidence"/);
 assert.match(card,/data-action="downloadEvidence"/);
 assert.match(card,/ประวัติงาน/);
 assert.doesNotMatch(card,/data-action="taskApprove"/);
 assert.doesNotMatch(card,/data-action="taskOwner"/);
 assert.doesNotMatch(card,/data-action="linkTask"/);
 assert.ok(card.indexOf('data-action="taskState"')<card.indexOf('<details class="task-details"'));
});

test("independent reviewer can accept or return submitted task, but cannot change locked task state",()=>{
 seed("admin-1","admin");
 const submitted={...task,status:"submitted"};
 const card=taskCard(submitted,true);
 assert.match(card,/ส่งให้ตรวจ/);
 assert.match(card,/data-action="taskApprove"/);
 assert.match(card,/data-action="taskReject"/);
 assert.match(card,/data-action="taskOwner"/);
 assert.match(card,/data-action="linkTask"/);
 assert.match(card,/data-evidence-upload/);
 assert.doesNotMatch(card,/data-action="taskState"/);
 assert.ok(card.indexOf('data-action="taskApprove"')<card.indexOf('<details class="task-details"'));
});

test("assigned owner cannot self-approve a submitted task and guest gets no mutating buttons",()=>{
 seed();
 const submitted={...task,status:"submitted"};
 let card=taskCard(submitted);
 assert.doesNotMatch(card,/data-action="taskApprove"/);
 assert.doesNotMatch(card,/data-action="taskReject"/);
 assert.doesNotMatch(card,/data-action="taskState"/);
 assert.match(card,/data-action="taskNote"/);
 seed("guest-1","guest");
 card=taskCard(task);
 for(const name of ["taskState","taskApprove","taskReject","taskOwner","taskNote","linkTask"]){
   assert.ok(!card.includes('data-action="'+name+'"'),name);
 }
 assert.doesNotMatch(card,/data-evidence-upload/);
 assert.match(card,/ผู้รับผิดชอบ/);
});

test("disclosure keeps open state across rerenders, including navigation and filter",()=>{
 seed();
 state.taskDetailsOpen[task.id]=true;
 assert.match(taskCard(task),/data-task-details="task-1" open/);
 state.taskFilter="mine";
 assert.match(renderTasks(),/data-task-details="task-1" open/);
 state.taskFilter="review";
 assert.match(renderTasks(),/ไม่พบงานในหมวดนี้/);
 assert.match(portal,/addEventListener\("toggle"/);
 assert.match(portal,/state\.taskDetailsOpen\[detail\.dataset\.taskDetails\]=detail\.open/);
});

test("meeting task links deduplicate same task and keep existing evidence viewer",()=>{
 seed("admin-1","admin");
 state.links.push({task_id:task.id,meeting_id:meeting.id});
 const view=renderMeeting(meeting);
 assert.equal((view.match(/data-task-card="task-1"/g)||[]).length,1);
 assert.match(view,/data-action="previewEvidence"/);
 assert.match(view,/id="bwd-tasks"/);
});

test("task cards safely escape user-supplied strings and do not make public storage copies",()=>{
 seed();
 const malicious={...task,title:'<script>alert(1)</script>',description:'<img src=x onerror=alert(1)>'};
 const card=taskCard(malicious,true);
 assert.ok(!card.includes("<script>"));
 assert.ok(card.includes("&lt;script&gt;"));
 assert.ok(!card.includes("<img src=x"));
 assert.match(css,/\.task-details summary\{/);
 assert.match(css,/\.task-card-head\{/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(html,/id="evidencePreview"/);
 for(const name of ["r2_change_task","r2_review_task","r2_register_evidence","meeting-evidence"])
   assert.ok(portal.includes(name),name);
});
