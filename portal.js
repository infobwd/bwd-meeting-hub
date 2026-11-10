/* BWD Meeting Hub R2 — requires a provisioned Supabase backend + enforced RLS.
 * This page never connects R1 localStorage data to official records.
 */
(() => {
"use strict";

const cfg=window.BWD_SUPABASE_CONFIG||{};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const names={board:"กรรมการสถานศึกษา",teacher:"ประชุมครู",management:"ฝ่ายบริหาร",working:"คณะทำงาน",community:"ร่วมกับหน่วยงาน",other:"การประชุมอื่น"};
const roles={admin:"ผู้บริหาร",secretary:"เลขานุการ",member:"ครู / ผู้รับมอบหมาย",guest:"ผู้ร่วมประชุมภายนอก"};
const statuses={todo:"ยังไม่เริ่ม",doing:"กำลังดำเนินการ",blocked:"ติดปัญหา",submitted:"ส่งให้ตรวจ",approved:"ตรวจรับแล้ว",cancelled:"ยกเลิก"};
const sections={"1":"ประธานแจ้งให้ทราบ","2":"รับรองรายงานครั้งก่อน","3":"เรื่องสืบเนื่อง","4":"เรื่องเพื่อพิจารณา","5":"เรื่องอื่น ๆ"};
const state={
  client:null,user:null,member:null,profile:null,meetings:[],access:[],agendas:[],decisions:[],
  minutes:[],tasks:[],links:[],updates:[],evidence:[],profiles:[],documents:[],
  page:"overview",activeMeeting:null,meetingListScroll:0,taskFilter:"all",agendaOpen:{},taskDetailsOpen:{},loading:false,loadError:""
};
const modal=$("modal"), actionForm=$("actionForm");
let editMode="", editCtx={},authChangeTimer,toastTimer,modalReturnFocus,formSnapshot="",formSubmitting=false;
let previewObjectUrl=null,previewFile=null,previewReturnFocus=null,previewRequestId=0;
const meetingStates={
  draft:{label:"ฉบับร่าง",tone:"gold"},
  scheduled:{label:"กำหนดการประชุมแล้ว",tone:""},
  held:{label:"ประชุมแล้ว — รอรายงาน",tone:""},
  minutes_review:{label:"รอตรวจทานรายงาน",tone:"purple"},
  reviewed:{label:"ผู้บริหารตรวจทานแล้ว",tone:"green"},
  ratified:{label:"รับรองแล้ว",tone:"green"},
  archived:{label:"จัดเก็บแล้ว",tone:""}
};
function meetingStatusLabel(status){
  const item=meetingStates[status]||{label:"รอตรวจสอบสถานะ",tone:""};
  return '<span class="status '+esc(item.tone)+'">'+esc(item.label)+'</span>';
}
function agendaKey(meetingId,section){return meetingId+":"+section;}
function agendaIsOpen(meetingId,section,first){
  const key=agendaKey(meetingId,section);
  return Object.prototype.hasOwnProperty.call(state.agendaOpen,key)?state.agendaOpen[key]:section===first;
}
function renderAgendaGroup(m,number,items,first,editable){
 const label=sections[number]||"วาระอื่น ๆ";
 const rows=items.map(a=>{
   const d=state.decisions.find(x=>x.agenda_id===a.id);
   return '<article class="agenda-entry"><h3>'+esc(a.title)+'</h3>'+
     (a.notes?'<p class="agenda-notes">'+esc(a.notes)+'</p>':'')+
     (d?'<div class="note"><strong>ข้อสรุป'+(d.status==="ratified"?" (บันทึกว่ารับรองแล้ว)":" (รอรับรอง)")+'</strong><div>'+esc(d.body)+'</div></div>':'')+
     '<div class="actions">'+
       (editable&&m.status!=="ratified"&&m.status!=="minutes_review"?button(d?"แก้ไขข้อสรุป":"บันทึกข้อสรุป","decision",{"agenda-id":a.id}):"")+
       (editable?button("＋ มอบหมายงาน","newTask",{"meeting-id":m.id,"agenda-id":a.id}):"")+
     '</div></article>';
 }).join("");
 return '<details class="agenda-group" data-agenda-group="'+esc(number)+'" data-meeting-id="'+esc(m.id)+'" '+
   (agendaIsOpen(m.id,number,first)?'open':'')+'>'+
   '<summary><span class="agenda-number">วาระที่ '+esc(number)+'</span>'+
   '<span class="agenda-heading">'+esc(label)+'</span>'+
   '<span class="agenda-count">'+items.length+' เรื่อง</span>'+
   '<span class="agenda-chevron" aria-hidden="true">⌄</span></summary>'+
   '<div class="agenda-entries">'+rows+'</div></details>';
}
function statusLabel(s){const tone=s==="approved"?"green":s==="blocked"?"red":s==="submitted"?"purple":s==="doing"?"gold":"";return '<span class="status '+tone+'">'+esc(statuses[s]||s)+'</span>';}
function formatDate(v){if(!v)return "ยังไม่กำหนดวัน";const d=new Date(v+"T12:00:00");return Number.isNaN(d.getTime())?"ยังไม่กำหนดวัน":new Intl.DateTimeFormat("th-TH",{year:"numeric",month:"short",day:"numeric"}).format(d);}
function fullName(id){const p=state.profiles.find(p=>p.id===id);return p?.display_name|| (id===state.user?.id?"บัญชีของฉัน":"บัญชีผู้ใช้");}
function meeting(id){return state.meetings.find(m=>m.id===id);}
function agenda(id){return state.agendas.find(a=>a.id===id);}
function minute(meetingId){return state.minutes.find(m=>m.meeting_id===meetingId);}
function taskLinks(id){return state.links.filter(l=>l.task_id===id);}
function isAdmin(){return state.member?.role==="admin";}
function isEditor(meetingId){return isAdmin()||state.access.some(a=>a.meeting_id===meetingId&&a.user_id===state.user?.id&&a.role==="editor");}
function canReview(taskId){return isAdmin()||taskLinks(taskId).some(l=>isEditor(l.meeting_id));}
function isOwner(t){return t.owner_id===state.user?.id;}
function isStaff(){return ["admin","secretary","member"].includes(state.member?.role);}
function friendlyError(error){
 const raw=String(error?.message||error||"").toLowerCase();
 if(/version conflict|conflict/.test(raw))return "ข้อมูลมีการเปลี่ยนแปลงระหว่างที่เปิดหน้านี้ กรุณาโหลดข้อมูลใหม่ก่อนทำรายการอีกครั้ง";
 if(/access denied|permission|not authorized|forbidden|row.level|jwt|401|403/.test(raw))return "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ โปรดตรวจสอบสิทธิ์กับผู้ดูแล";
 if(/network|fetch|timeout|offline|failed to/.test(raw))return "เชื่อมต่อข้อมูลไม่ได้ โปรดตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง";
 return "ดำเนินการไม่สำเร็จ โปรดลองอีกครั้ง หากยังพบปัญหาให้แจ้งผู้ดูแล";
}
function loadingMarkup(){
 return '<div class="ux04-loading" role="status" aria-live="polite" aria-label="กำลังโหลดข้อมูล">'+
   '<p>กำลังโหลดข้อมูลที่คุณมีสิทธิ์เข้าถึง…</p>'+
   '<div class="ux04-skeleton-grid" aria-hidden="true">'+
     '<div class="ux04-skeleton ux04-skeleton-wide"></div><div class="ux04-skeleton"></div>'+
     '<div class="ux04-skeleton"></div><div class="ux04-skeleton ux04-skeleton-wide"></div>'+
   '</div></div>';
}
function loadErrorMarkup(){
 return '<div class="ux04-load-error" role="alert"><h2>โหลดข้อมูลยังไม่สำเร็จ</h2>'+
   '<p>'+esc(state.loadError||"โปรดตรวจการเชื่อมต่อแล้วลองอีกครั้ง")+'</p>'+
   button("ลองโหลดข้อมูลอีกครั้ง","retryLoad",{},"primary")+'</div>';
}
function statusMessage(message,error=false){
  // Keep the legacy inline status node for source compatibility, but show feedback as a toast.
  const node=$("feedback");node.textContent=message;node.classList.toggle("error",error);node.hidden=true;
  const region=$("toastRegion");
  clearTimeout(toastTimer);
  region.replaceChildren();
  if(!message)return;
  const toast=document.createElement("div");
  toast.className="toast "+(error?"toast-error":"toast-success");
  toast.setAttribute("role",error?"alert":"status");
  const symbol=document.createElement("span");
  symbol.className="toast-symbol";symbol.setAttribute("aria-hidden","true");symbol.textContent=error?"!":"✓";
  const content=document.createElement("span");
  content.className="toast-message";content.textContent=message;
  const dismiss=document.createElement("button");
  dismiss.type="button";dismiss.className="toast-close";dismiss.setAttribute("aria-label","ปิดการแจ้งเตือน");
  dismiss.textContent="×";
  dismiss.addEventListener("click",()=>{clearTimeout(toastTimer);region.replaceChildren();});
  toast.append(symbol,content,dismiss);
  region.append(toast);
  toastTimer=setTimeout(()=>region.replaceChildren(),error?8000:4500);
}
function setVisible(id,visible){$(id).hidden=!visible;}
function setPage(page){
  if(!["overview","meetings","tasks"].includes(page))return;
  state.page=page;state.activeMeeting=null;statusMessage("");
  render();window.scrollTo({top:0,behavior:"auto"});
}
function section(title,inner,action=""){
  return '<section class="panel"><div class="flex-between" style="margin-bottom:13px"><h2>'+esc(title)+'</h2>'+action+'</div>'+inner+'</section>';
}
function empty(message){return '<div class="empty">'+esc(message)+'</div>';}
function button(label,action,ids={},sty="outline"){
  const attrs=Object.entries(ids).map(([k,v])=>' data-'+k+'="'+esc(v)+'"').join("");
  return '<button class="button small '+sty+'" type="button" data-action="'+action+'"'+attrs+'>'+esc(label)+'</button>';
}
function typesOptions(chosen="teacher"){
 return Object.entries(names).map(([key,label])=>'<option value="'+key+'" '+(key===chosen?"selected":"")+'>'+esc(label)+'</option>').join("");
}
function usersOptions(selected="",includeBlank=true){
 const entries=state.profiles.filter(p=>p.id===state.user.id || isStaff()).slice().sort((a,b)=>a.display_name.localeCompare(b.display_name,"th"));
 return (includeBlank?'<option value="">ยังไม่มอบหมาย</option>':'')+
 entries.map(p=>'<option value="'+esc(p.id)+'" '+(selected===p.id?"selected":"")+'>'+esc(p.display_name||p.id)+'</option>').join("");
}
function meetingsOptions(selected="",editorOnly=false){
 return state.meetings.filter(m=>!editorOnly||isEditor(m.id)).map(m=>'<option value="'+esc(m.id)+'" '+(selected===m.id?"selected":"")+'>'+esc(m.title)+'</option>').join("");
}
function field(label,key,content,help=""){
 return '<div class="field"><label for="f_'+key+'">'+esc(label)+'</label>'+content+
  (help?'<div class="mini">'+esc(help)+'</div>':'')+
  '<p class="field-error" id="error_f_'+esc(key)+'" role="alert" hidden></p></div>';
}
function clearFieldErrors(){
 document.querySelectorAll("#modalFields .field-error").forEach(node=>{node.textContent="";node.hidden=true;});
 const summary=$("modalMessage");if(summary){summary.textContent="";summary.hidden=true;}
 document.querySelectorAll("#modalFields [aria-invalid]").forEach(node=>node.removeAttribute("aria-invalid"));
}
function showFormError(message,key=""){
 const summary=$("modalMessage");
 if(summary){summary.hidden=false;summary.textContent=message;}
 if(!key)return;
 const fieldNode=$("f_"+key),errorNode=$("error_f_"+key);
 if(fieldNode){fieldNode.setAttribute("aria-invalid","true");fieldNode.focus({preventScroll:true});fieldNode.scrollIntoView({block:"nearest",behavior:"auto"});}
 if(errorNode){errorNode.textContent=message;errorNode.hidden=false;}
}
function isFormDirty(){
 return modal.open && !formSubmitting && JSON.stringify(Array.from(new FormData(actionForm).entries()))!==formSnapshot;
}
function fitModalViewport(){
 if(!modal.open||!window.visualViewport||!window.matchMedia("(max-width: 900px)").matches)return;
 const view=window.visualViewport;
 const available=Math.max(220,Math.floor(view.height-12));
 const bottom=Math.max(0,Math.round(window.innerHeight-view.height-view.offsetTop));
 modal.style.setProperty("--ux04-sheet-height",available+"px");
 modal.style.setProperty("--ux04-sheet-bottom",bottom+"px");
}
function input(key,type="text",value="",required=false,max=200){
 return '<input id="f_'+key+'" name="'+key+'" type="'+type+'" value="'+esc(value??"")+'" '+(required?"required":"")+' maxlength="'+max+'">';
}
function textarea(key,value="",required=false){
 return '<textarea id="f_'+key+'" name="'+key+'" rows="4" maxlength="8000" '+(required?"required":"")+'>'+esc(value)+'</textarea>';
}
function select(key,html){
 return '<select id="f_'+key+'" name="'+key+'">'+html+'</select>';
}
function readStr(fd,key,max=200){const v=fd.get(key);return typeof v==="string"?v.trim().slice(0,max):"";}
function uuid(){return crypto.randomUUID();}
function parseDriveFileId(value){
  try{
    const u=new URL(String(value||"").trim());
    if(u.protocol!=="https:"||!["drive.google.com","docs.google.com"].includes(u.hostname))return null;
    const seg=u.pathname.split("/").filter(Boolean);
    if(seg.length<3||!["file","document","spreadsheets","presentation"].includes(seg[0])||seg[1]!=="d")return null;
    return /^[A-Za-z0-9_-]{10,128}$/.test(seg[2])?seg[2]:null;
  }catch{return null;}
}
function meetingDocumentMarkup(d){
  if(!/^[A-Za-z0-9_-]{10,128}$/.test(d.drive_file_id||""))return "";
  const labels={agenda_draft:"ร่างระเบียบวาระ",proposed_resolution:"ร่างมติเสนอเพื่อพิจารณา",minutes_draft:"ร่างรายงานการประชุม",other:"เอกสารประกอบ"};
  const href="https://drive.google.com/file/d/"+encodeURIComponent(d.drive_file_id)+"/view";
  return '<div class="item"><h3>'+esc(d.title)+'</h3>'+
    '<p><span class="status gold">'+esc(labels[d.document_type]||"เอกสารประกอบ")+'</span> <span class="mini">ฉบับร่าง — ยังไม่รับรอง</span></p>'+
    '<div class="actions">'+button("อ่าน PDF ในเว็บ","readMeetingPdf",{"document-id":d.id},"primary")+
    '<a class="button small outline" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">เปิดใน Google Drive</a></div></div>';
}
async function closeModal({force=false}={}){
 if(!modal.open)return;
 if(formSubmitting&&!force)return;
 if(!force&&isFormDirty()){
   if(!await confirmAction("มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดโดยไม่บันทึกหรือไม่?"))return;
 }
 modal.close();
}
async function confirmAction(message){
  const dialog=$("confirmDialog");
  $("confirmMessage").textContent=message;
  const returnFocus=document.activeElement;
  dialog.returnValue="cancel";
  dialog.showModal();
  return new Promise(resolve=>{
    dialog.addEventListener("close",()=>{
      if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
      resolve(dialog.returnValue==="confirm");
    },{once:true});
  });
}
function openModal(mode,ctx={}){
 editMode=mode;editCtx=ctx;
 const m=meeting(ctx.meetingId),a=agenda(ctx.agendaId),t=state.tasks.find(x=>x.id===ctx.taskId);
 let label="",body="";
 if(mode==="meeting"){
  label="สร้างการประชุม";
  body=field("หัวข้อการประชุม *","title",input("title","text","",true,180))+
    field("ประเภท","kind",select("kind",typesOptions("teacher")))+
    field("วันที่ประชุม","scheduled_on",input("scheduled_on","date",""))+
    field("สถานที่","location",input("location","text","",false,180));
 }else if(mode==="agenda"&&m){
  label="เพิ่มหัวข้อวาระ";
  body='<p class="muted">'+esc(m.title)+'</p>'+
    field("หมวดวาระ","section",select("section",Object.entries(sections).map(([k,v])=>'<option value="'+k+'">'+esc(k+" • "+v)+'</option>').join("")))+
    field("หัวข้อ *","title",input("title","text","",true,200))+
    field("ข้อมูลประกอบ","notes",textarea("notes"));
 }else if(mode==="decision"&&a){
  label="บันทึกข้อสรุปจากที่ประชุม";
  const d=state.decisions.find(x=>x.agenda_id===a.id);
  body='<p class="muted">'+esc(a.title)+'</p>'+
    '<div class="notice-box">เป็นการบันทึกข้อสรุป ยังไม่ใช่มติที่รับรองแล้ว</div>'+
    field("ข้อสรุป *","body",textarea("body",d?.body||"",true));
 }else if(mode==="minutes"&&m){
  label="บันทึกรายงานการประชุม";
  const min=minute(m.id);
  body='<div class="notice-box">เมื่อบันทึกแล้วสามารถเสนอผู้บริหารเพื่อตรวจทานได้ กรณีกรรมการสถานศึกษาต้องรับรองตามกระบวนการของคณะกรรมการอีกครั้ง</div>'+
    field("รายงานการประชุม *","body",textarea("body",min?.body||"",true))+
    '<input type="hidden" name="version" value="'+esc(min?.version||0)+'">';
 }else if(mode==="minutesReview"&&m){
  label=ctx.approve?"ยืนยันตรวจทานรายงาน":"ส่งรายงานกลับให้แก้ไข";
  body='<p class="muted">'+esc(m.title)+'</p>'+
    field(ctx.approve?"หมายเหตุ (ถ้ามี)":"เหตุผลที่ส่งกลับ *","note",textarea("note","",!ctx.approve));
 }else if(mode==="newTask"){
  label="มอบหมายภารกิจ";
  const chosen=m||state.meetings.find(x=>isEditor(x.id));
  if(!chosen)return statusMessage("ต้องได้รับสิทธิ์แก้ไขการประชุมก่อนเพิ่มงาน",true);
  const options=state.agendas.filter(a=>a.meeting_id===chosen.id);
  body=field("การประชุม","meetingId",select("meetingId",meetingsOptions(chosen.id,true)))+
    field("ชื่องาน *","title",input("title","text","",true,200))+
    field("ผู้รับผิดชอบ","ownerId",select("ownerId",usersOptions()))+
    field("วันครบกำหนด","dueOn",input("dueOn","date",""))+
    field("รายละเอียด","description",textarea("description"))+
    field("วาระต้นทาง","agendaId",select("agendaId",'<option value="">ไม่ระบุวาระ</option>'+options.map(a=>'<option value="'+esc(a.id)+'" '+(ctx.agendaId===a.id?"selected":"")+'>'+esc(a.title)+'</option>').join("")),"เลือกเฉพาะวาระของการประชุมที่ระบุ");
 }else if(mode==="taskState"&&t){
  label="อัปเดตภารกิจ";
  body='<p class="muted">'+esc(t.title)+'</p>'+
    field("สถานะ","status",select("status",["doing","blocked","submitted"].map(k=>'<option value="'+k+'">'+esc(statuses[k])+'</option>').join("")))+
    field("ความคืบหน้าหรือผลการดำเนินงาน *","note",textarea("note","",true));
 }else if(mode==="taskReview"&&t){
  label=ctx.approve?"ตรวจรับงาน":"ส่งงานกลับไปแก้ไข";
  body='<p class="muted">'+esc(t.title)+'</p>'+field(ctx.approve?"ความเห็น":"เหตุผลที่ต้องแก้ไข *","note",textarea("note","",!ctx.approve));
 }else if(mode==="taskOwner"&&t){
  label="เปลี่ยนผู้รับผิดชอบ";
  body='<p class="muted">'+esc(t.title)+'</p>'+
    field("ผู้รับผิดชอบ","ownerId",select("ownerId",usersOptions(t.owner_id||"")));
 }else if(mode==="linkTask"&&t){
  label="ติดตามงานในการประชุมอีกครั้ง";
  const targets=state.meetings.filter(m=>isEditor(m.id)&&!taskLinks(t.id).some(l=>l.meeting_id===m.id));
  if(!targets.length)return statusMessage("ยังไม่มีการประชุมอื่นที่สามารถเชื่อมกับงานนี้ได้",true);
  body='<p class="muted">'+esc(t.title)+'</p>'+
    field("เลือกการประชุม","meetingId",select("meetingId",targets.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>').join("")))+
    '<div class="notice-box">เมื่อเชื่อมแล้ว ผู้เข้าร่วมการประชุมใหม่ที่มีสิทธิ์อ่านงานจะเห็นรายละเอียด ความก้าวหน้า และหลักฐานของงานนี้ด้วย โปรดตรวจความเหมาะสมก่อนดำเนินการ</div>';
 }else if(mode==="taskNote"&&t){
  label="บันทึกความคืบหน้า";
  body='<p class="muted">'+esc(t.title)+'</p>'+field("บันทึก *","note",textarea("note","",true));
 }else if(mode==="access"&&m){
  label="เพิ่มผู้เข้าร่วมการประชุม";
  body='<p class="muted">'+esc(m.title)+'</p>'+
    '<div class="notice-box">บัญชีต้องได้รับการสร้างในระบบของโรงเรียนก่อน การเพิ่มชื่อที่นี่ไม่ใช่การส่งคำเชิญทางอีเมล</div>'+
    field("รหัสบัญชีผู้ใช้ (UUID) *","userId",input("userId","text","",true,36))+
    field("สิทธิ์ในการประชุม","role",select("role",'<option value="attendee">ผู้เข้าประชุม</option><option value="editor">เลขานุการ / ผู้จัดการวาระ</option><option value="guest">ผู้เข้าร่วมภายนอก</option>'));
 }else if(mode==="driveDoc"&&m){
  label="แนบเอกสารจาก Google Drive";
  body='<p class="muted">'+esc(m.title)+'</p>'+
    '<div class="notice-box">เอกสารจะแสดงเป็นฉบับร่าง ไม่ใช่มติที่รับรองแล้ว ผู้เปิดต้องได้รับสิทธิ์ใน Google Drive ด้วย</div>'+
    field("ชื่อเอกสาร *","title",input("title","text","",true,200))+
    field("ประเภทเอกสาร","documentType",select("documentType",'<option value="proposed_resolution">ร่างมติเสนอเพื่อพิจารณา</option><option value="agenda_draft">ร่างระเบียบวาระ</option><option value="minutes_draft">ร่างรายงานการประชุม</option><option value="other">เอกสารประกอบอื่น ๆ</option>'))+
    field("ลิงก์ Google Drive *","driveUrl",input("driveUrl","url","",true,900));
 }else if(mode==="profile"){
  label="ชื่อที่แสดงของฉัน";
  body=field("ชื่อแสดง *","displayName",input("displayName","text",state.profile?.display_name||"",true,160));
 }else{return;}
 $("modalTitle").textContent=label;$("modalFields").innerHTML=body;
 clearFieldErrors();
 formSubmitting=false;
 formSnapshot=JSON.stringify(Array.from(new FormData(actionForm).entries()));
 $("submitModal").disabled=false;$("submitModal").textContent="บันทึก";
 modalReturnFocus=document.activeElement;
 modal.showModal();
 fitModalViewport();
 if(window.matchMedia("(min-width: 901px)").matches)modal.querySelector("input,select,textarea")?.focus();
 else $("modalTitle").focus({preventScroll:true});
}
async function rpc(method,args){
 const {data,error}=await state.client.rpc(method,args);
 if(error)throw error;
 return data;
}
async function reload(){
 state.loading=true;state.loadError="";
 render();
 try{
  const client=state.client;
  const queries=[
   client.from("meetings").select("*").order("created_at",{ascending:false}),
   client.from("meeting_access").select("*"),
   client.from("agendas").select("*").order("section").order("position"),
   client.from("decisions").select("*"),
   client.from("minutes").select("*"),
   client.from("tasks").select("*").order("updated_at",{ascending:false}),
   client.from("task_meeting_links").select("*"),
   client.from("profiles").select("id,display_name"),
   client.from("task_updates").select("*").order("created_at",{ascending:false}).limit(200),
   client.from("task_evidence").select("*").order("created_at",{ascending:false}),
   client.from("meeting_documents").select("*").order("added_at",{ascending:false})
  ];
  const results=await Promise.all(queries);
  const error=results.find(x=>x.error)?.error;
  if(error)throw error;
  [state.meetings,state.access,state.agendas,state.decisions,state.minutes,
   state.tasks,state.links,state.profiles,state.updates,state.evidence,state.documents]=results.map(x=>x.data||[]);
  if(state.activeMeeting&&!meeting(state.activeMeeting))state.activeMeeting=null;
  return true;
 }catch(error){
  state.loadError=friendlyError(error);
  return false;
 }finally{
  state.loading=false;
  render();
 }
}
async function bootstrap(){
 if(!state.client)return;
 try{
  const {data:{user},error}=await state.client.auth.getUser();
  if(error&&error.message!=="Auth session missing!")throw error;
  state.user=user||null;
  if(!user){
   window.BWDMeetingPdfReader?.close?.();
   state.member=null;state.activeMeeting=null;state.agendaOpen={};state.taskDetailsOpen={};setVisible("loginSection",true);
   setVisible("workspace",false);setVisible("blocked",false);$("logout").hidden=true;$("accountName").textContent="";return;
  }
  $("logout").hidden=false;$("accountName").textContent=user.email||"บัญชีผู้ใช้";
  const {data:membership,error:membershipError}=await state.client.from("workspace_members").select("role,active").eq("user_id",user.id).maybeSingle();
  if(membershipError)throw membershipError;
  if(!membership?.active){
    state.member=null;setVisible("workspace",false);setVisible("blocked",true);setVisible("loginSection",false);return;
  }
  state.member=membership;
  const {data:profile}=await state.client.from("profiles").select("id,display_name").eq("id",user.id).maybeSingle();
  state.profile=profile||null;
  $("roleLabel").textContent=roles[membership.role]||membership.role;
  setVisible("workspace",true);setVisible("loginSection",false);setVisible("blocked",false);
  await reload();
 }catch(err){
  state.user=null;state.member=null;
  setVisible("workspace",false);setVisible("blocked",false);setVisible("loginSection",true);
  $("loginMessage").textContent="ไม่สามารถโหลดข้อมูล: "+(err.message||"เกิดข้อผิดพลาด");
 }
}
function meetingCard(m){
 const agendaCount=state.agendas.filter(a=>a.meeting_id===m.id).length;
 const taskCount=state.links.filter(l=>l.meeting_id===m.id).length;
 const docCount=state.documents.filter(d=>d.meeting_id===m.id).length;
 return '<article class="card meeting-card">'+
   '<div class="meeting-card-head"><span class="meeting-type">'+esc(names[m.kind]||"การประชุม")+'</span>'+meetingStatusLabel(m.status)+'</div>'+
   '<h3>'+esc(m.title)+'</h3>'+
   '<p class="meeting-date">'+esc(formatDate(m.scheduled_on))+(m.location?' · '+esc(m.location):'')+'</p>'+
   '<p class="meeting-counts">'+agendaCount+' วาระย่อย · '+docCount+' เอกสาร · '+taskCount+' ภารกิจ</p>'+
   '<div class="actions">'+button("เปิดรายละเอียด","openMeeting",{"meeting-id":m.id},"primary")+'</div></article>';
}
function taskCard(t,full=false){
 const links=taskLinks(t.id);
 const origin=[...new Set(links.map(l=>meeting(l.meeting_id)?.title).filter(Boolean))].join(" • ");
 const mine=isOwner(t),reviewer=canReview(t.id);
 const updates=state.updates.filter(u=>u.task_id===t.id);
 const upd=updates.slice(0,full?10:2);
 const attachments=state.evidence.filter(e=>e.task_id===t.id);
 const canUpdate=(mine||reviewer)&&!["approved","cancelled","submitted"].includes(t.status);
 const canApprove=reviewer&&!mine&&t.status==="submitted";
 const canUpload=mine||reviewer;
 const primary=canApprove?button("ตรวจรับ","taskApprove",{"task-id":t.id},"primary"):
   canUpdate?button("อัปเดตงาน","taskState",{"task-id":t.id},"primary"):"";
 const moreActions=
   (canApprove?button("ส่งกลับให้แก้ไข","taskReject",{"task-id":t.id},"danger"):"")+
   (reviewer&&!["approved","cancelled"].includes(t.status)?button("เปลี่ยนผู้รับผิดชอบ","taskOwner",{"task-id":t.id}):"")+
   (canUpload?button("เพิ่มบันทึก","taskNote",{"task-id":t.id}):"")+
   (reviewer?button("ติดตามในการประชุมอื่น","linkTask",{"task-id":t.id}):"");
 const fileInputId="evidence-"+t.id;
 const evidenceInput=canUpload?
   '<div class="field task-evidence-upload"><label for="'+esc(fileInputId)+'">แนบหลักฐาน (PDF/รูปภาพ สูงสุด 10 MB)</label>'+
   '<input id="'+esc(fileInputId)+'" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" data-evidence-upload="'+esc(t.id)+'"></div>':"";
 const evidenceList=attachments.length?
   '<div class="task-evidence-list"><h4>ไฟล์หลักฐาน ('+attachments.length+')</h4>'+
   attachments.map(e=>'<div class="evidence-file"><div class="evidence-file-name">'+esc(e.original_name||"ไฟล์หลักฐาน")+'</div>'+
     '<div class="actions">'+button("ดูตัวอย่าง","previewEvidence",{"object-path":e.object_path},"primary")+
       button("ดาวน์โหลด","downloadEvidence",{"object-path":e.object_path})+'</div></div>').join("")+'</div>':"";
 const history=upd.length?
   '<div class="task-history"><h4>ประวัติงาน</h4>'+
   upd.map(u=>'<div class="feed">'+esc(formatDate((u.created_at||"").slice(0,10)))+' • '+esc(fullName(u.author_id))+
     ' • '+esc(statuses[u.new_status]||u.new_status)+(u.note?'<p>'+esc(u.note)+'</p>':'')+'</div>').join("")+
   (updates.length>upd.length?'<p class="mini">ยังมีประวัติก่อนหน้านี้อีก '+(updates.length-upd.length)+' รายการ</p>':"")+'</div>':"";
 const countLabel=attachments.length+" ไฟล์ · "+updates.length+" บันทึก";
 return '<article class="card task-card" data-task-card="'+esc(t.id)+'">'+
   '<div class="task-card-head"><h3>'+esc(t.title)+'</h3>'+statusLabel(t.status)+'</div>'+
   '<div class="task-meta"><p><span>ผู้รับผิดชอบ</span><strong>'+esc(t.owner_id?fullName(t.owner_id):"ยังไม่มอบหมาย")+'</strong></p>'+
   '<p><span>กำหนดส่ง</span><strong>'+esc(formatDate(t.due_on))+'</strong></p></div>'+
   (origin?'<p class="task-origin">จากการประชุม: '+esc(origin)+'</p>':"")+
   (primary?'<div class="task-primary">'+primary+'</div>':"")+
   '<details class="task-details" data-task-details="'+esc(t.id)+'" '+(state.taskDetailsOpen[t.id]?'open':"")+'>'+
     '<summary><span>รายละเอียดและหลักฐาน</span><span class="task-detail-count">'+countLabel+'</span>'+
       '<span class="task-detail-chevron" aria-hidden="true">⌄</span></summary>'+
     '<div class="task-detail-body">'+
       (t.description?'<div class="task-description"><h4>รายละเอียดงาน</h4><p>'+esc(t.description)+'</p></div>':"")+
       (moreActions?'<div class="actions task-more-actions">'+moreActions+'</div>':"")+
       evidenceInput+evidenceList+history+
       (!t.description&&!moreActions&&!evidenceInput&&!evidenceList&&!history?'<p class="mini">ยังไม่มีรายละเอียดเพิ่มเติม</p>':"")+
     '</div></details>'+
   '</article>';
}
function renderOverview(){
 const mine=state.tasks.filter(isOwner),review=state.tasks.filter(t=>t.status==="submitted"&&canReview(t.id));
 return '<div class="row-grid">'+
  '<div class="metric"><strong>'+state.meetings.length+'</strong><small>การประชุมที่เข้าถึงได้</small></div>'+
  '<div class="metric"><strong>'+mine.length+'</strong><small>งานที่รับผิดชอบ</small></div>'+
  '<div class="metric"><strong>'+review.length+'</strong><small>งานที่รอตรวจรับ</small></div></div>'+
  section("การประชุมล่าสุด",state.meetings.length?'<div class="cards">'+state.meetings.slice(0,4).map(meetingCard).join("")+'</div>':empty("ไม่มีการประชุมที่ได้รับสิทธิ์"),
    button("ดูการประชุมทั้งหมด","goMeetings"))+
  section("งานที่เกี่ยวข้อง",mine.length?'<div class="cards">'+mine.slice(0,4).map(t=>taskCard(t)).join("")+'</div>':empty("ยังไม่มีงานที่มอบหมายให้บัญชีนี้"),
    button("ดูภารกิจ","goTasks"))+
  '<div class="notice-box">R2 ยังไม่ส่งการแจ้งเตือนอัตโนมัติ งานที่ส่งตรวจจะปรากฏในหน้ารายการสำหรับผู้มีสิทธิ์ตรวจรับ</div>'+
  '<div class="actions">'+button("แก้ไขชื่อที่แสดง","profile")+'</div>';
}
function renderMeetings(){
 if(state.activeMeeting){
  const m=meeting(state.activeMeeting);
  if(m)return renderMeeting(m);
  state.activeMeeting=null;
 }
 const create=isAdmin()||state.member?.role==="secretary";
 const sorted=state.meetings.slice().sort((a,b)=>(b.scheduled_on||"").localeCompare(a.scheduled_on||"")||(b.created_at||"").localeCompare(a.created_at||""));
 return '<div class="flex-between meeting-list-head"><h2>รายการประชุมที่เข้าถึงได้</h2>'+
  (create?button("＋ สร้างการประชุม","newMeeting",{},"primary"):"")+'</div>'+
  (sorted.length?'<div class="cards meeting-cards">'+sorted.map(meetingCard).join("")+'</div>':empty("ยังไม่มีรายการประชุมที่บัญชีนี้เข้าถึงได้"));
}
function renderMeeting(m){
 const editable=isEditor(m.id),min=minute(m.id);
 const ag=state.agendas.filter(a=>a.meeting_id===m.id).slice().sort((a,b)=>Number(a.section)-Number(b.section)||Number(a.position||0)-Number(b.position||0)||(a.title||"").localeCompare(b.title||"","th"));
 const linked=state.links.filter(l=>l.meeting_id===m.id);
 const attendees=state.access.filter(a=>a.meeting_id===m.id);
 const docs=state.documents.filter(d=>d.meeting_id===m.id);
 const numbers=[...new Set(ag.map(a=>String(a.section)))].sort((a,b)=>Number(a)-Number(b));
 const agendas=ag.length?'<div class="agenda-groups">'+
   numbers.map(n=>renderAgendaGroup(m,n,ag.filter(a=>String(a.section)===n),numbers[0],editable)).join("")+
   '</div>':empty("ยังไม่มีหัวข้อวาระ");
 const agendaControls=ag.length?'<div class="agenda-controls">'+
   button("เปิดทุกหมวด","expandAgendas",{"meeting-id":m.id})+
   button("ย่อทุกหมวด","collapseAgendas",{"meeting-id":m.id})+'</div>':'';
 const jump='<nav class="meeting-jump" aria-label="ไปยังส่วนต่าง ๆ ของการประชุม">'+
   '<a href="#bwd-agenda">วาระ ('+ag.length+')</a>'+
   '<a href="#bwd-documents">เอกสาร ('+docs.length+')</a>'+
   '<a href="#bwd-minutes">รายงาน</a>'+
   '<a href="#bwd-tasks">ภารกิจ ('+linked.length+')</a>'+
   '<a href="#bwd-participants">ผู้เข้าร่วม</a></nav>';
 return '<div class="meeting-detail">'+
   '<div class="meeting-back">'+button("← กลับรายการประชุม","backMeetings")+'</div>'+
   '<header class="meeting-detail-head"><div><p class="eyebrow">'+esc(names[m.kind]||"การประชุม")+'</p>'+
   '<h2>'+esc(m.title)+'</h2>'+
   '<p class="meeting-date">'+esc(formatDate(m.scheduled_on))+' · '+esc(m.location||"ยังไม่กำหนดสถานที่")+'</p></div>'+
   '<div class="meeting-badges">'+meetingStatusLabel(m.status)+'<span class="role-pill">'+(editable?"แก้ไขได้":"อ่านอย่างเดียว")+'</span></div></header>'+
   jump+
   '<div id="bwd-agenda" class="meeting-target">'+
   section("ระเบียบวาระ",agendaControls+agendas,
     editable&&m.status!=="ratified"?button("＋ เพิ่มวาระ","newAgenda",{"meeting-id":m.id},"primary"):"")+'</div>'+
   '<div id="bwd-documents" class="meeting-target">'+
   section("เอกสารประกอบการประชุม",docs.length?docs.map(meetingDocumentMarkup).join(""):empty("ยังไม่มีเอกสารประกอบ"),
    editable&&m.status!=="archived"&&m.status!=="ratified"?button("＋ แนบลิงก์ Google Drive","attachDriveDoc",{"meeting-id":m.id},"primary"):"")+'</div>'+
  '<div id="bwd-minutes" class="meeting-target">'+section("รายงานการประชุม",'<div class="flex-between"><span class="status">'+esc(min?.status==="approved"?"ตรวจทานแล้ว":min?.status==="submitted"?"รอตรวจทาน":"ฉบับร่าง")+'</span>'+
    (min?.version?'<span class="mini">ฉบับแก้ไข '+min.version+'</span>':'')+'</div>'+
    (min?.body?'<p class="note">'+esc(min.body)+'</p>':empty("ยังไม่มีรายงานการประชุม"))+
    '<div class="notice-box">การอนุมัติในระบบเป็นการตรวจทานของผู้บริหาร ไม่แทนการรับรองรายงานตามระเบียบของคณะกรรมการสถานศึกษา</div>'+
    '<div class="actions">'+
    (editable&&(!min||min.status==="draft")?button("เขียน / แก้ไขรายงาน","minutes",{"meeting-id":m.id}):"")+
    (editable&&min?.status==="draft"&&min.body?button("ส่งให้ตรวจทาน","submitMinutes",{"meeting-id":m.id},"primary"):"")+
    (isAdmin()&&min?.status==="submitted"&&min.updated_by!==state.user?.id?button("ยืนยันตรวจทาน","approveMinutes",{"meeting-id":m.id},"primary")+button("ส่งกลับให้แก้ไข","rejectMinutes",{"meeting-id":m.id},"danger"):"")+
    (min?.status==="approved"?button("พิมพ์ / บันทึกเป็น PDF","printMinutes",{"meeting-id":m.id}):"")+'</div>')+
  '</div><div id="bwd-tasks" class="meeting-target">'+section("งานที่เชื่อมกับการประชุม",linked.length?'<div class="cards">'+[...new Map(linked.map(l=>state.tasks.find(t=>t.id===l.task_id)).filter(Boolean).map(t=>[t.id,t])).values()].map(t=>taskCard(t)).join("")+'</div>':empty("ยังไม่มีภารกิจที่เชื่อมกับการประชุม"),
    editable?button("＋ เพิ่มงาน","newTask",{"meeting-id":m.id},"primary"):"")+
  '</div><div id="bwd-participants" class="meeting-target">'+section("ผู้มีสิทธิ์เข้าถึง",attendees.length?attendees.map(a=>'<div class="item">'+esc(fullName(a.user_id))+' <span class="status">'+esc(a.role==="editor"?"ผู้จัดการ":a.role==="guest"?"ผู้เข้าร่วมภายนอก":"ผู้เข้าประชุม")+'</span></div>').join(""):empty("ไม่มีผู้เข้าร่วมในรายชื่อ"),
    editable?button("เพิ่มผู้เข้าร่วม","addAccess",{"meeting-id":m.id}):"")+'</div></div>';
}

function renderTasks(){
 const filtered=state.tasks.filter(t=>state.taskFilter==="all"||state.taskFilter==="mine"&&isOwner(t)||state.taskFilter==="review"&&t.status==="submitted"&&canReview(t.id));
 return '<div class="flex-between task-list-head"><h2>ภารกิจที่เกี่ยวข้อง</h2>'+
  '<select class="filter" id="taskFilter" aria-label="กรองภารกิจ"><option value="all">งานที่มองเห็นทั้งหมด</option><option value="mine" '+(state.taskFilter==="mine"?"selected":"")+'>งานของฉัน</option><option value="review" '+(state.taskFilter==="review"?"selected":"")+'>งานรอให้ฉันตรวจรับ</option></select></div>'+
  (filtered.length?'<div class="cards task-cards">'+filtered.map(t=>taskCard(t,true)).join("")+'</div>':empty("ไม่พบงานในหมวดนี้"));
}
function render(){
 const pageTitle=state.page==="overview"?"ภาพรวม":state.page==="meetings"?(state.activeMeeting?"รายละเอียดการประชุม":"การประชุม"):"ภารกิจ";
 const title=$("workspaceTitle");
 if(title&&title.textContent!==pageTitle)title.textContent=pageTitle;
 document.querySelectorAll("[data-page]").forEach(n=>{n.classList.toggle("current",n.dataset.page===state.page);if(n.dataset.page===state.page)n.setAttribute("aria-current","page");else n.removeAttribute("aria-current");});
 $("portalBody").innerHTML=state.loading?loadingMarkup():state.loadError?loadErrorMarkup():
  state.page==="overview"?renderOverview():state.page==="meetings"?renderMeetings():renderTasks();
}
async function runMutation(method,args,success="บันทึกเรียบร้อย"){
 try{
  statusMessage("");
  await rpc(method,args);
 }catch(error){
  const message=friendlyError(error);
  if(modal.open)showFormError(message);
  statusMessage(message,true);
  return false;
 }
 await closeModal({force:true});
 const updated=await reload();
 statusMessage(updated?success:"บันทึกข้อมูลแล้ว แต่ยังแสดงรายการล่าสุดไม่ได้ กรุณากดลองโหลดข้อมูลอีกครั้ง",!updated);
 return true;
}
async function submitForm(ev){
 ev.preventDefault();
 if(formSubmitting||!actionForm.reportValidity())return;
 formSubmitting=true;
 clearFieldErrors();
 const fd=new FormData(actionForm);const g=(key,max=200)=>readStr(fd,key,max);
 const mid=editCtx.meetingId,tid=editCtx.taskId;
 const t=state.tasks.find(t=>t.id===tid);
 const mode=editMode;
 $("submitModal").disabled=true;
 $("submitModal").textContent="กำลังบันทึก…";
 let method=null,args=null,msg="บันทึกเรียบร้อย";
 try{
 switch(mode){
  case "meeting":method="r2_create_meeting";args={p_title:g("title",180),p_kind:g("kind",20),p_scheduled_on:g("scheduled_on",10)||null,p_location:g("location",180)};msg="สร้างการประชุมแล้ว";break;
  case "agenda":method="r2_add_agenda";args={p_meeting_id:mid,p_section:Number(g("section")),p_title:g("title",200),p_notes:g("notes",8000)};break;
  case "decision":method="r2_record_decision";args={p_agenda_id:editCtx.agendaId,p_body:g("body",8000)};msg="บันทึกข้อสรุปไว้เพื่อรอรับรอง";break;
  case "minutes":method="r2_save_minutes";args={p_meeting_id:mid,p_body:g("body",8000),p_expected_version:Number(g("version"))};msg="บันทึกรายงานฉบับร่างแล้ว";break;
  case "minutesReview":method="r2_review_minutes";args={p_meeting_id:mid,p_approve:editCtx.approve,p_note:g("note",2000)};break;
  case "newTask":method="r2_create_task";args={p_meeting_id:g("meetingId",36),p_title:g("title",200),p_owner_id:g("ownerId",36)||null,p_due_on:g("dueOn",10)||null,p_description:g("description",8000),p_agenda_id:g("agendaId",36)||null};
    if(args.p_agenda_id&&agenda(args.p_agenda_id)?.meeting_id!==args.p_meeting_id){
      showFormError("วาระต้องอยู่ในการประชุมที่เลือก","agendaId");return;
    }break;
  case "taskState":method="r2_change_task";args={p_task_id:tid,p_new_status:g("status"),p_note:g("note",4000),p_expected_version:t.version};break;
  case "taskReview":method="r2_review_task";args={p_task_id:tid,p_approve:editCtx.approve,p_note:g("note",4000),p_expected_version:t.version};break;
  case "taskOwner":method="r2_set_task_owner";args={p_task_id:tid,p_owner_id:g("ownerId",36)||null,p_expected_version:t.version};break;
  case "taskNote":method="r2_add_task_note";args={p_task_id:tid,p_note:g("note",4000)};break;
  case "linkTask":method="r2_link_task";args={p_task_id:tid,p_meeting_id:g("meetingId",36),p_agenda_id:null};msg="เชื่อมงานเดิมกับการประชุมใหม่แล้ว";break;
  case "access":method="r2_add_access";args={p_meeting_id:mid,p_user_id:g("userId",36),p_role:g("role",20)};break;
  case "driveDoc":{
    const fileId=parseDriveFileId(g("driveUrl",900));
    if(!fileId){showFormError("โปรดใส่ลิงก์ไฟล์ Google Drive ที่ถูกต้อง ไม่ใช่ลิงก์โฟลเดอร์","driveUrl");return;}
    method="r2_attach_drive_document";
    args={p_meeting_id:mid,p_drive_file_id:fileId,p_title:g("title",200),p_document_type:g("documentType",40)};
    msg="ผูกเอกสารเข้ากับการประชุมแล้ว";
    break;
  }
  case "profile":method="r2_save_profile";args={p_display_name:g("displayName",160)};break;
  default:return;
 }
 if(!method)return;
 await runMutation(method,args,msg);
 }catch(error){
  showFormError(friendlyError(error));
 }finally{
  formSubmitting=false;
  $("submitModal").disabled=false;
  $("submitModal").textContent="บันทึก";
 }
}
async function uploadEvidence(file,taskId,input){
 const types={"application/pdf":"pdf","image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
 if(!file||!types[file.type]||file.size>10485760){statusMessage("ใช้ไฟล์ PDF, JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB",true);input.value="";return;}
 const path=taskId+"/"+uuid()+"."+types[file.type];
 input.disabled=true;
 try{
  const {error:uploadError}=await state.client.storage.from("meeting-evidence").upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  await rpc("r2_register_evidence",{p_task_id:taskId,p_object_path:path,p_original_name:file.name.slice(0,200)});
  const refreshed=await reload();
  statusMessage(refreshed?"แนบหลักฐานในพื้นที่ส่วนตัวแล้ว":"แนบหลักฐานสำเร็จแล้ว แต่ยังโหลดรายการล่าสุดไม่ได้ กรุณาลองโหลดข้อมูลอีกครั้ง",!refreshed);
 }catch(e){statusMessage("แนบหลักฐานไม่สำเร็จ: "+(e.message||"ลองใหม่"),true);}
 finally{input.disabled=false;input.value="";}
}
function fileKind(path){
 const ext=String(path||"").split(".").pop()?.toLowerCase();
 return ({pdf:"application/pdf",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"})[ext]||null;
}
function authorizedEvidence(path){
 return state.evidence.find(e=>e.object_path===path);
}
function downloadBlob(blob,filename){
 const url=URL.createObjectURL(blob);
 const link=document.createElement("a");
 link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function downloadEvidence(path){
 const entry=authorizedEvidence(path);
 if(!entry)return statusMessage("ไม่พบไฟล์ที่บัญชีนี้มีสิทธิ์เปิด",true);
 try{
  const blob=(previewFile?.path===path?previewFile.blob:null)||
    await (async()=>{
      const {data,error}=await state.client.storage.from("meeting-evidence").download(path);
      if(error)throw error;
      return data;
    })();
  downloadBlob(blob,entry.original_name||path.split("/").pop()||"evidence");
 }catch(e){statusMessage("ดาวน์โหลดไม่สำเร็จ: "+(e.message||"ไม่มีสิทธิ์"),true);}
}
function clearEvidencePreview(){
 previewRequestId++;
 if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null;}
 previewFile=null;
 $("previewDownload").disabled=true;
 $("evidencePreviewBody").replaceChildren();
 if(previewReturnFocus?.isConnected)previewReturnFocus.focus({preventScroll:true});
 previewReturnFocus=null;
}
async function previewEvidence(path){
 const entry=authorizedEvidence(path),mime=fileKind(path);
 if(!entry||!mime)return statusMessage("ไฟล์นี้ไม่รองรับการดูตัวอย่างหรือคุณไม่มีสิทธิ์เข้าถึง",true);
 const dialog=$("evidencePreview");
 const viewer=$("evidencePreviewBody");
 if(dialog.open)dialog.close();
 const requestId=++previewRequestId;
 previewReturnFocus=document.activeElement;
 $("evidencePreviewTitle").textContent=entry.original_name||"ไฟล์หลักฐาน";
 $("previewDownload").disabled=true;
 viewer.replaceChildren();
 const loading=document.createElement("p");
 loading.className="preview-message";loading.textContent="กำลังเปิดไฟล์จากพื้นที่ส่วนตัว…";
 viewer.append(loading);
 dialog.showModal();
 $("closeEvidencePreview").focus({preventScroll:true});
 try{
  // Storage's private download policy remains the authorization boundary.
  const {data,error}=await state.client.storage.from("meeting-evidence").download(path);
  if(error)throw error;
  if(requestId!==previewRequestId||!dialog.open)return;
  const typedBlob=new Blob([data],{type:mime});
  previewFile={path,blob:typedBlob};
  previewObjectUrl=URL.createObjectURL(typedBlob);
  viewer.replaceChildren();
  if(mime==="application/pdf"){
   const frame=document.createElement("iframe");
   frame.className="preview-pdf";
   frame.title="ตัวอย่าง PDF: "+(entry.original_name||"ไฟล์หลักฐาน");
   frame.src=previewObjectUrl;
   viewer.append(frame);
   const help=document.createElement("p");
   help.className="preview-help";
   help.textContent="หากอุปกรณ์ไม่แสดง PDF ในหน้าต่างนี้ ให้เลือกดาวน์โหลดเพื่อเปิดอ่าน";
   viewer.append(help);
  }else{
   const img=document.createElement("img");
   img.className="preview-image";
   img.alt="ภาพหลักฐาน: "+(entry.original_name||"ไฟล์แนบ");
   img.src=previewObjectUrl;
   viewer.append(img);
  }
  $("previewDownload").disabled=false;
 }catch(e){
  if(requestId!==previewRequestId||!dialog.open)return;
  viewer.textContent="ไม่สามารถเปิดตัวอย่างได้ โปรดตรวจสิทธิ์หรือทดลองอีกครั้ง";
  statusMessage("เปิดตัวอย่างไม่สำเร็จ: "+(e.message||"ไม่สามารถอ่านไฟล์"),true);
 }
}
function printMinutes(mid){
 const m=meeting(mid),min=minute(mid);
 if(!m||min?.status!=="approved")return statusMessage("ยังไม่มีรายงานที่ผ่านการตรวจทาน",true);
 const text='<html lang="th"><head><meta charset="utf-8"><title>รายงานการประชุม</title><style>body{font-family:Tahoma,sans-serif;padding:36px;line-height:1.8}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><h1>'+esc(m.title)+'</h1><p>'+esc(formatDate(m.scheduled_on))+' • '+esc(m.location||"")+'</p><p>ฉบับตรวจทานโดยผู้บริหาร — โปรดตรวจขั้นตอนรับรองตามประเภทการประชุม</p><pre>'+esc(min.body)+'</pre></body></html>';
 const w=window.open("","_blank");
 if(!w)return statusMessage("เบราว์เซอร์ป้องกันหน้าต่างสำหรับพิมพ์ กรุณาอนุญาต popup",true);
 w.document.write(text);w.document.close();w.focus();w.print();
}
async function actionClick(ev){
 const tab=ev.target.closest("[data-page]");if(tab){setPage(tab.dataset.page);return;}
 const b=ev.target.closest("[data-action]");if(!b)return;
 const act=b.dataset.action,mid=b.dataset.meetingId,tid=b.dataset.taskId,aid=b.dataset.agendaId;
 switch(act){
  case "retryLoad":await reload();break;
  case "goMeetings":setPage("meetings");break;
  case "goTasks":setPage("tasks");break;
  case "openMeeting":state.meetingListScroll=window.scrollY;state.page="meetings";state.activeMeeting=mid;render();window.scrollTo(0,0);break;
  case "backMeetings":state.activeMeeting=null;render();window.scrollTo(0,state.meetingListScroll||0);break;
  case "expandAgendas":
  case "collapseAgendas":{
    if(state.activeMeeting!==mid)return;
    const expanded=act==="expandAgendas";
    document.querySelectorAll("details[data-agenda-group]").forEach(detail=>{
      if(detail.dataset.meetingId!==mid)return;
      state.agendaOpen[agendaKey(mid,detail.dataset.agendaGroup)]=expanded;
      detail.open=expanded;
    });
    break;
  }
  case "newMeeting":openModal("meeting");break;
  case "newAgenda":openModal("agenda",{meetingId:mid});break;
  case "decision":openModal("decision",{agendaId:aid});break;
  case "minutes":openModal("minutes",{meetingId:mid});break;
  case "newTask":openModal("newTask",{meetingId:mid,agendaId:aid});break;
  case "taskState":openModal("taskState",{taskId:tid});break;
  case "taskApprove":openModal("taskReview",{taskId:tid,approve:true});break;
  case "taskReject":openModal("taskReview",{taskId:tid,approve:false});break;
  case "taskOwner":openModal("taskOwner",{taskId:tid});break;
  case "linkTask":openModal("linkTask",{taskId:tid});break;
  case "taskNote":openModal("taskNote",{taskId:tid});break;
  case "addAccess":openModal("access",{meetingId:mid});break;
  case "approveMinutes":openModal("minutesReview",{meetingId:mid,approve:true});break;
  case "rejectMinutes":openModal("minutesReview",{meetingId:mid,approve:false});break;
  case "profile":openModal("profile");break;
  case "attachDriveDoc":openModal("driveDoc",{meetingId:mid});break;
  case "readMeetingPdf":{
    const d=state.documents.find(x=>x.id===b.dataset.documentId && state.meetings.some(m=>m.id===x.meeting_id));
    if(!d)return statusMessage("ไม่พบเอกสารที่คุณมีสิทธิ์เปิดอ่าน",true);
    if(!window.BWDMeetingPdfReader)return statusMessage("ตัวอ่าน PDF ยังโหลดไม่สำเร็จ โปรดลองรีเฟรชเว็บ",true);
    window.BWDMeetingPdfReader.open({
      driveFileId:d.drive_file_id,title:d.title,documentType:d.document_type,
      loadPdf:async(signal)=>{
        const {data,error}=await state.client.auth.getSession();
        const token=data?.session?.access_token;
        if(error||!token)throw Error("Authentication required");
        const endpoint=(cfg.url.endsWith("/")?cfg.url.slice(0,-1):cfg.url)+"/functions/v1/meeting-pdf?document_id="+encodeURIComponent(d.id);
        const resp=await fetch(endpoint,{
          method:"GET",
          headers:{Authorization:"Bearer "+token,apikey:cfg.publishableKey,Accept:"application/pdf"},
          cache:"no-store",signal
        });
        if(!resp.ok)throw Error("PDF reader unavailable");
        const size=Number(resp.headers.get("content-length")||0);
        if(size>40*1024*1024)throw Error("PDF too large");
        const bytes=await resp.arrayBuffer();
        if(bytes.byteLength>40*1024*1024)throw Error("PDF too large");
        return bytes;
      }
    });
    break;
  }
  case "printMinutes":printMinutes(mid);break;
  case "previewEvidence":await previewEvidence(b.dataset.objectPath);break;
  case "downloadEvidence":await downloadEvidence(b.dataset.objectPath);break;
  case "submitMinutes":if(await confirmAction("ส่งรายงานฉบับร่างให้ผู้บริหารตรวจทาน?"))await runMutation("r2_submit_minutes",{p_meeting_id:mid},"ส่งรายงานให้ตรวจทานแล้ว");break;
 }
}
function main(){
 if(!/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(cfg.url||"")||!(cfg.publishableKey||"").trim()||!window.supabase?.createClient){
  setVisible("setup",true);
  return;
 }
 state.client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 $("loginForm").addEventListener("submit",async ev=>{
  ev.preventDefault();$("loginMessage").textContent="กำลังตรวจสอบบัญชี";
  const form=new FormData(ev.currentTarget);
  const {error}=await state.client.auth.signInWithPassword({email:String(form.get("email")||""),password:String(form.get("password")||"")});
  if(error){$("loginMessage").textContent="เข้าสู่ระบบไม่ได้ โปรดตรวจสอบอีเมลหรือรหัสผ่าน";return;}
  ev.currentTarget.reset();$("loginMessage").textContent="";await bootstrap();
 });
 $("logout").addEventListener("click",async()=>{await state.client.auth.signOut();await bootstrap();});
 state.client.auth.onAuthStateChange((event)=>{
  if(["SIGNED_IN","SIGNED_OUT","TOKEN_REFRESHED"].includes(event)){
    clearTimeout(authChangeTimer);authChangeTimer=setTimeout(()=>bootstrap(),250);
  }
 });
 const evidencePreview=$("evidencePreview");
 evidencePreview.addEventListener("click",ev=>{if(ev.target===evidencePreview)evidencePreview.close();});
 evidencePreview.addEventListener("close",clearEvidencePreview);
 $("closeEvidencePreview").addEventListener("click",()=>evidencePreview.close());
 $("previewCloseFooter").addEventListener("click",()=>evidencePreview.close());
 $("previewDownload").addEventListener("click",()=>{
  if(!previewFile)return;
  const entry=authorizedEvidence(previewFile.path);
  if(entry)downloadBlob(previewFile.blob,entry.original_name||"evidence");
 });
 $("workspace").addEventListener("click",actionClick);
 $("workspace").addEventListener("toggle",ev=>{
   const detail=ev.target;
   if(detail?.matches?.("details[data-task-details]")){
     state.taskDetailsOpen[detail.dataset.taskDetails]=detail.open;
   }
   if(detail?.matches?.("details[data-agenda-group]")&&detail.dataset.meetingId===state.activeMeeting){
     state.agendaOpen[agendaKey(detail.dataset.meetingId,detail.dataset.agendaGroup)]=detail.open;
   }
 },true);
 $("workspace").addEventListener("change",ev=>{
  if(ev.target.id==="taskFilter"){state.taskFilter=ev.target.value;render();return;}
  if(ev.target.dataset.evidenceUpload){const file=ev.target.files?.[0];if(file)uploadEvidence(file,ev.target.dataset.evidenceUpload,ev.target);}
 });
 modal.addEventListener("click",event=>{if(event.target===modal)closeModal();});
 modal.addEventListener("close",()=>{if(modalReturnFocus?.isConnected)modalReturnFocus.focus({preventScroll:true});modalReturnFocus=null;});
 $("closeModal").addEventListener("click",closeModal);
 $("cancelModal").addEventListener("click",closeModal);
 actionForm.addEventListener("submit",submitForm);
 bootstrap();
}
main();
})();
