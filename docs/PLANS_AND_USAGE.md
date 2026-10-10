# Plans and stored usage — Milestone 2

Growth OS only: repository `legendadigitalmkt-dot/ld`, Supabase `cknlzuinwcdupdxilzcf`, Hostinger `app.legendadigital.com.br`. Portal sources/database remain separate.

## Behavior

`Control Center → Plans` supports creation, revisioned draft edits, publication, archival/reactivation and explicit version assignment/removal per workspace. Published snapshots are immutable. New publication or archival does not modify assigned snapshots. Archival blocks new assignments. Reasons and confirmation are required; writes audit actor/session and before/after in the same transaction. Stale revisions return 40001.

The catalog starts empty: no offer, price, trial, subscription, plan assignment or numeric commercial ceiling is invented. Existing and new workspaces retain their unassigned policy until an authorized operator assigns a published version. The platform-owner workspace cannot be assigned a commercial plan. Its administration remains available.

Configurable modules are the existing CRM, WhatsApp and Growth AI. Plan inclusion intersects with global/workspace feature flags; neither a plan nor a workspace exception bypasses the global kill switch. Growth AI requires CRM. The effective state includes source `plan` for an excluded module; menus, pages, actions and restrictive RLS fences already consume this resolver.

Configurable ceilings count stored contacts, opportunities, tasks and workspace memberships. Completed tasks and closed deals still count. Blank means no configured ceiling; zero blocks new customer creations. These are stock counts, not monthly request counters. Existing data remains readable/editable under normal module/tenant permissions after a downgrade; deletions release capacity. Atomic lead intake rolls back both data and counters if either contact or opportunity capacity is exceeded. Bulk operations are atomic too.

AI credits, monthly WhatsApp messages, workflow runs, storage bytes and other event-based resources require their own metering before enforcement; they are not represented as active quotas. Billing/prices, checkout and public pricing/CMS remain subsequent deliveries.

## Security and consistency

Five forced-RLS private tables have no direct client/service table grants. New public RPCs are security invoker wrappers; privileged functions live privately with empty search paths and explicit current-DB tenant or platform authorization. Administrative plans.read/plans.write retain current-session, active-account/workspace and verified MFA/AAL2 requirements. Owner/super admin/product admin can write; billing admin/analyst can read. No role is assigned to a new user.

Exact counters are initialized from current rows and maintained by triggers for inserts, deletes and workspace moves, including trusted writes. A workspace counter row serializes quota checks, version assignment and member reservations. Real row updates, including quota_revision, prevent REPEATABLE READ write skew; competing operations serialize or abort. Cross-workspace counter rows are locked in UUID order. Transactions hold no external API calls.

Customer contact/opportunity/task growth is checked even via direct Data API writes and invoker RPCs. Existing trusted inbound ingestion is preserved and counted, potentially creating visible overage. Seat capacity applies also to service-role membership writes; this exception cannot bypass user limits.

Member invitations reserve an actor/email/role-bound seat before calling the external Auth invitation API. A ten-minute reservation counts toward available capacity and is exposed only as an aggregate number in usage. Completion rechecks current workspace administration and the actual Auth email, then atomically inserts membership, increments stock, logs the activity and removes the reservation. A granted in-flight slot survives a concurrent downgrade, preserving an already accepted invitation. New reservations then obey the lower ceiling. Failed/canceled/expired reservations release capacity. Existing members cannot be re-invited to change their role. The technical cap is 100 concurrent pending reservations per workspace, independent of commercial ceilings.

`/app/settings/plan` exposes only the caller's current workspace plan/version, module availability and aggregate usage/ceilings/reserved seats. It stays available while CRM is paused. No customer record bodies, other workspace usage, secrets or billing data are returned.

## Validation and deploy

App tests validate exact blank/zero/integer ceilings, dependency validation, overage presentation and recovery navigation. Database pgTAP uses synthetic rolled-back fixtures for permissions/MFA, tenant isolation, publication/pinning, archive/revisions/audit, stock limits, multirow/lead rollback, downgrade preservation, reservations and trusted ingestion.

CI additionally runs two real PostgreSQL connections for final contact capacity and member reservations under READ COMMITTED and REPEATABLE READ. `.github/scripts/test-plan-concurrency.sh` accepts only the disposable local Supabase Docker container in GitHub Actions. No hosted URL, password or token is accepted. Its committed synthetic fixtures are discarded with the CI environment; never run fixture SQL on a hosted project.

After exact PR CI passes, apply only the additive migration to Growth OS. Align the filename to its recorded version if the native operation assigns a different timestamp, then revalidate final CI before merge. Validate main CI, Hostinger release `plans-limits-v1`, public/login status, anonymous private-route redirects, recorded migration/RLS/grants, exact counters against source rows, unchanged assignments/catalog defaults and advisors. Do not seed a production plan or send an actual invitation/WhatsApp/AI request merely for smoke testing. Positive private UI coverage requires the owner's real MFA session; report any coverage still pending.

## Rollback

Previous app commit: `e31bddf9b00d638d0795b579624ee22cb6cb5283` (Product + Feature Flags). Revert this app PR through a new PR/CI/deploy. Before doing so, inspect and document any assigned versions, reservations and desired availability. Remove/restore assignments through the current MFA-authorized panel with reasons if returning to its unassigned policy is intended; preserve all data and immutable snapshots/audits. Do not blindly reset real plans.

The old member invitation implementation uses a service upsert without seat reservation. It will still be blocked by the new membership trigger at a configured ceiling, but may deliver an invitation before a failed membership write. Account for this during recovery; preserve reservation-aware invitation handling or apply a reviewed forward fix before restarting invites. Reverting app code does not remove database enforcement or disable grants/triggers. Database recovery requires a separately reviewed forward migration preserving counters, snapshots, assignments, business data and history.
