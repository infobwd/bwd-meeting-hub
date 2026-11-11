import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const portal=readFileSync("portal.js","utf8");
const reader=readFileSync("meeting-pdf-reader.js","utf8");
const edge=readFileSync("supabase/functions/meeting-pdf/index.ts","utf8");
const html=readFileSync("workspace.html","utf8");

test("the reader attempts protected PDF.js automatically instead of Drive iframe first",()=>{
  assert.match(reader,/async function loadOnline\(/);
  assert.match(reader,/loadOnline\(\)\.catch/);
  assert.match(reader,/await source\.loadPdf\(signal\)/);
  assert.match(reader,/pdfjs\.getDocument\(\{data:bytes\}\)/);
  assert.match(reader,/await openBytes\(buffer,ticket/);
  assert.match(reader,/showDrive\("ยังโหลด PDF ในเว็บไม่ได้/);
  assert.match(html,/ตัวอ่านจะเปิด PDF ในเว็บตามสิทธิ์การประชุม/);
});
test("browser uses signed in user's JWT, not a secret or public file link",()=>{
  assert.match(portal,/state\.client\.auth\.getSession\(\)/);
  assert.match(portal,/\/functions\/v1\/meeting-pdf\?document_id=/);
  assert.match(portal,/Authorization:"Bearer "\+token/);
  assert.match(portal,/cache:"no-store",signal/);
  assert.doesNotMatch(portal,/service_role/);
  assert.doesNotMatch(reader,/export=download|drive\.usercontent/);
});
test("edge restricts inputs and storage, checks meeting RLS before Drive access",()=>{
  assert.match(edge,/ALLOWED_ORIGIN = "https:\/\/infobwd\.github\.io"/);
  assert.match(edge,/REDIRECT_LIMIT = 4/);
  assert.match(edge,/MAX_BYTES = 40 \* 1024 \* 1024/);
  assert.match(edge,/rest\/v1\/meeting_documents/);
  assert.match(edge,/query\.searchParams\.set\("id","eq\."\+docId\)/);
  assert.match(edge,/Authorization:auth/);
  assert.match(edge,/rows\.length !== 1/);
  assert.match(edge,/await readDrivePdf\(rows\[0\]\.drive_file_id\)/);
  assert.match(edge,/String\.fromCharCode\(\.\.\.data\.subarray\(0,5\)\) !== "%PDF-"/);
  assert.match(edge,/Cache-Control": "private, no-store"/);
  assert.match(edge,/Deno.env.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  assert.ok(edge.indexOf("rows.length !== 1") < edge.indexOf("const privateCopy = await readPrivateCopy"));
  assert.doesNotMatch(edge,/localStorage|createSignedUrl/);
});
