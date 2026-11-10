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
    busy=false,hasUnsaved=false;

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
function draftFields(type){
 const latest=documents[type];
 if(latest?.document_fields?.items&&latest?.document_fields?.header)
  return JSON.parse(JSON.stringify(latest.document_fields));
 return sourceFields(type,context.meeting,context.agendas);
}
function titleForSection(section){
 const map=templateKey==="school6"?labels6:labels5;
 return map[section]||"หมวดวาระที่ "+String(section);
}
function thaiDate(value){
 if(!value)return "ยังไม่กำหนดวัน";
 const d=new Date(String(value)+"T12:00:00");
 return Number.isNaN(d.getTime())?"ยังไม่กำหนดวัน":new Intl.DateTimeFormat("th-TH",{dateStyle:"long"}).format(d);
}
function textField(label,key,value,wide=false){
 return '<label class="doc02-field">'+escapeHtml(label)+
 (wide?'<textarea data-doc02-header="'+escapeHtml(key)+'" rows="3" maxlength="8000">':
  '<input data-doc02-header="'+escapeHtml(key)+'" maxlength="500" value="'+escapeHtml(value||"")+'">')+
 (wide?escapeHtml(value||"")+'</textarea>':"")+'</label>';
}
function itemFields(item,type){
 const keys=type==="agenda"?extraAgendaLabels:outcomeLabels;
 return '<details class="doc02-agenda-editor"><summary>วาระ '+
  escapeHtml(item.display_no||String(item.section)+"."+String(item.position))+" — "+escapeHtml(item.title)+
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
 let body='<div class="doc02-paper-item"><h4>วาระ '+no+" "+escapeHtml(item.title)+'</h4>';
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
function previewMarkup(type,fields){
 const m=context.meeting,h=fields.header||{},items=ordered(fields.items||[]);
 const groups=[...new Set(items.map(a=>Number(a.section)))];
 const heading=documentNames[type];
 const snapshot=documents[type];
 const current=(snapshot?.document_fields?.items===fields.items);
 const ver=snapshot?'ฉบับที่ '+snapshot.revision:'ฉบับร่างใหม่ (ยังไม่บันทึก)';
 const status=snapshot?statusNames[snapshot.document_status]||"ร่าง":"ฉบับร่าง";
 let markup='<article class="doc02-page" aria-label="ตัวอย่างเอกสาร A4 ยังไม่ใช่เอกสารที่รับรองแล้ว">'+
  '<div class="doc02-watermark">ตัวอย่างฉบับร่าง • ไม่ใช่เอกสารรับรอง</div>'+
  '<h2>'+escapeHtml(heading)+'</h2>'+
  '<p class="doc02-paper-center"><strong>'+escapeHtml(m.title||"การประชุม")+'</strong></p>'+
  '<p class="doc02-paper-center">โรงเรียนบ้านวังด้ง · ครั้งที่ '+line(h.meeting_no)+'</p>'+
  '<p class="doc02-paper-center">วันที่ '+escapeHtml(thaiDate(m.scheduled_on))+
   ' · '+line(h.venue||m.location)+'</p>'+
  '<p class="doc02-paper-meta">สถานะเอกสาร DOC-02: '+escapeHtml(status)+' • '+escapeHtml(ver)+
   ' • ยังไม่มีหลักฐานรับรองโดยที่ประชุม</p>';
 if(type==="agenda"){
  markup+='<p><b>เวลาประชุม:</b> '+line(h.start_time,"ยังไม่กำหนดเวลา")+'</p>';
  const docs=context.documents||[];
  if(docs.length)markup+='<p><b>เอกสารประกอบที่ผูกกับการประชุม:</b> '+
    docs.map(d=>escapeHtml(d.title||"เอกสารอ้างอิง")).join(" • ")+'</p>';
 }else{
  markup+='<p><b>ผู้มาประชุม:</b> '+line(h.attendees)+'</p>'+
   '<p><b>ผู้ไม่มาประชุม:</b> '+line(h.absentees,"ไม่มีข้อมูล / ตรวจสอบตามจริง")+'</p>'+
   '<p><b>ผู้เข้าร่วมประชุม:</b> '+line(h.other_attendees,"ไม่มีข้อมูล / ตรวจสอบตามจริง")+'</p>'+
   '<p><b>ผู้ทำหน้าที่ประธาน:</b> '+line(h.chair)+
   (h.chair_office?' (ตำแหน่งประจำ: '+line(h.chair_office)+')':'')+'</p>'+
   '<p><b>กรรมการและเลขานุการ:</b> '+line(h.secretary)+
   (h.secretary_office?' (ตำแหน่งประจำ: '+line(h.secretary_office)+')':'')+'</p>'+
   '<p><b>เริ่มประชุมเวลา:</b> '+line(h.start_time)+'</p>';
 }
 for(const section of groups){
  const group=items.filter(a=>Number(a.section)===section);
  markup+='<section class="doc02-paper-section"><h3>ระเบียบวาระที่ '+
    escapeHtml(section)+' '+escapeHtml(titleForSection(section))+'</h3>'+
    group.map(item=>itemPreview(item,type)).join("")+'</section>';
 }
 if(type==="minutes"){
  markup+='<p><b>เลิกประชุมเวลา:</b> '+line(h.end_time)+'</p>'+
   '<p class="doc02-recorder"><b>ผู้จดรายงานการประชุม:</b> '+line(h.recorder)+
   (h.recorder_office?' (ตำแหน่งประจำ: '+line(h.recorder_office)+')':'')+'</p>'+
   '<p class="doc02-not-signature">ยังไม่ใช่ลายมือชื่อหรือการรับรองรายงานโดยที่ประชุม</p>';
 }
 markup+='<footer class="doc02-paper-foot">พรีวิวเอกสารเพื่อการตรวจทานเท่านั้น — ไม่ใช่แบบเอกสารทางการที่ออกใช้แล้ว</footer></article>';
 return markup;
}
function selectedStatus(){
 const current=documents[activeType];return current?statusNames[current.document_status]||"ไม่ทราบสถานะ":"ยังไม่มีร่างบันทึก";
}
function renderDialog(){
 const dialog=$("doc02Dialog");if(!dialog||!context)return;
 const type=activeType,latest=documents[type],fields=draftFields(type);
 const readonly=!context.editable||["submitted","reviewed","ratified"].includes(latest?.document_status);
 const actions='<div class="doc02-actions">'+
  '<button type="button" data-doc02-action="preview" class="button outline">อัปเดตพรีวิว A4</button>'+
  (context.editable&&!readonly?'<button type="button" data-doc02-action="save" class="button primary">บันทึกร่างฉบับใหม่</button>':"")+
  (context.editable&&latest?.document_status==="draft"?
   '<button type="button" data-doc02-action="submit" class="button outline">ส่งเอกสารให้ตรวจทาน</button>':"")+
  (context.isAdmin&&latest?.document_status==="submitted"&&latest.recorded_by!==context.user?.id?
   '<label class="doc02-review-note">ความเห็นผู้ตรวจ <textarea id="doc02ReviewNote" rows="2" maxlength="2000"></textarea></label>'+
    '<button type="button" data-doc02-action="review" data-approve="yes" class="button outline">ตรวจทานแล้ว</button>'+
    '<button type="button" data-doc02-action="review" data-approve="no" class="button outline">ส่งกลับแก้ไข</button>':"")+
  '</div>';
 const leg=context.oldMinutes;
 const legacyInfo=type==="minutes"&&leg?
  '<p class="doc02-legacy-status">รายงานเดิมในระบบ: ฉบับที่ '+escapeHtml(leg.version||0)+
  ' · '+escapeHtml(({draft:"ฉบับร่าง",submitted:"รอตรวจทาน",approved:"ผู้บริหารตรวจทานแล้ว"})[leg.status]||leg.status)+
  ' — เป็นคนละชุดกับร่าง DOC-02 และจะไม่ถูกเขียนทับ</p>':"";
 $("doc02Title").textContent=type==="agenda"?"ร่างระเบียบวาระและพรีวิว A4":"ร่างรายงานการประชุมและพรีวิว A4";
 $("doc02Tabs").innerHTML=['agenda','minutes'].map(key=>
   '<button type="button" role="tab" data-doc02-type="'+key+'" aria-selected="'+(key===type)+'" class="button '+
   (key===type?"primary":"outline")+'">'+escapeHtml(documentNames[key])+'</button>').join("");
 $("doc02Status").innerHTML='<span class="status">'+escapeHtml(selectedStatus())+'</span>'+
   '<span class="mini">'+escapeHtml(latest?'รุ่นที่ '+latest.revision:'ยังไม่มีรุ่นที่บันทึก')+'</span>'+
   '<p class="mini">เอกสารนี้แยกจากการรับรองรายงานการประชุมอย่างเป็นทางการ</p>'+legacyInfo;
 $("doc02Editor").innerHTML=readonly?
  '<p class="notice-box">เอกสารรุ่นนี้ล็อกไว้ตามสถานะ หากส่งตรวจแล้วต้องให้ผู้ตรวจส่งกลับก่อนแก้ไข</p>'+
   editorMarkup(type,fields):editorMarkup(type,fields);
 $("doc02Editor").querySelectorAll("input,textarea").forEach(el=>el.disabled=readonly);
 $("doc02Actions").innerHTML=actions;
 $("doc02Preview").innerHTML=previewMarkup(type,fields);
 $("doc02Error").hidden=true;$("doc02Error").textContent="";
 hasUnsaved=false;
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
 const [ag,mi]=await Promise.all([queryLatest("agenda"),queryLatest("minutes")]);
 documents={agenda:ag,minutes:mi};
 renderDialog();
}
async function run(action,button){
 if(busy||!context)return;
 const type=activeType,latest=documents[type],m=context.meeting;
 if(!context.editable&&action!=="preview")return;
 if(action==="preview"){
  $("doc02Preview").innerHTML=previewMarkup(type,captureForm());
  $("doc02Preview").scrollIntoView?.({block:"nearest",behavior:"smooth"});
  return;
 }
 const row={p_meeting_id:m.id,p_doc_type:type,p_expected_revision:latest?.revision||0};
 let method,payload;
 if(action==="save"){
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
 const tab=event.target.closest("[data-doc02-type]");
 if(tab){
  if(tab.dataset.doc02Type===activeType)return;
  if(hasUnsaved&&!global.confirm("มีร่างที่แก้ไขแต่ยังไม่ได้บันทึก ต้องการสลับเอกสารและทิ้งการแก้ไขนี้หรือไม่?"))return;
  activeType=tab.dataset.doc02Type;renderDialog();return;
 }
 const action=event.target.closest("[data-doc02-action]");
 if(action){run(action.dataset.doc02Action,action);return;}
}
function close(){
 if(hasUnsaved&&!global.confirm("มีการแก้ไขพรีวิวที่ยังไม่ได้บันทึก ต้องการปิดหรือไม่?"))return;
 $("doc02Dialog")?.close();context=null;hasUnsaved=false;
}
async function open(options){
 if(!options?.meeting||options.meeting.meeting_mode==="externally_hosted"||
    options.meeting.meeting_mode==="co_hosted")return;
 context=options;activeType=options.type==="minutes"?"minutes":"agenda";hasUnsaved=false;
 const dialog=$("doc02Dialog");if(!dialog)return;
 $("doc02Success").textContent="";
 dialog.showModal();
 $("doc02Title").textContent="กำลังตรวจร่างเอกสาร…";
 try{
  const {data,error}=await options.client.from("meeting_document_settings")
   .select("agenda_template_key").eq("meeting_id",options.meeting.id).maybeSingle();
  if(error)throw error;
  templateKey=data?.agenda_template_key||"legacy5";
  await reloadDocuments();
 }catch(error){
  setError("ไม่สามารถโหลดร่างเอกสาร: "+(error?.message||"โปรดลองใหม่"));
 }
}
function init(){
 const dialog=$("doc02Dialog");if(!dialog)return;
 dialog.addEventListener("click",handleClick);
 $("doc02Close").addEventListener("click",close);
 dialog.addEventListener("cancel",ev=>{ev.preventDefault();close();});
 $("doc02Editor").addEventListener("input",()=>{hasUnsaved=true;$("doc02Success").textContent="";});
}
global.BWDDoc02={
 init,open,
 // Pure formatters exported for deterministic regression tests (no live calls).
 sourceFields,previewMarkup,escapeHtml,titleForSection,
 setTemplateForTest(key){templateKey=key;},
 setContextForTest(value){context=value;documents={agenda:null,minutes:null};activeType="agenda";}
};
})(window);
