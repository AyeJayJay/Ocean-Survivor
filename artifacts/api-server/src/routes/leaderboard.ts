import { Router } from "express";
import { db, leaderboardTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

// ── GET /api/leaderboard — top 20 scores ────────────────────────────────────

router.get("/leaderboard", async (req, res) => {
  try {
    const rows = await db
      .select({
        anonymous_id: leaderboardTable.anonymous_id,
        display_name: leaderboardTable.display_name,
        score:        leaderboardTable.score,
        shells:       leaderboardTable.shells,
      })
      .from(leaderboardTable)
      .orderBy(desc(leaderboardTable.score))
      .limit(20);

    const ranked = rows.map((row, idx) => ({ ...row, rank: idx + 1 }));
    res.json(ranked);
  } catch (err) {
    req.log.error(err, "leaderboard GET failed");
    res.status(500).json({ error: "server_error" });
  }
});

// ── POST /api/leaderboard — upsert player score ──────────────────────────────

router.post("/leaderboard", async (req, res) => {
  const body = req.body as Record<string, unknown>;

  const anonymous_id  = typeof body.anonymous_id  === "string" ? body.anonymous_id.slice(0, 80)  : null;
  const display_name  = typeof body.display_name  === "string" ? body.display_name.slice(0, 20)  : "Sea Turtle";
  const score         = typeof body.score         === "number" ? Math.floor(body.score)          : null;
  const shells        = typeof body.shells        === "number" ? Math.floor(body.shells)          : 0;

  if (!anonymous_id || score === null || score < 0 || score > 99999) {
    res.status(400).json({ error: "validation_error" });
    return;
  }

  try {
    await db
      .insert(leaderboardTable)
      .values({ anonymous_id, display_name, score, shells })
      .onConflictDoUpdate({
        target: leaderboardTable.anonymous_id,
        set: {
          score:        sql`GREATEST(${leaderboardTable.score}, EXCLUDED.score)`,
          shells:       sql`CASE WHEN EXCLUDED.score >= ${leaderboardTable.score} THEN EXCLUDED.shells ELSE ${leaderboardTable.shells} END`,
          display_name: sql`EXCLUDED.display_name`,
          updated_at:   sql`now()`,
        },
      });

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "leaderboard POST failed");
    res.status(500).json({ error: "server_error" });
  }
});

// ── PATCH /api/leaderboard/name — update display name only ──────────────────

router.patch("/leaderboard/name", async (req, res) => {
  const body = req.body as Record<string, unknown>;

  const anonymous_id = typeof body.anonymous_id === "string" ? body.anonymous_id.slice(0, 80) : null;
  const display_name = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 20) : null;

  if (!anonymous_id || !display_name) {
    res.status(400).json({ error: "validation_error" });
    return;
  }

  try {
    await db
      .update(leaderboardTable)
      .set({ display_name, updated_at: new Date() })
      .where(eq(leaderboardTable.anonymous_id, anonymous_id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "leaderboard PATCH failed");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
