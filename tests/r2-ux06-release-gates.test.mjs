import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=name=>readFileSync(name,"utf8");
const portal=read("portal.js"),reader=read("meeting-pdf-reader.js");
const html=read("workspace.html"),css=read("portal.css"),edge=read("supabase/functions/meeting-pdf/index.ts");

test("UX-06 preserves authenticated R2 data actions and separate review gates",()=>{
  for(const name of [
    "r2_create_meeting","r2_add_agenda","r2_save_minutes","r2_review_minutes",
    "r2_review_task","r2_register_evidence","meeting_documents","meeting-evidence"
  ])assert.ok(portal.includes(name),name);
  assert.match(portal,/function isEditor\(/);
  assert.match(portal,/function canReview\(/);
  assert.match(portal,/function isOwner\(/);
  assert.match(portal,/ratified/);
  assert.match(portal,/reviewed/);
});
test("UX-06 preserves private PDF/evidence boundaries",()=>{
  assert.match(reader,/await source\.loadPdf\(signal\)/);
  assert.match(edge,/rest\/v1\/meeting_documents/);
  assert.match(edge,/Cache-Control": "private, no-store"/);
  assert.match(portal,/state\.client\.auth\.getSession\(\)/);
  assert.match(portal,/meeting-evidence/);
  assert.doesNotMatch(portal+reader+edge,/service_role/);
  assert.doesNotMatch(html,/data:application\/pdf;base64|\.pdf\?public=/);
});
test("UX-06 checks touch/keyboard/reader release contracts",()=>{
  assert.match(html,/name="viewport" content="width=device-width, initial-scale=1"/);
  assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
  assert.match(html,/id="meetingReader"/);
  assert.match(html,/id="evidencePreview"/);
  assert.match(html,/id="readerCanvasHost"[^>]*tabindex="0"/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/\.meeting-reader \.reader-pagebar\[hidden\]/);
  assert.match(css,/\.meeting-reader .reader-tools:not\(\[open\]\) \.reader-menu/);
});
