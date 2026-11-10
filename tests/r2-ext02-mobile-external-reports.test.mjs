import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const portal=readFileSync("portal.js","utf8");
const html=readFileSync("workspace.html","utf8");
const css=readFileSync("portal.css","utf8");
const sql=readFileSync("supabase/migrations/202611100011_external_meeting_ui_actions.sql","utf8");
const isolated=portal.replace(/\nmain\(\);\n\}\)\(\);\s*$/,
 '\nglobalThis.__ext02={state,renderMeeting,renderMeetings,meetingCard,renderExternalMeeting,ownExternalReport,externalParticipation};\n})();');
assert.notEqual(isolated,portal,"Render test must exclude live Supabase bootstrap");
const context={document:{getElementById:()=>({})},window:{BWD_SUPABASE_CONFIG:{}}};
vm.runInNewContext(isolated,context,{timeout:2000,filename:"portal.js"});
const {state,renderMeeting,renderMeetings,meetingCard,renderExternalMeeting}=context.__ext02;
const fakeExternal={
 id:"external-1",kind:"management",title:"ประชุมตัวอย่างเขตพื้นที่",scheduled_on:"2026-11-10",
 location:"ห้องประชุมสมมติ",host_type:"area",host_organization:"หน่วยงานสมมติ",
 meeting_mode:"externally_hosted",status:"draft",created_at:"2026-11-10"
};
const legacy={id:"old-1",kind:"board",title:"การประชุมเดิม",scheduled_on:"2026-11-10",
 location:"โรงเรียน",status:"draft",created_at:"2026-11-10",meeting_mode:null};
function seed(role="member",userId="teacher"){
 state.user={id:userId};
 state.member={role};
 state.meetings=[fakeExternal,legacy];
 state.participations=[{meeting_id:fakeExternal.id,user_id:"teacher",participation_role:"attendee",attendance_status:"unknown"}];
 state.externalReports=[];state.documents=[];state.access=[];
 state.profiles=[{id:"teacher",display_name:"ครูตัวอย่าง"},{id:"reviewer",display_name:"ผู้ตรวจตัวอย่าง"}];
 state.agendas=Array.from({length:13},(_,i)=>({id:"a"+i,meeting_id:legacy.id,
  section:i<3?1:i<5?2:i<7?3:i<11?4:5,position:i+1,title:"หัวข้อเดิม "+i,notes:""}));
 state.minutes=[];state.decisions=[];state.tasks=[];state.links=[];state.agendaOpen={};state.meetingFilter="all";
}

test("EXT-02: teacher sees own external report starter but cannot add staff or ratify minutes",()=>{
 seed();
 const rendered=renderExternalMeeting(fakeExternal);
 assert.match(rendered,/หน่วยงานสมมติ/);
 assert.match(rendered,/ไปร่วมประชุมภายนอก/);
 assert.match(rendered,/ยังไม่ยืนยันการเข้าร่วม/);
 assert.match(rendered,/เขียนรายงานผลของฉัน/);
 assert.match(rendered,/ยืนยันว่าเข้าร่วมแล้ว/);
 assert.doesNotMatch(rendered,/data-action="extParticipant"/);
 assert.doesNotMatch(rendered,/data-action="extApprove"/);
 assert.doesNotMatch(rendered,/data-action="newTask"/);
 assert.doesNotMatch(rendered,/id="bwd-minutes"/);
 assert.match(rendered,/ไม่ใช่รายงานการประชุมที่เจ้าภาพรับรองแล้ว/);
});

test("EXT-02: submitted own report only offers withdrawal, not self review",()=>{
 seed();
 state.participations[0].attendance_status="attended";
 state.externalReports=[{id:"report-1",meeting_id:fakeExternal.id,author_id:"teacher",
  summary:"สาระข้อมูลสมมติ",directives:"เสนอให้โรงเรียนตรวจสอบ",school_impact:"",
  proposed_actions:"",version:2,status:"submitted"}];
 const rendered=renderMeeting(fakeExternal);
 assert.match(rendered,/ดึงรายงานกลับมาแก้ไข/);
 assert.match(rendered,/สาระข้อมูลสมมติ/);
 assert.doesNotMatch(rendered,/data-action="extApprove"/);
 assert.doesNotMatch(rendered,/data-action="extReport"/);
});

