import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const js=readFileSync("portal.js","utf8");
const css=readFileSync("portal.css","utf8");
const html=readFileSync("workspace.html","utf8");
const sql=readFileSync("supabase/migrations/202611100007_meeting_photo_gallery.sql","utf8");
const edge=readFileSync("supabase/functions/meeting-photo-sync/index.ts","utf8");
const script=js.replace(/\nmain\(\);\n\}\)\(\);\s*$/,'\nglobalThis.__ux10={state,parseDriveFolderId,galleryCard,taskCard,renderOverview};\n})();');
assert.notEqual(script,js);
const ctx={document:{getElementById:()=>({})},window:{BWD_SUPABASE_CONFIG:{}},URL};
vm.runInNewContext(script,ctx,{timeout:2500,filename:"portal.js"});
const {state,parseDriveFolderId,galleryCard,taskCard,renderOverview}=ctx.__ux10;
function seed(){
 state.user={id:"me"};state.member={role:"admin"};
 state.profiles=[{id:"me",display_name:"ผู้บริหาร"}];
 state.meetings=[{id:"m1",kind:"board",title:"การประชุมโรงเรียน",status:"draft",scheduled_on:"2026-11-10"}];
 state.tasks=[{id:"t1",title:"หนังสือขอบคุณ",owner_id:"me",status:"doing",due_on:"2026-11-23",description:"ข้อมูลสำคัญ"}];
 state.access=[];state.agendas=[];state.decisions=[];state.minutes=[];state.documents=[];
 state.links=[{task_id:"t1",meeting_id:"m1"}];state.updates=[];state.evidence=[];state.taskDetailsOpen={t1:true};
}
test("UX-10 photo gallery is two columns and lists real verified metadata from RLS catalog",()=>{
 const card=galleryCard({drive_file_id:"14YrX4ugl_LILSZ8CaLfi_9ZdciuMyVQZ",file_name:"IMG_9531.jpeg"});
 assert.match(card,/data-cover-select="14YrX4ugl_LILSZ8CaLfi_9ZdciuMyVQZ"/);
 assert.match(card,/drive\.google\.com\/thumbnail\?id=/);
 assert.match(card,/IMG_9531\.jpeg/);
 assert.match(css,/\.cover-gallery-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(js,/\.from\("meeting_photo_catalog"\)/);
 assert.match(js,/\.eq\("meeting_id",meetingId\)/);
 assert.match(js,/loadCoverGallery\(m\.id\)/);
 assert.match(js,/chooseGalleryCover\(select\.dataset\.coverSelect\)/);
 assert.doesNotMatch(js,/14YrX4ugl_LILSZ8CaLfi_9ZdciuMyVQZ/);
});
test("UX-10 selected gallery photo fills cover link and preserves explicit save",()=>{
 assert.match(js,/function chooseGalleryCover\(fileId\)/);
 assert.match(js,/field\.value="https:\/\/drive\.google\.com\/file\/d\/"/);
 assert.match(js,/if\(confirmed\)confirmed\.checked=true/);
 assert.match(js,/method="r2_set_meeting_cover"/);
 assert.match(js,/if\(!isEditor\(m\.id\)\)/);
 const malicious=galleryCard({drive_file_id:"abcdefghijklmnop1234",file_name:'<img onerror="alert(1)">'});
 assert.doesNotMatch(malicious,/<img onerror=/);
 assert.match(malicious,/&lt;img/);
});
test("UX-10 valid folder URLs only; editors can reconfigure for another meeting",()=>{
 assert.equal(parseDriveFolderId("https://drive.google.com/drive/folders/17I88923xLL8ThcYShXdjGTr1QUiUtwjz"),"17I88923xLL8ThcYShXdjGTr1QUiUtwjz");
 assert.equal(parseDriveFolderId("https://docs.google.com/document/d/abcdefghijklmnop1234/edit"),null);
 assert.equal(parseDriveFolderId("https://evil.example/drive/folders/abcdefghijklmnop1234"),null);
 assert.match(js,/r2_set_meeting_photo_folder/);
 assert.match(sql,/private\.can_edit_meeting\(p_meeting_id\)/);
});
test("UX-10 overview task summaries are compact while full task page retains evidence/history",()=>{
 seed();
 const compact=taskCard(state.tasks[0],false);
 assert.match(compact,/task-card-overview/);
 assert.match(compact,/ดูรายละเอียดและประวัติ/);
 assert.doesNotMatch(compact,/details class="task-details"/);
 const detailed=taskCard(state.tasks[0],true);
 assert.match(detailed,/details class="task-details"/);
 assert.match(detailed,/data-action="viewTaskHistory"/);
 assert.match(renderOverview(),/งานที่ต้องติดตาม/);
});
test("UX-10 metadata table defaults to RLS and seeds 10 school meeting photographs",()=>{
 assert.match(sql,/alter table public\.meeting_photo_catalog enable row level security/);
 assert.match(sql,/private\.can_view_meeting\(meeting_id\)/);
 assert.match(sql,/revoke all on public\.meeting_photo_catalog from public,anon,authenticated/);
 assert.match(sql,/grant select on public\.meeting_photo_catalog to authenticated/);
 assert.equal((sql.match(/'IMG_95\d\d(?:\(1\))?\.jpeg'/g)||[]).length,10);
 assert.match(sql,/photo_drive_folder_id/);
});
test("UX-10 Google Drive sync is editor-only, file-limited, and uses server-only credentials",()=>{
 assert.match(edge,/\/auth\/v1\/user/);
 assert.match(edge,/meeting_access/);
 assert.match(edge,/grants\[0\]\?\.role!=="editor"/);
 assert.match(edge,/GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON/);
 assert.match(edge,/MAX_FILES=500/);
 assert.match(edge,/mime_type/);
 assert.match(edge,/drive\.googleapis|www\.googleapis\.com\/drive\/v3\/files/);
 assert.match(edge,/Cache-Control.*private, no-store/);
 assert.match(edge,/status===204\?null/);
 assert.doesNotMatch(js,/GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON|SERVICE_ROLE_KEY/);
 assert.match(js,/\.functions\.invoke\("meeting-photo-sync"/);
 assert.match(js,/status===503/);
});
test("UX-10 retains the original 3 navigation targets and protected review workflows",()=>{
 assert.equal((html.match(/data-page="(overview|meetings|tasks)"/g)||[]).length,3);
 for(const k of ["r2_review_task","r2_review_minutes","r2_register_evidence","readMeetingPdf"])assert.ok(js.includes(k));
});
