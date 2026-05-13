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
  SHELL_INTERVAL_MS,
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

    // ── Shell spawn timer ─────────────────────────────────────────────────────
    this.shellTimer += delta;
    if (this.shellTimer >= SHELL_INTERVAL_MS && this.obstacles.length > 0) {
      this.shellTimer = 0;
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
      this.drawPair(g, obs);
    }
  }

  private drawPair(g: Phaser.GameObjects.Graphics, obs: ObstaclePair): void {
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
    this.drawTypeDecoration(g, obs, p);
  }

  private drawTypeDecoration(
    g: Phaser.GameObjects.Graphics,
    obs: ObstaclePair,
    p: TypePalette,
  ): void {
    const { x, gapY, gap, type } = obs;
    const w = OBSTACLE_WIDTH;
    const cx = x + w / 2;
    const botY = gapY + gap;

    switch (type) {
      // ── Plastic bags ────────────────────────────────────────────────────────
      case "plastic_bag": {
        // Crumpled bag shapes at pillar tips
        g.fillStyle(p.accent, p.accentAlpha);
        // Top pillar tip: bag cluster
        for (let i = 0; i < 4; i++) {
          const bx = x + 10 + i * 16;
          g.fillEllipse(bx, gapY - 8, 14, 18);
        }
        // Bottom pillar tip
        for (let i = 0; i < 4; i++) {
          const bx = x + 10 + i * 16;
          g.fillEllipse(bx, botY + 8, 14, 18);
        }
        // Plastic sheen lines
        g.lineStyle(1, 0xffffff, 0.25);
        for (let i = 0; i < 3; i++) {
          const lx = x + 15 + i * 22;
          g.beginPath();
          g.moveTo(lx, 0);
          g.lineTo(lx, gapY);
          g.strokePath();
          g.beginPath();
          g.moveTo(lx, botY);
          g.lineTo(lx, GAME_HEIGHT);
          g.strokePath();
        }
        break;
      }

      // ── Fishing net ─────────────────────────────────────────────────────────
      case "fishing_net": {
        // Grid pattern over the pillars
        g.lineStyle(1, p.accent, 0.45);
        const gridSpacing = 16;
        // Vertical lines
        for (let lx = x; lx <= x + w; lx += gridSpacing) {
          g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, gapY); g.strokePath();
          g.beginPath(); g.moveTo(lx, botY); g.lineTo(lx, GAME_HEIGHT); g.strokePath();
        }
        // Horizontal lines
        for (let ly = 0; ly < gapY; ly += gridSpacing) {
          g.beginPath(); g.moveTo(x, ly); g.lineTo(x + w, ly); g.strokePath();
        }
        for (let ly = botY; ly < GAME_HEIGHT; ly += gridSpacing) {
          g.beginPath(); g.moveTo(x, ly); g.lineTo(x + w, ly); g.strokePath();
        }
        // Frayed edge at gap
        g.fillStyle(p.accent, 0.85);
        for (let i = 0; i < 5; i++) {
          const fx = x + 8 + i * 14;
          const fLen = 8 + (i % 2) * 6;
          g.fillRect(fx - 1, gapY - fLen, 2, fLen);
          g.fillRect(fx - 1, botY, 2, fLen);
        }
        break;
      }

      // ── Oil blob ─────────────────────────────────────────────────────────────
      case "oil_blob": {
        // Iridescent sheen on the oil mass
        g.fillStyle(0x4a2800, 0.5);
        for (let i = 0; i < 4; i++) {
          const bx = x + 8 + i * 16;
          g.fillEllipse(bx, gapY - 10, 20, 22);
          g.fillEllipse(bx, botY + 10, 20, 22);
        }
        // Oil shimmer
        g.fillStyle(0x602000, 0.4);
        g.fillEllipse(cx, gapY - 15, 50, 24);
        g.fillStyle(0x200800, 0.6);
        g.fillEllipse(cx, botY + 15, 50, 24);
        // Dark drip marks
        g.fillStyle(0x080400, 0.7);
        for (let i = 0; i < 3; i++) {
          const dx = x + 18 + i * 20;
          g.fillEllipse(dx, gapY - 4, 6, 14);
          g.fillEllipse(dx, botY + 4, 6, 14);
        }
        break;
      }

      // ── Soda rings ──────────────────────────────────────────────────────────
      case "soda_rings": {
        // Stacked can silhouettes
        g.fillStyle(p.accent, 0.9);
        const canSpacing = 18;
        for (let cy2 = canSpacing; cy2 < gapY; cy2 += canSpacing) {
          g.fillRect(x + 4, cy2 - 2, w - 8, 4);  // can seam line
        }
        for (let cy2 = botY + canSpacing; cy2 < GAME_HEIGHT; cy2 += canSpacing) {
          g.fillRect(x + 4, cy2 - 2, w - 8, 4);
        }
        // Ring-pull shapes at tip
        g.lineStyle(3, p.accent, 1.0);
        g.strokeEllipse(cx - 10, gapY - 6, 14, 10);
        g.strokeEllipse(cx + 10, gapY - 6, 14, 10);
        g.strokeEllipse(cx - 10, botY + 6, 14, 10);
        g.strokeEllipse(cx + 10, botY + 6, 14, 10);
        break;
      }

      // ── Jellyfish ────────────────────────────────────────────────────────────
      case "jellyfish": {
        // Bell shapes hanging from pillar tips
        g.fillStyle(p.accent, 0.55);
        g.fillEllipse(cx - 14, gapY - 12, 28, 20);
        g.fillEllipse(cx + 8, gapY - 18, 22, 16);
        // Tentacles dangling down from top pillar tip
        g.lineStyle(1.5, p.accent, 0.65);
        for (let i = 0; i < 6; i++) {
          const tx = x + 6 + i * 11;
          const len = 10 + (i % 3) * 7;
          g.beginPath();
          g.moveTo(tx, gapY);
          g.lineTo(tx + Math.sin(i) * 4, gapY + len);
          g.strokePath();
        }
        // Rising bells from bottom pillar tip
        g.fillStyle(p.accent, 0.5);
        g.fillEllipse(cx - 10, botY + 14, 26, 18);
        g.fillEllipse(cx + 12, botY + 8, 20, 14);
        // Tentacles up from bottom
        for (let i = 0; i < 6; i++) {
          const tx = x + 6 + i * 11;
          const len = 10 + (i % 3) * 7;
          g.beginPath();
          g.moveTo(tx, botY);
          g.lineTo(tx + Math.sin(i) * 4, botY - len);
          g.strokePath();
        }
        // Glow effect
        g.fillStyle(0x80d0ff, 0.08);
        g.fillRect(x, 0, w, gapY);
        g.fillRect(x, botY, w, GAME_HEIGHT - botY);
        break;
      }

      // ── Shark ────────────────────────────────────────────────────────────────
      case "shark": {
        // Dorsal fin at top pillar tip (pointing down)
        g.fillStyle(p.accent, 0.95);
        g.beginPath();
        g.moveTo(cx - 16, gapY);
        g.lineTo(cx, gapY - 28);
        g.lineTo(cx + 16, gapY);
        g.closePath();
        g.fillPath();
        // Second smaller fin
        g.beginPath();
        g.moveTo(cx + 18, gapY);
        g.lineTo(cx + 26, gapY - 14);
        g.lineTo(cx + 34, gapY);
        g.closePath();
        g.fillPath();
        // Tail fin at bottom pillar tip (pointing up)
        g.beginPath();
        g.moveTo(cx - 20, botY);
        g.lineTo(cx, botY + 24);
        g.lineTo(cx + 20, botY);
        g.closePath();
        g.fillPath();
        // Gill lines on pillar
        g.lineStyle(2, p.accent, 0.5);
        for (let i = 0; i < 3; i++) {
          const ly = gapY - 50 - i * 20;
          if (ly < 0) break;
          g.beginPath();
          g.moveTo(cx - 20, ly);
          g.lineTo(cx - 12, ly + 8);
          g.strokePath();
        }
        break;
      }

      // ── Fishing hook ─────────────────────────────────────────────────────────
      case "fishing_hook": {
        // Tangled fishing lines
        g.lineStyle(1.5, p.accent, 0.7);
        for (let i = 0; i < 4; i++) {
          const lx = x + 10 + i * 16;
          g.beginPath();
          g.moveTo(lx, 0);
          g.lineTo(lx + 8, gapY * 0.3);
          g.lineTo(lx - 6, gapY * 0.7);
          g.lineTo(lx, gapY);
          g.strokePath();
        }
        // Hook shape at top tip
        g.lineStyle(3, p.accent, 1.0);
        g.beginPath();
        g.moveTo(cx - 10, gapY - 24);
        g.lineTo(cx - 10, gapY - 6);
        g.lineTo(cx + 6, gapY - 6);
        g.lineTo(cx + 6, gapY - 12);
        g.strokePath();
        // Hook barb
        g.beginPath();
        g.moveTo(cx + 6, gapY - 6);
        g.lineTo(cx - 2, gapY - 2);
        g.strokePath();
        // Same hook at bottom (upside down)
        g.beginPath();
        g.moveTo(cx - 10, botY + 24);
        g.lineTo(cx - 10, botY + 6);
        g.lineTo(cx + 6, botY + 6);
        g.lineTo(cx + 6, botY + 12);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx + 6, botY + 6);
        g.lineTo(cx - 2, botY + 2);
        g.strokePath();
        break;
      }

      // ── Boat ─────────────────────────────────────────────────────────────────
      case "boat": {
        // Boat hull underside at top pillar tip (boat sitting at surface above)
        g.fillStyle(p.accent, 0.92);
        // Rounded hull shape
        g.beginPath();
        g.moveTo(x, gapY);
        g.lineTo(x, gapY - 18);
        g.lineTo(x + w, gapY - 18);
        g.lineTo(x + w, gapY);
        g.closePath();
        g.fillPath();
        // Planking details
        g.lineStyle(1, 0x9c7048, 0.7);
        for (let i = 1; i < 4; i++) {
          g.beginPath();
          g.moveTo(x, gapY - i * 5);
          g.lineTo(x + w, gapY - i * 5);
          g.strokePath();
        }
        // Keel line
        g.lineStyle(2, 0x5c3018, 0.9);
        g.beginPath();
        g.moveTo(x + w * 0.2, gapY);
        g.lineTo(cx, gapY + 6);
        g.lineTo(x + w * 0.8, gapY);
        g.strokePath();
        // Anchor chain at bottom pillar
        g.lineStyle(2.5, p.accent, 0.85);
        const chainLinks = Math.floor((GAME_HEIGHT - botY) / 14);
        for (let i = 0; i < chainLinks; i++) {
          const ly = botY + 7 + i * 14;
          const even = i % 2 === 0;
          if (even) {
            g.strokeEllipse(cx, ly, 8, 12);
          } else {
            g.strokeEllipse(cx, ly, 12, 8);
          }
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
