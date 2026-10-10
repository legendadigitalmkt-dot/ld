# Growth OS — Control Plane Foundation (Milestone 1)

## Architecture and scope

`app.legendadigital.com.br` uses GitHub `legendadigitalmkt-dot/ld`, the Growth OS Supabase project and Hostinger production. `legendadigital.com.br` uses `legenda-digital-portal` and its own Supabase project. No portal repository or database changes belong to this milestone.

The platform control plane lives in the **private, unexposed `control_plane` schema** of Growth OS. CRM remains the customer data plane. Existing business data in the Legenda Digital workspace is preserved; internal business modules are outside this milestone. Historical portal tables still present in the Growth OS database are untouched.

The platform owner marker is an authoritative registry keyed by **workspace UUID**, independent of its name, slug and user metadata. The new `/control-center` layout and navigation are separate from `/app`. The platform role never bypasses CRM tenant RLS and never enables impersonation.

Delivered routes: overview, Users, Workspaces, Permissions, Audit Logs, Settings, and a TOTP MFA verification screen. User/workspace lists support search, status and pagination. Details expose allowlisted account metadata, workspace membership and operational counts. Settings support platform display name, administrative timezone and support email. Billing, product management, sales, marketing, intelligence and content modules remain outside M1.

## Access boundary

Every administrative RPC checks all of the following against current database records:

1. An active, confirmed, non-anonymous Auth identity; bans/deletions and software suspensions are honored.
2. A current Auth session matching the JWT session ID, not expired or deleted.
3. Membership in the single active platform-owner workspace.
4. An explicit role assignment with the required permission.
5. JWT `aal2`, current Auth session `aal2`, and a verified MFA factor.

`platform_context` exposes only the caller's eligibility, owner workspace, own roles and safe presentation fields. Before MFA it returns no effective permissions. Ordinary users receive a minimal denied context; protected pages return 404. Unauthenticated navigation redirects to login. TOTP configuration starts only on an explicit user action. The QR code, manual TOTP secret and verification code stay transient in the user's authenticated browser; they are never logged, persisted in app tables, sent to an image optimizer, or included in reports.

Server actions and database functions both validate input. Database state remains authoritative after a cached JWT, role revocation, session deletion or MFA removal. No API keys, hashes, password-reset tokens, refresh tokens, session payloads or integration credentials appear in responses. Existing Auth password recovery remains in use; this milestone does not add direct password editing or impersonation.

All eight control tables enable and force RLS, with no client table grants or policies. Public RPC facades are **security invoker**, authenticated-only. Privileged implementations are private security-definer functions with an empty search path, explicit grants, authorization and atomic audit writes. Bootstrap and audit helpers cannot be called by authenticated/anonymous/service-role API clients.

## Roles delivered in M1

All assigned roles get `platform.access` and `overview.read`; membership, valid session and MFA are still required.

| Role | Additional M1 permissions |
| --- | --- |
| platform_owner | All M1 permissions, including role management |
| super_admin | All M1 permissions except role management |
| security_admin | Read users/workspaces/roles/audit/settings; suspend/reactivate users |
| support_admin | Read users/workspaces/settings |
| analyst | Read workspace metadata and counts |
| viewer | None beyond aggregate overview |
| product_admin, billing_admin, sales_admin, marketing_admin, content_admin | Reserved roles; overview only until their approved modules exist |

Only Platform Owner can manage non-owner roles, and only for confirmed members of the owner workspace. Self role changes and owner-role grants/revocations are blocked in the API. The last/first owner cannot be removed through the UI. The owner workspace and owner account cannot be suspended.

## Tables and audit

| Table | Purpose |
| --- | --- |
| platform_roles | Explicit role catalog |
| platform_permissions | Granular permission catalog |
| platform_role_permissions | Permission mapping |
| platform_workspace_registry | UUID-based owner marker and workspace access status |
| platform_user_roles | Administrative assignments and grant attribution |
| platform_user_controls | Software access status, separate from Auth passwords |
| platform_settings | Allowlisted general settings, optimistic revision |
| admin_audit_logs | Append-only administrative access/change records |

Successful administrative reads and writes record actor UUID/type, session UUID, action, entity, timestamp and reason. Mutations record allowlisted before/after values in the same transaction. Denied operations roll back and do not create misleading successful audit entries. Audit attribution survives Auth account/session deletion. UPDATE and DELETE are rejected by a trigger even for the database operator; no client has TRUNCATE access. There is no audit-delete UI.

Status and settings changes reject stale screens. Grants, revocations, suspension, reactivation and settings changes require an explicit checkbox and a 10–500-character reason. Users must not enter credentials in the free-text reason.

Suspension is a software access control: authenticated CRM RLS and existing RPC authorization helpers reject suspended identities/workspaces immediately. Real CRM data is not deleted, and service-role webhook ingestion remains available. `private.workspace_has_user` retains its original integrity semantics. Workspace suspension does not cancel integrations, billing, or an entire Auth identity. User suspension also prevents protected app navigation via `account_access`.

