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
- User-editable meeting-number field now has guidance to enter the verified source number; do not prefill an unverified number from unrelated chat material. If the saved meeting title already ends in the **exact** same Thai date as `scheduled_on`, the preview hides that duplicate date in its heading only; the original title stays unchanged.
- Item heading renderer strips the *matching* leading item number from display text only; it does not mutate `agendas.title`, `position`, `section`, `public.minutes` or any saved snapshot.
- On-screen draft A4 preview has mobile **พอดีหน้าจอ / ขยายอ่าน** controls (without persisting zoom or changing source), builds **approximate** pages at item boundaries, shows page count and repeats `ตัวอย่างฉบับร่าง • ไม่ใช่เอกสารรับรอง` on each page. Long entries may stretch a preview page rather than be truncated. This is **not** the final official page-break/print layout.
- Switching to preview captures unsaved editor values locally and rerenders the draft without saving or submitting. Closing clears any private document DOM and invalidates in-flight loads.

## Regression evidence
- New `tests/r2-doc02-mobile-refinement.test.mjs` uses fictional 13 topics / five categories and checks 5.2 heading de-duplication, exact source positions, multiple preview pages, per-page watermark, coexistence of draft outcomes and responsive CSS selectors.
- Updated existing DOC-02 and EXT-02 asset-version tests.
- Original isolated branch passed GitHub Actions run 313, but current main gained an audited agenda-correction feature during development. The **rebased combined branch** must pass a fresh CI run preserving the new source-change guardrails, then main CI and Pages after Merge. Neither CI substitutes for real Safari/Android UAT.

## Preservation and release gates
- **No SQL migrations, Supabase row edits, real agenda corrections, user/Auth/invite/notifications or Drive permissions.**
- Latest main now has 14 stored agenda rows, **13 active visible items in five sections and one retired historical item** (audited in PR #36/#37/#40). DOC-02 already has a prior draft revision 1. Legacy minutes revision 4 `submitted` remains independent. **This UI PR creates no drafts** and preserves the existing `sameSource` / `alignDraftToSource` rebase and confirmation guardrails.
- Real iPhone Safari / Android Chrome keyboard, safe-area scroll, accessibility and long-report A4 visual QA still require human acceptance. Approximate draft pagination is not certified PDF or print output. DOC-03 official export, signatures, formal ratification, multi-account RLS and school sign-off remain separate.
- Existing EXT-02 external attendance workflow and R2 meeting/task functionality are not intentionally changed.

## Post-merge technical verification (2026-11-10)
- UI PR [#41](https://github.com/infobwd/bwd-meeting-hub/pull/41) merged into `main` at commit `4b64c70321257763e773cf3986042d9e87566ee3`. Earlier PR #38/#39 were **closed without merge** after CI-branch-name and concurrent-main conflicts; the current PR preserves all approved agenda-correction changes.
- Rebased branch GitHub Actions run **323** and PR check run **324** passed. `main` smoke and security run **325** passed; GitHub Pages build and deployment run **33** passed for the merge commit.
- Verified `main` contains `doc02.js` mobile view switch + approximate pagination + zoom **alongside** `sameSource` and `alignDraftToSource`; CSS has no 47%/53% mobile pane split; dialog and updated assets on `workspace.html`; Master Plan v0.2.12 recorded design and preservation.
- **Read-only live data snapshot at verification:** 1 meeting; 14 physical agenda rows (**13 active / 1 retired**) in five visible groups; original legacy minutes **version 4, `submitted`**; DOC-02 version tables contain 2 agenda and 1 minutes snapshots, with **0 formal ratifications**. Document-version counts may change during authorized use and are not modified by this UI-only PR.
- This check verifies repository, deployment automation and aggregate data only: physical iPhone Safari screen review, long A4 report readability/zoom, multiple-account RLS, legal meeting-role verification and formal PDF/Docs remain **pending**.
