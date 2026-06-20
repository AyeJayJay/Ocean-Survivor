/**
 * OceanMusicManager.ts
 * 
 * Procedural background music for Ocean Survivor using Web Audio API.
 * No audio files required — all sound is generated in code.
 * 
 * THREE TRACKS:
 *   - MENU:    "Deep Ocean Drift"   — slow, atmospheric drone. Plays on MainMenu + GameOver.
 *   - GAME:    "Bioluminescent"     — soft shimmering melody. Plays when gameplay starts.
 *   - INTENSE: "Survival Mode"      — pulsing tension. Plays when speed >= INTENSE_SPEED_THRESHOLD.
 * 
 * INTEGRATION POINTS (see bottom of file for instructions):
 *   1. GameScene.ts  — call setGameTrack() on game start, update() to check speed
 *   2. GameOverScene.ts / MainMenuScene.ts — call setMenuTrack()
 *   3. SettingsScene.ts — call setMuted() when music toggle changes
 *   4. App.tsx or main.tsx — call OceanMusicManager.getInstance().init() on first user interaction
 */

import { saveManager } from '../save/SaveManager';
import { MAX_SPEED } from '../game/GameConfig';

// Speed threshold at which music switches to "Survival Mode" (75% of max speed)
const INTENSE_SPEED_THRESHOLD = MAX_SPEED * 0.75; // ~255 px/s
const CROSSFADE_DURATION = 2.0; // seconds

type TrackName = 'menu' | 'game' | 'intense' | 'none';

interface ActiveTrack {
  nodes: AudioNode[];
  gainNode: GainNode;
  timers: ReturnType<typeof setTimeout>[];
}

