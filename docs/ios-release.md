# Owner-controlled iOS release

The complete native project lives in `ios/`, so a former developer's local
checkout is no longer needed to rebuild the app. Source, plugin versions,
branding, signing identity, and release workflows are held in this repository.

| Item | Value |
| --- | --- |
| App Store record | 6795601843 |
| Bundle identifier | shop.stylst.app |
| Apple team | C58275KM48 |
| Marketing version | 1.0 |
| First replacement build | 4 |
| Platforms | iPhone and iPad, iOS 15+ |
| Native project | ios/App/App.xcodeproj |
| Shared scheme | App |

## Reproduce and validate

Use Node 22+ and Xcode 26+ on macOS for a native build. Web tests and preparation
can also run on Linux.

```sh
npm ci --ignore-scripts
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run ios:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/DerivedData CODE_SIGNING_ALLOWED=NO build
```

`ios-validation.yml` performs these steps on a standard Mac runner, launches the
app in an iPhone simulator, and saves a launch screenshot and compile log. These
checks do not replace testing sign-in, photo access, consent, and AI responses on
an actual iPhone and iPad against the production backend.

## Signing setup

Create an Apple Distribution certificate and matching App Store provisioning
profile for this team and bundle identifier. Creating credentials requires the
account owner's authorization. Keep the certificate's private key; Apple's
certificate download alone cannot rebuild another developer's lost private key.

The manual `ios-appstore.yml` workflow reads the following encrypted repository
secrets. Never add their values to a source file, issue, review note, or chat.

| Secret | Content |
| --- | --- |
| IOS_DISTRIBUTION_P12 | Base64-encoded distribution certificate and private key |
| IOS_P12_PASSWORD | Password protecting that P12 file |
| IOS_APPSTORE_PROFILE | Base64-encoded App Store provisioning profile |
| ASC_PRIVATE_KEY | Base64-encoded App Store Connect API private key |
| ASC_KEY_ID | API key ID |
| ASC_ISSUER_ID | App Store Connect issuer ID |

Use the least App Store Connect role that permits build upload. The release
script validates the profile's team, bundle ID, expiration, and distribution type,
uses a temporary keychain, and deletes credential files on exit. Only the IPA is
saved as an artifact. Signed release runs are restricted to the main branch.

## AI service verification

Before upload, verify that the **production** Gemini API key stored in Supabase
belongs to a Google Cloud project with active billing. Google's paid-service
terms provide content-processing protections; free-service behavior must not be
presented as equivalent. Verify ownership, billing, processor terms, and the live
backend, then set repository variable `GEMINI_PAID_SERVICES_VERIFIED` to `true`.
The upload script refuses upload without this verification. Do not enable billing
or agree to provider terms without the owner's authorization.

The updated policy is bundled in the app at `/privacy`. Publish the same policy
at the public privacy URL used in App Store Connect before submission. The
generated `docs/privacy-policy.md` is also a public reviewable copy in GitHub.

## New build and review

1. Wait for the Mac validation workflow to pass for the exact release commit.
2. Run the App Store workflow on main with an unused build number of 4 or higher.
   Leave upload off to export and inspect a signed IPA first, or enable it once
   the signing and AI-service prerequisites have been verified.
3. Wait for processing in App Store Connect and select the new build under
   version 1.0. Never resubmit the rejected build 3 as the code replacement.
4. Test the demo account and the consent flows on iPhone and iPad. Verify decline,
   permission grant, withdrawal, camera/library prompts, and account deletion.
5. Update the privacy URL and App Privacy answers to match the collected data in
   `PrivacyInfo.xcprivacy`. Replace the former developer's review contact with a
   contact the owner controls. Keep review credentials out of this repository.
6. Provide the consent test instructions and submit the new build for review.

The workflow uploads a binary; it does not automatically submit an unverified
app or change its public release setting. Completion is confirmed by the new
build number and a Waiting for Review or In Review status in App Store Connect.
