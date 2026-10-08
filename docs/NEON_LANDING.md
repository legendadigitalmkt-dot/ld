# Growth OS — public neon landing page

The product root now renders a public sales page instead of redirecting visitors to `/app`. Login, onboarding and authenticated operational routes retain their existing protection and server-side data access.

## Delivered scope

- Neon visual system derived from Legenda Digital: dark surfaces, cyan/blue/purple gradients, restrained warm accents, technical waves and product previews rendered in HTML/SVG.
- Sticky navigation, mobile menu, full product narrative, ten modules, pipeline, WhatsApp, automation concept, Growth AI roadmap, audience, onboarding, evidence/cases, configurable plan proposals, twelve FAQ entries and final CTAs.
- Keyboard-operable demonstration tabs for dashboard, pipeline and inbox. Preview values, companies and conversations are explicitly fictitious. No preview reaches Supabase, a model or WhatsApp.
- Primary access goes to the existing `/login`. Demo goes to the page's interactive preview. Commercial contact opens an email draft; no background communication or payment is sent.
- Plan configuration in `lib/marketing.ts`. No price, trial, setup-fee promise, checkout or billing entitlement is introduced.
- Homepage metadata, canonical, social PNG, structured data, robots and sitemap. Protected operational routes are excluded from indexing.
- Scoped CSS Modules, responsive breakpoints, visible keyboard focus, native FAQ disclosure and reduced-motion handling. Existing operational CSS is preserved.

## Product truth

CRM, pipeline, tasks, workspace/membership and WhatsApp integration code are present in the existing product. WhatsApp readiness remains dependent on Meta configuration and validation. Advanced automation, reporting, import/export and Growth AI are marked as development/roadmap where applicable. No customer logos, testimonials or business outcome claims are invented.

## Infrastructure boundary

Repository: `legendadigitalmkt-dot/ld`, branch based on main `bc0aa927b8bd78ce0c4f544405ab1a78fdb63ada`.

Domain: `https://app.legendadigital.com.br`.

Supabase: existing Growth OS project `cknlzuinwcdupdxilzcf`. Schema audit found 28 public tables, all with RLS, and five applied migrations. This delivery performs no schema or business-data mutation. The portal remains in its own repository, domain and Supabase project.

Hostinger: existing GitHub-connected Next.js deployment, main branch, root `./`, Node 22.x and automatic deployment enabled. Existing environment values are preserved.

## Validation and recovery

Run the repository's typecheck, lint, unit tests and build. Merge only after both application and database-security CI pass. Validate `/`, demonstration tabs, FAQ, `/login`, unauthenticated protected routes, robots, sitemap and social image after deployment. End-to-end authenticated and WhatsApp messaging tests require an authorized active session and operational Meta connection, and are not claims of this landing-page delivery.

Rollback is the previous Hostinger deployment/main commit. Do not restore the product by copying the portal's static production bundle over it.
