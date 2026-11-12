/* DOC-02: separate, private drafts for agenda and official minutes; no ratification or official export. */
(function(global){
"use strict";
const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const statusNames={draft:"ฉบับร่าง",submitted:"รอตรวจทาน",returned:"ส่งกลับให้แก้ไข",reviewed:"ตรวจทานแล้ว",ratified:"รับรองแล้ว"};
const documentNames={agenda:"ระเบียบวาระการประชุม",minutes:"รายงานการประชุม (แบบที่ 11)"};
const labels5={1:"เรื่องที่ประธานแจ้งให้ทราบ",2:"เรื่องรับรองรายงานการประชุมครั้งก่อน",3:"เรื่องสืบเนื่อง",4:"เรื่องเสนอเพื่อพิจารณา",5:"เรื่องอื่น ๆ"};
const labels6={1:"เรื่องที่ประธานแจ้งให้ทราบ",2:"เรื่องรับรองรายงานการประชุมครั้งก่อน",3:"เรื่องสืบเนื่อง",4:"เรื่องเสนอเพื่อทราบ",5:"เรื่องเสนอเพื่อพิจารณา",6:"เรื่องอื่น ๆ"};
const outcomeLabels=[
 ["substance","สาระสำคัญ"],["deliberation","ผลการพิจารณา"],
 ["information","เรื่องรับทราบ"],["resolution","มติที่ประชุม (ร่าง ยังไม่รับรอง)"],
 ["proposal","ข้อเสนอที่ยังไม่ได้ข้อยุติ"],["directive","ข้อสั่งการ / งานที่เสนอให้มอบหมาย"]
];
const extraAgendaLabels=[["background","รายละเอียดและความเป็นมา"],["references","เอกสารประกอบหรือที่มา"],["question","ประเด็นเสนอเพื่อพิจารณา"]];
const headerKeys=[
 ["meeting_no","ครั้งที่ (ตัวอย่างรูปแบบ 1/2569)"],
 ["start_time","เวลาเริ่มประชุม (ตามข้อเท็จจริง)"],
 ["end_time","เวลาเลิกประชุม (ตามข้อเท็จจริง)"],
 ["venue","สถานที่ประชุม"],
 ["chair","ผู้ทำหน้าที่ประธานในการประชุมจริง"],
 ["chair_office","ตำแหน่งประจำของผู้ทำหน้าที่ประธาน (ถ้ามี)"],
 ["secretary","กรรมการและเลขานุการที่ทำหน้าที่จริง"],
 ["secretary_office","ตำแหน่งประจำของกรรมการและเลขานุการ (ถ้ามี)"],
 ["recorder","ผู้จดรายงานการประชุมจริง"],
 ["recorder_office","ตำแหน่งประจำของผู้จดรายงาน (ถ้ามี)"],
 ["attendees","ผู้มาประชุม / กรรมการ (ชื่อและบทบาทตามการแต่งตั้ง)"],
 ["absentees","ผู้ไม่มาประชุม (ถ้ามี พร้อมเหตุผล)"],
 ["other_attendees","ผู้เข้าร่วมประชุมที่ไม่ใช่กรรมการ (ถ้ามี)"]
];
let context=null,activeType="agenda",documents={agenda:null,minutes:null},templateKey="legacy5",
    busy=false,hasUnsaved=false,sessionGeneration=0,activeView="edit",previewZoom="fit";

function ordered(items){return items.slice().sort((a,b)=>Number(a.section)-Number(b.section)||Number(a.position)-Number(b.position));}
function sourceFields(type,meeting,agendas){
 const withinSection={};
 return {
  header:{
   meeting_no:"",start_time:"",end_time:"",venue:meeting.location||"",
   chair:"",chair_office:"",secretary:"",secretary_office:"",recorder:"",recorder_office:"",
   attendees:"",absentees:"",other_attendees:""
  },
  items:ordered(agendas).map(a=>({
   agenda_id:a.id,section:Number(a.section),position:Number(a.position||0),
   display_no:String(a.section)+"."+String(withinSection[a.section]=(withinSection[a.section]||0)+1),
   title:String(a.title||""),notes:String(a.notes||""),
   background:"",references:"",question:"",substance:"",deliberation:"",
   information:"",resolution:"",proposal:"",directive:""
  }))
 };
}
const userItemKeys=["background","references","question","substance","deliberation",
 "information","resolution","proposal","directive"];
function sameSource(items,sourceItems){
 if(!Array.isArray(items)||items.length!==sourceItems.length)return false;
 return items.every((item,i)=>{
  const current=sourceItems[i];
  return current&&["agenda_id","section","position","title","notes"].every(
   key=>String(item[key]??"")===String(current[key]??""));
 });
}
function hasChangedSource(type){
 const fields=documents[type]?.document_fields;
 if(!fields?.items||!context)return false;
 const current=sourceFields(type,context.meeting,context.agendas);
 return !sameSource(fields.items,current.items);
}
function alignDraftToSource(previous,meeting,agendas){
 const fresh=sourceFields("agenda",meeting,agendas);
 if(!previous?.items||!previous?.header)return fresh;
 fresh.header={...fresh.header,...previous.header};
 const previousById=new Map(previous.items.map(item=>[item.agenda_id,item]));
 for(const item of fresh.items){
  const saved=previousById.get(item.agenda_id);
  if(saved){
   for(const key of userItemKeys)item[key]=String(saved[key]??"");
  }
 }
 return fresh;
}

function appointmentReference(roster){
 if(!roster||!Array.isArray(roster.entries)||!roster.entries.length)return null;
 return {
  source_id:String(roster.id||""),revision:Number(roster.revision||0),
  authority_label:String(roster.authority_label||""),
  source_title:String(roster.source_title||""),
  source_kind:String(roster.source_kind||""),
  verification_status:String(roster.verification_status||"transcribed_pending_verification"),
  term_ends_on:roster.term_ends_on||null,
  announced_on:roster.announced_on||null,
  entries:roster.entries.slice(0,30).map(entry=>({
   order:Number(entry.order||0),
   name:typeof entry.name==="string"?entry.name:"",
   office:typeof entry.office==="string"?entry.office:"",
   representation:String(entry.representation||""),
   committee_role:String(entry.committee_role||""),
   spelling_review_required:entry.spelling_review_required===true
  }))
 };
}
function appointmentRosterForDraft(type,fields){
 const latest=documents[type];
 if(!context?.editable||!context.appointmentRoster||
   (latest&&!["draft","returned"].includes(latest.document_status)))return fields;
 const ref=appointmentReference(context.appointmentRoster);
 if(!ref)return fields;
 fields.header={...(fields.header||{}),appointment_reference:ref};
 return fields;
}
function appointmentReferenceNotSaved(type){
 const roster=context?.appointmentRoster,latest=documents[type];
 if(!context?.editable||!roster||!roster.entries?.length||
    (latest&&!["draft","returned"].includes(latest.document_status)))return false;
 const current=latest?.document_fields?.header?.appointment_reference;
 return current?.source_id!==roster.id||Number(current?.revision||0)!==Number(roster.revision);
}
function appointmentRosterMarkup(ref,forPaper=false){
 if(!ref||!Array.isArray(ref.entries)||!ref.entries.length)return "";
 const heading="คณะกรรมการสถานศึกษาตามประกาศแต่งตั้ง (ข้อมูลอ้างอิง ไม่ใช่ผู้มาประชุมจริง)";
 const rows=ref.entries.slice().sort((a,b)=>Number(a.order)-Number(b.order)).map(person=>{
  const personName=person.name||person.office||"ตำแหน่งตามคำสั่งแต่งตั้ง";
  const office=person.name&&person.office?" • "+escapeHtml(person.office):"";
  return '<li><span class="doc02-appointee-name">'+escapeHtml(personName)+'</span>'+office+
   ' — '+escapeHtml(person.representation||"ไม่ระบุผู้แทน")+
   ' — <strong>'+escapeHtml(person.committee_role||"กรรมการ")+'</strong>'+
   (person.spelling_review_required?' <small>(ตรวจสอบตัวสะกดกับต้นฉบับ)</small>':"")+'</li>';
 }).join("");
 const foot='คัดข้อมูลจากภาพประกาศที่ผู้ใช้แนบเพื่ออ้างอิง โปรดตรวจสอบคำสั่งแต่งตั้งและตัวสะกด'+
  ' รวมถึงผู้ปฏิบัติหน้าที่จริงก่อนออกเอกสารรับรอง';
 const body='<ol class="doc02-appointment-list">'+rows+'</ol>'+
  '<p class="doc02-appointment-warning">'+escapeHtml(foot)+'</p>';
 return forPaper?
   '<section class="doc02-appointment-appendix"><h3>'+escapeHtml(heading)+'</h3>'+
   '<p class="doc02-appointment-source">'+escapeHtml(ref.authority_label||"หน่วยงานผู้ออกประกาศ")+
   ' · '+escapeHtml(ref.source_title||"ประกาศแต่งตั้ง")+
   '</p>'+body+'</section>':
   '<details class="doc02-appointment-box" open><summary>'+escapeHtml(heading)+'</summary>'+body+'</details>';
}

function draftFields(type){
 const latest=documents[type];
 let fields;
 if(latest?.document_fields?.items&&latest?.document_fields?.header){
  fields=hasChangedSource(type)&&["draft","returned"].includes(latest.document_status)?
    alignDraftToSource(latest.document_fields,context.meeting,context.agendas):
    JSON.parse(JSON.stringify(latest.document_fields));
 }else{
  fields=sourceFields(type,context.meeting,context.agendas);
 }
 return appointmentRosterForDraft(type,fields);
}
function titleForSection(section){
 const map=templateKey==="school6"?labels6:labels5;
 return map[section]||"หมวดวาระที่ "+String(section);
}
function cleanItemTitle(item){
 const title=String(item.title||"").trim(),no=String(item.display_no||String(item.section)+"."+String(item.position));
 // Strip the number only when the original title starts with THIS item's display number.
 // The original source title, section and position are never modified.
 for(const prefix of [no,"วาระ "+no,"วาระที่ "+no]){
  if(!title.startsWith(prefix))continue;
  const rest=title.slice(prefix.length);
  if(rest && !/^[\s.:：)–—-]/.test(rest))continue;
  const cleaned=rest.replace(/^[\s.:：)–—-]+/,"").trim();
  return cleaned||title;
 }
 return title;
}

