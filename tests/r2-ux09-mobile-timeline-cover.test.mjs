import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const css=readFileSync("portal.css","utf8");
const js=readFileSync("portal.js","utf8");
const html=readFileSync("workspace.html","utf8");
const isolated=js.replace(/\nmain\(\);\n\}\)\(\);\s*$/, '\nglobalThis.__ux09={state,meetingCoverMarkup,historyEntryMarkup,parseDriveCoverFileId,runPreview:()=>{editMode="coverPhoto";updateCoverPreview();}};\n})();');
assert.notEqual(isolated,js,"Portal UI functions could not be isolated");
const nodes=new Map();
function node(id){
 if(!nodes.has(id)){
  nodes.set(id,{id,value:"",src:"",href:"",hidden:true,textContent:"",checked:false,
   removeAttribute(key){if(key==="src"||key==="href")this[key]="";},
  });
 }
 return nodes.get(id);
}
const context={window:{BWD_SUPABASE_CONFIG:{}},document:{getElementById:node},URL,Intl};
vm.runInNewContext(isolated,context,{timeout:2500,filename:"portal.js"});
const {state,meetingCoverMarkup,historyEntryMarkup,parseDriveCoverFileId,runPreview}=context.__ux09;
state.profiles=[{id:"teacher",display_name:"ครูทดสอบ"}];

test("UX-09 last timeline rule gives narrative text a full-width block",()=>{
 const rules=[...css.matchAll(/\.task-history-entry\s*\{([^}]+)\}/g)];
 assert.ok(rules.length>=2,"Intentional override must come after the broken grid");
 const last=rules.at(-1)[1];
 assert.match(last,/display:block/);
 assert.match(last,/grid-template-columns:none/);
 assert.doesNotMatch(last,/display:grid|grid-template-columns:18px/);
 assert.match(css,/\.task-history-entry-content\{display:block;min-width:0;width:100%/);
 const markup=historyEntryMarkup({
  id:"u",task_id:"t",author_id:"teacher",new_status:"blocked",
  note:"ติดตามรายละเอียดระหว่างการเตรียมหนังสือขอบคุณ",
  created_at:"2026-11-10T12:30:00Z"
 });
 assert.match(markup,/class="task-history-entry-content"/);
 assert.match(markup,/ติดปัญหา/);
 assert.match(markup,/ติดตามรายละเอียด/);
});

test("UX-09 empty meeting cover stays compact; existing Drive image remains 16:9",()=>{
 const empty=meetingCoverMarkup({id:"m",cover_drive_file_id:null});
 assert.match(empty,/meeting-cover-empty/);
 assert.match(empty,/ยังไม่มีภาพปกการประชุม/);
 assert.match(css,/\.meeting-cover-empty\{\s*aspect-ratio:auto/);
 assert.match(css,/\.meeting-cover\{[^}]*aspect-ratio:16\/9/);
 const photo=meetingCoverMarkup({id:"m",cover_drive_file_id:"abcdefghijklmnopqrstuv12345"});
 assert.match(photo,/drive\.google\.com\/thumbnail\?id=/);
 assert.doesNotMatch(photo,/meeting-cover-empty/);
});

test("UX-09 cover selection accepts only Drive files, not Docs Sheets or folder links",()=>{
 const imageUrl="https://drive.google.com/file/d/abcdefghijklmnopqrstuv12345/view?usp=sharing";
 assert.equal(parseDriveCoverFileId(imageUrl),"abcdefghijklmnopqrstuv12345");
 assert.equal(parseDriveCoverFileId("https://docs.google.com/document/d/abcdefghijklmnopqrstuv12345/edit"),null);
 assert.equal(parseDriveCoverFileId("https://docs.google.com/spreadsheets/d/abcdefghijklmnopqrstuv12345/edit"),null);
 assert.equal(parseDriveCoverFileId("https://drive.google.com/drive/folders/abcdefghijklmnopqrstuv12345"),null);
 assert.equal(parseDriveCoverFileId("https://evil.example/file/d/abcdefghijklmnopqrstuv12345/view"),null);
 assert.match(js,/!\$\("f_coverConfirmed"\)\?\.checked/);
 assert.match(js,/ไฟล์นี้เป็นรูปภาพ ไม่ใช่ PDF/);
});

test("UX-09 Drive photo preview hides prior contents on invalid input and opens a safe original",()=>{
 const input=node("f_driveUrl"),image=node("coverPreviewImage"),label=node("coverPreviewMessage"),link=node("coverPreviewLink");
 input.value="https://drive.google.com/file/d/abcdefghijklmnopqrstuv12345/view";
 runPreview();
 assert.match(image.src,/^https:\/\/drive\.google\.com\/thumbnail\?id=/);
 assert.equal(link.hidden,false);
 assert.match(link.href,/^https:\/\/drive\.google\.com\/file\/d\//);
 assert.equal(image.hidden,true,"Do not show a stale picture before it loads");
 image.onload();
 assert.equal(image.hidden,false);
 input.value="https://docs.google.com/document/d/abcdefghijklmnopqrstuv12345/edit";
 runPreview();
 assert.equal(image.hidden,true);
 assert.equal(link.hidden,true);
 assert.match(label.textContent,/ลิงก์ไฟล์จาก Google Drive/);
 assert.match(css,/\.cover-preview img\[hidden\]/);
});

test("UX-09 account closes on outside pointer, Escape and navigation without changing the three tabs",()=>{
 assert.match(js,/document\.addEventListener\("pointerdown"/);
 assert.match(js,/!accountMenu\.contains\(event\.target\)/);
 assert.match(js,/event\.key==="Escape"&&accountMenu\.open/);
 assert.match(js,/accountMenu\.querySelector\("summary"\)\?\.focus/);
 assert.match(js,/closeAccountMenu\(\);\s*state\.page=page/);
 assert.equal((html.match(/data-page="(overview|meetings|tasks)"/g)||[]).length,3);
});

test("UX-09 maintains meeting editor permissions and preserves task history data operations",()=>{
 assert.match(js,/if\(!isEditor\(m\.id\)\)return statusMessage/);
 assert.match(js,/r2_set_meeting_cover/);
 assert.match(js,/\.eq\("task_id",taskId\)/);
 assert.match(js,/r2_review_task/);
 assert.match(js,/r2_review_minutes/);
 assert.match(js,/r2_register_evidence/);
 assert.doesNotMatch(html,/service_role/i);
});
