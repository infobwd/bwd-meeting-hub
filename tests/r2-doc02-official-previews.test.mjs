import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const core=readFileSync("portal.js","utf8");
const html=readFileSync("workspace.html","utf8");
const css=readFileSync("portal.css","utf8");
const preview=readFileSync("doc02.js","utf8");
const sql=readFileSync("supabase/migrations/202611100012_doc02_separate_document_versions.sql","utf8");

const window={};
vm.runInNewContext(preview,{window,document:{getElementById:()=>null},Intl,Date,console},{timeout:2000,filename:"doc02.js"});
assert.ok(window.BWDDoc02,"DOC-02 preview module missing");
const doc=window.BWDDoc02;
const meeting={id:"mock-meeting",kind:"board",title:"การประชุมคณะกรรมการ (สมมติ)",
 location:"ห้องประชุมทดสอบ",scheduled_on:"2026-11-10",meeting_mode:null,status:"draft"};
const countBySection=[4,1,2,4,2];
const agendas=countBySection.flatMap((num,section)=>
 Array.from({length:num},(_,j)=>({
  id:"fake-"+(section+1)+"-"+(j+1),meeting_id:meeting.id,section:section+1,
  position:countBySection.slice(0,section).reduce((a,b)=>a+b,0)+j+1,
  title:"เรื่องตัวอย่างหมวด "+(section+1)+" ลำดับ "+(j+1),notes:"ข้อมูลสมมติเท่านั้น"
 })));
