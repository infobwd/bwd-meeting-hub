# R2 — Meeting PDF reader parity with Nongkum Sports (Iteration 2)

Date: 2026-11-10. Source reference: `infobwd/nongkum-sports-hub/pdf-viewer.html`, `js/pdf-viewer.js`, `js/booklet-unified-viewer.js`.

## Gap after PR #9
The first iteration only embedded the native Google Drive preview on opening. PDF.js page navigation, pinch/zoom, fit controls and canvas rendering were disabled until the person manually chose a local file. This did not match the sports reader's default behavior.

## Changes
- Frontend now tries **PDF.js automatically when a meeting document is opened**, with the familiar reader header, bottom page bar, fit page/width, zoom, swipe/double-tap and number entry.
- A new Supabase Edge Function `meeting-pdf` accepts a document **UUID**, not an arbitrary URL or Drive file ID. It validates the caller's Supabase JWT, queries `meeting_documents` with that JWT (so existing SELECT RLS governs authorization), then streams a Google Drive PDF that currently permits anyone-with-link reads through a bounded, host-allowlisted server fetch. Only a valid PDF under 40 MB is returned.
- The edge adapter does not use a service-role key and cannot bypass a private Google Drive ACL. It neither writes a copy to GitHub nor changes Drive sharing.
- If Drive blocks the direct PDF bytes (e.g., a restricted file), the reader **falls back to embedded Drive preview** and explicitly says why; open-original remains available. Manual local-file PDF.js mode remains available as an offline alternative.
- While signed out, the viewer is closed; request cancellation avoids late responses.

## Privacy caveat
A website login cannot make a Drive file private if it is still shared as `anyone with the link`. The sample file was observed to allow anyone-with-link reading; this feature does **not** change that permission. Once Drive access is restricted, a fully automatic PDF.js reader needs an authorized Google Drive OAuth flow, or a private storage mirror maintained by an authenticated backend. Do not enable anonymous proxy fallback.

## Acceptance checklist
- [ ] Signed-in authorized user opens the sample PDF: **PDF.js page 1 shows immediately** (not Google iframe), page 2/3 via nav/swipe, toolbar fit/zoom and back work
- [ ] iPhone Safari 390px: safe-area header and bottom nav visible, no horizontal page scrolling, pinch/double-tap usable, back returns to same meeting
- [ ] Android Chrome and iPad: same interactions
- [ ] Signed-out request / other meeting member without read access receives a rejection
- [ ] Invalid UUID rejects before any Google request; invalid file ID is never fetched
- [ ] A truly private Google Drive file gracefully displays Drive preview without pretending PDF.js succeeded
- [ ] Open PDF from Google Drive fallback; respect Drive account permission
- [ ] 40 MB byte cap, '%PDF-' check, redirect host allowlist, non-public cache response
- [ ] Confirm no changes to agendas, decisions, minutes or evidence attachments

## Deployment
1. Deploy `supabase/functions/meeting-pdf/index.ts` with `verify_jwt:true`; it uses Supabase's injected `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. Deploy web via GitHub Pages.
3. Run real-device and cross-account acceptance. CI cannot prove Google Drive direct PDF byte availability and is not a replacement for actual iPhone testing.
