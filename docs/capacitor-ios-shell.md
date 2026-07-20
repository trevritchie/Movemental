# Capacitor iOS shell

Tracks implementation of GitHub issue #14 ("Ship iOS and Android via
Capacitor"). This note covers Phase 0 (web readiness) and Phase 1
(Capacitor iOS shell with locally bundled assets). Phase 2 (haptics,
native audio session, Share sheet exports, TestFlight readiness) is a
follow-up.

## What ships

- `capacitor.config.ts`: `webDir: 'dist'`, no `server.url`. The app loads
  the locally bundled Vite build; it never points the WebView at the
  Firebase-hosted site (`movemental-dev` / `movemental-chords`).
- `ios/`: native Xcode project added via `npx cap add ios`. Uses
  Capacitor's Swift Package Manager integration (`ios/App/CapApp-SPM`),
  not CocoaPods, so no Ruby/CocoaPods toolchain is required to sync
  plugins.
- Portrait lock: `ios/App/App/Info.plist` restricts
  `UISupportedInterfaceOrientations` (iPhone) to portrait only. The
  `~ipad` key is left with all four orientations since the desktop/tablet
  side-panel layout already supports landscape. The existing CSS/JS
  `LandscapePrompt` (`usePhoneLandscapeBlocked`) stays as a web-channel
  backup.
- Status bar: `@capacitor/status-bar` is installed and configured via
  `capacitor.config.ts` (`overlaysWebView: false`, `style: 'DARK'`
  meaning light text, `backgroundColor: '#09090b'`). The plugin reads
  this config natively at launch, so no extra JS call is required for the
  default appearance. `Info.plist` sets
  `UIViewControllerBasedStatusBarAppearance = true` (required by the
  plugin) and an initial `UIStatusBarStyleLightContent`.
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

This mirrors the web-only PWA install flow, which still works unchanged
in Safari.

## Self-hosted fonts (Phase 0)

`tokens.css` used to `@import` Inter from `fonts.googleapis.com`. That
CDN call would either fail offline in the native shell or flash unstyled
text while it resolved. Inter (weights 400/500/600/700, Latin subset
only) now ships from `src/assets/fonts/inter/*.woff2`, referenced by
relative `url()` in `tokens.css`, so Vite processes and hashes them the
same way it does every other bundled asset (consistent with `base: './'`
already used for JS/CSS). See `src/assets/fonts/inter/NOTICE.md` for the
font license.

## Building and running (requires macOS + Xcode)

This repository's cloud/dev agents run on Windows/Linux, which cannot
run Xcode, CocoaPods, or the iOS Simulator. `npx cap add ios` and
`npx cap sync ios` both work cross-platform (they only copy files and
resolve the Swift Package Manager plugin list), but opening, building,
and running the Xcode project needs a Mac:

```bash
npm run build            # tsc -b && vite build -> dist/
npm run cap:sync:ios      # copies dist/ into ios/App/App/public, refreshes plugins
npm run cap:open:ios      # opens ios/App/App.xcworkspace in Xcode (macOS only)
```

From Xcode: select a simulator or device, build, and run.

## Verification status

Done in this environment (no Xcode/device available):

- `npm run build`, `npm run lint`, `npm test` all pass with the platform
  helper, font, and gating changes.
- `npx cap add ios` / `npx cap sync ios` complete without CocoaPods.
- Code review confirms the sample-loading path
  (`src/audio/samplePaths.ts`) resolves URLs relative to
  `window.location.href`, so it works under Capacitor's local WebView
  origin the same way it already works under Vite's `base: './'` builds.
- Code review confirms `src/audio/iosMediaChannel.ts` detects iOS via
  touch points + Web Audio support (not user-agent sniffing), so the
  existing mute-switch unlock keeps working unchanged inside a Capacitor
  WKWebView.

Still needs a real Mac + device/simulator (Phase 1 exit criteria, do
before TestFlight):

- Tilt permission prompt actually appears and grants correctly inside
  the native shell.
- Sampler MP3s load from the bundled `ios/App/App/public/samples`
  (not just verified by code review).
- Hold/drone playback, all three voice-leading modes, Settings/Help
  panels, and recording stop/panic behave the same as the web build.
- Tap-to-sound latency on-device vs. `docs/latency-tuning.md`
  (`lookAhead: 0`, `latencyHint: 'interactive'`); do not change those
  values without a measured regression.

## Legal note (flagged, not decided here)

The repository is licensed under PolyForm Noncommercial 1.0.0
(`LICENSE.md`). Commercial App Store distribution is a licensing decision
for the repository owner, separate from App Review; this implementation
does not change or reinterpret the license.

## Not done yet (explicitly out of scope for Phase 0/1)

- Haptics on chord commit, native `AVAudioSession` activation and
  interruption/route handling, Share-sheet recording export, App Privacy
  labels, and TestFlight review notes are Phase 2.
- Android (`npx cap add android`) is Phase 3.
- Replacing the placeholder app icon with final brand art.
