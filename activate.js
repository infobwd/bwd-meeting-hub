/* BWD Meeting Hub R2 account activation / recovery.
 * Browser-safe, no admin/secret keys. Auth email links must redirect to this
 * deployed HTTPS page, never localhost. Supabase owns session/token handling.
 */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const status = $("activationStatus");
  const recoveryForm = $("recoveryForm");
  const passwordForm = $("passwordForm");
  const config = window.BWD_SUPABASE_CONFIG || {};
  const validConfig = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url || "") &&
    typeof config.publishableKey === "string" && /^sb_publishable_/.test(config.publishableKey);

  function message(text, isError = false) {
    status.textContent = text;
    status.style.color = isError ? "#9a3d2d" : "#315077";
  }
  function showSession(isActive) {
    passwordForm.hidden = !isActive;
    recoveryForm.hidden = isActive;
    if (isActive) message("ยืนยันลิงก์สำเร็จ ตั้งรหัสผ่านใหม่เพื่อใช้งานบัญชี");
    else message("ขอลิงก์ตั้งรหัสผ่านสำหรับบัญชีที่ได้รับคำเชิญจากโรงเรียน");
  }
  if (!validConfig || !window.supabase?.createClient) {
    message("ระบบยังไม่พร้อม โปรดติดต่อผู้ดูแลโรงเรียนก่อน", true);
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
      showSession(Boolean(session));
    }
  });

  (async () => {
    const {data, error} = await client.auth.getSession();
    if (error) {
      showSession(false);
      message("ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่", true);
      return;
    }
    showSession(Boolean(data.session));
    // The invite/recovery token is sensitive; do not keep it in browser history.
    if (location.hash.includes("access_token=") || location.hash.includes("refresh_token=")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  })();

  recoveryForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = String(new FormData(recoveryForm).get("email") || "").trim();
    if (!email) return;
    const button = recoveryForm.querySelector("button");
    button.disabled = true;
    try {
      const redirectTo = new URL("./activate.html", location.href).href;
      if (location.protocol !== "https:" || location.hostname === "localhost") {
        throw new Error("โปรดเปิดหน้านี้จากเว็บไซต์ HTTPS ที่เผยแพร่จริง");
      }
      const {error} = await client.auth.resetPasswordForEmail(email, {redirectTo});
      if (error) throw error;
      message("ส่งคำขอแล้ว หากอีเมลนี้มีบัญชีในระบบ จะได้รับลิงก์ตั้งรหัสผ่านใหม่ โปรดตรวจกล่องจดหมายและจดหมายขยะ");
    } catch (error) {
      message(error.message || "ไม่สามารถส่งคำขอได้ กรุณาลองอีกครั้ง", true);
    } finally {
      button.disabled = false;
    }
  });

  passwordForm.addEventListener("submit", async e => {
    e.preventDefault();
    const form = new FormData(passwordForm);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmPassword") || "");
    if (password.length < 12 || password !== confirmation) {
      message("รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร และทั้งสองช่องต้องตรงกัน", true);
      return;
    }
    const button = passwordForm.querySelector("button");
    button.disabled = true;
    try {
      const {data: {user}, error: userError} = await client.auth.getUser();
      if (userError || !user) throw new Error("ลิงก์หมดอายุ กรุณาขอลิงก์ใหม่");
      const {error} = await client.auth.updateUser({password});
      if (error) throw error;
      await client.auth.signOut();
      passwordForm.hidden = true;
      recoveryForm.hidden = true;
      passwordForm.reset();
      message("ตั้งรหัสผ่านสำเร็จแล้ว เปิดหน้าเข้าสู่ระบบด้วยอีเมลและรหัสผ่านใหม่");
    } catch (error) {
      message(error.message || "บันทึกรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง", true);
    } finally {
      button.disabled = false;
    }
  });
})();