The backend's existing production EXECUTE privilege on `private.workspace_has_user` is made explicit in this migration. This fixes a discrepancy in fresh migration rebuilds and preserves service-role inserts with an assigned tenant member without changing the integrity check or anonymous/client access.

## Bootstrap and activation

The migration **does not promote any real identity/workspace**. The first owner requires a separate, explicit approval naming the verified workspace UUID and confirmed account UUID. No name matching or user metadata is accepted as authorization.

After approval, an infrastructure operator executes the following with verified parameters in a transaction:

```sql
begin;
select control_plane.bootstrap_owner(
  '<verified-workspace-uuid>'::uuid,
  '<verified-confirmed-owner-user-uuid>'::uuid,
  'Approved initial platform owner provisioning; reference the approval'
);
commit;
```

The operator-only function checks the existing confirmed workspace-owner membership, prevents a second bootstrap, marks the workspace and assigns its first owner atomically, and records `platform.owner_provisioned`. The owner then opens `/control-center`, configures/verifies TOTP personally and validates the live console. Subsequent non-owner grants use Permissions with confirmation, reason and audit. Do not enroll MFA for another user or collect their TOTP key/code in chat.

## Validation and deployment

Apply `20261010112008_control_plane_foundation.sql` to Growth OS **only after CI passes, before deploying the new app code**. Old app code is compatible with the additive schema. New app code requires `account_access` and the other new RPCs. No new environment variable or service-role frontend key is required.

Local checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Build without real AI credentials. The repository already has CSS lint warnings; the changed Control Center code should introduce none.

CI database checks rebuild all migrations, lint PostgreSQL and run existing pgTAP tests plus `080_control_plane.test.sql`. New fixtures are synthetic and transaction-rolled-back. Coverage includes private grants/RLS, metadata escalation denial, MFA/session/ban checks, scoped roles, immediate revocation, tenant isolation, suspension/reactivation, service-role ingestion, stale writes, settings validation and immutable audit. No destructive or privilege-grant smoke test runs against real customer data.

After production migration, verify that real owner role assignments remain zero until approval, previous user/workspace/contact/deal/task counts are unchanged, and ordinary users cannot access the console. Re-run security/performance advisors. Preserve the existing leaked-password-protection baseline warning; do not silently change Auth configuration or upgrade plans.

Merge only a tested PR into `main`; verify its CI and Hostinger's connected GitHub deployment. Smoke-check login, CRM, pipeline, results, health and default-deny Control Center. Positive live MFA/admin UX validation is a separate activation step and must be reported as pending until actually performed.

References: [Supabase MFA TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp), [sessions](https://supabase.com/docs/guides/auth/sessions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Verified database rollout — 2026-10-10

The reviewed SQL was applied to Growth OS through the Supabase migration connector after both CI workflows passed: 68 application tests, 222 pgTAP assertions and PostgreSQL lint. Supabase recorded version `20261010112008`; the CLI-created migration file was renamed to match that authoritative production version, without changing its SQL or touching older migration history.

Post-migration verification: 2 users, 1 workspace, 6 contacts, 6 opportunities, 0 tasks and the existing 1 won opportunity of R$1,500 were preserved. All eight private control tables force RLS; exposed facades remain invoker and anonymous callers cannot execute them. **Zero real platform role assignments and zero owner-workspace promotions** were present at verification; bootstrap is still pending explicit approval.

Security advisors reported no ERROR and no new WARN. The existing [leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains an Auth baseline item. The eight [RLS-enabled/no-policy INFO notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) are intentional for private tables without client grants. Performance notices concern historical portal tables and unused/new indexes; no new missing-FK-index or permissive-policy warning was introduced by the control schema. Do not broaden private table access merely to silence the informational advisor.

Live positive admin/MFA validation remains pending owner activation and personal TOTP verification. The PR delivery record tracks app publication and post-deploy smoke checks separately.

## Non-destructive rollback

1. Redeploy the preceding known-good app commit (`9850af0482fd55040279850efd93cdc2deef12cc`) through a revert PR and the existing Hostinger deployment. This removes app calls to the new RPCs and Control Center routes. Verify CRM/Auth/results.
2. Keep the additive private schema and audit history. Do **not** drop tables, truncate logs, remove real members, alter passwords or erase customer data as a rollback shortcut.
3. If the access policies themselves caused a regression, prepare a reviewed follow-up migration that removes only `platform account access` from profiles and `platform workspace access` from the affected core tables, and restores the prior `private.is_workspace_member`, `private.workspace_role` and `private.shares_workspace_with` definitions from the preceding production foundation. Existing tenant policies and `workspace_has_user` remain intact. Test the original isolation/RPC suite before applying. This step removes suspension enforcement and needs an explicit incident decision if suspensions are active.
4. Any actual platform owner/role activation is a security change. Coordinate revocation or incident recovery with the owner and preserve its audit evidence. No automated destructive down migration is provided.

Backups, billing changes, real role activation and positive live MFA verification are never claimed by this document unless separately executed and recorded in the delivery result.
