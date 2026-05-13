/*
 * SkinDefs — procedural draw functions for each turtle skin.
 *
 * All coordinates are in local space relative to the turtle's centre.
 * The turtle faces RIGHT (positive x direction).
 *
 * Each skin is self-contained: it calls g.clear() and redraws from scratch.
 * The Player class picks the matching drawFn based on SaveManager.selectedSkin.
 */

import Phaser from "phaser";
import type { SkinId } from "../save/SaveManager";

export interface SkinDef {
  id: SkinId;
  name: string;
  drawFn: (g: Phaser.GameObjects.Graphics) => void;
}

// ── Baby Turtle (default) ─────────────────────────────────────────────────────

function drawBaby(g: Phaser.GameObjects.Graphics): void {
  g.clear();

  g.fillStyle(0x1e6b38, 1);
  g.fillEllipse(-21, 0, 12, 7);

  g.fillStyle(0x236e3c, 1);
  g.fillEllipse(9, -18, 11, 22);
  g.fillEllipse(9, 18, 11, 22);
  g.fillEllipse(-12, -13, 9, 17);
  g.fillEllipse(-12, 13, 9, 17);

  g.fillStyle(0x2d8a4e, 1);
  g.fillEllipse(0, 0, 40, 32);

  g.fillStyle(0x3ea85e, 0.55);
  g.fillEllipse(-3, -5, 30, 24);

  g.fillStyle(0x62d488, 0.35);
  g.fillEllipse(-6, -7, 20, 15);

  g.lineStyle(1.5, 0x1a5c33, 0.55);
  g.strokeEllipse(0, 0, 16, 13);

  g.lineStyle(1.2, 0x1a5c33, 0.38);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(ang) * 8, Math.sin(ang) * 6.5);
    g.lineTo(Math.cos(ang) * 18, Math.sin(ang) * 14);
    g.strokePath();
  }

  g.fillStyle(0x39a65b, 1);
  g.fillEllipse(21, -1, 19, 15);
  g.fillStyle(0x7ee8a8, 0.45);
  g.fillEllipse(19, -3, 12, 9);

  g.fillStyle(0x1a1a2e, 1);
  g.fillCircle(27, -4, 3);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(28, -5, 1.2);

  g.lineStyle(1, 0x1a6e38, 0.8);
  g.beginPath(); g.moveTo(22, 1); g.lineTo(26, 2.5); g.strokePath();
}

// ── Green Sea Turtle (unlock: score ≥ 50) ────────────────────────────────────

function drawGreenSea(g: Phaser.GameObjects.Graphics): void {
  g.clear();

  // Tail
  g.fillStyle(0x2a6e28, 1);
  g.fillEllipse(-22, 0, 14, 8);

  // Flippers — longer, more elegant
  g.fillStyle(0x347a30, 1);
  g.fillEllipse(10, -20, 13, 26);
  g.fillEllipse(10, 20, 13, 26);
  g.fillEllipse(-13, -14, 10, 20);
  g.fillEllipse(-13, 14, 10, 20);

  // Shell — olive/dark green, larger
  g.fillStyle(0x3a7a20, 1);
  g.fillEllipse(0, 0, 44, 35);

  // Scute pattern (distinct hexagonal plates)
  g.fillStyle(0x4a9028, 0.7);
  g.fillEllipse(-4, -4, 24, 18);
  g.fillStyle(0x5aaa30, 0.4);
  g.fillEllipse(-7, -6, 14, 10);

  // Central ridge line
  g.lineStyle(2, 0x245218, 0.65);
  g.beginPath(); g.moveTo(-18, 0); g.lineTo(14, 0); g.strokePath();

  // Lateral scutes
  g.lineStyle(1.5, 0x245218, 0.5);
  for (let i = 0; i < 4; i++) {
    const bx = -12 + i * 8;
    g.beginPath(); g.moveTo(bx, -2); g.lineTo(bx - 4, -14); g.strokePath();
    g.beginPath(); g.moveTo(bx, 2);  g.lineTo(bx - 4, 14);  g.strokePath();
  }

  // Head — olive with yellow-ish tinge
  g.fillStyle(0x4a8c30, 1);
  g.fillEllipse(22, -1, 21, 16);
  g.fillStyle(0x8acc58, 0.4);
  g.fillEllipse(20, -3, 13, 9);

  g.fillStyle(0x1a1a2e, 1);
  g.fillCircle(28, -4, 3);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(29, -5, 1.2);

  g.lineStyle(1, 0x245218, 0.8);
  g.beginPath(); g.moveTo(23, 1); g.lineTo(27, 2.5); g.strokePath();
}

