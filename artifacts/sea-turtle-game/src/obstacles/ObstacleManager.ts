import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  OBSTACLE_WIDTH,
  OBSTACLE_TYPES,
  ObstacleType,
  OBSTACLE_SPACING,
  INITIAL_GAP,
  INITIAL_SPEED,
  SPAWN_MARGIN,
  SHELL_RADIUS,
  SHELL_SPEED_RATIO,
  SHELL_INTERVAL_MIN_MS,
  SHELL_INTERVAL_MAX_MS,
  PLAYER_RADIUS,
} from "../game/GameConfig";
// ── Types ──────────────────────────────────────────────────────────────────────

interface ObstaclePair {
  x: number;     // left edge (scrolls left)
  gapY: number;  // y where gap starts (top)
  gap: number;   // gap height in px
  type: ObstacleType;
  scored: boolean;
}

interface Shell {
  id: number;
  x: number;
  y: number;
  baseY: number;
  phase: number; // for bobbing
  collected: boolean;
}

// ── Pillar palette per obstacle type ──────────────────────────────────────────

interface TypePalette {
  pillar: number;   // main pillar fill color
  pillarAlpha: number;
  edge: number;     // inner edge accent color
  accent: number;   // decoration color
  accentAlpha: number;
}

const PALETTES: Record<ObstacleType, TypePalette> = {
  plastic_bag:  { pillar: 0x8ab8d0, pillarAlpha: 0.82, edge: 0xaad4ec, accent: 0xddf2ff, accentAlpha: 0.9 },
  fishing_net:  { pillar: 0x7a5a22, pillarAlpha: 0.88, edge: 0xb08040, accent: 0xd0a058, accentAlpha: 0.95 },
  oil_blob:     { pillar: 0x100c06, pillarAlpha: 0.96, edge: 0x201408, accent: 0x3c2010, accentAlpha: 1.0 },
  soda_rings:   { pillar: 0x7a1a08, pillarAlpha: 0.90, edge: 0xb02412, accent: 0xd84828, accentAlpha: 0.95 },
  jellyfish:    { pillar: 0x1a3a68, pillarAlpha: 0.62, edge: 0x2a60a0, accent: 0x70c0ff, accentAlpha: 0.80 },
  shark:        { pillar: 0x283040, pillarAlpha: 0.90, edge: 0x3c5070, accent: 0x607090, accentAlpha: 0.95 },
  fishing_hook: { pillar: 0x4c2c10, pillarAlpha: 0.88, edge: 0x6c4020, accent: 0x9c6030, accentAlpha: 0.90 },
  boat:         { pillar: 0x2e1c08, pillarAlpha: 0.92, edge: 0x4e3018, accent: 0x7c5030, accentAlpha: 0.95 },
};

// ── ObstacleManager ────────────────────────────────────────────────────────────

export class ObstacleManager {
  private scene: Phaser.Scene;
  private gfx: Phaser.GameObjects.Graphics;
  private shellGfx: Phaser.GameObjects.Graphics;

  private obstacles: ObstaclePair[] = [];
  private shells: Shell[] = [];
  private shellIdCounter = 0;
  private shellTimer = 0;
  private nextShellInterval: number = SHELL_INTERVAL_MIN_MS + Math.random() * (SHELL_INTERVAL_MAX_MS - SHELL_INTERVAL_MIN_MS);

  private speed: number = INITIAL_SPEED;
  private currentGap: number = INITIAL_GAP;
  private nextSpawnX: number = GAME_WIDTH + 80;
  private typeIndex = 0;
  private tick = 0;

  private _shellsCollected = 0;

  get shellsCollected(): number { return this._shellsCollected; }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(5);

    this.shellGfx = scene.add.graphics();
    this.shellGfx.setDepth(8);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  reset(speed: number, gap: number): void {
    this.obstacles = [];
    this.shells = [];
    this.shellTimer = 0;
    this.nextShellInterval = SHELL_INTERVAL_MIN_MS + Math.random() * (SHELL_INTERVAL_MAX_MS - SHELL_INTERVAL_MIN_MS);
    this._shellsCollected = 0;
    this.speed = speed;
    this.currentGap = gap;
    this.nextSpawnX = GAME_WIDTH + 80;
    this.typeIndex = 0;
    this.tick = 0;
    this.gfx.clear();
    this.shellGfx.clear();
  }

