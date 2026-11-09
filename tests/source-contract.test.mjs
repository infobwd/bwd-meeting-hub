import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=name=>readFileSync(join(root,name),"utf8");

test("R1 contains usable navigation and accessible form",()=>{
  const html=read("index.html");
  for(const marker of ['id="appContent"','id="editorDialog"','id="editorForm"','data-view="dashboard"','data-view="meetings"','data-view="tasks"']){
    assert.ok(html.includes(marker),"missing "+marker);
  }
  assert.ok(html.includes('lang="th"'));
  assert.ok(html.includes('name="viewport"'));
});

test("public UI explicitly labels browser-only demo and no notifications",()=>{
  const html=read("index.html");
  const js=read("app.js");
  assert.ok(html.includes("ยังไม่มีระบบบัญชีผู้ใช้หรือแจ้งเตือนจริง"));
  assert.ok(js.includes("localStorage"));
  assert.ok(js.includes("ไม่มีการแจ้งเตือน"));
  assert.ok(!js.includes("service_role"));
});

test("R1 separates drafts, decision recording and task statuses",()=>{
  const js=read("app.js");
  for(const marker of ["decisionStatus","draft","recorded","todo","doing","blocked","submitted","function assertSnapshot","function exportData","function importData"]){
    assert.ok(js.includes(marker),"missing "+marker);
  }
  assert.ok(!js.includes('status: "approved"'));
});

test("roadmap and draft agenda exist",()=>{
  const plan=read("docs/MASTER_PLAN.md");
  const agenda=read("docs/AGENDA_DRAFT_2569.md");
  assert.ok(plan.includes("R2"));
  assert.ok(plan.includes("Private-by-default"));
  assert.ok(agenda.includes("25–27 พฤศจิกายน 2569"));
  assert.ok(agenda.includes("ต้องยืนยันเดือน/ปี"));
});
