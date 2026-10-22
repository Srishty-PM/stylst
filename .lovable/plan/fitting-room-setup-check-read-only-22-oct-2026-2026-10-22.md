# Fitting room setup check (read-only, 22 Oct 2026)

## Findings
- GEMINI_API_KEY is set in the backend secrets. Its value was not read.
- GEMINI_PAID_SERVICES_VERIFIED is not a backend secret. It is only a GitHub repository variable, read by the iOS release workflow. I can't see GitHub variables from here, so I can't tell whether it's set. I found no billing or paid-tier proof anywhere in the backend.
- Image models: test prompts with no user data (a red circle) work today on gemini-3.1-flash-image and gemini-2.5-flash-image. The key can also see gemini-3-pro-image, gemini-3-pro-image-preview, gemini-3.1-flash-image-preview and gemini-3.1-flash-lite-image, but I didn't test those. These tests only generated images from text. Editing an existing photo hasn't been tested, so it's still unconfirmed.
- avatar-try-on does not exist in the synced code yet. Once it's synced, I can publish that one function by itself. Doing so leaves every other AI feature and the iOS build 4 sent to Apple untouched. It will also need its own security setting entry, the same way each existing function has one.

## Still unknown
- Whether the Google project behind the key has billing on (paid tier). The owner can check at https://aistudio.google.com/apikey and https://console.cloud.google.com/billing.
- Whether the live privacy page now shows the October 7 policy. On 15 Oct it still showed August 13.

## Next step after approval
- Publish only avatar-try-on, once it shows up in the synced code. Then test it with a made-up, non-personal image.
