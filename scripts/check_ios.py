#!/usr/bin/env python3
"""Check release identity and privacy prerequisites before invoking Xcode."""
import json
import plistlib
import re
import struct
import zlib
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'ios/App/App'
project = (ROOT / 'ios/App/App.xcodeproj/project.pbxproj').read_text()
info = plistlib.loads((APP / 'Info.plist').read_bytes())
privacy = plistlib.loads((APP / 'PrivacyInfo.xcprivacy').read_bytes())

def require(condition, message):
    if not condition:
        raise SystemExit(f'iOS configuration failed: {message}')

require(project.count('PRODUCT_BUNDLE_IDENTIFIER = shop.stylst.app;') == 2, 'bundle ID must match the existing App Store app')
require(project.count('DEVELOPMENT_TEAM = C58275KM48;') == 2, 'both configurations need the owner team')
versions = re.findall(r'CURRENT_PROJECT_VERSION = (\d+);', project)
require(len(versions) == 2 and min(map(int, versions)) >= 4, 'do not reuse rejected builds 1, 2, or 3')
require(project.count('MARKETING_VERSION = 1.0;') == 2, 'marketing version must match the rejected 1.0 submission')
require(project.count('TARGETED_DEVICE_FAMILY = "1,2";') == 2, 'support both iPhone and iPad')
for key in ('NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSPhotoLibraryAddUsageDescription'):
    require(bool(info.get(key)), f'{key} is required by the camera plugin')
require(info.get('ITSAppUsesNonExemptEncryption') is False, 'declare standard HTTPS encryption')
require(any('stylst' in entry.get('CFBundleURLSchemes', []) for entry in info.get('CFBundleURLTypes', [])), 'Pinterest callback URL scheme is missing')
require(privacy.get('NSPrivacyTracking') is False, 'the app does not track users across other companies')
require(any(entry.get('NSPrivacyAccessedAPIType') == 'NSPrivacyAccessedAPICategoryUserDefaults' and 'CA92.1' in entry.get('NSPrivacyAccessedAPITypeReasons', []) for entry in privacy.get('NSPrivacyAccessedAPITypes', [])), 'Preferences requires a UserDefaults privacy reason')
require('PrivacyInfo.xcprivacy in Resources' in project, 'privacy manifest must be bundled')
ElementTree.parse(ROOT / 'ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme')
icon = APP / 'Assets.xcassets/AppIcon.appiconset'
for image in json.loads((icon / 'Contents.json').read_text())['images']:
    raw = (icon / image['filename']).read_bytes()
    require(raw[:8] == b'\x89PNG\r\n\x1a\n', 'app icon must be PNG')
    width, height = struct.unpack('>II', raw[16:24])
    require((width, height) == (1024, 1024) and raw[25] == 2, 'App Store icon must be opaque RGB, 1024 by 1024')
for image_path in (APP / 'Assets.xcassets').rglob('*.png'):
    raw = image_path.read_bytes()
    offset, finished = 8, False
    while offset + 12 <= len(raw):
        length = struct.unpack('>I', raw[offset:offset + 4])[0]
        end = offset + 12 + length
        require(end <= len(raw), f'{image_path.name} is truncated')
        require(zlib.crc32(raw[offset + 4:end - 4]) & 0xffffffff == struct.unpack('>I', raw[end - 4:end])[0], f'{image_path.name} has a corrupt PNG chunk')
        if raw[offset + 4:offset + 8] == b'IEND':
            finished = True
            break
        offset = end
    require(finished, f'{image_path.name} is incomplete')
generated = APP / 'capacitor.config.json'
if generated.exists():
    config = json.loads(generated.read_text())
    require(config.get('appId') == 'shop.stylst.app', 'Capacitor bundle ID differs')
    require(not config.get('server', {}).get('url'), 'bundle the reviewed app instead of a remote website')
print('iOS identity, permissions, privacy manifest, scheme, and icon checks passed.')
