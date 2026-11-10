# R2 — Mobile App Experience Acceptance

Updated: 2026-11-10. Status: **UI enhancement — live device testing pending.**

## Scope
- Keep the existing R2 authenticated Supabase workspace, RPC calls, RLS, task evidence storage, and existing login flow unchanged.
- At phone and tablet widths (900px or less), use a fixed three-item bottom navigation: Overview, Meetings, Tasks, respecting safe-area insets.
- Keep desktop/tablet-landscape controls in a normal horizontal tab layout.
- Open add/edit/action forms as accessible bottom-sheet dialogs on phones/tablet portrait (not native popup alerts). Desktop retains a centered modal.
- Provide a scrollable form body and persistent Cancel/Save actions within the sheet; avoid automatically raising the iOS keyboard when the sheet opens.
- Present success/error feedback as dismissible non-blocking toasts with screen reader roles; avoid browser native `window.confirm` for minutes submission.
- Leave the R1 local demo isolated; R2 still must not carry real meeting records before multi-account acceptance.

## Verified from staging database (read-only, 2026-11-10)
- 1 meeting, 1 agenda, 1 task, 1 task update persisted.
- 0 evidence metadata records; evidence upload/download and authorization remain **unverified on real devices**.
- No production-data release decision is implied by UI or presence of test records.

## Manual acceptance (must be checked before production)
- [ ] iPhone Safari at ~390px: tabs remain accessible, no sideways scrolling; all form actions remain visible with software keyboard.
- [ ] Narrow Android Chrome at 360px: open, dismiss, cancel, save and validation in bottom sheets.
- [ ] Tablet at 768/820px: bottom navigation, readable card grid, sheets scroll correctly.
- [ ] Desktop at 1024px+: traditional modal and tabs unchanged.
- [ ] Errors, success and failed upload produce accessible toasts; toast dismiss/timeout and screen reader announcements work.
- [ ] Minutes submission confirmation: Cancel does not submit, Confirm submits once; Escape dismisses.
- [ ] Supabase form workflows: create meeting/agenda/task; add update; record minutes; cancel has no side effects.
- [ ] Evidence: upload PDF and JPG/PNG/WebP <=10 MB, read/download permitted user; reject foreign-task files, unsupported type and >10 MB.
- [ ] Repeat multi-account tests from `docs/R2_ACCEPTANCE.md` before using real school meeting information.

## Rollout
GitHub Pages serves the R2 workspace; after merging, hard-refresh the browser if an old CSS/JS copy is cached. No additional Supabase schema changes are required for the presentation-layer update.
