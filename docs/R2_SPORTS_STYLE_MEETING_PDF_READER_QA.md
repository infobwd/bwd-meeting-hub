# R2 — Meeting PDF reader (sports-style)

Date: 10 November 2026. Source pattern: `infobwd/nongkum-sports-hub` (`pdf-viewer.html`, `js/pdf-viewer.js`, `booklet-drive-viewer.html`, `js/booklet-unified-viewer.js`).

## Implemented
- Private meeting document list exposes an **อ่าน PDF ในเว็บ** button; `portal.js` first reads document metadata through meeting-scoped Supabase RLS.
- Full-screen responsive reader dialog preserves the meeting context (no lost scroll/filter); back button and Escape close and return focus.
- Similar navy header, options menu, fit/zoom controls, swipe/page navigation and safe-area handling as sports V2/V3.
- Primary online reader: Google Drive's permissioned PDF `/preview` **embedded inside BWD Meeting Hub**, with separate `เปิดใน Google Drive` fallback. It does not make a public copy or bypass Google permissions.
- Advanced PDF.js book mode: when a person selects a PDF **from their own device**, PDF.js renders pages with page counter, previous/next, fit page/width, zoom, double-tap and swipe. The local file stays in device memory and is never uploaded or saved by this page.
- State remains **draft**, not ratified. Existing task evidence preview remains independent and unchanged.

## Important difference from sports
The sports V2/V3 and public 155-page readers can fetch their PDF bytes from the **same origin** and hand them to PDF.js. This meeting PDF currently lives in Google Drive and may be permissioned. An iframe can show Drive's native preview but **cannot pass protected PDF bytes to PDF.js**. Do not claim Drive iframe supports the custom page/zoom controls; these are disabled until the user explicitly selects a local PDF. Fully automatic sports-style PDF.js from private Drive would need secure user OAuth (Drive API) or an access-controlled server-side document adapter and multi-account acceptance.

## Tests
- [x] Workflow syntax checks for `meeting-pdf-reader.js` and source security/markup tests.
- [ ] iPhone Safari / iPad: open from meeting card, close/back, repeat; test safe areas and keyboard.
- [ ] Google Drive preview with an authorized and unauthorized Google account; direct Drive fallback.
- [ ] Local PDF.js: choose the **matching PDF** from device, swipe, pinch, fit/zoom, page 1/last, double-tap and reopen.
- [ ] Multi-role RLS: guest not invited sees neither document metadata nor open button.
- [ ] Verify Drive shared-link scope is restricted before storing confidential documents.

## No scope creep
No PDF bytes or Drive tokens committed to GitHub. No change to Supabase meeting/document schema, Google Drive ACL, minutes status or committee resolutions. This is a presentation-layer improvement, not production security acceptance.
