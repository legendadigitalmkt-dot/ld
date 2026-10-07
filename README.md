# LD Growth OS V1

Functional V1 demo/pilot foundation for **Legenda Digital — AI Growth Operating System**.

## What is already implemented
- Overview with business metrics and opportunity-risk calculation
- Contacts / CRM
- Drag-and-drop sales pipeline
- Inbox demo with conversation context and outbound messages
- Tasks and priorities
- Automation rules + manual runner
- Knowledge Base / Business Context Layer
- Follow-up AI draft generation
- Ask Legenda executive copilot
- Analytics / pipeline intelligence
- Workspace-scoped API design
- Persistent local demo database
- Supabase/Postgres production schema with RLS policies

## Run now
Requires Node.js 20+ and **no npm install**.

```bash
node server.mjs
```

Open `http://localhost:3000`.

The app creates `data/db.json` from `data/seed.json` on first run. Use **Restaurar demo** in the UI to reset the dataset.

## Optional real AI
The demo works without an AI key. To enable a real provider adapter, set both environment variables server-side:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=...
node server.mjs
```

The server uses the Responses API. No API key is exposed to the browser.

## Important status
This repository is intentionally split into two concerns:

1. **Runnable product demo** — local Node/JSON adapter, suitable for UX validation and demonstrations.
2. **Production target** — Supabase Auth/Postgres/RLS, official channel integrations, billing, background workers and operational controls.

Do **not** process real customer data with the local JSON adapter. Read `docs/COMMERCIAL_READINESS.md` before a paid pilot.

## Files
- `server.mjs` — local application/API runtime + AI adapter
- `public/` — complete UI
- `data/seed.json` — demo company dataset
- `supabase/migrations/001_initial.sql` — multi-tenant production schema and RLS
- `docs/ARCHITECTURE.md` — target architecture
- `docs/COMMERCIAL_READINESS.md` — launch gates
- `docs/ROADMAP_NEXT.md` — next implementation sprints
- `tests/` — smoke tests

## Product principle
V1 proves: **lead → context → pipeline → follow-up → action → revenue**.
