# DOC-02 / UX-11 — Current meeting document links on signed-in workspace

Date: 2026-11-11
Status: plan before implementation; no school ratification or account-role acceptance.

## User request
- A meeting participant who signs into the R2 workspace and is entitled to view that meeting should find its latest attached PDF easily.
- Replace visible legacy/test Google Drive attachments with the current document.
- Preserve previous Drive originals, all meeting history and auditability. Do not share school documents with 'anyone with the link'.
- Leave username/role testing as a separate security acceptance task.

## Verified baseline
- The workspace already reads RLS-gated `meeting_documents` and has an 'อ่าน PDF ในเว็บ' action plus a Drive Preview fallback.
- The current meeting contains older comparison PDF metadata; a later, privately owned PDF is not linked to `meeting_documents` yet.
- The deployed meeting-pdf Edge Function only downloads Google Drive files accessible by public-link methods. It **cannot** stream private Drive content to all Supabase-authenticated meeting members. Do not imply that sign-in alone grants Drive file access.
- File contents and identifiers are private; record live file IDs and names in Supabase only, not in this public repository.

## Implementation
1. Add nullable `meeting_documents.archived_at` for soft archiving, default NULL, and require `archived_at IS NULL` in the existing authenticated SELECT RLS policy; retain `private.can_view_meeting(meeting_id)`.
2. Apply the same active filter in the workspace document query, so only current attachments appear. Emphasize the document entry in meeting details; keep authenticated PDF reader and optional Drive fallback.
3. In an audited, conditional transaction for the specified live meeting, archive **only** the verified legacy imported links and register the verified latest private Drive PDF; do not delete Drive originals or existing source documents. Do not change meeting/agenda/minutes/task/decision statuses.
4. Regression checks: RLS enabled, anon denied, authenticated read gate retained, only current attachments loaded in UI, no public Drive access changes, SQL before/after counts and permissions.
5. Keep Google Drive account-access limitation and independent-role tests visible as outstanding release blockers.

## Rollback
- Revert the SQL data changes by restoring `archived_at=NULL` for the specific archived document rows (using audit metadata and known IDs).
- Keep the new current document row or hide it with `archived_at=now()` if superseded. Do not physically delete historical Drive files.
- The schema migration is additive; reverting the frontend query alone remains safe because the database RLS continues to hide archived links until explicitly restored.

## Restrictions
- No formal committee ratification; review_state remains draft.
- Existing meeting cover, external meeting documents, agendas and tasks must not be modified.
- Private Google Drive PDF preview cannot be guaranteed to work for a Supabase login lacking Drive permission; address separately by authorized scoped content delivery, without public links.
