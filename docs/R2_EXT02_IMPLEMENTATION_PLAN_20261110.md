# EXT-02 — Mobile external attendance and reports implementation checklist
Date: 2026-11-10 | Status: development plan on feature branch, prior to code
Baseline: docs/MASTER_PLAN.md sections 18–21; EXT-00, EXT-01 and DOC-00.

## Scope approved by implementation request
- Add an explicit selection between a school-hosted meeting (existing admin/secretary route) and an externally hosted meeting (staff's own event route); co-hosted creator remains deferred until dedicated server RPC.
- Browse/filter meeting list without changing existing three-tab navigation or 13 historical agenda entries.
- External meeting detail: agency/date/location, confirmed participants (different from ACL), personal attendance report, statuses, submitted/reviewed/returned, and authorized Drive document references.
- Users with active admin/secretary/editor role can use existing authorized active-account lookup (not `private.staff_directory`) to add other participants. A teacher may create their own event and report; no global meeting-edit role is granted.
- Add a narrow authenticated RPC for **participant-only Drive reference attachment**, respecting Google Drive original permissions and meeting-level metadata visibility. Optionally allow staff to confirm their own attendance with audit.
- Reuse EXT-01 RPCs: `r2_ext_create_meeting`, `r2_ext_add_participant`, `r2_ext_save_report`, `r2_ext_submit_report`, `r2_ext_withdraw_report`, `r2_ext_review_report`. Never bypass version checks or self-review constraints.
- No automatic school resolutions, task assignment, email/LINE delivery, invitations, minutes ratification, formal Docs/PDF report export or changing old meetings to six-part agenda; these belong EXT-03/DOC-02/DOC-03.

## Security/UX commitments
- Actual participants != meeting_access roles, and reporter's report != host's official certified minutes.
- RLS read permissions and audited RPC only, no direct table writes; forbid guest and inactive users; no private staff roster exposure.
- Only author may save/submit/withdraw own report; editor reviewer cannot approve own report.
- Protect version conflicts and async stale modal requests; escaped HTML, meaningful Thai errors, keyboard and mobile-safe controls.
- Avoid leaking private rows in GitHub test fixtures, verify pre/post live aggregate counts. Do not fabricate attendance or send invitations.
- Drive links and file IDs stay scoped in Supabase; browser links only show to authorized meeting viewers; Drive owner must independently grant source-file access.

## Acceptance
1. Existing R2 source/security/UX tests and EXT-01/DOC-01 tests stay green.
2. Test with invented data: school 5-section/13-agenda preserved; external report detail, author vs reviewer controls, no false ratification, meeting filters, role-specific buttons, and no active-user roster from private directory.
3. Check anonymous RPC denial, authenticated execution grants, new RLS policies if schema added, and historical meeting/agendas/tasks counts unchanged.
4. iPhone/Android real-device and independent account RLS verification stay release blockers while only one active account is available.
5. Update Master Plan, branch → PR → CI → Merge; document any remaining gaps and the next slice.

This is the implementation plan, not an authorization for official production use.
