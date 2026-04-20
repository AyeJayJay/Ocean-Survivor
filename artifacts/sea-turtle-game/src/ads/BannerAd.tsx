import { useState, useEffect, useRef, useCallback } from "react";

/*
 * BannerAd — adaptive banner (50px menu / 32px gameplay)
 *
 * Features:
 *  - Asynchronous load with shimmer placeholder
 *  - Auto-refreshes every 30 s while visible
 *  - Smooth opacity transition on show/hide (never abruptly pops)
 *  - `compact` prop for a slimmer in-game strip
 *  - Graceful failure handling (hidden, no layout impact)
 *
 * To swap in a real network:
 *   AdMob:   Replace loadAd() body with window.admob.requestBanner(adUnitId)
 *   AdSense: Render <ins class="adsbygoogle"> with the real data-ad-* attrs
 *   Unity:   Call UnityAds.load("banner", listener) and show on ready
 */

const REFRESH_INTERVAL_MS = 30_000;

const MOCK_ADS = [
  { headline: "Ocean Discovery",  sub: "Explore 10,000+ marine species",    bg: "#0d2a3e", accent: "#2a8fbf", icon: "🐠" },
  { headline: "Blue Planet Fund", sub: "Protecting oceans worldwide",         bg: "#0a2e1e", accent: "#2abf7a", icon: "🌊" },
  { headline: "Reef Guardian",    sub: "Adopt a coral reef today",            bg: "#1a1e40", accent: "#6a7abf", icon: "🪸" },
  { headline: "Sea Life App",     sub: "ID any fish or sea creature",         bg: "#1e1a0e", accent: "#bfa040", icon: "🐡" },
  { headline: "Dive World",       sub: "Virtual reef tours in 360°",          bg: "#0e1a30", accent: "#4a90bf", icon: "🤿" },
];

type Status = "loading" | "ready" | "failed";

interface Props {
  visible: boolean;
  position?: "top" | "bottom";
  offset?: number;
  compact?: boolean;
  /** When false the banner is visible for impressions but never tappable.
   *  Use during active gameplay to prevent accidental clicks. */
  interactive?: boolean;
}

export default function BannerAd({
  visible,
  position = "bottom",
  offset = 4,
  compact = false,
  interactive = true,
}: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [ad, setAd] = useState(MOCK_ADS[0]);
  const [everLoaded, setEverLoaded] = useState(false);
  const mountedRef = useRef(true);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadAd = useCallback(() => {
    setStatus("loading");
    const delay = 600 + Math.random() * 500;
    setTimeout(() => {
      if (!mountedRef.current) return;
      if (Math.random() < 0.95) {
        setAd(MOCK_ADS[Math.floor(Math.random() * MOCK_ADS.length)]);
        setStatus("ready");
        setEverLoaded(true);
      } else {
        setStatus("failed");
      }
    }, delay);
  }, []);

  useEffect(() => {
    if (!visible) {
      if (refreshRef.current) { clearInterval(refreshRef.current); refreshRef.current = null; }
      return;
    }
    loadAd();
    refreshRef.current = setInterval(loadAd, REFRESH_INTERVAL_MS);
    return () => { if (refreshRef.current) { clearInterval(refreshRef.current); refreshRef.current = null; } };
  }, [visible, loadAd]);

  const height = compact ? 32 : 50;
  const iconSize = compact ? 22 : 34;
  const posStyle = position === "top" ? { top: offset } : { bottom: offset };

  // Keep in DOM for smooth fade-out; remove only on permanent failure
  if (status === "failed" && !everLoaded) return null;

  const shown = visible && status === "ready";

  return (
    <div
      className="no-jump"
      style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        width: 320,
        height,
        borderRadius: compact ? 4 : 6,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
        pointerEvents: shown && interactive ? "auto" : "none",
        opacity: shown ? (compact ? 0.88 : 1) : 0,
        transition: "opacity 0.5s ease",
        ...posStyle,
      }}
    >
      {status === "loading" ? (
        <div style={{
          width: "100%", height: "100%",
          background: "rgba(15,18,28,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 72, height: 6, borderRadius: 3,
            background: "rgba(255,255,255,0.07)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: "40%",
              background: "rgba(255,255,255,0.18)",
              borderRadius: 3,
              animation: "adShimmer 1.4s ease-in-out infinite",
            }} />
          </div>
        </div>
      ) : (
        <div style={{
          width: "100%", height: "100%",
          background: ad.bg,
          display: "flex", alignItems: "center",
          padding: compact ? "0 8px" : "0 10px",
          gap: compact ? 6 : 8,
          cursor: "pointer",
          boxSizing: "border-box",
        }}>
          <div style={{
            width: iconSize, height: iconSize,
            borderRadius: compact ? 5 : 8,
            background: ad.accent,
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: compact ? 12 : 16,
          }}>{ad.icon}</div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{
              color: "white",
              fontSize: compact ? 10 : 12,
              fontWeight: 700,
              fontFamily: "'Segoe UI', sans-serif",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{ad.headline}</div>
            {!compact && (
              <div style={{
                color: "rgba(200,220,255,0.65)",
                fontSize: 10,
                fontFamily: "'Segoe UI', sans-serif",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{ad.sub}</div>
            )}
          </div>

          <div style={{
            background: ad.accent, borderRadius: 4,
            color: "white",
            fontSize: compact ? 8 : 9,
            fontWeight: 700,
            fontFamily: "'Segoe UI', sans-serif",
            padding: compact ? "2px 5px" : "3px 6px",
            flexShrink: 0,
          }}>MORE</div>

          <div style={{
            position: "absolute", top: 2, right: 4,
            fontSize: 7, color: "rgba(255,255,255,0.28)",
            fontFamily: "'Segoe UI', sans-serif",
          }}>Ad</div>
        </div>
      )}
    </div>
  );
}
