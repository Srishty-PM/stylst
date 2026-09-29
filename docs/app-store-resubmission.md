# STYLST App Store resubmission

## App Review Information — notes to paste after the new iOS build is attached

STYLST is a personal wardrobe and outfit styling app. The previous review cited Guidelines 5.1.1(i) and 5.1.2(i) concerning data sent to a third-party AI service. In this build, the app identifies Google Gemini by name and discloses that clothing and inspiration photos, item details, and style prompts are sent through our service to Gemini for clothing analysis, image cleanup, and outfit suggestions. The user explicitly allows this on the welcome screen before entering the AI onboarding flow. “Skip for now” works without permission. If a user starts an AI feature later, a disclosure and permission prompt appears before that request; declining cancels the AI action. Permission is scoped to the signed-in account on the device and can be withdrawn in Settings > AI data permission. The in-app Privacy Policy also names Google Gemini and describes the data sent.

To review: create a new account or sign in with the review account supplied below. On the welcome screen, inspect the Google Gemini disclosure and leave the consent box unchecked to verify “Get Started” is unavailable and “Skip for now” is available. After skipping, open AI Stylist or add a closet item to see the permission prompt before processing. Choose Cancel to verify that the AI action does not proceed, or OK to test styling. Open Settings > AI data permission to withdraw permission and repeat. The Privacy Policy is available from the disclosure and Settings.

Services: Supabase for authentication, storage, and server functions; Google Gemini for AI processing; optional Pinterest connection for inspiration boards. Supply a working review account and password in App Store Connect's dedicated sign-in fields, along with any region or device-specific testing instructions. Do not put credentials in public release notes.

## Release gates

- [ ] Review this change and merge it. Do not build from the prior commit: its `postcss.config.js` contained obfuscated build-time network and code-execution logic. Rotate any build environment secrets that may have been exposed on machines that ran the previous build, and investigate the source of the injected code.
- [ ] Deploy the updated web assets and verify the in-app Privacy Policy at the URL configured in App Store Connect. The repository has no checked-in `ios/` project; generate/sync the native project with Capacitor on a trusted Mac and inspect native permissions and entitlements.
- [ ] Test a clean installation on a physical iPhone: unchecked consent; Skip; decline and allow later AI prompts; closet analysis, cleanup, matching, stylist, and influencer style; withdrawal and renewed prompt; account deletion and sign-in. Confirm the deployed Supabase functions work with the selected build.
- [ ] Record a short continuous physical-device walkthrough of those flows and provide Apple a reachable link if requested. Confirm that screenshots, privacy answers, access instructions, review credentials, and any external-service or region notes match the shipped app.
- [ ] Increment the iOS build number, sign and upload a fresh archive, select that build on the rejected version in App Store Connect, paste the notes above, and submit for review. Do not assert this has happened until App Store Connect shows the submission status.