function context(){doc.setContextForTest({meeting,agendas,oldMinutes:{version:4,status:"submitted"}});}
function get(type="agenda"){context();return doc.sourceFields(type,meeting,agendas);}
test("DOC-02 uses all 13 legacy entries, 5 groups and section-local view numbering without altering source",()=>{
 const before=JSON.stringify(agendas);
 const out=get();
 assert.equal(out.items.length,13);
 assert.deepEqual(Array.from(new Set(out.items.map(a=>a.section))),[1,2,3,4,5]);
 assert.equal(out.items[4].display_no,"2.1");
 assert.equal(out.items[5].display_no,"3.1");
 assert.equal(out.items[11].display_no,"5.1");
 assert.equal(out.items[12].display_no,"5.2");
 assert.equal(out.items[11].position,12,"original global position must be retained");
 assert.equal(JSON.stringify(agendas),before,"cannot mutate original agenda objects");
});
test("DOC-02 agenda preview uses before-meeting fields and never invents a resolution",()=>{
 const f=get();
 f.header.meeting_no="1/2569";
 f.items[0].background="ความเป็นมาของตัวอย่าง";
 f.items[0].references="เอกสารสมมติ";
 f.items[0].question="เสนอพิจารณาข้อเท็จจริง";
 const markup=doc.previewMarkup("agenda",f);
 assert.match(markup,/ระเบียบวาระการประชุม/);
 assert.match(markup,/ความเป็นมาของตัวอย่าง/);
 assert.match(markup,/เอกสารสมมติ/);
 assert.match(markup,/เสนอพิจารณาข้อเท็จจริง/);
 assert.match(markup,/วาระ 5\.1/);
 assert.doesNotMatch(markup,/มติที่ประชุม \(ร่าง ยังไม่รับรอง\)/);
 assert.match(markup,/ตัวอย่างฉบับร่าง/);
});
test("DOC-02 minutes preview separates attendee roles and multiple outcomes for same item",()=>{
 const f=get("minutes");context();
 f.header.meeting_no="1/2569";
 f.header.chair="ผู้ปฏิบัติหน้าที่ประธาน (สมมติ)";
 f.header.secretary="กรรมการและเลขานุการ (สมมติ)";
 f.header.recorder="ผู้จดรายงานจริง (สมมติ)";
 f.header.recorder_office="ตำแหน่งประจำสมมติ";
 f.header.attendees="กรรมการสมมติ";
 f.header.absentees="ไม่มี";
 f.header.other_attendees="ผู้เข้าร่วมสมมติ";
 f.header.start_time="09.00";f.header.end_time="10.30";
 f.items[0].substance="สาระสำคัญ";
 f.items[0].information="เรื่องรับทราบ";
 f.items[0].resolution="มติร่าง";
 f.items[0].proposal="ข้อเสนอที่รอข้อยุติ";
 f.items[0].directive="งานที่เสนอ";
 const markup=doc.previewMarkup("minutes",f);
 for(const token of ["รายงานการประชุม (แบบที่ 11)","ผู้มาประชุม","ผู้ไม่มาประชุม","ผู้เข้าร่วมประชุม",
   "ผู้ทำหน้าที่ประธาน","กรรมการและเลขานุการ","ผู้จดรายงานการประชุม","เริ่มประชุมเวลา",
   "เลิกประชุมเวลา","ตำแหน่งประจำสมมติ","สาระสำคัญ","เรื่องรับทราบ","มติร่าง","ข้อเสนอที่รอข้อยุติ","งานที่เสนอ",
   "ยังไม่มีหลักฐานรับรองโดยที่ประชุม"]){
   assert.ok(markup.includes(token),"Missing "+token);
 }
 assert.match(markup,/มติที่ประชุม \(ร่าง ยังไม่รับรอง\)/);
 assert.doesNotMatch(markup,/อนุมัติอย่างเป็นทางการ/);
});
test("DOC-02 optional six-part template is preview only; does not backfill legacy agenda",()=>{
 const newAgendas=Array.from({length:6},(_,i)=>({id:"n"+i,section:i+1,position:i+1,
  title:"ตัวอย่างวาระ "+(i+1),notes:""}));
 context();doc.setTemplateForTest("school6");
 const out=doc.sourceFields("agenda",meeting,newAgendas);
 assert.equal(out.items[5].display_no,"6.1");
 const markup=doc.previewMarkup("agenda",out);
 assert.match(markup,/เรื่องเสนอเพื่อทราบ/);
 assert.match(markup,/ระเบียบวาระที่ 6/);
 doc.setTemplateForTest("legacy5");
 assert.equal(agendas.length,13);
});
test("DOC-02 escapes sensitive text and untrusted HTML in previews",()=>{
 const f=get("minutes");context();
 f.header.chair='<img src=x onerror=alert(1)>';
 f.items[0].resolution='<script>alert("x")</script>';
 const markup=doc.previewMarkup("minutes",f);
 assert.doesNotMatch(markup,/<script>|<img src=/);
 assert.match(markup,/&lt;script&gt;/);
 assert.match(markup,/&lt;img/);
});
test("DOC-02 browser integration is separate from EXT-02 and old minutes mutation RPC",()=>{
 assert.match(html,/doc02\.js\?v=doc02/);
 assert.match(html,/portal\.js\?v=doc02/);
 assert.match(html,/id="doc02Dialog"/);
 assert.match(html,/id="doc02Preview"/);
 assert.match(core,/case "doc02Preview"/);
 assert.match(core,/BWDDoc02\?\.closePrivate/);
 assert.match(preview,/sessionGeneration/);
 assert.match(core,/BWDDoc02\.open/);
 assert.match(core,/function renderExternalMeeting\(m\)/);
 assert.match(core,/r2_ext_submit_report/);
 assert.match(css,/\.doc02-page/);
 assert.match(css,/width:210mm/);
 assert.match(css,/min-height:297mm/);
 assert.match(css,/doc02-watermark/);
 assert.match(preview,/r2_doc02_save_draft/);
 assert.match(preview,/r2_doc02_submit/);
 assert.match(preview,/r2_doc02_review/);
 assert.doesNotMatch(preview,/r2_save_minutes|r2_record_decision|r2_create_task|r2_set_meeting_cover/);
 assert.doesNotMatch(preview,/นายเสริมศักดิ์|นพรุจ|private\.staff_directory/);
});
test("DOC-02 SQL snapshots are append-only and independent of original 4th submitted minutes",()=>{
 assert.match(sql,/create table public\.meeting_agenda_document_versions/);
 assert.match(sql,/alter table public\.meeting_agenda_document_versions enable row level security/);
 assert.match(sql,/for select to authenticated/);
 assert.match(sql,/grant select on public\.meeting_agenda_document_versions to authenticated/);
 assert.match(sql,/private\.can_edit_meeting/);
 assert.match(sql,/private\.is_admin\(\)/);
 assert.match(sql,/Independent reviewer required/);
 assert.match(sql,/Version conflict; reload/);
 assert.match(sql,/document_status in \('draft','submitted','returned','reviewed'\)/);
 assert.match(sql,/document_status in \('reviewed','ratified'\)/);
 for(const operation of ["r2_doc02_save_draft","r2_doc02_submit","r2_doc02_review"]){
  assert.match(sql,new RegExp("function public\\."+operation+"\\("));
 }
 assert.match(sql,/from public,anon,authenticated/);
 assert.match(sql,/to authenticated/);
 assert.match(sql,/private\.doc02_valid_fields/);
 assert.match(sql,/item->>\x27title\x27/);
 assert.match(sql,/item->>\x27notes\x27/);
 assert.doesNotMatch(sql,/update\s+public\.(minutes|agendas|meetings|tasks|decisions)\b/i);
 assert.doesNotMatch(sql,/delete\s+from\s+public\./i);
 assert.doesNotMatch(sql,/set\s+document_status\s*=\s*'ratified'/i);
 assert.doesNotMatch(sql,/grant\s+(insert|update|delete)\s+on\s+public\./i);
});
