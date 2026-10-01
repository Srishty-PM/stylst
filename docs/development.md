# Development notes

## Frontend

Use `npm ci` with the checked-in npm lockfile. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for a project you control. These are client configuration values; privileged credentials must stay in server-side service configuration.

`npm run dev` serves the app on port 8080. `npm run build` produces `dist/`. The repository also has Bun lockfiles; use the npm path above for a consistent walkthrough rather than switching package managers within one setup.

## Backend prerequisites

The client expects Supabase authentication, database tables, storage and Edge Functions. The checked-in migrations under `supabase/migrations/` describe the database evolution. Review the storage and authentication settings as part of configuring an independent instance.

AI functions use server-side `GEMINI_API_KEY`. Supabase provides service environment values such as `SUPABASE_URL` and `SUPABASE_ANON_KEY`; selected functions also use `SUPABASE_SERVICE_ROLE_KEY` for privileged account or storage operations. Configure these through the backend environment, never through `VITE_*` variables.

Optional Pinterest functionality needs an app registration, OAuth configuration and the server-side Pinterest credentials referenced by its functions. It is not required to review the core wardrobe/inspiration journey.

## Checks

```sh
npm run lint
npm run test
npm run build
```

The checked-in example test is a starter test, not broad regression coverage. Before releasing changes, manually check sign-in, onboarding, consent decline/allow/withdrawal, wardrobe upload, matching, saving a look, scheduling and account deletion against the intended backend.

## Mobile and editing workflow

`capacitor.config.ts` points mobile packaging at `dist/`. Native platform directories are not included. A native release requires generating the appropriate platform project, syncing built assets, configuring permissions/signing, testing on a device and following the [release notes](app-store-resubmission.md).

The project was developed with Lovable and can also be edited locally or in GitHub. Preserve published commit history when working with a connected editor.
