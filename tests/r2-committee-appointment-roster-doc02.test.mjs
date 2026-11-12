import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";

const js=readFileSync("doc02.js","utf8");
const css=readFileSync("portal.css","utf8");
const html=readFileSync("workspace.html","utf8");
const sql=readFileSync("supabase/migrations/202611120001_committee_appointment_roster_reference.sql","utf8");
const win={};
vm.runInNewContext(js,{window:win,document:{getElementById:()=>null},Intl,Date,console},{timeout:2000});
const doc=win.BWDDoc02;
const meeting={id:"fictional-meeting",title:"การประชุมคณะกรรมการสมมติ",kind:"board",meeting_mode:null,
 scheduled_on:"2026-11-10",location:"ห้องประชุมตัวอย่าง",status:"minutes_review"};
const agendas=[1,2,3].map((section,j)=>({id:"f"+section,section,position:j+1,title:"เรื่องสมมติ "+section,notes:""}));
const fakeRoster={
 id:"fake-roster",revision:1,authority_label:"หน่วยงานสมมติ",source_title:"ประกาศแต่งตั้งจำลอง",
 source_kind:"chat_uploaded_scan",verification_status:"transcribed_pending_verification",
 announced_on:null,term_ends_on:"2027-04-18",entries:Array.from({length:9},(_,i)=>({
  order:i+1,name:i===8?null:"บุคคลสมมติ "+(i+1),office:i===8?"ผู้อำนวยการโรงเรียนสมมติ":null,
  representation:i===8?"กรรมการโดยตำแหน่ง":"ผู้แทนสมมติ",
  committee_role:i===0?"ประธานกรรมการ":i===8?"กรรมการและเลขานุการ":"กรรมการ",
  spelling_review_required:i===0
 }))
};
function setup(editable=true,roster=fakeRoster){
 doc.setContextForTest({meeting,agendas,documents:[],appointmentRoster:roster,editable,user:{id:"user-test"}});
}

test("appointment reference remains separate from real attendance and presiding roles in both drafts",()=>{
 setup();
 for(const type of ["agenda","minutes"]){
  const fields=doc.sourceFields(type,meeting,agendas);
  const enhanced=doc.appointmentRosterForDraft(type,fields);
  assert.equal(enhanced.header.appointment_reference.entries.length,9);
  assert.equal(enhanced.header.attendees,"");
  assert.equal(enhanced.header.chair,"");
  assert.equal(enhanced.header.secretary,"");
  assert.equal(enhanced.header.recorder,"");
  assert.equal(enhanced.header.appointment_reference.entries[8].name,"");
  assert.match(enhanced.header.appointment_reference.entries[8].office,/ผู้อำนวยการโรงเรียนสมมติ/);
  const preview=doc.previewMarkup(type,enhanced);
  assert.match(preview,/คณะกรรมการสถานศึกษาตามประกาศแต่งตั้ง/);
  assert.match(preview,/ไม่ใช่ผู้มาประชุมจริง/);
  assert.match(preview,/ประกาศแต่งตั้งจำลอง/);
  assert.match(preview,/กรรมการและเลขานุการ/);
  assert.match(preview,/ยังไม่มีหลักฐานรับรองโดยที่ประชุม/);
  assert.doesNotMatch(preview,/แต่งตั้งทุกคนเป็นผู้มาประชุม/);
 }
});

test("preview appendix is its own approximate A4 page with watermark and source provenance",()=>{
 setup();
 const fields=doc.appointmentRosterForDraft("minutes",doc.sourceFields("minutes",meeting,agendas));
 const preview=doc.previewMarkup("minutes",fields);
 const pageCount=(preview.match(/class="doc02-page"/g)||[]).length;
 assert.equal(pageCount,doc.previewPages(fields.items,"minutes").length+1);
 assert.equal((preview.match(/ตัวอย่างฉบับร่าง • ไม่ใช่เอกสารรับรอง/g)||[]).length,pageCount);
 assert.match(preview,/ภาคผนวกบัญชีกรรมการตามประกาศแต่งตั้ง/);
 assert.match(preview,/ตรวจสอบคำสั่งแต่งตั้งและตัวสะกด/);
});

test("no roster appears in old or locked snapshots without explicit saved reference",()=>{
 setup(false);
 const original=doc.sourceFields("minutes",meeting,agendas);
 const result=doc.appointmentRosterForDraft("minutes",original);
 assert.equal(result.header.appointment_reference,undefined);
 assert.doesNotMatch(doc.previewMarkup("minutes",result),/ภาคผนวกบัญชีกรรมการตามประกาศแต่งตั้ง/);
 setup(true,null);
 assert.equal(doc.appointmentRosterForDraft("agenda",doc.sourceFields("agenda",meeting,agendas)).header.appointment_reference,undefined);
});

test("untrusted appointment names and offices cannot inject markup into the preview",()=>{
 const bad=JSON.parse(JSON.stringify(fakeRoster));
 bad.entries[0].name='<script>alert("bad")</script>';
 bad.entries[8].office='<img src=x onerror=alert(1)>';
 setup(true,bad);
 const out=doc.previewMarkup("agenda",doc.appointmentRosterForDraft("agenda",doc.sourceFields("agenda",meeting,agendas)));
 assert.doesNotMatch(out,/<script>|<img src=/);
 assert.match(out,/&lt;script&gt;/);
 assert.match(out,/&lt;img/);
});

test("private read, no name literals or seed data in GitHub, no meeting/agenda/minutes mutations",()=>{
 assert.match(sql,/create table public\.meeting_committee_appointment_rosters/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/private\.can_view_meeting\(meeting_id\)/);
 assert.match(sql,/revoke all on public\.meeting_committee_appointment_rosters from public,anon,authenticated/);
 assert.match(sql,/grant select on public\.meeting_committee_appointment_rosters to authenticated/);
 assert.doesNotMatch(sql,/insert into|update public\.minutes|update public\.agendas|delete from public\./i);
 assert.match(js,/\.from\("meeting_committee_appointment_rosters"\)/);
 assert.match(js,/appointmentReferenceNotSaved/);
 assert.doesNotMatch(js,/insert\(|\.update\(|\.delete\(/);
 assert.doesNotMatch(js,/ผู้ใหญ่ปูน|เสริมศักดิ์|วิฑูรย์|รัชตรังสี/);
 assert.match(html,/doc02\.js\?v=roster12/);
 assert.match(css,/\.doc02-appointment-box/);
 assert.match(js,/r2_doc02_save_draft/);
 assert.doesNotMatch(js,/r2_save_minutes|r2_record_decision|r2_create_task/);
});
