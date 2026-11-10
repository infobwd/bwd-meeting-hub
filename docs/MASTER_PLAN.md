# BWD Meeting Hub — Master Plan
Version: 0.2.1 | 2026-11-10 | Status: R2 connected to Supabase; UX-05/06 code verified; live role/device release acceptance pending

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
- **UX-00 source audit (no UI code changes):** [docs/R2_UX00_TDRS_SOURCE_BASELINE_20261110.md](R2_UX00_TDRS_SOURCE_BASELINE_20261110.md). Includes concrete source findings, prioritized risks, viewport/role acceptance matrix, and handoff for UX-01; real-device screenshots still pending.
- **UX-01 app shell implemented (mobile/tablet QA pending):** [docs/R2_UX01_TDRS_APP_SHELL_ACCEPTANCE.md](R2_UX01_TDRS_APP_SHELL_ACCEPTANCE.md). Compact page-aware header, three-icon bottom navigation, BWD theme tokens, phone/touch/safe-area and iOS text refinements. No backend/Drive/meeting records changed. Next UX-02 meeting information architecture, then UX-03 task cards.
- **UX-02 meeting hierarchy implemented (device QA pending):** [docs/R2_UX02_MEETING_AGENDA_ACCEPTANCE.md](R2_UX02_MEETING_AGENDA_ACCEPTANCE.md). Accurate backend-derived meeting state labels; five expandable agenda groups (13-item sample fully preserved); page anchors for documents/minutes/tasks/attendees; return-to-list scroll preservation. No backend or Drive permission changes. Next code slice: UX-03 task actions/evidence density.
- **UX-03 task cards implemented (multi-role/device QA pending):** [docs/R2_UX03_TASK_CARDS_EVIDENCE_ACCEPTANCE.md](R2_UX03_TASK_CARDS_EVIDENCE_ACCEPTANCE.md). Task owner/due/status first, at most one primary action; secondary controls, uploads, previews and history in a native disclosure; reviewer and self-approval separation preserved. No Supabase or Drive changes. Next code slice UX-04 forms/Toast/loading/retry.
- **UX-04 forms/loading implemented (iPhone/device QA pending):** [docs/R2_UX04_FORMS_LOADING_ACCEPTANCE.md](R2_UX04_FORMS_LOADING_ACCEPTANCE.md). Keyboard-aware Bottom Sheet, dirty-form discard confirmation, one-at-a-time Save, inline errors, skeleton/loading with retry and accurate save-vs-refresh Toast. Private state cleared on signout. No backend/Drive/PDF reader changes; next UX-05 viewer and UX-06 device/role acceptance.
- **UX-05 PDF reader implementation and mock acceptance:** [docs/R2_UX05_READER_ACCEPTANCE.md](R2_UX05_READER_ACCEPTANCE.md). Explicit hidden/fallback panes, accessible reader mode, keyboard paging and mobile focus/viewport improvements; no authorization or Drive sharing changes. Real-device PDF.js and Drive access tests pending.
- **UX-06 automated regression / live release gate:** [docs/R2_UX06_RELEASE_VERIFICATION.md](R2_UX06_RELEASE_VERIFICATION.md). Existing role/RLS/privacy/UI contracts retained; meeting/document counts checked read-only. Full iPhone/Android/iPad, independent accounts, storage negative tests and privacy/backup sign-off remain mandatory before official production acceptance.
- **R3 remains separate:** no real reminder delivery has been enabled, including post-event thank-you letter follow-ups.
- Compared `infobwd/tdrs` main application shell, bottom nav and bottom sheet, responsive typography/iOS zoom prevention, theme tokens, mobile dashboard, skeletons, toast, and PWA update UX.
- Continue to use Nongkum Sports PDF.js reader as the **document-reader behavior reference**, while TDRS informs the app-wide visual and mobile interaction treatment.
- Ordered gates: UX-00 current-screen audit → UX-01 app shell → UX-02 meetings → UX-03 tasks → UX-04 forms/status → UX-05 PDF viewer → UX-06 device/accessibility/role acceptance; optional UX-07 (PWA/theme) separately.
- No Supabase data, Drive sharing rules, authentication, meeting decisions, or UI code changed by this planning step. Preserve existing R2 behavior until each slice is separately approved and tested.

