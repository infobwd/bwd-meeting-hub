# EXT-00 — Baseline Audit & Non-breaking Contract for External Meetings
Date: 2026-11-10 | Status: **Source/live-read audit completed; DESIGN ONLY, no production implementation**
Owner scope: BWD Meeting Hub / โรงเรียนบ้านวังด้ง
Related: [MASTER_PLAN](MASTER_PLAN.md), [External Meeting Plan](R2_EXTERNAL_MEETINGS_AND_KNOWLEDGE_TRANSFER_PLAN_20261110.md), [DOC-00 specification](R2_DOC00_OFFICIAL_DOCUMENT_UX_SPEC_20261110.md).

## 1. Evidence and methodology
Read-only audit of the **current main branch** `portal.js`, `workspace.html`, `portal.css`, `supabase/migrations/202611100001_core.sql`, `202611100002_security.sql`, `202611100003_operations.sql` plus UX-02/UX-11 and plan docs. Compared with **live Supabase Meeting** schema/table metadata, migration history, policy/function catalog, aggregate row counts and security advisors. No personal records, emails, raw minutes, task descriptions, file IDs or meeting attachment URLs copied into this public document. No live writes or role impersonation tests.

Live baseline (aggregated **at audit time**, counts can change): 1 meeting, 13 agenda entries, 1 minutes row, 0 decision rows, 1 task, 1 task–meeting link, 1 meeting-access record, 1 active workspace member, 10 *private pre-invitation* staff-directory entries. Latest applied migration in the live list: `ux11_task_assignment_withdrawal`. All 14 observed `public` tables and `private.staff_directory` report RLS enabled. `private.staff_directory` has no SELECT policy (expected private staging; review privileges rather than weakening it).

**Limits:** This is a catalog/source audit, not an independent multi-user RLS penetration test, live browser QA, school approval of templates, backup restore verification or legal sign-off.

## 2. Findings grounded in source and live schema

| Priority | Observed current state | Why external meetings / official documents need more |
|---|---|---|
| P0 | `meetings.kind` is content category (`board/teacher/management/working/community/other`), not hosting mode. `meetings` has title, **date only** (`scheduled_on`), location, status, but **no host organization**, start/end clock time or meeting mode. | Need independent hosting mode, host, participants and optional times; never treat `community` as necessarily co-hosted. |
| P0 | `meeting_access` is an ACL of `editor/attendee/guest` for existing authenticated members; `r2_add_access` checks active member. It is **not an attendance register**. | Store actual attendance/role per person independently of access. Multiple teachers at one external event must not cause duplicate meetings. |
| P0 | `private.can_create_meeting` allows admin/secretary; `private.can_edit_meeting` requires admin or per-meeting editor. `r2_create_meeting` matches this. | A teacher reporting an external event needs a new *narrow, scoped* authorized flow; do **not** give all teachers generic meeting-editor access. |
| P0 | `agendas.section` has check 1..5; `r2_add_agenda` checks 1..5; `portal.js` has five section labels and selector. UX-02 preserves 13 topics in five groups. | Six sections require coordinated schema/RPC/UI/template migration. Do not silently renumber the 13 existing topics. |
| P0 | `minutes` is **one text body per meeting**, `status=draft/submitted/approved` and version; `r2_review_minutes` is admin review, not committee ratification. | Need structured *official minutes* fields, separate explicit ratification evidence, and external attendance-report entity. Keep existing text minutes intact. |
| P1 | `decisions` is unique on `agenda_id` and `r2_record_decision` stores one free-text body; current UI labels this a provisional conclusion. | One agenda may have distinct information, proposal, resolution, directive and tasks. Avoid repurposing decision status to mean host approval. |
| P1 | `task_meeting_links` uses composite PK (`task_id,meeting_id`), one optional `agenda_id` per task–meeting pair, link_kind origin/followup. `r2_link_task` already reuses tasks. | Reuse this link for event-to-task dedupe; if one task maps to several agenda items in the *same meeting*, consider provenance detail table, not a breaking PK change. |
| P1 | `portal.js` new-meeting form only asks title/kind/date/location; agenda form one notes field; minutes form one textarea; print outputs a browser page with Tahoma, not a formatted แบบที่ 11. | Mode-first mobile form, reporting workflow, explicit official-document preview and A4 export are future work. |
| P1 | Live policies are SELECT-permitted-meeting/assigned-task; client writes via authenticated `SECURITY DEFINER` RPC. No anon EXECUTE observed for `r2_*`; 21 exposed authenticated definer functions are listed in security advisor warnings (requires manual audit, not automatic evidence of a vulnerability). | Never grant blanket EXECUTE or add unguarded definer functions for external reports. Check `auth.uid()`, membership, role/scope, grants, search_path and audit logs. |
| P1 | Document links/photos are permission-scoped; UX-10 photo gallery and Drive sync have separate credential/setup gates. | External invitation and host PDF may be more restrictive; keep metadata + original Drive ACL, not public copies. |
| P1 | Only 1 active membership; 10 private pre-invite teacher rows are **not active users**. | End-to-end attendee/reviewer/guest role tests not yet possible with separate authorized accounts. Do not create/invite automatically. |