function thaiDate(value){
 if(!value)return "ยังไม่กำหนดวัน";
 const d=new Date(String(value)+"T12:00:00");
 return Number.isNaN(d.getTime())?"ยังไม่กำหนดวัน":new Intl.DateTimeFormat("th-TH",{dateStyle:"long"}).format(d);
}
function previewMeetingTitle(meeting){
 const title=String(meeting.title||"การประชุม").trim();
 const date=thaiDate(meeting.scheduled_on);
 // Hide a duplicate trailing date only if it exactly matches the meeting date.
 // Never edit the saved meeting title or remove an unverified date.
 if(date!=="ยังไม่กำหนดวัน"){
  for(const suffix of [" — "+date," – "+date," - "+date," ("+date+")"]){
   if(title.endsWith(suffix))return title.slice(0,-suffix.length).trim();
  }
 }
 return title;
}

function textField(label,key,value,wide=false){
 return '<label class="doc02-field">'+escapeHtml(label)+
 (wide?'<textarea data-doc02-header="'+escapeHtml(key)+'" rows="3" maxlength="8000">':
  '<input data-doc02-header="'+escapeHtml(key)+'" maxlength="500"'+
  (key==="meeting_no"?' placeholder="เช่น 1/2569 (ตรวจสอบตามข้อมูลจริง)"':"")+
  ' value="'+escapeHtml(value||"")+'">')+
 (wide?escapeHtml(value||"")+'</textarea>':"")+'</label>';
}
function itemFields(item,type){
 const keys=type==="agenda"?extraAgendaLabels:outcomeLabels;
 return '<details class="doc02-agenda-editor"><summary>วาระ '+
  escapeHtml(item.display_no||String(item.section)+"."+String(item.position))+" — "+escapeHtml(cleanItemTitle(item))+
  '</summary><p class="doc02-source-note">รายละเอียดหัวข้อเดิม (อ่านอย่างเดียว): '+
  escapeHtml(item.notes||"ไม่มีข้อความประกอบ")+'</p>'+
  keys.map(([key,label])=>'<label class="doc02-field">'+escapeHtml(label)+
   '<textarea data-doc02-item="'+escapeHtml(item.agenda_id)+'" data-doc02-key="'+escapeHtml(key)+
   '" rows="3" maxlength="8000">'+escapeHtml(item[key]||"")+'</textarea></label>').join("")+
  '</details>';
}
function editorMarkup(type,fields){
 const h=fields.header||{},items=ordered(fields.items||[]);
 const headerNames=type==="agenda"?[headerKeys[0],headerKeys[1],headerKeys[3]]:headerKeys;
 return '<div class="doc02-editor"><p class="doc02-helper">แก้ไขเฉพาะข้อมูลร่างในเอกสารชุดใหม่นี้ '+
   'ไม่เขียนทับวาระและรายงานฉบับเดิมของการประชุม</p>'+
   appointmentRosterMarkup(h.appointment_reference)+
   '<fieldset><legend>ข้อมูลหัวเอกสาร</legend>'+
   headerNames.map(([key,label])=>textField(label,key,h[key]||"",
     ["attendees","absentees","other_attendees"].includes(key))).join("")+'</fieldset>'+
   '<fieldset><legend>รายละเอียดรายวาระ (อ้างอิงข้อมูลประชุมเดิม)</legend>'+
   '<p class="mini">มี '+items.length+' หัวข้อ ใช้ข้อมูลเรื่องและลำดับเดียวกับการประชุมเดิม ทุกช่องเพิ่มเติมเป็นร่างที่ตรวจสอบได้</p>'+
   items.map(item=>itemFields(item,type)).join("")+'</fieldset></div>';
}
function line(value,placeholder="ยังไม่ระบุ"){
 return escapeHtml(String(value||"").trim()||placeholder).replace(/\n/g,"<br>");
}
function itemPreview(item,type){
 const no=escapeHtml(item.display_no||String(item.section)+"."+String(item.position));
 let body='<div class="doc02-paper-item"><h4>วาระ '+no+" "+escapeHtml(cleanItemTitle(item))+'</h4>';
 if(type==="agenda"){
  if(item.notes)body+='<p><b>รายละเอียดต้นทาง:</b> '+line(item.notes)+'</p>';
  for(const [key,label] of extraAgendaLabels){if(item[key])body+='<p><b>'+escapeHtml(label)+':</b> '+line(item[key])+'</p>';}
 }else{
  if(item.notes)body+='<p><b>เรื่องที่เสนอ:</b> '+line(item.notes)+'</p>';
  for(const [key,label] of outcomeLabels){
   if(item[key])body+='<p><b>'+escapeHtml(label)+':</b> '+line(item[key])+'</p>';
  }
  if(!outcomeLabels.some(([key])=>String(item[key]||"").trim()))
    body+='<p class="doc02-unrecorded">ยังไม่บันทึกผลการประชุมสำหรับวาระนี้</p>';
 }
 return body+'</div>';
}
function estimatedItemLines(item,type){
 const keys=type==="agenda"?extraAgendaLabels:outcomeLabels;
 let lines=3+Math.ceil(String(item.title||"").length/65);
 if(item.notes)lines+=2+Math.ceil(String(item.notes).length/75);
 for(const [key] of keys){
  if(item[key])lines+=2+Math.ceil(String(item[key]).length/75);
 }
 if(type==="minutes"&&!keys.some(([key])=>String(item[key]||"").trim()))lines+=2;
 return lines;
}
function previewPages(items,type){
 // Approximate page grouping for on-screen drafting, never a certified A4 export.
 // Keep complete agenda items together; very long single entries may extend one page.
 const pages=[[]];
 let used=0;
 for(const item of ordered(items)){
  let current=pages[pages.length-1];
  const headingCost=current.some(a=>Number(a.section)===Number(item.section))?0:3;
  const lineCost=estimatedItemLines(item,type)+headingCost;
  const budget=pages.length===1?22:33;
  if(current.length&&used+lineCost>budget){
   pages.push([]);
   current=pages[pages.length-1];
   used=0;
  }
  const newHeadingCost=current.some(a=>Number(a.section)===Number(item.section))?0:3;
  current.push(item);used+=estimatedItemLines(item,type)+newHeadingCost;
 }
 return pages;
}
function previewMarkup(type,fields){
 const m=context.meeting,h=fields.header||{},items=ordered(fields.items||[]);
 const heading=documentNames[type];
 const snapshot=documents[type];
 const ver=snapshot?'ฉบับที่ '+snapshot.revision:'ฉบับร่างใหม่ (ยังไม่บันทึก)';
 const status=snapshot?statusNames[snapshot.document_status]||"ร่าง":"ฉบับร่าง";
 const pages=previewPages(items,type);
 const roster=h.appointment_reference?.entries?.length?h.appointment_reference:null;
 const totalPages=pages.length+(roster?1:0);
 const allSections=[...new Set(items.map(a=>Number(a.section)))];
 const renderHeader=pageIndex=>{
  if(pageIndex>0)return '<h2>'+escapeHtml(heading)+' (ต่อ)</h2>'+
   '<p class="doc02-paper-center doc02-paper-continuation">'+escapeHtml(previewMeetingTitle(m))+
   ' · '+(String(h.meeting_no||"").trim()?'ครั้งที่ '+line(h.meeting_no):'ยังไม่ระบุครั้งที่')+'</p>';
  let head='<h2>'+escapeHtml(heading)+'</h2>'+
   '<p class="doc02-paper-center"><strong>'+escapeHtml(previewMeetingTitle(m))+'</strong></p>'+
   '<p class="doc02-paper-center">โรงเรียนบ้านวังด้ง · '+
   (String(h.meeting_no||"").trim()?'ครั้งที่ '+line(h.meeting_no):'ยังไม่ระบุครั้งที่ (กรอกในข้อมูลหัวเอกสาร)')+'</p>'+
   '<p class="doc02-paper-center">วันที่ '+escapeHtml(thaiDate(m.scheduled_on))+
   ' · '+line(h.venue||m.location)+'</p>'+
   (roster?'<p class="doc02-appointment-link">มีบัญชีกรรมการตามประกาศแต่งตั้งแนบเป็นภาคผนวก'+
     ' (ไม่ใช่บัญชีผู้เข้าประชุมจริง)</p>':"")+
   '<p class="doc02-paper-meta">สถานะเอกสาร DOC-02: '+escapeHtml(status)+' • '+escapeHtml(ver)+
   ' • ยังไม่มีหลักฐานรับรองโดยที่ประชุม</p>';
  if(type==="agenda"){
   head+='<p><b>เวลาประชุม:</b> '+line(h.start_time,"ยังไม่กำหนดเวลา")+'</p>';
   const docs=context.documents||[];
   if(docs.length)head+='<p><b>เอกสารประกอบที่ผูกกับการประชุม:</b> '+
     docs.map(d=>escapeHtml(d.title||"เอกสารอ้างอิง")).join(" • ")+'</p>';
  }else{
   head+='<p><b>ผู้มาประชุม:</b> '+line(h.attendees)+'</p>'+
    '<p><b>ผู้ไม่มาประชุม:</b> '+line(h.absentees,"ไม่มีข้อมูล / ตรวจสอบตามจริง")+'</p>'+
    '<p><b>ผู้เข้าร่วมประชุม:</b> '+line(h.other_attendees,"ไม่มีข้อมูล / ตรวจสอบตามจริง")+'</p>'+
    '<p><b>ผู้ทำหน้าที่ประธาน:</b> '+line(h.chair)+
    (h.chair_office?' (ตำแหน่งประจำ: '+line(h.chair_office)+')':'')+'</p>'+
    '<p><b>กรรมการและเลขานุการ:</b> '+line(h.secretary)+
    (h.secretary_office?' (ตำแหน่งประจำ: '+line(h.secretary_office)+')':'')+'</p>'+
    '<p><b>เริ่มประชุมเวลา:</b> '+line(h.start_time)+'</p>';
  }
  return head;
 };
 const pagesHtml=pages.map((page,pageIndex)=>{
  let body='<article class="doc02-page" data-doc02-page="'+(pageIndex+1)+
   '" aria-label="พรีวิว A4 หน้าที่ '+(pageIndex+1)+' จาก '+totalPages+' (ประมาณ) ยังไม่ได้รับรอง">'+
   '<div class="doc02-watermark">ตัวอย่างฉบับร่าง • ไม่ใช่เอกสารรับรอง</div>'+
   renderHeader(pageIndex);
  for(const section of [...new Set(page.map(a=>Number(a.section)))]){
   const group=page.filter(a=>Number(a.section)===section);
   const firstOfSection=items.find(a=>Number(a.section)===section);
   const continued=group[0]?.agenda_id!==firstOfSection?.agenda_id;
   body+='<section class="doc02-paper-section"><h3>ระเบียบวาระที่ '+
    escapeHtml(section)+' '+escapeHtml(titleForSection(section))+
    (continued?' (ต่อ)':'')+'</h3>'+group.map(item=>itemPreview(item,type)).join("")+'</section>';
  }
  if(type==="minutes"&&pageIndex===pages.length-1){
   body+='<p><b>เลิกประชุมเวลา:</b> '+line(h.end_time)+'</p>'+
    '<p class="doc02-recorder"><b>ผู้จดรายงานการประชุม:</b> '+line(h.recorder)+
    (h.recorder_office?' (ตำแหน่งประจำ: '+line(h.recorder_office)+')':'')+'</p>'+
    '<p class="doc02-not-signature">ยังไม่ใช่ลายมือชื่อหรือการรับรองรายงานโดยที่ประชุม</p>';
  }
  body+='<footer class="doc02-paper-foot">พรีวิวสำหรับการตรวจทานเท่านั้น — ไม่ใช่เอกสารที่ออกใช้แล้ว'+
   '<p class="doc02-page-counter">หน้า '+(pageIndex+1)+' / '+totalPages+' (ประมาณ)</p></footer></article>';
  return body;
 }).join("");
 const appendix=roster?'<article class="doc02-page" data-doc02-page="'+totalPages+
   '" aria-label="ภาคผนวกบัญชีกรรมการตามประกาศแต่งตั้ง หน้าที่ '+totalPages+'">'+
   '<div class="doc02-watermark">ตัวอย่างฉบับร่าง • ไม่ใช่เอกสารรับรอง</div>'+
   appointmentRosterMarkup(roster,true)+
   '<footer class="doc02-paper-foot">บัญชีกรรมการตามประกาศแต่งตั้ง ไม่ใช่หลักฐานการเข้าประชุมจริง'+
   '<p class="doc02-page-counter">หน้า '+totalPages+' / '+totalPages+' (ประมาณ)</p></footer></article>':"";
 return '<p class="doc02-preview-info">ตัวอย่าง A4 แบ่งหน้าโดยประมาณสำหรับตรวจทานบนหน้าจอ'+
  ' — การจัดหน้าสำหรับออกเอกสารราชการจริงอยู่ใน DOC-03</p>'+pagesHtml+appendix;
}
function selectedStatus(){
 const current=documents[activeType];return current?statusNames[current.document_status]||"ไม่ทราบสถานะ":"ฉบับร่าง (ยังไม่บันทึก)";
}
function renderDialog(){
 const dialog=$("doc02Dialog");if(!dialog||!context)return;
 const type=activeType,latest=documents[type],fields=draftFields(type);
 const readonly=!context.editable||["submitted","reviewed","ratified"].includes(latest?.document_status);
 const actions='<div class="doc02-actions">'+
  '<button type="button" data-doc02-action="preview" class="button outline">อัปเดตพรีวิว A4</button>'+
  (context.editable&&!readonly?'<button type="button" data-doc02-action="save" class="button primary">บันทึกร่าง</button>':"")+
  (context.editable&&latest?.document_status==="draft"?
   '<button type="button" data-doc02-action="submit" class="button outline">ส่งเอกสารให้ตรวจทาน</button>':"")+
  (context.isAdmin&&latest?.document_status==="submitted"&&latest.recorded_by!==context.user?.id?
   '<label class="doc02-review-note">ความเห็นผู้ตรวจ <textarea id="doc02ReviewNote" rows="2" maxlength="2000"></textarea></label>'+
    '<button type="button" data-doc02-action="review" data-approve="yes" class="button outline">ตรวจทานแล้ว</button>'+
    '<button type="button" data-doc02-action="review" data-approve="no" class="button outline">ส่งกลับแก้ไข</button>':"")+
  '</div>';
 const leg=context.oldMinutes;
 const legacyInfo=type==="minutes"&&leg?
  '<span class="doc02-legacy-chip">รายงานเดิม: ฉบับที่ '+escapeHtml(leg.version||0)+
  ' · '+escapeHtml(({draft:"ฉบับร่าง",submitted:"รอตรวจทาน",approved:"ผู้บริหารตรวจทานแล้ว"})[leg.status]||leg.status)+
  '</span>':"";
 const appointmentNotice=appointmentReferenceNotSaved(type)?
  '<p class="notice-box" role="status">พบรายชื่อกรรมการจากประกาศแต่งตั้งฉบับอ้างอิงล่าสุด '+
  'จะแสดงในพรีวิว แต่ยังไม่รวมในรุ่นเอกสารที่บันทึกไว้ กด “บันทึกร่าง” เพื่อเก็บไว้ในรุ่นใหม่ '+
  'และตรวจชื่อกับประกาศต้นฉบับก่อนใช้อย่างเป็นทางการ</p>':"";
 const sourceNotice=hasChangedSource(type)?
  '<p class="notice-box" role="status">หัวข้อวาระต้นทางมีการปรับปรุงหลังบันทึกรุ่นนี้ '+
  (["draft","returned"].includes(latest?.document_status)?
   'ระบบแสดงหัวข้อที่ใช้อยู่ปัจจุบันและคงข้อความเพิ่มเติมของหัวข้อเดิมที่ยังมีอยู่ โปรดตรวจสอบก่อนบันทึกร่างรุ่นใหม่ ร่างรุ่นเดิมจะถูกเก็บไว้':'เอกสารรุ่นนี้เป็นหลักฐานตามหัวข้อเดิมที่บันทึกไว้ กรุณาตรวจสอบสถานะก่อนจัดทำร่างรุ่นใหม่')+
  '</p>':"";
 $("doc02Title").textContent=type==="agenda"?"ร่างระเบียบวาระและพรีวิว A4":"ร่างรายงานการประชุมและพรีวิว A4";
 $("doc02Tabs").innerHTML=['agenda','minutes'].map(key=>
   '<button type="button" role="tab" data-doc02-type="'+key+'" aria-selected="'+(key===type)+'" class="button '+
   (key===type?"primary":"outline")+'">'+escapeHtml(documentNames[key])+'</button>').join("");
 $("doc02Status").innerHTML='<div class="doc02-state-top"><span class="status">'+escapeHtml(selectedStatus())+'</span>'+
   (latest?'<span class="mini">รุ่นที่ '+escapeHtml(latest.revision)+'</span>':"")+legacyInfo+'</div>'+
   '<details class="doc02-state-details"><summary>รายละเอียดสถานะเอกสาร</summary>'+
   '<p>ร่าง DOC-02 แยกจากรายงานเดิม และการตรวจทานไม่ใช่การรับรองโดยที่ประชุม</p></details>';
 $("doc02Editor").innerHTML=sourceNotice+appointmentNotice+(readonly?
  '<p class="notice-box">เอกสารรุ่นนี้ล็อกไว้ตามสถานะ หากส่งตรวจแล้วต้องให้ผู้ตรวจส่งกลับก่อนแก้ไข</p>'+
   editorMarkup(type,fields):editorMarkup(type,fields));
 $("doc02Editor").querySelectorAll("input,textarea").forEach(el=>el.disabled=readonly);
 $("doc02Actions").innerHTML=actions;
 $("doc02Preview").innerHTML=previewMarkup(type,fields);
 $("doc02Error").hidden=true;$("doc02Error").textContent="";
 hasUnsaved=appointmentReferenceNotSaved(type);
 syncView();
 setZoom(previewZoom);
}
function captureForm(){
 const latest=draftFields(activeType);
 const header=latest.header||{};
 $("doc02Editor").querySelectorAll("[data-doc02-header]").forEach(el=>{
   header[el.dataset.doc02Header]=el.value.trim().slice(0,8000);
 });
 const byId=new Map((latest.items||[]).map(item=>[item.agenda_id,item]));
 $("doc02Editor").querySelectorAll("[data-doc02-item]").forEach(el=>{
  const item=byId.get(el.dataset.doc02Item);
  if(item)item[el.dataset.doc02Key]=el.value.trim().slice(0,8000);
 });
 latest.header=header;
 // Never copy external unverified notes into official decisions; the user must enter
 // each typed outcome explicitly in this DOC-02 draft.
 return latest;
}
function setError(message){
 const node=$("doc02Error");node.hidden=false;node.textContent=message;
 node.scrollIntoView?.({block:"nearest"});
}
async function queryLatest(type){
 const table=type==="agenda"?"meeting_agenda_document_versions":"meeting_official_minutes_versions";
 const {data,error}=await context.client.from(table).select("revision,document_status,document_fields,recorded_by,created_at")
  .eq("meeting_id",context.meeting.id).order("revision",{ascending:false}).limit(1);
 if(error)throw error;
 return data?.[0]||null;
}
async function reloadDocuments(){
 const generation=sessionGeneration;
 const [ag,mi]=await Promise.all([queryLatest("agenda"),queryLatest("minutes")]);
 if(generation!==sessionGeneration||!context)return;
 documents={agenda:ag,minutes:mi};
 renderDialog();
}
function syncView(){
 const dialog=$("doc02Dialog");
 if(!dialog)return;
 dialog.dataset.mobileView=activeView;
 $("doc02ViewSwitch")?.querySelectorAll("[data-doc02-view]").forEach(button=>{
  const selected=button.dataset.doc02View===activeView;
  button.setAttribute("aria-pressed",String(selected));
 });
}
function setZoom(level){
 if(!["fit","large"].includes(level))return;
 previewZoom=level;
 const scroll=$("doc02Preview");
 if(scroll)scroll.dataset.zoom=level;
 $("doc02ZoomControls")?.querySelectorAll("[data-doc02-zoom]").forEach(button=>{
  button.setAttribute("aria-pressed",String(button.dataset.doc02Zoom===level));
 });
}

