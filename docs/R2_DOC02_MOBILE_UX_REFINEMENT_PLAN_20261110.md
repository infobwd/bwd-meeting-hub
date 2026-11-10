# DOC-02 UX Refinement — Mobile Preview, Numbering & A4 Drafts
Date: 2026-11-10 | Planned before source edits | Scope: UI/UX and mock-only regression tests

## Verified baseline
- `docs/MASTER_PLAN.md` v0.2.9, DOC-02 PR #34 and acceptance PR #35 merged; keep EXT-02 and R2/UX-11 behavior.
- Screenshot of iPhone: blank gap between last report editor control and the preview, clipped A4 view, oversized status/header, and duplicated "5.2 — 5.2 ..." title.
- Root cause in current CSS: mobile `.doc02-edit-pane{max-height:47%}` + `.doc02-preview-pane{max-height:53%}` inside height-bound grid. Preview is visually constrained and hard to navigate.
- Root cause in `doc02.js`: `itemFields` and `itemPreview` prefix `display_no` without checking whether `item.title` already contains the same prefix.
- DOC-02 uses separate agenda/minutes draft versions; **current main after PR #36/#37/#40 has 14 physical agenda rows, 13 active visible topics in five groups, and one retired row preserved in history**. Legacy minutes remain revision 4 `submitted`; an earlier DOC-02 draft revision 1 also exists. Never overwrite, renumber, silently reactivate or delete these records. Preserve the latest `sameSource` / `hasChangedSource` / `alignDraftToSource` safeguards when applying this UI refinement.

## Planned changes
1. On phone/tablet, show one DOC-02 workspace at a time: **แก้ไขข้อมูล / พรีวิว A4**. Desktop retains two-column editor + preview. Switching view preserves unsaved form fields and updates preview locally without writing to Supabase.
2. Remove percentage-height split and blank flex spacer on small screens; make the active panel fill remaining safe-area-aware viewport, with its own scroll region and an always-reachable draft action bar.
3. Compact document statuses: show primary DOC-02 state and legacy minutes v4 status separately; defer explanatory detail to an expandable section. Shorten button from "บันทึกร่างฉบับใหม่" to "บันทึกร่าง" and still show saved revision.
4. Display section-local numbers only once by stripping the *matching* leading number from title **at render time**. If title uses a different number, do not silently change the text; keep source title and `position` unchanged.
5. Improve read-only A4 draft preview for long reports: chunk pages at agenda-item boundaries using conservative content-length estimates; repeat a "not ratified" watermark on each page; count pages as **approximate** until DOC-03 official PDF renderer validates physical page breaks. Never clip content to artificial height. On mobile use fit-width reading, not official fixed-size PDF claims.
6. Improve missing meeting number prompt; do not infer "ครั้งที่ 1/2569" from unapproved chat notes. Allow the editor to enter and preview from the confirmed source only.
7. Regression tests for mobile view toggle, compact state, no repeated 5.2 prefix, multiple preview pages, watermark each page, form state on toggle, existing 13 topics/five sections and unchanged EXT-02/UX-11 behavior.

## Non-goals / gates
- No schema migration, Supabase writes, meeting/agenda/minutes/task data changes, user invitations, Drive permission changes, signature, certified PDF/Docs export or formal ratification.
- CI+PR+Merge and verify Pages; independent real iPhone/Android visual QA, actual physical A4 print, accessibility, backup/restore and authorized school sign-off remain separate acceptance gates.
- This file records the requested plan before implementing code.
