# App Store privacy answers for the replacement build

These entries reflect the reviewed app source and its privacy manifest. Apply
them in App Store Connect after checking the production service configuration;
they have not been published to the App Store by this document.

Answer **Yes, we collect data from this app**. Select the following types. Each
is linked to the user or device; the reviewed source does not use these data
types for tracking across other companies' apps or websites.

| App Store data type | Purposes | Linked | Tracking | Source behavior |
| --- | --- | --- | --- | --- |
| Contact Info > Name | App Functionality | Yes | No | Account profile and display name |
| Contact Info > Email Address | App Functionality | Yes | No | Sign-in and transactional account emails |
| Identifiers > User ID | App Functionality, Analytics, Product Personalization | Yes | No | Account data, usage events, and account-specific wardrobe suggestions |
| Identifiers > Device ID | Analytics | Yes | No | Random device ID persisted by first-party usage analytics |
| User Content > Photos or Videos | App Functionality, Product Personalization | Yes | No | Selected closet/inspiration images and personalized outfit recommendations |
| User Content > Other User Content | App Functionality, Product Personalization | Yes | No | Clothing details, style preferences/prompts, influencer names/handles, saved looks, and plans |
| Usage Data > Product Interaction | Analytics | Yes | No | Page views, feature events, session duration, and shopping views/saves/clicks |

Product Personalization is included because wardrobe and style data customize
the outfit suggestions shown to each account. It is declared alongside App
Functionality in `ios/App/App/PrivacyInfo.xcprivacy`.

## Verify before publishing

- Confirm that the production Supabase and Gemini services have no additional
  SDKs or retained data uses requiring additional disclosures. In particular,
  inspect retained IP/security/error logs rather than assuming they are absent.
- Verify that the production Gemini key belongs to a project with active billing
  and Google's paid-service processing protections. The release workflow keeps
  upload blocked until this is verified.
- AI permission is optional, but these data types still belong on the label:
  optional ongoing collection is not exempt from Apple's disclosure rules.
- The shopping catalogue stores saves on the device and sends view/save/click
  events to first-party analytics. Retailer/affiliate URLs do not receive a
  STYLST account ID, email, wardrobe photo, or style prompt from this code.
- Publish the October 7 policy at the public App Store privacy URL, or use the
  public `docs/privacy-policy.md` page while the website publishing access is
  being restored. Check that the chosen URL opens without sign-in.
- Set the age-rating override to at least 18 to match the account and AI age
  requirements. Answer the content questionnaire based on the actual app;
  the age override does not replace those answers.
- Replace the former developer's review contact with the owner's contact and
  validate the dedicated review account against the new build.

Apple's [App Privacy Details guidance](https://developer.apple.com/app-store/app-privacy-details/)
defines data types, purposes, linked data, tracking, optional collection, and
the required public policy URL. This table is prepared for entry, not evidence
that App Store Connect has already been updated.
