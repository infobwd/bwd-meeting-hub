# DOC-02 Mobile UX Refinement — Acceptance & Verification
Date: 2026-11-10 | Scope: UI-only improvement after DOC-02 (plan: [DOC-02 Mobile Refinement](R2_DOC02_MOBILE_UX_REFINEMENT_PLAN_20261110.md))

## Problem observed on iPhone
- Mobile original editor and A4 preview had large blank area caused by a 47%/53% fixed vertical split.
- Draft preview was far below report editor actions.
- A title already prefixed with the item number displayed as `5.2 — 5.2 ...` when the UI added a second prefix.
- Document status text crowded small screens; the draft button wording could suggest creating a duplicate document.
- Long minutes preview looked like a single continuous A4 page and provided weak navigation.

## UI changes implemented
- **Mobile/tablet (width <=1100px):** single document view, with two controls `แก้ไขข้อมูล` and `พรีวิว A4`, one scrollable pane visible at a time. Desktop (>1100px) retains two-column edit/preview layout.
- Editor form scrolls independently while its draft/save/review action row remains available without traversing the entire 13-item form. No 47/53 split. Supports 100dvh and safe-area bottom inset.
- Compact two-layer status UI: primary DOC-02 status and an independent `รายงานเดิม` chip; further explanation is behind a native disclosure. No implication that reviewer approval is meeting ratification. `บันทึกร่าง` instead of `บันทึกร่างฉบับใหม่`.
- User-editable meeting-number field now has guidance to enter the verified source number; do not prefill an unverified number from unrelated chat material.
- Item heading renderer strips the *matching* leading item number from display text only; it does not mutate `agendas.title`, `position`, `section`, `public.minutes` or any saved snapshot.
- On-screen draft A4 preview builds **approximate** pages at item boundaries, shows page count and repeats `ตัวอย่างฉบับร่าง • ไม่ใช่เอกสารรับรอง` on each page. Long entries may stretch a preview page rather than be truncated. This is **not** the final official page-break/print layout.
- Switching to preview captures unsaved editor values locally and rerenders the draft without saving or submitting. Closing clears any private document DOM and invalidates in-flight loads.

## Regression evidence
- New `tests/r2-doc02-mobile-refinement.test.mjs` uses fictional 13 topics / five categories and checks 5.2 heading de-duplication, exact source positions, multiple preview pages, per-page watermark, coexistence of draft outcomes and responsive CSS selectors.
- Updated existing DOC-02 and EXT-02 asset-version tests.
- Expected GitHub Actions: JS syntax and Node test suite, plus Pages build. **Record actual run results in post-merge verification; do not assume success.**

## Preservation and release gates
- **No SQL migrations, Supabase row edits, real agenda corrections, user/Auth/invite/notifications or Drive permissions.**
- Existing board meeting (13 agenda items / 5 categories) and legacy minutes revision 4 `submitted` remain authoritative; no automatic DOC-02 draft versions are created.
- Real iPhone Safari / Android Chrome keyboard, safe-area scroll, accessibility and long-report A4 visual QA still require human acceptance. Approximate draft pagination is not certified PDF or print output. DOC-03 official export, signatures, formal ratification, multi-account RLS and school sign-off remain separate.
- Existing EXT-02 external attendance workflow and R2 meeting/task functionality are not intentionally changed.
