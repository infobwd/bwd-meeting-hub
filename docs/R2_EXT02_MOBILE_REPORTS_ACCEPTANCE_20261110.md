# EXT-02 — External Meeting Mobile Forms & Reports: Acceptance Record
Date: 2026-11-10 | Branch: `feat/ext02-mobile-external-reports-20261110`
Status: Implementation in code; CI and production release gates are tracked separately.

## Scope implemented
1. Keeps the existing 3-tab mobile shell and legacy school-hosted meeting create. Meeting list now has type filters (all/school/external/co-hosted) and a separate **ไปร่วมประชุมภายนอก** action available to active admin/secretary/member accounts. The co-hosted filter is read-only; a dedicated co-hosted create RPC is **not** claimed for EXT-02.
2. A staff member may create an externally-hosted event with topic, host type/name, category, optional meeting date and location. The EXT-01 RPC registers the creator as a participant in **unknown attendance** state, not proof of physical attendance.
3. External detail includes host source, participant role/status, self-confirmation/correction, per-person report and permitted Drive document references. Editing the attendance report is distinct from the host's official minutes.
4. Personal attendance reports: save partial draft, submit for review (requires nonblank summary), withdraw submitted report with mandatory reason until reviewed, and independent meeting-editor review or return with note and version checks. No external report is called ratified host minutes or an internal school decision.
5. Meeting editors can add **active** staff accounts as external participants using `r2_meeting_assignee_options`; one additional person per operation, repeat to add more without creating duplicate meetings. Users in `private.staff_directory` who have not been invited are not candidates.
6. Migration 011 adds two narrow audited RPCs: `r2_ext_set_attendance` (self only, expected-state conflict protection) and `r2_ext_attach_document` (active registered attendee only, not absent, not submitted/reviewed, authenticated meeting visibility). Attached Drive file IDs reuse the existing `meeting_documents` ACL; the original Google Drive permission is **not** modified or bypassed.
7. UX: 360–390px safe wrapping, ≥44px actions, native form sheet, inline error and focus, async roster loading states, no implicit notifications, duplicate report/participant key behavior from EXT-01, and source HTML escaping.

## Files
- `portal.js` and `portal.css`: UI, filtering and report actions.
- `workspace.html`: new asset versions.
- `supabase/migrations/202611100011_external_meeting_ui_actions.sql`: security-gated RPCs only (no data backfill).
- `tests/r2-ext02-mobile-external-reports.test.mjs`: mock-only rendering and SQL contract regression.
- `docs/R2_EXT02_IMPLEMENTATION_PLAN_20261110.md`: pre-implementation scope and guardrails.

## Acceptance matrix

| Scenario | Expected behavior | Status |
|---|---|---|
| Legacy board meeting with 13 topics / five sections | No remapping or deletion | Automated mock tests |
| Member creates own district/network meeting | Own participant registered, no global meeting editor rights | Source/SQL contract, live multi-role test pending |
| Multiple attendees at one meeting | Editor can add active accounts only, repeat without duplicated meeting | Source/SQL contract, multi-user acceptance pending |
| Author edits draft / submits report | Own report only, version-aware | Source-contract and UI tests; live multi-user pending |
| Author withdraws submitted report before review | Reason mandatory, preserve review/audit history | Source-contract; end-to-end role test pending |
| Independent reviewer approves or returns | Cannot approve own report | Mock role UI and server checks; multi-user acceptance pending |
| Attendance unknown/absent/attended | Clearly labeled and self-correctable | Mock UI + SQL conflict checks |
| Google Drive file reference | Parse file URL, metadata scoped; original Drive ACL authoritative | Static contract; private-file live acceptance pending |
| Mobile keyboard/iPhone/Android accessibility | No overflow, focus, 44px targets | CSS + existing automated contract; real-device pending |
| School-approved documents PDF/Docs / co-host create | **Not in EXT-02**; DOC-02/03 and future co-host work | Not implemented |
| Notifications, automated tasks and invitations | Must remain disabled | No new implementation |

## Security and operational release gate
- Never use `meeting_access` as attendance evidence; use `meeting_participations` state.
- Avoid changing existing 5-section agenda display or school-board decisions.
- New RPCs must deny unauthenticated callers and enforce `auth.uid()`, active staff, meeting visibility, own participation and status constraints. New RPCs are `SECURITY DEFINER`, so reviewer must audit source+EXECUTE grants and test real authenticated role denial; CI alone is not acceptance.
- One active account at EXT-01 baseline blocks real independent staff/editor/guest RLS tests. Do **not** create teachers' Auth accounts or send invitations to make tests pass.
- No production go-live until: approved backup/restore, manual iPhone/Android and second-user Drive tests, Supabase Free quotas, school privacy/retention approval and formal document sign-off.
- Drive metadata can be visible to others authorized for the meeting; original document must be shared through Google Drive by its owner to permit opening. Files are not copied into GitHub or made public by the UI.
- If new UI is deployed before migration 011, attendance confirmation and participant document attachment fail safely with a Thai error; migration should be applied before live rollout.

## Next after EXT-02
- **DOC-02:** official document draft preview / A4 mock with school-approved fields (no automatic ratification).
- **EXT-03:** provenance-aware verified external items → school information/consideration agenda → existing task linking without duplicates.
- Separate school-authorized two-account acceptance before official deployment.

**This document does not certify official acceptance by the school or ratification of any meeting.**
