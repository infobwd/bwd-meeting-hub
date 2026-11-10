# BWD Meeting Hub — TDRS-Informed UI Display Alignment Plan
**Document ID:** BWD-UI-TDRS-R2 | **Date:** 2026-11-10 | **Status:** PLANNED — no UI code changes in this task

## 1. Objective and scope
Refine the actual **R2 Supabase-connected workspace**, not R1 localStorage demo, into a coherent mobile/tablet/desktop application experience. Read the source of `infobwd/tdrs` (main) as the **reference for UI and interaction patterns**, adapt to the meeting lifecycle, and retain the BWD navy/gold school identity. This is a design/implementation roadmap, **not a request to copy TDRS source or rewrite the current app in React**.

Lifecycle: **prepare agenda → attach documents → hold meeting → draft resolution/minutes → review → assign task → progress/evidence → independent acceptance → track in subsequent meeting**. Every state and action must be backed by currently available Supabase data and permissions; never imply a resolution is ratified just because a draft PDF exists.

## 2. Verified source inspection
| Design element | TDRS reference on main | What to adapt to BWD |
|---|---|---|
| Mobile application shell | `src/components/Navigation.tsx` — mobile bottom tabs, center quick-action button, contextual hiding of global tabs on data-entry pages, tablet bottom-sheet menu, safe-area padding, role-dependent navigation | Keep BWD's existing 3 bottom tabs; refine active states/spacing, allow *permissioned contextual* action and prevent double stacked bars |
| Modal/Bottom sheet | `src/components/Navigation.tsx` mobile sheet, body-scroll lock and backdrop; `src/index.css` slide-up and desktop animation | Reuse existing BWD `#modal.form-sheet` and confirmation dialog; unify sheet focus, scroll containment, keyboard, cancel/save behavior |
| Mobile typography and iOS zoom | `src/index.css` input/select/textarea minimum 16px under 768px | Retain/QA BWD 16px controls; do **not** disable user zoom or change viewport scale |
| Theming and visual tokens | `src/index.css` color/font tokens, dark overrides; `src/themes.ts`, `src/appearance.ts` for theme/fonts | Establish BWD tokens: navy + gold, muted surfaces, readable Thai hierarchy. Optional dark/system theme only with contrast testing |
| Home hierarchy | `src/components/dashboard/MobileHero.tsx`, `src/components/Dashboard.tsx`, `docs/roadmap/PHASE-9-MOBILE-HERO.md` | Reinterpret compact welcome/status header, upcoming meetings, assigned tasks and pending reviews — **not** duty/attendance metrics or decorative hero by default |
| Loading, actions and accessibility | `src/components/SkeletonLoader.tsx`, `src/utils/toast.tsx`, `src/components/ScrollToTop.tsx` | Extend BWD's existing toasts, add skeletons, accessible empty/error/loading/retry states, sensible back-to-top placement |
| Install/update experience | `public/manifest.json`, `src/components/PWAPrompts.tsx`, `src/hooks/useSWUpdate.ts` | Study for later; **do not add offline caching of meeting content, tokens or private PDFs in this UI pass** |
| PDF viewer | TDRS focuses on app shell and PDF export utilities; **not a drop-in reference** for a meeting PDF flip reader | Keep the dedicated PDF.js / private-Drive reader direction from `infobwd/nongkum-sports-hub` and `docs/R2_PDF_READER_PARITY_DRIVE_PROXY_QA.md`. Borrow TDRS shell/toolbar spacing only, not document-security assumptions |

BWD code baseline checked: `workspace.html`, `portal.js`, `portal.css`, `meeting-pdf-reader.js`, `docs/R2_MOBILE_UI_ACCEPTANCE.md` and the Drive-document plan. Existing R2 bottom nav, bottom-sheet, toast, private evidence/image/PDF modal and draft meeting document links are **already implemented**. Upgrade/refine; don't duplicate these features.

