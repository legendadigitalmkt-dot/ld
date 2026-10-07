# LD Growth OS V1 — Architecture

## Goal
The V1 proves one business loop: **lead enters → team sees context → opportunity is tracked → idle deals are detected → follow-up is generated → pipeline advances**.

## Current runnable implementation
The repository ships with a zero-dependency Node 20+ runtime so the product demo runs immediately without external accounts. `server.mjs` exposes workspace-scoped JSON APIs and persists demo data to `data/db.json`. The browser client is a responsive SPA under `public/`.

This local adapter is intentionally replaceable. It is useful for product validation and sales demos; it is **not the production authentication/data layer**.

## Production target
- Web application: React/Next.js App Router or equivalent SSR architecture.
- Authentication and database: Supabase Auth + Postgres.
- Tenant isolation: `workspace_id` on every business entity + Row Level Security.
- AI: provider abstraction; first adapter uses the OpenAI Responses API server-side.
- Messaging: WhatsApp Cloud API via server-side webhook + outbound send service.
- Background execution: queue/worker for automation timers, webhook processing, retries and agent actions.
- Billing: external billing provider with entitlement table/webhooks.
- Observability: structured logs, error tracking, audit trail, latency and AI-cost metrics.

## Core bounded contexts
1. **Identity** — user, profile, workspace, membership, role.
2. **CRM** — contacts, ownership, tags, sources.
3. **Revenue** — deals, stages, values, probabilities, wins/losses.
4. **Execution** — tasks and activities.
5. **Conversation** — inbox, threads and messages.
6. **Automation** — triggers, conditions and actions.
7. **Knowledge** — business facts used by AI.
8. **Intelligence** — metrics, follow-up risk and Ask Legenda.

## AI safety model
- AI cannot be authoritative for clinical, legal, financial or other regulated decisions.
- V1 follow-ups are generated as drafts. Autopilot is intentionally out of scope.
- The AI prompt explicitly forbids inventing prices/promises.
- Production must store AI action logs and require human approval for consequential outbound actions until reliability is measured.

## Adapter boundary
The browser should never receive service-role credentials or OpenAI secrets. The current API shape can be preserved while replacing the local JSON adapter with server-side Supabase queries and authenticated sessions.
