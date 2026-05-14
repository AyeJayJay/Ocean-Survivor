import { useEffect, useState, useCallback, useRef } from "react";

const LS_ANON_ID  = "stg_anon_id";
const LS_DISP_NAME = "os_display_name";
const BASE_URL = import.meta.env.BASE_URL as string;

function getAnonId(): string {
  return localStorage.getItem(LS_ANON_ID) ?? "";
}

function getDisplayName(): string {
  const stored = localStorage.getItem(LS_DISP_NAME);
  if (stored) return stored;
  // generate default from anonId tail chars
  const tail = getAnonId().replace(/-/g, "").slice(-4).toUpperCase();
  return `Turtle #${tail || "???"}`;
}

function saveDisplayName(name: string): void {
  localStorage.setItem(LS_DISP_NAME, name);
}

interface LBEntry {
  rank: number;
  display_name: string;
  score: number;
  shells: number;
  anonymous_id: string;
}

interface Props {
  onClose: () => void;
}

export default function LeaderboardModal({ onClose }: Props) {
  const [entries, setEntries] = useState<LBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);
  const [displayName, setDisplayName] = useState(getDisplayName);
  const [editing, setEditing]  = useState(false);
  const [saving, setSaving]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const myAnonId = getAnonId();

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${BASE_URL}api/leaderboard`);
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as LBEntry[];
      setEntries(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSaveName = useCallback(async () => {
    const trimmed = displayName.trim().slice(0, 20) || getDisplayName();
    setDisplayName(trimmed);
    saveDisplayName(trimmed);
    setSaving(true);
    try {
      await fetch(`${BASE_URL}api/leaderboard/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymous_id: myAnonId, display_name: trimmed }),
      });
      await fetchLeaderboard();
    } catch { /* silent */ }
    setSaving(false);
    setEditing(false);
  }, [displayName, myAnonId, fetchLeaderboard]);

  const myRank = entries.findIndex(e => e.anonymous_id === myAnonId);

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 300,
        display: "flex", flexDirection: "column",
        background: "linear-gradient(180deg, #010a18 0%, #020d20 100%)",
        animation: "lb-in 0.22s ease-out",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <style>{`
        @keyframes lb-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lb-row { transition: background 0.15s; }
        .lb-row:hover { background: rgba(0,100,180,0.12) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "18px 20px 12px",
        borderBottom: "1.5px solid rgba(0,120,200,0.3)",
        background: "rgba(0,10,30,0.8)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "rgba(0,200,255,0.5)", marginBottom: 2 }}>
            OCEAN SURVIVOR
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#c0eaff", fontFamily: "Arial Black, sans-serif" }}>
            🏆 Leaderboard
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%", width: 38, height: 38,
            color: "rgba(200,220,255,0.7)", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>
      </div>

      {/* Your name section */}
      <div style={{
        padding: "10px 16px",
        background: "rgba(0,40,80,0.4)",
        borderBottom: "1px solid rgba(0,80,140,0.3)",
        display: "flex", alignItems: "center", gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: "rgba(120,180,220,0.7)", whiteSpace: "nowrap" }}>Your name:</span>
        {editing ? (
          <>
            <input
              ref={inputRef}
              value={displayName}
              onChange={e => setDisplayName(e.target.value.slice(0, 20))}
              onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditing(false); }}
              style={{
                flex: 1, background: "rgba(0,60,120,0.5)", border: "1px solid rgba(0,160,255,0.4)",
                borderRadius: 8, color: "#c0e8ff", fontSize: 13, padding: "4px 8px",
                outline: "none", fontFamily: "Arial, sans-serif",
              }}
              maxLength={20}
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              style={{
                background: "#0a5ab0", border: "none", borderRadius: 8,
                color: "white", fontSize: 12, padding: "5px 12px", cursor: "pointer",
              }}
            >
              {saving ? "…" : "Save"}
            </button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontSize: 13, color: "#80c8ff", fontWeight: 600 }}>{displayName}</span>
            <button
              onClick={() => setEditing(true)}
              style={{
                background: "transparent", border: "1px solid rgba(0,140,220,0.3)",
                borderRadius: 8, color: "rgba(100,180,240,0.7)", fontSize: 11,
                padding: "4px 10px", cursor: "pointer",
              }}
            >✏️ Edit</button>
          </>
        )}
      </div>

      {/* Table header */}
      <div style={{
        display: "grid", gridTemplateColumns: "36px 1fr 60px 44px",
        padding: "6px 16px", gap: 4,
        fontSize: 9, letterSpacing: 2, color: "rgba(100,160,200,0.5)",
        borderBottom: "1px solid rgba(0,60,120,0.4)",
        flexShrink: 0,
      }}>
        <span>#</span><span>PLAYER</span><span style={{ textAlign: "right" }}>SCORE</span>
        <span style={{ textAlign: "right" }}>🐚</span>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "rgba(100,180,220,0.5)", padding: 32, fontSize: 13 }}>
            Loading…
          </div>
        )}
        {error && !loading && (
          <div style={{ textAlign: "center", padding: 32 }}>
            <div style={{ color: "rgba(255,100,100,0.7)", fontSize: 13, marginBottom: 12 }}>
              Could not load leaderboard
            </div>
            <button
              onClick={fetchLeaderboard}
              style={{
                background: "rgba(0,100,200,0.3)", border: "1px solid rgba(0,140,255,0.3)",
                borderRadius: 10, color: "#80c8ff", fontSize: 12, padding: "8px 20px", cursor: "pointer",
              }}
            >Retry</button>
          </div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div style={{ textAlign: "center", color: "rgba(100,180,220,0.4)", padding: 32, fontSize: 13 }}>
            No scores yet — play to be first! 🐢
          </div>
        )}
        {!loading && !error && entries.map((entry, idx) => {
          const isMe = entry.anonymous_id === myAnonId;
          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
          return (
            <div
              key={entry.anonymous_id}
              className="lb-row"
              style={{
                display: "grid", gridTemplateColumns: "36px 1fr 60px 44px",
                padding: "10px 16px", gap: 4, alignItems: "center",
                background: isMe ? "rgba(0,120,255,0.12)" : "transparent",
                borderBottom: "1px solid rgba(0,50,100,0.2)",
                borderLeft: isMe ? "3px solid rgba(0,160,255,0.6)" : "3px solid transparent",
              }}
            >
              <span style={{ fontSize: 14, textAlign: "center" }}>
                {medal ?? (
                  <span style={{ fontSize: 11, color: "rgba(140,180,220,0.5)" }}>{idx + 1}</span>
                )}
              </span>
              <span style={{
                fontSize: 13, color: isMe ? "#80d0ff" : "#a0c8e8",
                fontWeight: isMe ? 700 : 400,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {entry.display_name}{isMe ? " (you)" : ""}
              </span>
              <span style={{
                fontSize: 15, textAlign: "right",
                color: idx === 0 ? "#ffd84a" : isMe ? "#80d0ff" : "#c0e0ff",
                fontWeight: idx < 3 || isMe ? 700 : 400,
                fontFamily: "Arial Black, sans-serif",
              }}>
                {entry.score}
              </span>
              <span style={{ fontSize: 11, textAlign: "right", color: "rgba(200,180,80,0.65)" }}>
                {entry.shells}
              </span>
            </div>
          );
        })}

        {/* "You" not in top 20 callout */}
        {!loading && !error && myRank === -1 && myAnonId && entries.length > 0 && (
          <div style={{
            margin: "8px 16px",
            padding: "10px 14px",
            background: "rgba(0,60,120,0.25)",
            border: "1px solid rgba(0,120,200,0.3)",
            borderRadius: 10,
            fontSize: 12, color: "rgba(120,180,230,0.6)", textAlign: "center",
          }}>
            Play more to make the top 20!
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid rgba(0,60,120,0.35)",
        textAlign: "center",
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.14)",
            borderRadius: 14, color: "rgba(200,220,255,0.75)",
            fontSize: 14, padding: "10px 40px", cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
