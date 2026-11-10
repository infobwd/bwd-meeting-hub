import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";

const js=readFileSync("doc02.js","utf8");
const css=readFileSync("portal.css","utf8");
const html=readFileSync("workspace.html","utf8");
const window={};
vm.runInNewContext(js,{window,document:{getElementById:()=>null},Date,Intl,console},{timeout:2000});
const doc=window.BWDDoc02;
const meeting={id:"mock-1",title:"ประชุมคณะกรรมการ (ข้อมูลสมมติ)",kind:"board",scheduled_on:"2026-11-10",location:"ห้องประชุมทดสอบ",meeting_mode:null};
const counts=[4,1,2,4,2];
const agendas=counts.flatMap((count,index)=>Array.from({length:count},(_,j)=>({
 id:"test-"+(index+1)+"-"+(j+1),section:index+1,
 position:counts.slice(0,index).reduce((a,b)=>a+b,0)+j+1,
 title:(index===4&&j===1?"5.2 กำหนดนัดประชุมครั้งถัดไป":"เรื่องทดสอบ "+(index+1)+"."+(j+1)),
 notes:"ข้อมูลสมมติที่ไม่ใช่ข้อความในการประชุมจริง"
})));
function fixture(type="minutes"){
 doc.setContextForTest({meeting,agendas,oldMinutes:{version:4,status:"submitted"},documents:[]});
 doc.setTemplateForTest("legacy5");
 return doc.sourceFields(type,meeting,agendas);
}
test("DOC-02 mobile: removes duplicate matching number only at render time",()=>{
 const fields=fixture();
 const sourceTitle=agendas.at(-1).title;
 assert.equal(fields.items.at(-1).display_no,"5.2");
 assert.equal(doc.cleanItemTitle(fields.items.at(-1)),"กำหนดนัดประชุมครั้งถัดไป");
 const m=doc.previewMarkup("minutes",fields);
 assert.match(m,/วาระ 5\.2 กำหนดนัดประชุมครั้งถัดไป/);
 assert.doesNotMatch(m,/วาระ 5\.2\s*[—–-]\s*5\.2/);
 assert.equal(agendas.at(-1).title,sourceTitle,"source title unchanged");
 assert.equal(fields.items.at(-1).title,sourceTitle,"snapshot title is original");
 assert.equal(fields.items.at(-1).position,13,"stored global position unchanged");
 assert.equal(doc.cleanItemTitle({title:"5.21 ไม่ตรงเลข",display_no:"5.2"}),"5.21 ไม่ตรงเลข");
 assert.equal(doc.cleanItemTitle({title:"วาระที่ 5.2 — เรื่องเดิม",display_no:"5.2"}),"เรื่องเดิม");
});

test("DOC-02 mobile: approximate A4 preview preserves all 13 items across pages with draft watermark",()=>{
 const fields=fixture();
 const pages=doc.previewPages(fields.items,"minutes");
 assert.ok(pages.length>=2,"13 items should be split across multiple draft pages");
 assert.equal(pages.reduce((sum,p)=>sum+p.length,0),13);
 assert.deepEqual(Array.from(pages.flat().map(x=>x.agenda_id)),Array.from(fields.items.map(x=>x.agenda_id)));
 const markup=doc.previewMarkup("minutes",fields);
 const count=(markup.match(/class="doc02-page"/g)||[]).length;
 assert.equal(count,pages.length);
 assert.equal((markup.match(/ตัวอย่างฉบับร่าง • ไม่ใช่เอกสารรับรอง/g)||[]).length,count);
 assert.match(markup,/หน้า 1 \/ /);
 assert.match(markup,/แบ่งหน้าโดยประมาณ/);
 assert.match(markup,/ยังไม่มีหลักฐานรับรองโดยที่ประชุม/);
 assert.doesNotMatch(markup,/รับรองแล้ว<\/span>/);
});

test("DOC-02 mobile: outcome types remain draft and source numbering/data unchanged",()=>{
 const fields=fixture();
 fields.items[0].information="เพื่อทราบ (สมมติ)";
 fields.items[0].proposal="ข้อเสนอรอพิจารณา (สมมติ)";
 fields.items[0].resolution="ข้อความมติร่าง (ยังไม่รับรอง)";
 const markup=doc.previewMarkup("minutes",fields);
 for(const phrase of ["เพื่อทราบ (สมมติ)","ข้อเสนอรอพิจารณา (สมมติ)","ข้อความมติร่าง (ยังไม่รับรอง)"]){
  assert.ok(markup.includes(phrase));
 }
 assert.equal(fields.items.length,13);
 assert.deepEqual(Array.from(new Set(fields.items.map(a=>a.section))),[1,2,3,4,5]);
});

test("DOC-02 mobile: switches one pane at a time with no percentage-height split",()=>{
 assert.match(html,/id="doc02ViewSwitch"/);
 assert.match(html,/data-doc02-view="edit"/);
 assert.match(html,/data-doc02-view="preview"/);
 assert.match(html,/id="doc02Editor" class="doc02-editor-scroll"/);
 assert.match(css,/\.doc02-view-switch\{display:flex\}/);
 assert.match(css,/\.doc02-dialog\[data-mobile-view="edit"\] \.doc02-preview-pane\{display:none\}/);
 assert.match(css,/\.doc02-dialog\[data-mobile-view="preview"\] \.doc02-edit-pane\{display:none\}/);
 assert.doesNotMatch(css,/max-height:(?:47|53)%/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/\.doc02-editor-scroll\{flex:1/);
 assert.match(js,/function setView\(view\)/);
 assert.match(js,/previewMarkup\(activeType,captureForm\(\)\)/);
 assert.match(js,/button\.setAttribute\("aria-pressed"/);
 assert.match(html,/portal\.css\?v=doc02ux/);
 assert.match(html,/portal\.js\?v=doc02ux/);
 assert.match(html,/doc02\.js\?v=doc02ux/);
});

test("DOC-02 mobile: compact status and input guidance without changing legacy report",()=>{
 assert.match(js,/doc02-state-top/);
 assert.match(js,/doc02-legacy-chip/);
 assert.match(js,/รายละเอียดสถานะเอกสาร/);
 assert.match(js,/กรุณาระบุครั้งที่/);
 assert.match(js,/placeholder="เช่น 1\/2569 \(ตรวจสอบตามข้อมูลจริง\)"/);
 assert.match(js,/>บันทึกร่าง<\/button>/);
 assert.doesNotMatch(js,/>บันทึกร่างฉบับใหม่<\/button>/);
 assert.match(js,/function close\(\)[\s\S]*closePrivate\(\)/);
 assert.doesNotMatch(js,/r2_save_minutes|r2_record_decision|r2_create_task/);
});
