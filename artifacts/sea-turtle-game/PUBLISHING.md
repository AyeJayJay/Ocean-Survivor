# Ocean Survivor — Publishing Guide

This document covers everything needed to take the game from development to
the Google Play Store and Apple App Store.

---

## 1. Swap Test Ad IDs for Production

1. Create your [Google AdMob](https://admob.google.com) account and add the app.
2. Create three ad units: **Banner**, **Interstitial**, and **Rewarded Video**.
3. Open `src/ads/AdConfig.ts` and fill in `PRODUCTION_AD_UNITS`:

```ts
const PRODUCTION_AD_UNITS = {
  banner:       "ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN",
  interstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN",
  rewarded:     "ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN",
  appId:        "ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN",
};
```

4. Set `USE_TEST_ADS = false` in the same file.
5. Update the AdMob **App ID** in both native manifests (see §4 below).

> ⚠️ Never submit to app stores with `USE_TEST_ADS = true`.

---

## 2. Complete the Privacy Policy & Consent Flow

- `src/pages/PrivacyPolicy.tsx` — fill all `[PLACEHOLDER]` sections with a
  real attorney-drafted privacy policy before submission.
- `src/ads/AdConsentModal.tsx` — replace the placeholder modal with a real
  **UMP (User Messaging Platform)** SDK on Android and **ATT
  (App Tracking Transparency)** flow on iOS. Both are required for GDPR/CCPA
  compliance and AdMob's policy.
  - UMP SDK: <https://developers.google.com/admob/ump/android/quick-start>
  - ATT: <https://developer.apple.com/documentation/apptrackingtransparency>

---

## 3. Build the Web Bundle

```bash
# From the artifact directory:
cd artifacts/sea-turtle-game
pnpm run build          # Vite build → dist/public/
```

Or use the combined script that also syncs to native projects:

```bash
pnpm run cap:build      # vite build && cap sync
```

---

## 4. Open the Native Projects

### Android

```bash
pnpm run cap:build
npx cap open android    # opens Android Studio
```

Before building:

- Open `android/app/src/main/AndroidManifest.xml`
- Replace the placeholder `GAD_APPLICATION_ID` value with your real AdMob App ID:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN"/>
```

**SDK versions** (from `android/variables.gradle`):
- `minSdkVersion`: 24 (Android 7.0)
- `targetSdkVersion`: 36 (Android 16)
- `compileSdkVersion`: 36

In Android Studio: **Build → Generate Signed Bundle / APK** → choose
**Android App Bundle (.aab)** for Play Store submission.

### iOS

```bash
pnpm run cap:build
npx cap open ios        # opens Xcode (macOS only)
```

Before building:

- Open `ios/App/App/Info.plist`
- Replace the `GADApplicationIdentifier` placeholder value with your real AdMob App ID.
- Verify `SKAdNetworkItems` includes the AdMob network entry (added by the plugin).
- Set your **Bundle Identifier** matching your App Store Connect entry.
- Bump **Version** and **Build** numbers.

**Minimum iOS version:** 15.0 (from `IPHONEOS_DEPLOYMENT_TARGET` in Xcode project)

In Xcode: **Product → Archive** → Distribute via **App Store Connect**.

---

## 5. Store Submission Checklists

### Google Play Store

- [ ] Create app in [Play Console](https://play.google.com/console)
- [ ] Complete store listing (title, description, screenshots, feature graphic)
- [ ] Set content rating via the rating questionnaire
- [ ] Complete data safety form (declare AdMob identifiers)
- [ ] Upload signed `.aab` to Internal Testing → promote to Production
- [ ] Links: [Play policy](https://play.google.com/about/developer-content-policy/)

### Apple App Store

- [ ] Create app in [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Complete store listing (screenshots for all device sizes)
- [ ] Set age rating (4+ recommended if no mature content)
- [ ] Complete App Privacy labels (declare ad data use)
- [ ] Submit for review via Xcode or Transporter
- [ ] Links: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

## 6. Key Files Reference

| File | Purpose |
|------|---------|
| `src/ads/AdConfig.ts` | Ad unit IDs — swap test→production here |
| `src/ads/AdConsentModal.tsx` | Replace with real UMP/ATT flow |
| `src/pages/PrivacyPolicy.tsx` | Fill `[PLACEHOLDER]` sections |
| `capacitor.config.ts` | App ID, bundle config, plugin settings |
| `android/app/src/main/AndroidManifest.xml` | AdMob App ID for Android |
| `ios/App/App/Info.plist` | AdMob App ID for iOS |

---

## 7. Performance Notes

- The Phaser renderer uses **WebGL** where available and **Canvas** as fallback
  (configured in `src/game/PhaserGame.tsx`).
- Obstacle objects are drawn procedurally per-frame with no persistent Phaser
  GameObjects — no pooling overhead.
- Bubble count in `GameScene.ts` is capped at 18 on screen at any time.
- The game targets **60 fps** with a fixed physics timestep. On lower-end
  devices, Phaser's `roundPixels: true` and the 480×854 canvas size keep
  rendering cost low.
- Gap and speed progression is capped (`MIN_GAP`, `MAX_SPEED`) to prevent
  the difficulty from becoming unplayable.
