import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html=readFileSync("workspace.html","utf8");
const css=readFileSync("portal.css","utf8");
const js=readFileSync("portal.js","utf8");

test("UX-01 retains exactly three existing navigation destinations",()=>{
  const pages=[...html.matchAll(/data-page="(overview|meetings|tasks)"/g)].map(m=>m[1]);
  assert.deepEqual(pages,["overview","meetings","tasks"]);
  assert.equal((html.match(/aria-controls="portalBody"/g)||[]).length,3);
  assert.equal((html.match(/class="tab-icon"/g)||[]).length,3);
  assert.match(html,/aria-label="เลือกส่วนงาน"/);
  assert.match(js,/document\.querySelectorAll\("\[data-page\]"\)/);
  assert.match(js,/setAttribute\("aria-current","page"\)/);
  assert.match(html,/href="\.\/workspace\.html" aria-label="BWD Meeting Hub หน้าหลัก"/);
});

test("UX-01 keeps page heading synchronized with navigation and meeting detail",()=>{
  assert.match(html,/id="workspaceTitle"/);
  assert.match(js,/state\.activeMeeting\?"รายละเอียดการประชุม":"การประชุม"/);
  assert.match(js,/title\.textContent!==pageTitle/);
  assert.match(js,/state\.page==="overview"\?renderOverview\(\)/);
});

test("UX-01 keeps iPhone zoom support, safe areas and accessible touch targets",()=>{
  assert.match(html,/name="viewport" content="width=device-width, initial-scale=1"/);
  assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
  assert.match(css,/--bwd-navy:/);
  assert.match(css,/--bwd-gold:/);
  assert.match(css,/\.tabs \.tab-icon \{ width:23px; height:23px;/);
  assert.match(css,/\.tabs \.tab \{ min-width:0; width:100%; min-height:58px;/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/\.field textarea,\.field select,\.filter \{ font-size:16px;/);
  assert.match(css,/prefers-reduced-motion/);
});

test("UX-01 does not touch backend responsibilities or remove working dialogs",()=>{
  assert.match(html,/id="modal" class="form-sheet"/);
  assert.match(html,/id="meetingReader" class="meeting-reader"/);
  assert.match(html,/id="evidencePreview"/);
  assert.match(js,/c\.from\("meeting_documents"\)\.select/);
  assert.match(js,/r2_create_meeting/);
  assert.match(js,/r2_review_minutes/);
  assert.match(js,/window\.BWDMeetingPdfReader\.open/);
  assert.doesNotMatch(html,/localStorage|service_role/i);
});
