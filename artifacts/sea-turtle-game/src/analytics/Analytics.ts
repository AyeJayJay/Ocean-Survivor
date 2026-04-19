/*
 * Analytics — event tracking for Sea Turtle Dash
 *
 * Design goals:
 *  - Zero-dependency, browser-only module (no external SDK required)
 *  - Events are buffered in memory and flushed every 30s or at 20 events
 *  - navigator.sendBeacon is used on page unload so no events are lost
 *  - If the server is unreachable, events queue to localStorage (max 200)
 *    and drain on the next successful flush
 *  - All events are enriched with session_id, anonymous_id, and ab_variant
 *    so every query can be segmented by user cohort and A/B variant
 *
 * To add a new event: call analytics.track("my_new_event", { ...payload })
 * The event_type is validated at the server; client does no schema enforcement.
 */

import type { AnalyticsEventType } from "./types";
import { getVariant } from "./ABTest";

// ─── Identity ─────────────────────────────────────────────────────────────────

const LS_ANONYMOUS_ID  = "stg_anon_id";
const LS_SESSION_COUNT = "stg_total_sessions"; // mirrors AdFrequencyManager
const LS_OFFLINE_QUEUE = "stg_analytics_queue";

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function getAnonymousId(): string {
  let id = localStorage.getItem(LS_ANONYMOUS_ID);
  if (!id) { id = makeId(); localStorage.setItem(LS_ANONYMOUS_ID, id); }
  return id;
}

function getSessionId(): string {
  let id = sessionStorage.getItem("stg_session_id");
  if (!id) { id = makeId(); sessionStorage.setItem("stg_session_id", id); }
  return id;
}

function getSessionNumber(): number {
  return parseInt(localStorage.getItem(LS_SESSION_COUNT) ?? "1", 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackPayload {
  event_type: AnalyticsEventType;
  event_data?: Record<string, unknown>;
}

interface EnrichedEvent extends TrackPayload {
  anonymous_id:   string;
  session_id:     string;
  session_number: number;
  ab_variant:     string;
  client_ts:      string; // ISO 8601
}

// ─── Client ───────────────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_AT_COUNT    = 20;
const OFFLINE_MAX       = 200;

class AnalyticsClient {
  private buffer: EnrichedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.flushBeacon();
    });
    window.addEventListener("beforeunload", () => this.flushBeacon());
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  track(type: AnalyticsEventType, data?: Record<string, unknown>): void {
    const event: EnrichedEvent = {
      event_type:     type,
      event_data:     data,
      anonymous_id:   getAnonymousId(),
      session_id:     getSessionId(),
      session_number: getSessionNumber(),
      ab_variant:     getVariant().id,
      client_ts:      new Date().toISOString(),
    };
    this.buffer.push(event);
    if (this.buffer.length >= FLUSH_AT_COUNT) this.flush();
  }

  // ── Flush strategies ────────────────────────────────────────────────────────

  async flush(): Promise<void> {
    const events = this.drainBuffer();
    if (!events.length) return;
    try {
      const base = (import.meta as any).env?.BASE_URL ?? "/";
      const res = await fetch(`${base}api/analytics/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.drainOfflineQueue(); // try to clear anything that failed before
    } catch {
      this.pushToOfflineQueue(events);
    }
  }

  // sendBeacon is fire-and-forget — used on page close
  private flushBeacon(): void {
    const events = this.drainBuffer();
    if (!events.length) return;
    const base = (import.meta as any).env?.BASE_URL ?? "/";
    const url = `${base}api/analytics/events`;
    const blob = new Blob([JSON.stringify({ events })], { type: "application/json" });
    const sent = navigator.sendBeacon(url, blob);
    if (!sent) this.pushToOfflineQueue(events);
  }

  // ── Offline queue (localStorage) ────────────────────────────────────────────

  private drainBuffer(): EnrichedEvent[] {
    const out = this.buffer;
    this.buffer = [];
    return out;
  }

  private pushToOfflineQueue(events: EnrichedEvent[]): void {
    try {
      const raw = localStorage.getItem(LS_OFFLINE_QUEUE);
      const existing: EnrichedEvent[] = raw ? JSON.parse(raw) : [];
      const merged = [...existing, ...events].slice(-OFFLINE_MAX);
      localStorage.setItem(LS_OFFLINE_QUEUE, JSON.stringify(merged));
    } catch { /* storage full or unavailable — discard */ }
  }

  private async drainOfflineQueue(): Promise<void> {
    try {
      const raw = localStorage.getItem(LS_OFFLINE_QUEUE);
      if (!raw) return;
      const events: EnrichedEvent[] = JSON.parse(raw);
      if (!events.length) return;
      localStorage.removeItem(LS_OFFLINE_QUEUE);
      const base = (import.meta as any).env?.BASE_URL ?? "/";
      await fetch(`${base}api/analytics/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
    } catch { /* keep in queue until next flush */ }
  }
}

// Singleton
export const analytics = new AnalyticsClient();
