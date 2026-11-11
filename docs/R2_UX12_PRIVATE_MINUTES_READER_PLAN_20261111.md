# UX-12 — Open the current minutes PDF directly inside the signed-in meeting page

Date: 2026-11-11
Status: implementation plan recorded before changing code or private data.

## User goal
An authenticated, meeting-authorized participant should tap "เปิดรายงานการประชุม" and read the most recent PDF in the existing embedded PDF.js book reader without needing a second Google Drive login. Keep the file and meeting private and do not create a public sharing link.

## Verified facts
- Existing `meeting-pdf` Edge Function first enforces the caller's `meeting_documents` SELECT RLS and then attempts an unauthenticated Google Drive PDF download. Owner-only Drive PDFs cannot be fetched by that mechanism and fall back to Drive Preview.
- The latest minutes document is linked as exactly one active record in `meeting_documents`, with 15 historical links already archived. Its Drive file is private.
- The document remains in review (`minutes_draft`/`draft`), not formally ratified. School role/meeting ACL testing with independent accounts is still outstanding.

## Technical design and security
- For **this explicitly selected current PDF only**, create a server-side, private Supabase reading copy. Its contents must not enter the public GitHub repository, public Storage, client settings, logs, or publicly accessible Google Drive links.
- Introduce `public.meeting_document_pdf_chunks` (chunked base64) and `public.meeting_document_pdf_assets` (byte count, chunk count, SHA-256) with RLS enabled, no `anon`/`authenticated` grants, `service_role` SELECT only. These small documents are private backend data; prefer a private Storage bucket for future generic uploads, but no unsafe direct table insert into `storage.objects`.
- Extend the `meeting-pdf` Edge Function **only after** a successful user-JWT RLS lookup in `meeting_documents`. It then reads the private copy via server-side service role credentials, verifies payload size, sequence and SHA-256 and returns `application/pdf` with `Cache-Control: private, no-store`. Never send a service key to the browser. For documents with no cached copy, preserve existing Google Drive behavior.
- Upload a verified copy of the current PDF from the authorized school Drive connector as small chunks by an administrative, controlled operation. Validate chunk count, file signature and hash before declaring it readable. Record only non-content verification in private audit records.
- Label the in-page action "เปิดรายงานการประชุม" and keep the status "ยังไม่รับรอง" plainly visible. Use the existing PDF.js viewer; no automatic downloads or popup navigation.
- Keep archived references hidden and preserve past Drive files, tasks, time records, meeting and document review/ratification states.
- Never invite users or broaden Drive sharing.

## Testing and release gates
- Test that all read operations require the existing meeting-document RLS authorization before server-only content lookup, and that the mirrored data tables are inaccessible to `anon`/`authenticated` through SQL/Data API.
- Run JS/Edge source regression tests and repository CI; verify deployment on `main`.
- Verify one active PDF copy can be reassembled server-side from chunks, matches SHA-256 and matches the original size; do not publish content in any test fixtures.
- Remaining: browser-level direct PDF retrieval with a real authorized account, independent unauthorized/member/guest negative ACL tests, iPhone/Android manual test, backup/restore and retention controls, school privacy sign-off.

## Rollback
Revert the Edge Function to the previous GitHub version; the existing RLS-gated Google Drive Preview fallback remains. The new table is additive, private and isolated. Delete the private copy only after confirming an appropriate backup/retention decision and while keeping the source Drive document intact.
