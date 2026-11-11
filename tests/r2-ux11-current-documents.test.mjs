import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const ui=readFileSync("portal.js","utf8");
const html=readFileSync("workspace.html","utf8");
const sql=readFileSync("supabase/migrations/202611110001_archive_meeting_document_links.sql","utf8");
const reader=readFileSync("supabase/functions/meeting-pdf/index.ts","utf8");

test("signed-in meeting documents are scoped to current, unarchived links",()=>{
  assert.match(ui,/from\("meeting_documents"\)\.select\("\*"\)\.is\("archived_at",null\)/);
  assert.match(sql,/add column if not exists archived_at timestamptz/i);
  assert.match(sql,/for select to authenticated\s+using \(archived_at is null and private\.can_view_meeting\(meeting_id\)\)/i);
  assert.doesNotMatch(sql,/\bgrant\b[\s\S]*\bto\s+anon\b/i);
});
test("a signed-in reader can open the latest visible meeting attachment",()=>{
  assert.match(ui,/const latestDoc=docs\.find/);
  assert.match(ui,/button\("อ่านเอกสารล่าสุด","readMeetingPdf"/);
  assert.match(ui,/\.id===b\.dataset\.documentId && state\.meetings\.some/);
  assert.match(ui,/functions\/v1\/meeting-pdf\?document_id=/);
  assert.match(ui,/Authorization:"Bearer "\+token/);
  assert.match(html,/portal\.js\?v=doc02ux-ux11/);
});
test("PDF access continues to respect meeting-document RLS; Drive originals are never republished",()=>{
  assert.match(reader,/meeting_documents/);
  assert.match(reader,/REST enforces meeting_documents SELECT RLS/);
  assert.match(reader,/Could not retrieve PDF for book reader/);
  assert.doesNotMatch(sql,/\bdelete\s+from\s+public\.meeting_documents\b/i);
  assert.doesNotMatch(sql,/\bupdate\s+public\.meeting_documents\b/i);
});
