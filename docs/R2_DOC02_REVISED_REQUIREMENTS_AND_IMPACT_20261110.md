# DOC-02 — Two-document Drafts and A4 Preview: Revised Requirements
Date: 2026-11-10 | Status: **requirements and implementation plan recorded before code changes**
Supersedes portions of DOC-00/DOC-01 where more specific. Related: [MASTER_PLAN](MASTER_PLAN.md), [DOC-00 specification](R2_DOC00_OFFICIAL_DOCUMENT_UX_SPEC_20261110.md), [DOC-01 backend](R2_EXT01_DOC01_BACKEND_ACCEPTANCE_20261110.md), [EXT-02 acceptance](R2_EXT02_MOBILE_REPORTS_ACCEPTANCE_20261110.md).

## 1. Verified baseline and preservation
Read-only Supabase check on 2026-11-10: one `board` meeting (`meeting_mode=NULL` legacy); **13 agendas across five sections**, one **minutes version 4 in `submitted` status**; one task. DOC-01 structured minute snapshots and ratification evidence tables empty. Preserve meeting, all agenda titles/section/position, previous minutes body/version/status, tasks, decisions, meeting-access and Drive docs **byte-for-byte**; do not create sample rows in production. The proposed changes/corrections to specific agenda subitems for meeting 1/2569 on 10 November 2569 are **under human review in another chat**. Treat them as *pending source material*, not authorization for SQL updates. Do not copy its sensitive internal textual details into public repository test fixtures.

## 2. Documents have different purposes, versions and status
- **Agenda document** (before meeting): meeting header, ordered sections/subitems, title, current agenda notes/background, additional context/source documents and questions/proposals for deliberation. Default 5 sections for the legacy board meeting; 6 only when a **new meeting** selects `school6`; no automated conversion.
- **Minutes document** (after meeting): 11 fields under correspondence regulation Clause 25 / Template 11: name, meeting number, date, venue, attendees, absentees, observers, start time, per-item substance/consideration/conclusions, end time, actual recorder. This must distinguish committee member/office position from actual per-meeting roles.
- Two **separate** append-only version streams: `agenda` and `minutes`, each `draft → submitted → reviewed` or `submitted → returned`; no `ratified` transition in DOC-02. A review is administrative, not committee ratification. Do not update `public.minutes` legacy row on any DOC-02 action.
- Each agenda item can contain multiple simultaneous outcome types: information/acknowledgment, *unratified draft* decision, pending proposal, directive and task suggestion, plus substance and deliberation. These are **draft fields in a minute snapshot**, not `public.decisions` or `public.tasks`; no automatic approval/assignment.
- One shared source meeting + agenda IDs for both document types; snapshots capture source titles/notes/ordering for reproducible historical versions. An old snapshot does not rewrite source agenda data, and newer source changes do not retroactively rewrite a saved version.

## 3. Roles, identity and evidentiary constraints
- Committee chair/committee secretary and **actual minute-taker** are separate editable per-meeting fields; never infer from `workspace_members.role` or staff job title. School has supplied informal chair/secretary names, but official names/titles **must be checked against appointment order** before an approved/ratified copy; do not embed personal names in public code or mock fixtures or auto-fill as verified.
- Acting chair must be an explicit entry based on actual presiding person and legitimate committee procedures, not inferred from school principal role.
- For user-facing drafts, display "ร่าง/รอตรวจ/ตรวจทานแล้ว" explicitly and show old `minutes.version=4 submitted` as an **independent legacy document state**. No fake signatory, seal, quorum or ratification date.
- A4 preview is a **browser visual draft preview**, with watermark "ฉบับร่าง — ยังไม่ใช่เอกสารรับรอง" and no official PDF/Docs export, signing, distribution or archival; DOC-03 is deliberately excluded.
- The 6-section template is selectable only for meetings with no preexisting agenda, as per DOC-01; existing 13 topics remain five-section.

## 4. Planned implementation (in this branch)
1. New additive SQL contract: separate agenda-document revisions, extend structured minutes revision status to include `submitted`/`returned` without altering existing records, append-only versioned RPC save/submit/review; independent reviewer and per-meeting editor role checks; RLS SELECT-only and anon EXECUTE denied. No system-created meeting, agenda, task or document rows.
2. A standalone `doc02.js` module for view/editor on phones and A4-style preview, used only on **school-hosted/legacy/co-hosted** meetings with meeting-editor permission. Support source agenda categories without reordering, original notes, supporting documents, and per-item structured outcomes. User can leave a draft incomplete; a submitted document needs a human review and explicit independent reviewer.
3. Integrate into `portal.js`, `workspace.html`, and CSS with mode-specific buttons, version/status metadata and legacy report warning, without replacing existing UX-11/EXT-02 pathways. Account and meeting context always scoped; no cross-meeting data in UI.
4. Add automated pure render/source-contract tests for all 13/5 legacy agenda items, six-section new template sample, multiple outcome types, old minutes v4 submitted unchanged, XSS escaping, mobile layout/A4 preview, and security guardrails.
5. Branch → PR → CI → merge, apply reviewed additive migration to Supabase before new UI becomes active, verify only new tables and RPCs added, all baseline aggregate counts and historical version/status unchanged. Log change explicitly in MASTER_PLAN.

## 5. Exclusions / release gates
- **No edits to the real school-board meeting or its minutes**, no application of unreviewed corrections to items 1.2/1.4/3.1/3.2/4.2/4.3/4.4/5.1. Draft preview must display whatever the authorized database currently contains.
- No use of uninvited teacher roster, new accounts, invitations or notifications. No moving information from external meetings into tasks (EXT-03).
- No claim of compliance/signature/official approval until school verifies appointment orders, quorum, template layout, and approval process (DOC-03).
- Independent logged-in admin/secretary/editor/guest negative RLS, actual iPhone/Android, private Drive permissions and backup/restore verification remain required prior to official use.

Source for Template 11 fields: ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 ข้อ 25 (และฉบับแก้ไขเพิ่มเติม), accessible via https://www.lawreform.go.th/uploads/files/1678240071-b99vw-cbccp.pdf .
