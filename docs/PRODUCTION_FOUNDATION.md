# Production Foundation

## Implemented in `feat/production-foundation`

- Next.js 16 application shell and protected routes.
- Supabase SSR clients for browser/server and a server-only service-role client.
- `proxy.ts` token refresh with `auth.getClaims()` based route protection.
- Email/password sign-in and sign-up with PKCE callback.
- First-workspace onboarding performed only by a trusted Server Action.
- Workspace-scoped data queries for Overview, Contacts, Pipeline, Tasks and Team.
- Hardened PostgreSQL tenant model with composite foreign keys preventing cross-workspace relationships.
- Private-schema `SECURITY DEFINER` helpers with empty `search_path`.
- Explicit grants plus RLS policies (defense in depth).
- RBAC roles: owner, admin, sales, support, viewer.
- pgTAP structural RLS test and a cross-tenant isolation test.

## Required external setup before this branch can run against production

1. Create a Supabase project.
2. Copy Project URL + Publishable Key + Service Role Key into `.env.local`.
3. Apply `supabase/migrations/001_production_foundation.sql`.
4. Configure Auth Site URL / Redirect URLs to include the deployed app and `/auth/callback`.
5. Create and verify at least two test accounts and run `supabase test db` locally before any customer data is admitted.

## Security model

The publishable key is safe for browser use only because RLS + grants constrain access. The Service Role Key bypasses RLS and is intentionally imported only from `lib/supabase/admin.ts`, which starts with `server-only`.

Workspace creation and future membership invitations use the server-only admin client after authenticating and authorizing the caller. Ordinary CRM operations use the user-scoped SSR client, which means PostgreSQL RLS remains authoritative even if UI code is bypassed.

## Deliberately not included yet

- WhatsApp Cloud API credentials/webhooks.
- Billing and plan entitlements.
- OpenAI production usage metering.
- Background workers and automation timers.
- Autopilot agents.

Those depend on a verified tenant/auth foundation and should not be layered onto the demo adapter.


## Hosted development validation — 2026-10-07

Project: `LD Growth OS Dev` in `sa-east-1`.

- Migration applied successfully.
- 13 public tables present with RLS enabled.
- Supabase security advisors: 0 findings.
- Hosted transactional smoke test: 8/8 passed.
- Auth user -> profile trigger verified.
- Workspace A reads only Workspace A.
- Workspace B reads only Workspace B.
- Cross-tenant insert blocked by RLS.
- Sales delete affected 0 rows.
- Cross-tenant workspace metadata hidden.
- Test transaction rolled back; no smoke-test tenant/customer rows persisted.

Performance advisors reported unindexed foreign keys. These are non-blocking for correctness and should be handled in the next database optimization migration before scale testing.
