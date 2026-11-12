# BWD Meeting Hub — Master Plan
Version: 0.2.14 | 2026-11-12 | Status: R2 connected to Supabase; UX-05/06 code verified; live role/device release acceptance pending

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

## 18. Planning — Official Documents & External Meeting Participation (2026-11-10)
- **Planning only; not implemented or approved as a final school template.** See [official agenda/minutes standard](R2_OFFICIAL_AGENDA_MINUTES_STANDARD_PLAN_20261110.md) and [external meeting/knowledge transfer plan](R2_EXTERNAL_MEETINGS_AND_KNOWLEDGE_TRANSFER_PLAN_20261110.md).
- Expand supported meeting modes: **school-hosted**, **externally-hosted** (ผอ./ครูไปร่วมประชุมที่เขต/กลุ่มเครือข่าย/โรงเรียนอื่น), and **co-hosted**. An external attendance report is *not* the host's ratified meeting minutes; external directives must never silently become internal meeting resolutions.
- Proposed **six-section** agenda is a **configurable default for new school meetings**, not a legal mandate. Preserve the current UX-02 five-section view, the existing 13 school-board agenda items, all historical minutes, tasks, approval states and RLS unchanged. No auto-remapping.
- Produce compliant formal agenda/minutes draft following the document-standard plan; retain human validation and distinct **administrator review vs committee ratification**. Export to PDF / Google Docs only after permission and formatting acceptance.
- Future external workflow: invitation → attendance by one/many active staff → private evidence-backed report → human review → optionally forward to internal information/consideration agenda or link to an existing task → follow-up with provenance and no duplicate tasks. A meeting invitation does not equal travel approval.
- **Recommended next implementation slice: EXT-00 + DOC-00 (audit/design only).** Verify current DB schema, RLS/RPC, all live user roles, document/Drive access, existing five agenda groups, and school official document/ratification requirements; publish a non-breaking data contract, mobile wireframes, test/rollback criteria. Only then implement EXT-01/DOC-01 behind reviewed migrations.
- Release gates unchanged: multi-account authorization, mobile acceptance, backup/restore, Supabase Free capacity/retention, no automatic account invitations or real notifications. **This documentation commit does not mutate Supabase/Drive or any live meeting/decision/task record.**

## 19. EXT-00 / DOC-00 source audit and screen/document specification (2026-11-10)
- [x] **EXT-00 — audit/design documented:** [R2_EXT00_SOURCE_BASELINE_AND_CONTRACT_20261110.md](R2_EXT00_SOURCE_BASELINE_AND_CONTRACT_20261110.md). Inspected current `portal.js`, source migrations 001–003, current live Supabase schema/table metadata, active migration list, policy/RPC catalog, security-advisor warnings and aggregate row counts **read-only**. Captures non-breaking schema contract, scoped teacher reporting, RLS/permissions, task dedupe, migration/rollback and security test plan.
- [x] **DOC-00 — draft UX/document spec documented:** [R2_DOC00_OFFICIAL_DOCUMENT_UX_SPEC_20261110.md](R2_DOC00_OFFICIAL_DOCUMENT_UX_SPEC_20261110.md). Mode-first phone wireframes, contextual forms, official agenda and minutes (แบบที่ 11) fields, separate external attendance-report/บันทึกข้อความ, review vs ratification, A4 PDF acceptance, error/empty states and accessibility matrix.
- **Confirmed constraints:** `meetings.kind` does not represent hosting mode; `scheduled_on` is date-only; `meeting_access` is authorization, **not attendance**; `agendas.section` and `r2_add_agenda` accept 1–5 only; existing `minutes` is a single text body with admin review but no formal committee-ratification workflow. Preserve the current 13 topic records and all R2/UX-11 behavior. Do not auto-convert external directives into school resolutions.
- **Live review limits:** one active workspace member, so real multi-user role/RLS and live-device acceptance remain pending. Ten private staff-directory entries are *not* Auth accounts; no invitations or accounts created. Security advisors flag authenticated callable SECURITY DEFINER RPCs (many are intentional and guarded; each new RPC needs reviewed execution/authorization rules before release).
- [ ] **School decision gate:** official document template/ratification rules, external-report ownership/reviewer, organization picklist, sign-off and custody policies are *not yet approved*; DOC-00 is a design draft, not a certified official template.
- [ ] **Next recommended engineering work:** EXT-01/DOC-01 specification-to-migration review on a branch after school sign-off; additive schema/RPC only, existing five groups compatible, no existing record overwrite. Then EXT-02 mode-first mobile forms, EXT-03 cross-meeting knowledge→agenda/task links, DOC-02/03 preview and official export. Each step: test, PR, merge, protected backup, negative RLS tests; do not claim production acceptance from CI.
- **This change is documentation-only:** no frontend, Supabase migrations/data, private staff records, Google Drive ACL, task ownership, meeting decision/ratification or notification delivery changed.

