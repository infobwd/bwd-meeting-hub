# UX-12 — Authenticated in-app minutes PDF reader: release verification

Date: 2026-11-11
Scope: existing school-board meeting, latest attached minutes PDF only.

## Implemented
- A signed-in, meeting-entitled user can tap **เปิดรายงานการประชุม** from the meeting page. The existing PDF.js reader is used, not a public URL.
- The server's existing `meeting-pdf` endpoint checks `meeting_documents` SELECT RLS with the caller's JWT **before** attempting any private file-content lookup. This preserves meeting-scoped access and archived-link rejection.
- A small, confirmed private PDF reading copy is stored as chunks; the original Google Drive file stays private, unchanged and separately archived by its owner.
- The copy is tied to one current `meeting_documents` row and validated for PDF signature, total bytes, contiguous order and SHA-256 before responding.
- `meeting_document_pdf_assets` and `meeting_document_pdf_chunks` have RLS enabled and no direct SELECT privileges for `anon` or `authenticated`; service_role has SELECT only for the function's backend use.
- The original Google Drive PDF path remains a fallback for documents not mirrored; no default public PDF, URL token, or automatic account invitations are created.
- The document remains `minutes_draft / draft`; this is not a newly ratified report.

## Private data verification (2026-11-11)
- A copy of the verified current private PDF was transferred from the school-owned Google Drive to protected Supabase backend data by an authorized admin operation.
- 37 ordered chunks, decoded file size 1,302,323 bytes, SHA-256 agreement with source; one asset metadata row; append-only audit event recorded.
- Database privilege verification: `anon_select=false`, `authenticated_select=false`, `service_select=true`, RLS enabled on both protected tables; no direct user policies.
- No source document bytes or private Drive identifiers are in this public repository.

## Release tests and pending acceptance
- Repository CI source/security tests for UI action, RLS-before-service-role ordering, SHA-256 and private-copy schema.
- Deployed Edge Function must retain `verify_jwt=true`; only the server has `SUPABASE_SERVICE_ROLE_KEY`.
- **Still pending:** end-to-end browser verification with a real entitled user, account-scoped negative tests for another meeting and blocked user, iPhone/Android PDF.js checks, Supabase Free backup/restore, school privacy and retention sign-off.
- This single-file backend mirror is a small-document interim solution. Future large/multiple documents should use a private Supabase Storage bucket with equivalent meeting-scoped authorization rather than repeated database blobs.

## Rollback
Restore the previous `meeting-pdf` Edge Function revision from the repository and restore the previous web asset versions if necessary. This leaves the private copy invisible to end users, and the original Drive file intact. Delete the copy separately only after a school-approved retention decision; do not delete the source.
