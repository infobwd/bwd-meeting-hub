import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const html=readFileSync("workspace.html","utf8");
const css=readFileSync("portal.css","utf8");
const js=readFileSync("portal.js","utf8");
const sql=readFileSync("supabase/migrations/202611100006_meeting_cover.sql","utf8");
const script=js.replace(/\nmain\(\);\n\}\)\(\);\s*$/,'\nglobalThis.__ux08={state,meetingCard,meetingCoverMarkup,taskCard,historyEntryMarkup};\n})();');
assert.notEqual(script,js);
const ctx={window:{BWD_SUPABASE_CONFIG:{}},document:{getElementById:()=>({})}};
vm.runInNewContext(script,ctx,{timeout:2500});
const {state,meetingCard,meetingCoverMarkup,taskCard,historyEntryMarkup}=ctx.__ux08;
function seed(){
 state.user={id:"admin-1"};state.member={role:"admin"};
 state.meetings=[{id:"meeting-1",title:"ประชุมโรงเรียน",kind:"board",status:"draft",scheduled_on:"2026-11-10",cover_drive_file_id:"abcdefghijklmnopqrstuvwxyz1234"}];
 state.agendas=[];state.documents=[];state.links=[{task_id:"task-1",meeting_id:"meeting-1"}];state.access=[];
 state.profiles=[{id:"admin-1",display_name:"ผู้บริหาร"}];state.decisions=[];state.minutes=[];
 state.updates=[{id:"u1",task_id:"task-1",note:"รายงาน",new_status:"doing",created_at:"2026-11-10T12:00:00Z",author_id:"admin-1"}];state.evidence=[];
 state.tasks=[{id:"task-1",title:"งาน",owner_id:"admin-1",status:"doing",description:"ทดสอบ"}];
 state.taskDetailsOpen={};
}
test("UX-08 footer has reserved space for bottom safe-area and only three tabs",()=>{
 assert.match(html,/class="site-footer"/);
 assert.match(css,/body>\.site-footer\{padding:14px 18px calc\(128px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/#screen\{padding-bottom:24px\}/);
 assert.equal((html.match(/data-page="(overview|meetings|tasks)"/g)||[]).length,3);
});
test("UX-08 meeting card shows selected Drive thumbnail and a rights-aware fallback",()=>{
 seed();
 const card=meetingCard(state.meetings[0]);
 assert.match(card,/drive\.google\.com\/thumbnail\?id=/);
 assert.match(card,/drive\.google\.com\/file\/d\//);
 assert.match(card,/meeting-cover-placeholder/);
 assert.match(meetingCoverMarkup({...state.meetings[0],cover_drive_file_id:"invalid!*"}),/ยังไม่มีภาพปก/);
 assert.match(js,/image\.hidden=true/);
});
test("UX-08 new cover RPC is explicitly editor-only and audited",()=>{
 assert.match(sql,/private\.can_edit_meeting\(p_meeting_id\)/);
 assert.match(sql,/r2_set_meeting_cover/);
 assert.match(sql,/grant execute on function public\.r2_set_meeting_cover\(uuid,text\) to authenticated/);
 assert.doesNotMatch(sql,/grant execute on function .* to anon/);
 assert.match(js,/case "coverPhoto"/);
 assert.match(js,/r2_set_meeting_cover/);
 assert.match(js,/parseDriveFileId\(raw\)/);
});
test("UX-08 view-all history is per-task with pagination and escaping",()=>{
 seed();
 const card=taskCard(state.tasks[0],true);
 assert.match(card,/data-action="viewTaskHistory"/);
 assert.match(html,/id="taskHistoryDialog"/);
 assert.match(html,/id="taskHistoryMore"/);
 assert.match(js,/HISTORY_PAGE_SIZE=20/);
 assert.match(js,/\.eq\("task_id",taskId\)/);
 assert.match(js,/\.range\(historyOffset,historyOffset\+HISTORY_PAGE_SIZE-1\)/);
 assert.match(js,/count:"exact"/);
 assert.match(historyEntryMarkup(state.updates[0]),/กำลังดำเนินการ/);
 const escaped=historyEntryMarkup({...state.updates[0],note:"<script>alert(1)</script>"});
 assert.doesNotMatch(escaped,/<script>/);
 assert.match(escaped,/&lt;script&gt;/);
});
test("UX-08 preserves existing review, evidence and PDF reader boundaries",()=>{
 for(const marker of ["r2_review_task","r2_review_minutes","r2_register_evidence","readMeetingPdf"])assert.ok(js.includes(marker));
 assert.match(css,/\.task-history-dialog/);
});
