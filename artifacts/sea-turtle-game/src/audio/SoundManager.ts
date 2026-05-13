/*
 * SoundManager — procedural Web Audio API sound synthesis for Ocean Survivor
 *
 * No audio files. All sounds are synthesized in real time, so they load
 * instantly and work fully offline.
 *
 * Channels:
 *  - SFX channel  : game sound effects (jump, collect, die, UI taps, etc.)
 *  - Music channel: looping ocean ambience (filtered noise + oscillators)
 *
 * Both channels have independent mute/unmute. Preferences persist via
 * SaveManager (which is initialized before SoundManager is used).
 *
 * AudioContext is created lazily on the first sound to comply with browser
 * autoplay policies — the player's first interaction unlocks it.
 */

import { saveManager } from "../save/SaveManager";

// ── Tuning ───────────────────────────────────────────────────────────────────

const BUBBLE_THROTTLE_MS = 90;
const SFX_MASTER = 0.82;
const MUSIC_MASTER = 0.22;

// ── SoundManager ─────────────────────────────────────────────────────────────

class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private lastBubbleAt = 0;

  // Music nodes (kept alive for the loop)
  private musicNodes: AudioNode[] = [];
  private musicPlaying = false;

  // ── Context ──────────────────────────────────────────────────────────────────

  private getCtx(): AudioContext | null {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();

        // SFX gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = saveManager.sfxMuted ? 0 : SFX_MASTER;
        this.sfxGain.connect(this.ctx.destination);

        // Music gain
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = saveManager.musicMuted ? 0 : MUSIC_MASTER;
        this.musicGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // ── Music ─────────────────────────────────────────────────────────────────

  /**
   * Start looping ocean ambience (if not already playing).
   * Built from filtered white noise + slow sine LFO + two oscillators.
   */
  startMusic(): void {
    const ctx = this.getCtx();
    if (!ctx || !this.musicGain || this.musicPlaying) return;
    this.musicPlaying = true;

    const t = ctx.currentTime;

    // ── White noise (ocean waves hiss) ────────────────────────────────────
    const bufferSize = ctx.sampleRate * 4; // 4-second buffer that loops
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    noiseSource.start(t);

    // Low-pass + band-pass combination for a watery rumble
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 420;
    lpf.Q.value = 0.8;

    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = 180;
    bpf.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.35;

    noiseSource.connect(lpf);
    lpf.connect(bpf);
    bpf.connect(noiseGain);
    noiseGain.connect(this.musicGain);

    // ── Deep drone oscillator (sub-bass hum) ──────────────────────────────
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 55; // A1 — deep underwater resonance
    drone.start(t);

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.28;
    drone.connect(droneGain);
    droneGain.connect(this.musicGain);

    // ── Gentle mid tone (C3 — peaceful depth) ────────────────────────────
    const mid = ctx.createOscillator();
    mid.type = "sine";
    mid.frequency.value = 130.8; // C3
    mid.start(t);

    const midGain = ctx.createGain();
    midGain.gain.value = 0.12;
    mid.connect(midGain);
    midGain.connect(this.musicGain);

    // ── Slow LFO tremolo on noise (breathing ocean) ───────────────────────
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.08; // very slow, ~12s cycle
    lfo.start(t);

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(noiseGain.gain);

    // ── Periodic high chime accents (bubble ping) ─────────────────────────
    const scheduleChime = () => {
      if (!this.musicPlaying || !ctx || !this.musicGain) return;
      const now = ctx.currentTime;
      const chimeFreqs = [523, 659, 784, 1047]; // C5, E5, G5, C6
      const freq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];

      const chimeOsc = ctx.createOscillator();
      chimeOsc.type = "sine";
      chimeOsc.frequency.value = freq;
      chimeOsc.start(now);
      chimeOsc.stop(now + 1.2);

      const chimeEnv = ctx.createGain();
      chimeEnv.gain.setValueAtTime(0, now);
      chimeEnv.gain.linearRampToValueAtTime(0.06, now + 0.02);
      chimeEnv.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      chimeOsc.connect(chimeEnv);
      chimeEnv.connect(this.musicGain!);
      chimeOsc.onended = () => { chimeOsc.disconnect(); chimeEnv.disconnect(); };

      // Schedule next chime 6–18 seconds later
      const delay = 6000 + Math.random() * 12000;
      setTimeout(scheduleChime, delay);
    };
    setTimeout(scheduleChime, 3000 + Math.random() * 5000);

    this.musicNodes = [noiseSource, drone, mid, lfo, noiseGain, droneGain, midGain, lfoGain, lpf, bpf];
  }

  stopMusic(): void {
    this.musicPlaying = false;
    for (const node of this.musicNodes) {
      try {
        if (node instanceof AudioScheduledSourceNode) node.stop();
        node.disconnect();
      } catch { /* already stopped */ }
    }
    this.musicNodes = [];
  }

  // ── SFX ───────────────────────────────────────────────────────────────────

  /**
   * Bubble flap — plays when the turtle swims upward.
   * Skin-specific variants give each turtle a unique audio identity.
   */
  playBubble(): void {
    this.playFlapForSkin("baby");
  }

  playFlapForSkin(skinId: string): void {
    if (saveManager.sfxMuted) return;
    const now = Date.now();
    if (now - this.lastBubbleAt < BUBBLE_THROTTLE_MS) return;
    this.lastBubbleAt = now;

    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;

    switch (skinId) {
      case "glowing": {
        // Ethereal shimmer — high sine with slow vibrato
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(720 + Math.random() * 120, t);
        osc.frequency.exponentialRampToValueAtTime(540, t + 0.14);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.07, t + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(env); env.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.19);
        osc.onended = () => { osc.disconnect(); env.disconnect(); };
        break;
      }

      case "golden": {
        // Bright chime — triangle wave, high pitch
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        const baseHz = 880 + Math.random() * 160;
        osc.frequency.setValueAtTime(baseHz, t);
        osc.frequency.exponentialRampToValueAtTime(baseHz * 1.15, t + 0.06);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.075, t + 0.006);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(env); env.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.19);
        osc.onended = () => { osc.disconnect(); env.disconnect(); };
        break;
      }

      case "cyber": {
        // Electronic pulse — sawtooth with hard low-pass
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220 + Math.random() * 40, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.09);
        const lpf = ctx.createBiquadFilter();
        lpf.type = "lowpass"; lpf.frequency.value = 800; lpf.Q.value = 4;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.08, t + 0.004);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        osc.connect(lpf); lpf.connect(env); env.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.13);
        osc.onended = () => { osc.disconnect(); lpf.disconnect(); env.disconnect(); };
        break;
      }

      case "coral": {
        // Warm muffled pop — low sine, soft attack
        const osc = ctx.createOscillator();
        osc.type = "sine";
        const startHz = 260 + Math.random() * 60;
        osc.frequency.setValueAtTime(startHz, t);
        osc.frequency.exponentialRampToValueAtTime(startHz * 0.6, t + 0.12);
        const lpf = ctx.createBiquadFilter();
        lpf.type = "lowpass"; lpf.frequency.value = 700; lpf.Q.value = 1.2;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.11, t + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        osc.connect(lpf); lpf.connect(env); env.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.17);
        osc.onended = () => { osc.disconnect(); lpf.disconnect(); env.disconnect(); };
        break;
      }

      case "green_sea": {
        // Deeper bubble — lower pitch than baby
        const osc = ctx.createOscillator();
        osc.type = "sine";
        const startHz = 280 + Math.random() * 60;
        osc.frequency.setValueAtTime(startHz, t);
        osc.frequency.exponentialRampToValueAtTime(startHz * 0.5, t + 0.10);
        const lpf = ctx.createBiquadFilter();
        lpf.type = "lowpass"; lpf.frequency.value = 1200; lpf.Q.value = 1.5;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.10, t + 0.007);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        osc.connect(lpf); lpf.connect(env); env.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.16);
        osc.onended = () => { osc.disconnect(); lpf.disconnect(); env.disconnect(); };
        break;
      }

      default: {
        // baby — classic bubble
        const osc = ctx.createOscillator();
        osc.type = "sine";
        const startHz = 360 + Math.random() * 80;
        osc.frequency.setValueAtTime(startHz, t);
        osc.frequency.exponentialRampToValueAtTime(startHz * 0.55, t + 0.09);
        const lpf = ctx.createBiquadFilter();
        lpf.type = "lowpass"; lpf.frequency.value = 1600; lpf.Q.value = 1.8;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.09, t + 0.006);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
        osc.connect(lpf); lpf.connect(env); env.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.14);
        osc.onended = () => { osc.disconnect(); lpf.disconnect(); env.disconnect(); };
        break;
      }
    }
  }

  /**
   * Collect — plays when a shell is collected.
   */
  playCollect(): void {
    if (saveManager.sfxMuted) return;
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;

    ([523, 698] as const).forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.28, t + 0.22);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.08, t + 0.012);
      env.gain.setValueAtTime(0.08, t + 0.045);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);

      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.31);
      osc.onended = () => { osc.disconnect(); env.disconnect(); };
    });
  }

  /**
   * Death — plays when the turtle collides with an obstacle.
   * A descending thud with noise burst.
   */
  playDeath(): void {
    if (saveManager.sfxMuted) return;
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;

    // Low thud oscillator
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.18, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.46);
    osc.onended = () => { osc.disconnect(); env.disconnect(); };

    // Noise burst
    const bufSize = Math.floor(ctx.sampleRate * 0.18);
    const nb = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < bufSize; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const ns = ctx.createBufferSource();
    ns.buffer = nb;
    const ng = ctx.createGain();
    ng.gain.value = 0.12;
    ns.connect(ng);
    ng.connect(this.sfxGain);
    ns.start(t);
    ns.onended = () => { ns.disconnect(); ng.disconnect(); };
  }

  /**
   * Near-miss whoosh — plays when the turtle passes very close to an obstacle.
   */
  playNearMiss(): void {
    if (saveManager.sfxMuted) return;
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 900;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.06, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(lpf);
    lpf.connect(env);
    env.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.19);
    osc.onended = () => { osc.disconnect(); lpf.disconnect(); env.disconnect(); };
  }

  /**
   * UI tap — plays on menu button presses.
   */
  playTap(): void {
    if (saveManager.sfxMuted) return;
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.06);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.055, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.10);
    osc.onended = () => { osc.disconnect(); env.disconnect(); };
  }

  /**
   * Achievement fanfare — triumphant short jingle.
   */
  playAchievement(): void {
    if (saveManager.sfxMuted) return;
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;

    const notes = [
      { freq: 523, t: 0,    dur: 0.12 },   // C5
      { freq: 659, t: 0.11, dur: 0.12 },   // E5
      { freq: 784, t: 0.22, dur: 0.12 },   // G5
      { freq: 1047, t: 0.33, dur: 0.28 },  // C6 (hold)
    ];

    const base = ctx.currentTime;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = n.freq;

      const env = ctx.createGain();
      const start = base + n.t;
      const end = start + n.dur;
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(0.10, start + 0.01);
      env.gain.setValueAtTime(0.10, end - 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, end + 0.08);

      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(end + 0.09);
      osc.onended = () => { osc.disconnect(); env.disconnect(); };
    }
  }

  /**
   * Score milestone popup sound.
   */
  playMilestone(): void {
    if (saveManager.sfxMuted) return;
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;

    ([392, 523] as const).forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const env = ctx.createGain();
      const st = t + i * 0.08;
      env.gain.setValueAtTime(0, st);
      env.gain.linearRampToValueAtTime(0.07, st + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, st + 0.22);

      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(st);
      osc.stop(st + 0.23);
      osc.onended = () => { osc.disconnect(); env.disconnect(); };
    });
  }

  // ── Mute control ─────────────────────────────────────────────────────────────

  /** Legacy single-toggle used by the mute button in App.tsx */
  toggle(): void {
    const both = saveManager.sfxMuted && saveManager.musicMuted;
    this.setSfxMuted(!saveManager.sfxMuted);
    this.setMusicMuted(both ? false : !saveManager.musicMuted);
  }

  setSfxMuted(muted: boolean): void {
    saveManager.setSfxMuted(muted);
    if (this.sfxGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(t);
      this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, t);
      this.sfxGain.gain.linearRampToValueAtTime(muted ? 0 : SFX_MASTER, t + 0.05);
    }
  }

  setMusicMuted(muted: boolean): void {
    saveManager.setMusicMuted(muted);
    if (this.musicGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
      this.musicGain.gain.linearRampToValueAtTime(muted ? 0 : MUSIC_MASTER, t + 0.08);
    }
  }

  get muted(): boolean { return saveManager.sfxMuted; }
  get musicMuted(): boolean { return saveManager.musicMuted; }
  get sfxMuted(): boolean { return saveManager.sfxMuted; }
}

export const soundManager = new SoundManager();
