import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const ext=readFileSync("supabase/migrations/202611100009_external_meeting_participation.sql","utf8");
const doc=readFileSync("supabase/migrations/202611100010_official_document_contract.sql","utf8");
const base=readFileSync("supabase/migrations/202611100001_core.sql","utf8");
const app=readFileSync("portal.js","utf8");

test("EXT-01 adds hosting mode without backfilling or modifying existing meetings",()=>{
  assert.match(ext,/add column meeting_mode text/);
  assert.match(ext,/NULL means unclassified legacy meeting/);
  assert.match(ext,/externally_hosted/);
  assert.doesNotMatch(ext,/update public\.meetings set meeting_mode|delete from public\.meetings/i);
  assert.match(ext,/create table public\.meeting_participations/);
  assert.match(ext,/create table public\.external_attendance_reports/);
  assert.match(ext,/primary key \(meeting_id,user_id\)/);
  assert.match(ext,/unique \(meeting_id,author_id\)/);
  assert.match(ext,/attendance_status text not null default 'unknown'/);
  assert.match(base,/create table if not exists public\.meeting_access/);
});

test("EXT-01 new tables default deny writes and RPCs use role and meeting guards",()=>{
  for(const name of ["meeting_participations","external_attendance_reports"]){
    assert.ok(ext.includes("alter table public."+name+" enable row level security"));
    assert.match(ext,new RegExp('create policy "[^"]+" on public\\.'+name));
  }
  assert.match(ext,/revoke all on public\.meeting_participations,public\.external_attendance_reports/);
  assert.match(ext,/grant select on public\.meeting_participations,public\.external_attendance_reports/);
  assert.doesNotMatch(ext,/grant\s+(insert|update|delete)\s+on public\./i);
  for(const name of ["r2_ext_create_meeting","r2_ext_add_participant","r2_ext_save_report",
                     "r2_ext_submit_report","r2_ext_withdraw_report","r2_ext_review_report"]){
    assert.ok(ext.includes("function public."+name+"("),name);
  }
  assert.match(ext,/Only active staff may participate/);
  assert.match(ext,/private\.is_staff\(\)/);
  assert.match(ext,/private\.can_edit_meeting\(p_meeting_id\)/);
  assert.match(ext,/private\.can_view_meeting\(p_meeting_id\)/);
  assert.match(ext,/Independent reviewer required/);
  assert.match(ext,/Version conflict; reload/);
  assert.match(ext,/Only pending report may be withdrawn/);
  assert.match(ext,/from public,anon,authenticated;\s*grant execute on function/);
  assert.match(ext,/public\.audit_events/);
  assert.doesNotMatch(ext,/private\.staff_directory|auth\.admin\.createUser|inviteUserByEmail/);
});

test("DOC-01 supports six sections only when explicitly selected",()=>{
  assert.match(base,/check \(section between 1 and 5\)/);
  assert.match(doc,/drop constraint agendas_section_check/);
  assert.match(doc,/check \(section between 1 and 6\)/);
  assert.match(doc,/create table public\.meeting_document_settings/);
  assert.match(doc,/agenda_template_key in \('legacy5','school6'\)/);
  assert.match(doc,/Existing agenda cannot be silently remapped/);
  assert.match(doc,/Sixth section requires selected six-part template/);
  assert.match(doc,/function public\.r2_doc_add_agenda/);
  assert.match(app,/const sections=\{"1":/); // legacy app unchanged until DOC-02
  assert.match(app,/r2_add_agenda/);
  assert.doesNotMatch(doc,/update public\.agendas set section|delete from public\.agendas/i);
});

test("DOC-01 separates versioned official minutes from ratification evidence",()=>{
  for(const name of ["meeting_document_settings","meeting_official_minutes_versions","meeting_ratifications"]){
    assert.ok(doc.includes("create table public."+name+" ("),name);
    assert.ok(doc.includes("alter table public."+name+" enable row level security"));
  }
  assert.match(doc,/document_fields jsonb/);
  assert.match(doc,/foreign key \(minutes_version_id,meeting_id\)/);
  assert.match(doc,/ratification_method/);
  assert.match(doc,/No client write RPC yet/);
  assert.doesNotMatch(doc,/update public\.minutes|delete from public\.minutes/i);
  assert.doesNotMatch(doc,/grant\s+(insert|update|delete)\s+on public\./i);
  assert.match(doc,/revoke all on public\.meeting_document_settings/);
  assert.match(doc,/from public,anon,authenticated;\s*grant execute on function/);
});
