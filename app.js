/* BWD Meeting Hub — R1 demo only. No backend, authentication, cross-device sync or live notifications. */
(() => {
  "use strict";
  const STORAGE_KEY = "bwd-meeting-hub-demo-v1";
  const TYPES = {
    board: "คณะกรรมการสถานศึกษา",
    teacher: "ประชุมครู",
    management: "ฝ่ายบริหาร",
    working: "คณะทำงาน",
    community: "ร่วมกับชุมชน/หน่วยงาน",
    other: "การประชุมอื่น ๆ"
  };
  const SECTIONS = {
    "1": "เรื่องประธานแจ้งให้ทราบ",
    "2": "รับรองรายงานการประชุม",
    "3": "เรื่องสืบเนื่อง",
    "4": "เรื่องเสนอเพื่อพิจารณา",
    "5": "เรื่องอื่น ๆ"
  };
  const TASK_STATES = {
    todo: "ยังไม่เริ่ม",
    doing: "กำลังดำเนินการ",
    blocked: "ติดปัญหา",
    submitted: "ส่งให้ตรวจ"
  };
  const SEED = {
    version: 1,
    meetings: [{
      id: "m-draft-2569",
      title: "ร่างประชุมคณะกรรมการสถานศึกษา",
      type: "board",
      date: "",
      location: "",
      status: "draft",
      agendas: [
        {id:"a-sport",section:"1",title:"กำหนดการแข่งขันกีฬานักเรียน",notes:"กำหนด 17–20 (รอยืนยันเดือน/ปี) และการสนับสนุนกิจกรรมของนักเรียน",decision:"",decisionStatus:"draft"},
        {id:"a-scout",section:"1",title:"กิจกรรมเข้าค่ายลูกเสือ",notes:"25–27 พฤศจิกายน 2569 และการประสานรถรับ–ส่งนักเรียน",decision:"",decisionStatus:"draft"},
        {id:"a-room",section:"3",title:"ความคืบหน้าการปรับปรุงห้องประชุม",notes:"รายงานความก้าวหน้าและประเด็นที่ต้องดำเนินการต่อ",decision:"",decisionStatus:"draft"},
        {id:"a-child",section:"4",title:"เตรียมกิจกรรมวันเด็ก",notes:"เตรียมต้อนรับคณะร่วมกิจกรรม ประสานสถานที่และอาหาร (จำนวนผู้ร่วมกิจกรรมรอยืนยัน)",decision:"",decisionStatus:"draft"}
      ]
    }],
    tasks: []
  };

  const content = document.getElementById("appContent");
  const dialog = document.getElementById("editorDialog");
  const form = document.getElementById("editorForm");
  const fields = document.getElementById("formFields");
  const titleNode = document.getElementById("dialogTitle");
  const toastEl = document.getElementById("toast");
  let data = readData();
  let currentView = ["dashboard","meetings","tasks"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "dashboard";
  let activeMeeting = null;
  let meetingSearch = "";
  let taskFilter = "all";
  let dialogMode = "";
  let dialogContext = {};
  let toastTimer;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function str(v, max=500) { return typeof v === "string" ? v.slice(0,max) : ""; }
  function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function attr(v) { return esc(v); }
  function uid(prefix) {
    const uuid = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    return prefix + "-" + uuid;
  }
  function assertSnapshot(obj) {
    if (!obj || obj.version !== 1 || !Array.isArray(obj.meetings) || !Array.isArray(obj.tasks) || obj.meetings.length>100 || obj.tasks.length>1500) throw new Error("รูปแบบข้อมูลไม่ตรงกับรุ่น R1");
    const ids = new Set();
    const meetings = obj.meetings.map(m => {
      if (!m || typeof m.id !== "string" || !Array.isArray(m.agendas) || m.agendas.length>150) throw new Error("ข้อมูลการประชุมไม่ถูกต้อง");
      const id = str(m.id,100);
      if (!id || ids.has(id)) throw new Error("พบรหัสการประชุมซ้ำ");
      ids.add(id);
      const agids = new Set();
      const agendas = m.agendas.map(a => {
        if (!a || typeof a.id!=="string") throw new Error("ข้อมูลวาระไม่ถูกต้อง");
        const aid = str(a.id,100);
        if (!aid || agids.has(aid)) throw new Error("พบรหัสวาระซ้ำ");
        agids.add(aid);
        return {
          id:aid, section:SECTIONS[String(a.section)] ? String(a.section) : "5",
          title:str(a.title,160), notes:str(a.notes,2000),decision:str(a.decision,3000),
          decisionStatus:a.decisionStatus==="recorded"?"recorded":"draft"
        };
      });
      return {id,title:str(m.title,160),type:TYPES[m.type]?m.type:"other",date:/^\d{4}-\d{2}-\d{2}$/.test(m.date)?m.date:"",location:str(m.location,200),status:"draft",agendas};
    });
    const tasks=obj.tasks.map(t => {
      if (!t || typeof t.id!=="string") throw new Error("ข้อมูลภารกิจไม่ถูกต้อง");
      return {id:str(t.id,100),title:str(t.title,160),meetingId:str(t.meetingId,100),agendaId:str(t.agendaId,100),assignee:str(t.assignee,120),dueDate:/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)?t.dueDate:"",status:TASK_STATES[t.status]?t.status:"todo",notes:str(t.notes,1000),updatedAt:str(t.updatedAt,30)};
    });
    const taskIds=new Set();
    tasks.forEach(t => {
      if (!t.id || taskIds.has(t.id) || !ids.has(t.meetingId)) throw new Error("พบข้อมูลอ้างอิงภารกิจไม่ถูกต้อง");
      taskIds.add(t.id);
    });
    return {version:1,meetings,tasks};
  }
  function readData() {
    try {
      const raw=localStorage.getItem(STORAGE_KEY);
      return raw ? assertSnapshot(JSON.parse(raw)) : clone(SEED);
    } catch (err) {
      console.warn("Demo data could not be loaded",err);
      return clone(SEED);
    }
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }
    catch (err) { console.warn("Could not save demo data",err); toast("เบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูล กรุณาส่งออกไฟล์สำรอง"); }
  }
  function notifyText() { return '<p class="small-caption">นี่เป็นข้อมูลทดลองในเครื่อง ยังไม่มีการส่งแจ้งเตือนไปยังผู้รับผิดชอบ</p>'; }
  function toast(message) {
    clearTimeout(toastTimer);
    toastEl.textContent=message;
    toastEl.classList.add("visible");
    toastTimer=setTimeout(()=>toastEl.classList.remove("visible"),3400);
  }
  function displayDate(d) {
    if (!d) return "ยังไม่กำหนดวัน";
    const dt=new Date(d+"T12:00:00");
    return Number.isNaN(dt.getTime())?"ยังไม่กำหนดวัน":new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",year:"numeric"}).format(dt);
  }
  function tag(text, tone="") { return '<span class="chip '+tone+'">'+esc(text)+'</span>'; }
  function meetingById(id) {return data.meetings.find(m=>m.id===id);}
  function meetingType(type) {return TYPES[type] || TYPES.other;}
  function taskStatus(t) {
    if (t.status==="submitted") return tag(TASK_STATES[t.status],"purple");
    if (t.status==="blocked") return tag(TASK_STATES[t.status],"red");
    if (t.status==="doing") return tag(TASK_STATES[t.status],"gold");
    return tag(TASK_STATES.todo,"gray");
  }
  function pageHeader(kicker,heading,description,action="") {
    return '<div class="page-header"><div><p class="kicker">'+esc(kicker)+'</p><h1>'+esc(heading)+'</h1><p class="subtitle">'+esc(description)+'</p></div>'+action+'</div>';
  }
  function statCard(label,value,footer,highlight=false) {
    return '<div class="stat-card'+(highlight?' highlight':'')+'"><div class="stat-label">'+esc(label)+'</div><div class="stat-value">'+value+'</div><div class="stat-foot">'+esc(footer)+'</div></div>';
  }
  function meetingButton(m) {
    return '<button type="button" class="meeting-item" data-open-meeting="'+attr(m.id)+'"><div class="meeting-item-top"><strong>'+esc(m.title)+'</strong>'+tag("ร่างวาระ","gold")+'</div><div class="item-meta"><span>'+esc(meetingType(m.type))+'</span><span>'+esc(displayDate(m.date))+'</span></div><p class="item-description">'+m.agendas.length+' หัวข้อวาระ • กดเพื่อดูรายละเอียด</p></button>';
  }
  function renderDashboard() {
    const totalAgendas=data.meetings.reduce((sum,m)=>sum+m.agendas.length,0);
    const pending=data.tasks.filter(t=>t.status!=="submitted").length;
    const recent=data.meetings.slice().reverse().slice(0,4);
    const recentTasks=data.tasks.slice().reverse().slice(0,5);
    return pageHeader("ภาพรวม","ระบบประชุมและติดตามภารกิจ","รวมข้อมูลเตรียมประชุมและงานที่บันทึกในเครื่องนี้",
      '<button class="button primary" data-action="newMeeting">＋ สร้างการประชุม</button>')+
      '<div class="grid-stats">'+
      statCard("การประชุม",data.meetings.length,"รวมร่างประชุมทั้งหมด",true)+
      statCard("หัวข้อวาระ",totalAgendas,"ยังไม่ถือเป็นมติ")+
      statCard("งานที่ต้องติดตาม",pending,"รวมงานที่ยังไม่ส่งให้ตรวจ")+
      statCard("ส่งให้ตรวจ",data.tasks.filter(t=>t.status==="submitted").length,"ยังไม่มีระบบตรวจรับ")+
      '</div><div class="two-col"><section class="panel"><div class="panel-heading"><h2 class="panel-title"><span class="pin"></span>การประชุมล่าสุด</h2><button class="button tertiary" data-view="meetings">ดูทั้งหมด →</button></div>'+
      (recent.length?'<div class="stack">'+recent.map(meetingButton).join("")+'</div>':'<div class="empty">ยังไม่มีการประชุม</div>')+
      '</section><section class="panel"><div class="panel-heading"><h2 class="panel-title"><span class="pin"></span>ภารกิจล่าสุด</h2><button class="button tertiary" data-view="tasks">ดูภารกิจ →</button></div>'+
      (recentTasks.length?'<div class="stack">'+recentTasks.map(t=>'<div class="task-item"><strong>'+esc(t.title)+'</strong><div class="item-meta"><span>'+esc(t.assignee||"ยังไม่ระบุผู้รับผิดชอบ")+'</span><span>'+esc(displayDate(t.dueDate))+'</span></div>'+taskStatus(t)+'</div>').join("")+'</div>':'<div class="empty">ยังไม่มีงานมอบหมาย<br>สามารถเพิ่มจากหัวข้อวาระการประชุม</div>')+
      '</section></div><section class="panel"><div class="panel-heading"><h2>สำรองข้อมูลทดลอง</h2></div><p class="item-description">บันทึกเป็นไฟล์ JSON หรือเรียกคืนข้อมูล R1 ที่เคยส่งออกไว้ ข้อมูลไม่ได้ส่งขึ้นเซิร์ฟเวอร์ กรุณาอย่าใช้เก็บข้อมูลลับ</p><div class="button-group" style="margin-top:14px"><button class="button outline" data-action="export">↓ ส่งออกข้อมูล</button><button class="button secondary" data-action="import">↑ นำเข้าข้อมูล</button></div></section>';
  }
  function renderMeetings() {
    if(activeMeeting){
      const m=meetingById(activeMeeting);
      if(m) return renderMeetingDetail(m);
      activeMeeting=null;
    }
    const list=data.meetings.filter(m=>(m.title+" "+meetingType(m.type)).toLowerCase().includes(meetingSearch.trim().toLowerCase()));
    return pageHeader("การประชุม","รายการการประชุม","สร้างการประชุมทุกประเภทและจัดวาระที่ต้องหารือ",
      '<button class="button primary" data-action="newMeeting">＋ สร้างการประชุม</button>')+
      '<div class="toolbar"><div class="grow"><input class="input searchbar" id="meetingSearch" type="search" placeholder="ค้นหาชื่อหรือประเภทการประชุม" aria-label="ค้นหาการประชุม" value="'+attr(meetingSearch)+'"></div></div>'+
      (list.length?'<div class="meeting-cards">'+list.slice().reverse().map(m=>'<article class="meeting-card"><div>'+tag(meetingType(m.type))+' <span class="card-date">'+esc(displayDate(m.date))+'</span></div><h3>'+esc(m.title)+'</h3><p class="item-description">'+esc(m.location||"ยังไม่กำหนดสถานที่")+'</p><div class="card-footer"><span class="section-count">'+m.agendas.length+' วาระ</span><button class="button outline small" data-open-meeting="'+attr(m.id)+'">เปิดวาระ →</button></div></article>').join("")+'</div>':'<div class="empty">ไม่พบการประชุมที่ค้นหา</div>');
  }
  function renderMeetingDetail(m) {
    const agendas=m.agendas.slice().sort((a,b)=>Number(a.section)-Number(b.section));
    const linkedTasks=data.tasks.filter(t=>t.meetingId===m.id);
    return '<button type="button" class="button tertiary back-button" data-action="backMeetings">← กลับรายการประชุม</button>'+
      pageHeader(meetingType(m.type),m.title,"ร่างวาระสำหรับเตรียมประชุม — มติยังไม่ผ่านการรับรอง",
        '<button class="button primary" data-action="addAgenda" data-meeting-id="'+attr(m.id)+'">＋ เพิ่มหัวข้อวาระ</button>')+
      '<div class="details-meta"><span>◷ '+esc(displayDate(m.date))+'</span><span>⌖ '+esc(m.location||"ยังไม่กำหนดสถานที่")+'</span><span>'+m.agendas.length+' หัวข้อ • '+linkedTasks.length+' ภารกิจทดลอง</span></div>'+
      '<div class="detail-grid" style="margin-top:20px"><section class="panel"><div class="panel-heading"><h2>ระเบียบวาระ</h2>'+tag("ร่าง","gold")+'</div>'+
      (agendas.length?agendas.map(a=>{
        const num="วาระที่ "+a.section;
        const tasks=data.tasks.filter(t=>t.meetingId===m.id && t.agendaId===a.id);
        return '<article class="agenda-card"><div class="agenda-head"><div><div class="agenda-section">'+esc(num)+' — '+esc(SECTIONS[a.section])+'</div><h3>'+esc(a.title)+'</h3></div>'+tag(a.decision ? "มีบันทึก":"เตรียมหารือ",a.decision?"green":"gray")+'</div>'+
        (a.notes?'<p class="agenda-notes">'+esc(a.notes)+'</p>':'')+
        (a.decision?'<div class="decision-box"><strong>'+esc(a.decisionStatus==="recorded"?"ข้อสรุปที่บันทึกไว้ (รอรับรอง)":"ร่างข้อสรุป")+'</strong>'+esc(a.decision)+'</div>':'')+
        (tasks.length?'<p class="item-description" style="margin-top:9px">ภารกิจที่เชื่อมไว้ '+tasks.length+' รายการ</p>':'')+
        '<div class="button-group" style="margin-top:12px"><button class="button outline small" data-action="decision" data-meeting-id="'+attr(m.id)+'" data-agenda-id="'+attr(a.id)+'">บันทึกข้อสรุป</button><button class="button secondary small" data-action="newTask" data-meeting-id="'+attr(m.id)+'" data-agenda-id="'+attr(a.id)+'">＋ มอบหมายงาน (ทดลอง)</button></div></article>';
      }).join(""):'<div class="empty">ยังไม่มีหัวข้อวาระ เพิ่มเรื่องที่ต้องเตรียมประชุมได้เลย</div>')+
      '</section><aside><div class="helper-card"><h3>ก่อนบันทึกมติ</h3><p>ควรตรวจสอบว่าที่ประชุมได้หารือและมีข้อสรุปจริงแล้ว</p><ul><li>ร่างวาระไม่ใช่มติ</li><li>งานต้องกำหนดผู้รับผิดชอบและวันส่งโดยยืนยันจริง</li><li>ระบบทดลองยังรับรองรายงานไม่ได้</li></ul></div>'+
      '<details class="guide"><summary>วิธีใช้หน้าการประชุม</summary><p>เพิ่มหัวข้อ → เมื่อประชุมแล้วจึงบันทึกข้อสรุป → เพิ่มภารกิจเชื่อมกับหัวข้อ → ติดตามได้ในหน้า “ภารกิจ”</p></details></aside></div>';
  }
  function renderTasks() {
    const tasks=data.tasks.filter(t=>taskFilter==="all"||t.status===taskFilter);
    return pageHeader("ภารกิจ","ติดตามงานมอบหมาย","รายการทดลองที่เชื่อมกับวาระการประชุม",
      '<button class="button primary" data-action="newTask">＋ เพิ่มภารกิจ</button>')+
      '<section class="panel"><div class="toolbar"><select class="select" id="taskFilter" style="max-width:240px" aria-label="กรองสถานะภารกิจ">'+
      '<option value="all">ทุกสถานะ</option>'+Object.entries(TASK_STATES).map(([k,v])=>'<option value="'+k+'" '+(taskFilter===k?'selected':'')+'>'+esc(v)+'</option>').join("")+'</select></div>'+
      (tasks.length?'<div class="table-wrap"><table><thead><tr><th>งาน / ที่มา</th><th>ผู้รับผิดชอบ</th><th>กำหนดส่ง</th><th>สถานะทดลอง</th></tr></thead><tbody>'+
      tasks.slice().reverse().map(t=>{const m=meetingById(t.meetingId);return '<tr><td><strong>'+esc(t.title)+'</strong><div class="item-description">'+esc(m?m.title:"ไม่พบการประชุม")+'</div>'+ (t.notes?'<div class="small-caption">'+esc(t.notes)+'</div>':'')+'</td><td>'+esc(t.assignee||"รอระบุ")+'</td><td>'+esc(displayDate(t.dueDate))+'</td><td><select class="select task-state" data-task-status="'+attr(t.id)+'" aria-label="เปลี่ยนสถานะ '+attr(t.title)+'">'+Object.entries(TASK_STATES).map(([key,label])=>'<option value="'+key+'" '+(t.status===key?'selected':'')+'>'+esc(label)+'</option>').join("")+'</select></td></tr>';}).join("")+
      '</tbody></table></div>':'<div class="empty">ยังไม่มีภารกิจในสถานะนี้<br>เลือกหัวข้อจากหน้าการประชุมแล้วกด “มอบหมายงาน” ได้</div>')+
      notifyText()+'</section><div class="helper-card"><strong>หมายเหตุเรื่องสถานะ</strong><p>สถานะ “ส่งให้ตรวจ” เป็นเพียงการบันทึกในเครื่อง ยังไม่มีการแจ้งผู้บริหารหรือการตรวจรับอย่างเป็นทางการ ระบบอนุมัติงานจะพัฒนาใน R2</p></div>';
  }

  function render() {
    document.querySelectorAll("[data-view]").forEach(btn=>{const active=btn.dataset.view===currentView;btn.classList.toggle("is-active",active);if(active)btn.setAttribute("aria-current","page");else btn.removeAttribute("aria-current");});
    content.innerHTML=currentView==="dashboard"?renderDashboard():(currentView==="meetings"?renderMeetings():renderTasks());
  }
  function navigate(view) {
    if(!["dashboard","meetings","tasks"].includes(view))return;
    if(view!=="meetings")activeMeeting=null;
    currentView=view;
    location.hash=view;
    render();
    window.scrollTo({top:0,behavior:"auto"});
  }
  function field(label,name,control,hint="") {
    return '<div class="field"><label for="f-'+name+'">'+esc(label)+'</label>'+control+(hint?'<div class="field-hint">'+esc(hint)+'</div>':'')+'</div>';
  }
  function input(name,required=false,type="text",value="",max=160) {
    return '<input class="input" id="f-'+name+'" name="'+name+'" type="'+type+'" maxlength="'+max+'" value="'+attr(value)+'" '+(required?"required":"")+'>';
  }
  function select(name,choices,selected) {
    return '<select class="select" id="f-'+name+'" name="'+name+'">'+Object.entries(choices).map(([k,v])=>'<option value="'+attr(k)+'" '+(selected===k?'selected':'')+'>'+esc(v)+'</option>').join("")+'</select>';
  }
  function textarea(name,value="",required=false) {
    return '<textarea class="textarea" id="f-'+name+'" name="'+name+'" rows="4" maxlength="3000" '+(required?"required":"")+'>'+esc(value)+'</textarea>';
  }
  function openEditor(mode,ctx={}) {
    dialogMode=mode;dialogContext=ctx;
    const m=meetingById(ctx.meetingId);
    const a=m?.agendas.find(v=>v.id===ctx.agendaId);
    if(mode==="newMeeting"){
      titleNode.textContent="สร้างการประชุม";
      fields.innerHTML=field("ชื่อการประชุม *","title",input("title",true))+
        field("ประเภทการประชุม","type",select("type",TYPES,"board"))+
        field("วันที่ประชุม (เว้นไว้ได้)","date",input("date",false,"date"))+
        field("สถานที่","location",input("location"));
    }else if(mode==="addAgenda"){
      if(!m){toast("ไม่พบการประชุม");return;}
      titleNode.textContent="เพิ่มหัวข้อวาระ";
      fields.innerHTML=field("หมวดวาระ","section",select("section",SECTIONS,"4"))+
        field("ชื่อเรื่อง *","title",input("title",true))+
        field("รายละเอียดสำหรับเตรียมประชุม","notes",textarea("notes"),"ยังไม่ใช่มติหรือข้อสรุป");
    }else if(mode==="decision"){
      if(!a){toast("ไม่พบหัวข้อวาระ");return;}
      titleNode.textContent="บันทึกข้อสรุป";
      fields.innerHTML='<p class="item-description" style="margin-bottom:15px">'+esc(a.title)+'</p>'+
        field("ข้อความข้อสรุป *","decision",textarea("decision",a.decision,true))+
        field("ขั้นตอนการบันทึก","decisionStatus",select("decisionStatus",{draft:"ร่างข้อสรุป",recorded:"บันทึกจากการประชุม (รอรับรอง)"},a.decisionStatus),"R1 ยังไม่มีการรับรองมติจากผู้มีอำนาจ");
    }else if(mode==="newTask"){
      if(data.meetings.length===0){toast("กรุณาสร้างการประชุมก่อน");return;}
      titleNode.textContent="เพิ่มภารกิจทดลอง";
      const chosen=m||data.meetings[0];
      fields.innerHTML=field("งานที่ต้องทำ *","title",input("title",true,"text",""))+
        field("การประชุมที่เกี่ยวข้อง","meetingId",select("meetingId",Object.fromEntries(data.meetings.map(x=>[x.id,x.title])),chosen.id))+
        '<input type="hidden" name="agendaId" value="'+attr(a?.id||"")+'">'+
        field("ผู้รับผิดชอบ (เว้นไว้ก่อนก็ได้)","assignee",input("assignee",false,"text","",120))+
        field("วันครบกำหนด (ต้องยืนยัน)","dueDate",input("dueDate",false,"date"))+
        field("รายละเอียด / หลักฐานที่ต้องส่ง","notes",textarea("notes"),"ไม่มีการแจ้งเตือนไปยังบุคคลที่ระบุ");
    }else{return;}
    if(!dialog.open)dialog.showModal();
    dialog.querySelector("input,select,textarea")?.focus();
  }
  function saveEditor(ev) {
    ev.preventDefault();
    const fd=new FormData(form);
    const get=(key,max=160)=>str(fd.get(key),max).trim();
    const title=get("title");
    const m=meetingById(dialogContext.meetingId);
    if(dialogMode==="newMeeting"){
      if(!title){toast("กรุณาระบุชื่อการประชุม");return;}
      const newMeeting={id:uid("m"),title,type:TYPES[get("type")]?get("type"):"other",date:get("date",10),location:get("location",200),status:"draft",agendas:[]};
      data.meetings.push(newMeeting);activeMeeting=newMeeting.id;currentView="meetings";location.hash="meetings";
    }else if(dialogMode==="addAgenda"&&m){
      if(!title){toast("กรุณาระบุชื่อเรื่อง");return;}
      m.agendas.push({id:uid("a"),section:SECTIONS[get("section")]?get("section"):"5",title,notes:get("notes",2000),decision:"",decisionStatus:"draft"});
    }else if(dialogMode==="decision"&&m){
      const a=m.agendas.find(v=>v.id===dialogContext.agendaId);
      if(!a)return;
      const decision=get("decision",3000);
      if(!decision){toast("กรุณาบันทึกข้อสรุป");return;}
      a.decision=decision;a.decisionStatus=get("decisionStatus")==="recorded"?"recorded":"draft";
    }else if(dialogMode==="newTask"){
      if(!title){toast("กรุณาระบุชื่องาน");return;}
      const meetingId=get("meetingId",100);
      if(!meetingById(meetingId)){toast("เลือกการประชุมที่เกี่ยวข้อง");return;}
      data.tasks.push({id:uid("t"),title,meetingId,agendaId:meetingId===dialogContext.meetingId?get("agendaId",100):"",assignee:get("assignee",120),dueDate:get("dueDate",10),status:"todo",notes:get("notes",1000),updatedAt:new Date().toISOString()});
    }else{return;}
    persist();dialog.close();render();toast("บันทึกข้อมูลทดลองในเครื่องแล้ว");
  }
  function exportData() {
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="bwd-meeting-hub-demo-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    toast("ส่งออกข้อมูลทดลองแล้ว");
  }
  function importData() {
    const f=document.createElement("input");f.type="file";f.accept=".json,application/json";
    f.addEventListener("change",async()=>{
      const file=f.files?.[0];if(!file)return;
      if(file.size>2_000_000){toast("ไฟล์มีขนาดเกิน 2 MB");return;}
      try{
        const next=assertSnapshot(JSON.parse(await file.text()));
        if(!window.confirm("แทนที่ข้อมูลทดลองในเครื่องทั้งหมดด้วยไฟล์ที่เลือกหรือไม่?"))return;
        data=next;activeMeeting=null;taskFilter="all";meetingSearch="";persist();navigate("dashboard");toast("นำเข้าข้อมูลทดลองเรียบร้อย");
      }catch(err){toast("ไม่สามารถนำเข้าไฟล์: "+(err?.message||"ข้อมูลไม่ถูกต้อง"));}
    },{once:true});f.click();
  }

  document.addEventListener("click",ev=>{
    const nav=ev.target.closest("[data-view]");
    if(nav){navigate(nav.dataset.view);return;}
    const open=ev.target.closest("[data-open-meeting]");
    if(open){activeMeeting=open.dataset.openMeeting;navigate("meetings");return;}
    const action=ev.target.closest("[data-action]");
    if(!action)return;
    switch(action.dataset.action){
      case "newMeeting":openEditor("newMeeting");break;
      case "backMeetings":activeMeeting=null;render();break;
      case "addAgenda":openEditor("addAgenda",{meetingId:action.dataset.meetingId});break;
      case "decision":openEditor("decision",{meetingId:action.dataset.meetingId,agendaId:action.dataset.agendaId});break;
      case "newTask":openEditor("newTask",{meetingId:action.dataset.meetingId||"",agendaId:action.dataset.agendaId||""});break;
      case "export":exportData();break;
      case "import":importData();break;
    }
  });
  content.addEventListener("change",ev=>{
    if(ev.target.id==="taskFilter"){taskFilter=ev.target.value;render();return;}
    const id=ev.target.dataset.taskStatus;
    if(id){
      const t=data.tasks.find(t=>t.id===id);
      if(!t||!TASK_STATES[ev.target.value])return;
      t.status=ev.target.value;t.updatedAt=new Date().toISOString();persist();render();
      toast("อัปเดตสถานะในเครื่องแล้ว (ไม่มีการแจ้งเตือน)");
    }
  });
  content.addEventListener("input",ev=>{
    if(ev.target.id==="meetingSearch"){
      meetingSearch=ev.target.value;
      const cursor=ev.target.selectionStart;
      render();
      const next=document.getElementById("meetingSearch");
      next?.focus();try{next?.setSelectionRange(cursor,cursor);}catch{}
    }
  });
  document.getElementById("closeDialog").addEventListener("click",()=>dialog.close());
  document.getElementById("cancelDialog").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",ev=>{if(ev.target===dialog)dialog.close();});
  form.addEventListener("submit",saveEditor);
  window.addEventListener("hashchange",()=>{
    const view=location.hash.slice(1);
    if(["dashboard","meetings","tasks"].includes(view)&&view!==currentView){currentView=view;activeMeeting=null;render();}
  });
  render();
})();
