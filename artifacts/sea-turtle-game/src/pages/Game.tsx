import { useEffect, useRef, useCallback } from "react";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const TURTLE_X = 80;
const TURTLE_SIZE = 46;
const GRAVITY = 0.45;
const JUMP_FORCE = -8.5;
const OBSTACLE_WIDTH = 62;
const OBSTACLE_GAP = 175;
const OBSTACLE_SPEED = 2.8;
const OBSTACLE_INTERVAL = 1700;
const THEME_EVERY = 20;

// ─────────────────────────────────────────────
// THEME DEFINITIONS
// ─────────────────────────────────────────────

interface Theme {
  name: string;
  emoji: string;
  // background gradient stops [color, stop][]
  bgStops: [string, number][];
  // light shaft color rgba
  rayColor: string;
  // bubble stroke color rgb
  bubbleRgb: string;
  // floor gradient top / bottom
  floorTop: string;
  floorBot: string;
  // floor accent (sand patches, ice, lava)
  floorAccent: string;
  // obstacle pillar colors [top4, bot4]
  topColors: [string, string, string, string];
  botColors: [string, string, string, string];
  // branch / spike decoration color triplets
  topBranchColors: [string, string, string];
  botBranchColors: [string, string, string];
  // particle colors
  particleColors: string[];
  // score glow color
  scoreGlow: string;
  // ambient extras identifier
  ambient: "rays" | "jellyfish" | "embers" | "snowflakes" | "angler";
  // ambient extra count / intensity
  ambientCount: number;
}

const THEMES: Theme[] = [
  // 0: Shallow Reef (0-19)
  {
    name: "Shallow Reef",
    emoji: "🐠",
    bgStops: [
      ["#051224", 0],
      ["#0a1e3d", 0.4],
      ["#0d2a50", 0.8],
      ["#071830", 1],
    ],
    rayColor: "rgba(100,200,255,",
    bubbleRgb: "150,230,255",
    floorTop: "#1a3a0a",
    floorBot: "#0d2006",
    floorAccent: "rgba(180,130,60,0.2)",
    topColors: ["#e8507a", "#d94040", "#f07050", "#c84080"],
    botColors: ["#40b0d8", "#2080c0", "#60c8e8", "#3090d0"],
    topBranchColors: ["#ff8fa0", "#e05070", "#ff6080"],
    botBranchColors: ["#80d0f0", "#50b0e0", "#90d8f8"],
    particleColors: ["#4dc47a", "#ff6b5b", "#80e8ff", "#f0c060"],
    scoreGlow: "rgba(0,200,255,0.8)",
    ambient: "rays",
    ambientCount: 5,
  },
  // 1: Kelp Forest (20-39)
  {
    name: "Kelp Forest",
    emoji: "🌿",
    bgStops: [
      ["#021510", 0],
      ["#052a1a", 0.3],
      ["#0a3d22", 0.7],
      ["#041a0e", 1],
    ],
    rayColor: "rgba(80,200,130,",
    bubbleRgb: "120,220,160",
    floorTop: "#0a2a08",
    floorBot: "#041506",
    floorAccent: "rgba(40,120,30,0.3)",
    topColors: ["#2a7a30", "#1d5a22", "#3d9040", "#165018"],
    botColors: ["#3dab60", "#2d8a4e", "#55c070", "#1d6030"],
    topBranchColors: ["#50c060", "#30a040", "#70d080"],
    botBranchColors: ["#80e090", "#50c065", "#a0f0a8"],
    particleColors: ["#80e090", "#40c050", "#b0f0b0", "#f0e060"],
    scoreGlow: "rgba(80,220,120,0.9)",
    ambient: "rays",
    ambientCount: 6,
  },
  // 2: Deep Ocean (40-59)
  {
    name: "Deep Ocean",
    emoji: "🪼",
    bgStops: [
      ["#04051a", 0],
      ["#080a30", 0.35],
      ["#0c1048", 0.7],
      ["#060820", 1],
    ],
    rayColor: "rgba(80,80,220,",
    bubbleRgb: "140,140,255",
    floorTop: "#08082a",
    floorBot: "#040412",
    floorAccent: "rgba(80,40,160,0.25)",
    topColors: ["#5020a0", "#3d1080", "#6a30c0", "#2a0860"],
    botColors: ["#2040c0", "#1030a0", "#3050d0", "#0c2080"],
    topBranchColors: ["#b060ff", "#8040e0", "#d090ff"],
    botBranchColors: ["#4080ff", "#2060e0", "#70a8ff"],
    particleColors: ["#b060ff", "#4080ff", "#80d8ff", "#ff80d0"],
    scoreGlow: "rgba(120,80,255,0.9)",
    ambient: "jellyfish",
    ambientCount: 5,
  },
  // 3: Volcanic Vent (60-79)
  {
    name: "Volcanic Vent",
    emoji: "🌋",
    bgStops: [
      ["#120400", 0],
      ["#280800", 0.3],
      ["#180500", 0.65],
      ["#0a0200", 1],
    ],
    rayColor: "rgba(255,100,20,",
    bubbleRgb: "255,140,60",
    floorTop: "#300800",
    floorBot: "#180400",
    floorAccent: "rgba(255,80,0,0.3)",
    topColors: ["#c03000", "#801800", "#e04010", "#600c00"],
    botColors: ["#e05000", "#a03000", "#f06020", "#702000"],
    topBranchColors: ["#ff8030", "#e04000", "#ffa050"],
    botBranchColors: ["#ffa040", "#e06010", "#ffb860"],
    particleColors: ["#ff8030", "#ff4000", "#ffb830", "#ff6010"],
    scoreGlow: "rgba(255,120,30,0.9)",
    ambient: "embers",
    ambientCount: 18,
  },
  // 4: Arctic Waters (80-99)
  {
    name: "Arctic Waters",
    emoji: "🧊",
    bgStops: [
      ["#081828", 0],
      ["#102838", 0.35],
      ["#183850", 0.7],
      ["#081828", 1],
    ],
    rayColor: "rgba(180,230,255,",
    bubbleRgb: "200,240,255",
    floorTop: "#102840",
    floorBot: "#081828",
    floorAccent: "rgba(180,230,255,0.2)",
    topColors: ["#a0d0f0", "#80b8e0", "#c0e0ff", "#608090"],
    botColors: ["#80b0d0", "#6090b0", "#a0c8e8", "#406080"],
    topBranchColors: ["#c8e8ff", "#90c0e0", "#e0f0ff"],
    botBranchColors: ["#b0d8f8", "#80b0d0", "#d0ecff"],
    particleColors: ["#c8e8ff", "#ffffff", "#a0d0f8", "#e0f4ff"],
    scoreGlow: "rgba(180,230,255,0.95)",
    ambient: "snowflakes",
    ambientCount: 20,
  },
  // 5: Midnight Abyss (100+)
  {
    name: "Midnight Abyss",
    emoji: "🌑",
    bgStops: [
      ["#000005", 0],
      ["#010008", 0.4],
      ["#020010", 0.75],
      ["#000008", 1],
    ],
    rayColor: "rgba(0,255,200,",
    bubbleRgb: "0,255,180",
    floorTop: "#010010",
    floorBot: "#000008",
    floorAccent: "rgba(0,200,150,0.2)",
    topColors: ["#001830", "#000c20", "#002040", "#000810"],
    botColors: ["#001020", "#000818", "#001830", "#000408"],
    topBranchColors: ["#00ffb0", "#00d890", "#80ffcc"],
    botBranchColors: ["#00e0ff", "#00b0d8", "#80f0ff"],
    particleColors: ["#00ffb0", "#00e0ff", "#80ff00", "#ff00c8"],
    scoreGlow: "rgba(0,255,180,1)",
    ambient: "angler",
    ambientCount: 8,
  },
];

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type GameState = "idle" | "playing" | "dead";

