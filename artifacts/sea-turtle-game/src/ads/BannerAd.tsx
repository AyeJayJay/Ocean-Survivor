import { useState, useEffect } from "react";

/*
 * BannerAd — 320×50 mobile banner
 *
 * To integrate a real network, replace the simulated load inside useEffect with:
 *   AdMob:    window.admob.createBanner({ adId: "ca-app-pub-xxx/yyy", position: "bottom" })
 *   AdSense:  render <ins class="adsbygoogle"> with data-ad-slot
 *   Unity:    UnityAds.initialize(gameId); UnityAds.load("banner", ...)
 */

const MOCK_ADS = [
  { headline: "Ocean Discovery", sub: "Explore 10,000+ marine species", bg: "#0d2a3e", accent: "#2a8fbf" },
  { headline: "Blue Planet Fund", sub: "Protecting oceans worldwide", bg: "#0a2e1e", accent: "#2abf7a" },
  { headline: "Reef Guardian", sub: "Adopt a coral reef today", bg: "#1a1e40", accent: "#6a7abf" },
  { headline: "Sea Life App", sub: "ID any fish or sea creature", bg: "#1e1a0e", accent: "#bfa040" },
];

type Status = "loading" | "ready" | "failed";

interface Props {
  visible: boolean;
  bottom?: number;
}

export default function BannerAd({ visible, bottom = 4 }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [ad, setAd] = useState(MOCK_ADS[0]);

  useEffect(() => {
    if (!visible) { setStatus("loading"); return; }

    setStatus("loading");
    const delay = 700 + Math.random() * 500;
    const t = setTimeout(() => {
      const fillRate = 0.95;
      if (Math.random() < fillRate) {
        setAd(MOCK_ADS[Math.floor(Math.random() * MOCK_ADS.length)]);
        setStatus("ready");
      } else {
        setStatus("failed");
      }
    }, delay);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible || status === "failed") return null;

  return (
    <div style={{
      position: "absolute",
      bottom,
      left: "50%",
      transform: "translateX(-50%)",
      width: 320,
      height: 50,
      borderRadius: 6,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
      pointerEvents: status === "ready" ? "auto" : "none",
    }}>
      {status === "loading" ? (
        <div style={{
          width: "100%", height: "100%",
          background: "rgba(20,20,30,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 80, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: "50%",
              background: "rgba(255,255,255,0.15)",
              animation: "shimmer 1.2s ease-in-out infinite",
            }} />
          </div>
        </div>
      ) : (
        <div style={{
          width: "100%", height: "100%",
          background: ad.bg,
          display: "flex", alignItems: "center",
          padding: "0 10px",
          gap: 8,
          cursor: "pointer",
          boxSizing: "border-box",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: ad.accent,
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>🌊</div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{
              color: "white", fontSize: 12, fontWeight: 700,
              fontFamily: "'Segoe UI', sans-serif",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{ad.headline}</div>
            <div style={{
              color: "rgba(200,220,255,0.65)", fontSize: 10,
              fontFamily: "'Segoe UI', sans-serif",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{ad.sub}</div>
          </div>
          <div style={{
            background: ad.accent, borderRadius: 4,
            color: "white", fontSize: 9, fontWeight: 700,
            fontFamily: "'Segoe UI', sans-serif",
            padding: "3px 6px", flexShrink: 0,
          }}>LEARN MORE</div>
          <div style={{
            position: "absolute", top: 2, right: 4,
            fontSize: 8, color: "rgba(255,255,255,0.3)",
            fontFamily: "'Segoe UI', sans-serif",
          }}>Ad</div>
        </div>
      )}
    </div>
  );
}
