# Mobile GitHub Releases

Tag a version (`v0.1.0`, matching `package.json`) and push it. The
[Mobile Release](../.github/workflows/mobile-release.yml) workflow builds
the Vite `dist/`, syncs Capacitor, and attaches artifacts to a GitHub
Release.

This is **not** App Store Connect or Google Play upload. Store submission
and paid-license strategy remain owner decisions (PolyForm Noncommercial;
see `LICENSE.md`).

## Versioning

- `package.json` `version` is the product version (currently `0.1.0`).
- Git tags use the same value with a `v` prefix: `v0.1.0`.
- iOS `MARKETING_VERSION` in the Xcode project should stay in sync.
- Android `versionName` / `versionCode` are taken from
  `android/app/build.gradle` (updated when you bump the release).

```bash
git tag v0.1.0
git push origin v0.1.0
```

You can also run the workflow manually (`workflow_dispatch`) to produce
artifacts without creating a GitHub Release.

## What each job produces

| Job | Runner | Default artifact | Signed artifact (secrets present) |
|-----|--------|------------------|-----------------------------------|
| Android | `ubuntu-latest` | Debug APK | Release AAB + APK via keystore secrets |
| iOS | `macos-latest` | Unsigned iOS Simulator `.app` zip | IPA via Apple certificate + profile secrets |

If signing secrets are missing, the signed job steps are skipped and the
unsigned/debug artifact is still attached. That is intentional so a tag
always produces something downloadable.

## Android signing secrets

Create a Play upload keystore, then add repository secrets:

| Secret | Contents |
|--------|----------|
| `ANDROID_KEYSTORE_BASE64` | Base64 of the `.jks` / `.keystore` file (`base64 -i upload.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

When all four are set, the workflow writes `android/keystore.jks` (gitignored
ephemeral on the runner) and runs `assembleRelease` / `bundleRelease`.

## iOS signing secrets

Needed only for a device IPA (TestFlight / Ad Hoc). Simulator builds do
not use these.

| Secret | Contents |
|--------|----------|
| `IOS_CERTIFICATE_P12_BASE64` | Base64 of a `.p12` distribution certificate |
| `IOS_CERTIFICATE_PASSWORD` | P12 password |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64 of the `.mobileprovision` |
| `IOS_TEAM_ID` | Apple Developer Team ID |

Optional:

| Secret | Contents |
|--------|----------|
| `IOS_BUNDLE_ID` | Defaults to `com.movemental.app` |
| `IOS_CODE_SIGN_IDENTITY` | Defaults to `Apple Distribution` |

Export options and Fastlane/match are not wired. The workflow uses
`xcodebuild -exportArchive` when the secrets above are present. App Store
Connect API keys (`APP_STORE_CONNECT_*`) are **not** required for GitHub
Releases; add them later if you want TestFlight upload.

## Local unsigned builds

```bash
npm run cap:sync:android
cd android && ./gradlew assembleDebug

npm run cap:sync:ios
# macOS only:
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -sdk iphonesimulator -configuration Release \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO
```

## Store listing reminders

- Privacy: motion for tilt voicings; no microphone; no tracking; no
  background audio entitlement.
- Review notes live in [`docs/capacitor-ios-shell.md`](capacitor-ios-shell.md).
- Commercial distribution on the stores needs a separate license from the
  copyright holder.
