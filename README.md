# STYLST

**From saved to styled: an AI wardrobe and outfit-planning product.**

STYLST connects saved outfit inspiration with the clothes someone already owns. Add wardrobe items, save an inspiration image, find relevant matches, and turn the result into a look you can wear or schedule.

[Web app](https://stylst.shop/) · [Product story](docs/product-story.md) · [Portfolio](https://github.com/Srishty-PM/cv) · [Srishty Pahujani](https://srishtypahujani.com/)

## Why I built it

Saving a look is easy; translating it into an outfit from your own wardrobe takes effort. The product brings inspiration, personal inventory and daily planning into one journey. It is an independent founder-and-builder project, developed with AI-assisted tooling including Lovable.

## The customer journey

| Stage | Implemented experience |
| --- | --- |
| Get started | Account creation, onboarding and an explicit AI data-permission flow. |
| Build a wardrobe | Photograph or upload clothing, add item details and use AI analysis or image cleanup. |
| Save inspiration | Add reference looks; optionally connect Pinterest with additional service configuration. |
| Find an outfit | Match an inspiration look against actual wardrobe items, with missing pieces identified separately. |
| Make it useful | Save looks, ask the AI Stylist for combinations and plan outfits in a calendar. |
| Manage the account | Settings, AI permission withdrawal, privacy information and account deletion. |

## A five-minute tour

1. Open the web app and create an account.
2. Review the AI disclosure during onboarding. You can skip AI permission and enable it later when using an AI feature.
3. Add a few clothing items and an inspiration image.
4. Start matching from the inspiration view. Inspect the matched items and the pieces the wardrobe does not contain.
5. Save a look and add it to the calendar. Explore AI Stylist and Settings.

The authenticated flows use a configured backend. For a review without creating an account, read the [product story and code tour](docs/product-story.md).

## Product decisions worth exploring

- **Wardrobe-grounded suggestions:** the stylist is prompted to use owned items; matching validates returned item IDs against the user's wardrobe.
- **Visible gaps:** missing garments are surfaced instead of forcing a weak match.
- **User control:** AI data permission is account-scoped on the device, can be declined, and can be withdrawn in Settings.
- **Operating cost:** generation allowances and model fallback logic are implemented in the server functions.
- **Measurement:** instrumentation includes signup, photo upload, match start and look-save events.

## Stack and code map

| Area | Technology / location |
| --- | --- |
| Web client | React, TypeScript, Vite, Tailwind CSS and shadcn/ui — `src/` |
| Navigation and data | React Router and TanStack Query |
| Authentication, storage and database | Supabase — `src/integrations/supabase/`, `supabase/migrations/` |
| AI processing | Google Gemini through Supabase Edge Functions — `supabase/functions/` |
| Mobile packaging | Capacitor configuration — `capacitor.config.ts` |
| Consent and analytics | `src/lib/ai-consent.ts`, `src/hooks/useAnalytics.ts` |

## Run locally

Use a current Node.js installation with npm. The npm lockfile is checked in.

```sh
git clone https://github.com/Srishty-PM/stylst.git
cd stylst
npm ci
cp .env.example .env.local
# Fill .env.local with your own Supabase project settings.
npm run dev
```

The development server is configured for `http://localhost:8080`. A full working copy needs its own Supabase database, storage setup, authentication configuration and deployed Edge Functions; frontend installation alone does not provision these services. See [development notes](docs/development.md).

```sh
npm run build
npm run preview
npm run lint
npm run test
```

## Current scope

This repository contains the web application and Capacitor configuration. Native iOS and Android projects are not checked in, and this README does not imply an approved App Store release. [App Store resubmission notes](docs/app-store-resubmission.md) track the separate release work.

Shopping suggestions are model-generated search recommendations rather than a verified live retailer inventory feed. Subscription UI and generation limits should not be treated as evidence of a complete paid billing system. Proposed product metrics and validation questions are in the [product story](docs/product-story.md).

Built by **Srishty Pahujani** · [Website](https://srishtypahujani.com/) · [LinkedIn](https://www.linkedin.com/in/srishtypahujani/)
