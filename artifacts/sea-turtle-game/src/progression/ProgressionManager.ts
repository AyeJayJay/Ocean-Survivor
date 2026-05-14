/*
 * ProgressionManager — environmental restoration system
 *
 * Tracks survival time within a run and advances restoration stages.
 * Each stage brightens the ocean, grows coral reefs, and introduces ambient
 * sea creatures. All rendering is purely visual — no gameplay effect.
 *
 * Stages:
 *   0 —   0–15s  : dark polluted ocean (default)
 *   1 —  15–40s  : clearing water, coral sprouts appear
 *   2 —  40–80s  : coral grows, small fish swim through
 *   3 —  80–150s : thriving reef, starfish visible, milestone reached
 *   4 — 150s+    : full restoration, dense life
 *
 * The milestone (stage ≥ 3) unlocks the Coral Turtle skin.
 */

import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../game/GameConfig";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CoralBranch {
  x: number;     // x position in world space (scrolled)
  y: number;     // base y on seafloor
  height: number;
  spread: number;
  color: number;
  phase: number; // for gentle sway
}

interface AmbientFish {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: number;
  dir: 1 | -1;  // 1 = right (scrolls left relative to world)
}

interface Starfish {
  x: number;
  y: number;
  color: number;
  radius: number;
  phase: number;
}

// ── Time thresholds (seconds) ─────────────────────────────────────────────────

const STAGE_TIMES = [0, 15, 40, 80, 150] as const;

// ── ProgressionManager ────────────────────────────────────────────────────────

export class ProgressionManager {
  private scene: Phaser.Scene;
  private coralGfx: Phaser.GameObjects.Graphics;
  private creatureGfx: Phaser.GameObjects.Graphics;

  private elapsed = 0;   // total seconds alive this run
  private _stage = 0;

  private corals: CoralBranch[] = [];
  private fish: AmbientFish[] = [];
  private starfish: Starfish[] = [];

  private fishSpawnTimer = 0;
  private milestoneReached = false;
  private onMilestone: (() => void) | null = null;

  get stage(): number { return this._stage; }
  get reachedMilestone(): boolean { return this.milestoneReached; }

  /** Fraction 0–1 representing how "bright/restored" the ocean is. */
  get brightnessFactor(): number {
    return Math.min(this._stage / 4, 1);
  }

  /** Total seconds survived this run — used for the restoration HUD bar. */
  get survivalSeconds(): number { return this.elapsed; }

