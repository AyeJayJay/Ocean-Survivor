/*
 * LoadingScreen — shown while Phaser boots and web fonts load.
 *
 * Fades in immediately on mount, fades out when onReady() is called.
 * Uses CSS animations only (no Phaser dependency).
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  onReady?: () => void; // called after fade-out completes
}

export default function LoadingScreen({ onReady }: Props) {
  const [fadingOut, setFadingOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const dotsRef = useRef(0);
  const [dotStr, setDotStr] = useState(".");

  // Animate dots
  useEffect(() => {
    const iv = setInterval(() => {
      dotsRef.current = (dotsRef.current + 1) % 4;
      setDotStr(".".repeat(dotsRef.current + 1));
    }, 420);
    return () => clearInterval(iv);
  }, []);

  // External trigger: call the returned dismiss function
  useEffect(() => {
    // Expose dismiss on window so App.tsx can call it
    (window as unknown as Record<string, unknown>).__dismissLoadingScreen = () => {
      setFadingOut(true);
      setTimeout(() => {
        setVisible(false);
        onReady?.();
      }, 520);
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__dismissLoadingScreen;
    };
  }, [onReady]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes os-wave {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes os-bob {
          0%, 100% { transform: translateY(0px) rotate(-4deg); }
          50%       { transform: translateY(-14px) rotate(4deg); }
        }
        @keyframes os-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes os-bubble {
          0%   { transform: translateY(0) scale(1);   opacity: 0.6; }
          100% { transform: translateY(-120px) scale(0.4); opacity: 0; }
        }
        @keyframes os-shimmer {
          0%, 100% { color: #00e8ff; }
          50%       { color: #80ffe8; }
        }
      `}</style>

      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg, #010609 0%, #041828 60%, #062040 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: fadingOut ? 0 : 1,
        transition: fadingOut ? "opacity 0.5s ease-out" : undefined,
        animation: fadingOut ? undefined : "os-fadein 0.4s ease-out",
      }}>

        {/* Floating bubbles */}
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            bottom: `${10 + (i * 11) % 40}%`,
            left: `${8 + (i * 13) % 84}%`,
            width: `${5 + (i % 4) * 3}px`,
            height: `${5 + (i % 4) * 3}px`,
            borderRadius: "50%",
            border: "1.5px solid rgba(0,200,255,0.4)",
            animation: `os-bubble ${2.2 + i * 0.4}s ease-in infinite`,
            animationDelay: `${i * 0.35}s`,
          }} />
        ))}

        {/* Turtle */}
        <div style={{
          fontSize: 72,
          animation: "os-bob 1.8s ease-in-out infinite",
          marginBottom: 24,
          filter: "drop-shadow(0 0 18px rgba(0,200,255,0.5))",
        }}>
          🐢
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Bangers', 'Arial Black', Impact, sans-serif",
          fontSize: 48,
          letterSpacing: "0.08em",
          animation: "os-shimmer 2.5s ease-in-out infinite",
          marginBottom: 6,
          textShadow: "0 0 30px rgba(0,200,255,0.5), 0 2px 8px rgba(0,0,0,0.8)",
        }}>
          OCEAN SURVIVOR
        </div>

        {/* Loading text */}
        <div style={{
          fontFamily: "'Nunito', Arial, sans-serif",
          fontSize: 14,
          color: "rgba(120,180,220,0.65)",
          letterSpacing: "0.15em",
          marginTop: 12,
          minWidth: 110,
          textAlign: "center",
        }}>
          LOADING{dotStr}
        </div>

        {/* Ocean wave at bottom */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 90,
          overflow: "hidden",
          pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute",
            bottom: 0,
            width: "200%",
            height: 90,
            animation: "os-wave 4s linear infinite",
          }}>
            <svg viewBox="0 0 1440 90" style={{ width: "100%", height: 90 }} preserveAspectRatio="none">
              <path
                d="M0,45 C180,10 360,80 540,45 C720,10 900,80 1080,45 C1260,10 1440,80 1440,45 L1440,90 L0,90 Z"
                fill="rgba(0,80,140,0.35)"
              />
              <path
                d="M0,55 C160,20 320,85 480,55 C640,20 800,85 960,55 C1120,20 1280,85 1440,55 L1440,90 L0,90 Z"
                fill="rgba(0,50,100,0.5)"
              />
            </svg>
          </div>
        </div>

        {/* Environmental tagline */}
        <div style={{
          position: "absolute",
          bottom: 30,
          fontFamily: "'Nunito', Arial, sans-serif",
          fontSize: 11,
          color: "rgba(100,160,200,0.5)",
          letterSpacing: "0.1em",
        }}>
          Help the turtle clean up the ocean 🌊
        </div>
      </div>
    </>
  );
}
