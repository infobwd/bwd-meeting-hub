# R2 Supabase Connection & Transactional Verification — 2026-11-10

## Connected project
- Supabase project name: **Meeting**
- Project URL: https://zprxvpfkvforoxrboqiv.supabase.co
- Project ref: `zprxvpfkvforoxrboqiv`
- Project health at connection: `ACTIVE_HEALTHY`
- Browser configuration: `config.public.js` uses only **publishable** API key. NEVER commit service_role, secret keys or credentials.
- GitHub repository: `infobwd/bwd-meeting-hub` is **public**. No meeting records or personal details should be committed.

## Database operations completed
Four SQL migrations applied successfully from `main/supabase/migrations/` in order:
1. `202611100001_core.sql`
2. `202611100002_security.sql`
3. `202611100003_operations.sql`
4. `202611100004_private_evidence.sql`

Observed: **12/12 application tables with RLS enabled**, each has an applicable SELECT policy. Direct SELECT table grants to `authenticated` are subject to RLS; `anon` has no SELECT access to meeting/task tables. Write RPC functions are unavailable to `anon`.

Private Storage bucket `meeting-evidence` exists, is NOT public, has a 10 MiB per-object limit, and accepts PDF, JPG/JPEG, PNG and WebP. This is configuration-level validation; live upload/download tests remain pending.

## Executed negative + role tests
SQL tests run against the actual Supabase database, using PostgreSQL role impersonation and **transaction-only synthetic identities**. Test data was rolled back; no real Auth users were added.

- [x] `anon`: cannot SELECT meeting/task tables or execute meeting creation RPC.
- [x] `authenticated` without workspace membership: sees 0 meetings/tasks; meeting creation rejected.
- [x] Synthetic admin: can create and see a meeting.
- [x] Synthetic attendee: can read assigned meeting; cannot add agenda.
- [x] Synthetic uninvited guest: cannot read the meeting.
- [x] Synthetic assignee-only: sees own task; does not see meeting details.
- [x] Synthetic assignee: can submit task; cannot approve own submission.
- [x] Synthetic admin reviewer: can approve the submitted task.
- [x] All synthetic test transactions rolled back; no test user, meeting, or task persisted.

**These database-level tests are NOT a substitute for actual browser sign-in, multi-account acceptance, or production security signoff.**

## Security advisor
Supabase Security Advisor reports `authenticated_security_definer_function_executable` warning (15 RPC functions). They were intentionally implemented as narrowly scoped, authenticated, audited `SECURITY DEFINER` write endpoints with RLS-denied direct table writes; each function still requires detailed security review before production. Do not suppress this warning without review.

Remediation context: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Current release gate
- [x] Connect project and apply migrations
- [x] Check table RLS, grants, private bucket and basic role isolation
- [x] Configure static R2 frontend with project URL + publishable key
- [x] Invite the **first administrator** through Supabase Auth and assign the workspace `admin` role. One account created, one active `admin` membership, one bootstrap audit event. **Email invitation still pending acceptance; no real browser login tested yet.**
- [ ] Disable unauthorized self-registration / configure Auth URL allowlist and permitted redirect domains
- [ ] Review SECURITY DEFINER function warnings and any other advisors
- [ ] Complete real-account sign-in/RLS/Storage testing with admin, secretary, attendee, assignee and guest
- [ ] Test logout, revocation, concurrency, file upload/download, iOS/Android
- [ ] Configure backup, recovery, data retention and PDPA sign-off
- [ ] Confirm publishing/hosting of `workspace.html` and browser end-to-end behavior

**Not production-ready. No real school meeting records or student data until release gate is signed off.**

## Administrator handoff
Create the first user via **Supabase Dashboard → Authentication → Users → Invite user**, then add role through a privileged SQL editor, using the exact invited email and checking exactly one row is affected (template is in `docs/R2_SETUP.md`). Do not commit real emails or passwords to GitHub.

The R2 web login uses this Supabase project. One administrator invitation exists and the workspace `admin` role has been granted, but the account has not confirmed the invite or signed in. The administrator must accept the email invite and set credentials through the supported authentication flow before live login can be tested. Do not store the email address or credentials in the public repository. R3 reminders are not implemented.

## First administrator bootstrap — follow-up (2026-11-10)
- Auth user invite found in **Meeting**; only one Auth user exists.
- Workspace membership set to `role = admin`, `active = true` in a guarded transaction and audited (`bootstrap_admin`).
- Verified via an authenticated role simulation that `is_active_member`, `is_admin`, and `can_create_meeting` all return true.
- Invitation email is **not yet confirmed**, and the account has **not** signed in. Do not mark real end-to-end authentication complete.
- Do not copy the account's email address, credentials, token or identifiers to this public report.
