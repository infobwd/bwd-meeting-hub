# R2 — Security / QA Acceptance
Updated: 2026-11-10 | Release status: **NOT APPROVED FOR PRODUCTION**

## Verified in source / automation
- [x] R1 demo remains isolated from R2 authenticated workspace
- [x] R2 UI requires a configured URL + public publishable key
- [x] Supabase Auth login and membership check implemented
- [x] Tables are explicitly protected by row-level security; no direct authenticated DML grant
- [x] Write RPCs enforce editor/owner/admin roles
- [x] Version checks prevent stale overwrites on minutes and tasks
- [x] Task approval requires reviewer other than the owner
- [x] Minutes internal review requires a different reviewer than last editor
- [x] Private bucket limits uploads to task scope
- [x] Audit writes for core meeting/decision/task and review mutations
- [x] Internal minutes review does **not** automatically mark a formal committee resolution ratified
- [x] JavaScript syntax/source contract checks added to GitHub Actions

## Mandatory staging verification (NOT YET RUN)
- [ ] Provision a private Supabase project + apply all four migrations
- [ ] Confirm SQL applies without error, database role grants are correct and storage private
- [ ] Admin sees own workspace and can create meeting
- [ ] Secretary creates meeting and sees editor access limited to assigned meeting
- [ ] Attendee cannot create/edit via RPC even when calling endpoint directly
- [ ] Guest cannot request editor role (API must deny)
- [ ] Auth user without active workspace membership cannot access meetings/tasks
- [ ] Assignee-only user sees assigned task but not secret meeting metadata
- [ ] Revoking workspace membership immediately removes visibility and storage access
- [ ] Malicious/foreign task ID, agenda ID, meeting ID and object path are rejected
- [ ] File type / max size policy rejects unsupported uploads
- [ ] Concurrent task or minutes edit rejects stale version
- [ ] Approved task/approved minutes cannot be silently overwritten
- [ ] Reviewer cannot approve their own submitted work
- [ ] Cross-meeting task linking requires permission to the existing task and destination meeting
- [ ] Audit event created for each critical mutation
- [ ] Print-reviewed-minutes feature is correct for board and teacher meetings
- [ ] Keyboard access, 360px/390px mobile layout, iOS Safari and Android Chrome acceptance
- [ ] Backup/restore drill, identity recovery, PDPA/retention sign-off and admin handover

## Role matrix
| Action | Admin | Meeting editor | Attendee | Assignee-only | Guest |
| --- | --- | --- | --- | --- | --- |
| View meeting | All | Edited | Invited | No, unless invited | Invited only |
| Create meeting | Yes | Only if workspace secretary | No | No | No |
| Edit agenda / decisions | Yes | Yes for assigned | No | No | No |
| Read own task | Yes | Linked tasks | Linked tasks | Yes | Linked tasks |
| Update task status | If reviewer / owner | If reviewer / owner | Only if assigned | If assigned | Only if assigned |
| Approve submitted task | Yes, not own | Yes, not own | No | No | No |
| Internal minutes review | Yes, not own draft | No unless admin | No | No | No |
| Download private task evidence | Visible tasks | Visible tasks | Visible tasks | Own task | Linked visible tasks |

## Security model notes
- Frontend visibility is **not** a security boundary. Database permissions and RLS are authoritative.
- Meeting editors can invite **existing active accounts**. Provisioning Auth users and workspace membership is an administrator's task outside R2 portal.
- Staff users can discover workspace staff names to select assignees; guests see only identities they are permitted to see.
- **Cross-meeting task links intentionally share task details, updates and evidence** among authorized viewers of both meetings. Confirm the destination audience before linking; never link a sensitive task into a broad/open meeting.
- Evidence remains in a **private** bucket; no public URLs are generated. Object cleanup, retention and records disposal need an audited admin process before go-live.
- Audit table is readable only by admins. No client-side direct INSERT/UPDATE/DELETE permissions on workspace tables.
- There is no automated notification dispatch in R2.
- The UI's "ตรวจทานรายงาน" is internal administrator review. Board ratification at the next formal meeting is separate.
- Supabase publishable key is not confidential; **service-role key and SQL credentials must never be committed**.
- R1 localStorage is untrusted demo data, not bulk-imported into production.

## Release decision
Code readiness: subject to CI and review.
Live acceptance: **BLOCKED**, pending project provisioning, multi-account tests and administrator sign-off.
