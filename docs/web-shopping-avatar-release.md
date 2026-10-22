# Web shopping, simpler navigation and avatar fitting room

The owner authorised a web release on 22 October 2026, superseding the earlier development-only constraint for mobile web. The iOS build 4 currently in review is unchanged. No App Store upload, native sync or existing backend mutation is part of this release.

## Web experience

- Five primary destinations: Today, Closet, Inspo, Shop and Me.
- Today offers two starting points: Recreate a look or Create something new. New users go straight to adding inspiration/closet content; returning users reach the existing matching/stylist flow.
- Me collects avatar setup, saved looks, the calendar and Settings.
- Saved looks open a collection for each missing piece with one per-piece budget and currency retained between garments. The approved feed, search, details, favourites, disclosures and retailer handoff are reused.
- Clothing product details and saved looks link to the fitting room. Tops, bottoms, dresses and outerwear are supported; dresses replace separate tops/bottoms.
- Avatar setup supports an optional height reference, build and hair choices. The intended renderer preserves face and skin tone. Generated avatar saving is explicit, account-scoped and device-local; source photos stay in memory and are cleared after avatar creation. Delete removes the avatar on this device, not Google's processing records.

## What is and is not activated

The responsive web UI is enabled using Capacitor's platform detection. The new navigation/routes remain off in packaged iOS/Android. This does not modify the already-uploaded build.

The affiliate catalogue is still empty. Genuine purchasable products require an approved publisher account and fresh authorised retailer feed; no invented products, tracking links, merchant agreements or commission claims were added.

Photo-realistic rendering is **not activated on the live service**. Until a dedicated test backend is configured and output quality is validated, the live fitting room shows a coming-soon state and disables photo uploads/rendering. The implemented endpoint is a test-only integration, not a production launch. It requires:

- An independent Supabase test project and signed-in test accounts.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` pointing to that project, plus `VITE_TRY_ON_SANDBOX_PROJECT_REF` matching it.
- Deployment of `avatar-try-on` to that test project, with JWT verification enabled (the default). The function additionally verifies the user with `auth.getUser()`.
- Server secrets `TRY_ON_PREVIEW_ENABLED=true`, `TRY_ON_TEST_USER_IDS` (comma-separated test user IDs), `TRY_ON_ALLOWED_ORIGINS`, `GEMINI_TRY_ON_MODEL` (a currently supported image-editing model), `GEMINI_API_KEY` and `GEMINI_PAID_SERVICES_VERIFIED=true` after billing/privacy verification. Do not put secret keys in frontend configuration.
- Dedicated per-request adult/ownership/photo processing consent; old clothing-styling consent does not enable this request.

The endpoint refuses STYLST's existing production project even if accidentally deployed there, requires tester allowlisting, restricts image types/sizes and accepts inline image bytes rather than fetching arbitrary URLs. It keeps no image records in the database and logs no image/prompt bodies. The six-attempt/hour in-memory throttle is for limited sandbox testing only; it does not provide a distributed production quota. Before live rendering, add a persistent atomic quota and complete provider privacy/billing, content-permission and physical-device quality verification. A future rendering launch must deliberately replace both sandbox gates.

## Verification

`npm test`, `npx tsc --noEmit -p tsconfig.app.json`, focused ESLint and `npm run build`. Tests cover consent/revocation during garment preparation, isolated sandbox configuration, source/garment validation, provider output parsing, native/web gates, wardrobe try-on, explicit device save/delete, missing-piece shopping budgets and guided entry points. Provider images are mocked; these tests do not certify real rendering or affiliate attribution.

No schema migration, secret change, feed import, paid provider request or App Store operation is included.

References: [Gemini image generation/editing](https://ai.google.dev/gemini-api/docs/generate-content/image-generation), [Supabase function authentication](https://supabase.com/docs/guides/functions/auth-legacy-jwt), and [existing affiliate setup](affiliate-shopping.md).
