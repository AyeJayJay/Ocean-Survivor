import { useEffect, useRef, useCallback, useState } from "react";
import DonateModal from "./DonateModal";
import BannerAd from "../ads/BannerAd";
import InterstitialAd from "../ads/InterstitialAd";
import RewardedAd from "../ads/RewardedAd";
import { adFrequencyManager } from "../ads/AdFrequencyManager";
import { analytics } from "../analytics/Analytics";
import { AdErrorBoundary } from "../ads/AdErrorBoundary";
import { soundManager } from "../audio/SoundManager";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const TURTLE_X = 80;
const TURTLE_SIZE = 46;
const GRAVITY = 0.45;
const JUMP_FORCE = -8.5;
const OBSTACLE_WIDTH = 62;
const TRASH_SPEED = 1.2;
const TRASH_INTERVAL = 2600;

// Fixed Flappy Bird-style difficulty — no ramping
const BASE_SPEED    = 3.0;
const BASE_GAP      = 170;
const BASE_INTERVAL = 1600;
// Themes still cycle on milestones (alternating 15 → 20 → 15 → 20…)
const MILESTONE_PATTERN = [15, 20];

// ─────────────────────────────────────────────
// THEME DEFINITIONS
// ─────────────────────────────────────────────

interface Theme {
  name: string; emoji: string;
  bgStops: [string, number][];
  rayColor: string; bubbleRgb: string;
  floorTop: string; floorBot: string; floorAccent: string;
  topColors: [string, string, string, string];
  botColors: [string, string, string, string];
  topBranchColors: [string, string, string];
  botBranchColors: [string, string, string];
  particleColors: string[];
  scoreGlow: string;
  ambient: "rays" | "jellyfish" | "embers" | "snowflakes" | "angler";
  ambientCount: number;
}

const THEMES: Theme[] = [
  { name: "Shallow Reef",  emoji: "🐠", bgStops: [["#051224",0],["#0a1e3d",0.4],["#0d2a50",0.8],["#071830",1]], rayColor: "rgba(100,200,255,", bubbleRgb: "150,230,255", floorTop: "#1a3a0a", floorBot: "#0d2006", floorAccent: "rgba(180,130,60,0.2)", topColors: ["#e8507a","#d94040","#f07050","#c84080"], botColors: ["#40b0d8","#2080c0","#60c8e8","#3090d0"], topBranchColors: ["#ff8fa0","#e05070","#ff6080"], botBranchColors: ["#80d0f0","#50b0e0","#90d8f8"], particleColors: ["#4dc47a","#ff6b5b","#80e8ff","#f0c060"], scoreGlow: "rgba(0,200,255,0.8)",   ambient: "rays",       ambientCount: 5 },
  { name: "Kelp Forest",   emoji: "🌿", bgStops: [["#021c14",0],["#045e38",0.3],["#067a48",0.7],["#021c14",1]], rayColor: "rgba(0,210,140,",    bubbleRgb: "0,200,140",   floorTop: "#043a24", floorBot: "#021410", floorAccent: "rgba(0,180,100,0.25)", topColors: ["#1a3a10","#122a08","#234e18","#0c1e08"], botColors: ["#3a5a20","#2c4818","#4c6e2c","#1e3010"], topBranchColors: ["#7a9440","#5a7428","#9ab455"], botBranchColors: ["#6a8438","#4e6820","#88a448"], particleColors: ["#7a9440","#9ab450","#c8b860","#4a6820"], scoreGlow: "rgba(120,160,60,0.9)",  ambient: "rays",       ambientCount: 6 },
  { name: "Deep Ocean",    emoji: "🪼", bgStops: [["#04051a",0],["#080a30",0.35],["#0c1048",0.7],["#060820",1]], rayColor: "rgba(80,80,220,",   bubbleRgb: "140,140,255", floorTop: "#08082a", floorBot: "#040412", floorAccent: "rgba(80,40,160,0.25)", topColors: ["#5020a0","#3d1080","#6a30c0","#2a0860"], botColors: ["#2040c0","#1030a0","#3050d0","#0c2080"], topBranchColors: ["#b060ff","#8040e0","#d090ff"], botBranchColors: ["#4080ff","#2060e0","#70a8ff"], particleColors: ["#b060ff","#4080ff","#80d8ff","#ff80d0"], scoreGlow: "rgba(120,80,255,0.9)",  ambient: "jellyfish",  ambientCount: 5 },
  { name: "Volcanic Vent", emoji: "🌋", bgStops: [["#120400",0],["#280800",0.3],["#180500",0.65],["#0a0200",1]], rayColor: "rgba(255,100,20,",  bubbleRgb: "255,140,60",  floorTop: "#300800", floorBot: "#180400", floorAccent: "rgba(255,80,0,0.3)",   topColors: ["#c03000","#801800","#e04010","#600c00"], botColors: ["#e05000","#a03000","#f06020","#702000"], topBranchColors: ["#ff8030","#e04000","#ffa050"], botBranchColors: ["#ffa040","#e06010","#ffb860"], particleColors: ["#ff8030","#ff4000","#ffb830","#ff6010"], scoreGlow: "rgba(255,120,30,0.9)",  ambient: "embers",     ambientCount: 18 },
  { name: "Arctic Waters", emoji: "🧊", bgStops: [["#081828",0],["#102838",0.35],["#183850",0.7],["#081828",1]], rayColor: "rgba(180,230,255,", bubbleRgb: "200,240,255", floorTop: "#102840", floorBot: "#081828", floorAccent: "rgba(180,230,255,0.2)", topColors: ["#a0d0f0","#80b8e0","#c0e0ff","#608090"], botColors: ["#80b0d0","#6090b0","#a0c8e8","#406080"], topBranchColors: ["#c8e8ff","#90c0e0","#e0f0ff"], botBranchColors: ["#b0d8f8","#80b0d0","#d0ecff"], particleColors: ["#c8e8ff","#ffffff","#a0d0f8","#e0f4ff"], scoreGlow: "rgba(180,230,255,0.95)", ambient: "snowflakes", ambientCount: 20 },
  { name: "Midnight Abyss",emoji: "🌑", bgStops: [["#000005",0],["#010008",0.4],["#020010",0.75],["#000008",1]], rayColor: "rgba(0,255,200,",   bubbleRgb: "0,255,180",   floorTop: "#010010", floorBot: "#000008", floorAccent: "rgba(0,200,150,0.2)",  topColors: ["#001830","#000c20","#002040","#000810"], botColors: ["#001020","#000818","#001830","#000408"], topBranchColors: ["#00ffb0","#00d890","#80ffcc"], botBranchColors: ["#00e0ff","#00b0d8","#80f0ff"], particleColors: ["#00ffb0","#00e0ff","#80ff00","#ff00c8"], scoreGlow: "rgba(0,255,180,1)",     ambient: "angler",     ambientCount: 8 },
];

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type GameState = "idle" | "playing" | "dead";
type TrashType = "bottle" | "bag" | "can" | "straw";

interface TurtleState { y: number; vy: number; angle: number }
interface Obstacle { x: number; gapY: number; gap: number; speed: number; scored: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number }
interface Bubble { x: number; y: number; r: number; speed: number; alpha: number }
interface Jellyfish { x: number; y: number; phase: number; r: number; color: string; speed: number }
interface Ember { x: number; y: number; vx: number; vy: number; alpha: number; size: number }
interface Snowflake { x: number; y: number; speed: number; r: number; phase: number }
interface AnglerLight { x: number; y: number; phase: number; r: number; color: string }
interface TrashItem { id: number; type: TrashType; x: number; y: number; baseY: number; phase: number; rotation: number; alpha: number }
interface FloatText { x: number; y: number; text: string; alpha: number; vy: number }

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ─────────────────────────────────────────────
// DRAWING: TURTLE
// ─────────────────────────────────────────────

