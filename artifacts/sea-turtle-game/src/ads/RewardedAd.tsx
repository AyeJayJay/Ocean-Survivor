import { useState, useEffect, useRef } from "react";
import { analytics } from "../analytics/Analytics";
import { AdmobBridge } from "./AdmobBridge";

/*
 * RewardedAd — rewarded video ad; grants a revive on full completion
 *
 * On native (Capacitor): delegates to AdmobBridge → @capacitor-community/admob
 *   AdMob test unit ID: ca-app-pub-3940256099942544/5224354917
 *   Swap production ID: src/ads/AdConfig.ts → AD_UNITS.rewarded
 *
 * On web/browser: renders mock rewarded video UI as fallback
 *
 * Platform policy: reward ONLY granted on full watch; skip does NOT reward.
 */

const VIDEO_DURATION = 15;
const SKIP_AFTER = 5;

const MOCK_ADS = [
  { title: "Ocean Discovery", body: "Track real sea turtles via satellite", icon: "🐢", bg: "linear-gradient(160deg,#021828 0%,#043a5e 60%,#021828 100%)", accent: "#2a9fbf" },
  { title: "Blue Planet Fund", body: "Help fund sea turtle rescue ops",    icon: "🌊", bg: "linear-gradient(160deg,#021e14 0%,#044030 60%,#021e14 100%)", accent: "#2abf7a" },
  { title: "Reef Guardian",   body: "Adopt a coral reef by satellite",     icon: "🪸", bg: "linear-gradient(160deg,#100820 0%,#201040 60%,#100820 100%)", accent: "#8a6abf" },
];

interface Props {
  onComplete: (rewarded: boolean) => void;
}

type Phase = "loading" | "preroll" | "watching" | "reward" | "failed";