## 20. EXT-01 + DOC-01 — Backend contract (2026-11-10)
- **Backend SQL + source tests authored** in [EXT-01/DOC-01 acceptance plan](R2_EXT01_DOC01_BACKEND_ACCEPTANCE_20261110.md): `supabase/migrations/202611100009_external_meeting_participation.sql`, `202611100010_official_document_contract.sql`, `tests/r2-ext01-doc01-contract.test.mjs`.
- **EXT-01:** nullable meeting hosting mode and agency details; a separate attendance/participation register (not meeting ACL); one private external attendance report per participating staff member with save/submit/withdraw/review, version checks, scoped audited RPC. Teachers can register their own external event without global meeting-editor rights. Only active accounts may be participants; no pre-invitation directory used.
- **DOC-01:** optional opt-in `legacy5`/`school6` agenda template per meeting; storage limit now allows section 6 but old RPC still limited to 1–5; explicit `r2_doc_add_agenda` requires `school6` for sixth section. No auto-remap of the existing 13 topics. Structured official-minutes snapshot and ratification evidence tables are **not writable by browser yet**, pending approved school process and DOC-02/03.
- **Release separation:** source and database backend changes do **not** mean screens, PDF/Docs export, committee ratification, authorization testing or school go-live are complete. Keep existing R2 frontend unchanged through EXT-01/DOC-01. Before production use: verify CI, live schema/permissions and backup/restore, independent accounts for negative RLS role tests, school template sign-off.
- **Next:** EXT-02 mode-first mobile forms and DOC-02 official-document draft previews, once backend applied and accepted; EXT-03 evidence-to-agenda/task provenance after, DOC-03 authorized export/ratification workflow after school sign-off.