## 3. UX principles
1. **Mobile first, tablet comfortable, desktop efficient.** Designed viewports 360x740, 390x844, 430x932, 768x1024, 820x1180, 1024x768, >=1280; both iOS Safari and Android Chrome.
2. **Only clear Thai everyday labels.** Avoid 'JWT', 'RLS', 'RPC', 'JSON', 'draft data', and other developer vocabulary in the visible UI. Preserve meaningful labels 'ฉบับร่าง', 'รอตรวจรับ', 'รับรองแล้ว'.
3. **Progressive disclosure.** Show next action first; detailed metadata, historical updates and Drive options behind clearly named sections.
4. **Calm design.** Navy/gold accents on headings, primary actions and one high-priority status; no persistent flashy badges, fake device status bar or unnecessarily heavy animations.
5. **Reliable navigation.** One back path to meeting detail; opening/closing sheets and PDFs restores context, selection, scroll position and focus.
6. **Permission-safe.** Controls are hidden/disabled based on known permitted actions, but backend RLS/RPC remains the authorization source; no client-only access logic.
7. **No fake confirmations.** Separate saving a draft, submitting for review, executive review, and formal committee ratification. No invented reminders.
8. **Reuse-first.** Vanilla HTML/CSS/JS remains the implementation platform; React/Tailwind or TDRS component copy is explicitly out of scope.

## 4. Target mobile screen structure
- **App header:** concise BWD brand + current page title; display account/menu without crowding; no tall persistent generic heading at narrow widths.
- **Bottom navigation:** 3 primary destinations `ภาพรวม`, `การประชุม`, `ภารกิจ`; legible icons, 44px+ touch targets, safe-area bottom inset. Highlight current destination. Do not show a second fixed footer over it.
- **Contextual quick action:** inside a meeting detail, offer `เพิ่มวาระ` / `แนบเอกสาร` / `มอบหมายงาน` to editor only. On dashboard consider one compact quick-action surface; avoid an always-on FAB until overlap/role tests pass.
- **Home cards:** `ประชุมที่จะมาถึง`, `งานของฉัน`, `รอตรวจรับ` where entitled, `งานใกล้กำหนด` using real due dates. Show last updated only if the timestamp is backed by the database. Zero-data empty states must be welcoming and explicit.
- **Meetings list:** scannable cards with meeting type, Thai date, accurate status, agenda count and one `เปิดรายละเอียด` action; avoid repeating text and raw UUIDs.
- **Meeting detail:** compact summary then sections `วาระการประชุม` → `เอกสารประกอบ` → `รายงานการประชุม` → `งานที่ติดตาม` → `ผู้เข้าร่วม`. Keep draft/review labels visible. Consider collapsible agenda groups (1–5) on phones; desktop expands more.
- **Tasks:** status + assignee + due date first, progress/history/evidence second; preserve `ส่งให้ตรวจ` vs `ตรวจรับแล้ว`. Use one task-detail bottom sheet or dedicated page; don't crowd cards with 6–8 buttons.
- **Forms:** mobile bottom sheet with handle, scrollable field body, stable footer Cancel/Save, input font >=16px, focus restore and unsaved-change handling. Desktop uses normal dialog.
- **Documents/PDF:** tap `อ่าน PDF` opens reader in-app. Keep its own header, page controls, fit/zoom and `กลับการประชุม`; Drive Preview is honest fallback when direct PDF bytes cannot be fetched under applicable permissions. Never show a draft PDF as ratified minutes.
- **System feedback:** toast for save/retry/error, nonblocking; inline field errors where possible; skeleton only while content loads; retry state for failed network. No native `alert`/`confirm` for regular workflows.

