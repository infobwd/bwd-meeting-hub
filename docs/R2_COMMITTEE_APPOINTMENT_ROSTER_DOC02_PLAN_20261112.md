# Committee Appointment Order → DOC-02 Agenda and Minutes Reference
Date: 2026-11-12 | State: plan saved **before code or data changes**
Owner: โรงเรียนบ้านวังด้ง | Workstream: DOC-02 reference integration (not DOC-03 ratification)
Reference: user-provided photographed announcement, สพป.กาญจนบุรี เขต 4, titled “แต่งตั้งคณะกรรมการสถานศึกษาขั้นพื้นฐาน”.

## Current baseline (read-only)
- `docs/MASTER_PLAN.md` v0.2.13 (latest `main` inspected); subsequent UX-12 protected PDF reader and DOC-02 source-rebase behavior must remain intact.
- One board meeting `minutes_review`, 14 physically stored agenda rows (13 active in five sections; 1 retired, preserved).
- `public.minutes` one row: revision 4, status `submitted`. No change authorized to that historical row.
- DOC-02 already contains separately versioned drafts: agenda most recent revision 2 `draft`; minutes most recent revision 1 `draft`. Never overwrite existing document_versions; do not forge an authored revision with an assistant/admin actor.
- Uploaded image describes **nine appointment slots**: eight named individuals + the holder of the school principal's office as board member and secretary. **Appointments do not equal actual meeting attendance**.

## Source interpretation and unresolved verification
- Preserve list order, representation category and appointed committee role from the image. The chair is the first appointee, not an inferred meeting presider. The position-based secretary slot has no personal name in the announcement and MUST NOT be auto-filled with a principal's identity from another source.
- The image appears to indicate a term ending 18 April 2570. The photographed announcement issue date and a few spellings are not clear enough for definitive legal certification; mark the transcription **pending human name/date/source verification**.
- The image remains conversation evidence. Do not claim it has been uploaded to Google Drive, signed/verified by school, or publicly accessible.
- Do not put any individual's personal name, scanned image, Drive ID, meeting ID, Auth ID or unreviewed appointment document into the public repository, tests or plan.

## Data and permissions plan
1. Add immutable, revisioned `public.meeting_committee_appointment_rosters` with meeting-scoped RLS `SELECT` for permitted meeting viewers; explicitly revoke anon and authenticated direct writes; no public RPC for inserting/modifying rosters. The table records reference description, source provenance, term, transcription status and JSON list; scope to one existing school board meeting in a **private conditional data operation**, not seeded via public migration.
2. Execute a one-time **private, transactional, idempotent**, baseline-guarded insert of the nine-slot transcribed roster after migration CI/review, without editing or assigning any real participants, minutes, agenda, decisions or tasks. Distinguish office-holder slot from named person. Record a nonpersonal aggregate audit.
3. DOC-02 authorized view loads most recent roster under RLS. Show in both **ระเบียบวาระ** and **รายงานการประชุม** as a distinct clearly labeled section “รายชื่อคณะกรรมการตามประกาศแต่งตั้ง (ข้อมูลอ้างอิง)” with roles and representation. Do not populate `header.attendees`, `header.chair`, `header.secretary`, `header.recorder` or meeting's `meeting_access` with this list.
4. On editable draft/new draft, copy reference roster into `document_fields.header.appointment_reference` **only when the actual authorized user saves** a new immutable revision through existing `r2_doc02_save_draft`. Existing submitted/reviewed or historical snapshots must render only their own saved content, never silently inherit later sources. Display a notice when an appointment reference is visible but not yet saved into a draft revision.
5. Keep source agenda's 13 active items in five groups and retired history; leave EXT-02, private PDF reader and official report review/ratification unchanged.

## Acceptance and limits
- Source-contract + UI tests with **fictitious** nine-slot roster and office-only secretary; verify appointment ≠ attendance, draft-only prefill, safe escaping, historical version fidelity and zero leak into public repo.
- Check GitHub Actions, PR, Merge and Pages. Verify private import counts/scope and RLS/grants; the caller is not simulated as an authenticated human actor.
- Real secretary/committee sign-off required for spelling, effective dates, school principal identity, participation/absence and actual presider before authoritative DOC-03 issuance.
- No automatic user invitations, notifications, attachment ACL changes or export of endorsed minutes.