export default function RewardedAd({ onComplete }: Props) {
  const isNative = AdmobBridge.isNative();
  const [phase, setPhase] = useState<Phase>("loading");
  const [elapsed, setElapsed] = useState(0);
  const [ad] = useState(() => MOCK_ADS[Math.floor(Math.random() * MOCK_ADS.length)]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const safeComplete = (rewarded: boolean) => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete(rewarded);
  };

  // ── Native AdMob rewarded ad ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isNative) return;
    AdmobBridge.prepareRewarded()
      .then((ready) => {
        if (!ready) { setPhase("failed"); return; }
        setPhase("preroll");
      })
      .catch(() => setPhase("failed"));
  }, [isNative]);

  // ── Web mock rewarded ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNative) return;
    const t = setTimeout(() => {
      if (Math.random() > 0.02) {
        setPhase("preroll");
      } else {
        setPhase("failed");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [isNative]);

  useEffect(() => {
    if (isNative || phase !== "watching") return;
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
  }, [phase, isNative]);

  const progress = Math.min(elapsed / VIDEO_DURATION, 1);
  const canSkip = elapsed >= SKIP_AFTER;
  const remaining = VIDEO_DURATION - elapsed;

  const overlayBase: React.CSSProperties = {
    position: "absolute", inset: 0, zIndex: 300,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: (phase === "loading" || phase === "preroll" || phase === "failed")
      ? "rgba(2,8,18,0.97)"
      : ad.bg,
    transition: "background 0.4s",
  };

  const handleStartNativeAd = () => {
    if (!isNative) return;
    analytics.track("rewarded_started");
    setPhase("watching");
    AdmobBridge.showRewarded(
      () => { analytics.track("rewarded_completed"); },
      (rewarded) => { safeComplete(rewarded); },
    );
  };

  return (
    <div
      className="no-jump"
      style={overlayBase}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── LOADING ── */}
      {phase === "loading" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "'Segoe UI', sans-serif" }}>
            Loading ad…
          </div>
        </div>
      )}

      {/* ── FAILED ── */}
      {phase === "failed" && (
        <div style={{ textAlign: "center", padding: "0 32px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>😔</div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "'Segoe UI', sans-serif", marginBottom: 20 }}>
            No ad available right now. Try again later.
          </p>
          <button
            onClick={() => safeComplete(false)}
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, color: "white", padding: "8px 24px", fontSize: 13, fontFamily: "'Segoe UI', sans-serif", cursor: "pointer" }}
          >Close</button>
        </div>
      )}

      {/* ── PRE-ROLL: show reward BEFORE video starts ── */}
      {phase === "preroll" && (
        <div style={{ textAlign: "center", padding: "0 28px", maxWidth: 360 }}>
          <div style={{ fontSize: 58, marginBottom: 10 }}>🐢</div>

          <h2 style={{
            color: "white", margin: "0 0 6px",
            fontSize: 20, fontWeight: 800,
            fontFamily: "'Segoe UI', sans-serif",
            letterSpacing: "-0.01em",
          }}>
            Second Chance Available!
          </h2>

          <p style={{
            color: "rgba(160,220,190,0.85)", margin: "0 0 20px",
            fontSize: 13, fontFamily: "'Segoe UI', sans-serif", lineHeight: 1.55,
          }}>
            Watch a short {isNative ? "" : "15-second "}ad and your turtle will<br />
            <strong style={{ color: "rgba(100,255,160,1)" }}>continue from exactly where it died.</strong>
          </p>

          <div style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(100,255,160,0.25)",
            borderRadius: 12, padding: "14px 20px",
            marginBottom: 22, textAlign: "left",
          }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'Segoe UI', sans-serif", letterSpacing: "0.08em", marginBottom: 8 }}>
              YOUR REWARD
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>❤️</span>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 14, fontFamily: "'Segoe UI', sans-serif" }}>
                  Extra Life
                </div>
                <div style={{ color: "rgba(180,220,200,0.7)", fontSize: 12, fontFamily: "'Segoe UI', sans-serif" }}>
                  Resume from your death position
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 12, paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.3)", fontSize: 10,
              fontFamily: "'Segoe UI', sans-serif",
            }}>
              One-time use per run · Reward granted only after full watch
            </div>
          </div>

          <button
            onClick={() => {
              if (isNative) {
                handleStartNativeAd();
              } else {
                analytics.track("rewarded_started");
                setPhase("watching");
              }
            }}
            style={{
              background: "linear-gradient(135deg,#1e7aff,#0d4aaa)",
              border: "none", borderRadius: 24,
              color: "white", padding: "13px 36px",
              fontSize: 15, fontWeight: 700,
              fontFamily: "'Segoe UI', sans-serif",
              cursor: "pointer", width: "100%",
              boxShadow: "0 4px 20px rgba(30,122,255,0.35)",
              marginBottom: 10,
            }}
          >
            📺 Watch Ad {isNative ? "" : "(15 sec)"}
          </button>

          <button
            onClick={() => { analytics.track("rewarded_declined"); safeComplete(false); }}
            style={{
              background: "none", border: "none",
              color: "rgba(255,255,255,0.3)", fontSize: 12,
              fontFamily: "'Segoe UI', sans-serif",
              cursor: "pointer", padding: "6px",
            }}
          >
            No thanks
          </button>
        </div>
      )}

      {/* ── WATCHING (web mock only; native SDK renders its own UI) ── */}
      {phase === "watching" && !isNative && (
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
                onClick={() => { analytics.track("rewarded_skipped", { elapsed_s: elapsed }); safeComplete(false); }}
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
              {remaining > 0 ? `${remaining}s remaining — keep watching to earn your extra life` : "Almost done!"}
            </div>
          </div>

          <div style={{
            position: "absolute", bottom: 16, textAlign: "center",
            fontSize: 9, color: "rgba(255,255,255,0.2)",
            fontFamily: "'Segoe UI', sans-serif",
          }}>
            Reward: Extra Life — resume from your death position 🐢
          </div>
        </>
      )}

      {/* ── REWARD GRANTED ── */}
      {phase === "reward" && (
        <div style={{ textAlign: "center", padding: "0 32px", maxWidth: 380 }}>
          <div style={{ fontSize: 64, marginBottom: 14 }}>🐢</div>
          <h2 style={{ color: "white", margin: "0 0 8px", fontSize: 22, fontFamily: "'Segoe UI', sans-serif", fontWeight: 700 }}>
            Extra Life Earned!
          </h2>
          <p style={{ color: "rgba(180,230,200,0.8)", margin: "0 0 24px", fontSize: 14, fontFamily: "'Segoe UI', sans-serif", lineHeight: 1.5 }}>
            Your turtle picks up right where it left off.<br />Keep swimming!
          </p>
          <button
            onClick={() => safeComplete(true)}
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