## 21. EXT-01 / DOC-01 live migration verification (2026-11-10)
- [x] PR [#30](https://github.com/infobwd/bwd-meeting-hub/pull/30) merged; GitHub Actions run 231 passed (`node --test tests/*.test.mjs` / JS syntax).
- [x] Applied additive migration 009 (`ext01_external_meeting_participation_20261110`) and 010 (`doc01_official_document_contract_20261110`) to Supabase Meeting. Confirmed migration history, nullable legacy meeting mode, five new RLS-protected SELECT-only client tables, eight authenticated audited RPCs with **anon execution revoked**, legacy RPCs still available, and agendas section check expanded 1..6.
- [x] Baseline unchanged: 1 meeting, 13 agendas, 1 minutes row, 1 task; new attendance/report/template/minutes-version/ratification tables remain empty. No user invitations, Auth account changes, Drive sharing, old task/decision/status mutations, or official document ratification performed.
- [ ] **Important security acceptance remaining:** 29 authenticated callable SECURITY DEFINER function warnings (21 existing + 8 new); these require per-role and per-meeting negative execution tests when authorized separate accounts are available. Supabase password leaked-password protection remains an unrelated configuration warning. Uninvited staff directory remains private.
- [ ] **Important operational acceptance remaining:** protected backup + restore test, Supabase Free quota/privacy review, iPhone/Android usability, school sign-off on report ownership, template/committee ratification. No production go-live sign-off.
- **Next code slice:** EXT-02 mode-first mobile create/report forms with actual permitted participant picker, report save/submit/withdraw/review, then DOC-02 A4 official document draft preview. Keep EXT-03 cross-meeting agenda/task linking and DOC-03 formal export/ratification separate until review. See [post-deploy verification](R2_EXT01_DOC01_BACKEND_ACCEPTANCE_20261110.md).

## 22. EXT-02 — Mobile external attendance reports (2026-11-10)
- [x] **Source implementation:** [EXT-02 plan](R2_EXT02_IMPLEMENTATION_PLAN_20261110.md) and [acceptance](R2_EXT02_MOBILE_REPORTS_ACCEPTANCE_20261110.md). Existing three-tab workspace now offers explicit school-hosted vs externally-hosted entry, meeting filters, agency detail, actual attendance-state view, author-owned attendance reports, submit/withdraw/reviewer-return flow, and scoped Drive reference attachment.
- [x] Preserves `meeting_access` vs actual attendance distinction, legacy school-board five-group/13-topic display, old minutes/ratification labels and existing R2 task audit. Teachers may register **own** external event, but cannot edit meeting-wide agenda or enroll others; only eligible editors can add other *active* staff with authorized lookup (never preinvite directory). No automatic tasks, host ratifications or notifications.
- [x] Added `supabase/migrations/202611100011_external_meeting_ui_actions.sql` with two narrowly authorized audited RPCs for own attendance confirmation and participant's Drive reference. No direct table DML permission. New tests use invented mock people, not live personal information.
- [x] **Backend deployment + initial CI verified:** migration `20261110160217 ext02_external_attendance_ui_actions_20261110` applied to Supabase Meeting; read-only catalog confirms `anon` cannot EXECUTE the two new RPCs, authenticated users require server-side checks, and data counts remain 1 meeting / 13 agendas / 1 minutes / 1 task with 0 external reports. GitHub Actions run 249 passed for the code branch; final PR merge status tracked in [EXT-02 acceptance](R2_EXT02_MOBILE_REPORTS_ACCEPTANCE_20261110.md).
- [ ] **Live acceptance not complete:** real independent-account RLS, iPhone/Android use, restricted original Drive-file access, privacy, backup/restore and school official acceptance remain required. The Supabase definer lint count rose to 31 (two new guarded endpoints); manual role execution tests remain mandatory.
- [ ] **Next slices:** DOC-02 official document drafts/previews and EXT-03 verified external-to-internal agenda/task continuity. Co-hosted creation, formal PDF/Google Docs ratification/export and notifications remain separate.

## 23. EXT-02 release verification (2026-11-10)
- [x] [PR #32](https://github.com/infobwd/bwd-meeting-hub/pull/32) merged: `b81eba8b698fabcf222720ccb4c28750ce60d3cd`.
- [x] Source + regression GitHub Actions `main` run **255** successful. GitHub Pages `pages build and deployment` run **26** successful for the same commit. Verified `portal.js`, `portal.css`, `workspace.html`, migration 011, tests and docs available on `main`.
- [x] Backend RPCs in Supabase Meeting already deployed (`20261110160217 ext02_external_attendance_ui_actions_20261110`); anon EXECUTE denied, authenticated scoped server checks enforced in function source. Existing meeting/agendas/minutes/task counts remained unchanged.
- [ ] **Not yet production accepted:** actual independent signed-in staff/editor/guest negative RLS tests, Google Drive access with multiple accounts, real iPhone/Android tablet UAT, backup/restore and school privacy sign-off. Do not mistake green CI/Pages for these release gates. Security advisor still lists 31 authenticated definer functions for manual review.
- [ ] **Next:** DOC-02 A4 draft official-document preview and EXT-03 verified external knowledge → internal agenda/tasks linkage, keeping committee ratification, co-hosted creation and real notifications in separate gated slices.

## 24. DOC-02 two-document drafts and A4 previews (2026-11-10)
- **New verified requirements before code:** [R2_DOC02_REVISED_REQUIREMENTS_AND_IMPACT_20261110.md](R2_DOC02_REVISED_REQUIREMENTS_AND_IMPACT_20261110.md). Preserve the school board's existing **13 agendas / five sections**, and **original minutes revision 4 in submitted state**, without writing proposed agenda item corrections from chat to production. Committee chair, actual secretary and recorder are independent meeting-specific roles, separate from personnel office titles; their names/appointment authority must be verified by the school.
- **Implementation:** [R2_DOC02_TWO_DOCUMENT_DRAFTS_ACCEPTANCE_20261110.md](R2_DOC02_TWO_DOCUMENT_DRAFTS_ACCEPTANCE_20261110.md). Added separate structured version streams for (a) premeeting agenda and (b) after-meeting minutes (Clause 25 / Form 11), sharing the same source agenda IDs/titles/notes. Each source item can hold acknowledgment, draft resolution, pending proposal and suggested directives independently; **none** are automatically ratified or assigned as tasks.
- **Draft lifecycle:** append-only revisions with `draft / submitted / returned / reviewed` and admin independent review; no DOC-02 RPC supports `ratified` and existing `minutes` row remains untouched. Mobile-first editor, restricted authenticated access, A4 visual preview and an unmistakable not-certified watermark. No official PDF/Google Docs exports or signatures (DOC-03 only). Older five sections remain; new optional six-section template still opt-in for new meetings.
- [x] Supabase migration `20261110164032 doc02_separate_agenda_minutes_draft_versions_20261110` applied; before/after counts **1 meeting, 13 agendas / 5 sections, one minutes row version 4 submitted, one task, 0 new document drafts, 0 ratifications**. Two version tables have RLS and SELECT-only client grants; three scoped authenticated RPCs disallow anonymous EXECUTE. Existing definer warning count 34, not a completed penetration test.
- [x] Source changes isolated to DOC-02 module, portal buttons, dialog/CSS, additive SQL, source tests and documentation; EXT-02 external reporting paths left intact. Live publication/merge/CI status tracked in DOC-02 acceptance document and PR.
- [ ] **School release blockers:** Verify actual committee appointment order and acting-chair/secretary/recorder roles, the 13 agenda details and pending corrections in authorized documents, independent account RLS, restricted Drive access, true mobile A4 layout, backup/restore/privacy, and DOC-03 ratification/signature/official export workflow. Never auto-mark minutes approved.
- **Recommended follow-up:** DOC-02 mobile/secretary sign-off using non-production test data; after approval, DOC-03 official document lifecycle; EXT-03 source-backed information→agenda/task linkage separately, without duplicate tasks.

## 25. DOC-02 post-merge and Pages verification (2026-11-10)
- [x] [PR #34](https://github.com/infobwd/bwd-meeting-hub/pull/34) merged into `main` at commit `71c59b4dc53c080749783ac01b001028019a92da`. Feature-branch checks run **280**, merge-commit checks run **281**, GitHub Pages deployment run **28**: all successful.
- [x] Applied DOC-02 additive migration `20261110164032 doc02_separate_agenda_minutes_draft_versions_20261110`; read-only verification after merge confirms original **13 agenda items in 5 sections**, previous minutes **revision 4 in submitted status**, 1 meeting, 1 task, **0** new DOC-02 agenda/minutes draft rows, and **0** ratifications. No production school-board meeting records, user accounts, invitations or source documents changed.
- [x] Only authorized meeting-editor staff may create separated append-only agenda/minutes draft snapshots; independent admin can review, but DOC-02 cannot ratify, sign, officially issue or auto-assign meeting outcomes. Draft A4 visual preview is watermark-marked and linked to source agenda records; legacy report state remains distinct.
- [ ] Still pending: independently authenticated multi-role security tests, real iPhone/Android and PDF/A4 layout proof, school appointment-order/acting-chair and committee-procedure verification, backup/restore, protected Drive rights, and formal DOC-03 sign/ratification/export. No official school acceptance implied by GitHub Pages success.
- Follow-up details: [DOC-02 acceptance](R2_DOC02_TWO_DOCUMENT_DRAFTS_ACCEPTANCE_20261110.md). Subsequent work should prioritize **secretary-led DOC-02 mobile/document acceptance** and **DOC-03 design/security approval** before enabling authoritative output; EXT-03 external-to-internal topic/task continuity remains independently scoped.


## 26. Audited correction of a legacy school meeting agenda source (2026-11-10)
- **Design / rollback documented:** [R2 agenda correction plan](R2_AGENDA_SOURCE_CORRECTION_PLAN_20261110.md); no real meeting text, participant names, or private documents in this public repository.
- **Implementation branch:** additive nullable `agendas.retired_at`, private append-only before/after snapshot and DOC-02 effective-source validator; browser only queries active agendas. Saved DOC-02 versions remain immutable. A stale editable draft can be rebased on the active topic list while retaining author-entered content for unchanged topic IDs; an explicit confirmation is required before saving a new revision.
- **Data operation is a separately gated step:** one authorized conditional private Supabase transaction after code/migration rollout, keeping the original withdrawn topic (retired, never deleted), preserving all old document revisions and independently submitted legacy minutes. The visible agenda target is 13 active items across the original five groups; physical history may include additional retired rows. No automatic decisions, tasks, ratification or live notifications.
- [x] PR #36 (feature) and PR #37 (asset refresh) merged; branch checks 295 and 300 passed. Additive migration applied, conditional private correction completed. Read-only verification: 14 stored / 13 active / 1 retired topic in five groups; one protected correction snapshot and 14 audit entries. Prior DOC-02 draft remains version 1; legacy minutes remain version 4 / submitted; meeting remains minutes_review; 0 ratifications/decisions and one task link unchanged. See the execution log in the [correction plan](R2_AGENDA_SOURCE_CORRECTION_PLAN_20261110.md).
- [ ] Real secretary/admin/unauthorized-account tests, iPhone/Android A4 acceptance, backup/restore and official school sign-off remain required.

## 27. DOC-02 mobile UX refinement and iPhone screenshot findings (2026-11-10)
- [x] [UI impact plan](R2_DOC02_MOBILE_UX_REFINEMENT_PLAN_20261110.md) **recorded before source changes**. Root causes: mobile 47%/53% vertically split panes leave blank space and make A4 preview hard to reach; display prefixes create doubled `5.2 — 5.2` labels; long A4 drafts lack clear draft-page boundaries.
- [x] [Mobile refinement acceptance](R2_DOC02_MOBILE_UX_REFINEMENT_ACCEPTANCE_20261110.md): DOC-02 mobile/tablet now uses a `แก้ไขข้อมูล / พรีวิว A4` toggle with one visible pane and reachable save actions; desktop keeps two-pane layout. Status/legacy minutes chip compact and separately labeled. Button label shortened to `บันทึกร่าง`; meeting number needs a verified source, never inferred from unapproved notes.
- [x] **Render-only de-duplication:** `item.title` that starts with its matching displayed section-local number no longer repeats it. No change to stored agenda title, position, section or 13 **active visible** topics in five groups; one additional retired historical row remains protected. All document versions remain separate and old minutes revision 4 `submitted` is never overwritten by these UI changes.
- [x] Draft A4 preview shows approximate page boundaries and repeated not-ratified watermark; each agenda item kept whole, exceptionally long items allowed to expand instead of clipping. Mobile preview offers fit-width/enlarged reading. Exact duplicated Thai meeting date suffix is hidden in preview heading only, not modified in stored title. **Not an official print/PDF paginator:** final physical A4, signatures, certification, issue/distribution remain gated DOC-03.
- [ ] **Rebased branch CI / PR / Pages** must be verified against the latest source-correction code. The original isolated branch passed CI run 313, but this status alone does not validate integration. Real iPhone Safari / Android Chrome and long, multi-page Thai-language content remain separate acceptance gates. No schema migrations, data writes, user invitations or Drive ACL changes in this slice. Legacy EXT-02 remains available.
- **Next:** inspect UI on phone and verify the 5.2 label, report editor save, and multi-page preview with real authorized test account (without changing board meeting data); then schedule DOC-03 design/approval separately.
- **Integration with corrected agenda source:** PR #36/#37/#40 have already established 14 stored / 13 active / 1 retired agenda topics and an earlier DOC-02 draft revision 1. This UI slice preserves the retired row and existing `sameSource`/`alignDraftToSource` source-change confirmation. No new draft or meeting data is created by the UI changes.

## 28. DOC-02 mobile refinement release verification (2026-11-10)
- [x] UI PR [#41](https://github.com/infobwd/bwd-meeting-hub/pull/41) merged at `4b64c70321257763e773cf3986042d9e87566ee3`. Rebased feature CI run **323**, PR check run **324**, `main` checks run **325** and GitHub Pages deployment run **33** all succeeded.
- [x] Verified DOM/UI includes one-pane mobile `แก้ไขข้อมูล / พรีวิว A4`, accessible zoom, compact independent document states, readable draft A4 approximate page splitting, duplicate 5.2 heading suppression and verified-number guidance. Existing source-correction `sameSource`/`alignDraftToSource` guards retained. No schema migration/meeting write in this change.
- [x] Read-only Supabase snapshot: **14 stored / 13 active / 1 retired** agenda rows, five active sections, legacy minutes revision 4 `submitted`, 2 DOC-02 agenda drafts, 1 DOC-02 minutes draft and **0 formal ratifications**. Counts of private drafts can change with authorized user activity; the frontend PR did not create or edit them.
- [ ] **Actual acceptance not complete:** iPhone Safari and Android Chrome manual testing of editing, saved revisions, screen zoom, keyboard/safe area, 13 real visible items, multipage Thai A4 and old draft reconciliation; independent-account RLS, confidential Drive permissions and certified PDF/signature/committee ratification remain gated for DOC-03.
- See [DOC-02 mobile refinement acceptance](R2_DOC02_MOBILE_UX_REFINEMENT_ACCEPTANCE_20261110.md). Future UX fixes must preserve the audited historical retired agenda entry and distinct review/ratification states.


## 29. UX-11 — Latest attached meeting documents, safe link retirement (2026-11-11)
- [x] [Implementation plan](R2_UX11_CURRENT_MEETING_DOCUMENTS_PLAN_20261111.md) recorded before code/data changes.
- [x] Additive `meeting_documents.archived_at` retains historical reference records but hides retired links from authenticated RLS readers; `private.can_view_meeting` remains required, including the existing meeting-pdf Edge Function's RLS lookup. No anonymous visibility is granted.
- [x] R2 signed-in workspace loads only active links and offers a one-tap latest-document action, leaving the former PDF reader and original Google Drive link fallback intact.
- [x] Migration applied; conditional private transaction archived 15 legacy meeting-document references and registered one verified newest private PDF. Readback: 16 total / 15 archived / 1 current, 16 audit events; original Drive files and all meeting/task/ratification states preserved. No document IDs published in the repository.
- [ ] Verify privately held Google Drive documents with two independently authorized accounts. The existing `meeting-pdf` server cannot stream owner-only Drive files through public Drive download URLs, so signed-in Supabase access alone does **not** guarantee in-app bytes; direct Drive Preview needs its own ACL.
- [ ] Complete independent-account editor/member/guest/blocked negative RLS checks, iPhone/Android verification, backups, school privacy sign-off and DOC-03 official issue/ratification before production acceptance.

## 30. UX-12 — Read private minutes PDF in the authenticated meeting page (2026-11-11)
- [x] [UX-12 plan](R2_UX12_PRIVATE_MINUTES_READER_PLAN_20261111.md) recorded before implementation, with private-copy security and rollback rationale.
- [x] [Implementation and acceptance](R2_UX12_PRIVATE_MINUTES_READER_ACCEPTANCE_20261111.md): existing JWT/RLS-authorized `meeting-pdf` endpoint reads a verified private backend copy for a selected current minutes file. The UI offers **เปิดรายงานการประชุม** and renders using existing PDF.js; it does not require public-link Drive access when that protected copy is available.
- [x] Private PDF copy imported from the owner-only source with 37 verified chunks and 1,302,323 decoded bytes, SHA-256 matched; no file contents or private Drive IDs committed to GitHub.
- [x] Database protection confirmed: RLS enabled; `anon` and `authenticated` lack direct SELECT on the private-content tables; service_role may read only from backend. Original Google Drive ACL unchanged.
- [x] UX-12 PR #47 merged; feature GitHub Actions run **338**, main run **339** and GitHub Pages deployment run **37** passed. Supabase `meeting-pdf` Edge Function upgraded to active **version 2**, `verify_jwt=true` and verified against deployed code. Private content table RLS/browser SELECT denied; the previously checked PDF remains ready.
- [ ] **User acceptance still pending:** real authorized and unauthorized login tests, mobile PDF viewing, backup/restore, retention/privacy sign-off; a code or PDF deployment is not committee ratification. The document remains a draft pending official DOC-03 review/approval flow.

## 31. Committee appointment evidence for DOC-02 agenda and minutes (2026-11-12)
- User provided a photographed appointment announcement of the school's nine-seat basic education committee: eight named appointees and the school-director **office-holder** as member/secretary. **This does not establish real attendance**, the actual presider, the actual recorder or legal approval of any meeting.
- [x] [Evidence-to-UI plan](R2_COMMITTEE_APPOINTMENT_ROSTER_DOC02_PLAN_20261112.md) recorded before development; names, private image, signed order and Auth identifiers are not inserted into the public repository.
- [x] [Implementation/acceptance](R2_BOARD_APPOINTMENT_ROSTER_DOC02_ACCEPTANCE_20261112.md): protected, revisioned committee-appointment roster storage with meeting-scoped RLS; both DOC-02 draft agenda and draft minutes can display the committee roster **as an explicitly labeled reference appendix**. Does not auto-populate attendees/chair/recorder or rewrite existing submitted/reviewed snapshots. New snapshots include an appointment reference only when a permitted editor explicitly saves a new draft.
- [x] New database migration source `supabase/migrations/202611120001_committee_appointment_roster_reference.sql`; user-provided person data must be imported separately and privately after code review, preserving clear `transcribed_pending_verification` status. Image file remains in chat unless separately uploaded to the authorized private document store.
- [ ] Verify CI, merged PR, deployed Supabase migration, scope-limited private roster import, GitHub Pages and post-import read-back **independently**; do not infer completion from writing code alone.
- [ ] Before official DOC-03 issuance: school checks the original appointment order, ambiguous spellings and issued/effective dates, actual principal identity, attendees/absentees, acting chair, minute-taker, quorum, signing and ratification. Current historical report v4 `submitted` and the source-corrected 13 active/five-group agenda must remain untouched.
