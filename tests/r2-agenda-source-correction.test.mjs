import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const frontend=readFileSync("portal.js","utf8");
const docSource=readFileSync("doc02.js","utf8");
const migration=readFileSync("supabase/migrations/202611100013_agenda_source_retirement.sql","utf8");
const win={};
vm.runInNewContext(docSource,{window:win,document:{getElementById:()=>null},Intl,Date,console},{timeout:2000});
const doc=win.BWDDoc02;
const meeting={id:"mock-meeting",location:"",scheduled_on:"2026-11-10"};
const oldSource=[
 ...[1,2,3,4].map((j)=>({id:"a"+j,section:1,position:j,title:"รายการตัวอย่างหมวดหนึ่ง "+j,notes:"เก่า"})),
 {id:"b",section:2,position:5,title:"ตัวอย่าง 2",notes:""},
 ...[6,7].map(j=>({id:"c"+j,section:3,position:j,title:"ตัวอย่าง 3",notes:""})),
 ...[8,9,10,11].map(j=>({id:"d"+j,section:4,position:j,title:"ตัวอย่าง 4",notes:""})),
 {id:"old-5a",section:5,position:12,title:"ข้อเสนอเดิม",notes:"บันทึกเดิม"},
 {id:"old-5b",section:5,position:13,title:"การนัดหมายเดิม",notes:""}
];
const activeSource=[
 ...oldSource.filter(item=>item.id!=="d11"&&item.id!=="old-5a"&&item.id!=="old-5b"),
 {id:"new-shirt",section:5,position:11,title:"เรื่องใหม่",notes:""},
 {id:"old-5a",section:5,position:12,title:"ข้อเสนอเดิม (ย้ายเลข)",notes:"ข้อมูลปรับปรุง"},
 {id:"old-5b",section:5,position:13,title:"การนัดหมายเดิม (ย้ายเลข)",notes:""}
];
test("source correction retains 13 active topics with new ID and independently preserved historical snapshot",()=>{
 const old=doc.sourceFields("agenda",meeting,oldSource);
 old.header.meeting_no="1/2569";
 old.items.find(x=>x.agenda_id==="old-5a").background="คำอธิบายที่กรอกไว้";
 old.items.find(x=>x.agenda_id==="d11").background="บันทึกหัวข้อที่ถอน";
 const frozen=JSON.stringify(old);
 const updated=doc.alignDraftToSource(old,meeting,activeSource);
 assert.equal(updated.items.length,13);
 assert.deepEqual(Array.from(new Set(updated.items.map(a=>a.section))),[1,2,3,4,5]);
 assert.equal(updated.header.meeting_no,"1/2569");
 assert.equal(updated.items.find(x=>x.agenda_id==="old-5a").background,"คำอธิบายที่กรอกไว้");
 assert.equal(updated.items.find(x=>x.agenda_id==="new-shirt").background,"");
 assert.ok(!updated.items.some(x=>x.agenda_id==="d11"));
 assert.equal(updated.items.filter(x=>x.section===5).length,3);
 assert.equal(updated.items.find(x=>x.agenda_id==="old-5a").display_no,"5.2");
 assert.equal(JSON.stringify(old),frozen,"older immutable snapshot must remain unchanged");
 assert.equal(doc.sameSource(old.items,updated.items),false);
 assert.equal(doc.sameSource(updated.items,doc.sourceFields("agenda",meeting,activeSource).items),true);
});
test("retirement is private audited and filtered in frontend and DOC-02 SQL validation",()=>{
 assert.match(frontend,/from\("agendas"\)\.select\("\*"\)\.is\("retired_at",null\)/);
 assert.match(migration,/add column if not exists retired_at timestamptz/);
 assert.match(migration,/private\.agenda_source_correction_batches/);
 assert.match(migration,/enable row level security/);
 assert.match(migration,/revoke all on private\.agenda_source_correction_batches from public,anon,authenticated/);
 assert.match(migration,/a\.retired_at is null/);
 assert.match(docSource,/หัวข้อวาระต้นทางมีการปรับปรุง/);
 assert.match(docSource,/ร่างรุ่นเดิมยังคงอยู่และไม่ถูกเขียนทับ/);
 assert.doesNotMatch(migration,/delete\s+from\s+public\.agendas|update\s+public\.minutes/i);
});
