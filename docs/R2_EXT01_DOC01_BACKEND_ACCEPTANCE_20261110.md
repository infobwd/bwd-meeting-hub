# EXT-01 + DOC-01 — Non-breaking backend contract (implementation acceptance)
Date: 2026-11-10 | Scope: Backend-only first slice; **no new UI, notification or formal document exports**.
Related: [EXT-00 audit](R2_EXT00_SOURCE_BASELINE_AND_CONTRACT_20261110.md), [DOC-00 mobile specification](R2_DOC00_OFFICIAL_DOCUMENT_UX_SPEC_20261110.md).

## 1. Implemented in repository
- Migration 009: extra nullable hosting fields on meetings (old rows NULL/unknown), participation register independent from meeting_access authorization, staff-owned external attendance reports with draft/submitted/returned/reviewed states, optimistic version checks, audit events and narrowly authorized RPCs.
- Migration 010: opt-in per-meeting agenda template selection; expand agenda numeric storage to 1–6 while preserving old r2_add_agenda 1–5 check and all old rows; versioned official-minutes snapshots and ratification evidence separated from existing minutes.admin-review. Snapshot and ratification tables **are not yet writable from a client**.
- New RPC names for external meeting create, add active participant, save/submit/withdraw/review own attendance report. Teachers only create an own external participation record with read-only meeting-level access; do not grant general meeting edit/task assignment permission.
- New DOC RPC: set agenda template only for a writable meeting with no existing agenda if changing, and add a sixth section only under an explicitly selected school6 template.
- Source-level test: tests/r2-ext01-doc01-contract.test.mjs (part of existing node --test tests/*.test.mjs CI).

## 2. Data model and behavior

| Entity | Key fields | Read access | Write path |
|---|---|---|---|
| meetings (extension) | meeting_mode (nullable), host_organization, host_type, optional starts_at / ends_at | Existing meeting RLS | New external create RPC; old create signature intact |
| meeting_participations | (meeting_id,user_id) unique, participation_role, attendance_status='unknown' | Meeting editor or self with meeting access | New editor-checked add participant RPC (creator auto-added) |
| external_attendance_reports | (meeting_id,author_id) unique; sections as text; status, version, review fields | Meeting editor or author with meeting access | Own report save/submit/withdraw; different authorized reviewer approves/returns |
| meeting_document_settings | meeting_id, agenda_template_key=legacy5/school6, template_version | Existing meeting reader | Editor selects template; cannot silently switch 13 old agendas |
| agendas | section smallint widened to allow 1–6 | Existing RLS | Legacy RPC remains 1–5; new RPC gates section 6 by school6 |
| meeting_official_minutes_versions | (meeting_id,revision) unique; JSON object snapshot/status | Editors see drafts; permitted attendees may see reviewed/ratified versions | **No exposed writer yet** (DOC-02/03) |
| meeting_ratifications | meeting + referenced official version, date/method/evidence/actor | Meeting readers | **No exposed writer yet** (school sign-off required) |

### Safe distinction
- meeting_participations != meeting_access.
- External report != official minutes created/ratified by external host.
- Internal admin-reviewed minute != ratified minute of committee.
- A school6 template does not change the school-board 13 existing items (five groups).
- No automatic user invitation, due date, task, committee resolution, external directive or Google Drive share change.

## 3. Rollout order
1. Review source migration 009 and 010 in a branch; run node --test and code review. Migrations must be applied strictly **009 before 010**, inside atomic transactions and only once. Supabase migration history may use a generated timestamp differing from file names; use unique descriptive names.
2. Before production use: protected backup/export, verified ability to restore, confirm Supabase Free quota and retention. **This migration does not replace those gates**.
3. After any schema apply, run read-only introspection: new table list, RLS on, SELECT-only client grants, anon no EXECUTE, authenticated EXECUTE for only intended new RPCs, 1 existing meeting and 13 agenda items unchanged (counts may change if other writes occur); existing old RPCs and UX-11 operations still present.
4. Test separate authorized admin, secretary, attendee and unauthorized user once additional accounts have been explicitly provisioned. Never manufacture or invite personnel for testing. Tests required: cannot list other teachers' draft reports, cannot review own report, revoked meeting cannot submit/withdraw, guest cannot author, version conflicts, no duplicate participants, no sixth agenda on legacy/no-template, existing 13 agendas remain.
5. EXT-02: wire mode-first mobile flow to these RPCs and list permitted data. DOC-02: previews/structured form only; later DOC-03 authorized A4 and Google Docs export + official sign-off mechanics.

## 4. Rollback
- Do not delete new rows as an automated rollback. If frontend/API feature needs disabling, first stop calling r2_ext_* and r2_doc_* from client. Old application still operates with legacy signatures.
- Dropping columns/tables is **not** an acceptable routine rollback after new data exists. Restore from a *verified protected backup* with explicit loss-of-data assessment and approval if necessary.
- Existing five-group meeting is never backfilled; no manual migration of historical data has been run.

## 5. Gates

| Gate | Status |
|---|---|
| SQL/RPC authored in branch | Complete |
| Source-level tests added | Complete |
| GitHub Actions + review | **Passed:** PR #30, workflow run 231 |
| SQL applied to linked Supabase | **Applied:** both migrations on 2026-11-10 |
| Live schema/read grants/function permissions | **Verified read-only** after apply |
| Real multi-role auth/RLS checks | Blocked: only one active account at baseline |
| Full school-approved agenda/report forms | Pending formal sign-off |
| UI/Drive files/PDF export | EXT-02 / DOC-02 / DOC-03, not this slice |
| Production go-live/backup-restore/privacy | Not approved |

This file is a release checklist and implementation record, not a claim that any real meeting report was ratified.

## 6. Post-deployment verification (2026-11-10)
- GitHub PR [#30](https://github.com/infobwd/bwd-meeting-hub/pull/30) merged into `main`; CI `BWD smoke and security checks` run 231 succeeded. Backend migration sources are committed; no UI changes.
- Supabase Meeting migration history: `20261110152820 ext01_external_meeting_participation_20261110` followed by `20261110152836 doc01_official_document_contract_20261110`. Both reported success.
- **Before and after:** meetings=1, agendas=13, minutes=1, tasks=1. Existing meeting remains `meeting_mode=NULL`. All five added tables are empty (no meeting attendance or documents fabricated).
- New tables (`meeting_participations`, `external_attendance_reports`, `meeting_document_settings`, `meeting_official_minutes_versions`, `meeting_ratifications`): RLS enabled; each has a scoped SELECT policy; `anon` SELECT=false; `authenticated` SELECT=true, direct INSERT/UPDATE=false. Row-level access still requires the policy conditions.
- Eight new `r2_ext_*`/`r2_doc_*` RPC signatures: `anon EXECUTE=false`, `authenticated EXECUTE=true`, SECURITY DEFINER with role / meeting permission checks. Important: this is permission catalog verification, **not** live attacker-role execution testing.
- Legacy signatures for create meeting, add agenda, save/review minutes, link task and task submission withdrawal still exist and are executable by authenticated users under their existing server checks.
- `agendas_section_check` now allows storage sections 1–6; legacy UI and `r2_add_agenda` continue using 1–5. No sixth-section row was inserted.
- Supabase security advisor: `authenticated_security_definer_function_executable` warnings increased from 21 to 29 (the eight deliberately exposed guarded RPCs); each must remain in manual security review. Existing `private.staff_directory` RLS/no-policy INFO and leaked-password-protection WARN remain open and require separate owner action. See https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- **NOT verified:** independent accounts / authenticated cross-role RLS, per-role RPC execution/denial, iPhone/Android UI, secure backup/restore, document/signature/ratification school sign-off. **No production go-live approval.**
