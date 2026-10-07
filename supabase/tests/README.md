# Database tests

These tests are intended for the local Supabase test database.

## Prerequisites

Install the Supabase CLI, start the local stack, and install the community test helpers in the test database:

```sql
select dbdev.install('basejump-supabase_test_helpers');
create extension if not exists "basejump-supabase_test_helpers" version '0.0.6';
```

Then run:

```bash
supabase db reset
supabase test db
```

The critical acceptance test is `010_workspace_isolation.test.sql`: users from Workspace A must be unable to read/write Workspace B.

Do not admit real customer data until these tests pass against the exact migration set intended for production.
