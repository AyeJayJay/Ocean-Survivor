/*
 * AdConfig — Centralized ad unit ID configuration for Ocean Survivor
 *
 * HOW TO SWAP TEST IDs FOR PRODUCTION:
 * ─────────────────────────────────────
 * 1. Create your AdMob account at https://admob.google.com
 * 2. Add your app and create three ad units: Banner, Interstitial, Rewarded
 * 3. Copy the ad unit IDs (format: ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN)
 * 4. Replace the values in PRODUCTION_AD_UNITS below
 * 5. Set USE_TEST_ADS = false before building for production
 *
 * IMPORTANT: Never submit to app stores with USE_TEST_ADS = true.
 * IMPORTANT: The AdMob App IDs also need to be set in native config files:
 *   Android: artifacts/sea-turtle-game/android/app/src/main/AndroidManifest.xml
 *            → <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" ...>
 *   iOS:     artifacts/sea-turtle-game/ios/App/App/Info.plist
 *            → GADApplicationIdentifier key
 */

export const USE_TEST_ADS = true;

const TEST_AD_UNITS = {
  banner:       "ca-app-pub-3940256099942544/6300978111",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded:     "ca-app-pub-3940256099942544/5224354917",
  appId:        "ca-app-pub-3940256099942544~3347511713",
} as const;

const PRODUCTION_AD_UNITS = {
  // ── Ad unit IDs ────────────────────────────────────────────────────────────
  // Create these in the AdMob console → Apps → Ocean Survivor → Ad units
  // One unit each of type: Banner, Interstitial, Rewarded Video
  banner:       "ca-app-pub-REPLACE_ME/REPLACE_ME_BANNER",
  interstitial: "ca-app-pub-REPLACE_ME/REPLACE_ME_INTERSTITIAL",
  rewarded:     "ca-app-pub-REPLACE_ME/REPLACE_ME_REWARDED",
  // ── App ID (set) ───────────────────────────────────────────────────────────
  appId:        "ca-app-pub-1287355220585536~4125519824",
} as const;

export const AD_UNITS = USE_TEST_ADS ? TEST_AD_UNITS : PRODUCTION_AD_UNITS;

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
    requestTrackingAuthorization: true,
    testingDevices: [] as string[],
    initializeForTesting: USE_TEST_ADS,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  },
} as const;
