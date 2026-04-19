import { useState, useEffect, useRef } from "react";

/*
 * RewardedAd — rewarded video ad; grants a revive on full completion
 *
 * To integrate a real network, replace the simulated video with:
 *   AdMob:  window.admob.showRewarded({ onRewarded, onFailed })
 *   Unity:  UnityAds.show("rewarded", { onComplete: () => grantReward() })
 *   IronSource: IronSource.showRewardedVideo(placementName)
 *
 * Platform policy: reward ONLY granted on full watch; skip does NOT reward.
 */

const VIDEO_DURATION = 15;
const SKIP_AFTER = 5;

const MOCK_ADS = [
  { title: "Ocean Discovery", body: "Track real sea turtles via satellite", icon: "🐢", bg: "linear-gradient(160deg,#021828 0%,#043a5e 60%,#021828 100%)", accent: "#2a9fbf" },
  { title: "Blue Planet Fund", body: "Help fund sea turtle rescue ops", icon: "🌊", bg: "linear-gradient(160deg,#021e14 0%,#044030 60%,#021e14 100%)", accent: "#2abf7a" },
  { title: "Reef Guardian",   body: "Adopt a coral reef by satellite",   icon: "🪸", bg: "linear-gradient(160deg,#100820 0%,#201040 60%,#100820 100%)", accent: "#8a6abf" },
];

interface Props {
  onComplete: (rewarded: boolean) => void;
}

type Phase = "loading" | "watching" | "reward" | "failed";

export default function RewardedAd({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [elapsed, setElapsed] = useState(0);
  const [ad] = useState(() => MOCK_ADS[Math.floor(Math.random() * MOCK_ADS.length)]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (Math.random() > 0.02) {
        setPhase("watching");
      } else {
        setPhase("failed");
      }
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "watching") return;
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= VIDEO_DURATION) {
          clearInterval(intervalRef.current!);
          setPhase("reward");
        }
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  const progress = Math.min(elapsed / VIDEO_DURATION, 1);
  const canSkip = elapsed >= SKIP_AFTER;
  const remaining = VIDEO_DURATION - elapsed;

  return (
    <div
      className="no-jump"
      style={{
        position: "absolute", inset: 0, zIndex: 300,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: phase === "loading" ? "rgba(0,0,0,0.95)" : ad.bg,
        transition: "background 0.4s",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {phase === "loading" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "'Segoe UI', sans-serif" }}>
            Loading rewarded ad…
          </div>
        </div>
      )}

      {phase === "failed" && (
        <div style={{ textAlign: "center", padding: "0 32px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>😔</div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "'Segoe UI', sans-serif", marginBottom: 20 }}>
            No ad available right now. Try again later.
          </p>
          <button
            onClick={() => onComplete(false)}
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, color: "white", padding: "8px 24px", fontSize: 13, fontFamily: "'Segoe UI', sans-serif", cursor: "pointer" }}
          >Close</button>
        </div>
      )}

      {phase === "watching" && (
        <>
          <div style={{
            position: "absolute", top: 10, left: 12,
            fontSize: 9, color: "rgba(255,255,255,0.3)",
            fontFamily: "'Segoe UI', sans-serif", letterSpacing: "0.05em",
          }}>REWARDED AD</div>

          <div style={{
            position: "absolute", top: 10, right: 12,
            fontSize: 11, color: "rgba(255,255,255,0.4)",
            fontFamily: "'Segoe UI', sans-serif",
          }}>
            {canSkip ? (
              <button
                onClick={() => onComplete(false)}
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, color: "rgba(255,255,255,0.7)", padding: "3px 10px", fontSize: 11, fontFamily: "'Segoe UI', sans-serif", cursor: "pointer" }}
              >Skip (no reward)</button>
            ) : (
              <span>Skip in {SKIP_AFTER - elapsed}s</span>
            )}
          </div>

          <div style={{ textAlign: "center", padding: "0 32px", maxWidth: 380 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>{ad.icon}</div>
            <h3 style={{ color: "white", margin: "0 0 8px", fontSize: 18, fontFamily: "'Segoe UI', sans-serif", fontWeight: 700 }}>
              {ad.title}
            </h3>
            <p style={{ color: "rgba(200,220,255,0.65)", margin: "0 0 24px", fontSize: 13, fontFamily: "'Segoe UI', sans-serif", lineHeight: 1.5 }}>
              {ad.body}
            </p>

            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, height: 6, width: "100%", maxWidth: 280, margin: "0 auto 10px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: ad.accent, borderRadius: 6, transition: "width 0.9s linear" }} />
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "'Segoe UI', sans-serif" }}>
              {remaining > 0 ? `Watch ${remaining}s more to earn your reward` : "Almost done!"}
            </div>
          </div>

          <div style={{
            position: "absolute", bottom: 16, textAlign: "center",
            fontSize: 9, color: "rgba(255,255,255,0.2)",
            fontFamily: "'Segoe UI', sans-serif",
          }}>
            Watch the full ad to earn your second chance 🐢
          </div>
        </>
      )}

      {phase === "reward" && (
        <div style={{ textAlign: "center", padding: "0 32px", maxWidth: 380 }}>
          <div style={{ fontSize: 64, marginBottom: 14 }}>🐢</div>
          <h2 style={{ color: "white", margin: "0 0 8px", fontSize: 22, fontFamily: "'Segoe UI', sans-serif", fontWeight: 700 }}>
            Second Chance!
          </h2>
          <p style={{ color: "rgba(180,230,200,0.8)", margin: "0 0 24px", fontSize: 14, fontFamily: "'Segoe UI', sans-serif", lineHeight: 1.5 }}>
            Your turtle lives on — keep swimming!
          </p>
          <button
            onClick={() => onComplete(true)}
            style={{
              background: "linear-gradient(135deg,#4dc47a,#2d8a4e)",
              border: "none", borderRadius: 24,
              color: "white", padding: "14px 40px",
              fontSize: 16, fontWeight: 700,
              fontFamily: "'Segoe UI', sans-serif",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(77,196,122,0.4)",
            }}
          >Continue Swimming →</button>
        </div>
      )}
    </div>
  );
}
