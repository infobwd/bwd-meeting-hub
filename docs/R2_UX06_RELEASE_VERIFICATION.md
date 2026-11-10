# UX-06 — BWD Meeting Hub multi-device and role-based release verification

**Date:** 10 November 2026
**Status:** automated/code review and read-only environment verification complete where explicitly recorded; manual physical-device and independent-account acceptance **still required**.

## Verified baseline from connected systems (read-only)
- GitHub: R1, R2 and UX-01 through UX-04 have been merged to `main`. At audit start, the latest main head `561497b` had successful Actions: `BWD smoke and security checks` and `pages build and deployment` (2026-11-10). Older UX-04 failures were superseded by passing re-runs and merge checks.
- Supabase project `Meeting`: operational. Read-only counts at this audit: 2 meetings, 14 agendas, 2 tasks, 4 linked meeting documents. Counts do **not** establish permission, document content or approval status.
- Google Drive: project folder / 2569 / 10 November school board meeting exists with four files (draft minutes PDF, integrated draft resolution PDF, original request-letter image, and earlier draft PDF); no Drive permission change or public URLs are recorded in repository code.
- UI code: existing `meeting-pdf` Edge Function, Supabase Auth/RLS/RPC workflows, status distinctions, private evidence Storage, and 3-tab mobile navigation are retained.

## Automated regression scope
- Existing Node tests covering R1/R2 + UX-01/02/03/04 and PDF.js reader remain required.
- UX-05 reader mock/fallback/hidden-pane/keyboard tests are added in a separate file.
- UX-06 source-contract tests assert UI accessibility, draft/ratification separation, RLS-sensitive backend methods, no embedded service-role tokens or public Drive mirroring, and private evidence interfaces.
- CI green is **not** permissioned browser QA or production release approval.

## Required manual sign-off matrix
| Role and device | Login / scope | Meeting + agenda | Draft PDF / Drive ACL | Task, upload, review | Status |
| --- | --- | --- | --- | --- | --- |
| Admin, iPhone Safari (390/430) | pending | pending | pending | pending | **pending** |
| Secretary/editor, iPad (820) | pending | pending | pending | pending | **pending** |
| Assignee, Android (360) | pending | pending | pending | pending | **pending** |
| Attendee / uninvited guest | pending | pending | pending | denied where expected | **pending** |
| Signed-out + revoked member | no private access expected | denied | denied | denied | **pending** |
| Desktop 1280 + keyboard/reader | pending | pending | pending | pending | **pending** |

For each role, verify **actual login with separate accounts** and observe server-enforced read/write limits, not just hidden buttons. Admin must never auto-ratify meeting minutes by approving a draft. Assignee cannot accept own completion. Test evidence PDF/JPEG preview and forbidden object path. On mobile verify no sideways scroll, no keyboard-triggered autozoom, bottom-sheet Save/Cancel reachability, retry and correct Toast.

## Operational release blockers
1. Manual phone/tablet/desktop screenshots and browser interaction records missing.
2. Separate real accounts for secretary, assignee and guest need acceptance; live RLS/RPC and Drive ACL negative tests remain release gates.
3. Privacy and record retention / backups / restore procedures need owner sign-off before use as an official school records system.
4. R3 delivery of reminders and notifications is *not implemented*. An in-app due date or a planned thank-you-letter task is not a sent reminder.

## Handoff
Keep real meeting documents as draft pending an authorized secretary/executive review and formal committee ratification. Do not change current statuses, authors, assigned staff, due dates, or Google Drive permissions during UX verification. The 23 November post-event thank-you-letter follow-up remains a task to verify, not proof a letter was sent.