  /** Called every game frame. delta is ms since last frame. */
  update(delta: number): void {
    this.tick++;
    const dt = delta / 1000;

    // ── Move & cull obstacles ─────────────────────────────────────────────────
    for (const obs of this.obstacles) {
      obs.x -= this.speed * dt;
    }
    this.obstacles = this.obstacles.filter(o => o.x > -OBSTACLE_WIDTH - 20);

    // ── Spawn new pair ────────────────────────────────────────────────────────
    this.nextSpawnX -= this.speed * dt;
    if (this.nextSpawnX <= GAME_WIDTH) {
      this.spawnPair();
      this.nextSpawnX += OBSTACLE_SPACING;
    }

    // ── Move & cull shells ────────────────────────────────────────────────────
    const shellSpeed = this.speed * SHELL_SPEED_RATIO;
    for (const sh of this.shells) {
      sh.x -= shellSpeed * dt;
    }
    this.shells = this.shells.filter(s => !s.collected && s.x > -40);

    // ── Shell spawn timer (randomised interval keeps players alert) ───────────
    this.shellTimer += delta;
    if (this.shellTimer >= this.nextShellInterval && this.obstacles.length > 0) {
      this.shellTimer = 0;
      this.nextShellInterval = SHELL_INTERVAL_MIN_MS + Math.random() * (SHELL_INTERVAL_MAX_MS - SHELL_INTERVAL_MIN_MS);
      this.spawnShell();
    }

    // ── Redraw ───────────────────────────────────────────────────────────────
    this.drawObstacles();
    this.drawShells();
  }

  setSpeed(s: number): void { this.speed = s; }
  setGap(g: number): void   { this.currentGap = g; }

  // ── Collision helpers ────────────────────────────────────────────────────────

  /** Returns true if the circle (player) hits any obstacle pillar. */
  checkObstacleCollision(px: number, py: number): boolean {
    const r = PLAYER_RADIUS;
    for (const obs of this.obstacles) {
      const inColumnX = px + r > obs.x + 4 && px - r < obs.x + OBSTACLE_WIDTH - 4;
      if (!inColumnX) continue;
      // Top pillar: y=0 to gapY
      if (py - r < obs.gapY) return true;
      // Bottom pillar: gapY+gap to GAME_HEIGHT
      if (py + r > obs.gapY + obs.gap) return true;
    }
    return false;
  }

  /** Returns how many obstacles the player has just cleared (for scoring). */
  countNewlyScored(playerX: number): number {
    let count = 0;
    for (const obs of this.obstacles) {
      if (!obs.scored && obs.x + OBSTACLE_WIDTH < playerX - PLAYER_RADIUS) {
        obs.scored = true;
        count++;
      }
    }
    return count;
  }

