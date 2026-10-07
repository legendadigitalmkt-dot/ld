# Commercial Readiness Gate

Production Foundation establishes the identity/data security boundary. Passing this document is still required before admitting paying customers and real conversations.

## P0 — identity/data
- [x] Next.js production application shell.
- [x] Supabase SSR authentication architecture.
- [x] Cookie/session refresh via proxy.
- [x] Authenticated tenant resolution.
- [x] Workspace onboarding.
- [x] Server-side member invitation flow.
- [x] RBAC model.
- [x] Timestamped Postgres migration.
- [x] RLS on all exposed business tables.
- [x] cross-tenant referential integrity constraints.
- [x] pgTAP tenant-isolation test suite committed.
- [x] application CI: dependency audit, typecheck, lint, build.
- [x] database CI: local Supabase, migration rebuild, db lint, pgTAP.
- [ ] database CI green on the current PR.
- [ ] connect a hosted development Supabase project.
- [ ] apply `supabase/migrations/20261007123000_production_foundation.sql`.
- [ ] verify Auth Site URL / Redirect URLs.
- [ ] validate two independent hosted workspaces adversarially.
- [ ] enable error monitoring, structured logs and uptime checks.
- [ ] document hosted database backup/recovery.
- [ ] implement data export and account/workspace deletion.
- [ ] finalize Terms of Service / Privacy Policy and LGPD operational procedures with appropriate qualified review.

## WhatsApp production gate
- [ ] Meta Business / WhatsApp Business Platform configuration.
- [ ] Webhook verification and signature validation.
- [ ] inbound message idempotency.
- [ ] delivery/read status ingestion.
- [ ] approved template-message flow where required.
- [ ] retry/dead-letter strategy.
- [ ] consent, opt-in and opt-out process.

## AI production gate
- [ ] server-side OpenAI credentials/model configuration.
- [ ] regression evaluation set for sales follow-ups.
- [ ] prompt/version/action logging.
- [ ] per-workspace token/cost metering.
- [ ] rate limits and abuse controls.
- [ ] human approval for outbound AI drafts in V1.

## Billing gate
- [ ] plans and entitlements.
- [ ] checkout + webhook lifecycle.
- [ ] trial behavior.
- [ ] failed-payment behavior.
- [ ] invoice/tax workflow appropriate to the Brazilian selling entity.

## Pilot acceptance criteria
A pilot company can:
1. sign in and only see its own workspace;
2. invite authorized team members;
3. add/import contacts;
4. create/move opportunities;
5. see conversations from the connected channel;
6. identify idle opportunities;
7. generate a safe follow-up draft;
8. create/complete tasks;
9. understand pipeline metrics;
10. operate for 14 consecutive days without manual database intervention;
11. export/delete its data on request.
