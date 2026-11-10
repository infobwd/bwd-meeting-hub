# BWD Meeting Hub — UX-00 Source Baseline & TDRS Display Gap Audit

**Checked:** 2026-11-10 | **Status:** SOURCE AUDIT COMPLETE / REAL DEVICE QA PENDING | **Scope:** R2 website only, **documentation-only**.

This accompanies [R2_TDRS_UI_DISPLAY_ALIGNMENT_PLAN_20261110.md](R2_TDRS_UI_DISPLAY_ALIGNMENT_PLAN_20261110.md). It establishes an evidence-based baseline **before** UX-01 implementation. The audit inspected code in `infobwd/tdrs` and `infobwd/bwd-meeting-hub` on `main`. It is **not** a browser screenshot review, Lighthouse run, real-device test, or production acceptance certificate.

## 1. Reference-to-target mapping

| TDRS source (main) | Actual reusable pattern | BWD target and guardrail |
|---|---|---|
| `src/components/Navigation.tsx` | Role-dependent nav, mobile bottom tabs, contextual quick menu, tablet handling | `workspace.html` `nav.tabs` and `portal.css`; retain three main tabs and permission-safe actions. No unreviewed permanent FAB |
| `src/components/dashboard/MobileHero.tsx`, `src/components/Dashboard.tsx` | Prioritize information people need today; mobile-first card hierarchy; optional gentle hero motion | `portal.js` `renderOverview`; replace *school-duty* concepts with meetings, tasks, submissions/reviews. No decorative heavy hero by default |
| `src/index.css` | Thai typography, >=16px form controls to avoid Safari focus zoom, responsive surface and color tokens | `portal.css`; preserve existing 16px guard, BWD navy/gold, focus visibility and safe-area offset |
| `src/components/SkeletonLoader.tsx`, `src/utils/toast.tsx` | Skeleton and distinct success/error feedback | `portal.js` `reload`, `render`, `statusMessage`; reuse BWD toast, add loading/retry/empty states. Do not import React components |
| `src/components/ScrollToTop.tsx` | Scroll utility hides when not needed, avoids bottom nav | Consider after verifying scroll-heavy meeting-detail and task screens; do not let it cover save or PDF controls |
| `src/components/PWAPrompts.tsx`, `public/manifest.json` | Version/update/in-app install cues | Deferred; never cache auth tokens, agenda details, minutes, private PDFs for offline use |
| `infobwd/nongkum-sports-hub/js/booklet-unified-viewer.js` | Genuine PDF.js reader interaction baseline | **PDF behavior stays based on Nongkum Sports**, not TDRS. Respect Google Drive ACL and RLS; distinguish PDF.js vs Drive fallback in QA |

## 2. Source findings in current BWD UI

| ID | Priority | Verified in code | UX concern / proposed fix | Follow-up package |
|---|---|---|---|---|
| BWD-UX-001 | P0 | `workspace.html` has three bottom tabs; `portal.css` positions tabs at <=900px and accounts for safe area | Establish screenshot baseline at 360/390/430/820/1280; check header height, account truncation, bottom content overlap. **Refine, do not add a second nav** | UX-00/01 |
| BWD-UX-002 | P0 | `portal.js` `taskCard` conditionally renders many adjacent actions (update, review, change owner, note, link, evidence upload) within each card | On phone, prioritize one clear next action + a named `เพิ่มเติม` action group or task details sheet. Ensure role controls remain server-authorized | UX-03 |
| BWD-UX-003 | P0 | `meetingCard` shows broad labels `กำลังเตรียม` / `รอตรวจรายงาน` / `ตรวจทานแล้ว`; `renderMeeting` handles separately draft/report/decision | Build a complete status-label mapping by actual backend states; never equate administrator-reviewed minutes with a legally ratified committee resolution | UX-02 |
| BWD-UX-004 | P1 | `renderMeeting` puts `เอกสารประกอบการประชุม` before `ระเบียบวาระ`, with all agenda entries visible in a long vertical list | Keep **one-tap document access**, but present an agenda index or collapsible sections 1–5 for 13+ items; use anchored, consistently labeled sections. User should return from PDF to same position | UX-02/05 |
| BWD-UX-005 | P1 | `renderOverview` has 3 metrics and lists latest created meetings plus assigned tasks; `reload` batches Supabase queries | Differentiate next meeting vs latest created, due soon vs pending review using only real data; add loading skeleton and retry when network fails. Never invent reminders or metrics | UX-01/04 |
| BWD-UX-006 | P0 | `portal.css` implements `#modal.form-sheet` on <=900px with scrollable body and footer; `portal.js` opens modal without focusing fields automatically on mobile | Manually verify keyboard/viewport behavior, form cancel/save, focus restore, unsaved changes. Retain 16px form input rule to prevent iPhone zoom | UX-04 |
| BWD-UX-007 | P1 | `statusMessage` already creates nonblocking success/error toast; `reload` throws on query error | Keep toast but add field-level validation and explicit network-failure retry. Avoid translating Postgres error text directly into overly technical user messages | UX-04 |
| BWD-UX-008 | P0 | `meeting-pdf-reader.js` + `supabase/functions/meeting-pdf/index.ts` implement PDF.js attempt and Drive fallback | Visually test iPhone: page controls, pinch, rotation, close/back, PDF.js-vs-Drive source notice, 3-page sample; verify restricted Drive does not silently become public | UX-05 |
| BWD-UX-009 | P1 | `portal.js` `renderTasks` filters all/mine/review and `taskCard` renders evidence/history inline | Shorten card summary and move long evidence/history to expandable details; do not hide progress or review action | UX-03 |
| BWD-UX-010 | P1 | Existing `portal.css` has BWD navy, gold, surface, radius and multiple mobile media rules | Consolidate additive CSS into named design tokens **without** silently changing color contrast, existing reader styles or print layout | UX-01/06 |

