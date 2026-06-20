import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.oceansurvivor.app",
  appName: "Ocean Survivor",
  webDir: "dist/public",

  plugins: {
    StatusBar: {
      style: "DARK",  // must be uppercase: "DARK" | "LIGHT" | "DEFAULT"
      backgroundColor: "#010c1a",
      overlaysWebView: false,  // false = status bar above content, not over it
    },

    // AdMob — initializeForTesting is controlled by USE_TEST_ADS in AdConfig.ts.
    // Do not add initializeForTesting here; it would override the build-env flag.
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
    // Required: lets Web Audio API (SoundManager) play without demanding a
    // fresh user gesture on every app resume inside WKWebView.
    allowsInlineMediaPlayback: true,
    limitsNavigationsToAppBoundDomains: true,
  },

  server: {
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