test("EXT-02: independent administrator reviewer can review or return another person's submitted report",()=>{
 seed("admin","reviewer");
 state.externalReports=[{id:"report-1",meeting_id:fakeExternal.id,author_id:"teacher",
  summary:"ทดสอบเอกสาร",directives:"",school_impact:"",proposed_actions:"",
  status:"submitted",version:1}];
 const rendered=renderMeeting(fakeExternal);
 assert.match(rendered,/data-action="extApprove"/);
 assert.match(rendered,/data-action="extReject"/);
 assert.match(rendered,/ตรวจทานผ่าน/);
 assert.doesNotMatch(rendered,/data-action="extWithdraw"/);
 assert.match(rendered,/data-action="extParticipant"/);
 assert.doesNotMatch(rendered,/data-action="extReport"/);
});

test("EXT-02: absent participant has no author/attachment action",()=>{
 seed();
 state.participations[0].attendance_status="absent";
 const rendered=renderMeeting(fakeExternal);
 assert.match(rendered,/แก้ไข: ฉันเข้าร่วมจริง/);
 assert.doesNotMatch(rendered,/data-action="extReport"/);
 assert.doesNotMatch(rendered,/data-action="extDocument"/);
});

test("EXT-02: meeting mode is visible and filter retains legacy meeting without rewriting sections",()=>{
 seed("admin","reviewer");
 state.meetingFilter="school";
 const school=renderMeetings();
 assert.match(school,/การประชุมเดิม/);
 assert.doesNotMatch(school,/ประชุมตัวอย่างเขตพื้นที่/);
 state.meetingFilter="external";
 const external=renderMeetings();
 assert.match(external,/ประชุมตัวอย่างเขตพื้นที่/);
 assert.doesNotMatch(external,/การประชุมเดิม/);
 state.meetingFilter="all";
 const original=renderMeeting(legacy);
 assert.equal((original.match(/class="agenda-entry"/g)||[]).length,13);
 assert.equal((original.match(/class="agenda-group"/g)||[]).length,5);
 assert.match(meetingCard(fakeExternal),/หน่วยงานสมมติ/);
});

test("EXT-02: external Drive references do not masquerade as draft school minutes",()=>{
 seed();
 state.documents=[{id:"document-1",meeting_id:fakeExternal.id,
  drive_file_id:"testOnlyDriveDocument_1234567890",title:"หนังสือเชิญตัวอย่าง",
  document_type:"other"}];
 const rendered=renderMeeting(fakeExternal);
 assert.match(rendered,/หนังสือเชิญตัวอย่าง/);
 assert.match(rendered,/เอกสารอ้างอิงที่ผู้เข้าร่วมแนบ/);
 assert.match(rendered,/data-action="readMeetingPdf"/);
 assert.doesNotMatch(rendered,/ฉบับร่าง — ยังไม่รับรอง/);
});

test("EXT-02: UI wires audited RPCs without using private preinvite directory",()=>{
 for(const name of ["r2_ext_create_meeting","r2_ext_add_participant","r2_ext_save_report",
  "r2_ext_submit_report","r2_ext_withdraw_report","r2_ext_review_report",
  "r2_ext_set_attendance","r2_ext_attach_document","r2_meeting_assignee_options"]){
   assert.ok(portal.includes(name),"missing "+name);
 }
 assert.match(portal,/case "newExternalMeeting"/);
 assert.match(portal,/case "extMarkAttendance"/);
 assert.match(portal,/case "extDocument"/);
 assert.match(portal,/externalRosterLoading/);
 assert.match(portal,/state\.externalReports\]=results\.map/);
 assert.doesNotMatch(portal,/private\.staff_directory|inviteUserByEmail|createUser\(/);
 assert.match(html,/portal\\.js\\?v=(?:doc02|agendasrc)/);
 assert.match(html,/doc02\.js\?v=(?:doc02|agendasrc)/);
 assert.match(css,/\.ext-report-card/);
 assert.match(css,/min-height:44px/);
});

test("EXT-02: participant-only Drive link and attendance RPCs are scoped and audited",()=>{
 for(const name of ["r2_ext_attach_document","r2_ext_set_attendance"]){
  assert.match(sql,new RegExp("function public\\."+name+"\\("));
 }
 assert.match(sql,/private\.can_view_meeting\(p_meeting_id\)/);
 assert.match(sql,/private\.is_staff\(\)/);
 assert.match(sql,/status in \('submitted','reviewed'\)/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/public\.audit_events/);
 assert.match(sql,/revoke all on function[\s\S]*from public,anon,authenticated/);
 assert.match(sql,/grant execute on function[\s\S]*to authenticated/);
 assert.doesNotMatch(sql,/grant\s+(insert|update|delete)\s+on\s+public\./i);
 assert.doesNotMatch(sql,/update\s+public\.meetings|update\s+public\.minutes|delete\s+from\s+public\./i);
});