function setView(view){
 if(!context||!["edit","preview"].includes(view))return;
 if(view==="preview"){
  // Reuse current unsaved form values for visual preview only; never write on toggle.
  $("doc02Preview").innerHTML=previewMarkup(activeType,captureForm());
 }
 activeView=view;
 syncView();
 setZoom(previewZoom);
 const pane=view==="preview"?$("doc02PreviewPane"):$("doc02Editor");
 pane?.scrollTo?.({top:0,behavior:"auto"});
}

async function run(action,button){
 if(busy||!context)return;
 const type=activeType,latest=documents[type],m=context.meeting;
 if(!context.editable&&action!=="preview")return;
 if(action==="preview"){
  setView("preview");
  return;
 }
 const row={p_meeting_id:m.id,p_doc_type:type,p_expected_revision:latest?.revision||0};
 let method,payload;
 if(action==="save"){
  if(hasChangedSource(type)&&!global.confirm(
   "วาระต้นทางมีการเปลี่ยนแปลง ต้องการบันทึกร่างรุ่นใหม่ตามหัวข้อปัจจุบันหรือไม่? ร่างรุ่นเดิมยังคงอยู่และไม่ถูกเขียนทับ"))return;
  method="r2_doc02_save_draft";payload={...row,p_fields:captureForm()};
 }else if(action==="submit"){
  if(hasUnsaved){setError("มีข้อมูลที่แก้ไขแต่ยังไม่ได้บันทึกร่าง กรุณาบันทึกร่างก่อนส่งตรวจ");return;}
  if(!global.confirm("ส่งร่างเอกสารให้ผู้รับผิดชอบตรวจทาน โดยยังไม่ใช่การรับรองที่ประชุม?"))return;
  method="r2_doc02_submit";payload=row;
 }else if(action==="review"){
  if(!context.isAdmin||!latest||latest.document_status!=="submitted"||latest.recorded_by===context.user?.id)return;
  const note=$("doc02ReviewNote")?.value?.trim()||"";
  const approve=button.dataset.approve==="yes";
  if(!approve&&!note){setError("โปรดระบุเหตุผลที่ส่งกลับแก้ไข");return;}
  if(!global.confirm(approve?"ยืนยันว่าตรวจทานร่างแล้ว (ไม่ใช่รับรองโดยที่ประชุม)?":"ส่งร่างกลับให้แก้ไข?"))return;
  method="r2_doc02_review";payload={...row,p_approve:approve,p_note:note};
 }else return;
 busy=true;$("doc02Actions").querySelectorAll("button").forEach(b=>b.disabled=true);
 try{
  const {error}=await context.client.rpc(method,payload);
  if(error)throw error;
  await reloadDocuments();
  $("doc02Success").textContent=action==="save"?"บันทึกร่างเป็นรุ่นใหม่แล้ว":action==="submit"?
   "ส่งร่างให้ตรวจทานแล้ว":"บันทึกผลการตรวจทานแล้ว (ยังไม่ใช่การรับรองที่ประชุม)";
 }catch(error){
  setError(error?.message?.includes("Version conflict")?"ข้อมูลเปลี่ยนระหว่างแก้ไข กรุณาปิดและเปิดเอกสารใหม่":
    "บันทึกไม่สำเร็จ: "+(error?.message||"กรุณาลองใหม่"));
 }finally{busy=false;$("doc02Actions").querySelectorAll("button").forEach(b=>b.disabled=false);}
}
function handleClick(event){
 const zoom=event.target.closest("[data-doc02-zoom]");
 if(zoom){setZoom(zoom.dataset.doc02Zoom);return;}
 const view=event.target.closest("[data-doc02-view]");
 if(view){setView(view.dataset.doc02View);return;}
 const tab=event.target.closest("[data-doc02-type]");
 if(tab){
  if(tab.dataset.doc02Type===activeType)return;
  if(hasUnsaved&&!global.confirm("มีร่างที่แก้ไขแต่ยังไม่ได้บันทึก ต้องการสลับเอกสารและทิ้งการแก้ไขนี้หรือไม่?"))return;
  activeType=tab.dataset.doc02Type;activeView="edit";renderDialog();return;
 }
 const action=event.target.closest("[data-doc02-action]");
 if(action){run(action.dataset.doc02Action,action);return;}
}
function close(){
 if(hasUnsaved&&!global.confirm("มีข้อมูลที่แก้ไขแต่ยังไม่บันทึก ต้องการปิดและทิ้งการแก้ไขนี้หรือไม่?"))return;
 closePrivate();
}
async function open(options){
 if(!options?.meeting||options.meeting.meeting_mode==="externally_hosted"||
    options.meeting.meeting_mode==="co_hosted")return;
 const generation=++sessionGeneration;
 context=options;activeType=options.type==="minutes"?"minutes":"agenda";activeView="edit";previewZoom="fit";hasUnsaved=false;
 const dialog=$("doc02Dialog");if(!dialog)return;
 $("doc02Success").textContent="";
 dialog.showModal();
 $("doc02Title").textContent="กำลังตรวจร่างเอกสาร…";
 try{
  const {data,error}=await options.client.from("meeting_document_settings")
   .select("agenda_template_key").eq("meeting_id",options.meeting.id).maybeSingle();
  if(error)throw error;
  if(generation!==sessionGeneration||!context)return;
  templateKey=data?.agenda_template_key||"legacy5";
  // RLS restricts this to authorized meeting viewers; no direct browser writes.
  const rosterResponse=await options.client.from("meeting_committee_appointment_rosters")
   .select("id,revision,authority_label,source_title,source_kind,source_reference,announced_on,term_ends_on,verification_status,entries")
   .eq("meeting_id",options.meeting.id).order("revision",{ascending:false}).limit(1);
  if(generation!==sessionGeneration||!context)return;
  context.appointmentRoster=rosterResponse.error?null:(rosterResponse.data?.[0]||null);
  context.appointmentError=!!rosterResponse.error;
  await reloadDocuments();
 }catch(error){
  if(generation===sessionGeneration&&context)
   setError("ไม่สามารถโหลดร่างเอกสาร: "+(error?.message||"โปรดลองใหม่"));
 }
}
function closePrivate(){
 ++sessionGeneration;context=null;documents={agenda:null,minutes:null};
 activeType="agenda";activeView="edit";previewZoom="fit";hasUnsaved=false;busy=false;
 for(const id of ["doc02Editor","doc02Preview","doc02Status","doc02Actions","doc02Success"]){
  const node=$(id);if(node)node.replaceChildren();
 }
 const dialog=$("doc02Dialog");if(dialog?.open)dialog.close();
}
function init(){
 const dialog=$("doc02Dialog");if(!dialog)return;
 dialog.addEventListener("click",handleClick);
 $("doc02Close").addEventListener("click",close);
 dialog.addEventListener("cancel",ev=>{ev.preventDefault();close();});
 $("doc02Editor").addEventListener("input",()=>{hasUnsaved=true;$("doc02Success").textContent="";});
}
global.BWDDoc02={
 init,open,closePrivate,
 // Pure formatters exported for deterministic regression tests (no live calls).
 sourceFields,previewMarkup,previewPages,escapeHtml,titleForSection,cleanItemTitle,previewMeetingTitle,sameSource,alignDraftToSource,
 appointmentReference,appointmentRosterForDraft,appointmentRosterMarkup,
 setTemplateForTest(key){templateKey=key;},
 setContextForTest(value){context=value;documents={agenda:null,minutes:null};activeType="agenda";}
};
})(window);
