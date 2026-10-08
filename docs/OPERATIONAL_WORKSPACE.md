# Growth OS — operational workspace

The authenticated application now uses the same brand as the public landing, with a task-focused layout, current-route navigation, a mobile dialog drawer, workspace selection, search/command palette and operational notices. Existing auth and the separate institutional portal remain intact.

## Functional delivery

- Verified memberships determine both the visible workspace list and the selected workspace. A forged/stale selection cookie falls back to an authorized membership. Every switch validates membership again on the server; selection is an HttpOnly, SameSite cookie, secure in production.
- Search uses the authenticated Supabase server client and an explicit workspace predicate for contacts, deals and tasks. SQL pattern metacharacters are escaped; each category returns at most five results. Selected records are opened through focused, workspace-filtered views, including records outside the normal first page.
- Overview metrics come from `growth_overview`, a read-only SECURITY INVOKER function. Aggregation runs inside Postgres rather than on API-limited row lists. Periods are 30 or 90 workspace calendar days. Open pipeline/lead/task indicators are current-state values; won/lost/conversion/new-contact indicators label their period.
- Revenue history, stage distribution, lead sources, activity history, next tasks and attention lists use real workspace data and explicit empty states. Prioritization is rule-based, not an active AI model.
- Contacts now support name search, status filtering, exact counts and 50-row pagination. The existing lead-plus-deal intake action and idempotency key remain in use.
- Tasks can be created, linked to a contact/opportunity, completed and reopened. Deadlines are the end of the selected day in the workspace timezone, including daylight-saving offsets. Task mutations and audit activities run atomically in SECURITY INVOKER functions; viewer and cross-workspace writes are denied. Status retries do not duplicate an audit event.
- Existing inbox, kanban, member and integration features retain their behavior within the new visual shell.

## Database boundary

One additive migration introduces `growth_overview`, `create_workspace_task` and `set_workspace_task_status`. No existing business rows are rewritten, no table is dropped and no RLS policy is disabled. Functions set a fixed empty search_path, validate verified auth identity and workspace access, and expose execution only to authenticated callers. Existing RLS is an additional boundary. Generated types reflect the new signatures; the SSR client now uses those types.

Apply this migration to the existing Growth OS Supabase project after database CI passes and before deploying callers from main. Align the committed migration version with the version recorded by the supported Supabase migration operation. Do not apply it to the portal project or replace either project's environment values.

## Verification

Run typecheck, lint, the 13 unit tests and production build. Database CI adds 26 pgTAP assertions covering aggregation over 1,000 records, period validation, totals/probabilities, tenant isolation, read-only members, anonymous execution and atomic task audit behavior. Existing RLS tests must also pass.

Managed preview is unavailable without the supported control-browser capability. Authenticated browser interaction requires an authorized user session; do not claim an end-user login or a WhatsApp send without observing it. Public smoke tests and Hostinger deployment state can still verify publication without creating test users in production.

## Remaining product scope

CRM profile/edit/import/export, richer assignment and task editing, dedicated reports, executable automations, operational WhatsApp validation and Growth AI remain further work. This delivery advances the operational core; it does not declare every module in the master prompt complete.

## Recovery

The schema addition is backward-compatible with the previous app. Roll back the Hostinger app deployment/main change first if needed; preserving the additive functions keeps business data and task audit history intact.
