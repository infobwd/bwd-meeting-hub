# UX-11 — Current meeting document link acceptance (2026-11-11)

Status: RLS and data migration applied; live multi-account Google Drive PDF-content acceptance pending.

## Implemented
- Private meeting-document metadata now includes an optional `archived_at` timestamp. The existing `private.can_view_meeting(meeting_id)` RLS requirement remains, and archived links are excluded at the database boundary.
- The signed-in R2 workspace loads only non-archived references and offers a quick 'อ่านเอกสารล่าสุด' button in meeting details. The existing PDF.js authenticated document route and Drive Preview fallback remain.
- A single, conditional and audited private database transaction archived 15 older imported references for the verified school-board meeting and registered one current, privately stored Google Drive PDF for reading within its meeting context.
- Readback verified 16 metadata rows total, 15 archived, one visible and 16 corresponding archive/activation audit events. Original Google Drive files were **not** deleted and no Drive ACL was widened.
- The official document remains `minutes_draft` / `draft`; no formal committee ratification, roles, meetings, agendas, tasks, or decisions were changed.
- UI/SQL source regression tests and Node syntax test included. PR #46 branch GitHub Actions run 332 passed after test-compatibility fixes.

## Access limitation
- The current Google Drive file is owner-only. Although the workspace document list and reader action are gated by Supabase Auth/meeting RLS, the deployed meeting-pdf Edge Function only downloads files reachable via Google Drive's public-link methods. Therefore the PDF bytes cannot be assumed readable inside the website for every authenticated user. Google Drive Preview may require separately authorized Google Drive permissions. Do not turn on public link sharing to make the reader appear successful.
- Outstanding before real rollout: authorized cross-account Google Drive access test, browser/mobile tests, independent role/meeting RLS negative tests, backup/restore, privacy approval, and DOC-03 official-signature/ratification workflow.

## Rollback
- Using authorized administrative controls and audit data, restore previous rows' `archived_at` to NULL, and archive the current reference if necessary. Do not delete originals.
