import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync("workspace.html","utf8");
const css=readFileSync("portal.css","utf8");
const js=readFileSync("portal.js","utf8");
const reader=readFileSync("meeting-pdf-reader.js","utf8");
const testable=js.replace(/\nmain\(\);\n\}\)\(\);\s*$/,'\nglobalThis.__ux07={state,displayMeetingTitle,statusHelp,taskCard,renderOverview,renderMeeting};\n})();');
assert.notEqual(testable,js,"Cannot isolate pure UI rendering");
const ctx={document:{getElementById:()=>({})},window:{BWD_SUPABASE_CONFIG:{}}};
vm.runInNewContext(testable,ctx,{timeout:2500,filename:"portal.js"});
const {state,displayMeetingTitle,statusHelp,taskCard,renderOverview,renderMeeting}=ctx.__ux07;
function seed(){
 state.user={id:"user-1"};state.member={role:"admin"};
 state.profiles=[{id:"user-1",display_name:"ผู้บริหาร"}];
 state.meetings=[{id:"meeting-1",title:"ประชุมกรรมการ (ร่างรายงาน)",kind:"board",status:"draft",scheduled_on:"2026-11-10"}];
 state.tasks=[{id:"task-1",title:"จัดทำหนังสือขอบคุณ",owner_id:"user-1",status:"blocked",due_on:"2026-11-23",description:"รอหลักฐาน"}];
 state.access=[];state.agendas=[];state.decisions=[];state.minutes=[];state.documents=[];
 state.links=[{task_id:"task-1",meeting_id:"meeting-1"}];
 state.updates=[{task_id:"task-1",note:"ยังรอ",new_status:"blocked",created_at:"2026-11-10",author_id:"user-1"}];
 state.evidence=[];state.taskDetailsOpen={};
}
test("UX-07 account button is compact, keyboard usable, and keeps logout",()=>{
 assert.equal((html.match(/data-page="(overview|meetings|tasks)"/g)||[]).length,3);
 assert.match(html,/id="accountMenu" class="account-menu" hidden/);
 assert.match(html,/id="accountName"/);
 assert.match(html,/id="logout"/);
 assert.match(js,/\$\("accountMenu"\)\.hidden=false/);
 assert.match(js,/\$\("accountMenu"\)\.hidden=true/);
 assert.match(css,/\.account-menu summary:focus-visible/);
});
test("UX-07 separates meeting title and draft badge; status helper is specific",()=>{
 seed();
 assert.equal(displayMeetingTitle(state.meetings[0]),"ประชุมกรรมการ");
 assert.match(renderMeeting(state.meetings[0]),/0 หัวข้อย่อย/);
 assert.match(statusHelp("blocked"),/ปัญหา/);
 assert.match(statusHelp("submitted"),/หลักฐาน/);
 assert.match(js,/t\.status===k\?'selected'/);
 assert.match(js,/editMode==="taskState"/);
 assert.match(js,/aria-describedby="taskStatusHelp"/);
});
test("UX-07 task card has layered evidence and history without duplicating meeting title",()=>{
 seed();
 const card=taskCard(state.tasks[0],true);
 assert.match(card,/ติดปัญหา/);
 assert.match(card,/data-action="taskState"/);
 assert.match(card,/details class="task-details"/);
 assert.match(card,/details class="task-subdetails"/);
 assert.match(card,/จากการประชุม: ประชุมกรรมการ/);
 assert.match(card,/รอหลักฐาน/);
 assert.match(js,/r2_review_task/);
 assert.match(js,/r2_register_evidence/);
 assert.ok(renderOverview().indexOf("งานที่ต้องติดตาม")<renderOverview().indexOf("การประชุมล่าสุด"));
});
test("UX-07 PDF quick modes are hidden on Drive and exposed for PDF.js",()=>{
 assert.match(html,/id="readerQuickModes"[^>]*hidden/);
 for(const id of ["readerQuickWidth","readerQuickPage","readerQuickOut","readerQuickIn"]){
   assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(reader,/ui\.quick\.hidden=true/);
 assert.match(reader,/ui\.quick\.hidden=false/);
 assert.match(reader,/fit=preferredFit/);
 assert.match(reader,/chooseFit/);
 assert.match(reader,/showDrive\(/);
 assert.match(css,/\.reader-quick-modes\[hidden\]\{display:none!important\}/);
});
test("UX-07 makes toast compact on mobile and keeps three balanced metrics",()=>{
 assert.match(css,/\.toast-region\{top:auto;bottom:calc\(91px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/\.row-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(js,/ระบบยังไม่ส่งแจ้งเตือนให้ผู้รับผิดชอบโดยอัตโนมัติ/);
 assert.doesNotMatch(html,/service_role|localStorage/i);
});
