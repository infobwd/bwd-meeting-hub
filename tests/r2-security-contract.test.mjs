import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>readFileSync(join(root,file),"utf8");

const schema=read("supabase/migrations/202611100001_core.sql");
const security=read("supabase/migrations/202611100002_security.sql");
const operations=read("supabase/migrations/202611100003_operations.sql");
const evidence=read("supabase/migrations/202611100004_private_evidence.sql");
const portal=read("portal.js");
const html=read("workspace.html");
const config=read("config.public.js");

test("every R2 app table has row-level security enabled",()=>{
 const names=["profiles","workspace_members","meetings","meeting_access","agendas","decisions","minutes","tasks","task_meeting_links","task_updates","task_evidence","audit_events"];
 for(const name of names){
  assert.match(schema,new RegExp("create table if not exists public\\."+name+"\\s*\\(","i"),"missing table "+name);
  assert.ok(security.includes("alter table public."+name+" enable row level security;"),"RLS missing: "+name);
  assert.match(security,new RegExp("on public\\."+name+"\\s*\\nfor select to authenticated", "i"),"SELECT policy missing: "+name);
 }
 assert.ok(security.includes("revoke all on table"));
 assert.ok(security.includes("grant select on table"));
 assert.ok(!/grant\s+(insert|update|delete|all)\s+on\s+table[\s\S]*?\s+to\s+authenticated/i.test(security));
});

test("authorization helpers and RPC operations use server-side permissions",()=>{
 for(const name of ["can_view_meeting","can_edit_meeting","can_view_task","can_review_task","is_admin"]){
  assert.ok(security.includes("private."+name),name);
 }
 for(const name of ["r2_create_meeting","r2_add_access","r2_add_agenda","r2_record_decision","r2_save_minutes","r2_review_minutes","r2_create_task","r2_link_task","r2_change_task","r2_review_task","r2_register_evidence"]){
  assert.ok(operations.includes("function public."+name+"("),"missing RPC "+name);
 }
 assert.ok(operations.includes("security definer set search_path = ''"));
 assert.ok(operations.includes("raise exception 'Self approval not allowed'"));
 assert.ok(operations.includes("Independent reviewer required"));
 assert.ok(operations.includes("requested access exceeds guest role"));
 assert.ok(operations.includes("Version conflict; reload"));
 assert.ok(operations.includes("public.audit_events"));
});

test("private task evidence is not public",()=>{
 assert.ok(evidence.includes("values('meeting-evidence','meeting-evidence',false"));
 assert.ok(evidence.includes("for select to authenticated"));
 assert.ok(evidence.includes("for insert to authenticated"));
 assert.ok(!evidence.includes("for delete to authenticated"));
 assert.ok(operations.includes("o.owner_id=auth.uid()::text"));
});

test("authenticated portal is locked until configuration",()=>{
 assert.ok(config.includes('url: ""'));
 assert.ok(config.includes('publishableKey: ""'));
 assert.ok(html.includes('id="setup"'));
 assert.ok(html.includes('id="loginForm"'));
 assert.ok(html.includes('type="password"'));
 assert.ok(portal.includes("signInWithPassword"));
 assert.ok(portal.includes("auth.getUser()"));
 assert.ok(portal.includes('from("workspace_members")'));
 assert.ok(portal.includes("state.client.rpc"));
 assert.ok(!portal.includes('window.localStorage.setItem('));
 assert.ok(!config.includes("eyJ")); // no JWT pasted into tracked config
});

test("R2 code supports minutes, tasks, evidence, cross-meeting continuity",()=>{
 for(const key of ["r2_submit_minutes","r2_review_minutes","r2_change_task","r2_review_task","r2_link_task","r2_register_evidence"]){
  assert.ok(portal.includes(key),key);
 }
 assert.ok(portal.includes("meeting-evidence"));
 assert.ok(portal.includes("p_expected_version"));
 assert.ok(portal.includes("p_approve"));
});
