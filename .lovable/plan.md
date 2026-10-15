# STYLST production verification (read-only findings)

## Verified
- Project dzhhrtxlmmmbhggwsbrh is Lovable Cloud-managed (it is this project's Cloud backend). That is why an outside Supabase connector cannot reach it.
- All AI functions (ai-stylist, auto-match, analyze-clothing, generate-influencer-style, generate-thumbnail, remove-background, shop-recommendations) call Google directly at generativelanguage.googleapis.com using the secret named GEMINI_API_KEY. LOVABLE_API_KEY also exists, but these functions don't use it.
- Health check (gemini-check, test prompts only: "Reply OK" and "red circle"; no user data) returned 200 on 15 Oct 2026. gemini-3.5-flash, gemini-3-flash-preview, gemini-2.5-flash-image and gemini-3.1-flash-image work. gemini-2.0-flash and gemini-2.5-flash-lite return 404 (retired). No code currently in the repo uses them as a primary model.
- The code in the repo shows "Last updated: October 7, 2026" on the privacy page.
- The public page https://stylst.shop/privacy currently shows **"Last updated: August 13, 2026"**. So the October 7 policy is NOT live yet. The published web app is behind the repo.

## Not verifiable from here
- Whether the Google project behind GEMINI_API_KEY has billing on (paid tier). The Gemini API gives no billing status. Successful calls don't prove a paid tier, because free-tier keys work too.
- Which Google Cloud project owns that key.

## Where the owner can check
- https://aistudio.google.com/apikey shows each key, its project and its tier ("Free" or "Paid"/billing tier).
- https://console.cloud.google.com/billing shows whether billing is linked to that project.

## Upload gate
- GEMINI_PAID_SERVICES_VERIFIED must NOT be set to true yet. The paid tier is unconfirmed and the live privacy policy is outdated.
- Set it to true only after the owner (1) confirms in AI Studio that the key's project is on a paid tier, and (2) republishes the web app so stylst.shop/privacy shows October 7, 2026.

No changes were made.
