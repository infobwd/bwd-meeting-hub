# BWD Meeting Hub — UX-03 Task Cards, Review & Evidence Acceptance

**Date:** 2026-11-10 | **Status:** IMPLEMENTED IN CODE; REAL-DEVICE + CROSS-ACCOUNT ACCEPTANCE PENDING

Source design: `infobwd/tdrs` mobile card hierarchy and contextual actions. Governing plan: [R2_TDRS_UI_DISPLAY_ALIGNMENT_PLAN_20261110.md](R2_TDRS_UI_DISPLAY_ALIGNMENT_PLAN_20261110.md).

## Scope delivered

- On dashboard, meeting details, and Tasks, task cards show **task title, current status, assigned person, due date**, and (where applicable) originating meeting first.
- Each card exposes at most **one primary, actionable button**: `ตรวจรับ` for a reviewer of a submitted task, or `อัปเดตงาน` for owner/editor of an update-eligible task. **Independent approval guard remains intact:** an owner cannot approve the same task.
- A native keyboard-accessible `รายละเอียดและหลักฐาน` disclosure contains the secondary actions `ส่งกลับให้แก้ไข`, `เปลี่ยนผู้รับผิดชอบ`, `เพิ่มบันทึก`, `ติดตามในการประชุมอื่น`, where permitted; existing evidence input; photo/PDF preview, download; and task history.
- Open/closed state of task disclosures survives an in-app render/filter change, without writing personal content to localStorage.
- Cross-meeting task references remain intact. Duplicate links to the same task inside a meeting render **one card**, not duplicate file inputs. Nothing is deleted from the backend.
- Dashboard and meeting details still show a shorter history; the Tasks list shows up to 10 recent updates. If further history exists the UI says so instead of suggesting a complete audit.
- Simplified mobile task card design and stable 44px button targets; existing Toast, bottom sheet, Supabase RPC, Drive PDF and evidence bucket are unchanged.
- Update `workspace.html` asset query version to prevent iPhone Safari from retaining prior CSS/JS.

## Role/status acceptance (automated renderer contracts)

| Situation | Visible main action | Inside task details | Not shown |
|---|---|---|---|
| Assigned owner, `doing` | Update status | Note, evidence upload, existing evidence/history | Approve, assign others, cross-link |
| Assigned owner, `submitted` | None | Note and evidence | Self-approve, status update |
| Independent reviewer, `submitted` | Review/approve | Return for changes, owner assignment, note, cross-meeting link, evidence | Locked status update |
| Assigned editor, `todo` | Update status | Assign, note, cross-link, evidence | Independent review before submission |
| Non-editor attendee | None | Read-only details/history/evidence **if RLS grants the underlying data** | All task writes/uploads |
| Archived/approved work | None | Existing evidence/history; permissions remain backend controlled | Mutating task status |

**Important:** Hiding buttons is a UX improvement, not an authorization mechanism; RLS and RPC server checks remain the security boundary. Approval/rejection is not equivalent to an external committee's formal resolution.

## Source/automated tests

- `tests/r2-ux03-task-cards.test.mjs`: renders owner, reviewer, guest, 13th-party strings escaped, disclosure state, duplicate link handling, and existing upload/preview paths.
- Existing R1/R2 security, PDF, UX-01 and UX-02 contracts must continue passing; `node --check portal.js` and GitHub Pages build are mandatory.

## Manual acceptance still required

- [ ] iPhone Safari (390px), Android Chrome (360px), tablet portrait (820px) and desktop (1280px): card no horizontal overflow; one primary button; `รายละเอียดและหลักฐาน` and bottom nav do not overlap
- [ ] With keyboard: navigate to summary, open/close, use Save/Cancel in the existing bottom sheets and return focus
- [ ] Owner account: update task, add note, attach image and PDF under 10 MB, preview and download
- [ ] Reviewer different from owner: approve submitted task, return submitted task for changes, assign owner, link to another meeting
- [ ] Guest/attendee account: verify no task mutation controls and no evidence beyond Supabase permissions
- [ ] Task with multiple meeting links renders one card within each meeting; no duplicate uploads
- [ ] Confirm old task statuses, version checks, audit events and private bucket policies unchanged

## Handoff

**UX-04 next:** form-sheet focus/keyboard handling, accessible Toast and loader/error/empty/retry states, without backend schema changes. Then UX-05 PDF reader visual refinement and UX-06 device/role sign-off. UX-07 PWA/dark theme remains separate.
