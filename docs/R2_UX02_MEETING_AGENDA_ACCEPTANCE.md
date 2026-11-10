# UX-02 — Meeting Information Architecture & Agenda Acceptance

Date: 2026-11-10. Baseline: UX-00 and UX-01 TDRS-informed plans.

**Scope completed in code:** `portal.js`, `portal.css`, `workspace.html`, `tests/r2-ux02-meeting.test.mjs`.
**Status:** implemented, automated source/UI-renderer tests required; real-device and role acceptance still pending.

## What changed

1. **Meeting cards:** make type, actual database-derived status, Thai meeting date/place, number of agenda items, documents and linked tasks visible without raw IDs; retain one primary "เปิดรายละเอียด" action. Meeting list sorts by scheduled date then creation timestamp, while preserving read permissions.
2. **Accurate state words:** `draft` = ฉบับร่าง, `scheduled` = กำหนดการประชุมแล้ว, `held` = ประชุมแล้ว — รอรายงาน, `minutes_review` = รอตรวจทานรายงาน, `reviewed` = ผู้บริหารตรวจทานแล้ว, `ratified` = รับรองแล้ว, `archived` = จัดเก็บแล้ว. An administrator review is **not** committee ratification.
3. **Meeting detail:** compact summary card and internal anchor links for ระเบียบวาระ / เอกสารประกอบ / รายงาน / ภารกิจ / ผู้เข้าร่วม. Agenda first, then documents for a logical reading sequence.
4. **Agenda sections:** groups 1–5 are native `<details>/<summary>` disclosures. The first existing section opens by default; the rest start collapsed. Users can "เปิดทุกหมวด" or "ย่อทุกหมวด" and individual open states are kept in ephemeral memory across rerenders.
5. **Document accessibility:** links and PDF-in-web controls remain available in the document section; the existing PDF.js reader and Google Drive fallback are untouched.
6. **Return to list:** returning from meeting detail restores the previous meeting-list scroll position. The PDF dialog retains its pre-existing focus/return behavior.
7. **Data access:** no migrations, RLS, RPC or Supabase table changes. Existing control authorization remains unchanged; no artificial decisions, statuses or reminders were created.
8. **Mobile display:** Thai titles wrap in cards/summary; group targets are >=44px and the link strip scrolls horizontally without forcing the entire page sideways. Built-in disclosure semantics work by keyboard.

## Automated checks

- `tests/r2-ux02-meeting.test.mjs` loads the existing renderer with mock records (fictional data only), tests all 13 agenda items grouped into five sections, tests disclosure state, state labels, and verifies existing actions remain wired.
- Existing R2 security, PDF reader and UX-01 tests must all stay green.
- GitHub Pages deploy check required after merge.

## Manual acceptance — not yet claimed

| Check | iPhone Safari 390px | Android 360px | iPad 820px | Desktop 1280px |
|---|---|---|---|---|
| Meeting cards: no sideways scrolling or clipped status | Pending | Pending | Pending | Pending |
| Open 10-Nov board draft: all 13 items in five categories | Pending | Pending | Pending | Pending |
| Expand/collapse all; individual sections remember state | Pending | Pending | Pending | Pending |
| Tap anchor links and scroll to matching heading | Pending | Pending | Pending | Pending |
| Open PDF and return, with draft label unchanged | Pending | Pending | Pending | Pending |
| Navigate back: prior meeting list position restored | Pending | Pending | Pending | Pending |
| Admin/editor versus attendee/guest permissions | Pending | Pending | Pending | Pending |

## Next implementation phase

**UX-03 — Task cards & evidence hierarchy:** show task status/owner/due and one contextual primary action, tuck secondary actions into an accessible detail surface, and keep evidence preview and review/audit history intact. Follow with UX-04 loading/sheets/toasts and UX-05 PDF reader QA; UX-06 consolidates device and role acceptance.

**Do not label UX-02 as production user-accepted until the physical-device/role matrix is completed.**
