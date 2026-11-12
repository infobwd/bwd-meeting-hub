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

## Post-migration and private import verification (2026-11-12)
- Supabase Meeting migration **`20261112063232 board_appointment_roster_reference_20261112`** succeeded after PR branch/PR CI run 353/354 passed.
- `meeting_committee_appointment_rosters`: RLS enabled, authenticated scoped SELECT permitted by meeting access, anon SELECT denied, authenticated direct INSERT/UPDATE denied.
- Private authorized import (source image in this chat): exactly **one** meeting-scoped roster revision, **nine** appointment entries, **eight named** and **one office-only**. State `transcribed_pending_verification`. One nonpersonal audit event recorded (`actor_id=NULL` to avoid impersonating a human editor). No image bytes, names or private record identifiers were committed to this public repository.
- Read-only post-import snapshot: **13 active / 1 retired** agenda rows; one unchanged legacy `minutes` row version 4 `submitted`; **2 existing DOC-02 agenda** and **1 DOC-02 minutes** snapshots unchanged; **0** formal ratifications. No new DOC-02 document versions were silently authored. An authorized editor must explicitly select **บันทึกร่าง** for a new version that includes the reference appendix.
- Because the photographed source date and some name spellings are not clearly certified, the school needs to inspect the original appointment order before approving any official document. The source photograph has NOT been copied to Drive by this implementation.
- Independent authenticated editor/committee guest/unauthorized-member RLS tests and real iPhone/Android visual inspection remain pending, notwithstanding successful source and permission-catalog checks.

## Post-merge release verification (2026-11-12)
- Feature [PR #49](https://github.com/infobwd/bwd-meeting-hub/pull/49) squash-merged into `main` at `e619d779e3b164795b074206f91d583ee3883309`.
- Feature CI run 358 and PR CI run 357 both passed; **main smoke/security run 359** and **GitHub Pages build/deployment run 39** completed successfully for the merged application. Source files and migration verified on `main`.
- After deployment read-only Supabase verification: one roster version with nine appointment slots (8 named + 1 office-only), `transcribed_pending_verification` status; **13 active/1 retired** agenda items, old minutes v4 still `submitted`, agenda document versions=2, minutes draft versions=1, formal ratifications=0. Neither document version stream was automatically changed by import/deployment.
- The signed-in authorized DOC-02 editor can view the referenced list in both document types and explicitly save a new immutable draft revision. This **does not** mean the chat photograph has been stored in the app/Drive, that names have been independently certified, or that the actual board attendance list is known.
- Remaining release gate: secretary confirms each spelling and original appointment order; validates the director occupying the secretary office, actual attendance/chair/recorder, and school privacy/committee approval before DOC-03 issues official minutes.
- Actual multi-account RLS and Safari/Android rendering remain pending despite green CI and Pages.
