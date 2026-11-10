# R2 — Audited Correction of Legacy Meeting Agenda Source (2026-11-10)
Status: change plan; implementation must preserve submitted legacy minutes and all official document snapshots.

## Rationale
An authorized school reviewer confirmed corrections to a legacy school-board meeting agenda. Its existing document-draft snapshots use source agenda IDs and immutable source titles/notes. The existing legacy minutes have already been submitted for review. Replacing or deleting historical records silently is forbidden.

## Design
1. Add nullable `agendas.retired_at`; never delete a historical agenda. The effective agenda collection filters out retired rows, while the database retains their original IDs and content.
2. DOC-02 server-side source validation must check *active* agendas only. Its editor must detect stale saved draft sources and clearly offer the current effective source, preserving user-authored text for still-matching agenda IDs and preserving every previous immutable version.
3. Introduce a private, access-revoked, append-only correction-batch snapshot to capture full before/after agenda source rows for rollback review; record each changed row separately in `audit_events` with explicit administrative origin, explanation, previous and new values. No public personnel or private meeting details in this repository.
4. Apply one conditional, transactionally atomic **data** update in the linked private Supabase project only **after** code/migration verification. Target only the verified legacy school-board meeting, with preconditions for meeting status, count, absence of links to the retired topic, source ordering and absence of unexpected changes. Protect the previously submitted legacy minutes row and current DOC-02 snapshot(s); do not change meeting status, decisions, tasks, access or document approval.
5. Keep the original topic's ID retired, preserve unaffected topic IDs, rename/re-order existing topics by their existing identities, create one new topic with a new ID. Expect 14 stored agenda rows but **13 active agenda items** in five existing groups; existing 13-topic DOC-02 snapshot remains intact and historical.
6. No automatic resolution, task creation, invite, official export or committee ratification. The corrected agenda is still a preparation/source record, not certified minutes.

## Deployment gates
- Confirm current DB state, linked task/decision IDs, latest DOC-02 document versions, migration order.
- Commit a non-destructive migration and UI/source validation regression tests. PR / CI / merge.
- Apply additive migration before publishing the frontend that filters on the new column; perform the correction transaction after the revised frontend is deployed.
- Verify effective 13 items in 5 groups, original retired row unchanged, current agenda draft revisions intact, legacy minutes version/status/body unchanged, unchanged tasks/decisions, private snapshots and audit events present.
- Recheck login/account permissions, real mobile UI and backup/restore before official school use. Never silently upgrade draft outcomes to resolutions.

## Rollback / repair
Previous content is retained in the private correction snapshot and per-item audit logs. Do not automatically restore rows with destructive DML. If a correction needs reversal, use a separately reviewed, conditional transaction that preserves the new version history and existing historical snapshots; never delete versions or approvals.

## Execution / post-change verification (2026-11-10)
- Implementation merged in [PR #36](https://github.com/infobwd/bwd-meeting-hub/pull/36); branch automated source/security suite run 295 passed. Migration `agenda_source_retirement_protected_20261110` applied successfully to Supabase Meeting ahead of the frontend.
- Asset cache compatibility follow-up merged in [PR #37](https://github.com/infobwd/bwd-meeting-hub/pull/37); branch suite run 300 passed and `workspace.html` references the new DOC-02 and portal script asset versions on `main`.
- Authorized correction executed as one guarded private database transaction; conditional checks required the expected meeting, submitted legacy minutes and unchanged source layout. All prior source rows retained; one withdrawn row has `retired_at` set and one new active topic has a fresh identifier.
- **Read-only confirmed:** 14 physical agenda rows, 13 active rows across five sections (4/1/2/3/3), 1 retained withdrawn source, 1 protected before/after correction-batch snapshot, 14 per-row audit entries, 1 prior DOC-02 agenda draft, 0 new DOC-02 minutes drafts, 0 ratifications, 0 decisions, 1 original task link. The legacy minutes remain version 4 / submitted and the meeting remains `minutes_review`.
- No existing DOC-02 document row was overwritten. A user opening an old editable document version should see a changed-source notice, and should explicitly confirm the rebase into a *new* draft version. Do not infer that this historical rebase flow has been accepted on a real phone.
- **Remaining:** verify Pages delivery and manual iPhone/Android view with authorized account; verify actual role/RLS negative tests and backup/restore. Do not issue or ratify official documents from this maintenance step.
