import { pgTable, bigserial, text, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Event type catalogue ────────────────────────────────────────────────────
// Adding a new event = add the literal here. Every event row gets routed to
// the same table so queries are simple; the event_data JSONB holds the payload.

export const analyticsEventTypes = [
  // Session lifecycle
  "session_start",
  // Game lifecycle
  "game_start",
  "game_over",
  "game_revived",
  "theme_reached",
  // Interstitial ads
  "interstitial_impression",
  "interstitial_dismissed",
  "interstitial_suppressed",   // frequency manager blocked a potential impression
  // Rewarded ads (sequential phases)
  "rewarded_preroll_shown",    // pre-roll confirmation screen displayed
  "rewarded_declined",         // user tapped "No thanks" on pre-roll
  "rewarded_started",          // user tapped "Watch Ad" — video begins
  "rewarded_skipped",          // user skipped after the 5s skip threshold
  "rewarded_completed",        // full watch — reward granted
  // Banner ads
  "banner_impression",
] as const;

export type AnalyticsEventType = (typeof analyticsEventTypes)[number];

// ─── Table definition ────────────────────────────────────────────────────────

export const analyticsEventsTable = pgTable(
  "analytics_events",
  {
    id:             bigserial("id", { mode: "number" }).primaryKey(),
    // Identifiers
    anonymous_id:   text("anonymous_id").notNull(),   // stable across sessions (localStorage)
    session_id:     text("session_id").notNull(),      // new each page load (sessionStorage)
    session_number: integer("session_number").notNull().default(1),
    // A/B testing
    ab_variant:     text("ab_variant").notNull().default("control"),
    // Event
    event_type:     text("event_type").$type<AnalyticsEventType>().notNull(),
    event_data:     jsonb("event_data"),               // flexible per-event payload
    client_ts:      timestamp("client_ts", { withTimezone: true }),  // client timestamp
    created_at:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_ae_anonymous_id").on(t.anonymous_id),
    index("idx_ae_event_type").on(t.event_type),
    index("idx_ae_ab_variant").on(t.ab_variant),
    index("idx_ae_created_at").on(t.created_at),
  ]
);

// ─── Zod schemas & types ─────────────────────────────────────────────────────

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEventsTable).omit({
  id: true,
  created_at: true,
});

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
