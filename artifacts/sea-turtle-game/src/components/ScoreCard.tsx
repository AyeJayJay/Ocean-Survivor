import { useCallback } from "react";

export interface ScoreCardData {
  score: number;
  bestScore: number;
  shellsCollected: number;
  newRecord: boolean;
}

interface Props {
  data: ScoreCardData;
  onClose: () => void;
}

function shareScore(score: number): void {
  const text =
    `🐢 I scored ${score} in Ocean Survivor!\n` +
    `Help the baby sea turtle dodge pollution and clean the ocean.\n` +
    `Can you beat my score?`;

  if (navigator.share) {
    navigator.share({ title: "Ocean Survivor", text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).catch(() => {});
  }
}

export default function ScoreCard({ data, onClose }: Props) {
  const { score, bestScore, shellsCollected, newRecord } = data;

  const handleShare = useCallback(() => {
    shareScore(score);
  }, [score]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,5,15,0.82)",
        backdropFilter: "blur(6px)",
        animation: "score-card-bg-in 0.25s ease-out",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes score-card-bg-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes score-card-in {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>

      {/* Card — stop click propagation so clicking card itself doesn't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 320,
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "0 12px 60px rgba(0,180,255,0.3), 0 4px 24px rgba(0,0,0,0.8)",
          animation: "score-card-in 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          fontFamily: "Arial Black, Impact, sans-serif",
        }}
      >
        {/* Header gradient */}
        <div style={{
          background: "linear-gradient(160deg, #041a35 0%, #062848 50%, #031520 100%)",
          borderBottom: "1.5px solid rgba(0,160,220,0.35)",
          padding: "22px 0 18px",
          textAlign: "center",
          position: "relative",
        }}>
          {/* Ocean wave decoration top */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 6,
            background: "linear-gradient(90deg, #00b4ff, #0060c0, #00e8b0, #00b4ff)",
            backgroundSize: "200% 100%",
          }} />

          <div style={{
            fontSize: 11, letterSpacing: 4, color: "rgba(0,200,255,0.6)",
            marginBottom: 4, fontFamily: "Arial, sans-serif", fontWeight: 700,
          }}>
            OCEAN SURVIVOR
          </div>

          {/* Turtle emoji */}
          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 6 }}>🐢</div>

          {/* Score */}
          <div style={{
            fontSize: 72, lineHeight: 1, color: "#ffffff",
            textShadow: "0 0 30px rgba(0,200,255,0.6), 0 2px 8px rgba(0,0,0,0.8)",
          }}>
            {score}
          </div>
          <div style={{
            fontSize: 11, letterSpacing: 3, color: "rgba(150,210,255,0.55)",
            fontFamily: "Arial, sans-serif", marginTop: 2,
          }}>
            SCORE
          </div>

          {newRecord && (
            <div style={{
              marginTop: 8, display: "inline-block",
              background: "linear-gradient(135deg, #b08000, #ffd84a, #b08000)",
              borderRadius: 20, padding: "3px 16px",
              fontSize: 12, color: "#1a0a00",
              boxShadow: "0 2px 12px rgba(255,200,0,0.5)",
            }}>
              ✨ NEW PERSONAL BEST
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{
          background: "#041220",
          display: "flex",
          borderBottom: "1px solid rgba(0,80,140,0.4)",
        }}>
          <StatBox label="BEST" value={bestScore.toString()} />
          <div style={{ width: 1, background: "rgba(0,80,140,0.4)" }} />
          <StatBox label="SHELLS" value={`🐚 ${shellsCollected}`} />
        </div>

        {/* Ocean flavour */}
        <div style={{
          background: "#020c1a",
          padding: "10px 20px",
          textAlign: "center",
          fontSize: 12,
          fontFamily: "Arial, sans-serif",
          color: "rgba(100,180,220,0.5)",
          letterSpacing: 0.5,
        }}>
          {score === 0
            ? "Every swim counts — keep going! 🌊"
            : score < 50
            ? "The ocean needs more heroes! 🌊"
            : score < 150
            ? "The turtle is grateful! 🪸"
            : "Champion of the deep! 🏆"}
        </div>

        {/* Buttons */}
        <div style={{
          background: "#031020",
          display: "flex",
          gap: 8,
          padding: "12px 16px 16px",
          borderTop: "1px solid rgba(0,80,140,0.3)",
        }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              background: "linear-gradient(135deg, #0a6aff, #0044b0)",
              border: "1.5px solid rgba(100,180,255,0.35)",
              borderRadius: 14,
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "Arial, sans-serif",
              padding: "11px 0",
              cursor: "pointer",
              letterSpacing: 0.3,
            }}
          >
            📤 Share
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.14)",
              borderRadius: 14,
              color: "rgba(200,220,255,0.75)",
              fontSize: 14,
              fontFamily: "Arial, sans-serif",
              padding: "11px 0",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1, padding: "10px 0", textAlign: "center",
    }}>
      <div style={{
        fontSize: 18, color: "#c0e8ff",
        fontFamily: "Arial Black, sans-serif",
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, letterSpacing: 2, color: "rgba(100,160,200,0.5)",
        fontFamily: "Arial, sans-serif", marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  );
}
