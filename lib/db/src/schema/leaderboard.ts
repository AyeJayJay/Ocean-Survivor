import {
  pgTable, bigserial, text, integer, timestamp, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/*
 * leaderboard — one row per anonymous player, best score kept.
 *
 * Upsert strategy: if the player already has a row and submits a higher score,
 * update score + shells + updated_at; otherwise do nothing.
 */
export const leaderboardTable = pgTable(
  "leaderboard",
  {
    id:           bigserial("id", { mode: "number" }).primaryKey(),
    anonymous_id: text("anonymous_id").notNull().unique(),
    display_name: text("display_name").notNull().default("Sea Turtle"),
    score:        integer("score").notNull(),
    shells:       integer("shells").notNull().default(0),
    updated_at:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_lb_score").on(t.score),
    index("idx_lb_anonymous_id").on(t.anonymous_id),
  ],
);

export const insertLeaderboardSchema = createInsertSchema(leaderboardTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardEntry = typeof leaderboardTable.$inferSelect;
