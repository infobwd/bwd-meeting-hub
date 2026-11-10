# BWD Meeting Hub — Master Plan
Version: 0.2.0 | 2026-11-10 | Status: R2 code implemented; Supabase provisioning and multi-role acceptance pending

## 1. Vision
ระบบกลางจัดการการประชุมและติดตามภารกิจของโรงเรียนบ้านวังด้ง รองรับการประชุมกรรมการสถานศึกษา ประชุมครู ประชุมฝ่ายบริหาร การประชุมคณะทำงาน และการประชุมอื่น โดยมีวงจร **เตรียมวาระ → ประชุม → มติ/ข้อสรุป → งานมอบหมาย → ติดตาม → ตรวจรับ → ประชุมครั้งถัดไป**.

## 2. Principles
1. **Meeting-agnostic:** ไม่ผูกโมเดลข้อมูลกับกรรมการสถานศึกษาอย่างเดียว
2. **Evidence-first:** แยกข้อมูลก่อนประชุม/ข้อเสนอ ออกจากมติที่รับรองแล้วและผลการดำเนินงาน
3. **Task continuity:** หนึ่งงานติดตามหลายการประชุมได้โดยไม่สร้างงานซ้ำ
4. **Private-by-default:** สิทธิ์เข้าถึงเอกสารและข้อมูลบุคคลต้องควบคุมในฐานข้อมูลจริง ไม่เผยแพร่ผ่าน GitHub Pages หรือ public JSON
5. **Mobile-first, plain Thai:** ลดภาษาทางเทคนิค หน้าจอสำหรับครูและกรรมการอ่านง่าย
6. **Approval gate:** ผู้รับมอบหมายแจ้งว่าเสร็จแล้ว ≠ ผู้บริหารตรวจรับแล้ว
7. **No false notifications:** แยกการแสดงภารกิจใน UI ออกจากระบบส่งแจ้งเตือนจริง

## 3. Roles (target production)
- Administrator / ผู้บริหาร: เข้าถึงขอบเขตโรงเรียน, มอบหมาย, ตรวจรับ, ดูภาพรวม
- Secretary / เลขานุการ: จัดวาระ, รายงาน, เอกสารประกอบ, เตรียมเผยแพร่, เสนอรับรอง
- Attendee / ผู้เข้าประชุม: อ่านเฉพาะการประชุม/เอกสารที่มีสิทธิ์, แสดงความคิดเห็นตามนโยบาย
- Assignee / ผู้ได้รับมอบหมาย: เห็นงานที่ได้รับ, รายงานความคืบหน้า, ส่งหลักฐาน
- External Guest / บุคคลภายนอก: เห็นเฉพาะสิทธิ์ที่เชิญเป็นรายประชุม
ผู้ใช้หนึ่งคนมีหลายบทบาทได้; ต้องระบุขอบเขตสิทธิ์เป็นรายประชุมและรายงาน

## 4. Domain model
- users, memberships (roles, school scope)
- meetings (title, kind, date/time, location, status, created_by)
- meeting_attendees (meeting_id, user_id / external invite, attendance_status)
- agendas (meeting_id, section, order, title, description, proposed_by)
- minutes (meeting_id, draft, reviewed_at, approved_at, approval_actor)
- decisions (agenda_id, text, status: proposed/recorded/ratified, decision_date)
- tasks (title, description, owner, due_at, state, approved_at, approved_by)
- task_meeting_links (task_id, meeting_id, agenda_id, relationship)
- task_updates (task_id, author, details, timestamp, evidence_refs)
- notifications (recipient, reason, due_at, sent_at, channel, dedupe_key)
- audit_events (actor, action, target, timestamp, before/after metadata)
- document_references (owner_type/id, drive_file_id, visibility)

## 5. State machines
Meetings: draft → scheduled → held → minutes_review → ratified → archived.
Decisions: draft → recorded → ratified (not every agenda generates a decision).
Tasks: todo → doing → submitted → approved. Additional: blocked, cancelled; rejected submissions return to doing. A task may link to several agendas/meetings without duplication.
Dates and assignees must be confirmed. No automatic due-date inference from the meeting date.

## 6. Architecture / Security
### R1 demonstration
Static HTML, CSS, JavaScript; in-browser localStorage, designed only for **non-sensitive sample or test data on one device**. No login, cross-device sync, access enforcement, server, push notification or real collaboration. Demo must prominently explain limitations. No private meeting details or names in public repo.
### Production candidate (R2/R3)
Static frontend (GitHub Pages) + Supabase Auth/Postgres + Row Level Security, service-role keys on server/Edge Functions only. Google Drive for permitted attachments after checking sharing boundaries. Notifications via trusted server channel (email / LINE channel if credentials and approvals available) with scheduling, opt-in and audit trail. Never embed secrets or service-role keys in public frontend. Backups, retention, export/deletion policy, concurrency control, audit logs, access tests, invite expiry and lost-access procedures needed before go-live.