function drawTurtle(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, themeIdx: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const s = size / 46;
  const glowing = themeIdx === 5;
  const OL = "rgba(0,0,0,0.85)";
  const olW = 1.2 * s;

  // Flippers first (behind shell)
  const flipperColor = glowing ? "#00c880" : "#2d8a4e";
  ctx.strokeStyle = OL; ctx.lineWidth = olW;
  ctx.fillStyle = flipperColor;
  ctx.beginPath(); ctx.ellipse(10*s,-16*s,5*s,10*s,-0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(10*s,16*s,5*s,10*s,0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-12*s,-14*s,4*s,8*s,0.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-12*s,14*s,4*s,8*s,-0.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-20*s,0,5*s,3*s,0,0,Math.PI*2); ctx.fill(); ctx.stroke();

  // Shell
  ctx.shadowColor = glowing ? "#00ffb0" : "rgba(0,0,0,0.35)";
  ctx.shadowBlur = glowing ? 16 : 10;
  const shellGrad = ctx.createRadialGradient(-2*s,-4*s,2*s,0,0,18*s);
  shellGrad.addColorStop(0, glowing ? "#60ffc0" : "#4dc47a");
  shellGrad.addColorStop(0.5, glowing ? "#00d890" : "#2d8a4e");
  shellGrad.addColorStop(1, glowing ? "#00804a" : "#1a5c33");
  ctx.fillStyle = shellGrad; ctx.strokeStyle = OL; ctx.lineWidth = olW;
  ctx.beginPath(); ctx.ellipse(0,0,18*s,14*s,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.5*s;
  ctx.beginPath(); ctx.ellipse(0,0,7*s,5.5*s,0,0,Math.PI*2); ctx.stroke();
  for (let i = 0; i < 5; i++) { const ang = (i/5)*Math.PI*2; ctx.beginPath(); ctx.moveTo(Math.cos(ang)*7*s,Math.sin(ang)*5.5*s); ctx.lineTo(Math.cos(ang)*16*s,Math.sin(ang)*12*s); ctx.stroke(); }

  // Head
  if (glowing) { ctx.shadowColor = "#00ffb0"; ctx.shadowBlur = 12; }
  const headGrad = ctx.createRadialGradient(20*s,-2*s,1*s,20*s,-1*s,9*s);
  headGrad.addColorStop(0, glowing ? "#a0ffd0" : "#7ee8a0"); headGrad.addColorStop(1, glowing ? "#00c070" : "#3dab60");
  ctx.fillStyle = headGrad; ctx.strokeStyle = OL; ctx.lineWidth = olW;
  ctx.beginPath(); ctx.ellipse(20*s,-1*s,9*s,7.5*s,0.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  // Eye
  ctx.fillStyle = "#1a1a2e"; ctx.beginPath(); ctx.arc(25*s,-4*s,2.5*s,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(25.8*s,-4.8*s,1*s,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────
// DRAWING: TRASH
// ─────────────────────────────────────────────

function drawTrashItem(ctx: CanvasRenderingContext2D, item: TrashItem, tick: number) {
  const wobbleY = Math.sin(tick * 0.025 + item.phase) * 8;
  ctx.save(); ctx.translate(item.x, item.y + wobbleY);
  ctx.rotate(item.rotation + Math.sin(tick * 0.018 + item.phase) * 0.08);
  ctx.globalAlpha = item.alpha;
  switch (item.type) {
    case "bottle": {
      ctx.fillStyle = "rgba(180,220,255,0.55)"; ctx.strokeStyle = "rgba(120,180,220,0.8)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(0, 4, 7, 11, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(220,60,60,0.85)"; ctx.beginPath(); ctx.rect(-3.5, -14, 7, 5); ctx.fill();
      ctx.fillStyle = "rgba(180,220,255,0.55)"; ctx.strokeStyle = "rgba(120,180,220,0.8)";
      ctx.beginPath(); ctx.rect(-2.5, -9.5, 5, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(100,170,220,0.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(5, 2); ctx.stroke();
      break;
    }
    case "bag": {
      ctx.fillStyle = "rgba(240,245,255,0.35)"; ctx.strokeStyle = "rgba(200,220,255,0.6)"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -14); ctx.bezierCurveTo(10, -10, 14, 0, 10, 10);
      ctx.bezierCurveTo(6, 16, -6, 16, -10, 10); ctx.bezierCurveTo(-14, 0, -10, -10, 0, -14);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(200,220,255,0.7)"; ctx.beginPath(); ctx.ellipse(0, -14, 3, 2, 0, 0, Math.PI*2); ctx.fill();
      break;
    }
    case "can": {
      const canGrad = ctx.createLinearGradient(-8, 0, 8, 0);
      canGrad.addColorStop(0, "rgba(160,170,180,0.85)"); canGrad.addColorStop(0.4, "rgba(220,230,240,0.9)"); canGrad.addColorStop(1, "rgba(140,150,160,0.8)");
      ctx.fillStyle = canGrad; ctx.strokeStyle = "rgba(100,110,120,0.7)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(-7, -10, 14, 20); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(190,200,210,0.9)";
      ctx.beginPath(); ctx.ellipse(0, -10, 7, 2.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 10, 7, 2.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(200,40,40,0.7)"; ctx.fillRect(-6.5, -4, 13, 8);
      break;
    }
    case "straw": {
      ctx.save(); ctx.rotate(0.3);
      const strawGrad = ctx.createLinearGradient(-3, 0, 3, 0);
      strawGrad.addColorStop(0, "rgba(255,140,30,0.85)"); strawGrad.addColorStop(0.5, "rgba(255,180,60,0.9)"); strawGrad.addColorStop(1, "rgba(255,120,20,0.8)");
      ctx.fillStyle = strawGrad; ctx.strokeStyle = "rgba(200,100,10,0.6)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.rect(-2.5, -16, 5, 32); ctx.fill(); ctx.stroke();
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

function drawFloatTexts(ctx: CanvasRenderingContext2D, texts: FloatText[]) {
  texts.forEach((ft) => {
    ctx.save(); ctx.globalAlpha = ft.alpha;
    ctx.font = "bold 14px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
    ctx.fillStyle = "#80e8ff"; ctx.shadowColor = "#00ccff"; ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.x, ft.y); ctx.restore();
  });
}

// ─────────────────────────────────────────────
// DRAWING: BACKGROUND
// ─────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, scrollX: number, bubbles: Bubble[], theme: Theme, tick: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  theme.bgStops.forEach(([color, stop]) => bg.addColorStop(stop, color));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  ctx.save();
  const rayCount = Math.min(theme.ambientCount, 6);
  for (let i = 0; i < rayCount; i++) {
    const rx = ((i * 110 + scrollX * 0.05) % (w + 100)) - 50;
    const rayGrad = ctx.createLinearGradient(rx, 0, rx + 60, h);
    rayGrad.addColorStop(0, theme.rayColor + "0.07)");
    rayGrad.addColorStop(0.5, theme.rayColor + "0.03)");
    rayGrad.addColorStop(1, theme.rayColor + "0)");
    ctx.fillStyle = rayGrad;
    ctx.beginPath(); ctx.moveTo(rx,0); ctx.lineTo(rx+60,0); ctx.lineTo(rx+120,h); ctx.lineTo(rx-40,h); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  bubbles.forEach((b) => {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(${theme.bubbleRgb},${b.alpha})`; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x - b.r*0.35, b.y - b.r*0.35, b.r*0.3, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${theme.bubbleRgb},${b.alpha*0.6})`; ctx.fill();
  });

  const floorGrad = ctx.createLinearGradient(0, h-60, 0, h);
  floorGrad.addColorStop(0, theme.floorTop); floorGrad.addColorStop(1, theme.floorBot);
  ctx.fillStyle = floorGrad;
  ctx.beginPath(); ctx.moveTo(0, h-30);
  for (let i = 0; i <= w; i += 20) { ctx.lineTo(i, h-30 + Math.sin((i + scrollX*0.3)*0.06)*10); }
  ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = theme.floorAccent;
  for (let i = 0; i < 4; i++) { const sx = ((i*140 + scrollX*0.2) % (w+60)) - 30; ctx.beginPath(); ctx.ellipse(sx, h-25, 35, 8, 0, 0, Math.PI*2); ctx.fill(); }
}

// ─────────────────────────────────────────────
// DRAWING: AMBIENT
// ─────────────────────────────────────────────

function drawJellyfish(ctx: CanvasRenderingContext2D, jellies: Jellyfish[], tick: number) {
  jellies.forEach((j) => {
    const bob = Math.sin(tick*0.03+j.phase)*5; const pulse = 0.85 + Math.sin(tick*0.05+j.phase)*0.15;
    ctx.save(); ctx.globalAlpha = 0.55; ctx.shadowColor = j.color; ctx.shadowBlur = 18;
    const bellGrad = ctx.createRadialGradient(j.x, j.y+bob-j.r*0.3, 1, j.x, j.y+bob, j.r*pulse);
    bellGrad.addColorStop(0, j.color+"cc"); bellGrad.addColorStop(1, j.color+"22");
    ctx.fillStyle = bellGrad; ctx.beginPath(); ctx.arc(j.x, j.y+bob, j.r*pulse, Math.PI, Math.PI*2); ctx.fill();
    ctx.strokeStyle = j.color+"80"; ctx.lineWidth = 1.2;
    for (let t = 0; t < 5; t++) {
      const tx = j.x - j.r*0.6 + t*(j.r*0.3); const len = 20 + Math.sin(tick*0.04+j.phase+t)*8;
      ctx.beginPath(); ctx.moveTo(tx, j.y+bob+j.r*0.1*pulse);
      ctx.quadraticCurveTo(tx+Math.sin(tick*0.06+t)*6, j.y+bob+len*0.5, tx+Math.sin(tick*0.04+t+1)*4, j.y+bob+len); ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.restore();
  });
}

function drawEmbers(ctx: CanvasRenderingContext2D, embers: Ember[]) {
  embers.forEach((e) => {
    ctx.globalAlpha = e.alpha; ctx.fillStyle = e.alpha > 0.5 ? "#ffb030" : "#ff6010";
    ctx.shadowColor = "#ff8020"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawSnowflakes(ctx: CanvasRenderingContext2D, flakes: Snowflake[], tick: number) {
  flakes.forEach((f) => {
    ctx.save(); ctx.globalAlpha = 0.6; ctx.translate(f.x, f.y); ctx.rotate(tick*0.01+f.phase);
    ctx.strokeStyle = "rgba(200,240,255,0.9)"; ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      ctx.save(); ctx.rotate((i/6)*Math.PI*2);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,f.r); ctx.moveTo(0,f.r*0.5); ctx.lineTo(f.r*0.25,f.r*0.7); ctx.moveTo(0,f.r*0.5); ctx.lineTo(-f.r*0.25,f.r*0.7); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  });
}

function drawAnglerLights(ctx: CanvasRenderingContext2D, lights: AnglerLight[], tick: number) {
  lights.forEach((l) => {
    const pulse = 0.6 + Math.sin(tick*0.08+l.phase)*0.4;
    ctx.save(); ctx.globalAlpha = pulse*0.7; ctx.shadowColor = l.color; ctx.shadowBlur = 30;
    const grad = ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r*2.5);
    grad.addColorStop(0, l.color); grad.addColorStop(0.4, l.color+"60"); grad.addColorStop(1,"transparent");
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(l.x,l.y,l.r*2.5,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = pulse; ctx.shadowBlur = 15; ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(l.x,l.y,l.r*0.4,0,Math.PI*2); ctx.fill(); ctx.restore();
  });
}

// Draws all floating particles for a given theme (ambient only — no background)
function drawAmbientForTheme(
  ctx: CanvasRenderingContext2D, theme: Theme,
  jellies: Jellyfish[], embers: Ember[], flakes: Snowflake[], lights: AnglerLight[],
  tick: number
) {
  if (theme.ambient === "jellyfish") drawJellyfish(ctx, jellies, tick);
  if (theme.ambient === "embers") drawEmbers(ctx, embers);
  if (theme.ambient === "snowflakes") drawSnowflakes(ctx, flakes, tick);
  if (theme.ambient === "angler") drawAnglerLights(ctx, lights, tick);
}

// ─────────────────────────────────────────────
// DRAWING: OBSTACLES
// ─────────────────────────────────────────────

function drawPillarDecorations(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  fromTop: boolean, branchColors: [string,string,string], tick: number, themeIdx: number
) {
  if (themeIdx === 3) {
    const glow = 0.5+Math.sin(tick*0.06)*0.5;
    ctx.strokeStyle=`rgba(255,${Math.floor(100+glow*60)},0,0.7)`;ctx.shadowColor="#ff6000";ctx.shadowBlur=8;ctx.lineWidth=2;ctx.lineCap="round";
    for(let c=0;c<3;c++){const cx=x+w*(0.2+c*0.3);ctx.beginPath();ctx.moveTo(cx,y);let cy=y;while(cy<y+h){cy+=15+Math.random()*10;ctx.lineTo(cx+(Math.random()-0.5)*10,Math.min(cy,y+h));}ctx.stroke();
    ctx.fillStyle=`rgba(255,160,0,${glow*0.8})`;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(cx,y+h*0.4+c*20,3,0,Math.PI*2);ctx.fill();}
    ctx.shadowBlur=0;
  } else if (themeIdx === 4) {
    const edgeY=fromTop?y+h:y;const dir=fromTop?1:-1;const numShards=4;
    for(let s=0;s<numShards;s++){const sx=x+(w/numShards)*s+w/(numShards*2);const shardH=(20+s*12)*(s%2===0?1:0.7);
    ctx.fillStyle=branchColors[s%3];ctx.globalAlpha=0.7;ctx.shadowColor="#c0e8ff";ctx.shadowBlur=8;
    ctx.beginPath();ctx.moveTo(sx-8,edgeY);ctx.lineTo(sx,edgeY+dir*shardH);ctx.lineTo(sx+8,edgeY);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  } else if (themeIdx === 5) {
    ctx.lineWidth=1.5;ctx.lineCap="round";
    for(let v=0;v<4;v++){const vx=x+w*(0.15+v*0.25);const pulse=0.4+Math.sin(tick*0.07+v*1.3)*0.3;
    ctx.strokeStyle=branchColors[v%3];ctx.shadowColor=branchColors[v%3];ctx.shadowBlur=10;ctx.globalAlpha=pulse;
    ctx.beginPath();ctx.moveTo(vx,y);let cy=y;while(cy<y+h){cy+=18;ctx.lineTo(vx+Math.sin(cy*0.15+tick*0.03)*5,Math.min(cy,y+h));}ctx.stroke();}
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  } else {
    const numBranches = 3;
    const glowing = themeIdx === 2;
    for (let b=0;b<numBranches;b++) {
      const bx = x+(w/(numBranches+1))*(b+1);
      const by = fromTop ? y+h*0.2+b*(h*0.22) : y+h-h*0.2-b*(h*0.22);
      const color = branchColors[b%3];
      const sway = Math.sin((tick+b*30)*0.05)*3;
      if (glowing) { ctx.shadowColor=color; ctx.shadowBlur=12; }
      ctx.strokeStyle=color; ctx.lineWidth=5; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+sway,by+(fromTop?1:-1)*25); ctx.stroke();
      ctx.lineWidth=3;
      const dir = fromTop?1:-1;
      for (let i=0;i<2;i++){const angle=(i===0?-0.6:0.6)+sway*0.05;ctx.beginPath();ctx.moveTo(bx+sway*0.5,by+dir*12);ctx.lineTo(bx+sway*0.5+Math.sin(angle)*14,by+dir*12+Math.cos(angle)*dir*14);ctx.stroke();}
      ctx.fillStyle=color; ctx.shadowBlur=glowing?10:6; ctx.shadowColor=color;
      [[bx+sway,by+dir*27],[bx+sway*0.5+Math.sin(-0.6)*15,by+dir*27],[bx+sway*0.5+Math.sin(0.6)*15,by+dir*27]].forEach(([cx,cy])=>{ctx.beginPath();ctx.arc(cx,cy,glowing?5:4,0,Math.PI*2);ctx.fill();});
      ctx.shadowBlur=0;
    }
    if (!fromTop && h > 60 && (themeIdx===0||themeIdx===1)) {
      for (let s=0;s<3;s++) {
        const sx=x+w*0.2+s*(w*0.3); const swayH=30+s*10; const swayAmt=Math.sin(tick*0.04+s*1.5)*6;
        ctx.strokeStyle=themeIdx===1?`hsl(${130+s*20},65%,30%)`:`hsl(${140+s*15},60%,35%)`;
        ctx.lineWidth=3; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(sx,y+h); ctx.quadraticCurveTo(sx+swayAmt,y+h-swayH/2,sx+swayAmt*1.5,y+h-swayH); ctx.stroke();
      }
    }
  }
}

function drawPillar(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  colors: [string,string,string,string], branchColors: [string,string,string],
  tick: number, fromTop: boolean, themeIdx: number
) {
  if (h <= 0) return;
  ctx.save();
  const grad = ctx.createLinearGradient(x,y,x+w,y);
  grad.addColorStop(0,colors[0]); grad.addColorStop(0.4,colors[1]); grad.addColorStop(0.7,colors[2]); grad.addColorStop(1,colors[3]);
  ctx.fillStyle = grad; ctx.fillRect(x,y,w,h);
  const edgeY = fromTop ? y+h : y; const spikes = 6; const sw = w/spikes;
  ctx.fillStyle = colors[1];
  ctx.beginPath();
  if (fromTop) { ctx.moveTo(x,edgeY); for (let i=0;i<spikes;i++){const sx=x+i*sw;const pk=10+Math.sin(i*1.7+tick*0.01)*5;ctx.lineTo(sx+sw/2,edgeY+pk);ctx.lineTo(sx+sw,edgeY);} }
  else { ctx.moveTo(x,edgeY); for (let i=0;i<spikes;i++){const sx=x+i*sw;const pk=10+Math.sin(i*1.7+tick*0.01)*5;ctx.lineTo(sx+sw/2,edgeY-pk);ctx.lineTo(sx+sw,edgeY);} }
  ctx.lineTo(x+w,edgeY); ctx.closePath(); ctx.fill();
  drawPillarDecorations(ctx, x, y, w, h, fromTop, branchColors, tick, themeIdx);
  ctx.restore();
}

function drawObstacle(
  ctx: CanvasRenderingContext2D, x: number, gapY: number, gap: number,
  w: number, canvasH: number, theme: Theme, tick: number, themeIdx: number
) {
  const topH = gapY - gap/2; const botY = gapY + gap/2; const botH = canvasH - botY;
  drawPillar(ctx,x,0,w,topH,theme.topColors,theme.topBranchColors,tick,true,themeIdx);
  drawPillar(ctx,x,botY,w,botH,theme.botColors,theme.botBranchColors,tick,false,themeIdx);
}

// ─────────────────────────────────────────────
// DRAWING: UI
// ─────────────────────────────────────────────

function drawUI(ctx: CanvasRenderingContext2D, score: number, trashCount: number, w: number, theme: Theme, themeIdx: number, themeName: string|null, themeAlpha: number) {
  ctx.shadowColor = theme.scoreGlow; ctx.shadowBlur = 20;
  ctx.fillStyle = "white"; ctx.font = "bold 42px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
  ctx.fillText(String(score), w/2, 70); ctx.shadowBlur = 0;
  ctx.textAlign = "right"; ctx.font = "13px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(150,220,255,0.8)"; ctx.fillText(`🧹 ${trashCount}`, w - 14, 70); ctx.textAlign = "center";

  if (themeName && themeAlpha > 0) {
    ctx.save(); ctx.globalAlpha = themeAlpha;
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.roundRect(w/2-130,88,260,44,12); ctx.fill();
    ctx.fillStyle = theme.scoreGlow.replace("rgba","rgb").replace(/,[\d.]+\)/,")");
    ctx.shadowColor = theme.scoreGlow; ctx.shadowBlur = 12;
    ctx.font = "bold 15px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${theme.emoji}  ${themeName}`, w/2, 116); ctx.shadowBlur = 0; ctx.restore();
  }

  const dotY = CANVAS_HEIGHT - 18; const totalDots = THEMES.length;
  const startX = w/2 - ((totalDots-1)*16)/2;
  for (let i=0;i<totalDots;i++) {
    ctx.beginPath(); ctx.arc(startX+i*16,dotY,i===themeIdx?5:3,0,Math.PI*2);
    ctx.fillStyle = i===themeIdx?"white":"rgba(255,255,255,0.3)";
    if (i===themeIdx){ctx.shadowColor=theme.scoreGlow;ctx.shadowBlur=8;}
    ctx.fill(); ctx.shadowBlur=0;
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, state: GameState, score: number, best: number, trashCount: number, w: number, h: number, theme: Theme) {
  if (state === "idle") {
    ctx.fillStyle = "rgba(5,10,20,0.78)"; ctx.beginPath(); ctx.roundRect(w/2-160,h/2-152,320,272,24); ctx.fill();
    ctx.fillStyle = theme.scoreGlow.replace("rgba","rgb").replace(/,[\d.]+\)/,")");
    ctx.shadowColor = theme.scoreGlow; ctx.shadowBlur = 16;
    ctx.font = "bold 34px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
    ctx.fillText("SEA TURTLE", w/2, h/2-105); ctx.shadowBlur = 0;
    ctx.fillStyle = "#4dc47a"; ctx.font = "bold 20px 'Segoe UI', sans-serif"; ctx.fillText("DASH", w/2, h/2-77);
    ctx.font = "54px serif"; ctx.fillText("🐢", w/2, h/2-27);
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "18px 'Segoe UI', sans-serif"; ctx.fillText("Tap or press SPACE", w/2, h/2+45);
    ctx.fillStyle = "rgba(150,210,255,0.7)"; ctx.font = "14px 'Segoe UI', sans-serif"; ctx.fillText("to start swimming!", w/2, h/2+70);
    if (best > 0) { ctx.fillStyle = "#f0c060"; ctx.font = "14px 'Segoe UI', sans-serif"; ctx.fillText(`Best: ${best}`, w/2, h/2+96); }
  }
  if (state === "dead") {
    ctx.fillStyle = "rgba(5,10,20,0.82)"; ctx.beginPath(); ctx.roundRect(w/2-160,h/2-152,320,272,24); ctx.fill();
    ctx.fillStyle = "#ff6b5b"; ctx.font = "bold 30px 'Segoe UI', sans-serif"; ctx.textAlign = "center"; ctx.fillText("OH NO!", w/2, h/2-110);
    ctx.font = "48px serif"; ctx.fillText("🐢", w/2, h/2-65);
    ctx.fillStyle = "white"; ctx.font = "bold 24px 'Segoe UI', sans-serif"; ctx.fillText(`Score: ${score}`, w/2, h/2-5);
    if (trashCount > 0) { ctx.fillStyle = "rgba(150,220,255,0.8)"; ctx.font = "13px 'Segoe UI', sans-serif"; ctx.fillText(`Ocean cleaned: ${trashCount} pieces 🧹`, w/2, h/2+18); }
    if (score >= best && score > 0) {
      ctx.fillStyle = "#f0c060"; ctx.shadowColor = "#f0c060"; ctx.shadowBlur = 10;
      ctx.font = "bold 16px 'Segoe UI', sans-serif"; ctx.fillText("NEW BEST!", w/2, h/2+40); ctx.shadowBlur = 0;
    } else if (best > 0) { ctx.fillStyle = "#f0c060"; ctx.font = "16px 'Segoe UI', sans-serif"; ctx.fillText(`Best: ${best}`, w/2, h/2+40); }
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "18px 'Segoe UI', sans-serif"; ctx.fillText("Tap or press SPACE", w/2, h/2+76);
    ctx.fillStyle = "rgba(150,210,255,0.7)"; ctx.font = "14px 'Segoe UI', sans-serif"; ctx.fillText("to try again", w/2, h/2+100);
  }
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("idle");
  const turtleRef = useRef<TurtleState>({ y: CANVAS_HEIGHT/2, vy: 0, angle: 0 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const tickRef = useRef(0);
  const scrollXRef = useRef(0);
  const lastObstacleTimeRef = useRef(0);
  const lastTrashTimeRef = useRef(0);
  const trashIdRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const deathCooldownRef = useRef(0);
  const trashItemsRef = useRef<TrashItem[]>([]);
  const floatTextsRef = useRef<FloatText[]>([]);
  const trashCountRef = useRef(0);

  // Theme — current and previous (for wipe transition)
  const themeIdxRef = useRef(0);
  const prevThemeIdxRef = useRef(0);
  // themeWipeXRef: the x position of the scrolling biome boundary.
  // null = no transition, number = vertical dividing line moving leftward.
  const themeWipeXRef = useRef<number | null>(null);
  const themeNameRef = useRef<string|null>(null);
  const themeNameAlphaRef = useRef(0);

  // Ad system
  const pendingRestartRef = useRef(false); // restart is waiting for interstitial to close
  const revivePosRef = useRef(CANVAS_HEIGHT / 2); // turtle Y position at time of death
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewarded, setShowRewarded] = useState(false);
  const [reviveUsed, setReviveUsed] = useState(false);
  const nearObstacleRef = useRef(false);
  const [gameplayBannerVisible, setGameplayBannerVisible] = useState(true);
  // Delay death-screen action buttons to prevent accidental taps on rapid death
  const [deathButtonsReady, setDeathButtonsReady] = useState(false);
  // Sound mute toggle — mirrors soundManager's persisted state
  const [soundMuted, setSoundMuted] = useState(soundManager.muted);

  // Theme milestone tracking (no difficulty ramp)
  const themeStepRef = useRef(0);
  const nextMilestoneRef = useRef(MILESTONE_PATTERN[0]);
  const milestoneAltIdxRef = useRef(1);

  // Ambient particles — two sets so both sides can display during wipe
  const jelliesRef = useRef<Jellyfish[]>([]);
  const embersRef = useRef<Ember[]>([]);
  const flakesRef = useRef<Snowflake[]>([]);
  const anglerLightsRef = useRef<AnglerLight[]>([]);
  const prevJelliesRef = useRef<Jellyfish[]>([]);
  const prevEmbersRef = useRef<Ember[]>([]);
  const prevFlakesRef = useRef<Snowflake[]>([]);
  const prevAnglerLightsRef = useRef<AnglerLight[]>([]);

  const [uiState, setUiState] = useState<GameState>("idle");
  const [showDonate, setShowDonate] = useState(false);
  const [donateResult, setDonateResult] = useState<"success"|"cancel"|null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("donate");
    if (d === "success" || d === "cancel") {
      setDonateResult(d);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const initBubbles = useCallback(() => {
    const bs: Bubble[] = [];
    for (let i=0;i<22;i++) bs.push({x:Math.random()*CANVAS_WIDTH,y:Math.random()*CANVAS_HEIGHT,r:2+Math.random()*5,speed:0.3+Math.random()*0.7,alpha:0.2+Math.random()*0.4});
    bubblesRef.current = bs;
  }, []);

  const initAmbientForTheme = useCallback((idx: number, saveOld = false) => {
    // Optionally copy current ambient into "prev" arrays before replacing
    if (saveOld) {
      prevJelliesRef.current = jelliesRef.current;
      prevEmbersRef.current = embersRef.current;
      prevFlakesRef.current = flakesRef.current;
      prevAnglerLightsRef.current = anglerLightsRef.current;
    }
    const theme = THEMES[idx];
    jelliesRef.current = [];
    embersRef.current = [];
    flakesRef.current = [];
    anglerLightsRef.current = [];
    if (theme.ambient==="jellyfish") jelliesRef.current = Array.from({length:theme.ambientCount},()=>({x:Math.random()*CANVAS_WIDTH,y:Math.random()*(CANVAS_HEIGHT*0.8),phase:Math.random()*Math.PI*2,r:10+Math.random()*18,color:["#b060ff","#4080ff","#ff60c0","#60d0ff"][Math.floor(Math.random()*4)],speed:0.2+Math.random()*0.3}));
    if (theme.ambient==="embers") embersRef.current = Array.from({length:theme.ambientCount},()=>({x:Math.random()*CANVAS_WIDTH,y:CANVAS_HEIGHT*0.3+Math.random()*CANVAS_HEIGHT*0.6,vx:(Math.random()-0.5)*0.8,vy:-(0.4+Math.random()*0.8),alpha:0.4+Math.random()*0.6,size:1.5+Math.random()*2.5}));
    if (theme.ambient==="snowflakes") flakesRef.current = Array.from({length:theme.ambientCount},()=>({x:Math.random()*CANVAS_WIDTH,y:Math.random()*CANVAS_HEIGHT,speed:0.3+Math.random()*0.5,r:4+Math.random()*6,phase:Math.random()*Math.PI*2}));
    if (theme.ambient==="angler") anglerLightsRef.current = Array.from({length:theme.ambientCount},()=>({x:Math.random()*CANVAS_WIDTH,y:Math.random()*CANVAS_HEIGHT,phase:Math.random()*Math.PI*2,r:6+Math.random()*10,color:["#00ffb0","#00e0ff","#ff00c0","#80ff00"][Math.floor(Math.random()*4)]}));
  }, []);

  const spawnParticles = useCallback((x: number, y: number) => {
    const theme = THEMES[themeIdxRef.current];
    for (let i=0;i<16;i++) {
      const angle=Math.random()*Math.PI*2; const speed=2+Math.random()*5;
      particlesRef.current.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,alpha:1,color:theme.particleColors[Math.floor(Math.random()*theme.particleColors.length)],size:3+Math.random()*4});
    }
  }, []);

  const resetGame = useCallback(() => {
    analytics.track("game_start");
    turtleRef.current = {y:CANVAS_HEIGHT/2,vy:0,angle:0};
    obstaclesRef.current = []; scoreRef.current = 0; particlesRef.current = [];
    tickRef.current = 0; scrollXRef.current = 0;
    lastObstacleTimeRef.current = 0; lastTrashTimeRef.current = 0;
    trashItemsRef.current = []; floatTextsRef.current = []; trashCountRef.current = 0;
    themeIdxRef.current = 0; prevThemeIdxRef.current = 0;
    themeWipeXRef.current = null; themeNameRef.current = null; themeNameAlphaRef.current = 0;
    themeStepRef.current = 0;
    nextMilestoneRef.current = MILESTONE_PATTERN[0];
    milestoneAltIdxRef.current = 1;
    setReviveUsed(false);
    prevJelliesRef.current = []; prevEmbersRef.current = []; prevFlakesRef.current = []; prevAnglerLightsRef.current = [];
    initAmbientForTheme(0);
    stateRef.current = "playing";
    setUiState("playing");
  }, [initAmbientForTheme]);

  // Show an interstitial if the frequency manager permits it.
  const tryShowInterstitial = useCallback((): boolean => {
    const decision = adFrequencyManager.canShowInterstitial();
    if (decision.allowed) {
      adFrequencyManager.recordInterstitial();
      analytics.track("interstitial_impression", { trigger: "restart" });
      setShowInterstitial(true);
      return true;
    }
    analytics.track("interstitial_suppressed", {
      reason: decision.reason,
      session_interstitial_count: adFrequencyManager.interstitialCount,
    });
    return false;
  }, []);

  // Attempt restart: gate on interstitial cooldown at this natural transition point.
  const attemptRestart = useCallback(() => {
    if (deathCooldownRef.current > 0) return;
    const adShown = tryShowInterstitial();
    if (adShown) {
      pendingRestartRef.current = true; // resetGame fires when the ad closes
    } else {
      resetGame();
    }
  }, [tryShowInterstitial, resetGame]);

  const jump = useCallback(() => {
    if (stateRef.current==="idle") { resetGame(); return; }
    if (stateRef.current==="dead") { attemptRestart(); return; }
    if (stateRef.current==="playing") {
      soundManager.playBubble();
      turtleRef.current.vy = JUMP_FORCE;
      const theme = THEMES[themeIdxRef.current];
      for (let i=0;i<5;i++) particlesRef.current.push({x:TURTLE_X,y:turtleRef.current.y,vx:-1-Math.random()*2,vy:-1-Math.random()*2,alpha:0.8,color:theme.particleColors[0],size:2+Math.random()*3});
    }
  }, [resetGame, attemptRestart]);

  const revive = useCallback(() => {
    const turtle = turtleRef.current;
    turtle.y = revivePosRef.current; // resume from exact death position
    turtle.vy = JUMP_FORCE * 0.4;   // gentle upward nudge so player has time to react
    turtle.angle = -0.1;
    deathCooldownRef.current = 0;
    stateRef.current = "playing";
    adFrequencyManager.recordRewardedAd(); // suppress interstitials for 3 min after reward
    analytics.track("game_revived", { score: scoreRef.current });
    setReviveUsed(true);
    setUiState("playing");
  }, []);

  // Reveal death-screen buttons after a short delay to prevent accidental taps
  // from a rapid-tapping player whose finger is still in motion when they die.
  useEffect(() => {
    if (uiState !== "dead") { setDeathButtonsReady(false); return; }
    const t = setTimeout(() => setDeathButtonsReady(true), 750);
    return () => clearTimeout(t);
  }, [uiState]);

  // Stable error-recovery callbacks for the ad error boundaries
  const onInterstitialError = useCallback(() => {
    setShowInterstitial(false);
    if (pendingRestartRef.current) { pendingRestartRef.current = false; resetGame(); }
  }, [resetGame]);

  const onRewardedError = useCallback(() => {
    setShowRewarded(false);
  }, []);

  useEffect(() => {
    analytics.track("session_start", { is_new_user: adFrequencyManager.newUser, session_number: adFrequencyManager.sessionNumber });
    initBubbles(); initAmbientForTheme(0);
    const handleKey = (e: KeyboardEvent) => { if (e.code==="Space"||e.code==="ArrowUp"){e.preventDefault();jump();} };
    window.addEventListener("keydown", handleKey);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function gameLoop(timestamp: number) {
      const tick = tickRef.current++;
      const state = stateRef.current;
      const turtle = turtleRef.current;

      bubblesRef.current.forEach((b)=>{b.y-=b.speed;if(b.y+b.r<0){b.y=CANVAS_HEIGHT+b.r;b.x=Math.random()*CANVAS_WIDTH;}});

      const curTheme = THEMES[themeIdxRef.current];
      if (curTheme.ambient==="jellyfish") jelliesRef.current.forEach((j)=>{j.y-=j.speed;if(j.y+j.r*2<0){j.y=CANVAS_HEIGHT+j.r;j.x=Math.random()*CANVAS_WIDTH;}});
      if (curTheme.ambient==="embers") embersRef.current.forEach((e)=>{e.x+=e.vx+Math.sin(tick*0.05)*0.3;e.y+=e.vy;e.alpha-=0.003;if(e.alpha<=0||e.y<0){e.x=Math.random()*CANVAS_WIDTH;e.y=CANVAS_HEIGHT*0.7+Math.random()*CANVAS_HEIGHT*0.3;e.alpha=0.5+Math.random()*0.5;}});
      if (curTheme.ambient==="snowflakes") flakesRef.current.forEach((f)=>{f.y+=f.speed;f.x+=Math.sin(tick*0.02+f.phase)*0.5;if(f.y>CANVAS_HEIGHT+f.r){f.y=-f.r;f.x=Math.random()*CANVAS_WIDTH;}});

      if (state === "playing") {
        const spd = BASE_SPEED;

        // Advance the biome wipe boundary at game speed
        if (themeWipeXRef.current !== null) {
          themeWipeXRef.current -= spd;
          if (themeWipeXRef.current <= 0) {
            themeWipeXRef.current = null;
            prevJelliesRef.current = []; prevEmbersRef.current = []; prevFlakesRef.current = []; prevAnglerLightsRef.current = [];
          }
        }

        scrollXRef.current += spd;
        turtle.vy += GRAVITY; turtle.y += turtle.vy;
        turtle.angle = Math.max(-0.5, Math.min(0.9, turtle.vy*0.07));
        if (turtle.y - TURTLE_SIZE/2 < 0) { turtle.y=TURTLE_SIZE/2; turtle.vy=1; }

        if (turtle.y + TURTLE_SIZE/2 > CANVAS_HEIGHT-20) {
          revivePosRef.current = turtle.y;
          spawnParticles(TURTLE_X, turtle.y); stateRef.current="dead"; deathCooldownRef.current=60;
          if (scoreRef.current>bestRef.current) bestRef.current=scoreRef.current;
          analytics.track("game_over", { score: scoreRef.current, death_cause: "floor", theme_index: themeIdxRef.current });
          setUiState("dead");
        }

        if (timestamp - lastObstacleTimeRef.current > BASE_INTERVAL) {
          const gap = BASE_GAP;
          const minGapY = gap/2 + 60; const maxGapY = CANVAS_HEIGHT - gap/2 - 60;
          obstaclesRef.current.push({
            x: CANVAS_WIDTH + OBSTACLE_WIDTH,
            gapY: minGapY + Math.random() * (maxGapY - minGapY),
            gap, speed: spd, scored: false,
          });
          lastObstacleTimeRef.current = timestamp;
        }

        if (timestamp - lastTrashTimeRef.current > TRASH_INTERVAL + Math.random()*1000) {
          const types: TrashType[] = ["bottle","bag","can","straw"];
          const type = types[Math.floor(Math.random()*types.length)];
          const y = 120 + Math.random() * 380;
          trashItemsRef.current.push({id:trashIdRef.current++,type,x:CANVAS_WIDTH+30,y,baseY:y,phase:Math.random()*Math.PI*2,rotation:(Math.random()-0.5)*0.5,alpha:0.9});
          lastTrashTimeRef.current = timestamp;
        }

        obstaclesRef.current = obstaclesRef.current.filter((obs)=>{
          obs.x -= obs.speed;
          if (!obs.scored && obs.x + OBSTACLE_WIDTH < TURTLE_X) {
            obs.scored = true;
            scoreRef.current++;

            if (scoreRef.current >= nextMilestoneRef.current) {
              themeStepRef.current++;

              const nextSize = MILESTONE_PATTERN[milestoneAltIdxRef.current];
              nextMilestoneRef.current += nextSize;
              milestoneAltIdxRef.current = (milestoneAltIdxRef.current + 1) % MILESTONE_PATTERN.length;

              const newThemeIdx = Math.min(themeStepRef.current, THEMES.length - 1);
              if (newThemeIdx !== themeIdxRef.current) {
                prevThemeIdxRef.current = themeIdxRef.current;
                themeIdxRef.current = newThemeIdx;
                // Start the side-scroll wipe from the right edge
                themeWipeXRef.current = CANVAS_WIDTH;
                themeNameRef.current = THEMES[newThemeIdx].name;
                themeNameAlphaRef.current = 1;
                // Initialize new ambient; save old ambient into prev arrays for left-side rendering
                initAmbientForTheme(newThemeIdx, true);
              }
            }
          }

          const hitR = TURTLE_SIZE/2 - 6;
          const inXRange = TURTLE_X+hitR > obs.x && TURTLE_X-hitR < obs.x+OBSTACLE_WIDTH;
          if (inXRange) {
            const topEdge = obs.gapY - obs.gap/2; const botEdge = obs.gapY + obs.gap/2;
            if (turtle.y-hitR < topEdge || turtle.y+hitR > botEdge) {
              revivePosRef.current = turtle.y;
              spawnParticles(TURTLE_X, turtle.y); stateRef.current="dead"; deathCooldownRef.current=60;
              if (scoreRef.current>bestRef.current) bestRef.current=scoreRef.current;
              analytics.track("game_over", { score: scoreRef.current, death_cause: "obstacle", theme_index: themeIdxRef.current });
              setUiState("dead");
            }
          }
          return obs.x + OBSTACLE_WIDTH > -10;
        });

        // Gameplay banner: hide when any obstacle is within 220px of the turtle
        {
          const dangerZone = 220;
          const isNear = obstaclesRef.current.some(
            (obs) => obs.x - TURTLE_X < dangerZone && obs.x + OBSTACLE_WIDTH > TURTLE_X - TURTLE_SIZE
          );
          if (isNear !== nearObstacleRef.current) {
            nearObstacleRef.current = isNear;
            setGameplayBannerVisible(!isNear);
          }
        }

        trashItemsRef.current = trashItemsRef.current.filter((t)=>{
          t.x -= TRASH_SPEED;
          const dx = TURTLE_X - t.x; const dy = turtle.y - (t.y + Math.sin(tick*0.025+t.phase)*8);
          if (Math.sqrt(dx*dx+dy*dy) < 34) {
            soundManager.playCollect();
            trashCountRef.current++;
            floatTextsRef.current.push({x:t.x,y:t.y-20,text:`+1 🧹`,alpha:1,vy:-1.2});
            for (let i=0;i<8;i++) { const a=Math.random()*Math.PI*2; particlesRef.current.push({x:t.x,y:t.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,alpha:0.9,color:"#80e8ff",size:2+Math.random()*3}); }
            return false;
          }
          return t.x > -40;
        });

        if (themeNameAlphaRef.current > 0) themeNameAlphaRef.current = Math.max(0, themeNameAlphaRef.current - 0.007);
      }

      if (deathCooldownRef.current > 0) deathCooldownRef.current--;
      particlesRef.current = particlesRef.current.filter((p)=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.alpha-=0.025;return p.alpha>0;});
      floatTextsRef.current = floatTextsRef.current.filter((f)=>{f.y+=f.vy;f.alpha-=0.018;return f.alpha>0;});

      // ─── DRAW ───
      ctx.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

      const tIdx = themeIdxRef.current;
      const pIdx = prevThemeIdxRef.current;
      const theme = THEMES[tIdx];
      const prevTheme = THEMES[pIdx];
      const wipeX = themeWipeXRef.current;

      if (wipeX !== null && wipeX > 0) {
        // LEFT side: old biome
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, wipeX, CANVAS_HEIGHT); ctx.clip();
        drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, scrollXRef.current, bubblesRef.current, prevTheme, tick);
        drawAmbientForTheme(ctx, prevTheme, prevJelliesRef.current, prevEmbersRef.current, prevFlakesRef.current, prevAnglerLightsRef.current, tick);
        ctx.restore();

        // RIGHT side: new biome
        ctx.save();
        ctx.beginPath(); ctx.rect(wipeX, 0, CANVAS_WIDTH - wipeX, CANVAS_HEIGHT); ctx.clip();
        drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, scrollXRef.current, bubblesRef.current, theme, tick);
        drawAmbientForTheme(ctx, theme, jelliesRef.current, embersRef.current, flakesRef.current, anglerLightsRef.current, tick);
        ctx.restore();

        // Wipe edge — a thin bright shimmer line at the boundary
        ctx.save();
        const shimmer = ctx.createLinearGradient(wipeX - 8, 0, wipeX + 8, 0);
        shimmer.addColorStop(0, "rgba(255,255,255,0)");
        shimmer.addColorStop(0.5, "rgba(255,255,255,0.45)");
        shimmer.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shimmer;
        ctx.fillRect(wipeX - 8, 0, 16, CANVAS_HEIGHT);
        ctx.restore();
      } else {
        drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, scrollXRef.current, bubblesRef.current, theme, tick);
        drawAmbientForTheme(ctx, theme, jelliesRef.current, embersRef.current, flakesRef.current, anglerLightsRef.current, tick);
      }

      trashItemsRef.current.forEach((t) => drawTrashItem(ctx, t, tick));

      // Obstacles: split by wipe line so each side renders with its own theme
      obstaclesRef.current.forEach((obs) => {
        if (wipeX !== null && obs.x < wipeX && obs.x + OBSTACLE_WIDTH > wipeX) {
          // Straddles the boundary — draw each side with correct theme using clipping
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, wipeX, CANVAS_HEIGHT); ctx.clip();
          drawObstacle(ctx, obs.x, obs.gapY, obs.gap, OBSTACLE_WIDTH, CANVAS_HEIGHT, prevTheme, tick, pIdx);
          ctx.restore();
          ctx.save(); ctx.beginPath(); ctx.rect(wipeX, 0, CANVAS_WIDTH - wipeX, CANVAS_HEIGHT); ctx.clip();
          drawObstacle(ctx, obs.x, obs.gapY, obs.gap, OBSTACLE_WIDTH, CANVAS_HEIGHT, theme, tick, tIdx);
          ctx.restore();
        } else {
          const inOldZone = wipeX !== null && obs.x + OBSTACLE_WIDTH <= wipeX;
          drawObstacle(ctx, obs.x, obs.gapY, obs.gap, OBSTACLE_WIDTH, CANVAS_HEIGHT,
            inOldZone ? prevTheme : theme, tick, inOldZone ? pIdx : tIdx);
        }
      });

      const showTurtle = state!=="dead"||Math.floor(tick/5)%2===0;
      if (showTurtle) drawTurtle(ctx,TURTLE_X,turtle.y,turtle.angle,TURTLE_SIZE,tIdx);

      particlesRef.current.forEach((p)=>{
        ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color;
        if(tIdx>=2){ctx.shadowColor=p.color;ctx.shadowBlur=6;}
        ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      });
      ctx.globalAlpha=1;

      drawFloatTexts(ctx, floatTextsRef.current);
      if (state==="playing"||state==="dead") drawUI(ctx,scoreRef.current,trashCountRef.current,CANVAS_WIDTH,theme,tIdx,themeNameRef.current,themeNameAlphaRef.current);
      drawOverlay(ctx,state,scoreRef.current,bestRef.current,trashCountRef.current,CANVAS_WIDTH,CANVAS_HEIGHT,theme);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener("keydown",handleKey); };
  }, [jump, initBubbles, spawnParticles, initAmbientForTheme]);

  const handleTap = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".no-jump")) return;
    jump();
  }, [jump]);

  const scale = Math.min(
    typeof window !== "undefined" ? window.innerWidth / CANVAS_WIDTH : 1,
    typeof window !== "undefined" ? window.innerHeight / CANVAS_HEIGHT : 1
  );

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"100vw", height:"100vh", background:"#000005" }}>
      <div style={{ position:"relative", width:CANVAS_WIDTH, height:CANVAS_HEIGHT, transform:`scale(${scale})`, transformOrigin:"center center" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ display:"block", cursor:"pointer" }}
          onPointerDown={handleTap}
        />

        {/* Sound mute toggle — always visible, top-right corner */}
        {!showInterstitial && !showRewarded && (
          <button
            className="no-jump"
            onPointerDown={(e) => {
              e.stopPropagation();
              soundManager.toggle();
              setSoundMuted(soundManager.muted);
            }}
            title={soundMuted ? "Unmute sounds" : "Mute sounds"}
            style={{
              position: "absolute",
              top: 8, right: 8,
              width: 30, height: 30,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, cursor: "pointer",
              color: "white", zIndex: 10,
              backdropFilter: "blur(2px)",
              transition: "background 0.2s",
            }}
          >
            {soundMuted ? "🔇" : "🔊"}
          </button>
        )}

        {/* Gameplay banner — compact strip at top, auto-hides near obstacles.
            interactive=false: impression-only during play; taps never register
            so the player can never accidentally click it mid-game. */}
        <BannerAd
          visible={uiState === "playing" && gameplayBannerVisible && !showInterstitial && !showRewarded}
          position="top"
          offset={4}
          compact
          interactive={false}
        />

        {/* Menu banner — full-size strip at bottom on idle/dead screens */}
        <BannerAd
          visible={(uiState === "idle" || uiState === "dead") && !showDonate && !showInterstitial && !showRewarded}
          position="bottom"
          offset={4}
        />

        {uiState !== "playing" && !showDonate && !showInterstitial && !showRewarded
          && (uiState !== "dead" || deathButtonsReady) && (
          <button
            className="no-jump"
            onPointerDown={(e) => { e.stopPropagation(); setShowDonate(true); }}
            style={{
              position:"absolute",
              bottom: uiState === "idle" ? 148 : 138,
              left:"50%", transform:"translateX(-50%)",
              background:"linear-gradient(135deg,#1a6040,#0d3a22)",
              border:"1.5px solid rgba(77,196,122,0.5)",
              borderRadius:20, color:"rgba(150,255,180,0.95)",
              padding:"8px 20px", fontSize:13, fontWeight:600,
              fontFamily:"'Segoe UI',sans-serif", cursor:"pointer",
              whiteSpace:"nowrap", letterSpacing:"0.01em",
              boxShadow:"0 0 16px rgba(77,196,122,0.2)",
            }}
          >
            🐢 Donate to Save Sea Turtles
          </button>
        )}

        {/* Rewarded ad offer — shown once per run on death, after 750ms grace */}
        {uiState === "dead" && deathButtonsReady && !reviveUsed && !showDonate && !showInterstitial && !showRewarded && (
          <button
            className="no-jump"
            onPointerDown={(e) => { e.stopPropagation(); analytics.track("rewarded_preroll_shown"); setShowRewarded(true); }}
            style={{
              position:"absolute",
              bottom: 92,
              left:"50%", transform:"translateX(-50%)",
              background:"linear-gradient(135deg,#1a2e50,#0d1a30)",
              border:"1.5px solid rgba(100,180,255,0.5)",
              borderRadius:20, color:"rgba(160,210,255,0.95)",
              padding:"9px 22px", fontSize:13, fontWeight:700,
              fontFamily:"'Segoe UI',sans-serif", cursor:"pointer",
              whiteSpace:"nowrap", letterSpacing:"0.01em",
              boxShadow:"0 0 20px rgba(100,180,255,0.2)",
            }}
          >
            ❤️ Watch Ad — Continue from Here
          </button>
        )}


        {donateResult && (
          <div className="no-jump" style={{
            position:"absolute", top:20, left:"50%", transform:"translateX(-50%)",
            background: donateResult==="success" ? "rgba(20,80,40,0.95)" : "rgba(60,20,20,0.9)",
            border:`1.5px solid ${donateResult==="success"?"rgba(77,196,122,0.6)":"rgba(255,100,100,0.4)"}`,
            borderRadius:12, color:"white", padding:"10px 20px", fontSize:13,
            fontFamily:"'Segoe UI',sans-serif", textAlign:"center",
            display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap",
          }}>
            {donateResult==="success" ? "🐢 Thank you! Your donation is making a difference!" : "Donation cancelled — you can try again anytime."}
            <button onPointerDown={(e)=>{e.stopPropagation();setDonateResult(null);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>
          </div>
        )}

        {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}

        {/* Interstitial — shown at restart transition, gated by frequency manager */}
        {showInterstitial && (
          <AdErrorBoundary onError={onInterstitialError}>
            <InterstitialAd onClose={() => {
              analytics.track("interstitial_dismissed");
              setShowInterstitial(false);
              if (pendingRestartRef.current) {
                pendingRestartRef.current = false;
                resetGame();
              }
            }} />
          </AdErrorBoundary>
        )}

        {/* Rewarded ad — user-triggered, grants a one-time revive */}
        {showRewarded && (
          <AdErrorBoundary onError={onRewardedError}>
            <RewardedAd
              onComplete={(rewarded) => {
                setShowRewarded(false);
                if (rewarded) {
                  analytics.track("rewarded_completed");
                  revive();
                }
              }}
            />
          </AdErrorBoundary>
        )}
      </div>
    </div>
  );
}