  /** Returns true if player collected a shell (caller handles sound). */
  checkShellCollision(px: number, py: number): boolean {
    let collected = false;
    for (const sh of this.shells) {
      if (sh.collected) continue;
      const dx = px - sh.x;
      const dy = py - sh.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PLAYER_RADIUS + SHELL_RADIUS - 4) {
        sh.collected = true;
        this._shellsCollected++;
        collected = true;
      }
    }
    return collected;
  }

  /**
   * Returns true if the player circle is close to (but not colliding with)
   * any obstacle pillar edge — used for near-miss detection.
   *
   * @param px player x
   * @param py player y
   * @param playerR player collision radius
   * @param threshold extra px beyond playerR to consider "near"
   */
  isNearMiss(px: number, py: number, playerR: number, threshold: number): boolean {
    const nearR = playerR + threshold;
    for (const obs of this.obstacles) {
      // Only check obstacles near the player horizontally
      const rightEdge = obs.x + OBSTACLE_WIDTH;
      if (px + nearR < obs.x || px - nearR > rightEdge) continue;
      if (px + playerR > obs.x + 4 && px - playerR < rightEdge - 4) continue; // would collide

      // Check if vertically close to the gap edges
      const topEdge = obs.gapY;
      const botEdge = obs.gapY + obs.gap;

      // Player must be inside the gap (not colliding)
      if (py - playerR < topEdge || py + playerR > botEdge) continue;

      // Near top pillar edge
      if (Math.abs(py - playerR - topEdge) < threshold) return true;
      // Near bottom pillar edge
      if (Math.abs(botEdge - (py + playerR)) < threshold) return true;
    }
    return false;
  }

  /**
   * Removes all obstacles and shells that are behind or within `clearAheadPx`
   * pixels in front of the player's X position.  Call this on revive so the
   * turtle respawns into a clean lane instead of the obstacle that killed it.
   */
  clearNearPlayer(playerX: number, clearAheadPx = 260): void {
    this.obstacles = this.obstacles.filter(obs => obs.x > playerX + clearAheadPx);
    this.shells    = this.shells.filter(sh  => sh.x  > playerX + clearAheadPx);
  }

  destroy(): void {
    this.gfx.destroy();
    this.shellGfx.destroy();
  }

  // ── Spawning ─────────────────────────────────────────────────────────────────

  private spawnPair(): void {
    const minGapCenter = SPAWN_MARGIN + this.currentGap / 2;
    const maxGapCenter = GAME_HEIGHT - SPAWN_MARGIN - this.currentGap / 2;
    const gapCenter = Phaser.Math.Between(minGapCenter, maxGapCenter);
    const gapY = gapCenter - this.currentGap / 2;

    const type = OBSTACLE_TYPES[this.typeIndex % OBSTACLE_TYPES.length];
    this.typeIndex++;

    this.obstacles.push({
      x: GAME_WIDTH + 10,
      gapY,
      gap: this.currentGap,
      type,
      scored: false,
    });
  }

  private spawnShell(): void {
    // Place shell in the middle of the last obstacle's gap if available
    if (this.obstacles.length === 0) return;
    const lastObs = this.obstacles[this.obstacles.length - 1];
    const midGapY = lastObs.gapY + lastObs.gap / 2;
    // Offset slightly so it's not perfectly centered
    const offsetY = Phaser.Math.Between(-25, 25);
    this.shells.push({
      id: this.shellIdCounter++,
      x: lastObs.x + OBSTACLE_WIDTH / 2 + OBSTACLE_SPACING / 2,
      y: midGapY + offsetY,
      baseY: midGapY + offsetY,
      phase: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  // ── Drawing ───────────────────────────────────────────────────────────────────

  private drawObstacles(): void {
    const g = this.gfx;
    g.clear();

    for (const obs of this.obstacles) {
      this.drawPair(g, obs, this.tick);
    }
  }

  private drawPair(g: Phaser.GameObjects.Graphics, obs: ObstaclePair, tick: number): void {
    const { x, gapY, gap, type } = obs;
    const p = PALETTES[type];
    const topH = gapY;
    const botY = gapY + gap;
    const botH = GAME_HEIGHT - botY;
    const w = OBSTACLE_WIDTH;

    // ── Top pillar ────────────────────────────────────────────────────────────
    g.fillStyle(p.pillar, p.pillarAlpha);
    g.fillRect(x, 0, w, topH);

    // Inner edge (facing gap) — darker band for depth
    g.fillStyle(p.edge, 0.35);
    g.fillRect(x, topH - 12, w, 12);

    // Left/right edge shadows for 3D feel
    g.fillStyle(0x000000, 0.18);
    g.fillRect(x, 0, 6, topH);
    g.fillRect(x + w - 6, 0, 6, topH);

    // ── Bottom pillar ─────────────────────────────────────────────────────────
    g.fillStyle(p.pillar, p.pillarAlpha);
    g.fillRect(x, botY, w, botH);

    g.fillStyle(p.edge, 0.35);
    g.fillRect(x, botY, w, 12);

    g.fillStyle(0x000000, 0.18);
    g.fillRect(x, botY, 6, botH);
    g.fillRect(x + w - 6, botY, 6, botH);

    // ── Type-specific decorations ─────────────────────────────────────────────
    this.drawTypeDecoration(g, obs, p, tick);
  }

  private drawTypeDecoration(
    g: Phaser.GameObjects.Graphics,
    obs: ObstaclePair,
    p: TypePalette,
    tick: number,
  ): void {
    const { x, gapY, gap, type } = obs;
    const w = OBSTACLE_WIDTH;
    const cx = x + w / 2;
    const botY = gapY + gap;

    switch (type) {

      // ── Plastic bags ────────────────────────────────────────────────────────
      case "plastic_bag": {
        // Bag body at top pillar tip
        const bagW = 48, bagH = 28;
        g.fillStyle(p.accent, 0.62);
        g.fillRect(cx - bagW / 2, gapY - bagH, bagW, bagH);
        g.fillEllipse(cx, gapY - 1, bagW, 10);
        // Bag handles
        g.lineStyle(3, p.accent, 0.85);
        g.strokeEllipse(cx - 12, gapY - bagH - 4, 14, 12);
        g.strokeEllipse(cx + 12, gapY - bagH - 4, 14, 12);
        // Crinkle sheen lines in pillar
        g.lineStyle(1, 0xffffff, 0.22);
        for (let i = 0; i < 3; i++) {
          const lx = x + 12 + i * 22;
          g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, gapY - bagH); g.strokePath();
        }
        // Floating wisps off pillar edge
        g.fillStyle(p.accent, 0.38);
        g.fillEllipse(cx - 26, gapY - 46, 9, 22);
        g.fillEllipse(cx + 23, gapY - 54, 7, 18);

        // Bottom pillar bag (floating upward)
        const bbagW = 40;
        g.fillStyle(p.accent, 0.57);
        g.fillRect(cx - bbagW / 2, botY, bbagW, 24);
        g.fillEllipse(cx, botY + 24, bbagW, 10);
        g.lineStyle(3, p.accent, 0.80);
        g.strokeEllipse(cx - 10, botY + 28, 12, 10);
        g.strokeEllipse(cx + 10, botY + 28, 12, 10);
        g.lineStyle(1, 0xffffff, 0.18);
        for (let i = 0; i < 3; i++) {
          const lx = x + 12 + i * 22;
          g.beginPath(); g.moveTo(lx, botY + 34); g.lineTo(lx, GAME_HEIGHT); g.strokePath();
        }
        break;
      }

      // ── Fishing net ─────────────────────────────────────────────────────────
      case "fishing_net": {
        const gridSpacing = 16;
        // Orthogonal grid
        g.lineStyle(1, p.accent, 0.42);
        for (let lx = x; lx <= x + w; lx += gridSpacing) {
          g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, gapY); g.strokePath();
          g.beginPath(); g.moveTo(lx, botY); g.lineTo(lx, GAME_HEIGHT); g.strokePath();
        }
        for (let ly = 0; ly < gapY; ly += gridSpacing) {
          g.beginPath(); g.moveTo(x, ly); g.lineTo(x + w, ly); g.strokePath();
        }
        for (let ly = botY; ly < GAME_HEIGHT; ly += gridSpacing) {
          g.beginPath(); g.moveTo(x, ly); g.lineTo(x + w, ly); g.strokePath();
        }
        // Diagonal \\ lines for diamond-mesh effect — top pillar
        g.lineStyle(1, p.accent, 0.22);
        const dStep = 18;
        for (let dy = -w; dy <= gapY; dy += dStep) {
          const sx = x + Math.max(0, -dy);
          const sy = Math.max(0, dy);
          const ex = x + Math.min(w, gapY - dy);
          const ey = Math.min(gapY, dy + w);
          if (sx < x + w && ex > x && sy < gapY && ey > 0) {
            g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.strokePath();
          }
        }
        // Bottom pillar diagonals
        for (let dy = botY - w; dy <= GAME_HEIGHT; dy += dStep) {
          const sy = Math.max(botY, dy);
          const sx2 = x + Math.max(0, sy - dy);
          const ey = Math.min(GAME_HEIGHT, dy + w);
          const ex2 = x + Math.min(w, ey - dy);
          if (sx2 < x + w && ex2 > x && sy < GAME_HEIGHT) {
            g.beginPath(); g.moveTo(sx2, sy); g.lineTo(ex2, ey); g.strokePath();
          }
        }
        // Frayed rope edges dangling into gap
        g.lineStyle(2, p.accent, 0.90);
        for (let i = 0; i < 6; i++) {
          const fx2 = x + 5 + i * (w - 10) / 5;
          const fLen = 10 + (i % 3) * 7;
          g.beginPath();
          g.moveTo(fx2, gapY); g.lineTo(fx2 + (i % 2 === 0 ? 2 : -2), gapY + fLen); g.strokePath();
          g.beginPath();
          g.moveTo(fx2, botY); g.lineTo(fx2 + (i % 2 === 0 ? 2 : -2), botY - fLen); g.strokePath();
        }
        break;
      }

      // ── Oil blob ─────────────────────────────────────────────────────────────
      case "oil_blob": {
        // Animated iridescent rainbow sheen
        const iriColors = [0x4040ff, 0x0060ff, 0x008060, 0x406000, 0x603000];
        for (let ci = 0; ci < iriColors.length; ci++) {
          const iriAlpha = 0.05 + 0.035 * Math.sin(tick * 0.018 + ci * 1.2);
          g.fillStyle(iriColors[ci], iriAlpha);
          const offX = ci * 8 - 16;
          g.fillEllipse(cx + offX, gapY - 9, 32, 15);
          g.fillEllipse(cx + offX, botY + 9, 32, 15);
        }
        // Dark oil mass at pillar tips
        g.fillStyle(0x1a0a02, 0.82);
        g.fillEllipse(cx, gapY - 12, 56, 22);
        g.fillEllipse(cx, botY + 12, 56, 22);
        // Surface drip bubbles
        g.fillStyle(0x0a0400, 0.55);
        for (let i = 0; i < 4; i++) {
          const bx = x + 9 + i * 18;
          g.fillEllipse(bx, gapY - 7, 9, 11);
          g.fillEllipse(bx, botY + 7, 9, 11);
        }
        break;
      }

      // ── Soda rings ──────────────────────────────────────────────────────────
      case "soda_rings": {
        // Can body seam lines
        g.fillStyle(p.accent, 0.9);
        const canSpacing = 18;
        for (let cy2 = canSpacing; cy2 < gapY; cy2 += canSpacing) {
          g.fillRect(x + 4, cy2 - 2, w - 8, 4);
        }
        for (let cy2 = botY + canSpacing; cy2 < GAME_HEIGHT; cy2 += canSpacing) {
          g.fillRect(x + 4, cy2 - 2, w - 8, 4);
        }
        // Six-pack plastic carrier rings at tips (3×2 grid)
        g.lineStyle(2.5, 0xddaaaa, 0.88);
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 3; col++) {
            const rx = x + 7 + col * 24;
            const ry = gapY - 8 - row * 16;
            if (ry > 0) g.strokeEllipse(rx, ry, 20, 12);
          }
        }
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 3; col++) {
            const rx = x + 7 + col * 24;
            const ry = botY + 8 + row * 16;
            if (ry < GAME_HEIGHT) g.strokeEllipse(rx, ry, 20, 12);
          }
        }
        break;
      }

      // ── Jellyfish ────────────────────────────────────────────────────────────
      case "jellyfish": {
        const pulse = 1 + Math.sin(tick * 0.05) * 0.12;

        // Glowing bell domes at top tip
        g.fillStyle(0x80e0ff, 0.07 + Math.sin(tick * 0.03) * 0.02);
        g.fillEllipse(cx, gapY - 8, (w - 8) * pulse, 28 * pulse);
        g.fillStyle(p.accent, 0.62);
        g.fillEllipse(cx - 14, gapY - 14, 30 * pulse, 20);
        g.fillEllipse(cx + 10, gapY - 20, 24 * pulse, 16);
        // Bell highlights
        g.fillStyle(0xc8f8ff, 0.28);
        g.fillEllipse(cx - 14, gapY - 16, 12, 7);
        g.fillEllipse(cx + 10, gapY - 22, 10, 6);

        // Animated wavy tentacles from top tip
        g.lineStyle(1.5, p.accent, 0.72);
        const tentCount = 8;
        for (let i = 0; i < tentCount; i++) {
          const tx = x + 4 + i * (w - 8) / (tentCount - 1);
          const tLen = 12 + (i % 3) * 9;
          const wavePhase = tick * 0.042 + i * 0.75;
          const steps = 5;
          g.beginPath();
          g.moveTo(tx, gapY);
          for (let s = 1; s <= steps; s++) {
            const tt = s / steps;
            g.lineTo(tx + Math.sin(tt * Math.PI * 1.6 + wavePhase) * 5.5, gapY + tt * tLen);
          }
          g.strokePath();
        }

        // Bell domes at bottom tip
        g.fillStyle(p.accent, 0.58);
        g.fillEllipse(cx - 10, botY + 14, 28 * pulse, 18);
        g.fillEllipse(cx + 12, botY + 8, 22 * pulse, 14);
        g.fillStyle(0xc8f8ff, 0.22);
        g.fillEllipse(cx - 10, botY + 12, 11, 6);

        // Animated wavy tentacles from bottom tip (pointing up)
        g.lineStyle(1.5, p.accent, 0.68);
        for (let i = 0; i < tentCount; i++) {
          const tx = x + 4 + i * (w - 8) / (tentCount - 1);
          const tLen = 12 + (i % 3) * 9;
          const wavePhase = tick * 0.042 + i * 0.75 + Math.PI;
          const steps = 5;
          g.beginPath();
          g.moveTo(tx, botY);
          for (let s = 1; s <= steps; s++) {
            const tt = s / steps;
            g.lineTo(tx + Math.sin(tt * Math.PI * 1.6 + wavePhase) * 5.5, botY - tt * tLen);
          }
          g.strokePath();
        }

        // Bioluminescent column glow
        g.fillStyle(0x40c8ff, 0.05 + Math.sin(tick * 0.04) * 0.015);
        g.fillRect(x, 0, w, gapY);
        g.fillRect(x, botY, w, GAME_HEIGHT - botY);
        break;
      }

      // ── Shark ────────────────────────────────────────────────────────────────
      case "shark": {
        // Dorsal fin at top tip (pointing down into gap)
        g.fillStyle(p.accent, 0.95);
        g.beginPath();
        g.moveTo(cx - 16, gapY); g.lineTo(cx, gapY - 30); g.lineTo(cx + 16, gapY);
        g.closePath(); g.fillPath();
        // Secondary fin
        g.beginPath();
        g.moveTo(cx + 18, gapY); g.lineTo(cx + 26, gapY - 16); g.lineTo(cx + 34, gapY);
        g.closePath(); g.fillPath();

        // Shark teeth at top tip (pointing down into gap)
        const toothCount = 7;
        const toothW = (w - 10) / toothCount;
        g.fillStyle(0xf2f2f2, 0.94);
        for (let i = 0; i < toothCount; i++) {
          const tx = x + 5 + i * toothW;
          g.beginPath();
          g.moveTo(tx, gapY); g.lineTo(tx + toothW / 2, gapY + 11); g.lineTo(tx + toothW, gapY);
          g.closePath(); g.fillPath();
        }

        // Tail fin at bottom (pointing up into gap)
        g.fillStyle(p.accent, 0.90);
        g.beginPath();
        g.moveTo(cx - 20, botY); g.lineTo(cx, botY + 26); g.lineTo(cx + 20, botY);
        g.closePath(); g.fillPath();

        // Teeth at bottom tip (pointing up)
        g.fillStyle(0xf2f2f2, 0.94);
        for (let i = 0; i < toothCount; i++) {
          const tx = x + 5 + i * toothW;
          g.beginPath();
          g.moveTo(tx, botY); g.lineTo(tx + toothW / 2, botY - 11); g.lineTo(tx + toothW, botY);
          g.closePath(); g.fillPath();
        }

        // Gill lines on top pillar
        g.lineStyle(2, p.accent, 0.52);
        for (let i = 0; i < 3; i++) {
          const ly = gapY - 52 - i * 22;
          if (ly < 0) break;
          g.beginPath();
          g.moveTo(cx - 22, ly); g.lineTo(cx - 12, ly + 10); g.strokePath();
        }
        break;
      }

      // ── Fishing hook ─────────────────────────────────────────────────────────
      case "fishing_hook": {
        // Tangled fishing lines in pillar
        g.lineStyle(1.5, p.accent, 0.68);
        for (let i = 0; i < 4; i++) {
          const lx = x + 10 + i * 16;
          g.beginPath();
          g.moveTo(lx, 0);
          g.lineTo(lx + 8, gapY * 0.33);
          g.lineTo(lx - 6, gapY * 0.66);
          g.lineTo(lx, gapY);
          g.strokePath();
        }
        // Large J-hook at top tip
        g.lineStyle(3.5, p.accent, 1.0);
        g.beginPath();
        g.moveTo(cx - 8, gapY - 28); g.lineTo(cx - 8, gapY - 4);
        g.lineTo(cx + 8, gapY - 4); g.lineTo(cx + 8, gapY - 10);
        g.strokePath();
        // Barb
        g.beginPath();
        g.moveTo(cx + 8, gapY - 4); g.lineTo(cx + 1, gapY); g.strokePath();
        // Red bait at hook point
        g.fillStyle(0xff5030, 0.92);
        g.fillEllipse(cx + 1, gapY + 3, 9, 7);

        // Inverted J-hook at bottom tip
        g.lineStyle(3.5, p.accent, 1.0);
        g.beginPath();
        g.moveTo(cx - 8, botY + 28); g.lineTo(cx - 8, botY + 4);
        g.lineTo(cx + 8, botY + 4); g.lineTo(cx + 8, botY + 10);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx + 8, botY + 4); g.lineTo(cx + 1, botY); g.strokePath();
        g.fillStyle(0xff5030, 0.92);
        g.fillEllipse(cx + 1, botY - 3, 9, 7);
        break;
      }

      // ── Boat ─────────────────────────────────────────────────────────────────
      case "boat": {
        // Hull underside at top pillar tip
        g.fillStyle(p.accent, 0.92);
        g.beginPath();
        g.moveTo(x + 4, gapY);
        g.lineTo(x, gapY - 14); g.lineTo(x, gapY - 22);
        g.lineTo(x + w, gapY - 22); g.lineTo(x + w, gapY - 14);
        g.lineTo(x + w - 4, gapY);
        g.closePath(); g.fillPath();
        // Hull planking
        g.lineStyle(1, 0x9c7048, 0.70);
        for (let i = 1; i <= 4; i++) {
          g.beginPath();
          g.moveTo(x, gapY - i * 5); g.lineTo(x + w, gapY - i * 5); g.strokePath();
        }
        // Keel
        g.lineStyle(2.5, 0x5c3018, 0.92);
        g.beginPath();
        g.moveTo(x + w * 0.18, gapY); g.lineTo(cx, gapY + 7); g.lineTo(x + w * 0.82, gapY);
        g.strokePath();
        // Faint sheen lines above hull
        g.lineStyle(1, 0xffffff, 0.08);
        for (let i = 0; i < 3; i++) {
          const lx = x + 12 + i * 22;
          g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, gapY - 22); g.strokePath();
        }

        // Animated spinning propeller at bottom pillar
        const propX = cx, propY = botY + 24;
        g.fillStyle(p.accent, 0.90);
        const bladeAngle = (tick * 0.09) % (Math.PI * 2);
        for (let blade = 0; blade < 3; blade++) {
          const ang = bladeAngle + (blade / 3) * Math.PI * 2;
          const bx1 = propX + Math.cos(ang) * 14;
          const by1 = propY + Math.sin(ang) * 14;
          const bx2 = propX + Math.cos(ang + 0.55) * 7;
          const by2 = propY + Math.sin(ang + 0.55) * 7;
          g.beginPath();
          g.moveTo(propX, propY); g.lineTo(bx1, by1); g.lineTo(bx2, by2);
          g.closePath(); g.fillPath();
        }
        // Propeller hub
        g.fillStyle(0x7c5030, 1.0);
        g.fillCircle(propX, propY, 4);

        // Anchor chain running down the pillar
        g.lineStyle(2.5, p.accent, 0.85);
        const chainStart = botY + 46;
        const chainLinks = Math.floor((GAME_HEIGHT - chainStart) / 14);
        for (let i = 0; i < chainLinks; i++) {
          const ly = chainStart + i * 14;
          const horiz = i % 2 === 0;
          g.strokeEllipse(cx, ly, horiz ? 12 : 8, horiz ? 8 : 12);
        }
        break;
      }
    }
  }

  // ── Shell drawing ─────────────────────────────────────────────────────────────

  private drawShells(): void {
    const g = this.shellGfx;
    g.clear();

    const t = this.tick;
    for (const sh of this.shells) {
      if (sh.collected) continue;
      // Gentle bob
      const bobY = Math.sin(t * 0.04 + sh.phase) * 5;
      const sx = sh.x;
      const sy = sh.y + bobY;

      // Outer glow
      g.fillStyle(0xffcc00, 0.18);
      g.fillCircle(sx, sy, SHELL_RADIUS + 5);

      // Shell body
      g.fillStyle(0xffd84a, 1.0);
      g.fillCircle(sx, sy, SHELL_RADIUS);

      // Shell highlight
      g.fillStyle(0xffeea0, 0.7);
      g.fillCircle(sx - 4, sy - 4, SHELL_RADIUS * 0.5);

      // Shell spiral lines
      g.lineStyle(1.2, 0xcc8800, 0.7);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(ang) * SHELL_RADIUS, sy + Math.sin(ang) * SHELL_RADIUS);
        g.strokePath();
      }
      g.lineStyle(1.2, 0xcc8800, 0.55);
      g.strokeCircle(sx, sy, SHELL_RADIUS);
    }
  }
}
