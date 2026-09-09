# Capacitor mobile shells (iOS and Android)

Tracks implementation of GitHub issue #14 ("Ship iOS and Android via
Capacitor"). Phase 0 (web readiness), Phase 1 (iOS shell), Phase 2 (iOS
native polish), and Phase 3 (Android) are in this repository. Automatic
GitHub Releases of unsigned (and optionally signed) binaries are
documented in [`docs/RELEASES.md`](RELEASES.md).

Phase 4 (on-device latency hardening) and Phase 5 (Tone.js escape hatch)
remain evidence-driven follow-ups. Do not change `lookAhead` /
`latencyHint` without device measurements.

## What ships

- `capacitor.config.ts`: `webDir: 'dist'`, no `server.url`. The app loads
  the locally bundled Vite build; it never points the WebView at the
  Firebase-hosted site (`movemental-dev` / `movemental-chords`).
- `ios/`: native Xcode project added via `npx cap add ios`. Uses
  Capacitor's Swift Package Manager integration (`ios/App/CapApp-SPM`),
  not CocoaPods, so no Ruby/CocoaPods toolchain is required to sync
  plugins.
- `android/`: native Gradle project added via `npx cap add android`,
  same bundled `dist/` assets.
- Portrait lock: `ios/App/App/Info.plist` restricts
  `UISupportedInterfaceOrientations` (iPhone) to portrait only. The
  `~ipad` key is left with all four orientations since the desktop/tablet
  side-panel layout already supports landscape. Android phones keep the
  existing CSS/JS `LandscapePrompt` (`usePhoneLandscapeBlocked`) rather
  than a hard activity lock, so large-screen landscape still works.
- Status bar: `@capacitor/status-bar` is installed and configured via
  `capacitor.config.ts` (`overlaysWebView: false`, `style: 'DARK'`
  meaning light text, `backgroundColor: '#09090b'`). The plugin reads
  this config natively at launch, so no extra JS call is required for the
  default appearance. `Info.plist` sets
  `UIViewControllerBasedStatusBarAppearance = true` (required by the
  plugin) and an initial `UIStatusBarStyleLightContent`. Android
  `styles.xml` uses the same `#09090b` status and navigation bars.
- Launch screen: `ios/App/App/Base.lproj/LaunchScreen.storyboard` shows a
  solid `#09090b` background (no placeholder Capacitor splash image) so
  there is no white flash before the WebView paints.