// ── Glowing Turtle (unlock: score ≥ 150) ─────────────────────────────────────

function drawGlowing(g: Phaser.GameObjects.Graphics): void {
  g.clear();

  // Outer aura
  g.fillStyle(0x00ffcc, 0.07);
  g.fillEllipse(0, 0, 68, 56);
  g.fillStyle(0x00ffcc, 0.05);
  g.fillEllipse(0, 0, 84, 68);

  // Tail
  g.fillStyle(0x00b894, 1);
  g.fillEllipse(-21, 0, 12, 7);

  // Flippers
  g.fillStyle(0x00c4a0, 1);
  g.fillEllipse(9, -18, 11, 22);
  g.fillEllipse(9, 18, 11, 22);
  g.fillEllipse(-12, -13, 9, 17);
  g.fillEllipse(-12, 13, 9, 17);

  // Shell — deep teal
  g.fillStyle(0x00a88a, 1);
  g.fillEllipse(0, 0, 40, 32);

  // Glow highlight layers
  g.fillStyle(0x00ffd4, 0.5);
  g.fillEllipse(-3, -5, 30, 24);
  g.fillStyle(0x80fff0, 0.35);
  g.fillEllipse(-6, -7, 18, 13);

  // Glowing radial lines
  g.lineStyle(1.5, 0x00ffd4, 0.7);
  g.strokeEllipse(0, 0, 18, 14);
  g.lineStyle(1, 0x00ffd4, 0.45);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(ang) * 9, Math.sin(ang) * 7);
    g.lineTo(Math.cos(ang) * 19, Math.sin(ang) * 15);
    g.strokePath();
  }

  // Head
  g.fillStyle(0x00c890, 1);
  g.fillEllipse(21, -1, 19, 15);
  g.fillStyle(0x80ffe8, 0.55);
  g.fillEllipse(19, -3, 12, 9);

  // Eye — bright cyan glow
  g.fillStyle(0x001a12, 1);
  g.fillCircle(27, -4, 3);
  g.fillStyle(0x00ffd4, 1);
  g.fillCircle(28, -5, 1.5);

  g.lineStyle(1, 0x00c890, 0.8);
  g.beginPath(); g.moveTo(22, 1); g.lineTo(26, 2.5); g.strokePath();
}

// ── Golden Turtle (unlock: 500 lifetime shells) ───────────────────────────────

