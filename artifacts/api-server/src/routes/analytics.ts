import { Router } from "express";
import { db } from "@workspace/db";
import { analyticsEventsTable } from "@workspace/db/schema";
import { logger } from "../lib/logger";

const router = Router();

// Accepted event types — mirrors the frontend catalogue
const VALID_EVENT_TYPES = new Set([
  "session_start", "game_start", "game_over", "game_revived", "theme_reached",
  "interstitial_impression", "interstitial_dismissed", "interstitial_suppressed",
  "interstitial_cta_click",
  "rewarded_preroll_shown", "rewarded_declined", "rewarded_started",
  "rewarded_skipped", "rewarded_completed", "banner_impression",
]);

// ── POST /api/analytics/events  (batch ingest) ────────────────────────────────
router.post("/analytics/events", async (req, res) => {
  const { events } = req.body ?? {};

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: "events array required" });
  }
  if (events.length > 50) {
    return res.status(400).json({ error: "batch too large (max 50)" });
  }

  // Validate and sanitize each event
  const rows = [];
  for (const e of events) {
    if (!e || typeof e !== "object") continue;
    if (!VALID_EVENT_TYPES.has(e.event_type)) continue;
    if (typeof e.anonymous_id !== "string" || !e.anonymous_id) continue;
    if (typeof e.session_id !== "string" || !e.session_id) continue;

    rows.push({
      anonymous_id:   String(e.anonymous_id).slice(0, 64),
      session_id:     String(e.session_id).slice(0, 64),
      session_number: Number.isFinite(e.session_number) ? e.session_number : 1,
      ab_variant:     typeof e.ab_variant === "string" ? e.ab_variant.slice(0, 32) : "control",
      event_type:     e.event_type,
      event_data:     e.event_data && typeof e.event_data === "object" ? e.event_data : null,
      client_ts:      typeof e.client_ts === "string" ? new Date(e.client_ts) : null,
    });
  }

  if (!rows.length) {
    return res.status(400).json({ error: "no valid events in batch" });
  }

  try {
    await db.insert(analyticsEventsTable).values(rows);
    return res.json({ inserted: rows.length });
  } catch (err) {
    logger.error({ err }, "Failed to insert analytics events");
    return res.status(500).json({ error: "internal error" });
  }
});

export default router;
