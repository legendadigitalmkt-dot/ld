# Product Administration — first Milestone 2 delivery

Growth OS only: repository `legendadigitalmkt-dot/ld`, Supabase project `cknlzuinwcdupdxilzcf`, Hostinger `app.legendadigital.com.br`. The portal repository, database and domain are unchanged.

## Delivered scope

`/control-center/product` manages the implemented module catalog and feature rules:

- `crm`: contacts, pipeline, tasks, operational dashboards and onboarding. These share the current operational data model.
- `whatsapp`: Inbox, outbound sends/templates, connection and Meta diagnostics. A pause does not remove the connection or stop existing service webhook ingestion.
- `growth_ai`: contact assistance and provider requests. It depends on CRM availability. Changing its rule does not provision an API key, validate a provider or send a message.

Global and workspace scopes support `enabled`, `beta`, `disabled`; workspace rules additionally support `inherit`. Beta permits access and labels the rollout state. A global disabled state always wins over a workspace override. Existing behavior is preserved by seeding CRM/WhatsApp enabled and Growth AI beta, without workspace overrides. Auth, team access, settings and Control Center remain available when operational modules are paused.

This is the first slice of Milestone 2. Plans, commercial limits, website editing, pricing and FAQ are subsequent deliveries. Plan/user/cohort targeting is not implemented here; no commercial price or entitlement is invented.

## Authorization and data boundary

Two private, forced-RLS tables hold the catalog and revisioned rules. They have no client table grants or policies and the control schema remains unexposed. Exposed RPCs are security invoker wrappers; privileged implementations remain private with an empty search path and explicit authorization.

`product.read` and `feature_flags.manage` are assigned to platform owner, super admin and product admin; analyst gets read only. The existing current-session, account/workspace eligibility, verified factor and AAL2 checks remain mandatory. No user receives a new role in this migration. Product administration grants no customer CRM membership, user administration, secret access or role management.

`workspace_modules` returns only the effective flags for a workspace of which the caller is an active member. It grants neither access to other workspaces nor permission to write rules. Resolution is request-scoped in the app, with no persistent authorization cache.

Restrictive policies on contacts/deals/tasks/activities and conversations/messages/status events/contact channels intersect with the existing tenant/role policies. Existing security-invoker operational RPCs therefore cannot bypass a pause. Pages and actions check the effective module before reading operational data, sending a Meta request, diagnosing/connecting WhatsApp or requesting AI. The desktop menu, mobile drawer, mobile shortcuts, command search and embedded Growth AI component reflect availability. Integration settings remain readable and identify a WhatsApp pause.

Existing service-role webhook persistence keeps its RLS bypass to retain inbound history while user operations are paused. External requests already accepted or in flight cannot be canceled retroactively. This delivery runs no real WhatsApp send or AI request.

## Revision and audit semantics

Edits require an allowlisted feature/state, a valid target workspace when present, explicit confirmation and a reason of 10–500 characters. Each edit locks its feature's global rule before checking both the displayed global revision and the target rule revision. A first workspace override expects revision 0. Setting inheritance retains a versioned row, preventing stale first-write reuse. Conflicts return SQLSTATE 40001; invalid/no-op requests return 22023, without partial changes or mutation audit entries.

`feature.rule_changed` records actor/session, feature/scope, reason and before/after metadata in the existing append-only audit trail, in the same transaction. `product.viewed` records administrative catalog reads. No business records or credentials are copied into feature/audit metadata.

## Validation and publication

Run app tests, typecheck, lint, dependency audit and production build. Database CI reconstructs all versioned migrations, lints PostgreSQL and runs all pgTAP suites, including feature inheritance, global kill-switch priority, tenant fences, MFA, role boundaries, conflict/no-op rejection, audit integrity and preserved service ingestion. All fixtures are synthetic and roll back; never run the fixture suite against production or manufacture an Auth session for live validation.

After PR CI passes, apply the additive migration to Growth OS only, align its repository filename with the version recorded by the supported migration operation if needed, and revalidate the exact final PR. Then merge and wait for main CI and the existing Hostinger GitHub deployment. `/api/health` reports release `product-flags-v1` for a concrete publication check. Smoke-check anonymous protected-route behavior, authenticated metadata, migration/RLS/grants and unchanged business counts. Validate the private Product page in a real owner MFA session when available, explicitly reporting any live UI coverage still pending.

Lockfile is committed and CI uses `npm ci --ignore-scripts`, so audited/built dependency versions are reproducible.

## Rollback

The previous production app is commit `f3700e22eadff6f59089721d1ade7301247c9fff`. Revert the application PR through a new PR, pass CI and deploy the revert via the existing Hostinger connection. Retain the additive private tables, policies and audit trail; never erase feature or business data to roll back presentation code.

If rules were intentionally changed after release, inspect and record them before rollback. Restore desired global/workspace availability through the current MFA-authorized Product interface, with reason/audit, before reverting an app that lacks that interface. Do not blindly reset workspace rules or use fabricated JWT/session claims. Database rollback, if actually required, is a separately reviewed forward migration; preserve recorded rules and audit history. Verify CRM/Auth/team access and inbound webhook persistence after recovery.
