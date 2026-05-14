/*
 * LeaderboardService — thin client for the /api/leaderboard endpoints.
 *
 * Score submission is fire-and-forget: errors are silently swallowed so a
 * network hiccup never disrupts the game-over flow.
 */

const LS_ANON_ID   = "stg_anon_id";
const LS_DISP_NAME = "os_display_name";
const BASE_URL = import.meta.env.BASE_URL as string;

function getAnonId(): string {
  return localStorage.getItem(LS_ANON_ID) ?? "";
}

function getDisplayName(): string {
  const stored = localStorage.getItem(LS_DISP_NAME);
  if (stored) return stored;
  const tail = getAnonId().replace(/-/g, "").slice(-4).toUpperCase();
  return `Turtle #${tail || "???"}`;
}

class LeaderboardService {
  /** Submit (or update) a player's score. Fire-and-forget. */
  submit(score: number, shells: number): void {
    if (score <= 0) return;

    const body = {
      anonymous_id: getAnonId(),
      display_name: getDisplayName(),
      score,
      shells,
    };

    fetch(`${BASE_URL}api/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => { /* silent */ });
  }
}

export const leaderboardService = new LeaderboardService();
