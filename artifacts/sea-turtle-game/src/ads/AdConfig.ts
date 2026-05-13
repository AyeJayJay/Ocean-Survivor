/*
 * AdConfig — Centralized ad unit ID configuration for Ocean Survivor
 *
 * ── How ad mode is selected ──────────────────────────────────────────────────
 *
 * USE_TEST_ADS is automatically set by the Vite build environment:
 *   - Development  (`pnpm dev`)   → true  → Google test ad units are used
 *   - Production   (`pnpm build`) → false → Your real AdMob IDs are used
 *
 * You never need to flip this flag manually.
 *
 * ── Safety fallback ──────────────────────────────────────────────────────────
 *
 * PROD_IDS_READY is checked at runtime. If any production ID still contains
 * "REPLACE_ME", the app silently falls back to test ads instead of crashing
 * or serving broken requests. You will see a console warning in dev tools.
 *
 * ── Remaining setup before release ───────────────────────────────────────────
 *
 * ✅  App ID         ca-app-pub-1287355220585536~4125519824
 * ✅  Banner         ca-app-pub-1287355220585536/6841971059
 * ✅  Interstitial   ca-app-pub-1287355220585536/6504271151
 * ✅  Rewarded       ca-app-pub-1287355220585536/3317659015
 *
 * ── Native App ID registration (required for each platform) ──────────────────
 *
 *   Android:  android/app/src/main/AndroidManifest.xml
 *             <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
 *                        android:value="ca-app-pub-1287355220585536~4125519824"/>
 *
 *   iOS:      ios/App/App/Info.plist
 *             <key>GADApplicationIdentifier</key>
 *             <string>ca-app-pub-1287355220585536~4125519824</string>
 *             (run `pnpm cap:ios:setup` after `npx cap add ios`)
 */

// Automatically true in `pnpm dev`, false in `pnpm build` — no manual flip needed.
export const USE_TEST_ADS: boolean = import.meta.env.DEV;

// ── Google-provided test ad unit IDs (safe to use during development) ─────────

const TEST_AD_UNITS = {
  banner:       "ca-app-pub-3940256099942544/6300978111",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded:     "ca-app-pub-3940256099942544/5224354917",
  appId:        "ca-app-pub-3940256099942544~3347511713",
} as const;

// ── Production ad unit IDs (used in release builds) ───────────────────────────

const PRODUCTION_AD_UNITS = {
  banner:       "ca-app-pub-1287355220585536/6841971059",
  interstitial: "ca-app-pub-1287355220585536/6504271151",
  rewarded:     "ca-app-pub-1287355220585536/3317659015",
  appId:        "ca-app-pub-1287355220585536~4125519824",
} as const;

// ── Safety check ──────────────────────────────────────────────────────────────
// If any production ID is still a placeholder, fall back to test ads and warn.
// This prevents a broken release build from serving empty/errored ad requests.

const PROD_IDS_READY =
  !PRODUCTION_AD_UNITS.banner.includes("REPLACE_ME") &&
  !PRODUCTION_AD_UNITS.interstitial.includes("REPLACE_ME") &&
  !PRODUCTION_AD_UNITS.rewarded.includes("REPLACE_ME");

if (!USE_TEST_ADS && !PROD_IDS_READY) {
  console.warn(
    "[AdMob] Production build detected but ad unit IDs are not configured. " +
    "Falling back to test ads. Fill in PRODUCTION_AD_UNITS in AdConfig.ts."
  );
}

export const AD_UNITS = USE_TEST_ADS || !PROD_IDS_READY
  ? TEST_AD_UNITS
  : PRODUCTION_AD_UNITS;

// ── AdMob initialization and per-request configuration ───────────────────────

export const AD_CONFIG = {
  banner: {
    adId: AD_UNITS.banner,
    adSize: "ADAPTIVE_BANNER" as const,
    position: "BOTTOM_CENTER" as const,
    margin: 0,
  },

  interstitial: {
    adId: AD_UNITS.interstitial,
  },

  rewarded: {
    adId: AD_UNITS.rewarded,
  },

  initialize: {
    requestTrackingAuthorization: true, // triggers iOS ATT prompt on first launch
    testingDevices: [] as string[],
    initializeForTesting: USE_TEST_ADS, // matches the build environment automatically
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  },
} as const;
