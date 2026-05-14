/*
 * TutorialOverlay — first-run onboarding shown on the main menu.
 *
 * Three steps walk the player through the core mechanics.
 * Tapping anywhere or pressing the button advances steps.
 * Dismissed state is persisted to SaveManager so it only shows once.
 */

import { useState, useEffect } from "react";
import { saveManager } from "../save/SaveManager";

interface Props {
  onDone: () => void;
}

interface Step {
  icon: string;
  title: string;
  body: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    icon: "🐢",
    title: "Tap to Swim",
    body: "Tap the screen (or press Space) to make your turtle swim upward. Release and gravity pulls you down.",
    accent: "#00e8ff",
  },
  {
    icon: "☠️",
    title: "Avoid Pollution",
    body: "8 types of ocean pollution block your path — plastic bags, fishing nets, oil blobs, sharks, and more. One touch and it's over.",
    accent: "#ff6060",
  },
  {
    icon: "🐚",
    title: "Collect Shells",
    body: "Golden shells unlock new turtle skins and count toward your lifetime score. Every shell cleaned up helps the ocean!",
    accent: "#ffd84a",
  },
];

export default function TutorialOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 50);
    return () => clearTimeout(t);
  }, []);

  function advance() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  }

  function finish() {
    setExiting(true);
    saveManager.setTutorialSeen();
    setTimeout(onDone, 380);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      <style>{`
        @keyframes tut-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        @keyframes tut-slide-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        onClick={advance}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 400,
          background: "rgba(1,6,9,0.88)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 28px",
          opacity: exiting ? 0 : entering ? 0 : 1,
          transition: exiting ? "opacity 0.35s ease-out" : "opacity 0.3s ease-in",
          cursor: "pointer",
        }}
      >
        {/* Card */}
        <div
          key={step}
          onClick={e => e.stopPropagation()}
          style={{
            background: "linear-gradient(160deg, rgba(4,24,40,0.98), rgba(2,12,28,0.98))",
            border: `1.5px solid ${current.accent}40`,
            borderRadius: 20,
            padding: "32px 28px 24px",
            maxWidth: 340,
            width: "100%",
            boxShadow: `0 0 40px ${current.accent}20, 0 8px 32px rgba(0,0,0,0.6)`,
            animation: "tut-slide-in 0.28s ease-out",
            textAlign: "center",
          }}
        >
          {/* Step counter */}
          <div style={{
            fontFamily: "'Nunito', Arial, sans-serif",
            fontSize: 10,
            color: `${current.accent}99`,
            letterSpacing: "0.2em",
            marginBottom: 16,
          }}>
            STEP {step + 1} OF {STEPS.length}
          </div>

          {/* Icon */}
          <div style={{
            fontSize: 60,
            marginBottom: 18,
            animation: "tut-pulse 2s ease-in-out infinite",
            filter: `drop-shadow(0 0 12px ${current.accent}60)`,
          }}>
            {current.icon}
          </div>

          {/* Title */}
          <div style={{
            fontFamily: "'Bangers', 'Arial Black', Impact, sans-serif",
            fontSize: 32,
            color: current.accent,
            letterSpacing: "0.05em",
            marginBottom: 12,
            textShadow: `0 0 20px ${current.accent}50`,
          }}>
            {current.title}
          </div>

          {/* Body */}
          <div style={{
            fontFamily: "'Nunito', Arial, sans-serif",
            fontSize: 14,
            color: "rgba(180,220,255,0.82)",
            lineHeight: 1.6,
            marginBottom: 28,
          }}>
            {current.body}
          </div>

          {/* Progress dots */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 20,
          }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 20 : 7,
                height: 7,
                borderRadius: 4,
                background: i === step ? current.accent : "rgba(255,255,255,0.2)",
                transition: "all 0.25s ease",
              }} />
            ))}
          </div>

          {/* CTA button */}
          <button
            onClick={advance}
            style={{
              width: "100%",
              padding: "13px 0",
              background: isLast
                ? `linear-gradient(135deg, #0e6e30, #1a9040)`
                : `linear-gradient(135deg, rgba(0,60,100,0.8), rgba(0,40,70,0.8))`,
              border: `1.5px solid ${isLast ? "#00c060" : current.accent}50`,
              borderRadius: 12,
              color: isLast ? "#ffffff" : current.accent,
              fontFamily: "'Bangers', 'Arial Black', Impact, sans-serif",
              fontSize: 18,
              letterSpacing: "0.08em",
              cursor: "pointer",
              boxShadow: isLast ? "0 4px 20px rgba(0,180,80,0.3)" : "none",
            }}
          >
            {isLast ? "🌊  LET'S SAVE THE OCEAN!" : "GOT IT  →"}
          </button>
        </div>

        {/* Skip hint */}
        {!isLast && (
          <div
            onClick={finish}
            style={{
              marginTop: 16,
              fontFamily: "'Nunito', Arial, sans-serif",
              fontSize: 12,
              color: "rgba(100,150,180,0.5)",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            skip tutorial
          </div>
        )}
      </div>
    </>
  );
}
