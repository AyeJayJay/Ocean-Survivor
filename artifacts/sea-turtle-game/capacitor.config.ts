import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.oceansurvivor.app",
  appName: "Ocean Survivor",
  webDir: "dist/public",

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#010c1a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    StatusBar: {
      style: "Dark",
      backgroundColor: "#010c1a",
      overlaysWebView: true,
    },

    // AdMob — initializeForTesting is controlled by USE_TEST_ADS in AdConfig.ts
    // Do not add initializeForTesting here; it would override the runtime flag.
  },

  android: {
    backgroundColor: "#010c1a",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    loggingBehavior: "none",
    overScrollBehavior: "none",
  },

  ios: {
    backgroundColor: "#010c1a",
    contentInset: "always",
    allowsLinkPreview: false,
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: true,
  },

  server: {
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
