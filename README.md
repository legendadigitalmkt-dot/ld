# LD Growth OS

**Legenda Digital — AI Growth Operating System**

Este repositório contém o software Growth OS: CRM, pipeline, WhatsApp, tarefas, workspaces e resultados comerciais. Fonte oficial: `legendadigitalmkt-dot/ld`; branch de produção: `main`; domínio atual: https://app.legendadigital.com.br/.

**Este repositório não contém o Portal Legenda Digital.** O Portal usa `legendadigitalmkt-dot/legenda-digital-portal`, `legendadigital.com.br` e Supabase `yltnjgngkomelfltdyky`. Nenhuma sessão, service role, tabela operacional ou dataset de analytics é compartilhado automaticamente.

Growth OS usa o Supabase próprio `cknlzuinwcdupdxilzcf` (nome hosted: **LD Growth OS Dev**, região São Paulo), que atende a aplicação atual; não há staging hosted adicional confirmado. Tabelas editoriais antigas nesse banco são legado preservado da migração, sem uso encontrado no runtime SaaS; não apagá-las nem tratá-las como fonte do Portal.

Ordem HQ de 14/10/2026: **expansão congelada enquanto o Portal é finalizado**. Somente incidentes P0 de segurança, integridade, indisponibilidade, WhatsApp de produção ou Auth autorizam correção operacional. Não migrar domínio, iniciar billing/agentes/automação ou implementar SSO neste ciclo.

Limites, ambientes, deploy e pendências: [docs/PRODUCT_BOUNDARIES.md](docs/PRODUCT_BOUNDARIES.md). Não copiar `.env`, Auth ou dados entre produtos. O restante do README descreve a foundation e os critérios de segurança; não equivale à aprovação de lançamento comercial.

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