function drawGolden(g: Phaser.GameObjects.Graphics): void {
  g.clear();

  // Shimmer aura
  g.fillStyle(0xffd700, 0.08);
  g.fillEllipse(0, 0, 72, 58);

  // Tail
  g.fillStyle(0xb8860b, 1);
  g.fillEllipse(-21, 0, 12, 7);

  // Flippers
  g.fillStyle(0xc8960c, 1);
  g.fillEllipse(9, -18, 11, 22);
  g.fillEllipse(9, 18, 11, 22);
  g.fillEllipse(-12, -13, 9, 17);
  g.fillEllipse(-12, 13, 9, 17);

  // Shell — rich gold
  g.fillStyle(0xd4a017, 1);
  g.fillEllipse(0, 0, 40, 32);

  g.fillStyle(0xffd84a, 0.65);
  g.fillEllipse(-3, -5, 30, 24);

  g.fillStyle(0xfff0a0, 0.45);
  g.fillEllipse(-6, -7, 18, 13);

  // Gold hexagon outline
  g.lineStyle(2, 0xb8860b, 0.7);
  g.strokeEllipse(0, 0, 18, 14);

  // Ornate radial lines
  g.lineStyle(1.5, 0xb8860b, 0.55);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(ang) * 9, Math.sin(ang) * 7);
    g.lineTo(Math.cos(ang) * 19, Math.sin(ang) * 15);
    g.strokePath();
  }

  // Small gem dots at scute vertices
  g.fillStyle(0xffeea0, 1);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    g.fillCircle(Math.cos(ang) * 19, Math.sin(ang) * 15, 2.5);
  }

  // Head
  g.fillStyle(0xd4a820, 1);
  g.fillEllipse(21, -1, 19, 15);
  g.fillStyle(0xfff0a0, 0.5);
  g.fillEllipse(19, -3, 12, 9);

  g.fillStyle(0x1a1000, 1);
  g.fillCircle(27, -4, 3);
  g.fillStyle(0xffd700, 1);
  g.fillCircle(28, -5, 1.5);

  g.lineStyle(1, 0xb8860b, 0.8);
  g.beginPath(); g.moveTo(22, 1); g.lineTo(26, 2.5); g.strokePath();
}

// ── Cyber Turtle (unlock: 10 games played) ────────────────────────────────────

function drawCyber(g: Phaser.GameObjects.Graphics): void {
  g.clear();

  // Tail — dark
  g.fillStyle(0x0a1a28, 1);
  g.fillEllipse(-21, 0, 12, 7);

  // Flippers
  g.fillStyle(0x0c2030, 1);
  g.fillEllipse(9, -18, 11, 22);
  g.fillEllipse(9, 18, 11, 22);
  g.fillEllipse(-12, -13, 9, 17);
  g.fillEllipse(-12, 13, 9, 17);

  // Shell — very dark navy
  g.fillStyle(0x0d1f2e, 1);
  g.fillEllipse(0, 0, 40, 32);

  // Neon grid on shell
  g.lineStyle(1, 0x00e5ff, 0.55);
  for (let i = -3; i <= 3; i++) {
    // Horizontal lines
    const ly = i * 4.5;
    if (Math.abs(ly) > 14) continue;
    const hw = Math.sqrt(Math.max(0, 1 - (ly / 14) ** 2)) * 18;
    g.beginPath(); g.moveTo(-hw, ly); g.lineTo(hw, ly); g.strokePath();
  }
  // Vertical lines
  for (let i = -3; i <= 3; i++) {
    const lx = i * 5;
    if (Math.abs(lx) > 18) continue;
    const hh = Math.sqrt(Math.max(0, 1 - (lx / 18) ** 2)) * 14;
    g.beginPath(); g.moveTo(lx, -hh); g.lineTo(lx, hh); g.strokePath();
  }

  // Neon outline ring
  g.lineStyle(2, 0x00e5ff, 0.8);
  g.strokeEllipse(0, 0, 40, 32);

  // Inner highlight
  g.fillStyle(0x00e5ff, 0.08);
  g.fillEllipse(-3, -5, 28, 22);

  // Circuit dots
  g.fillStyle(0x00e5ff, 0.9);
  g.fillCircle(-14, 0, 2.5);
  g.fillCircle(14, 0, 2.5);
  g.fillCircle(0, -12, 2);
  g.fillCircle(0, 12, 2);

  // Head
  g.fillStyle(0x0d1f2e, 1);
  g.fillEllipse(21, -1, 19, 15);
  g.lineStyle(1.5, 0x00e5ff, 0.7);
  g.strokeEllipse(21, -1, 19, 15);

  // Eye — neon
  g.fillStyle(0x000a10, 1);
  g.fillCircle(27, -4, 3.5);
  g.fillStyle(0x00e5ff, 1);
  g.fillCircle(27, -4, 2);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(28, -5, 0.8);

  // Smile — neon line
  g.lineStyle(1.5, 0x00e5ff, 0.8);
  g.beginPath(); g.moveTo(22, 1); g.lineTo(26, 2.5); g.strokePath();
}

