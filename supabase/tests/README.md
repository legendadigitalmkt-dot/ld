# Database security tests

The database suite uses pgTAP and follows the same local-test model documented by Supabase.

## Local

```bash
supabase start
supabase db reset --local
supabase db lint --local --fail-on error
supabase test db --local
```

`010_workspace_isolation.test.sql` does not depend on external test-helper packages. It seeds test users in `auth.users`, switches to the `authenticated` role, and sets `request.jwt.claim.sub` directly.

It verifies:
- Workspace A cannot read Workspace B.
- Workspace A cannot write Workspace B.
- cross-workspace ownership fails at the integrity layer.
- sales may create CRM records in its own workspace but may not delete them.
- workspace metadata is tenant-isolated.

Every test is transactional and rolled back by pgTAP/Supabase test execution.