- App icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset` has a single
  1024x1024 placeholder icon (elemental orbs on the app's dark
  background). Swap this file for final brand art before shipping to
  TestFlight; no other resizing is needed since Xcode 14+ derives all
  slots from the one universal size.
- `NSMotionUsageDescription` is declared proactively in `Info.plist`.
  Tilt mode calls `DeviceOrientationEvent.requestPermission()` from the
  web layer; WKWebView has been observed to require the usage string for
  that permission prompt even though no native Capacitor motion plugin is
  linked.
- No `UIBackgroundModes` entry and no microphone usage string: the app
  stops audio on background (`useAudioLifecycle.ts`) and session
  recording captures the app's own audio mix, not the microphone. Do not
  add either until the product actually changes.

## Platform gating (Phase 0)

`src/utils/nativePlatform.ts` wraps `Capacitor.isNativePlatform()` /
`Capacitor.getPlatform()`. `useFullscreen.ts` uses it to:

- Report `canFullscreen: false` inside the native shell, which hides the
  Settings "Full Screen" row entirely (`SettingsModal.tsx`).
- Short-circuit `toggleFullscreen()` before it can ever set
  `showIosInstallHint`, so the "Add to Home Screen" hint
  (`IosInstallHintPortal`) can never appear in the installed app.
  `SettingsModal` also ANDs `!isNativeApp()` as a second gate.

This mirrors the web-only PWA install flow, which still works unchanged
in Safari.

On native phones, Settings/Help use a full-screen sheet
(`.settings-modal--native-sheet`) instead of the centered glass card.

## Self-hosted fonts (Phase 0)

`tokens.css` used to `@import` Inter from `fonts.googleapis.com`. That
CDN call would either fail offline in the native shell or flash unstyled
text while it resolved. Inter (weights 400/500/600/700, Latin subset
only) now ships from `src/assets/fonts/inter/*.woff2`, referenced by
relative `url()` in `tokens.css`, so Vite processes and hashes them the
same way it does every other bundled asset (consistent with `base: './'`
already used for JS/CSS). See `src/assets/fonts/inter/NOTICE.md` for the
font license.

## Phase 2: native polish

- **Haptics:** `@capacitor/haptics` fires a light impact after audio
  dispatch on pointer chord commits (`usePlaybackCommit.ts` via
  `src/utils/nativeHaptics.ts`). Voicing-diff / Tilt to Strum paths do
  not haptic. Failures are swallowed so a missing vibrator cannot block
  playback.
- **Audio session:** `ios/App/App/AppDelegate.swift` activates
  `AVAudioSession` category `.playback` at launch (before the WebView
  cold-starts audio). `NativeAudioSessionPlugin` observes interruptions
  and route changes and forwards them to JS. `useAudioLifecycle.ts`
  maps those events onto the existing `AudioEngine.handlePageBackground`
  / `handlePageForeground` path. `iosMediaChannel.ts` skips the WebKit
  `navigator.audioSession` mutation inside the native shell so JS and
  native do not fight over category. The silent HTML unlock / Web Audio
  blip still runs; that is WKWebView unlock, not session ownership.
- **Share sheet:** recording and MIDI export use `@capacitor/share` +
  `@capacitor/filesystem` (`src/utils/nativeShare.ts`). Native builds
  never load ffmpeg.wasm from a CDN; they share the captured blob
  (iOS MediaRecorder is already M4A). The web channel still transcodes
  WebM to M4A.
- **Android back button:** `useNativeBackButton` dismisses an open
  `<dialog>` or recording review, then `App.minimizeApp()`.

## Building and running

```bash
npm run build                 # tsc -b && vite build -> dist/
npm run cap:sync              # copies dist/ into ios/ and android/
npm run cap:sync:ios
npm run cap:sync:android
npm run cap:open:ios          # Xcode (macOS)
npm run cap:open:android      # Android Studio
```

`npx cap add ios` / `npx cap sync ios` and the Android equivalents work
cross-platform (they copy files and resolve plugins). Opening and running
the Xcode project needs a Mac. Android Studio / SDK can run on Linux or
macOS.

From Xcode: select a simulator or device, build, and run.
From Android Studio: select an emulator or device, build, and run.

## Verification status

Done without Xcode/device in CI-like Linux:

- `npm run build`, `npm run lint`, `npm test` with platform helper,
  fonts, gating, haptics, share, and audio-session wiring.
- `npx cap add ios` / `npx cap sync ios` complete without CocoaPods.
- `npx cap add android` / `npx cap sync android` generate the Gradle
  project with local `dist/` only.
- Code review confirms the sample-loading path
  (`src/audio/samplePaths.ts`) resolves URLs relative to
  `window.location.href`, so it works under Capacitor's local WebView
  origin the same way it already works under Vite's `base: './'` builds.
- Code review confirms `src/audio/iosMediaChannel.ts` detects iOS via
  touch points + Web Audio support (not user-agent sniffing), so the
  existing mute-switch unlock keeps working inside a Capacitor WKWebView,
  while native AVAudioSession owns category/activation.

Still needs a real device/simulator before TestFlight / Play internal
testing:

- Tilt permission prompt actually appears and grants correctly inside
  the native shell.
- Sampler MP3s load from the bundled `public/samples`.
- Hold/drone playback, all three voice-leading modes, Settings/Help
  panels, recording stop/panic, share sheet, and interruption recovery
  (phone call, headphones unplug) behave the same as the web build.
- Tap-to-sound latency on-device vs. `docs/latency-tuning.md`
  (`lookAhead: 0`, `latencyHint: 'interactive'`); do not change those
  values without a measured regression.
- Android audio focus vs other media apps; system back button vs
  Settings/Help/review overlays.

## App Store / Play Console notes (not automated)

Review notes template (App Store Connect):

> Movemental is an interactive musical instrument, not a website mirror.
> Content is bundled offline. To review: open app → choose Tilt (allow
> motion) or No Tilt → tap elemental chords on the diagram. Audio uses
> Web Audio with a native AVAudioSession configured at launch. Haptics
> fire on chord commits. Session recording/export is optional under the
> recording controls.

App Privacy: no tracking. Motion is used for tilt voicings. Microphone
is not used. Background audio is not claimed.

Signing, TestFlight, and Play upload use repository secrets documented
in [`docs/RELEASES.md`](RELEASES.md). GitHub Releases attach build
artifacts; they do not upload to App Store Connect or Play Console.

## Legal note (flagged, not decided here)

The repository is licensed under PolyForm Noncommercial 1.0.0
(`LICENSE.md`). Commercial App Store / Play Store distribution is a
licensing decision for the repository owner, separate from store review;
this implementation does not change or reinterpret the license.

## Not done yet (explicitly out of scope)

- Replacing the placeholder app icon with final brand art.
- App Store Connect / Play Console submission UI.
- On-device latency matrix (Phase 4).
- Replacing Tone.js (Phase 5).
