import { useState, useEffect, useRef } from "react";
import { analytics } from "../analytics/Analytics";
import { AdmobBridge } from "./AdmobBridge";

/*
 * InterstitialAd — full-screen ad shown at natural restart transitions
 *
 * On native (Capacitor): delegates to AdmobBridge → @capacitor-community/admob
 *   AdMob test unit ID: ca-app-pub-3940256099942544/1033173712
 *   Swap production ID: src/ads/AdConfig.ts → AD_UNITS.interstitial
 *
 * On web/browser: renders mock interstitial UI (max 5 s close button)
 *
 * Platform policy: close button MUST appear after ≤5 seconds.
 */

const COUNTDOWN_SECS = 5;

const MOCK_ADS = [
  {
    title: "Ocean Discovery App",
    body: "Identify thousands of fish, corals, and sea creatures using your camera.",
    cta: "Download Free",
    icon: "🐠",
    bg: "linear-gradient(160deg, #041828 0%, #062e4e 60%, #041828 100%)",
    ctaColor: "#2a9fbf",
  },
  {
    title: "Blue Planet Fund",
    body: "Join millions helping to protect the world's oceans for future generations.",
    cta: "Learn More",
    icon: "🌊",
    bg: "linear-gradient(160deg, #021e14 0%, #043e28 60%, #021e14 100%)",
    ctaColor: "#2abf7a",
  },
  {
    title: "Reef Guardian",
    body: "Adopt a coral reef. Track it in real time via satellite monitoring.",
    cta: "Adopt Now",
    icon: "🪸",
    bg: "linear-gradient(160deg, #0e0a20 0%, #1e1440 60%, #0e0a20 100%)",
    ctaColor: "#8a6abf",
  },
];

interface Props {
  onClose: () => void;
}

const FAILSAFE_MS = 12_000;

export default function InterstitialAd({ onClose }: Props) {
  const isNative = AdmobBridge.isNative();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [loaded, setLoaded] = useState(false);
  const [ad] = useState(() => MOCK_ADS[Math.floor(Math.random() * MOCK_ADS.length)]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closedRef = useRef(false);

  const safeClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  };

  // ── Native AdMob interstitial ────────────────────────────────────────────────
  useEffect(() => {
    if (!isNative) return;
    AdmobBridge.prepareInterstitial()
      .then((ready) => {
        if (!ready) { safeClose(); return; }
        AdmobBridge.showInterstitial(
          () => safeClose(),
          () => safeClose(),
        );
      })
      .catch(() => safeClose());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Web mock interstitial ────────────────────────────────────────────────────
  useEffect(() => {
    if (isNative) return;
    const loadT = setTimeout(() => setLoaded(true), 400);
    const failsafe = setTimeout(() => safeClose(), FAILSAFE_MS);
    return () => { clearTimeout(loadT); clearTimeout(failsafe); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isNative || !loaded) return;
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(intervalRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loaded, isNative]);

  // On native, the SDK renders the ad natively; render an invisible placeholder
  // while we wait for the dismiss callback to fire.
  if (isNative) {
    return (
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "'Segoe UI', sans-serif" }}>
          Loading ad…
        </div>
      </div>
    );
  }

  return (
    <div
      className="no-jump"
      style={{
        position: "absolute", inset: 0,
        zIndex: 200,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: loaded ? ad.bg : "rgba(0,0,0,0.9)",
        transition: "background 0.3s",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {!loaded ? (
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "'Segoe UI', sans-serif" }}>
          Loading ad…
        </div>
      ) : (
        <>
          <div style={{
            position: "absolute", top: 10, left: 12,
            fontSize: 9, color: "rgba(255,255,255,0.3)",
            fontFamily: "'Segoe UI', sans-serif", letterSpacing: "0.05em",
          }}>ADVERTISEMENT</div>

          <button
            onClick={safeClose}
            style={{
              position: "absolute", top: 10, right: 12,
              background: countdown === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: countdown === 0 ? "white" : "rgba(255,255,255,0.4)",
              borderRadius: 20, padding: "3px 10px",
              fontSize: 11, fontFamily: "'Segoe UI', sans-serif",
              cursor: countdown === 0 ? "pointer" : "default",
              transition: "all 0.3s",
              pointerEvents: countdown === 0 ? "auto" : "none",
            }}
          >
            {countdown > 0 ? `Skip in ${countdown}s` : "✕ Close"}
          </button>

          <div style={{ textAlign: "center", padding: "0 32px", maxWidth: 380 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{ad.icon}</div>
            <h2 style={{
              color: "white", margin: "0 0 10px",
              fontSize: 22, fontFamily: "'Segoe UI', sans-serif", fontWeight: 700,
            }}>{ad.title}</h2>
            <p style={{
              color: "rgba(200,220,255,0.7)", margin: "0 0 28px",
              fontSize: 14, fontFamily: "'Segoe UI', sans-serif", lineHeight: 1.6,
            }}>{ad.body}</p>
            <button
              onClick={() => analytics.track("interstitial_cta_click", { ad_title: ad.title })}
              style={{
                background: ad.ctaColor,
                border: "none", borderRadius: 24,
                color: "white", padding: "12px 36px",
                fontSize: 15, fontWeight: 700,
                fontFamily: "'Segoe UI', sans-serif",
                cursor: "pointer",
                boxShadow: `0 4px 20px ${ad.ctaColor}55`,
              }}>{ad.cta}</button>
          </div>

          <div style={{
            position: "absolute", bottom: 16,
            fontSize: 9, color: "rgba(255,255,255,0.2)",
            fontFamily: "'Segoe UI', sans-serif",
          }}>Ad · Close available after {COUNTDOWN_SECS}s</div>
        </>
      )}
    </div>
  );
}
