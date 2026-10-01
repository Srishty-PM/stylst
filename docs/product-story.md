# STYLST — product story

**An independent consumer AI product connecting inspiration with personal inventory.**

## The problem

Fashion inspiration and a person's wardrobe usually live in different places. A saved image does not tell someone whether they already own a similar outfit, which pieces are missing, or how to turn it into a plan for tomorrow. The product hypothesis is that connecting those steps makes inspiration more actionable and supports repeat use.

## The first useful journey

The core loop is **add wardrobe items → save inspiration → match → save a look → plan when to wear it**. The wardrobe provides personal context; the inspiration supplies the goal; the saved look and calendar give the output a practical next step.

I built the product as a founder and product manager using AI-assisted development. The repository makes the resulting implementation inspectable, including onboarding, authentication, data models, AI processing and analytics.

## Decisions and trade-offs visible in the code

| Decision | Reasoning | Implementation evidence |
| --- | --- | --- |
| Anchor suggestions to owned clothes | A generic outfit is less useful if the user cannot wear it. | [Stylist function](../supabase/functions/ai-stylist/index.ts) uses wardrobe context. |
| Separate matches from missing pieces | A confident but incorrect substitution undermines trust. | [Matching function](../supabase/functions/auto-match/index.ts) defines garment and colour constraints and validates item IDs. |
| Ask permission before AI processing | Photos and prompts make data sharing a meaningful user choice. | [Consent helper](../src/lib/ai-consent.ts), [Settings](../src/pages/Settings.tsx), [Privacy](../src/pages/Privacy.tsx). |
| Make saving and planning part of the journey | A generated answer needs a route to repeatable value. | [Looks](../src/pages/Looks.tsx), [Calendar](../src/pages/Calendar.tsx). |
| Observe the funnel | Growth work needs to locate friction between intent and value. | [Analytics events](../src/hooks/useAnalytics.ts) include signup, photo upload, match start and look saved. |

## How I would evaluate it

These are proposed evaluation measures, not reported results:

- **Activation:** the share of new users who add wardrobe items and save their first useful look; time to that outcome.
- **Match usefulness:** acceptance, swaps and missing-item accuracy on a labelled set of inspiration/wardrobe pairs.
- **Repeat value:** weekly look saves, calendar use and return visits after initial setup.
- **Guardrails:** wrong item references, inappropriate substitutions, AI failures, consent failures, latency and cost per successful saved look.

The matching function validates IDs, but this does not establish visual accuracy. Model prompts, fallbacks and quotas are useful implementation controls; they still need an evaluation dataset and real usage evidence.

## Next product questions

Where does wardrobe setup become too much effort? Does matching reduce decision time? Do people return for inspiration or for planning? Would a paid proposition create enough recurring value beyond the initial novelty?

The public repository does not contain a verified experiment report or commercial-performance dataset. The strongest evidence here is the implemented end-to-end journey and the product choices behind it.

[Back to the project](../README.md) · [Full portfolio](https://github.com/Srishty-PM/cv)