interface TurtleState { y: number; vy: number; angle: number }
interface Obstacle { x: number; gapY: number; scored: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number }
interface Bubble { x: number; y: number; r: number; speed: number; alpha: number }
interface Jellyfish { x: number; y: number; phase: number; r: number; color: string; speed: number }
interface Ember { x: number; y: number; vx: number; vy: number; alpha: number; size: number }
interface Snowflake { x: number; y: number; speed: number; r: number; phase: number }
interface AnglerLight { x: number; y: number; phase: number; r: number; color: string }

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return `rgb(${Math.round(lerp(r1, r2, t))},${Math.round(lerp(g1, g2, t))},${Math.round(lerp(b1, b2, t))})`;
}

function getThemeIndex(score: number) { return Math.min(Math.floor(score / THEME_EVERY), THEMES.length - 1); }
function getThemeBlend(score: number) { return clamp((score % THEME_EVERY) / 5, 0, 1); }

// ─────────────────────────────────────────────
// DRAWING: TURTLE
// ─────────────────────────────────────────────

function drawTurtle(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, themeIdx: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const s = size / 46;

  // Theme-based shell tint for midnight abyss (bioluminescent)
  const glowing = themeIdx === 5;
  if (glowing) {
    ctx.shadowColor = "#00ffb0";
    ctx.shadowBlur = 16;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 10;
  }

  const shellGrad = ctx.createRadialGradient(-2 * s, -4 * s, 2 * s, 0, 0, 18 * s);
  shellGrad.addColorStop(0, glowing ? "#60ffc0" : "#4dc47a");
  shellGrad.addColorStop(0.5, glowing ? "#00d890" : "#2d8a4e");
  shellGrad.addColorStop(1, glowing ? "#00804a" : "#1a5c33");
  ctx.fillStyle = shellGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7 * s, 5.5 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 7 * s, Math.sin(ang) * 5.5 * s);
    ctx.lineTo(Math.cos(ang) * 16 * s, Math.sin(ang) * 12 * s);
    ctx.stroke();
  }

  if (glowing) { ctx.shadowColor = "#00ffb0"; ctx.shadowBlur = 12; }
  const headGrad = ctx.createRadialGradient(20 * s, -2 * s, 1 * s, 20 * s, -1 * s, 9 * s);
  headGrad.addColorStop(0, glowing ? "#a0ffd0" : "#7ee8a0");
  headGrad.addColorStop(1, glowing ? "#00c070" : "#3dab60");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(20 * s, -1 * s, 9 * s, 7.5 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(25 * s, -4 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(25.8 * s, -4.8 * s, 1 * s, 0, Math.PI * 2);
  ctx.fill();

  const flipperColor = glowing ? "#00c880" : "#2d8a4e";
  ctx.fillStyle = flipperColor;
  ctx.beginPath(); ctx.ellipse(10 * s, -16 * s, 5 * s, 10 * s, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10 * s, 16 * s, 5 * s, 10 * s, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-12 * s, -14 * s, 4 * s, 8 * s, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-12 * s, 14 * s, 4 * s, 8 * s, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-20 * s, 0, 5 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ─────────────────────────────────────────────
// DRAWING: BACKGROUND
// ─────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  scrollX: number, bubbles: Bubble[],
  theme: Theme, prevTheme: Theme, blend: number, tick: number,
) {
  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  theme.bgStops.forEach(([color, stop]) => {
    const prevStop = prevTheme.bgStops.find(([, s]) => s === stop)?.[0] ?? color;
    bg.addColorStop(stop, blend < 1 ? lerpColor(prevStop, color, blend) : color);
  });
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Light rays
  ctx.save();
  const rayCount = theme.ambientCount < 10 ? theme.ambientCount : 5;
  for (let i = 0; i < rayCount; i++) {
    const rx = ((i * 110 + scrollX * 0.05) % (w + 100)) - 50;
    const rayGrad = ctx.createLinearGradient(rx, 0, rx + 60, h);
    rayGrad.addColorStop(0, theme.rayColor + "0.07)");
    rayGrad.addColorStop(0.5, theme.rayColor + "0.03)");
    rayGrad.addColorStop(1, theme.rayColor + "0)");
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(rx, 0); ctx.lineTo(rx + 60, 0);
    ctx.lineTo(rx + 120, h); ctx.lineTo(rx - 40, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Bubbles (theme-colored)
  bubbles.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${theme.bubbleRgb},${b.alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${theme.bubbleRgb},${b.alpha * 0.6})`;
    ctx.fill();
  });

  // Ocean floor
  const floorGrad = ctx.createLinearGradient(0, h - 60, 0, h);
  floorGrad.addColorStop(0, blend < 1 ? lerpColor(prevTheme.floorTop, theme.floorTop, blend) : theme.floorTop);
  floorGrad.addColorStop(1, blend < 1 ? lerpColor(prevTheme.floorBot, theme.floorBot, blend) : theme.floorBot);
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.moveTo(0, h - 30);
  for (let i = 0; i <= w; i += 20) {
    const bump = Math.sin((i + scrollX * 0.3) * 0.06) * 10;
    ctx.lineTo(i, h - 30 + bump);
  }
  ctx.lineTo(w, h); ctx.lineTo(0, h);
  ctx.closePath(); ctx.fill();

  // Floor accents
  ctx.fillStyle = theme.floorAccent;
  for (let i = 0; i < 4; i++) {
    const sx = ((i * 140 + scrollX * 0.2) % (w + 60)) - 30;
    ctx.beginPath();
    ctx.ellipse(sx, h - 25, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─────────────────────────────────────────────
// DRAWING: AMBIENT EFFECTS
// ─────────────────────────────────────────────

function drawJellyfish(ctx: CanvasRenderingContext2D, jellies: Jellyfish[], tick: number) {
  jellies.forEach((j) => {
    const bob = Math.sin(tick * 0.03 + j.phase) * 5;
    const pulse = 0.85 + Math.sin(tick * 0.05 + j.phase) * 0.15;

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.shadowColor = j.color;
    ctx.shadowBlur = 18;

    // Bell
    const bellGrad = ctx.createRadialGradient(j.x, j.y + bob - j.r * 0.3, 1, j.x, j.y + bob, j.r * pulse);
    bellGrad.addColorStop(0, j.color + "cc");
    bellGrad.addColorStop(1, j.color + "22");
    ctx.fillStyle = bellGrad;
    ctx.beginPath();
    ctx.arc(j.x, j.y + bob, j.r * pulse, Math.PI, Math.PI * 2);
    ctx.fill();

    // Tentacles
    ctx.strokeStyle = j.color + "80";
    ctx.lineWidth = 1.2;
    for (let t = 0; t < 5; t++) {
      const tx = j.x - j.r * 0.6 + t * (j.r * 0.3);
      const len = 20 + Math.sin(tick * 0.04 + j.phase + t) * 8;
      ctx.beginPath();
      ctx.moveTo(tx, j.y + bob + j.r * 0.1 * pulse);
      ctx.quadraticCurveTo(
        tx + Math.sin(tick * 0.06 + t) * 6,
        j.y + bob + len * 0.5,
        tx + Math.sin(tick * 0.04 + t + 1) * 4,
        j.y + bob + len
      );
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  });
}

function drawEmbers(ctx: CanvasRenderingContext2D, embers: Ember[]) {
  embers.forEach((e) => {
    ctx.globalAlpha = e.alpha;
    ctx.fillStyle = e.alpha > 0.5 ? "#ffb030" : "#ff6010";
    ctx.shadowColor = "#ff8020";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawSnowflakes(ctx: CanvasRenderingContext2D, flakes: Snowflake[], tick: number) {
  flakes.forEach((f) => {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.translate(f.x, f.y);
    ctx.rotate(tick * 0.01 + f.phase);
    ctx.strokeStyle = `rgba(200,240,255,0.9)`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i / 6) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, f.r);
      ctx.moveTo(0, f.r * 0.5);
      ctx.lineTo(f.r * 0.25, f.r * 0.7);
      ctx.moveTo(0, f.r * 0.5);
      ctx.lineTo(-f.r * 0.25, f.r * 0.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  });
}

function drawAnglerLights(ctx: CanvasRenderingContext2D, lights: AnglerLight[], tick: number) {
  lights.forEach((l) => {
    const pulse = 0.6 + Math.sin(tick * 0.08 + l.phase) * 0.4;
    ctx.save();
    ctx.globalAlpha = pulse * 0.7;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 30;
    const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 2.5);
    grad.addColorStop(0, l.color);
    grad.addColorStop(0.4, l.color + "60");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Core dot
    ctx.globalAlpha = pulse;
    ctx.shadowBlur = 15;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ─────────────────────────────────────────────
// DRAWING: OBSTACLES
// ─────────────────────────────────────────────

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  x: number, gapY: number, gap: number, w: number, canvasH: number,
  theme: Theme, tick: number, themeIdx: number
) {
  const topH = gapY - gap / 2;
  const botY = gapY + gap / 2;
  const botH = canvasH - botY;

  drawPillar(ctx, x, 0, w, topH, theme.topColors, theme.topBranchColors, tick, true, themeIdx);
  drawPillar(ctx, x, botY, w, botH, theme.botColors, theme.botBranchColors, tick, false, themeIdx);
}

function drawPillar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  colors: [string, string, string, string],
  branchColors: [string, string, string],
  tick: number, fromTop: boolean, themeIdx: number
) {
  if (h <= 0) return;
  ctx.save();

  // Body gradient
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.4, colors[1]);
  grad.addColorStop(0.7, colors[2]);
  grad.addColorStop(1, colors[3]);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Jagged edge
  const edgeY = fromTop ? y + h : y;
  const spikes = 6;
  const sw = w / spikes;
  ctx.fillStyle = colors[1];
  ctx.beginPath();
  if (fromTop) {
    ctx.moveTo(x, edgeY);
    for (let i = 0; i < spikes; i++) {
      const sx = x + i * sw;
      const peakH = 10 + Math.sin(i * 1.7 + tick * 0.01) * 5;
      ctx.lineTo(sx + sw / 2, edgeY + peakH);
      ctx.lineTo(sx + sw, edgeY);
    }
  } else {
    ctx.moveTo(x, edgeY);
    for (let i = 0; i < spikes; i++) {
      const sx = x + i * sw;
      const peakH = 10 + Math.sin(i * 1.7 + tick * 0.01) * 5;
      ctx.lineTo(sx + sw / 2, edgeY - peakH);
      ctx.lineTo(sx + sw, edgeY);
    }
  }
  ctx.lineTo(x + w, edgeY);
  ctx.closePath();
  ctx.fill();

  // Theme-specific decoration
  if (themeIdx === 3) {
    // Volcanic: lava cracks
    drawLavaCracks(ctx, x, y, w, h, tick);
  } else if (themeIdx === 4) {
    // Arctic: ice shards
    drawIceShards(ctx, x, y, w, h, fromTop, branchColors);
  } else if (themeIdx === 5) {
    // Midnight: bioluminescent veins
    drawBioVeins(ctx, x, y, w, h, tick, branchColors);
  } else {
    // Default: branches (coral / kelp / deep sea)
    const numBranches = 3;
    for (let b = 0; b < numBranches; b++) {
      const bx = x + (w / (numBranches + 1)) * (b + 1);
      const by = fromTop
        ? y + h * 0.2 + b * (h * 0.22)
        : y + h - h * 0.2 - b * (h * 0.22);
      drawBranch(ctx, bx, by, fromTop ? 1 : -1, branchColors[b % 3], tick + b * 30, themeIdx);
    }
  }

  // Seaweed on bottom (theme 0 & 1)
  if (!fromTop && h > 60 && (themeIdx === 0 || themeIdx === 1)) {
    for (let s = 0; s < 3; s++) {
      const sx = x + w * 0.2 + s * (w * 0.3);
      const swayH = 30 + s * 10;
      const swayAmt = Math.sin(tick * 0.04 + s * 1.5) * 6;
      ctx.strokeStyle = themeIdx === 1 ? `hsl(${130 + s * 20}, 65%, 30%)` : `hsl(${140 + s * 15}, 60%, 35%)`;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, y + h);
      ctx.quadraticCurveTo(sx + swayAmt, y + h - swayH / 2, sx + swayAmt * 1.5, y + h - swayH);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawBranch(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, color: string, tick: number, themeIdx: number) {
  const sway = Math.sin(tick * 0.05) * 3;
  const glowing = themeIdx === 2 || themeIdx === 5;
  if (glowing) { ctx.shadowColor = color; ctx.shadowBlur = 12; }

  ctx.strokeStyle = color;
  ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + sway, y + dir * 25);
  ctx.stroke();

  ctx.lineWidth = 3;
  for (let i = 0; i < 2; i++) {
    const angle = (i === 0 ? -0.6 : 0.6) + sway * 0.05;
    ctx.beginPath();
    ctx.moveTo(x + sway * 0.5, y + dir * 12);
    ctx.lineTo(x + sway * 0.5 + Math.sin(angle) * 14, y + dir * 12 + Math.cos(angle) * dir * 14);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  ctx.shadowBlur = glowing ? 10 : 6;
  ctx.shadowColor = color;
  const tips: [number, number][] = [
    [x + sway, y + dir * 27],
    [x + sway * 0.5 + Math.sin(-0.6) * 15, y + dir * 27],
    [x + sway * 0.5 + Math.sin(0.6) * 15, y + dir * 27],
  ];
  tips.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, glowing ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
}

function drawLavaCracks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tick: number) {
  const glow = 0.5 + Math.sin(tick * 0.06) * 0.5;
  ctx.strokeStyle = `rgba(255,${Math.floor(100 + glow * 60)},0,0.7)`;
  ctx.shadowColor = "#ff6000";
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let c = 0; c < 3; c++) {
    const cx = x + w * (0.2 + c * 0.3);
    ctx.beginPath();
    ctx.moveTo(cx, y);
    let cy = y;
    while (cy < y + h) {
      cy += 15 + Math.random() * 10;
      ctx.lineTo(cx + (Math.random() - 0.5) * 10, Math.min(cy, y + h));
    }
    ctx.stroke();
    // Lava glow dots
    ctx.fillStyle = `rgba(255,160,0,${glow * 0.8})`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.4 + c * 20, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawIceShards(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fromTop: boolean, colors: [string, string, string]) {
  const edgeY = fromTop ? y + h : y;
  const dir = fromTop ? 1 : -1;
  const numShards = 4;
  for (let s = 0; s < numShards; s++) {
    const sx = x + (w / (numShards)) * s + w / (numShards * 2);
    const shardH = (20 + s * 12) * (s % 2 === 0 ? 1 : 0.7);
    ctx.fillStyle = colors[s % 3];
    ctx.globalAlpha = 0.7;
    ctx.shadowColor = "#c0e8ff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(sx - 8, edgeY);
    ctx.lineTo(sx, edgeY + dir * shardH);
    ctx.lineTo(sx + 8, edgeY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawBioVeins(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tick: number, colors: [string, string, string]) {
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  for (let v = 0; v < 4; v++) {
    const vx = x + w * (0.15 + v * 0.25);
    const pulse = 0.4 + Math.sin(tick * 0.07 + v * 1.3) * 0.3;
    ctx.strokeStyle = colors[v % 3];
    ctx.shadowColor = colors[v % 3];
    ctx.shadowBlur = 10;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.moveTo(vx, y);
    let cy = y;
    while (cy < y + h) {
      cy += 18;
      ctx.lineTo(vx + Math.sin(cy * 0.15 + tick * 0.03) * 5, Math.min(cy, y + h));
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ─────────────────────────────────────────────
// DRAWING: UI
// ─────────────────────────────────────────────

function drawUI(ctx: CanvasRenderingContext2D, score: number, w: number, theme: Theme, themeIdx: number, themeName: string | null, themeAlpha: number) {
  // Score
  ctx.shadowColor = theme.scoreGlow;
  ctx.shadowBlur = 20;
  ctx.fillStyle = "white";
  ctx.font = "bold 42px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(score), w / 2, 70);
  ctx.shadowBlur = 0;

  // Theme name announcement
  if (themeName && themeAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = themeAlpha;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(w / 2 - 130, 88, 260, 44, 12);
    ctx.fill();
    ctx.fillStyle = theme.scoreGlow.replace("rgba", "rgb").replace(/,[\d.]+\)/, ")");
    ctx.shadowColor = theme.scoreGlow;
    ctx.shadowBlur = 12;
    ctx.font = `bold 15px 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${theme.emoji}  ${themeName}`, w / 2, 116);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Theme indicator dots at bottom
  const dotY = CANVAS_HEIGHT - 18;
  const totalDots = THEMES.length;
  const startX = w / 2 - ((totalDots - 1) * 16) / 2;
  for (let i = 0; i < totalDots; i++) {
    const isActive = i === themeIdx;
    ctx.beginPath();
    ctx.arc(startX + i * 16, dotY, isActive ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? "white" : "rgba(255,255,255,0.3)";
    if (isActive) {
      ctx.shadowColor = theme.scoreGlow;
      ctx.shadowBlur = 8;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D, state: GameState,
  score: number, best: number, w: number, h: number, theme: Theme
) {
  if (state === "idle") {
    ctx.fillStyle = "rgba(5,10,20,0.78)";
    ctx.beginPath();
    ctx.roundRect(w / 2 - 160, h / 2 - 145, 320, 268, 24);
    ctx.fill();

    ctx.fillStyle = theme.scoreGlow.replace("rgba", "rgb").replace(/,[\d.]+\)/, ")");
    ctx.shadowColor = theme.scoreGlow;
    ctx.shadowBlur = 16;
    ctx.font = "bold 34px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SEA TURTLE", w / 2, h / 2 - 98);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#4dc47a";
    ctx.font = "bold 20px 'Segoe UI', sans-serif";
    ctx.fillText("DASH", w / 2, h / 2 - 70);

    ctx.font = "54px serif";
    ctx.fillText("🐢", w / 2, h / 2 - 20);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.fillText("Tap or press SPACE", w / 2, h / 2 + 55);
    ctx.fillStyle = "rgba(150,210,255,0.7)";
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.fillText("to start swimming!", w / 2, h / 2 + 80);

    if (best > 0) {
      ctx.fillStyle = "#f0c060";
      ctx.font = "14px 'Segoe UI', sans-serif";
      ctx.fillText(`Best: ${best}`, w / 2, h / 2 + 108);
    }
  }

  if (state === "dead") {
    ctx.fillStyle = "rgba(5,10,20,0.82)";
    ctx.beginPath();
    ctx.roundRect(w / 2 - 160, h / 2 - 145, 320, 288, 24);
    ctx.fill();

    ctx.fillStyle = "#ff6b5b";
    ctx.font = "bold 30px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OH NO!", w / 2, h / 2 - 102);

    ctx.font = "48px serif";
    ctx.fillText("🐢", w / 2, h / 2 - 57);

    ctx.fillStyle = "white";
    ctx.font = "bold 24px 'Segoe UI', sans-serif";
    ctx.fillText(`Score: ${score}`, w / 2, h / 2 + 4);

    if (score >= best && score > 0) {
      ctx.fillStyle = "#f0c060";
      ctx.shadowColor = "#f0c060";
      ctx.shadowBlur = 10;
      ctx.font = "bold 16px 'Segoe UI', sans-serif";
      ctx.fillText("NEW BEST!", w / 2, h / 2 + 30);
      ctx.shadowBlur = 0;
    } else if (best > 0) {
      ctx.fillStyle = "#f0c060";
      ctx.font = "16px 'Segoe UI', sans-serif";
      ctx.fillText(`Best: ${best}`, w / 2, h / 2 + 30);
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.fillText("Tap or press SPACE", w / 2, h / 2 + 72);
    ctx.fillStyle = "rgba(150,210,255,0.7)";
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.fillText("to try again", w / 2, h / 2 + 96);
  }
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("idle");
  const turtleRef = useRef<TurtleState>({ y: CANVAS_HEIGHT / 2, vy: 0, angle: 0 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const tickRef = useRef(0);
  const scrollXRef = useRef(0);
  const lastObstacleTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const deathCooldownRef = useRef(0);

  // Theme state
  const themeIdxRef = useRef(0);
  const prevThemeIdxRef = useRef(0);
  const themeBlendRef = useRef(1);
  const themeNameRef = useRef<string | null>(null);
  const themeNameAlphaRef = useRef(0);

  // Ambient objects
  const jelliesRef = useRef<Jellyfish[]>([]);
  const embersRef = useRef<Ember[]>([]);
  const flakesRef = useRef<Snowflake[]>([]);
  const anglerLightsRef = useRef<AnglerLight[]>([]);

  const initBubbles = useCallback(() => {
    const bs: Bubble[] = [];
    for (let i = 0; i < 22; i++) {
      bs.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        r: 2 + Math.random() * 5,
        speed: 0.3 + Math.random() * 0.7,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }
    bubblesRef.current = bs;
  }, []);

  const initAmbientForTheme = useCallback((idx: number) => {
    const theme = THEMES[idx];
    if (theme.ambient === "jellyfish") {
      jelliesRef.current = Array.from({ length: theme.ambientCount }, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT * 0.8),
        phase: Math.random() * Math.PI * 2,
        r: 10 + Math.random() * 18,
        color: ["#b060ff", "#4080ff", "#ff60c0", "#60d0ff"][Math.floor(Math.random() * 4)],
        speed: 0.2 + Math.random() * 0.3,
      }));
    }
    if (theme.ambient === "embers") {
      embersRef.current = Array.from({ length: theme.ambientCount }, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: CANVAS_HEIGHT * 0.3 + Math.random() * CANVAS_HEIGHT * 0.6,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(0.4 + Math.random() * 0.8),
        alpha: 0.4 + Math.random() * 0.6,
        size: 1.5 + Math.random() * 2.5,
      }));
    }
    if (theme.ambient === "snowflakes") {
      flakesRef.current = Array.from({ length: theme.ambientCount }, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: 0.3 + Math.random() * 0.5,
        r: 4 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
      }));
    }
    if (theme.ambient === "angler") {
      anglerLightsRef.current = Array.from({ length: theme.ambientCount }, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        phase: Math.random() * Math.PI * 2,
        r: 6 + Math.random() * 10,
        color: ["#00ffb0", "#00e0ff", "#ff00c0", "#80ff00"][Math.floor(Math.random() * 4)],
      }));
    }
  }, []);

  const spawnParticles = useCallback((x: number, y: number) => {
    const theme = THEMES[themeIdxRef.current];
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: theme.particleColors[Math.floor(Math.random() * theme.particleColors.length)],
        size: 3 + Math.random() * 4,
      });
    }
  }, []);

  const resetGame = useCallback(() => {
    turtleRef.current = { y: CANVAS_HEIGHT / 2, vy: 0, angle: 0 };
    obstaclesRef.current = [];
    scoreRef.current = 0;
    particlesRef.current = [];
    tickRef.current = 0;
    scrollXRef.current = 0;
    lastObstacleTimeRef.current = 0;
    themeIdxRef.current = 0;
    prevThemeIdxRef.current = 0;
    themeBlendRef.current = 1;
    themeNameRef.current = null;
    themeNameAlphaRef.current = 0;
    initAmbientForTheme(0);
    stateRef.current = "playing";
  }, [initAmbientForTheme]);

  const jump = useCallback(() => {
    if (stateRef.current === "idle") { resetGame(); return; }
    if (stateRef.current === "dead") {
      if (deathCooldownRef.current > 0) return;
      resetGame(); return;
    }
    if (stateRef.current === "playing") {
      turtleRef.current.vy = JUMP_FORCE;
      const theme = THEMES[themeIdxRef.current];
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          x: TURTLE_X, y: turtleRef.current.y,
          vx: -1 - Math.random() * 2,
          vy: -1 - Math.random() * 2,
          alpha: 0.8,
          color: theme.particleColors[0],
          size: 2 + Math.random() * 3,
        });
      }
    }
  }, [resetGame]);

  useEffect(() => {
    initBubbles();
    initAmbientForTheme(0);

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", handleKey);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function gameLoop(timestamp: number) {
      const tick = tickRef.current++;
      const state = stateRef.current;
      const turtle = turtleRef.current;

      // Bubbles
      bubblesRef.current.forEach((b) => {
        b.y -= b.speed;
        if (b.y + b.r < 0) { b.y = CANVAS_HEIGHT + b.r; b.x = Math.random() * CANVAS_WIDTH; }
      });

      // Ambient updates
      const curThemeIdx = themeIdxRef.current;
      const curTheme = THEMES[curThemeIdx];

      if (curTheme.ambient === "jellyfish") {
        jelliesRef.current.forEach((j) => {
          j.y -= j.speed;
          if (j.y + j.r * 2 < 0) { j.y = CANVAS_HEIGHT + j.r; j.x = Math.random() * CANVAS_WIDTH; }
        });
      }
      if (curTheme.ambient === "embers") {
        embersRef.current.forEach((e) => {
          e.x += e.vx + Math.sin(tick * 0.05) * 0.3;
          e.y += e.vy;
          e.alpha -= 0.003;
          if (e.alpha <= 0 || e.y < 0) {
            e.x = Math.random() * CANVAS_WIDTH;
            e.y = CANVAS_HEIGHT * 0.7 + Math.random() * CANVAS_HEIGHT * 0.3;
            e.alpha = 0.5 + Math.random() * 0.5;
          }
        });
      }
      if (curTheme.ambient === "snowflakes") {
        flakesRef.current.forEach((f) => {
          f.y += f.speed;
          f.x += Math.sin(tick * 0.02 + f.phase) * 0.5;
          if (f.y > CANVAS_HEIGHT + f.r) { f.y = -f.r; f.x = Math.random() * CANVAS_WIDTH; }
        });
      }

      if (state === "playing") {
        scrollXRef.current += OBSTACLE_SPEED;

        turtle.vy += GRAVITY;
        turtle.y += turtle.vy;
        turtle.angle = Math.max(-0.5, Math.min(0.9, turtle.vy * 0.07));

        if (turtle.y - TURTLE_SIZE / 2 < 0) { turtle.y = TURTLE_SIZE / 2; turtle.vy = 1; }

        if (turtle.y + TURTLE_SIZE / 2 > CANVAS_HEIGHT - 20) {
          spawnParticles(TURTLE_X, turtle.y);
          stateRef.current = "dead";
          deathCooldownRef.current = 60;
          if (scoreRef.current > bestRef.current) bestRef.current = scoreRef.current;
        }

        // Spawn obstacles
        if (timestamp - lastObstacleTimeRef.current > OBSTACLE_INTERVAL) {
          const minGapY = OBSTACLE_GAP / 2 + 60;
          const maxGapY = CANVAS_HEIGHT - OBSTACLE_GAP / 2 - 60;
          const gapY = minGapY + Math.random() * (maxGapY - minGapY);
          obstaclesRef.current.push({ x: CANVAS_WIDTH + OBSTACLE_WIDTH, gapY, scored: false });
          lastObstacleTimeRef.current = timestamp;
        }

        // Move & score obstacles
        obstaclesRef.current = obstaclesRef.current.filter((obs) => {
          obs.x -= OBSTACLE_SPEED;
          if (!obs.scored && obs.x + OBSTACLE_WIDTH < TURTLE_X) {
            obs.scored = true;
            scoreRef.current++;

            // Theme transition check
            const newThemeIdx = getThemeIndex(scoreRef.current);
            if (newThemeIdx !== themeIdxRef.current) {
              prevThemeIdxRef.current = themeIdxRef.current;
              themeIdxRef.current = newThemeIdx;
              themeBlendRef.current = 0;
              themeNameRef.current = THEMES[newThemeIdx].name;
              themeNameAlphaRef.current = 1;
              initAmbientForTheme(newThemeIdx);
            }
          }

          // Collision
          const hitR = TURTLE_SIZE / 2 - 6;
          if (turtle.x !== undefined) return true; // ts guard
          const inXRange = TURTLE_X + hitR > obs.x && TURTLE_X - hitR < obs.x + OBSTACLE_WIDTH;
          if (inXRange) {
            const topEdge = obs.gapY - OBSTACLE_GAP / 2;
            const botEdge = obs.gapY + OBSTACLE_GAP / 2;
            if (turtle.y - hitR < topEdge || turtle.y + hitR > botEdge) {
              spawnParticles(TURTLE_X, turtle.y);
              stateRef.current = "dead";
              deathCooldownRef.current = 60;
              if (scoreRef.current > bestRef.current) bestRef.current = scoreRef.current;
            }
          }
          return obs.x + OBSTACLE_WIDTH > -10;
        });

        // Blend theme
        if (themeBlendRef.current < 1) themeBlendRef.current = Math.min(1, themeBlendRef.current + 0.012);
        // Fade out theme name
        if (themeNameAlphaRef.current > 0) themeNameAlphaRef.current = Math.max(0, themeNameAlphaRef.current - 0.008);
      }

      if (deathCooldownRef.current > 0) deathCooldownRef.current--;

      // Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.alpha -= 0.025;
        return p.alpha > 0;
      });

      // ─── DRAW ───
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const tIdx = themeIdxRef.current;
      const pIdx = prevThemeIdxRef.current;
      const blend = themeBlendRef.current;
      const theme = THEMES[tIdx];
      const prevTheme = THEMES[pIdx];

      drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, scrollXRef.current, bubblesRef.current, theme, prevTheme, blend, tick);

      // Ambient extras
      if (theme.ambient === "jellyfish" && blend > 0.1) {
        ctx.save(); ctx.globalAlpha = blend; drawJellyfish(ctx, jelliesRef.current, tick); ctx.restore();
      }
      if (theme.ambient === "embers") {
        ctx.save(); ctx.globalAlpha = blend; drawEmbers(ctx, embersRef.current); ctx.restore();
      }
      if (theme.ambient === "snowflakes") {
        ctx.save(); ctx.globalAlpha = blend; drawSnowflakes(ctx, flakesRef.current, tick); ctx.restore();
      }
      if (theme.ambient === "angler") {
        ctx.save(); ctx.globalAlpha = blend; drawAnglerLights(ctx, anglerLightsRef.current, tick); ctx.restore();
      }

      // Obstacles
      obstaclesRef.current.forEach((obs) => {
        drawObstacle(ctx, obs.x, obs.gapY, OBSTACLE_GAP, OBSTACLE_WIDTH, CANVAS_HEIGHT, theme, tick, tIdx);
      });

      // Turtle
      const showTurtle = state !== "dead" || Math.floor(tick / 5) % 2 === 0;
      if (showTurtle) drawTurtle(ctx, TURTLE_X, turtle.y, turtle.angle, TURTLE_SIZE, tIdx);

      // Particles
      particlesRef.current.forEach((p) => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (tIdx >= 2) { ctx.shadowColor = p.color; ctx.shadowBlur = 6; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;

      if (state === "playing" || state === "dead") {
        drawUI(ctx, scoreRef.current, CANVAS_WIDTH, theme, tIdx, themeNameRef.current, themeNameAlphaRef.current);
      }

      drawOverlay(ctx, state, scoreRef.current, bestRef.current, CANVAS_WIDTH, CANVAS_HEIGHT, theme);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener("keydown", handleKey); };
  }, [jump, initBubbles, spawnParticles, initAmbientForTheme]);

  const handleTap = useCallback(() => jump(), [jump]);

  const scale = Math.min(
    typeof window !== "undefined" ? window.innerWidth / CANVAS_WIDTH : 1,
    typeof window !== "undefined" ? window.innerHeight / CANVAS_HEIGHT : 1
  );

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100vw", height: "100vh", background: "#000005" }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ transform: `scale(${scale})`, transformOrigin: "center center", cursor: "pointer" }}
        onPointerDown={handleTap}
      />
    </div>
  );
}