export class OceanMusicManager {
  private static instance: OceanMusicManager;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: TrackName = 'none';
  private activeTrack: ActiveTrack | null = null;
  private muted: boolean = false;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): OceanMusicManager {
    if (!OceanMusicManager.instance) {
      OceanMusicManager.instance = new OceanMusicManager();
    }
    return OceanMusicManager.instance;
  }

  /**
   * Must be called once on first user interaction (click/tap).
   * AudioContext requires a user gesture to start on mobile.
   * Call this from your Play button handler or first tap in App.tsx.
   */
  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;

      // Read muted state from SaveManager
      this.muted = saveManager.musicMuted;
      this.masterGain.gain.value = this.muted ? 0 : 0.55;
    } catch (e) {
      console.warn('OceanMusicManager: Web Audio API not available', e);
    }
  }

  /** Call when music toggle changes in SettingsScene */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(
        muted ? 0 : 0.55,
        now + 0.3
      );
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Call from MainMenuScene and GameOverScene */
  setMenuTrack(): void {
    this.switchTo('menu');
  }

  /** Call from GameScene when gameplay begins */
  setGameTrack(): void {
    this.switchTo('game');
  }

  /**
   * Call every frame from GameScene.update() passing current speed.
   * Automatically crossfades between 'game' and 'intense' tracks.
   */
  updateGameSpeed(currentSpeed: number): void {
    if (this.currentTrack === 'menu' || this.currentTrack === 'none') return;

    if (currentSpeed >= INTENSE_SPEED_THRESHOLD && this.currentTrack !== 'intense') {
      this.switchTo('intense');
    } else if (currentSpeed < INTENSE_SPEED_THRESHOLD && this.currentTrack !== 'game') {
      this.switchTo('game');
    }
  }

  /** Stop all music immediately */
  stop(): void {
    this.stopActiveTrack(0);
    this.currentTrack = 'none';
  }

  // ─────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────

  private switchTo(track: TrackName): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    if (this.currentTrack === track) return;

    this.stopActiveTrack(CROSSFADE_DURATION);
    this.currentTrack = track;

    if (this.ctx.state === 'suspended') this.ctx.resume();

    switch (track) {
      case 'menu':    this.playDeepOcean(); break;
      case 'game':    this.playBioluminescent(); break;
      case 'intense': this.playSurvivalMode(); break;
    }
  }

  private stopActiveTrack(fadeDuration: number): void {
    if (!this.activeTrack || !this.ctx) return;
    const { gainNode, nodes, timers } = this.activeTrack;

    // Clear all scheduled timeouts
    timers.forEach(t => clearTimeout(t));

    // Fade out then stop all nodes
    const now = this.ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);

    setTimeout(() => {
      nodes.forEach(n => {
        try {
          (n as OscillatorNode).stop?.();
          (n as AudioBufferSourceNode).stop?.();
          n.disconnect();
        } catch (_) {}
      });
    }, (fadeDuration + 0.1) * 1000);

    this.activeTrack = null;
  }

  private createTrack(): ActiveTrack {
    const gainNode = this.ctx!.createGain();
    gainNode.gain.setValueAtTime(0, this.ctx!.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, this.ctx!.currentTime + CROSSFADE_DURATION);
    gainNode.connect(this.masterGain!);
    return { nodes: [gainNode], gainNode, timers: [] };
  }

  private register(track: ActiveTrack, ...nodes: AudioNode[]): void {
    track.nodes.push(...nodes);
  }

  private schedule(track: ActiveTrack, fn: () => void, delay: number): void {
    track.timers.push(setTimeout(fn, delay));
  }

  // ─────────────────────────────────────────────
  // TRACK 0: Deep Ocean Drift (Menu / Game Over)
  // ─────────────────────────────────────────────
  private playDeepOcean(): void {
    const ctx = this.ctx!;
    const track = this.createTrack();
    this.activeTrack = track;

    const makeDrone = (freq: number, gain: number, detune = 0) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      g.gain.value = gain;
      osc.connect(filter);
      filter.connect(g);
      g.connect(track.gainNode);
      osc.start();
      this.register(track, osc, g, filter);
    };

    makeDrone(55, 0.18);
    makeDrone(82.4, 0.10);
    makeDrone(110, 0.08, 5);

    // Slow LFO volume swell
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(track.gainNode);
    lfo.start();
    this.register(track, lfo, lfoGain);

    // Water noise
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 180;
    noiseFilter.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.025;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(track.gainNode);
    noise.start();
    this.register(track, noise, noiseFilter, noiseGain);

    // Bubbles
    const bubble = () => {
      if (this.activeTrack !== track) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300 + Math.random() * 400, t);
      osc.frequency.exponentialRampToValueAtTime(600 + Math.random() * 300, t + 0.08);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.03, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g);
      g.connect(track.gainNode);
      osc.start(t);
      osc.stop(t + 0.15);
      this.register(track, osc, g);
      this.schedule(track, bubble, 800 + Math.random() * 2000);
    };
    this.schedule(track, bubble, 500);

    // Whale-like sweeps
    const sweep = () => {
      if (this.activeTrack !== track) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80 + Math.random() * 40, t);
      osc.frequency.linearRampToValueAtTime(120 + Math.random() * 60, t + 3);
      osc.frequency.linearRampToValueAtTime(60 + Math.random() * 30, t + 6);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 1.5);
      g.gain.linearRampToValueAtTime(0, t + 6);
      osc.connect(g);
      g.connect(track.gainNode);
      osc.start(t);
      osc.stop(t + 6.5);
      this.register(track, osc, g);
      this.schedule(track, sweep, 7000 + Math.random() * 5000);
    };
    this.schedule(track, sweep, 2000);
  }

  // ─────────────────────────────────────────────
  // TRACK 1: Bioluminescent (Normal Gameplay)
  // ─────────────────────────────────────────────
  private playBioluminescent(): void {
    const ctx = this.ctx!;
    const track = this.createTrack();
    this.activeTrack = track;

    // Chord progressions
    const chordFreqs = [
      [220, 261.63, 329.63],
      [246.94, 293.66, 369.99],
      [196, 261.63, 311.13],
      [220, 277.18, 349.23],
    ];
    let chordIdx = 0;

    const playChord = () => {
      if (this.activeTrack !== track) return;
      const chord = chordFreqs[chordIdx % chordFreqs.length];
      chordIdx++;
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t = ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = i * 3;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.055, t + 0.8);
        g.gain.linearRampToValueAtTime(0.035, t + 2);
        g.gain.linearRampToValueAtTime(0, t + 4);
        osc.connect(g);
        g.connect(track.gainNode);
        osc.start(t);
        osc.stop(t + 4.5);
        this.register(track, osc, g);
      });
      this.schedule(track, playChord, 3500);
    };
    playChord();

    // Melody
    const melodyNotes = [440, 493.88, 523.25, 587.33, 440, 392, 349.23, 440, 523.25, 587.33, 659.25, 587.33, 523.25];
    const melodyGaps =  [400, 600,    400,    800,    400, 600, 1200,   400, 600,    400,    800,    600,    1600];
    let melIdx = 0;

    const playMelody = () => {
      if (this.activeTrack !== track) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.value = melodyNotes[melIdx % melodyNotes.length];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.065, t + 0.1);
      g.gain.linearRampToValueAtTime(0.045, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(g);
      g.connect(track.gainNode);
      osc.start(t);
      osc.stop(t + 0.9);
      this.register(track, osc, g);
      const delay = melodyGaps[melIdx % melodyGaps.length];
      melIdx++;
      this.schedule(track, playMelody, delay);
    };
    this.schedule(track, playMelody, 1000);

    // Shimmer high notes
    const glimmerNotes = [880, 1046.5, 1174.66, 1318.5, 1567.98];
    const glimmer = () => {
      if (this.activeTrack !== track) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.value = glimmerNotes[Math.floor(Math.random() * glimmerNotes.length)];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.028, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(g);
      g.connect(track.gainNode);
      osc.start(t);
      osc.stop(t + 0.65);
      this.register(track, osc, g);
      this.schedule(track, glimmer, 600 + Math.random() * 1400);
    };
    this.schedule(track, glimmer, 500);

    // Deep drone underneath
    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    const droneFilter = ctx.createBiquadFilter();
    drone.type = 'sine';
    drone.frequency.value = 55;
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 200;
    droneGain.gain.value = 0.07;
    drone.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(track.gainNode);
    drone.start();
    this.register(track, drone, droneGain, droneFilter);

    // Gentle bubbles
    const gentleBubble = () => {
      if (this.activeTrack !== track) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200 + Math.random() * 300, t);
      osc.frequency.exponentialRampToValueAtTime(400 + Math.random() * 200, t + 0.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.022, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g);
      g.connect(track.gainNode);
      osc.start(t);
      osc.stop(t + 0.18);
      this.register(track, osc, g);
      this.schedule(track, gentleBubble, 1200 + Math.random() * 2800);
    };
    this.schedule(track, gentleBubble, 800);
  }

  // ─────────────────────────────────────────────
  // TRACK 2: Survival Mode (Intense / Max Speed)
  // ─────────────────────────────────────────────
  private playSurvivalMode(): void {
    const ctx = this.ctx!;
    const track = this.createTrack();
    this.activeTrack = track;

    // Pulsing bass
    const bassNotes = [55, 55, 82.4, 55, 55, 73.4, 55, 55];
    let noteIdx = 0;
    const pulseBass = () => {
      if (this.activeTrack !== track) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.value = bassNotes[noteIdx % bassNotes.length];
      noteIdx++;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g);
      g.connect(track.gainNode);
      osc.start(t);
      osc.stop(t + 0.4);
      this.register(track, osc, g);
      this.schedule(track, pulseBass, 380);
    };
    pulseBass();

    // Tension pads with LFO tremolo
    [110, 164.8, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = i * 7;
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      filter.Q.value = 2;
      g.gain.value = 0.038;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 4 + i * 0.3;
      lfoG.gain.value = 0.018;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      osc.connect(filter);
      filter.connect(g);
      g.connect(track.gainNode);
      osc.start();
      lfo.start();
      this.register(track, osc, g, filter, lfo, lfoG);
    });

    // Urgent fast bubbles
    const urgentBubble = () => {
      if (this.activeTrack !== track) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + Math.random() * 600, t);
      osc.frequency.exponentialRampToValueAtTime(800 + Math.random() * 400, t + 0.05);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(g);
      g.connect(track.gainNode);
      osc.start(t);
      osc.stop(t + 0.1);
      this.register(track, osc, g);
      this.schedule(track, urgentBubble, 300 + Math.random() * 800);
    };
    urgentBubble();

    // High tension shimmer
    const shimmerNotes = [440, 493.88, 523.25, 587.33, 659.25];
    const shimmer = () => {
      if (this.activeTrack !== track) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.value = shimmerNotes[Math.floor(Math.random() * shimmerNotes.length)];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.038, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g);
      g.connect(track.gainNode);
      osc.start(t);
      osc.stop(t + 0.45);
      this.register(track, osc, g);
      this.schedule(track, shimmer, 200 + Math.random() * 600);
    };
    this.schedule(track, shimmer, 400);
  }
}
