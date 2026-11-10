import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source=readFileSync("portal.js","utf8");
const css=readFileSync("portal.css","utf8");
const html=readFileSync("workspace.html","utf8");
const testable=source.replace(/\nmain\(\);\n\}\)\(\);\s*$/,
 '\nglobalThis.__ux04={state,friendlyError,loadingMarkup,loadErrorMarkup,reload,render,clearPrivateView};\n})();');
assert.notEqual(testable,source,"Must isolate UI from real auth during tests");
const nodes=new Map();
const document={
 getElementById(id){
  if(!nodes.has(id))nodes.set(id,{innerHTML:"",textContent:"",setAttribute(k,v){this[k]=v;}});
  return nodes.get(id);
 },
 querySelectorAll(){return [];}
};
const context={window:{BWD_SUPABASE_CONFIG:{}},document};
vm.runInNewContext(testable,context,{timeout:2200,filename:"portal.js"});
const {state,friendlyError,loadingMarkup,loadErrorMarkup,reload,render,clearPrivateView}=context.__ux04;

function response(data=[],error=null){
 return {data,error,select(){return this;},is(){return this;},order(){return this;},limit(){return this;}};
}
function seed(){
 state.loading=false;state.loadError="";state.page="meetings";
 state.user={id:"test-account"};state.member={role:"guest"};
 state.meetings=[];state.tasks=[];state.agendas=[];state.documents=[];
 state.access=[];state.links=[];state.decisions=[];state.minutes=[];
 state.updates=[];state.evidence=[];state.profiles=[];
 state.activeMeeting=null;
}
test("UX-04 maps backend errors to plain Thai without leaking SQL/security details",()=>{
 assert.match(friendlyError({message:"Version conflict; reload"}),/ข้อมูลมีการเปลี่ยนแปลง/);
 assert.match(friendlyError({message:"Access denied by RLS"}),/ไม่มีสิทธิ์/);
 assert.match(friendlyError({message:"Failed to fetch"}),/อินเทอร์เน็ต/);
 const unknown=friendlyError({message:"private RPC error on tokens user xyz"});
 assert.ok(!unknown.includes("private RPC"),unknown);
 assert.match(unknown,/ดำเนินการไม่สำเร็จ/);
});

test("UX-04 renders a loading skeleton and safe retry state after a failed read",async()=>{
 seed();
 state.client={from(){return response([],{message:"Failed to fetch"});}};
 const ok=await reload();
 assert.equal(ok,false);
 assert.equal(state.loading,false);
 assert.match(state.loadError,/อินเทอร์เน็ต/);
 assert.match(nodes.get("portalBody").innerHTML,/data-action="retryLoad"/);
 assert.equal(nodes.get("portalBody")["aria-busy"],"false");
 assert.match(loadingMarkup(),/role="status"/);
 assert.match(loadingMarkup(),/ux04-skeleton/);
 assert.match(loadErrorMarkup(),/role="alert"/);
});

test("UX-04 successful retry removes the error without altering meeting write operations",async()=>{
 seed();
 state.loadError="โหลดไม่สำเร็จ";
 state.client={from(){return response([]);}};
 assert.equal(await reload(),true);
 assert.equal(state.loadError,"");
 assert.match(nodes.get("portalBody").innerHTML,/ยังไม่มีรายการประชุม/);
 assert.ok(!nodes.get("portalBody").innerHTML.includes('data-action="retryLoad"'));
});

test("UX-04 clears sensitive in-memory view state on sign-out",()=>{
 seed();
 state.meetings=[{id:"private-meeting"}];
 state.documents=[{drive_file_id:"sensitive-document"}];
 state.tasks=[{id:"private-task"}];
 state.agendaOpen={"key":true};state.taskDetailsOpen={"task":true};
 clearPrivateView();
 assert.equal(state.meetings.length,0);
 assert.equal(state.documents.length,0);
 assert.equal(state.tasks.length,0);
 assert.deepEqual(Object.keys(state.agendaOpen),[]);
 assert.deepEqual(Object.keys(state.taskDetailsOpen),[]);
});

test("UX-04 stops double submissions and warns before discarding a dirty modal",()=>{
 for(const marker of [
  "if(formSubmitting||!actionForm.reportValidity())return",
  "formSubmitting=true",
  "formSubmitting&&!force",
  "isFormDirty()",
  'confirmAction("มีข้อมูลที่ยังไม่ได้บันทึก',
  'modal.addEventListener("cancel"',
  'window.visualViewport',
  '--ux04-sheet-bottom',
  '--ux04-sheet-height',
  'await closeModal({force:true})',
  'const updated=await reload()',
  "บันทึกข้อมูลแล้ว แต่ยังแสดงรายการล่าสุดไม่ได้",
 ]){
  assert.ok(source.includes(marker),marker);
 }
 assert.match(source,/showFormError\("โปรดใส่ลิงก์ไฟล์ Google Drive/);
 assert.match(html,/id="modalMessage" class="ux04-form-error" role="alert" hidden/);
 assert.match(css,/\.ux04-load-error/);
 assert.match(css,/\.ux04-skeleton/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(source,/window\.alert\(|window\.confirm\(/);
});

test("UX-04 retains private evidence, meetings, tasks and PDF reader contracts",()=>{
 for(const token of [
  "r2_create_meeting","r2_add_agenda","r2_save_minutes","r2_review_minutes",
  "r2_review_task","r2_register_evidence","meeting-evidence",
  "previewEvidence","downloadEvidence","readMeetingPdf","meeting_documents"
 ])assert.ok(source.includes(token),token);
 assert.match(html,/id="meetingReader"/);
 assert.match(html,/id="evidencePreview"/);
 assert.match(html,/name="viewport" content="width=device-width, initial-scale=1"/);
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
});
