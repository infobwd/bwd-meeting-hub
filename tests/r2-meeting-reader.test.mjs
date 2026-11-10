import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync("workspace.html","utf8");
const portal=readFileSync("portal.js","utf8");
const reader=readFileSync("meeting-pdf-reader.js","utf8");
const css=readFileSync("portal.css","utf8");

test("meeting reader UI has a single controlled modal and return navigation",()=>{
  assert.match(html,/id="meetingReader"/);
  assert.match(html,/id="readerClose"/);
  assert.match(html,/id="readerDriveFrame"/);
  assert.match(html,/id="readerCanvasHost"/);
  assert.match(html,/id="readerPageBar"/);
  assert.match(html,/id="readerBackDrive"/);
  assert.match(html,/meeting-pdf-reader.js/);
  assert.match(reader,/dialog\.addEventListener\("close",reset\)/);
  assert.match(reader,/focus\.focus/);
  assert.match(css,/safe-area-inset-bottom/);
});
test("meeting documents are found through RLS-filtered rows, no embedded link fixtures",()=>{
  assert.match(portal,/c\.from\("meeting_documents"\)\.select/);
  assert.match(portal,/"document-id":d\.id/);
  assert.match(portal,/readMeetingPdf/);
  assert.match(portal,/state\.documents\.find/);
  assert.match(reader,/\^\[a-zA-Z0-9_-\]\{10,128\}\$/);
  assert.match(reader,/drive\.google\.com\/file\/d\//);
  assert.doesNotMatch(reader,/service_role|service-role|anonKey|credentials:\s*["']include/);
});
test("Drive preview is not misrepresented as full PDF.js rendering",()=>{
  assert.match(reader,/ui\.frame\.src/);
  assert.match(reader,/ui\.pageBar\.hidden=true/);
  assert.match(reader,/PDF\.js mode|PDF\.js book mode/);
  assert.match(reader,/file\.arrayBuffer\(\)/);
  assert.match(reader,/pdfjs\.getDocument/);
  assert.match(reader,/p\.render/);
  assert.match(reader,/Math\.abs\(dx\)>=65/);
  assert.match(html,/เลือก PDF จากเครื่อง/);
  assert.doesNotMatch(reader,/localStorage|sessionStorage|publicUrl|createSignedUrl/);
});