  constructor(scene: Phaser.Scene, onMilestoneReached?: () => void) {
    this.scene = scene;
    this.onMilestone = onMilestoneReached ?? null;

    this.coralGfx = scene.add.graphics().setDepth(2);
    this.creatureGfx = scene.add.graphics().setDepth(3);

    this.buildInitialCorals();
    this.buildInitialStarfish();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  reset(): void {
    this.elapsed = 0;
    this._stage = 0;
    this.milestoneReached = false;
    this.fish = [];
    this.fishSpawnTimer = 0;
    this.buildInitialCorals();
    this.buildInitialStarfish();
  }

  update(dt: number, scrollX: number): void {
    this.elapsed += dt;

    // Stage advancement
    let newStage = 0;
    for (let i = STAGE_TIMES.length - 1; i >= 0; i--) {
      if (this.elapsed >= STAGE_TIMES[i]) { newStage = i; break; }
    }

    if (newStage > this._stage) {
      this._stage = newStage;
      // Milestone: stage 3 = ocean health restored enough for Coral Turtle
      if (this._stage >= 3 && !this.milestoneReached) {
        this.milestoneReached = true;
        this.onMilestone?.();
      }
    }

    // Fish spawning — only when there's something to show
    if (this._stage >= 2) {
      this.fishSpawnTimer -= dt;
      if (this.fishSpawnTimer <= 0) {
        this.spawnFish();
        // Spawn rate increases with stage
        this.fishSpawnTimer = this._stage >= 4 ? 1.5 : 3.0;
      }

      // Move fish
      for (const f of this.fish) {
        f.x -= (f.speed + 0) * dt; // fish swim left (same direction as scroll)
      }
      this.fish = this.fish.filter(f => f.x > -60);
    }

    this.draw(scrollX);
  }

  destroy(): void {
    this.coralGfx.destroy();
    this.creatureGfx.destroy();
  }

  // ── Coral generation ──────────────────────────────────────────────────────

  private buildInitialCorals(): void {
    this.corals = [];
    const rng = Phaser.Math.Between;
    // Spread corals across a 3× wide world strip, will wrap/scroll
    for (let i = 0; i < 28; i++) {
      this.corals.push({
        x: rng(0, GAME_WIDTH * 3),
        y: GAME_HEIGHT - rng(0, 30),
        height: rng(24, 80),
        spread: rng(12, 32),
        color: Phaser.Display.Color.RandomRGB().color,
        phase: Math.random() * Math.PI * 2,
      });
    }
    // Force some vibrant coral colors
    const coralColors = [0xff6b6b, 0xff8c42, 0xffd166, 0x06d6a0, 0x118ab2, 0xef476f, 0xf78c6b];
    for (let i = 0; i < this.corals.length; i++) {
      this.corals[i].color = coralColors[i % coralColors.length];
    }
  }

  private buildInitialStarfish(): void {
    this.starfish = [];
    const rng = Phaser.Math.Between;
    const sfColors = [0xff6b6b, 0xffd166, 0xf78c6b, 0xff9a3c, 0xef476f];
    for (let i = 0; i < 14; i++) {
      this.starfish.push({
        x: rng(0, GAME_WIDTH * 3),
        y: GAME_HEIGHT - rng(4, 20),
        color: sfColors[i % sfColors.length],
        radius: rng(7, 14),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private spawnFish(): void {
    const fishColors = [0x70d4ff, 0xffd84a, 0xff9f7f, 0xa0e0ff, 0xc8f080];
    this.fish.push({
      x: GAME_WIDTH + 40,
      y: Phaser.Math.Between(Math.floor(GAME_HEIGHT * 0.2), Math.floor(GAME_HEIGHT * 0.85)),
      speed: Phaser.Math.Between(50, 120),
      size: Phaser.Math.Between(5, 12),
      color: fishColors[Math.floor(Math.random() * fishColors.length)],
      dir: 1,
    });
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  private draw(scrollX: number): void {
    if (this._stage === 0) {
      this.coralGfx.clear();
      this.creatureGfx.clear();
      return;
    }

    const t = this.scene.time.now / 1000;

    // ── Coral ─────────────────────────────────────────────────────────────
    const cg = this.coralGfx;
    cg.clear();

    // Alpha based on stage — fade in gradually
    const coralAlpha = Math.min((this._stage - 1) * 0.38, 0.92);

    for (const coral of this.corals) {
      const sway = Math.sin(t * 0.6 + coral.phase) * 3;

      // World-to-screen x with parallax (corals on seafloor, slow scroll)
      const worldX = ((coral.x - scrollX * 0.15) % (GAME_WIDTH * 3) + GAME_WIDTH * 3) % (GAME_WIDTH * 3) - GAME_WIDTH;
      if (worldX < -coral.spread - 20 || worldX > GAME_WIDTH + coral.spread + 20) continue;

      const bx = worldX + sway * 0.5;
      const by = coral.y;

      // Stem
      cg.lineStyle(3, coral.color, coralAlpha * 0.85);
      cg.beginPath();
      cg.moveTo(bx, by);
      cg.lineTo(bx + sway, by - coral.height * 0.6);
      cg.lineTo(bx + sway * 1.5, by - coral.height);
      cg.strokePath();

      // Branches
      const branchCount = this._stage >= 3 ? 4 : 2;
      for (let b = 0; b < branchCount; b++) {
        const frac = 0.3 + b * 0.2;
        const branchX = bx + sway * frac;
        const branchY = by - coral.height * frac;
        const branchDir = b % 2 === 0 ? 1 : -1;
        cg.lineStyle(2, coral.color, coralAlpha * 0.7);
        cg.beginPath();
        cg.moveTo(branchX, branchY);
        cg.lineTo(branchX + coral.spread * 0.4 * branchDir, branchY - coral.spread * 0.4);
        cg.strokePath();
        // Polyp at branch tip
        cg.fillStyle(coral.color, coralAlpha);
        cg.fillCircle(
          branchX + coral.spread * 0.4 * branchDir,
          branchY - coral.spread * 0.4,
          this._stage >= 3 ? 4 : 2.5
        );
      }

      // Crown
      cg.fillStyle(coral.color, coralAlpha);
      cg.fillCircle(bx + sway * 1.5, by - coral.height, this._stage >= 4 ? 6 : 4);
    }

    // ── Starfish (stage 3+) ────────────────────────────────────────────────
    if (this._stage >= 3) {
      const sfAlpha = Math.min((this._stage - 2) * 0.5, 0.85);
      for (const sf of this.starfish) {
        const worldX = ((sf.x - scrollX * 0.1) % (GAME_WIDTH * 3) + GAME_WIDTH * 3) % (GAME_WIDTH * 3) - GAME_WIDTH;
        if (worldX < -30 || worldX > GAME_WIDTH + 30) continue;
        this.drawStarfish(cg, worldX, sf.y, sf.radius, sf.color, sfAlpha, t + sf.phase);
      }
    }

    // ── Ambient fish (stage 2+) ────────────────────────────────────────────
    const fg = this.creatureGfx;
    fg.clear();

    if (this._stage >= 2) {
      const fishAlpha = Math.min((this._stage - 1) * 0.5, 0.82);
      for (const f of this.fish) {
        this.drawFish(fg, f.x, f.y, f.size, f.color, fishAlpha);
      }
    }
  }

  private drawStarfish(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    r: number, color: number, alpha: number,
    t: number,
  ): void {
    const pulse = 1 + Math.sin(t * 0.5) * 0.08;
    const pr = r * pulse;
    g.fillStyle(color, alpha);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? pr : pr * 0.45;
      const px = x + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    // Center dot
    g.fillStyle(0xffffff, alpha * 0.5);
    g.fillCircle(x, y, pr * 0.2);
  }

  private drawFish(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    size: number, color: number, alpha: number,
  ): void {
    g.fillStyle(color, alpha);
    // Body (ellipse approximated by filled path)
    g.fillEllipse(x, y, size * 2.2, size * 1.2);
    // Tail fin
    g.beginPath();
    g.moveTo(x - size * 1.1, y);
    g.lineTo(x - size * 2, y - size * 0.7);
    g.lineTo(x - size * 2, y + size * 0.7);
    g.closePath();
    g.fillPath();
    // Eye
    g.fillStyle(0x000000, alpha);
    g.fillCircle(x + size * 0.65, y - size * 0.12, size * 0.18);
  }
}
