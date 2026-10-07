# Commercial Readiness Gate

The app in this repository is a **functional V1 demo/pilot foundation**. Do not put real customer data into the local JSON adapter.

Before charging customers and processing real conversations, complete these gates:

## P0 — required before first real customer
- [ ] Create production Supabase project.
- [ ] Apply and review `supabase/migrations/001_initial.sql`.
- [ ] Implement cookie-based authentication and workspace invitation flow.
- [ ] Replace the demo workspace header with authenticated tenant resolution.
- [ ] Test RLS with at least two independent workspaces and malicious cross-tenant requests.
- [ ] Move all writes to authenticated server actions/API routes.
- [ ] Configure secrets in deployment environment only.
- [ ] Add error monitoring, structured logs and uptime check.
- [ ] Add database backups/recovery runbook.
- [ ] Add Terms of Service and Privacy Policy; review LGPD roles, retention and deletion paths with qualified counsel/DPO support as appropriate.
- [ ] Create customer data export/deletion workflow.

## WhatsApp production gate
- [ ] Meta Business account and WhatsApp Business Platform configuration.
- [ ] Webhook signature/verification handling.
- [ ] Idempotency for incoming message IDs.
- [ ] Approved message-template handling where required.
- [ ] Retry/dead-letter strategy for outbound failures.
- [ ] Consent/opt-in and opt-out process appropriate to the use case.

## AI production gate
- [ ] Configure server-side `OPENAI_API_KEY` and explicit `OPENAI_MODEL`.
- [ ] Create regression evaluation dataset for follow-ups.
- [ ] Add prompt/version logging without leaking secrets.
- [ ] Add per-workspace usage/cost metering.
- [ ] Add rate limits and abuse controls.
- [ ] Human approval for outbound AI drafts in V1.

## Billing gate
- [ ] Define plans and entitlements.
- [ ] Checkout + webhook lifecycle.
- [ ] Trial expiration behavior.
- [ ] Failed-payment behavior.
- [ ] Invoice/tax workflow appropriate to the Brazilian entity selling the service.

## Pilot acceptance criteria
A pilot company can:
1. sign in and only see its own workspace;
2. add/import contacts;
3. create/move opportunities;
4. see conversations from the connected channel;
5. identify idle opportunities;
6. generate a safe follow-up draft;
7. create/complete tasks;
8. understand pipeline metrics;
9. operate for 14 consecutive days without manual database intervention;
10. export/delete its data on request.
