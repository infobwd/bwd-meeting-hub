import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const reader=readFileSync("meeting-pdf-reader.js","utf8");
const css=readFileSync("portal.css","utf8");
const html=readFileSync("workspace.html","utf8");

function mockReader(){
  const nodes=new Map();
  function get(id){
    if(!nodes.has(id)){
      const listeners=new Map();
      const node={
        id, isConnected:true, hidden:false, disabled:false, open:false, src:"", href:"", value:"",
        textContent:"", style:{}, classList:{toggle(){}}, listeners,
        setAttribute(name,value){this[name]=value;},
        addEventListener(type,callback){
          if(!listeners.has(type))listeners.set(type,[]);
          listeners.get(type).push(callback);
        },
        focus(){this.focused=true;},
      };
      nodes.set(id,node);
    }
    return nodes.get(id);
  }
  const trigger=get("originalTrigger");
  const dialog=get("meetingReader");
  dialog.showModal=()=>{dialog.open=true;};
  dialog.close=()=>{
    dialog.open=false;
    for(const fn of dialog.listeners.get("close")||[])fn();
  };
  const doc={getElementById:get,activeElement:trigger};
  const win={addEventListener(){}};
  vm.runInNewContext(reader,{document:doc,window:win,AbortController,setTimeout,clearTimeout,URL},{
    timeout:2500,filename:"meeting-pdf-reader.js"
  });
  return {get,dialog,trigger,api:win.BWDMeetingPdfReader};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,12));

test("UX-05 hides the Drive pane, canvas pane, and page bar reliably",()=>{
  for(const selector of [".reader-drive-pane[hidden]",".reader-canvas-pane[hidden]",".reader-pagebar[hidden]"]){
    assert.ok(css.includes(selector),selector);
  }
  assert.match(css,/display:none!important/);
  assert.match(css,/\.reader-tools:not\(\[open\]\) \.reader-menu\{display:none\}/);
});
test("UX-05 is navigable by keyboard and keeps the option to open the original",()=>{
  assert.match(html,/id="readerCanvasHost"[^>]+tabindex="0"[^>]+aria-keyshortcuts=/);
  assert.match(html,/id="readerMode"[^>]+aria-live="polite"/);
  assert.match(reader,/ui\.canvasHost\.addEventListener\("keydown"/);
  assert.match(reader,/event\.key==="Home"/);
  assert.match(reader,/event\.key==="End"/);
  assert.match(reader,/ui\.open\.href="https:\/\/drive\.google\.com\/file\/d\/"/);
  assert.match(css,/:focus-visible\{outline:3px solid/);
  assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
});
test("UX-05 invalid file IDs are rejected, restricted Drive uses an honest fallback",async()=>{
  const {get,dialog,trigger,api}=mockReader();
  assert.ok(api?.open);
  api.open({driveFileId:"!unsafe!",title:"bad"});
  assert.equal(dialog.open,false);
  api.open({
    driveFileId:"18b1yt1158VPLIJ6Xs3KRywhMUrZ2V629",
    title:"ร่างรายงานทดสอบ",
    documentType:"minutes_draft",
    loadPdf:()=>Promise.reject(new Error("permission denied")),
  });
  assert.equal(dialog.open,true);
  await tick();
  assert.equal(get("readerDrivePane").hidden,false);
  assert.equal(get("readerCanvasPane").hidden,true);
  assert.equal(get("readerPageBar").hidden,true);
  assert.match(get("readerMode").textContent,/Google Drive/);
  assert.match(get("readerStatus").textContent,/ไฟล์จำกัดสิทธิ์/);
  assert.match(get("readerNotice").textContent,/ยังไม่ใช่มติหรือรายงานที่รับรองแล้ว/);
  assert.ok(get("readerPrev").disabled);
  api.close();
  assert.equal(dialog.open,false);
  assert.equal(get("readerDriveFrame").src,"about:blank");
  assert.equal(trigger.focused,true);
});
test("UX-05 does not enable page buttons before an online PDF finishes loading",async()=>{
  const {get,api}=mockReader();
  api.open({
    driveFileId:"18b1yt1158VPLIJ6Xs3KRywhMUrZ2V629",
    title:"เอกสารทดสอบ",
    loadPdf:()=>new Promise(()=>{}),
  });
  await tick();
  assert.equal(get("readerCanvasPane").hidden,false);
  assert.equal(get("readerPageBar").hidden,false);
  assert.equal(get("readerPrev").disabled,true);
  assert.equal(get("readerNext").disabled,true);
  assert.equal(get("readerPage").disabled,true);
  api.close();
});
