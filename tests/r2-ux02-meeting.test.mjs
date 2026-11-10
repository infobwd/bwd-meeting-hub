import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const portal=readFileSync("portal.js","utf8");
const css=readFileSync("portal.css","utf8");
const html=readFileSync("workspace.html","utf8");
const testable=portal.replace(/\nmain\(\);\n\}\)\(\);\s*$/, '\nglobalThis.__ux02 = {state,renderMeeting,renderMeetings,meetingCard,meetingStatusLabel};\n})();');
assert.notEqual(testable,portal,"Must isolate portal main before running pure rendering test");
const context={document:{getElementById:()=>({})},window:{BWD_SUPABASE_CONFIG:{}}};
vm.runInNewContext(testable,context,{timeout:2000,filename:"portal.js"});
const {state,renderMeeting,renderMeetings,meetingCard,meetingStatusLabel}=context.__ux02;
const m={id:"meeting-1",title:"ประชุมคณะกรรมการสถานศึกษาประจำปี",kind:"board",scheduled_on:"2026-11-10",location:"ห้องประชุม",status:"draft",created_at:"2026-11-10"};
function seed(){
  state.user={id:"admin"};
  state.member={role:"admin"};
  state.meetings=[m];
  state.agendas=Array.from({length:13},(_,i)=>({
    id:"agenda-"+i,meeting_id:m.id,section:i<4?1:i<5?2:i<7?3:i<11?4:5,position:i+1,title:"หัวข้อทดสอบ "+(i+1),notes:"รายละเอียดของหัวข้อ "+(i+1)
  }));
  state.documents=[{id:"doc-1",meeting_id:m.id,drive_file_id:"1tfmxjT_dOcMyaVKd769UV5CM28zod8HS",title:"ร่างมติ",document_type:"proposed_resolution"}];
  state.decisions=[];state.minutes=[];state.links=[];state.access=[];state.tasks=[];state.profiles=[];state.agendaOpen={};
}

test("UX-02 contains all 13 agenda items across exactly 5 numbered disclosure groups",()=>{
  seed();
  const view=renderMeeting(m);
  assert.equal((view.match(/class="agenda-group"/g)||[]).length,5);
  assert.equal((view.match(/class="agenda-entry"/g)||[]).length,13);
  for(let i=1;i<=13;i++)assert.ok(view.includes("หัวข้อทดสอบ "+i),"missing agenda "+i);
  assert.ok(view.includes('data-agenda-group="1" data-meeting-id="meeting-1" open'));
  assert.ok(view.includes('data-agenda-group="5" data-meeting-id="meeting-1"'));
  assert.ok(view.indexOf('id="bwd-agenda"')<view.indexOf('id="bwd-documents"'));
  assert.ok(view.indexOf('id="bwd-documents"')<view.indexOf('id="bwd-minutes"'));
  assert.match(view,/อ่าน PDF ในเว็บ/);
  assert.match(view,/expandAgendas/);
  assert.match(view,/collapseAgendas/);
});
test("UX-02 remembers disclosure state and does not lose agenda data on rerender",()=>{
  seed();
  state.agendaOpen["meeting-1:4"]=true;
  state.agendaOpen["meeting-1:1"]=false;
  const view=renderMeeting(m);
  assert.ok(view.includes('data-agenda-group="4" data-meeting-id="meeting-1" open'));
  assert.ok(!view.includes('data-agenda-group="1" data-meeting-id="meeting-1" open'));
  assert.equal((view.match(/class="agenda-entry"/g)||[]).length,13);
});
test("UX-02 maps meeting states accurately instead of conflating executive review with ratification",()=>{
  const labels={
    draft:"ฉบับร่าง",scheduled:"กำหนดการประชุมแล้ว",
    held:"ประชุมแล้ว",minutes_review:"รอตรวจทานรายงาน",
    reviewed:"ผู้บริหารตรวจทานแล้ว",ratified:"รับรองแล้ว",archived:"จัดเก็บแล้ว"
  };
  for(const [status,label] of Object.entries(labels)){
    assert.ok(meetingStatusLabel(status).includes(label),status);
  }
  seed();
  assert.match(meetingCard(m),/ฉบับร่าง/);
  assert.match(renderMeetings(),/เปิดรายละเอียด/);
});
test("UX-02 preserves R2 permissioned actions and in-app reader contracts",()=>{
  for(const str of ['r2_create_meeting','r2_add_agenda','r2_record_decision','r2_save_minutes','r2_review_minutes','r2_create_task','readMeetingPdf','meeting_documents','meeting-evidence']){
    assert.ok(portal.includes(str),str);
  }
  assert.match(portal,/case "expandAgendas"/);
  assert.match(portal,/case "collapseAgendas"/);
  assert.match(portal,/addEventListener\("toggle"/);
  assert.match(portal,/state\.meetingListScroll=window\.scrollY/);
  assert.match(html,/id="meetingReader"/);
  assert.match(css,/\.meeting-jump a \{/);
  assert.match(css,/\.agenda-group summary \{/);
  assert.match(css,/prefers-reduced-motion/);
});
