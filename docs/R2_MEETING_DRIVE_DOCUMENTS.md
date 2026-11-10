# R2 — Google Drive documents for meetings

Date: 2026-11-10. Meeting: board meeting, 10 November 2026.

## Purpose
- Link documents to individual meeting records **without copying PDFs into Supabase**.
- All links live in `public.meeting_documents` and can be viewed only via existing meeting-visibility RLS.
- The Drive file stays on Google Drive and has **independent sharing permissions**.
- Document type is an explicit draft (agenda draft / proposed resolution / minutes draft / other).
- Do not classify the proposed resolution as a ratified decision, or record it in `decisions`.

## Security and data contract
- `meeting_documents` has default-deny RLS with SELECT through `private.can_view_meeting()`.
- No browser INSERT/UPDATE/DELETE. Authorized meeting editors call `r2_attach_drive_document`; permissions are checked server-side, archived/ratified meetings reject new draft attachments.
- A Drive file ID is stored; the HTTPS link is constructed client-side, not a public JSON fixture.
- The initial PDF is imported by an explicit audited administrative operation; no impersonation of a meeting participant.
- Restrict Google Drive folder access before storing confidential materials. A protected website does NOT make a publicly shared Google Drive file private.

## Mobile acceptance
- [ ] iPhone: Meeting → detail → 'เอกสารประกอบการประชุม' → 'เปิด PDF ใน Google Drive'; opens without layout overflow
- [ ] Correct draft badge; no change to meeting draft status, no fabricated decisions
- [ ] Repeated attachment avoids duplicate record
- [ ] Non-editor sees link but cannot attach documents
- [ ] Non-participant cannot SELECT document metadata
- [ ] Editor can paste standard Google Drive file URL; folder/foreign URL rejected
- [ ] Confirm Drive sharing boundaries separately with attendee and outsider