### Important non-equivalences
- `kind=community` does not prove `meeting_mode=co_hosted`.
- Meeting access/role does **not** prove a person attended.
- `minutes.status=approved` proves internal review only, not report ratification by committee.
- External host's directive is neither a resolution of the school's meeting nor a school-issued authorization to travel.
- A Drive link is neither public distribution permission nor authenticated access proof.

## 3. Proposed extension contract (NOT executable SQL)
Choose additive schema with **optional/nullable fields for legacy meetings**, avoiding assumptions about old `community` records:
- `meetings.meeting_mode` as separately validated `school_hosted | externally_hosted | co_hosted`. Preserve legacy values as `NULL`/unknown until deliberately classified; new creation UI supplies explicit mode. Do not default/backfill every old record to school_hosted without confirming meaning.
- `meetings.host_organization_name` (optional sanitized text), `host_kind` (area/network/school/other), optional `starts_at`/`ends_at` and `source_invitation_ref` with timezone semantics; retain `scheduled_on` for old clients. Confirm handling when date/time are unknown. Do not infer time from date.
- `meeting_participations` (meeting id, active user id, participation role, attendance status, joined/left if known, version, unique meeting+user). **Different from `meeting_access`**. Named external guests require separate approved invitation path and least privilege.
- `external_attendance_reports` (meeting id, author id, content sections, draft/submitted/reviewed/returned, reviewer, version, timestamps; supporting evidence references). Decide one report **per participant** vs a shared consolidated report with contributions in EXT-01; preserve provenance either way.
- `external_report_items`: information/proposal/action_requested/follow_up/no_action + source report, evidence anchor, verified status, reviewing actor, linked internal agenda/task. Do not create actual decision rows on receipt of a report.
- `meeting_document_references` or reuse current `meeting_documents` after verifying type/visibility; no forced copy from Google Drive. 
- A future official-minutes structured detail entity or versioned document snapshot can coexist with legacy `minutes.body` (do not destructively split or overwrite). Preserve individual approval/ratification evidence in separate records.
- Agenda templates: prefer `agenda_template_version` + configurable section labels per meeting over global rewrite. **Do not expand DB 1..5 until UI and RPC are deployed together**; explicit handling of old group numbers.

### Read/write route strategy
Keep old `r2_create_meeting`, `r2_add_agenda`, `r2_save_minutes`, and task RPC signatures working. Add **versioned** narrow functions for creating external-event records, adding participation, own attendance report submission/withdrawal (only before review), reviewer action and linking verified items. Do not retrofit broad write grants onto base tables. Every write requires scope checks, optimistic version checks when applicable, provenance, audit event and idempotent linking.

