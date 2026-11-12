# Committee Appointment Roster — DOC-02 Reference Acceptance
Date: 2026-11-12 | Scope: evidence-based appointment reference for existing board meeting
Source plan: [R2_COMMITTEE_APPOINTMENT_ROSTER_DOC02_PLAN_20261112.md](R2_COMMITTEE_APPOINTMENT_ROSTER_DOC02_PLAN_20261112.md)

## User's source and interpretation
The supplied photographed appointment announcement from the local primary education area office lists nine committee positions: **eight persons named in the document, plus one school-director office-holder slot** as member and secretary. The appointed chair is listed; actual meeting chair and recorder are still fact-dependent.

Because the photo is a scan and some spellings and the handwritten issue date are not independently verified, transcription data is stored as `transcribed_pending_verification`. The stated term end appears to be 18 April 2570. The photograph has **not** been uploaded from chat into Google Drive or made publicly accessible.

**Do not conflate:**
- Appointment to the board ≠ recorded physical meeting attendance, quorum or proxy representation.
- Appointed board chair ≠ automatic presider at each particular meeting.
- Director's office designated as board secretary ≠ proof of the director's full legal name or who recorded the minutes.
- A draft version with a source reference ≠ approved, signed or ratified minutes.

## Backend and data change
- Migration `202611120001_committee_appointment_roster_reference.sql`: add immutable, per-meeting revisioned `meeting_committee_appointment_rosters`, source metadata, verification status and JSON roster; enable meeting-scoped RLS. Authenticated meeting viewers have read rights subject to RLS; `anon` no read and no browser direct writes.
- **No names or image bytes are stored in GitHub**. A separately authorized private data import, after code review and migration, will store the transcription for the existing board meeting with proof state `pending`, transactionally and idempotently.
- No changes to `meetings`, `agendas`, historical `minutes`, `decisions`, `tasks`, legacy `meeting_access`, Auth users, Google Drive ACL or DOC-02 snapshot versions from the import itself.
- Supabase Free storage considerations: one small JSON reference (not copied image) and no automatic reminder or invitation.

## DOC-02 behavior
- Loads latest source reference only when the signed-in user can view the meeting. Displays in **both** premeeting agenda draft and postmeeting minutes draft.
- Shows a clearly separate committee-appointment reference section, not the field `ผู้มาประชุม`. The ninth entry is shown by office, without filling an individual's name.
- A4 on-screen previews include the appointment reference as a labeled annex with its own repeated **not-certified draft** watermark. The annex is not the attendance register and is not an official letter.
- Existing draft/reviewed document versions remain immutable. Only when a designated authorized editor clicks **บันทึกร่าง** does the currently presented reference get embedded in a *new* document revision via the existing `r2_doc02_save_draft` RPC. Existing snapshots and report v4 `submitted` are never rewritten or reclassified.
- Before saving a reference into a revision, the UI warns that the image's names and appointment date require human verification. DOC-03 remains gated until source orders and real attendees are confirmed.

## Tests and readiness
- Fictional nine-slot roster regression (source escape, separate appointment/attendance, one office-holder, extra preview page, draft state and no person names in public code).
- Existing DOC-02/EXT-02/UX-11 regression must stay green; compare current 13 active/five-section agenda and protected retirement history.
- Confirm SQL migration/history; no direct anon or authenticated DML, scoped SELECT policy; verify import only inserts 1 reference record for the target meeting and no other meeting/document/task changes.
- Still **pending school verification:** all name spellings, handwritten issue date, term, attendance/quorum for meeting 1/2569, principal currently holding office, actual chair and recorder, plus official PDF/signature/ratification policy.

## Release status
This file records software behavior and private reference import only, not independent identity proof or approval of an official meeting document. Merge/CI/Pages and private import results will be documented after verification.