## 12. Supabase Free — capacity, backup and quota guardrails (2026-11-10)
- **Policy recorded:** [docs/SUPABASE_FREE_USAGE_GUARDRAILS_20261110.md](SUPABASE_FREE_USAGE_GUARDRAILS_20261110.md).
- Supabase organization confirmed **Free**, project `Meeting` is ACTIVE_HEALTHY; one active project observed. Database ~12.65 MB; private Storage metadata ~2.42 MB at baseline (2026-11-10). Monthly usage and egress are **not yet verified**; do not treat them as zero.
- Internal thresholds: 70% watch, 85% escalate, 95% critical review, by individual meter. Threshold actions are manual/planned **not enabled automated enforcement**.
- Mandatory release gate: official dashboard Usage review, protected external backup + restore test, 7-day inactivity pause recovery plan, upload and retention policies, RLS/live-account acceptance. No secret or personal data in public repository.
- R3 reminders must respect Edge/Realtime quotas, opt-in and deduplication; do not add high-frequency background polling or a synthetic keep-alive.

## 13. UX-07 — Mobile Display Polish & Task Experience (2026-11-10)
- [x] Compact signed-in header: accessible account dropdown retains the original logout action.
- [x] Prioritize assigned tasks on overview; balance three key metrics in phone layout while preserving the three destination tabs.
- [x] Compact task summary, move meeting origin inside details, and separate evidence/history into collapsed, accessible sub-panels; independent review and task version RPC stay unchanged.
- [x] Task update dialog selects currently saved status (where editable) instead of defaulting to "doing", and shows status-specific plain-Thai guidance for in-progress, blocked and submitted.
- [x] Position compact success/error toast above bottom navigation; keep dismiss button and accessible status roles.
- [x] Use "หัวข้อย่อย" for agenda jump count, display "(ร่างรายงาน)" once as a status badge instead of duplicate title suffix in the UI (database title unchanged).
- [x] Expose fit-width, full-page and zoom controls directly in PDF.js reader with in-session fit preference; leave Google Drive fallback private.
- [x] Replace technical notification copy with plain Thai; **no automated notification delivery introduced**.
- [x] Add UX-07 automated source and isolated rendering tests.
- [ ] iOS/Android real-device UAT, role-based checks and production privacy sign-off; automated CI is not production acceptance.
- **Scope:** frontend + docs + tests only. No Supabase data/RLS, stored meeting title, task state, document sharing, or decision/approval state changed.

## 14. UX-08 — Safe mobile footer, Drive meeting cover and full task history (2026-11-10)
- [x] Fix mobile footer occlusion: reserve fixed-tab safe-area padding on footer outside main, while reducing excess gap under dashboard.
- [x] Provide optional editor-controlled Google Drive cover file ID on meeting records, with audited RPC, existing meeting SELECT RLS and ID validation; images are not made public or copied into GitHub.
- [x] Meeting cards and details display a 16:9 Drive thumbnail or fallback. Google Drive sharing permissions remain authoritative; private files not renderable as cross-site thumbnails show a placeholder and an authenticated Drive link.
- [x] Add full per-task history dialog with 20-row pages, exact count, task_id filter and existing SELECT RLS; no write/approval routes are affected.
- [x] Reduce account logout button line wrapping and simplify footer wording.
- [x] Add isolated UI source tests, audit backend contract and test in CI.
- [x] Applied migration 202611100006_meeting_cover.sql to Supabase Meeting on 2026-11-10 and verified one existing meeting, zero cover images selected, and only authenticated role granted RPC execution. This does not replace live multi-user authorization acceptance.
- [ ] Choose an actual appropriate image in the permitted Google Drive; none is auto-selected from private school documents.
- [ ] Live iOS/Android and separate-role acceptance, restricted Drive-photo test, storage quota and privacy approval before official go-live.

## 15. UX-09 — Mobile Timeline & Meeting Cover Refinement (2026-11-10)
- [x] Fix the actual iPhone history regression: UX-08's 18px first grid column received the content because the decorative dot was absolutely positioned. Use full-width block entries and independently positioned timeline dots on mobile and desktop; keep long notes legible and preserve all existing history.
- [x] Change the meeting cover's *empty state only* from a tall 16:9 block to a concise row; real images retain 16:9 and Drive fallback.
- [x] Allow editors to preview a selected Drive file thumbnail before confirming the cover; clear stale previews when the link changes, show a private Drive original link for ACL failures, and require manual confirmation that the original is a photo rather than a PDF/document.
- [x] Restrict cover entry to `drive.google.com/file/d/...` file links (not Docs, Sheets, Slides or folders), without changing the generic Drive document parser or publishing private images.
- [x] Close the account dropdown on outside pointer, Escape, page switch or entering/leaving meeting details; keep the native accessible summary and focus behavior.
- [x] Refresh frontend asset versions and add UX-09 source-level and isolated rendering regression tests.
- [ ] **Manual acceptance:** verify history text wrapping and cover preview from a real iPhone/Android, with access-restricted Google Drive image and a second authorized account. Google Drive's cross-origin thumbnail is not guaranteed for private media.
- **Important:** the browser cannot verify a private Drive file's MIME type without Drive OAuth/API access. Requiring the editor to inspect and confirm the original prevents accidental acceptance but is not automated MIME verification.
- **No Supabase schema, stored meeting cover, task update history, approval states, or Google Drive ACLs changed.**