## 4. Role/action matrix — target, subject to school sign-off

| Action | Admin | Secretary (scoped) | Teacher attendee | Guest |
|---|---|---|---|---|
| Create school-hosted meeting | Yes | Yes | No (unless explicitly delegated via new approved role) | No |
| Register an external meeting | Yes | Yes | Proposed: create **own attendance draft only** or request registration; no global editor rights | No |
| View external event | Allowed by school scope | Only permitted meeting | Own/permitted meeting | Only explicitly shared |
| Submit own external report | If participating | If participating | Yes, if registered as attendee | No by default |
| Edit another reporter's draft | Only designated reviewer if workflow requires; prefer return for correction | No by default | No | No |
| Review/return external report | Authorized designated reviewer | Only if appointed | No | No |
| Push information into school agenda | Admin/editor of target meeting | Target meeting editor | Propose only | No |
| Assign/link task | Existing reviewer/editor controls | Existing scoped controls | No direct assignment without permission | No |
| Ratify official committee minutes | **Not an automatic admin approval**; evidence of authorized committee procedure | Prepare and record evidence | No | No |

## 5. Risk register and controls
- **P0 — authority confusion:** UI/status labels distinguish host's report, attendance report, administrator review and committee ratification.
- **P0 — data isolation:** RLS on every new exposed table; explicit SELECT/INSERT/UPDATE grants; avoid direct client DML; approve SECURITY DEFINER functions only after line-by-line role/ACL review; no `user_metadata` authorization.
- **P0 — legacy agenda and record loss:** verify baseline counts and IDs in private test; migration additive, no DELETE/no silent section rewrite, rollback before data conversion.
- **P1 — duplicate tasks:** source-item unique idempotency key, look up existing task, reuse task–meeting links, preserve audit. Same task linked to multiple meetings should not increase data visibility unexpectedly.
- **P1 — Drive privacy:** keep file ID and permission-scoped metadata only; never expose host-private documents in public GitHub fixtures.
- **P1 — credentials/quotas:** Supabase Free, backups and retention; invitation and notification delivery remain disabled.
- **P1 — testing blockage:** 1 active user cannot prove cross-account RLS; record as blocked until authorized role accounts exist.
- **P2 — date/time accuracy:** no mandatory fabricated times, timezone consistency Asia/Bangkok and date-only backward compatibility.

## 6. Implementation gate / rollback proposal
1. **EXT-00 complete as an audit deliverable** when this document is merged; EXT-01 remains **not authorized by audit alone**.
2. School confirms who may register external events, report ownership, reviewer roles, list of agency labels, and retention/approval workflow.
3. Draft backward-compatible migration with before/after schema query and data snapshots **in a private, protected environment**, then peer review and test; no personal fixtures in repo.
4. Preserve old RPC signatures and current frontend for existing meetings; migrate behind feature flag; run negative RLS/anon/user-role cross-meeting and optimistic-concurrency tests.
5. Rollback: disable new entry UI/RPC first, preserve new data privately, restore database from verified backup only with explicit recovery plan (do not drop new records as a rollback shortcut).
6. Acceptance: at least admin + secretary + attending teacher + unauthorized guest (independent authorized accounts), one multi-attendee event, report submit/return/withdraw, duplicate-task prevention, offline/mobile, PDF/Drive ACL, negative read/write tests, 13-agenda preservation.

## 7. Completion checklist
- [x] Compared live schema/migrations, row counts, RLS/policy and RPC catalog with source
- [x] Mapped current UI and workflow coupling to new modes
- [x] Proposed non-breaking contract, roles, risk register and migration/rollback acceptance
- [ ] School approval of role/host/report ownership rules
- [ ] EXT-01 migration/RPC implementation and security tests
- [ ] Independent live multi-user role tests / device UAT / backup-restore gate

**No production schema, functions, rows, account privileges, Google Drive ACLs, notifications, meeting decisions or task states changed in EXT-00.**
