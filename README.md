# LD Growth OS

**Legenda Digital — AI Growth Operating System**

This repository is the product codebase for LD Growth OS. The active production-foundation work lives on `feat/production-foundation`.

## Production Foundation stack

- Next.js 16 / React 19
- TypeScript
- Supabase Auth
- PostgreSQL
- Row Level Security (RLS)
- Server Actions for trusted mutations
- Multi-tenant workspaces with RBAC

## Current product surface

- Authentication: sign-up, sign-in, sign-out and auth callback
- First-workspace onboarding
- Protected app shell
- Overview
- Contacts / CRM
- Pipeline
- Tasks
- Team visibility
- Hardened multi-tenant database model
- Database tests for RLS and cross-tenant isolation

## Local setup

Requires Node.js 22+ and a Supabase project/local Supabase stack.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Configure the Supabase values in `.env.local` and apply:

```
supabase/migrations/001_production_foundation.sql
```

For database test prerequisites and commands, see `supabase/tests/README.md`.

## Security boundary

The browser uses only the Supabase publishable key. The Service Role Key is server-only and bypasses RLS, so it must never be exposed through a `NEXT_PUBLIC_` variable or client component.

Ordinary CRM reads/writes run with the authenticated user session and remain subject to PostgreSQL RLS. Trusted tenant-bootstrap/member-administration operations use a server-only admin client after explicit authentication/authorization.

## Launch status

This branch is **Production Foundation**, not commercial launch approval.

Before real customer data:
- CI must pass.
- RLS tests must pass against the target migration.
- Supabase production auth/redirect configuration must be verified.
- At least two independent workspaces must be used for adversarial tenant-isolation testing.
- Operational monitoring, backup/recovery and privacy/export/delete procedures must be active.

See `docs/PRODUCTION_FOUNDATION.md` and `docs/COMMERCIAL_READINESS.md`.
