# STYLST App Store resubmission

## App Review Information — notes to paste after the new iOS build is attached

STYLST is a personal wardrobe and outfit styling app. The previous review cited Guidelines 5.1.1(i) and 5.1.2(i) concerning data sent to a third-party AI service. The replacement build names Google Gemini, explains that selected clothing and inspiration photos, clothing details, style prompts, and chosen influencer names or handles are sent for clothing analysis, image cleanup, outfit matching, and styling suggestions, and obtains explicit permission before the request. AI processing is optional. Users may choose “Skip for now” during onboarding or “Not now” in a later disclosure dialog. Permission is scoped to the account on the device, records the disclosure version, and can be withdrawn in Settings > AI data permission. The app rechecks permission immediately before each AI request, including after a photo upload. The in-app Privacy Policy names Supabase and Google and describes the processing, provider terms, retention limits, and user controls.

To review: create an adult account or sign in with the review account in the dedicated App Store Connect fields. On the welcome screen, leave the consent box unchecked to verify “Get Started” is unavailable and “Skip for now” is available. After skipping, open AI Stylist or add a closet item to see the Google Gemini disclosure before processing. Choose “Not now” to cancel the AI action. To allow processing, confirm “I am 18 or older” and choose “Allow AI processing”. Open Settings > AI data permission to withdraw permission and repeat. The Privacy Policy can be opened directly from the disclosure without granting permission, and is also available from Settings.

Services: Supabase for authentication, storage, and server functions; Google Gemini for AI processing; optional Pinterest connection for inspiration boards. Supply a working review account and password in App Store Connect's dedicated sign-in fields, along with any region or device-specific testing instructions. Do not put credentials in public release notes.

## Release state

The native SwiftPM/Xcode project is now checked in with the existing bundle ID
and Apple team, STYLST branding, camera/library descriptions, callback URL scheme,
privacy manifest, and a shared build scheme. Build 4 is the first replacement
build number. The app bundles its reviewed web assets rather than loading a
remote website. `postcss.config.js` uses the clean configuration already merged
in September.

The automated consent suite verifies default denial, explicit grant, policy
access without consent, account isolation, old-record invalidation, failed
storage, simultaneous requests, withdrawal during upload, and cancellation when
accounts change. A matching-hook integration test confirms that declining sends
no AI RPC. The Mac workflow separately compiles and launches the native app.

Before submitting, complete the signing, production Gemini paid-service
verification, public privacy URL, App Privacy metadata, demo-account validation,
and iPhone/iPad review described in [iOS release instructions](ios-release.md).
Record a physical-device walkthrough if Apple requests it. Replace the former
developer's review contact with an owner-controlled contact.

Only paste these notes after attaching and validating the new build. Uploading
an IPA and submitting it for review are separate actions. Do not claim completion
until App Store Connect shows the new build and submission status.
