# BWD Meeting Hub — UX-01 App Shell Acceptance

**Date:** 2026-11-10
**Source inspiration:** `infobwd/tdrs` navigation, mobile layout, typography and theme patterns.
**Implementation:** `workspace.html`, `portal.css`, `portal.js`.
**Status:** Code implemented; automated source/syntax QA required; physical-device and user-role acceptance pending.

## Delivered
- Retains the three existing R2 destinations (`overview`, `meetings`, `tasks`), with consistent inline icons and concise Thai labels.
- Keeps navigation within the R2 workspace. The brand header now returns to the R2 workspace, not the separate R1 demo page.
- Workspace heading reflects `ภาพรวม`, `การประชุม`, `รายละเอียดการประชุม` or `ภารกิจ` as navigation changes.
- BWD-only CSS design tokens maintain navy/gold identity; responsive header and tab spacing are additive rather than a Tailwind/React rewrite.
- At <=900px the three-tab bottom navigation is fixed, safe-area aware, and uses touch targets at least 44px high; labels stay readable on a narrow phone.
- Input/select/textarea controls remain at least 16px on phone/tablet to avoid Safari focus zoom. Browser pinch zoom remains enabled.
- Card and heading containers allow long Thai text to wrap without forcing a fixed desktop width.
- Existing bottom sheet, toasts, R2 authentication, meeting/task workflows, evidence preview, and PDF reader remain unchanged.

## Source-based checks
- [x] R2 tab IDs and active-state wiring retained.
- [x] R2 role/account bindings retained.
- [x] No Supabase schema, RLS, RPC, Edge Function or Google Drive sharing changes.
- [x] Added source-contract test `tests/r2-ux01-shell.test.mjs`; existing CI syntax and source checks retained.
- [ ] Visual screenshots and interaction QA on real devices **not yet performed**.

## Manual device matrix (record screenshots in a PRIVATE workspace)

| Device / viewport | Header / bottom tab | No sideways scroll | Readable Thai text | Sheets/keyboard | PDF back/close |
|---|---|---|---|---|---|
| Android Chrome 360px | pending | pending | pending | pending | pending |
| iPhone Safari 390px | pending | pending | pending | pending | pending |
| iPhone 430px | pending | pending | pending | pending | pending |
| iPad portrait 820px | pending | pending | pending | pending | pending |
| Desktop 1280px | pending | pending | pending | pending | pending |

## Required regression scenarios
1. Login and logout; brand/header tap returns to authenticated workspace (not R1 demo).
2. Switch each of the three tabs, verify visible heading and selected state. Tap a meeting, verify `รายละเอียดการประชุม`; back to meeting list.
3. Open a 13-item draft meeting, preserve all agenda items and original draft status.
4. Open and cancel add-meeting / add-agenda / add-task bottom sheets with iOS keyboard visible; Save retains data semantics.
5. Open PDF viewer and private evidence preview, close and return to meeting/task list; footer navigation does not overlap viewer controls.
6. Run as administrator, editor/secretary, assignee and attendee/guest using **separate test accounts**; confirm no unauthorized controls/data are exposed.
7. Test 200% accessibility text scaling, focus states and VoiceOver/TalkBack baseline. No unexpected browser zoom or clipped submit button.

## Stop/rollback gate
If the bottom navigation obstructs the keyboard, floating viewer, important button or text at target widths, or authorization labels regress, revert only the UX-01 PR. Do **not** change auth/RLS to accommodate layout. This code-level PR cannot count as production or multi-role UAT sign-off.

## Next ordered work package
**UX-02 — Meeting information architecture:** make meeting summaries and agenda sections scannable on phone, reduce duplicate headings, present documents and draft status with one-tap access. Do not change any meeting, decision or minutes records. Then **UX-03** task-card hierarchy and evidence controls.
