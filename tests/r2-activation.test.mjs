import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html = readFileSync(new URL("../activate.html", import.meta.url),"utf8");
const js = readFileSync(new URL("../activate.js", import.meta.url),"utf8");
const workspace = readFileSync(new URL("../workspace.html", import.meta.url),"utf8");
test("activation uses Supabase Auth rather than creating local user accounts",()=>{
  assert.match(js,/resetPasswordForEmail/);
  assert.match(js,/auth\.updateUser\(\{password\}\)/);
  assert.match(js,/auth\.getUser\(\)/);
  assert.match(js,/detectSessionInUrl:true/);
  assert.match(js,/auth\.signOut\(\)/);
  assert.ok(!js.includes("service_role"));
  assert.ok(!js.includes("sb_secret_"));
  assert.match(html,/id="newPassword"[^>]*minlength="12"/);
  assert.match(html,/id="confirmPassword"[^>]*minlength="12"/);
  assert.match(workspace,/href="\.\/activate\.html"/);
});
