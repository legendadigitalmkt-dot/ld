# LD Growth OS — Architecture

## Product loop
The V1 proves one business loop: **lead enters → team sees context → opportunity is tracked → idle deals are detected → follow-up is generated → pipeline advances**.

## Application
- Next.js 16 App Router
- React 19 + TypeScript
- Server Components for authenticated data reads
- Server Actions / Route Handlers for trusted mutations
- `proxy.ts` for Supabase session refresh and route protection

## Identity and tenant boundary
- Supabase Auth
- `workspaces` are the tenant boundary
- `workspace_members` maps users to tenants
- roles: owner, admin, sales, support, viewer
- every business entity carries `workspace_id`
- PostgreSQL RLS is authoritative; UI checks are not treated as a security boundary

## Database
- Supabase Postgres
- explicit grants + Row Level Security
- SECURITY DEFINER helpers live in a non-exposed `private` schema with empty `search_path`
- composite foreign keys prevent cross-workspace relationships
- pgTAP tests exercise cross-tenant read/write denial
- migrations are timestamped and version-controlled

## Server-only privilege
The Supabase Service Role Key bypasses RLS. It is only loaded by `lib/supabase/admin.ts`, which is marked `server-only`.

It is reserved for operations that cannot safely be exposed to ordinary sessions, including:
- first tenant bootstrap
- membership invitations / administration
- future webhook ingestion after signature verification
- controlled administrative maintenance

## Core bounded contexts
1. **Identity** — user, profile, workspace, membership, role.
2. **CRM** — contacts, ownership, tags, sources.
3. **Revenue** — deals, stages, values, probabilities, wins/losses.
4. **Execution** — tasks and activities.
5. **Conversation** — inbox, threads and messages.
6. **Automation** — triggers, conditions and actions.
7. **Knowledge** — business facts used by AI.
8. **Intelligence** — metrics, follow-up risk and Ask Legenda.

## Next adapters
- WhatsApp Cloud API: verified webhook + outbound service + idempotency.
- AI: server-side provider abstraction using the OpenAI Responses API.
- Billing: checkout/webhooks mapped to entitlement records.
- Workers: durable queue for delayed automations, retries and agent jobs.
- Observability: structured logs, error tracking, audit events, latency and AI-cost metrics.

## AI safety model
- Follow-up AI remains draft-first in V1.
- No autonomous consequential outbound action before evaluation data exists.
- Business knowledge constrains generated responses; models may not invent prices or commitments.
- Clinical, legal, financial and other regulated decisions remain human-controlled.