## 7. Release roadmap and acceptance
### R1 — Meeting Core & clickable prototype
- [x] Master plan / scope / risks and agenda draft versioned in repo
- [x] Responsive navigation, dashboard, meetings and task views
- [x] Local draft meeting create, agenda add, decision record, task create, status updates
- [x] Data import/export for demo (private local test data only; no server upload)
- [ ] Accessibility / multi-device user acceptance
- [ ] Confirm actual dates/details for sample agenda
- [ ] Production authentication and authorization (must NOT be assumed complete)

### R2 — Secure collaboration and task tracking
- [x] Code: login portal with existing Supabase Auth users (workspace.html + portal.js) — **requires project configuration**
- [x] Code: role matrix, per-meeting ACL, default-deny RLS and no direct client table writes (migrations 001–002)
- [x] Code: normalized DB schema and audited RPC operations (migration 003); backups/retention are **not configured**
- [x] Code: draft minutes → submission → admin review/rejection; decisions remain distinct from formal committee ratification
- [x] Code: assigned tasks → progress → submission → independent review, version checks, updates and evidence metadata
- [x] Code: private bucket and task-scoped evidence upload policies (migration 004)
- [x] Code: one task linked to more than one meeting without duplication
- [x] Code: browser print/save-as-PDF for reviewed minutes — Google Docs export not connected
- [x] Source-contract and JS syntax checks in GitHub Actions
- [ ] Create/configure private Supabase project, apply migrations and provision authorized accounts
- [ ] Live RLS tests with multiple roles, invite/revoke tests, mobile UAT, backup/restore test
- [ ] Approved external invite journey, expiry/revocation, privacy and retention sign-off
- [ ] Integrate real Google Docs export if required; formal committee ratification procedure

### R3 — Notifications and smart workflows
- [ ] Real opt-in delivery with recipient/channel controls and duplicate prevention
- [ ] Due soon (3d/1d), overdue and submitted-for-review policies; digest and quiet hours
- [ ] Calendar integration, dashboard analytics, advanced cross-meeting search
- [ ] AI-assisted drafting only, human review mandatory
- [ ] Security, privacy and operational readiness / go-live sign-off

## 8. Guardrails
No participant lists, child information, internal minutes, identity tokens, phone numbers, signatures, or attachment URLs in public fixtures. Demo-only app is **not** a production repository of official meeting records. External participants must not get school-wide visibility.
Source information from chat image is **unapproved preparation**, not a ratified meeting resolution.

## 9. Active next steps
1. Review R1 UI and confirm Thai terminology + agenda topic fidelity.
2. Design database schema/ACL contract and R2 threat model before connecting accounts.
3. Provision backend with admin-approved identities and private storage.
4. Run role-based acceptance and audit tests, then enable real notifications only after recipient consent.

## 10. R2 implementation status / release gate (2026-11-10)
- R2 code is stored under workspace.html, portal.js, portal.css, config.public.js, and supabase/migrations.
- R1 remains available as non-sensitive browser-only demo; it does not sync to R2.
- **NO PRODUCTION GO-LIVE** before private Supabase provisioning, multi-account RLS acceptance and privacy sign-off. The repo being public is not evidence that data are public.
- R2 does not schedule or send reminders. R3 notification workflow remains separate.
- Operational setup guide: docs/R2_SETUP.md.

## 11. R2 display refinement — TDRS-informed implementation plan (2026-11-10)
- **Plan documented (not implemented):** [docs/R2_TDRS_UI_DISPLAY_ALIGNMENT_PLAN_20261110.md](R2_TDRS_UI_DISPLAY_ALIGNMENT_PLAN_20261110.md).
- Compared `infobwd/tdrs` main application shell, bottom nav and bottom sheet, responsive typography/iOS zoom prevention, theme tokens, mobile dashboard, skeletons, toast, and PWA update UX.
- Continue to use Nongkum Sports PDF.js reader as the **document-reader behavior reference**, while TDRS informs the app-wide visual and mobile interaction treatment.
- Ordered gates: UX-00 current-screen audit → UX-01 app shell → UX-02 meetings → UX-03 tasks → UX-04 forms/status → UX-05 PDF viewer → UX-06 device/accessibility/role acceptance; optional UX-07 (PWA/theme) separately.
- No Supabase data, Drive sharing rules, authentication, meeting decisions, or UI code changed by this planning step. Preserve existing R2 behavior until each slice is separately approved and tested.
