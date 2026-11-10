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
