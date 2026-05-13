/*
 * AdmobBridge — thin wrapper around @capacitor-community/admob
 *
 * Provides a safe API that:
 *   - On native (Android/iOS via Capacitor): calls real AdMob plugin methods
 *   - On web/browser: returns mock results so the UI fallback can take over
 *
 * All public methods are async and never throw — callers handle null/false
 * returns by rendering their own fallback UI.
 *
 * Personalization:
 *   Call initialize(personalized) with the user's consent choice.
 *   When personalized=false, all ad requests include npa:"1" so AdMob
 *   serves non-personalized ads and does not use the advertising identifier.
 */

import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type {
  BannerAdSize as _BannerAdSizeType,
  BannerAdPosition as _BannerAdPositionType,
} from "@capacitor-community/admob";
import { AD_CONFIG } from "./AdConfig";

// Enum string values, matching the plugin's BannerAdSize and BannerAdPosition enums.
// Using string literals avoids a static + dynamic import of the same module.
const BANNER_AD_SIZE_ADAPTIVE: _BannerAdSizeType = "ADAPTIVE_BANNER" as _BannerAdSizeType;
const BANNER_AD_POSITION_BOTTOM: _BannerAdPositionType = "BOTTOM_CENTER" as _BannerAdPositionType;

type AdmobModule = typeof import("@capacitor-community/admob");

let admobModule: AdmobModule | null = null;
let initialized = false;

// Whether the user consented to personalized ads.
// false → npa:"1" is sent with every ad request (non-personalized mode).
let isPersonalized = true;

async function loadModule(): Promise<AdmobModule | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!admobModule) {
    admobModule = await import("@capacitor-community/admob");
  }
  return admobModule;
}

async function getAdmob() {
  const mod = await loadModule();
  return mod ? mod.AdMob : null;
}

// NPA extras: included in every ad request when user chose non-personalized ads.
function npaExtras(): Record<string, string> {
  return isPersonalized ? {} : { npa: "1" };
}

// Tracks active listeners so we can remove them after use.
const activeListeners: PluginListenerHandle[] = [];

async function addAndTrack<T extends PluginListenerHandle>(
  listenerPromise: Promise<T>
): Promise<void> {
  const handle = await listenerPromise;
  activeListeners.push(handle);
}

async function clearListeners(): Promise<void> {
  for (const h of activeListeners) {
    try { await h.remove(); } catch { /* ignore */ }
  }
  activeListeners.length = 0;
}

export const AdmobBridge = {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Initialize AdMob. Must be called once after the user makes their
   * consent choice. personalized=true means the user accepted targeted ads;
   * personalized=false means non-personalized mode (npa:"1" on every request).
   */
  async initialize(personalized = true): Promise<void> {
    if (initialized) {
      // Allow updating personalization state even after init
      isPersonalized = personalized;
      return;
    }
    isPersonalized = personalized;
    const admob = await getAdmob();
    if (!admob) return;
    try {
      await admob.initialize(AD_CONFIG.initialize);
      initialized = true;
    } catch (e) {
      console.warn("[AdMob] initialize failed:", e);
    }
  },

  async showBanner(): Promise<boolean> {
    const admob = await getAdmob();
    if (!admob) return false;
    try {
      // extras is a valid runtime field for NPA; cast because plugin types lag
      await admob.showBanner({
        adId: AD_CONFIG.banner.adId,
        adSize: BANNER_AD_SIZE_ADAPTIVE,
        position: BANNER_AD_POSITION_BOTTOM,
        margin: 0,
        ...npaExtras(),
      } as Parameters<typeof admob.showBanner>[0]);
      return true;
    } catch (e) {
      console.warn("[AdMob] showBanner failed:", e);
      return false;
    }
  },

  async hideBanner(): Promise<void> {
    const admob = await getAdmob();
    if (!admob) return;
    try { await admob.hideBanner(); } catch (e) {
      console.warn("[AdMob] hideBanner failed:", e);
    }
  },

  async removeBanner(): Promise<void> {
    const admob = await getAdmob();
    if (!admob) return;
    try { await admob.removeBanner(); } catch (e) {
      console.warn("[AdMob] removeBanner failed:", e);
    }
  },

  async prepareInterstitial(): Promise<boolean> {
    const admob = await getAdmob();
    if (!admob) return false;
    try {
      await admob.prepareInterstitial({
        adId: AD_CONFIG.interstitial.adId,
        ...npaExtras(),
      } as Parameters<typeof admob.prepareInterstitial>[0]);
      return true;
    } catch (e) {
      console.warn("[AdMob] prepareInterstitial failed:", e);
      return false;
    }
  },

  async showInterstitial(onDismiss: () => void, onFail: () => void): Promise<void> {
    const mod = await loadModule();
    const admob = mod?.AdMob;
    if (!admob || !mod) { onFail(); return; }

    const { InterstitialAdPluginEvents } = mod;
    try {
      await clearListeners();
      await addAndTrack(
        admob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          clearListeners();
          onDismiss();
        })
      );
      await addAndTrack(
        admob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
          clearListeners();
          onFail();
        })
      );
      await admob.showInterstitial();
    } catch (e) {
      console.warn("[AdMob] showInterstitial failed:", e);
      await clearListeners();
      onFail();
    }
  },

  async prepareRewarded(): Promise<boolean> {
    const admob = await getAdmob();
    if (!admob) return false;
    try {
      await admob.prepareRewardVideoAd({
        adId: AD_CONFIG.rewarded.adId,
        ...npaExtras(),
      } as Parameters<typeof admob.prepareRewardVideoAd>[0]);
      return true;
    } catch (e) {
      console.warn("[AdMob] prepareRewarded failed:", e);
      return false;
    }
  },

  async showRewarded(onReward: () => void, onDismiss: (rewarded: boolean) => void): Promise<void> {
    const mod = await loadModule();
    const admob = mod?.AdMob;
    if (!admob || !mod) { onDismiss(false); return; }

    const { RewardAdPluginEvents } = mod;
    let rewarded = false;
    try {
      await clearListeners();
      await addAndTrack(
        admob.addListener(RewardAdPluginEvents.Rewarded, () => {
          rewarded = true;
          onReward();
        })
      );
      await addAndTrack(
        admob.addListener(RewardAdPluginEvents.Dismissed, () => {
          clearListeners();
          onDismiss(rewarded);
        })
      );
      await addAndTrack(
        admob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
          clearListeners();
          onDismiss(false);
        })
      );
      await addAndTrack(
        admob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          clearListeners();
          onDismiss(false);
        })
      );
      await admob.showRewardVideoAd();
    } catch (e) {
      console.warn("[AdMob] showRewarded failed:", e);
      await clearListeners();
      onDismiss(false);
    }
  },
};
