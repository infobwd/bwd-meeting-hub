# UX-04 — Mobile Bottom Sheet, Form Feedback, Loading & Retry Acceptance

**Date:** 10 November 2026
**Status:** implemented in code; automated CI and device/role acceptance required before production sign-off.
**Target:** R2 BWD Meeting Hub web app; adapted from `infobwd/tdrs` mobile form and notification patterns.

## Changes

1. **Keyboard-safe bottom sheets:** retained native `<dialog>` and R2 form fields; at <=900px use `window.visualViewport` measurements to calculate available sheet height and bottom offset while iPhone software keyboard opens. Close/back, Scroll and submit controls remain reachable; CSS keeps form fields at least 16px to avoid Safari input auto-zoom. Manual Safari verification is required.
2. **Unsaved fields:** after user edits form fields, Close, Cancel, backdrop and Escape trigger the existing in-app confirmation dialog before discarding; a clean form closes immediately. A successful save forces close without an extra prompt.
3. **Single submission:** form Save button disables and shows `กำลังบันทึก…` while the request is in flight. Escape/backdrop closing is guarded during submission to avoid duplicate/conflicting writes.
4. **Field errors:** invalid Drive file URLs and mismatched meeting/agenda selection are shown inline next to the relevant input; unexpected RPC errors show a concise Thai summary in the form. Native required fields still use browser validation.
5. **Toast:** existing in-app Toast is preserved; no regular workflow uses native `alert` or `confirm`. Server details and raw SQL/RLS messages are not shown to nontechnical users.
6. **Loading and retry:** while initial or refreshed Supabase lists load, render an accessible skeleton. On failed read, show a real `ลองโหลดข้อมูลอีกครั้ง` action. On signout, clear private meeting/task/document arrays in memory.
7. **Save/refresh distinction:** successful RPC + failed list refresh reports **`บันทึกข้อมูลแล้ว แต่ยังแสดงรายการล่าสุดไม่ได้`** instead of inaccurately claiming that the mutation failed. This avoids accidental resubmission of official meeting records. Private evidence uploads receive similar result clarity.

## No backend or policy changes

- `supabase/migrations`, RPC authorization, RLS, storage buckets, Google Drive permissions and PDF.js internals remain untouched.
- No private meeting content or cached PDF added to the public repo.
- Real notices are still only Toast while the app is open. R3 push/email/reminder delivery is **not** implemented.

## Automated acceptance

- `tests/r2-ux04-forms-loading.test.mjs`: safe user messages, loading/error/retry using mocked Supabase, signout view cleanup, form guard source contracts, existing private evidence and PDF workflow checks.
- Existing R1/R2, UX-01, UX-02, UX-03 and PDF tests must pass in GitHub Actions.
- GitHub Pages build must succeed after Merge.

## Manual device QA — PENDING

| Device | Add/Cancel dirty form | iOS/Android keyboard + save reachable | Loading/error/retry | Toast / focus | Status |
|---|---|---|---|---|---|
| iPhone Safari 390px | pending | pending | pending | pending | pending |
| iPhone Safari 430px | pending | pending | pending | pending | pending |
| Android Chrome 360px | pending | pending | pending | pending | pending |
| iPad portrait 820px | pending | pending | pending | pending | pending |
| Desktop 1280px | pending | N/A | pending | pending | pending |

**Recommended manual test:** using *test records*, open Add Agenda; type some text, cancel and choose Stay; verify fields unchanged; close again and choose Discard; type a valid sample agenda, save once, verify exactly one new item and a success Toast. Open a long minutes form on iPhone with keyboard shown; scroll fields and reach Cancel/Save. Put device offline and tap Retry (do not submit an official record while offline), then reconnect and load. Use a restricted account to verify permission-error text without exposing raw tokens or database details.

**Release stop conditions:** Save/Cancel hidden behind keyboard, duplicate submission on double tap, dirty form dismissed without confirmation, unsafe server text in UI, a successful write shown as failed solely because refresh failed, or reviewer/assignee permissions changed.

## Next

Proceed to **UX-05**: visually refine the protected PDF.js/Drive reader as planned, then **UX-06**: multi-device, accessibility, RLS/role and Google Drive acceptance. UX-07 remains a separate approval. No claim of iPhone physical-device or multi-user sign-off until manual QA results are recorded.
