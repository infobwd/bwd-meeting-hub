# DOC-02 — Two Official Meeting Draft Types: Implementation and Technical Acceptance
Date: 2026-11-10 | Document status: engineering record, **not** school approval.
Related: [revised requirements](R2_DOC02_REVISED_REQUIREMENTS_AND_IMPACT_20261110.md), [DOC-00](R2_DOC00_OFFICIAL_DOCUMENT_UX_SPEC_20261110.md), [DOC-01](R2_EXT01_DOC01_BACKEND_ACCEPTANCE_20261110.md), [EXT-02](R2_EXT02_MOBILE_REPORTS_ACCEPTANCE_20261110.md).

## Changes and functional scope
- Independent **ระเบียบวาระการประชุม** (pre-meeting) and **รายงานการประชุม (แบบที่ 11)** (post-meeting) forms. Both import meeting metadata and every source agenda topic in its recorded order. Source topics are never edited by the DOC-02 form.
- For the existing school-board meeting, source data still comprises **13 agenda records in 5 sections**. The global stored `agendas.position` (1–13) is unchanged; presentation derives human-friendly section-local labels (1.1, 2.1, … 5.1/5.2) from sorted records, without persisting a changed number.
- An optional new six-section meeting can be previewed with its own `meeting_document_settings.agenda_template_key=school6`; the current board meeting is never backfilled or reclassified.
- Agenda previews show source title/notes plus optional context/background, referenced documents and discussion question. Preview can include attached document titles (not public file data/credentials).
- Minutes previews collect the eleven categories in Clause 25 / Template 11, with participants/absences/observers separated, actual presiding chair, school/committee secretary, and actual recorder; also separately collect permanent office positions (not used to infer committee role). Users must check appointment order, substitutes, and actual attendance before authoritative issue.
- Per-item minutes record **substance, deliberation, information acknowledged, draft resolution, proposal not concluded, and directive/task suggestion** simultaneously. These are labeled as DRAFT and are never inserted into `public.decisions` or `public.tasks`.
- A4 visual preview uses a visible draft watermark and responsive reading form. **No official PDF/Google Docs output, electronic signature, committee ratification, publication or archival**; DOC-03 remains separate.

## Data/state and permissions
- New `meeting_agenda_document_versions` separate from existing `meeting_official_minutes_versions`. Each has its own immutable revision sequence, status and audit trail; new operations append snapshots, never update a previous version.
- Allowed DOC-02 states: draft → submitted → reviewed; submitted → returned → new draft. **No DOC-02 RPC can create `ratified`**. Existing `meeting_ratifications` remains untouched.
- `r2_doc02_save_draft`, `r2_doc02_submit`, `r2_doc02_review`: authenticated, role/scope checks, strict optimistic revision conflict detection and `private.doc02_valid_fields` verifying exactly the source agenda IDs, title, notes, section and stored position for each saved snapshot. An independent administrator reviews; the last submitter cannot approve their own copy. Review and submission append versions, not changes to legacy minutes.
- RLS on the new agenda-version table. Authenticated client grants **SELECT only**; anon has no read or RPC execution. Drafts/submitted/returned versions visible only to authorized editors; reviewed versions may be viewed by permitted meeting participants. Existing structured minute-version RLS likewise restricts non-editor visibility to reviewed/ratified.
- Only legacy and explicitly school-hosted meeting modes use DOC-02. Externally-hosted reports continue through EXT-02; co-hosted official-document ownership is postponed until authorized host/secretariat rules are confirmed.
- DOC-02 private dialog closes and removes private text on logout/access loss; stale in-flight responses cannot repopulate it.
- Browser preview and testing do not prefill or publish private names/appointment records. Public test data uses invented people and meeting topics.

## Verified Supabase state (2026-11-10)
Migration `20261110164032 doc02_separate_agenda_minutes_draft_versions_20261110` returned success.
- Before and after: 1 meeting, **13 agendas / 5 groups**, **1 legacy minutes row: version 4, status `submitted`**, 1 task.
- New agenda-document table: **0 rows**; structured minutes versions: **0 rows**; formal ratifications: **0 rows**.
- Both document-version tables RLS enabled and policy-bound, anon SELECT false; authenticated SELECT true, direct INSERT/UPDATE false (row predicates still apply).
- Three new authenticated `SECURITY DEFINER` RPCs, anon EXECUTE=false, source checks. Catalog verification **does not prove** cross-account access denial. Supabase security advisor definer-function warnings now **34** (previous 31 + three new); existing password-protection warning remains to resolve through admin configuration.

## Acceptance matrix
| Scenario | Automated/source-level check | Additional real acceptance |
|---|---|---|
| 13/5 agenda survives and 5.1 is displayed | DOC-02 mock renderer and SQL no-backfill contract | Compare actual on phone |
| minutes v4 submitted never becomes reviewed/ratified | Live read-only count/version/status check | Ensure staff see accurate original status |
| Agenda and minutes have separate revisions | Distinct schema, snapshot tests | Two-account save/submission |
| One item has several outcomes, no automatic decisions/tasks | Renderer and source-contract test | Secretary reviews content |
| Chair vs secretary vs recorder vs permanent positions | Formatter and user fields | Validate appointment order and acting chair |
| Editor saves/submits; independent admin reviews | RPC security/check code | Real independent accounts required |
| A4 mobile preview and watermark | CSS + pure renderer tests | iPhone/Android and multipage overflow |
| File titles scoped via meeting; no public Drive URLs | Renderer/source check | Private Drive ACL with second account |
| Unapproved item corrections not applied | Migration has no legacy rows update | School responsible verifies current drafts |

## Release gates / limitations
- This is functional **drafting and preview code**, not a formal meeting report certified by the school. Human review and school-specific rules still required.
- DOC-02 does not rewrite or auto-correct disputed entries in the current meeting (the user supplied pending item notes in chat only).
- New capabilities do not authorize user creation/invitations or notifications.
- Independent real-role RLS tests, private Drive file permissions, iOS/Android touch/screen-reader evaluation, backup/restore on Supabase Free, and formal school approval remain **pending**.
- Legacy old browser print path is unchanged; do not mistake it for DOC-02 certified export. DOC-03 will handle official issuance, signature and archive after process verification.
- Next recommended scope: **DOC-03** review/ratification and official export *only after approval*, and **EXT-03** external meeting information → internal agendas/tasks provenance. For immediate UX refinement, verify DOC-02 draft forms on a real iPhone/Android before official use.

## Technical evidence and PR
- Migration source: `supabase/migrations/202611100012_doc02_separate_document_versions.sql`.
- UI: `doc02.js`, `portal.js`, `portal.css`, `workspace.html`.
- Regression: `tests/r2-doc02-official-previews.test.mjs`, existing EXT-02/UX-02/UX-11 tests.
- Feature PR number, CI and GitHub Pages run identifiers are recorded in the final post-merge update.
