# UX-05 — BWD Meeting Hub PDF reader acceptance

Date: 2026-11-10. Status: **implementation and automated source/mock acceptance completed; physical-device and Drive-permission QA pending**.

## Scope and corrections
- Keep the existing signed-in, RLS-filtered `meeting-pdf` adapter and PDF.js auto-open behavior; do not copy meeting PDF data into GitHub, publish tokens, or change Google Drive sharing.
- Fix a display bug: explicit `[hidden]` rules now hide the unused Drive pane, canvas pane, and page controls even though their normal layout uses `display:flex`.
- Make the current source mode visible outside the overflow menu. Explain when Google Drive fallback is used; still show that draft minutes/resolutions are **not yet formally ratified**.
- Keep page navigation, zoom/fit, swipe and pinch; add document-focused keyboard Left/Right, Page Up/Down, Home/End. Other form/toolbar controls retain normal keyboard behavior.
- Keep controls disabled before the PDF is fully loaded. Improve 360–430px spacing, status readability, focus indication and dynamic viewport sizing; leave browser zoom enabled.
- Keep back/close focus restoration to the original meeting control. Opening a restricted Drive file is not evidence that PDF.js received its bytes.

## Automated checks
- New `tests/r2-ux05-reader.test.mjs` mocks the reader to verify invalid IDs, permissions fallback, disabled loading controls, document draft labeling, back/focus restoration, and source/HTML/CSS contracts.
- Existing PDF.js adapter, meeting document and R2 access-contract tests must remain green.
- GitHub Actions on the PR branch and merged main must pass (record exact run URL in PR or release handoff).

## Manual matrix (never mark as passed without actual observation)
| Viewport/device | PDF.js page 1–3 / swipe / zoom | Restricted Drive fallback | Back / focus / rotation | Status |
| --- | --- | --- | --- | --- |
| iPhone Safari 390 / 430px | pending | pending | pending | **pending** |
| Android Chrome 360px | pending | pending | pending | **pending** |
| iPad 820px portrait | pending | pending | pending | **pending** |
| Desktop 1280px / keyboard | pending | pending | pending | **pending** |

Test with a permitted 3-page draft and a permission-restricted document, without changing their existing Drive sharing. Confirm that authorized PDF.js opens if the adapter can read the bytes; if not, verify explicit Drive preview fallback or open-original, not a false success. Test an unauthorized user and a signed-out session; do not use public file IDs in fixtures or logs.

## Stop conditions
Drive or document permission bypass, public PDF mirroring, success when preview actually failed, hidden/misleading draft state, inaccessible Close/page controls, focus trapped after closing, or app regression. No official minutes should be ratified by this reader UI change.