## 5. Proposed phased work (one PR per independently testable slice)
| ID | Priority | Work package | Files likely touched | Acceptance gate |
|---|---|---|---|---|
| UX-00 | P0 | Inventory screenshots at named viewports; map every screen/action + role. Baseline mobile & desktop before changes | `docs/` QA snapshots/checklist | Identifiable visual issues, no functional assumptions |
| UX-01 | P0 | App shell, tokens, text spacing, header, bottom tabs, safe areas, responsive tablet breakpoints | `portal.css`, `workspace.html`, small `portal.js` changes | No overlap/sideways scroll; login/logout, menu and 3 tabs work |
| UX-02 | P0 | Meeting list/detail and agenda card/sections; clear status and contextual actions | `portal.js`, `portal.css` | Every one of the 13 sample agenda items remains reachable; no status changed |
| UX-03 | P0 | Task cards/actions and evidence hierarchy; assignee/reviewer differentiated | `portal.js`, `portal.css` | Owner, editor and guest see only appropriate controls; existing evidence still previews |
| UX-04 | P1 | Unified form/sheet, accessible toast, skeleton, empty/error/retry states | `workspace.html`, `portal.js`, `portal.css` | No iOS keyboard zoom, blocked save, focus loss or double submissions |
| UX-05 | P1 | Align PDF viewer visual shell with BWD app; verify parity with sports reader while respecting Drive access | `meeting-pdf-reader.js`, `portal.css`, related QA | Authorized read, page nav, pinch/zoom, exit/back; restricted Drive honest fallback |
| UX-06 | P1 | Desktop/tablet refinement, A11y checks and manual role/permission matrix; source-contract tests | `tests/`, `docs/` | All primary flows verified, no schema/migration or auth regression |
| UX-07 | P2 separate approval | Evaluate system dark theme, add-to-home PWA polish, update prompt, optional hero/branding | separate spec only | No private content cached offline; reviewed by user before build |

**Sequencing:** UX-00 → UX-01 → UX-02/03 → UX-04 → UX-05 → UX-06. UX-07 is not part of the immediate release. Never merge long-running display changes while unrelated data migrations are in-flight without rebasing and rerunning checks.

## 6. Concrete acceptance criteria
- **Layout:** zero horizontal page scrolling at 360px/390px/430px. No bottom nav covering saved buttons, file previews, task actions or long documents. Tablet portrait is not squeezed by a desktop sidebar.
- **Touch:** targets >=44x44 CSS px; sheet close/back can be reached with keyboard open; ESC/backdrop works where appropriate; focus returns to trigger; no unexpected iOS Safari zoom.
- **Text:** important actions can be understood without tech vocabulary; numbers and Thai dates remain legible; status colors are supported by text not color alone.
- **Accessibility:** semantic headings, labelled controls, visible focus, toasts announced, dialogs focus trap/restoration, reduced motion; screen reader baseline on iOS.
- **Auth/data:** compare user/admin/editor/assignee/guest access using separate test accounts. Browser may show only rows allowed by RLS. Do not expose private Drive links in static HTML, public JSON or logs. Avoid automatic data caching of sensitive content.
- **Regression:** same meeting count/agenda order, task versions/status updates, draft minutes, photo evidence upload and preview, review workflow, Drive attachment. Cancel must not write; Save should not duplicate.
- **PDF parity:** explicitly record whether PDF.js loaded or Drive fallback was used. Test 3-page current draft on iPhone; never claim parity based solely on CI.
- **QA release:** PR with screenshots from 360/390/820/1280px, source-contract tests and GitHub Actions passing. Mobile and multi-role manual acceptance still required before production use.

## 7. Non-goals & risk controls
- No React/Tailwind migration or visual wholesale copy from TDRS.
- No changes to Supabase schema, RLS, approval states or Drive permissions in a display-only PR.
- No blanket publication of Drive files, public PDF mirrors, storage tokens in source, or hardcoded meeting data.
- No automatic AI approval of decisions/meeting minutes; official resolution only after human confirmation.
- No assumption that a successful PWA or PDF.js build equals secure cross-role deployment.

## 8. Handoff and decision gate
**Plan-only today.** Prioritize UX-00/UX-01 after review. Ask for a screenshot of the **specific TDRS screen** if an exact visual clone of a TDRS view is desired; repository code establishes behaviors but does not guarantee pixel-perfect live rendering. Existing production pages remain unchanged until separately authorized.