// ── Coral Turtle (unlock: reach restoration milestone) ────────────────────────

function drawCoral(g: Phaser.GameObjects.Graphics): void {
  g.clear();

  // Tail
  g.fillStyle(0xc04060, 1);
  g.fillEllipse(-21, 0, 12, 7);

  // Flippers
  g.fillStyle(0xcc4870, 1);
  g.fillEllipse(9, -18, 11, 22);
  g.fillEllipse(9, 18, 11, 22);
  g.fillEllipse(-12, -13, 9, 17);
  g.fillEllipse(-12, 13, 9, 17);

  // Shell — warm coral pink
  g.fillStyle(0xd45070, 1);
  g.fillEllipse(0, 0, 40, 32);

  g.fillStyle(0xe87090, 0.6);
  g.fillEllipse(-3, -5, 30, 24);

  g.fillStyle(0xffc0d0, 0.4);
  g.fillEllipse(-6, -7, 18, 13);

  // Coral branch decorations on shell
  g.lineStyle(2.5, 0xff8090, 0.75);
  // Branch left
  g.beginPath(); g.moveTo(-10, 4); g.lineTo(-14, -4); g.strokePath();
  g.beginPath(); g.moveTo(-14, -4); g.lineTo(-18, -8); g.strokePath();
  g.beginPath(); g.moveTo(-14, -4); g.lineTo(-12, -10); g.strokePath();
  // Branch right
  g.beginPath(); g.moveTo(6, 4); g.lineTo(10, -2); g.strokePath();
  g.beginPath(); g.moveTo(10, -2); g.lineTo(14, -6); g.strokePath();
  g.beginPath(); g.moveTo(10, -2); g.lineTo(8, -8); g.strokePath();

  // Tiny coral polyp dots
  g.fillStyle(0xffb0c0, 1);
  const polyps = [[-18, -8], [-12, -10], [-14, -4], [14, -6], [8, -8], [10, -2]];
  for (const [px, py] of polyps) {
    g.fillCircle(px, py, 2.5);
  }

  // Shell outline
  g.lineStyle(1.5, 0xa03050, 0.5);
  g.strokeEllipse(0, 0, 16, 13);

  // Head
  g.fillStyle(0xd05070, 1);
  g.fillEllipse(21, -1, 19, 15);
  g.fillStyle(0xffb0c8, 0.45);
  g.fillEllipse(19, -3, 12, 9);

  g.fillStyle(0x1a0008, 1);
  g.fillCircle(27, -4, 3);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(28, -5, 1.2);

  g.lineStyle(1, 0xa03050, 0.8);
  g.beginPath(); g.moveTo(22, 1); g.lineTo(26, 2.5); g.strokePath();
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const SKIN_DEFS: SkinDef[] = [
  { id: "baby",      name: "Baby Turtle",    drawFn: drawBaby      },
  { id: "green_sea", name: "Green Sea Turtle", drawFn: drawGreenSea },
  { id: "glowing",   name: "Glowing Turtle", drawFn: drawGlowing   },
  { id: "golden",    name: "Golden Turtle",  drawFn: drawGolden    },
  { id: "cyber",     name: "Cyber Turtle",   drawFn: drawCyber     },
  { id: "coral",     name: "Coral Turtle",   drawFn: drawCoral     },
];

export function getSkinDef(id: SkinId): SkinDef {
  return SKIN_DEFS.find(s => s.id === id) ?? SKIN_DEFS[0];
}
