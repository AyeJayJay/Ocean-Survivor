/*
 * SoundManager — procedural Web Audio API sound synthesis for Sea Turtle Dash
 *
 * No audio files. All sounds are synthesized in real time, so they load
 * instantly and work fully offline.
 *
 * Design goals:
 *  - Sounds are subtle and never jarring — volume capped at 0.10 peak
 *  - Bubble flap has a 90ms throttle to stay pleasant on rapid tapping
 *  - Both sounds fade out smoothly (no clicks or pops)
 *  - Mute preference persists across sessions via localStorage
 *  - AudioContext is created lazily on the first sound to comply with
 *    browser autoplay policies — the player's first tap unlocks it
 *  - All oscillator nodes are disconnected after playback (no memory leaks)
 */

const LS_MUTED = "stg_sound_muted";

// ─── Tuning ───────────────────────────────────────────────────────────────────

// Bubble: how long to wait before playing another bubble sound.
// 90ms feels natural even at maximum tap speed.
const BUBBLE_THROTTLE_MS = 90;

// Master volume applied to all sounds (0–1). Adjust here to change overall loudness.
const MASTER_VOLUME = 0.82;

// ─── SoundManager ─────────────────────────────────────────────────────────────

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted: boolean;
  private lastBubbleAt = 0;

  constructor() {
    this._muted = localStorage.getItem(LS_MUTED) === "1";
  }

  // ── Context ──────────────────────────────────────────────────────────────────

  private getCtx(): AudioContext | null {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = MASTER_VOLUME;
        this.master.connect(this.ctx.destination);
      }
      // iOS Safari suspends the context between interactions
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    } catch {
      return null; // AudioContext blocked (very rare — silent fallback)
    }
  }

  // ── Sounds ───────────────────────────────────────────────────────────────────

  /**
   * Bubble — plays when the turtle flaps.
   *
   * A real underwater bubble starts at a high pitch and drops as the bubble
   * expands (its resonant frequency falls with increasing radius). That same
   * pitch-drop produces a soft, watery "bloop" that feels satisfying without
   * being harsh.
   *
   * Each tap slightly randomises the starting pitch (±40 Hz) so rapid tapping
   * sounds like multiple distinct bubbles rather than a repeated click.
   */
  playBubble(): void {
    if (this._muted) return;
    const now = Date.now();
    if (now - this.lastBubbleAt < BUBBLE_THROTTLE_MS) return;
    this.lastBubbleAt = now;

    const ctx = this.getCtx();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;

    // Main bubble oscillator
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const startHz = 360 + Math.random() * 80; // 360–440 Hz
    osc.frequency.setValueAtTime(startHz, t);
    osc.frequency.exponentialRampToValueAtTime(startHz * 0.55, t + 0.09); // drops ~1 octave

    // Low-pass filter softens the tone — removes any harsh top end
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 1600;
    lpf.Q.value = 1.8;

    // Gain envelope: near-instant attack, exponential decay
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.09, t + 0.006); // 6 ms attack
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.13); // 130 ms total

    osc.connect(lpf);
    lpf.connect(env);
    env.connect(this.master);

    osc.start(t);
    osc.stop(t + 0.14);
    osc.onended = () => { osc.disconnect(); lpf.disconnect(); env.disconnect(); };
  }

  /**
   * Collect — plays when a piece of ocean trash is collected.
   *
   * Two sine tones a perfect fourth apart (C5 + F5) sweep upward together,
   * creating a bright, consonant "ding" that rewards the player without
   * sounding out of place in an underwater setting. The sweep gives a
   * sense of the trash being "swept away".
   */
  playCollect(): void {
    if (this._muted) return;
    const ctx = this.getCtx();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;

    // C5 (523 Hz) and F5 (698 Hz) — a perfect 4th, very consonant
    ([523, 698] as const).forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.28, t + 0.22); // rising sweep

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.08, t + 0.012); // 12 ms attack
      env.gain.setValueAtTime(0.08, t + 0.045);           // brief hold
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.30); // smooth decay

      osc.connect(env);
      env.connect(this.master!);
      osc.start(t);
      osc.stop(t + 0.31);
      osc.onended = () => { osc.disconnect(); env.disconnect(); };
    });
  }

  // ── Mute control ─────────────────────────────────────────────────────────────

  toggle(): void {
    this.setMuted(!this._muted);
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    localStorage.setItem(LS_MUTED, muted ? "1" : "0");
    // Smoothly ramp master gain so toggling doesn't cause a hard pop
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOLUME, t + 0.05);
    }
  }

  get muted(): boolean { return this._muted; }
}

export const soundManager = new SoundManager();
