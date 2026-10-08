# Authentication and recovery

Login distinguishes Supabase `email_not_confirmed`, `invalid_credentials`, rate limits,
expired recovery links, and unavailable service responses. Unknown failures are not
reported as an incorrect password. Passwords are passed unchanged; only emails are
trimmed and normalized.

## Deployment

Keep the existing Supabase project and workspace. Do not recreate accounts to reset
their passwords: repeated sign-up does not change an existing account's password.

Set `NEXT_PUBLIC_APP_URL` to the public HTTPS app origin.
Callback redirects use this configured origin instead of the internal Node request
host (which can be `0.0.0.0:3000` behind Hostinger's proxy).

In Supabase Auth URL
Configuration, allow both callback destinations:

- `https://app.legendadigital.com.br/auth/callback?next=/onboarding`
- `https://app.legendadigital.com.br/auth/callback?next=/reset-password`

Existing wildcard configuration covering `/auth/callback` can also cover these
destinations. Keep Site URL at `https://app.legendadigital.com.br`.

The password recovery flow uses the existing PKCE email template and cookie-based
Supabase SSR client. Open the email link in the same browser where recovery was
requested. No email template change is required.

## Hosted verification after deployment

1. An unconfirmed account must see the confirmation instruction when signing in.
2. A confirmed account with an incorrect password must see the credential error.
3. Request recovery for the existing workspace account from `/forgot-password`.
4. Open the received email link in the same browser; it must reach `/reset-password`.
5. Choose and confirm a new password; the user must enter credentials themselves.
6. Sign in with the new password and verify access to the original workspace.
7. Signed-out access to `/reset-password` must redirect to `/forgot-password`.
8. `/auth/callback` must never redirect to an external host supplied in `next`.

Recovery cookies are staged until Supabase accepts the email request. A failed or
rate-limited retry leaves the previous link's verifier unchanged. Only the latest
successfully requested link should be used, in the same browser that requested it.

Recovery requests keep a neutral success message to avoid revealing whether an
email belongs to an account. All password changes use the authenticated Supabase
client; this flow does not use the service role or change workspace membership.

Supabase's built-in mail service may rate-limit recovery emails. Display its rate
limit response rather than repeatedly sending requests.