### Immediate recommendation

**UX-01** should start with app-shell consistency (header, bottom tabs, touch targets, accessible focus, content safe areas) and **one consistent navigation/toolbar rule**. Do not attempt a whole-page redesign or backend migration in the first implementation PR. **UX-02** and **UX-03** then address the substantive density and status hierarchy problems; **UX-05** addresses PDF behavior independently.

## 3. Baseline acceptance matrix — MUST test manually before any production sign-off

Record a pass/fail, device/browser, screenshot identifier, and notes for each scenario. `pending` below means **not tested**, not failed.

| Scenario | 360px Android | 390px iPhone Safari | 430px iPhone | 820px tablet portrait | 1280px desktop |
|---|---|---|---|---|---|
| Signed-in shell, three tabs and header, zero horizontal overflow | pending | pending | pending | pending | pending |
| Meetings list + 13-item draft agenda access; long Thai headings | pending | pending | pending | pending | pending |
| Reviewee vs reviewer: task actions and long evidence list | pending | pending | pending | pending | pending |
| Add agenda/task bottom sheet: keyboard, scroll, Cancel, Save | pending | pending | pending | pending | pending |
| Toast, network error, empty state, retry | pending | pending | pending | pending | pending |
| In-app PDF: source shown, page 1–3, zoom, back, fallback | pending | pending | pending | pending | pending |

Role checks require a **separate test account** for administrator, secretary/editor, attendee/guest and assignee. Do not infer role protection from hidden buttons; backend ACL/RLS still determines access. Capture screenshots privately (not in a public repo if they show names/meeting data).

## 4. UX-01 engineering handoff (no code changes yet)

1. Create a small `portal.css` tokens section for BWD navy/gold, surfaces, text, border, spacing, focus and motion. Respect user font and device zoom.
2. Refine `workspace.html` header and `.tabs` **without changing tab IDs, event bindings or role permissions**. Maintain one page header and 3 destinations. Allow the title to wrap without stretching the phone.
3. Use responsive nav and safe-area padding; test with software keyboard shown and in iPad portrait/landscape. Avoid `position:fixed` overlays over critical controls.
4. Keep meaningful statuses with text and ensure interactive elements >=44x44px.
5. Add source checks for nav IDs and event wiring plus screenshots/acceptance notes. Run existing GitHub tests and check smoke flows login/logout, meeting detail, task controls, PDF preview.
6. PR `UX-01` should be small and independently revertible; do **not** alter `supabase/migrations`, Edge Functions, Google Drive permissions or existing meeting data.

## 5. Acceptance and stop conditions

- No visual sign-off is claimed from this repository code inspection.
- Stop implementation if screenshots show PDF controls hidden behind a bottom bar, modals inaccessible with the iOS keyboard, or tablet view squeezed by inappropriate breakpoint.
- Stop release if any UI regression changes review vs ratification text, bypasses RLS, or discloses private file paths.
- Keep `R2_TDRS_UI_DISPLAY_ALIGNMENT_PLAN_20261110.md` the governing design roadmap and use this document as the **UX-00 engineering baseline**.
