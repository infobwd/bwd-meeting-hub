import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/migrations/202611110002_private_meeting_pdf_reader.sql","utf8");
const edge=readFileSync("supabase/functions/meeting-pdf/index.ts","utf8");
const ui=readFileSync("portal.js","utf8");
const reader=readFileSync("meeting-pdf-reader.js","utf8");
const html=readFileSync("workspace.html","utf8");

test("PDF copies are isolated from browser/anonymous database roles",()=>{
  assert.match(sql,/create table if not exists public\.meeting_document_pdf_chunks/);
  assert.match(sql,/create table if not exists public\.meeting_document_pdf_assets/);
  assert.match(sql,/meeting_document_pdf_chunks enable row level security/);
  assert.match(sql,/meeting_document_pdf_assets enable row level security/);
  assert.match(sql,/revoke all on public\.meeting_document_pdf_chunks from public, anon, authenticated/);
  assert.match(sql,/revoke all on public\.meeting_document_pdf_assets from public, anon, authenticated/);
  assert.match(sql,/grant select on public\.meeting_document_pdf_chunks to service_role/);
  assert.match(sql,/grant select on public\.meeting_document_pdf_assets to service_role/);
  assert.doesNotMatch(sql,/create policy[\s\S]*to\s+(?:authenticated|anon)/i);
});
test("server verifies meeting-document RLS before querying any protected PDF content",()=>{
  const auth=edge.indexOf("rows = await lookup.json()");
  const authorized=edge.indexOf("rows.length !== 1");
  const privateRead=edge.indexOf("const privateCopy = await readPrivateCopy");
  const serviceKey=edge.indexOf('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
  assert.ok(auth>0 && authorized>auth && privateRead>authorized && serviceKey>0);
  assert.match(edge,/REST enforces meeting_documents SELECT RLS under the caller's JWT/);
  assert.match(edge,/const privateCopy = await readPrivateCopy\(supabaseUrl,rows\[0\]\.id\)/);
  assert.match(edge,/privateCopy \?\? await readDrivePdf/);
  assert.match(edge,/crypto\.subtle\.digest\("SHA-256",pdf\)/);
  assert.match(edge,/private_copy_checksum_mismatch/);
  assert.match(edge,/Cache-Control": "private, no-store"/);
  assert.match(edge,/X-Content-Type-Options": "nosniff"/);
  assert.doesNotMatch(edge,/const (?:serviceKey|privateKey)\s*=\s*["'](?:eyJ|sb_secret_)/);
});
test("meeting report opens inline with a single tap; no public PDF link or ratification",()=>{
  assert.match(ui,/button\(latestDoc\.document_type==="minutes_draft"\?"เปิดรายงานการประชุม"/);
  assert.match(ui,/from\("meeting_documents"\)\.select\("\*"\)\.is\("archived_at",null\)/);
  assert.match(ui,/functions\/v1\/meeting-pdf\?document_id=/);
  assert.match(reader,/showBook\("อ่าน PDF ในเว็บ"\)/);
  assert.match(reader,/await openBytes\(buffer,ticket,"อ่าน PDF ในเว็บ"\)/);
  assert.match(html,/portal\.js\?v=doc02ux-ux12pdf/);
  assert.match(html,/meeting-pdf-reader\.js\?v=ux07-ux12pdf/);
});
