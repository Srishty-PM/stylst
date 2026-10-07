#!/usr/bin/env bash
set -euo pipefail
umask 077

# This script runs only on the ephemeral macOS runner. Keep credentials out of
# source, console output, build products, and uploaded artifacts.
[[ "$(uname -s)" == Darwin ]] || { echo 'An Xcode Mac is required.' >&2; exit 1; }
[[ "${IOS_BUILD_NUMBER:-}" =~ ^[0-9]+$ ]] && (( 10#$IOS_BUILD_NUMBER >= 4 )) || { echo 'Use a new build number of 4 or higher.' >&2; exit 1; }
for variable in IOS_DISTRIBUTION_P12 IOS_P12_PASSWORD IOS_APPSTORE_PROFILE; do
  [[ -n "${!variable:-}" ]] || { echo "Missing encrypted GitHub secret: $variable" >&2; exit 1; }
done
if [[ "${IOS_UPLOAD:-false}" == true ]]; then
  [[ "${GEMINI_PAID_SERVICES_VERIFIED:-false}" == true ]] || { echo 'Verify that the production Gemini API key uses a project with active billing and paid-service data protections before upload.' >&2; exit 1; }
  for variable in ASC_PRIVATE_KEY ASC_KEY_ID ASC_ISSUER_ID; do
    [[ -n "${!variable:-}" ]] || { echo "Missing encrypted GitHub secret: $variable" >&2; exit 1; }
  done
fi

signing_dir=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/stylst-signing.XXXXXX")
keychain_path="$signing_dir/signing.keychain-db"
profile_path=''
cleanup() {
  security delete-keychain "$keychain_path" >/dev/null 2>&1 || true
  [[ -z "$profile_path" ]] || rm -f "$profile_path"
  rm -rf "$signing_dir"
}
trap cleanup EXIT
export STYLST_SIGNING_DIR="$signing_dir"
python3 - <<'PY'
import base64, os
from pathlib import Path
root = Path(os.environ['STYLST_SIGNING_DIR'])
for variable, filename in [('IOS_DISTRIBUTION_P12', 'certificate.p12'), ('IOS_APPSTORE_PROFILE', 'profile.mobileprovision')]:
    (root / filename).write_bytes(base64.b64decode(os.environ[variable], validate=True))
if os.environ.get('IOS_UPLOAD') == 'true':
    (root / 'AuthKey.p8').write_bytes(base64.b64decode(os.environ['ASC_PRIVATE_KEY'], validate=True))
for path in root.iterdir():
    path.chmod(0o600)
PY

security cms -D -i "$signing_dir/profile.mobileprovision" > "$signing_dir/profile.plist"
profile_uuid=$(python3 - <<'PY'
import datetime, os, plistlib
from pathlib import Path
p = plistlib.loads((Path(os.environ['STYLST_SIGNING_DIR']) / 'profile.plist').read_bytes())
assert p['TeamIdentifier'] == ['C58275KM48'], 'Profile belongs to a different Apple team'
assert p['Entitlements']['application-identifier'] == 'C58275KM48.shop.stylst.app', 'Profile does not match Stylst'
assert p['ExpirationDate'] > datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None), 'Profile has expired'
assert not p.get('ProvisionedDevices') and not p.get('ProvisionsAllDevices'), 'Use an App Store distribution profile'
print(p['UUID'])
PY
)
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
profile_path="$HOME/Library/MobileDevice/Provisioning Profiles/$profile_uuid.mobileprovision"
cp "$signing_dir/profile.mobileprovision" "$profile_path"

keychain_password=$(openssl rand -base64 32)
security create-keychain -p "$keychain_password" "$keychain_path"
security set-keychain-settings -lut 21600 "$keychain_path"
security unlock-keychain -p "$keychain_password" "$keychain_path"
# Apple's Keychain importer rejects the PBES2/SHA-256 encoding produced by
# modern OpenSSL. Keep that original password-protected GitHub secret intact;
# convert a private, temporary copy to the encoding Keychain accepts. All key
# material stays in the runner's restricted signing directory and is removed.
openssl_bin=$(command -v openssl)
if [[ -x /opt/homebrew/opt/openssl@3/bin/openssl ]]; then
  openssl_bin=/opt/homebrew/opt/openssl@3/bin/openssl
fi
"$openssl_bin" pkcs12 -in "$signing_dir/certificate.p12" -passin env:IOS_P12_PASSWORD -nodes -out "$signing_dir/identity.pem"
"$openssl_bin" pkcs12 -export -in "$signing_dir/identity.pem" -out "$signing_dir/keychain.p12" -passout env:IOS_P12_PASSWORD -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -macalg sha1
rm -f "$signing_dir/identity.pem"
security import "$signing_dir/keychain.p12" -k "$keychain_path" -P "$IOS_P12_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security >/dev/null
rm -f "$signing_dir/keychain.p12"
security list-keychains -d user -s "$keychain_path" "$HOME/Library/Keychains/login.keychain-db"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$keychain_password" "$keychain_path" >/dev/null

xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath ios/output/Stylst.xcarchive CURRENT_PROJECT_VERSION="$IOS_BUILD_NUMBER" DEVELOPMENT_TEAM=C58275KM48 CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY='Apple Distribution' PROVISIONING_PROFILE_SPECIFIER="$profile_uuid" OTHER_CODE_SIGN_FLAGS="--keychain $keychain_path" archive

export STYLST_PROFILE_UUID="$profile_uuid"
python3 - <<'PY'
import os, plistlib
from pathlib import Path
options = {
    'method': 'app-store-connect', 'destination': 'export',
    'teamID': 'C58275KM48', 'signingStyle': 'manual',
    'signingCertificate': 'Apple Distribution',
    'provisioningProfiles': {'shop.stylst.app': os.environ['STYLST_PROFILE_UUID']},
    'manageAppVersionAndBuildNumber': False,
}
(Path(os.environ['STYLST_SIGNING_DIR']) / 'ExportOptions.plist').write_bytes(plistlib.dumps(options))
PY
xcodebuild -exportArchive -archivePath ios/output/Stylst.xcarchive -exportPath ios/output -exportOptionsPlist "$signing_dir/ExportOptions.plist"

if [[ "${IOS_UPLOAD:-false}" == true ]]; then
  mkdir -p "$signing_dir/private_keys"
  mv "$signing_dir/AuthKey.p8" "$signing_dir/private_keys/AuthKey_${ASC_KEY_ID}.p8"
  API_PRIVATE_KEYS_DIR="$signing_dir/private_keys" xcrun altool --upload-app --type ios --file ios/output/App.ipa --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
fi