## 16. UX-10 — Drive Photo Gallery & Compact Overview (2026-11-10)
- [x] Inspected the existing Drive folder for the school-board meeting of 10 Nov 2026. Confirmed 10 JPEGs in `ภาพประกอบการประชุม_10-11-2569`, not merely PDFs or the original letter scan.
- [x] Added `meeting_photo_catalog`, a metadata-only, RLS-scoped catalog readable only to users who may view that meeting. Only the backend may alter metadata; public/anon read is revoked.
- [x] Linked the verified Drive folder to the existing school-board meeting via business attributes, avoiding hard-coded generated meeting UUIDs. Loaded 10 verified photo names, MIME types and file IDs; **none is automatically set as the cover**.
- [x] Built mobile two-column photo gallery inside the current cover editor, with thumbnail, accessible filename, one-tap selection and confirmation via the existing audited `r2_set_meeting_cover` RPC. Manual Drive URL selection remains an alternative.
- [x] Added restricted `meeting-photo-sync` Edge Function which validates user JWT, active workspace membership, meeting RLS and admin/editor role before listing only the configured Drive folder. It requires an independently managed Google service-account credential and never stores image bytes in Supabase.
- [x] Added folder settings RPC for meetings created later; no blanket Google Drive folder scanning.
- [x] Simplified the overview task card. The full evidence, history and review controls remain available on the full Tasks page.
- [x] Added UX-10 regression tests, refreshed CSS/JS assets and recorded a manual sync setup/runbook.
- [x] Supabase migration executed; catalog readback confirmed 10 items, 1 configured folder, and no anon SELECT access. Edge deployed with JWT enforcement; automated smoke/security test passed.
- [ ] **Google Drive live sync requires** setting secret `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` in Supabase Edge Function Secrets and sharing the chosen Drive folder with the service-account email. The assistant has not provisioned that secret; until then the 10 reviewed gallery items work, while “ดึงภาพใหม่จาก Drive” reports that automatic sync is not configured.
- [ ] Real-device iPhone / Android image rendering, restricted-Drive second-user rights, and manual school acceptance.
- **No photos publicly exposed, no changes to Google Drive sharing, no meeting-status approval/ratification changes, and no actual meeting cover selected automatically.**

## 17. UX-11 — Active assignee picker & submission withdrawal (2026-11-10)
- [x] Replace raw UUID labels for changing task assignees with display names or account emails only; fetch only active staff via an authorized task-reviewer RPC. `private.staff_directory` remains private pre-invitation data and is **never** offered as an assignment target.
- [x] Use meeting-editor scoped active staff choices when creating tasks, avoiding the stale/inactive profiles list. Current project has one active administrator and 10 staff-directory records not yet invited.
- [x] Add **ดึงงานกลับมาแก้ไข** for owners of tasks in `submitted` state. A mandatory reason, task-version check, ownership check and pending-review check precede the return to `doing`; the original submitted record is retained.
- [x] Only reviewers may change task assignees. Disallow reassignment in `submitted`, `approved` or `cancelled` states, require a reason, and append an audit event + progress entry recording old/new assignee. Disable the legacy 3-argument owner RPC so it cannot evade the new required reason.
- [x] Preserve independent task approval: the owner cannot approve their own submission, and approval/rejection is separate from owner withdrawal.
- [x] Add UX-11 frontend and backend source regression tests. Preserve existing meeting, document, Drive and Free-tier workflows.
- [ ] iPhone and Android manual UAT with different owner/editor credentials, since no teacher has been invited and cross-account QA is not available yet. Backend UX-11 RPC migration deployed, version/anonymous-access gates verified without changing any task status.
- [x] The school administrator account now has its full display name set in the private Supabase profile (only if previously blank); the picker falls back to email when a future user has not configured a name.
- **Safety:** no user invitations, Auth account creation, task status mutations or historical-row deletions are part of this release.
