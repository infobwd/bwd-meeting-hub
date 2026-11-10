/* BWD Meeting Hub R2 — sports-style mobile reader for meeting documents.
 * PDF.js book mode loads bytes from a Supabase RLS-gated Drive adapter first.
 * Google Drive Preview honors Drive ACLs as fallback; local files stay on device.
 */
(() => {
"use strict";
const PDF_JS="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.min.mjs";
const PDF_WORKER="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.worker.min.mjs";
const MAX_BYTES=40*1024*1024;
const $=id=>document.getElementById(id);
const dialog=$("meetingReader");
if(!dialog)return;
const ui={
  close:$("readerClose"),title:$("readerTitle"),notice:$("readerNotice"),menu:$("readerTools"),
  drive:$("readerDrivePane"),frame:$("readerDriveFrame"),open:$("readerOpenDrive"),
  source:$("readerSource"),local:$("readerLocalPdf"),driveButton:$("readerBackDrive"),
  localPane:$("readerCanvasPane"),canvasHost:$("readerCanvasHost"),canvas:$("readerCanvas"),
  status:$("readerStatus"),pageBar:$("readerPageBar"),page:$("readerPage"),
  total:$("readerTotal"),prev:$("readerPrev"),next:$("readerNext"),
  fitWidth:$("readerFitWidth"),fitPage:$("readerFitPage"),
  zoomOut:$("readerZoomOut"),zoomIn:$("readerZoomIn"),zoomLabel:$("readerZoomLabel")
};
let lastFocus=null,current=null,pdf=null,pdfjs=null,loadingId=0,renderId=0,renderTask=null,zoom=1,fit="width",page=1,swipeStart=null,pinchStart=null,lastTap=null,resizeTimer=0,activeController=null;
function message(value,error=false){ui.status.textContent=value||"";ui.status.hidden=!value;ui.status.classList.toggle("reader-error",error);}
function showDrive(reason=""){
  if(current?.id)ui.frame.src="https://drive.google.com/file/d/"+encodeURIComponent(current.id)+"/preview";
  ui.drive.hidden=false;ui.localPane.hidden=true;ui.pageBar.hidden=true;
  ui.driveButton.hidden=true;ui.source.textContent="อ่านผ่าน Google Drive";
  ui.menu.open=false;
  message(reason||"ดู PDF ผ่าน Google Drive ตามสิทธิ์บัญชี Google ของคุณ");
  updateToolbar();
}
function showBook(source){
  ui.frame.src="about:blank";
  ui.drive.hidden=true;ui.localPane.hidden=false;ui.pageBar.hidden=false;
  ui.driveButton.hidden=false;ui.source.textContent=source;
  ui.menu.open=false;
}
async function clearPdf(){
  ++renderId;
  const pending=renderTask;renderTask=null;
  if(pending){try{pending.cancel();await pending.promise;}catch(_){}}
  const doc=pdf;pdf=null;
  if(doc){try{await doc.destroy();}catch(_){}}
  ui.canvas.width=0;ui.canvas.height=0;ui.canvas.style.width="";ui.canvas.style.height="";
}
function reset(){
  ++loadingId;
  if(activeController){activeController.abort();activeController=null;}
  current=null;
  ui.frame.src="about:blank";
  ui.local.value="";
  clearPdf().catch(()=>{});
  ui.drive.hidden=false;ui.localPane.hidden=true;ui.pageBar.hidden=true;
  ui.source.textContent="";message("");
  ui.canvas.style.transform="";ui.canvas.style.transformOrigin="";
  ui.menu.open=false;
  const focus=lastFocus;lastFocus=null;
  if(focus?.isConnected)focus.focus({preventScroll:true});
}
function open({driveFileId,title,documentType,loadPdf}={}){
  if(!/^[a-zA-Z0-9_-]{10,128}$/.test(driveFileId||""))return;
  if(dialog.open)dialog.close();
  // Never provide a public PDF copy or a token in the URL.
  lastFocus=document.activeElement;
  current={id:driveFileId,title:String(title||"เอกสารประกอบ").slice(0,200),loadPdf};
  ui.title.textContent=current.title;
  const typeLabel=documentType==="proposed_resolution"?"ร่างมติเสนอเพื่อพิจารณา":
    documentType==="agenda_draft"?"ร่างระเบียบวาระ":
    documentType==="minutes_draft"?"ร่างรายงานการประชุม":"เอกสารประกอบ";
  ui.notice.textContent=typeLabel+" • ฉบับร่าง ยังไม่ใช่มติหรือรายงานที่รับรองแล้ว";
  ui.open.href="https://drive.google.com/file/d/"+encodeURIComponent(driveFileId)+"/view";
  ui.frame.src="about:blank";
  dialog.showModal();
  ui.close.focus({preventScroll:true});
  if(typeof loadPdf==="function"){
    loadOnline().catch(()=>showDrive("เปิดแบบหนังสือไม่ได้ กรุณาอ่านผ่าน Google Drive"));
  } else {
    showDrive("ระบบอ่านแบบหนังสือยังไม่พร้อม กรุณาเปิดผ่าน Google Drive");
  }
}
function updateToolbar(){
  const ready=!!pdf;
  ui.prev.disabled=!ready||page<=1;
  ui.next.disabled=!ready||page>=pdf.numPages;
  ui.page.disabled=!ready;ui.page.value=String(page);
  ui.page.max=ready?String(pdf.numPages):"1";
  ui.total.textContent=ready?"/ "+pdf.numPages:"";
  ui.fitWidth.disabled=!ready;ui.fitPage.disabled=!ready;
  ui.fitWidth.setAttribute("aria-pressed",String(fit==="width"));
  ui.fitPage.setAttribute("aria-pressed",String(fit==="page"));
  ui.zoomOut.disabled=!ready||zoom<=.8;
  ui.zoomIn.disabled=!ready||zoom>=2;
  ui.zoomLabel.textContent=zoom===1?(fit==="width"?"พอดีกว้าง":"ทั้งหน้า"):Math.round(zoom*100)+"%";
}
async function render(){
  if(!pdf||!dialog.open)return;
  const call=++renderId;
  if(renderTask){
    const old=renderTask;renderTask=null;
    try{old.cancel();await old.promise;}catch(_){}
  }
  if(call!==renderId||!pdf||!dialog.open)return;
  try{
    message("กำลังแสดงหน้า "+page+"…");
    const p=await pdf.getPage(page);
    if(call!==renderId||!dialog.open)return;
    const base=p.getViewport({scale:1});
    const width=Math.max(1,ui.canvasHost.clientWidth-22);
    const height=Math.max(1,ui.canvasHost.clientHeight-22);
    const scale=fit==="page"?Math.min(width/base.width,height/base.height):width/base.width;
    const viewport=p.getViewport({scale:Math.max(.1,Math.min(3,scale))*zoom});
    const ratio=Math.max(1,Math.min(window.devicePixelRatio||1,2,Math.sqrt(8000000/(viewport.width*viewport.height))));
    ui.canvas.width=Math.max(1,Math.round(viewport.width*ratio));
    ui.canvas.height=Math.max(1,Math.round(viewport.height*ratio));
    ui.canvas.style.width=Math.round(viewport.width)+"px";
    ui.canvas.style.height=Math.round(viewport.height)+"px";
    const ctx=ui.canvas.getContext("2d",{alpha:false});
    if(!ctx)throw Error("Canvas unavailable");
    const task=p.render({canvasContext:ctx,viewport,transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]});
    renderTask=task;await task.promise;
    if(call!==renderId||!dialog.open)return;
    renderTask=null;
    ui.canvas.setAttribute("aria-label","เอกสาร PDF หน้า "+page+" จาก "+pdf.numPages+" หน้า");
    message("");
  }catch(err){
    if(call!==renderId||err?.name==="RenderingCancelledException")return;
    message("แสดงหน้า PDF ไม่สำเร็จ กรุณาลองอีกครั้งหรือกลับไปเปิดจาก Google Drive",true);
  }
}
function setPage(value){
  if(!pdf)return;
  page=Math.max(1,Math.min(pdf.numPages,Math.trunc(Number(value)||1)));
  ui.canvasHost.scrollTop=0;ui.canvasHost.scrollLeft=0;
  updateToolbar();render().catch(()=>{});
}
function setZoom(value){
  if(!pdf)return;
  zoom=Math.max(.8,Math.min(2,Math.round(value*10)/10));
  updateToolbar();render().catch(()=>{});
}
async function openBytes(buffer,ticket,source){
  if(ticket!==loadingId||!dialog.open)return;
  const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
  if(bytes.byteLength>MAX_BYTES||bytes.byteLength<5)throw Error("file_size");
  if(String.fromCharCode(...bytes.subarray(0,5))!=="%PDF-")throw Error("not_pdf");
  if(!pdfjs){
    pdfjs=await import(PDF_JS);
    pdfjs.GlobalWorkerOptions.workerSrc=PDF_WORKER;
  }
  if(ticket!==loadingId||!dialog.open)return;
  const doc=await pdfjs.getDocument({data:bytes}).promise;
  if(ticket!==loadingId||!dialog.open){await doc.destroy();return;}
  pdf=doc;page=1;zoom=1;fit="width";
  ui.source.textContent=source;
  updateToolbar();await render();
}
async function loadOnline(){
  const source=current;
  const ticket=++loadingId;
  if(activeController)activeController.abort();
  activeController=new AbortController();
  const signal=activeController.signal;
  await clearPdf();
  if(ticket!==loadingId||!dialog.open)return;
  showBook("อ่านแบบหนังสือจาก Google Drive");
  message("กำลังเปิด PDF แบบหนังสือ…");
  try{
    const buffer=await source.loadPdf(signal);
    if(ticket!==loadingId||!dialog.open)return;
    await openBytes(buffer,ticket,"อ่านแบบหนังสือจาก Google Drive");
  }catch(error){
    if(ticket!==loadingId||!dialog.open)return;
    await clearPdf();
    if(ticket!==loadingId||!dialog.open)return;
    showDrive("เปิดแบบหนังสือจาก Drive ไม่ได้ • แสดงตัวอ่าน Google Drive แทน (หากไฟล์จำกัดสิทธิ์ต้องใช้บัญชีที่ได้รับอนุญาต)");
  }finally{
    if(ticket===loadingId)activeController=null;
  }
}
async function selectLocal(file){
  if(!file)return;
  const ticket=++loadingId;
  if(activeController){activeController.abort();activeController=null;}
  await clearPdf();
  if(ticket!==loadingId||!dialog.open)return;
  showBook("อ่านแบบหนังสือ (ไฟล์จากเครื่อง)");
  message("กำลังเตรียมอ่าน PDF…");
  try{
    if(file.size>MAX_BYTES||file.size<5)throw Error("file_size");
    const buffer=await file.arrayBuffer();
    await openBytes(buffer,ticket,"อ่านแบบหนังสือ (ไฟล์จากเครื่อง — ตรวจให้ตรงฉบับบน Drive)");
  }catch(error){
    if(ticket!==loadingId||!dialog.open)return;
    message("เปิดไฟล์ที่เลือกไม่ได้ โปรดใช้ไฟล์ PDF ไม่เกิน 40 MB หรือเปิดผ่าน Google Drive",true);
  }finally{ui.local.value="";}
}
async function backToDrive(){
  ++loadingId;
  if(activeController){activeController.abort();activeController=null;}
  await clearPdf();
  if(!dialog.open)return;
  showDrive();
}
ui.close.addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",ev=>{if(ev.target===dialog)dialog.close();});
dialog.addEventListener("close",reset);
ui.local.addEventListener("change",ev=>{selectLocal(ev.target.files?.[0]).catch(()=>{});});
ui.driveButton.addEventListener("click",()=>backToDrive().catch(()=>{}));
ui.prev.addEventListener("click",()=>setPage(page-1));
ui.next.addEventListener("click",()=>setPage(page+1));
ui.page.addEventListener("change",()=>setPage(ui.page.value));
ui.fitWidth.addEventListener("click",()=>{fit="width";zoom=1;updateToolbar();render().catch(()=>{});});
ui.fitPage.addEventListener("click",()=>{fit="page";zoom=1;updateToolbar();render().catch(()=>{});});
ui.zoomIn.addEventListener("click",()=>setZoom(zoom+.2));
ui.zoomOut.addEventListener("click",()=>setZoom(zoom-.2));
const touchPoint=t=>({x:t.clientX,y:t.clientY});
const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
ui.canvasHost.addEventListener("touchstart",ev=>{
  if(!pdf)return;
  if(ev.touches.length>=2){
    const d=distance(ev.touches);
    pinchStart=d>0?{start:d,zoom,preview:zoom}:null;swipeStart=null;lastTap=null;
  }else if(ev.touches.length===1&&!pinchStart)swipeStart={...touchPoint(ev.touches[0]),at:Date.now()};
},{passive:true});
ui.canvasHost.addEventListener("touchmove",ev=>{
  if(!pdf||!pinchStart||ev.touches.length<2)return;
  if(ev.cancelable)ev.preventDefault();
  pinchStart.preview=Math.max(.8,Math.min(2,pinchStart.zoom*distance(ev.touches)/pinchStart.start));
  ui.canvas.style.transformOrigin="center top";
  ui.canvas.style.transform="scale("+(pinchStart.preview/zoom)+")";
},{passive:false});
ui.canvasHost.addEventListener("touchend",ev=>{
  if(!pdf)return;
  if(pinchStart){
    if(ev.touches.length<2){
      const next=pinchStart.preview;pinchStart=null;swipeStart=null;lastTap=null;
      ui.canvas.style.transform="";ui.canvas.style.transformOrigin="";
      setZoom(next);
    }
    return;
  }
  if(ev.touches.length||!swipeStart||!ev.changedTouches.length)return;
  const end=touchPoint(ev.changedTouches[0]);
  const dx=end.x-swipeStart.x,dy=end.y-swipeStart.y,elapsed=Date.now()-swipeStart.at;
  swipeStart=null;
  if(zoom===1&&Math.abs(dx)>=65&&Math.abs(dx)>1.35*Math.abs(dy)&&elapsed<=850){
    lastTap=null;setPage(page+(dx<0?1:-1));return;
  }
  if(Math.abs(dx)>20||Math.abs(dy)>20||elapsed>350){lastTap=null;return;}
  const now=Date.now();
  if(lastTap&&now-lastTap.at<340&&Math.hypot(end.x-lastTap.x,end.y-lastTap.y)<32){
    lastTap=null;setZoom(zoom>1?1:1.8);
  }else lastTap={...end,at:now};
},{passive:true});
ui.canvasHost.addEventListener("touchcancel",()=>{swipeStart=null;pinchStart=null;lastTap=null;ui.canvas.style.transform="";},{passive:true});
window.addEventListener("resize",()=>{
  if(!pdf||!dialog.open)return;
  clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render().catch(()=>{}),200);
},{passive:true});
window.BWDMeetingPdfReader={open,close:()=>{if(dialog.open)dialog.close();}};
})();