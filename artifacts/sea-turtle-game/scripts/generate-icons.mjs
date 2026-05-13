#!/usr/bin/env node
/**
 * generate-icons.mjs — Ocean Survivor app icon generator
 *
 * Generates PNG icons at all required sizes for Android and iOS using
 * the node:canvas package (server-side Canvas API).
 *
 * If node:canvas is unavailable, the script prints a guide for using
 * @capacitor/assets instead (the recommended production approach).
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * Output:
 *   android/app/src/main/res/mipmap-mdpi/ic_launcher.png       (48×48)
 *   android/app/src/main/res/mipmap-hdpi/ic_launcher.png       (72×72)
 *   android/app/src/main/res/mipmap-xhdpi/ic_launcher.png      (96×96)
 *   android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png     (144×144)
 *   android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png    (192×192)
 *   ios/App/App/Assets.xcassets/AppIcon.appiconset/             (all sizes)
 *   public/icon-512.png                                         (PWA icon)
 */

import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function drawIcon(ctx, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  // Ocean background gradient
  const bg = ctx.createRadialGradient(cx, cy * 0.7, r * 0.1, cx, cy, r);
  bg.addColorStop(0,   "#0a2a4a");
  bg.addColorStop(0.5, "#04182e");
  bg.addColorStop(1,   "#010c1a");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Bubble decorations
  const bubbleData = [
    { x: 0.22, y: 0.28, r: 0.04, a: 0.3 },
    { x: 0.78, y: 0.35, r: 0.03, a: 0.2 },
    { x: 0.15, y: 0.65, r: 0.025, a: 0.25 },
    { x: 0.82, y: 0.70, r: 0.035, a: 0.2 },
  ];
  bubbleData.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x * size, b.y * size, b.r * size, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(100,200,255,${b.a})`;
    ctx.lineWidth = size * 0.008;
    ctx.stroke();
  });

  // Turtle shell body
  const shellR = r * 0.38;
  const shellY = cy + r * 0.04;
  const shellGrad = ctx.createRadialGradient(
    cx - shellR * 0.2, shellY - shellR * 0.2, shellR * 0.05,
    cx, shellY, shellR
  );
  shellGrad.addColorStop(0,   "#4dc47a");
  shellGrad.addColorStop(0.5, "#2a8a4e");
  shellGrad.addColorStop(1,   "#1a5030");
  ctx.fillStyle = shellGrad;
  ctx.beginPath();
  ctx.ellipse(cx, shellY, shellR, shellR * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shell pattern — hexagonal plates
  const plateFactor = size < 72 ? 0 : 1;
  if (plateFactor > 0) {
    ctx.strokeStyle = "rgba(0,40,20,0.35)";
    ctx.lineWidth = size * 0.012;
    const pts = [
      [0, -0.55], [-0.38, -0.22], [-0.38, 0.22], [0, 0.55], [0.38, 0.22], [0.38, -0.22],
    ];
    const drawHex = (ox, oy, hr) => {
      ctx.beginPath();
      pts.forEach(([px, py], i) => {
        const x = cx + ox + px * hr;
        const y = shellY + oy + py * hr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    };
    const hr = shellR * 0.32;
    drawHex(0, 0, hr);
    drawHex(-hr * 1.1, -hr * 0.6, hr * 0.7);
    drawHex(hr * 1.1, -hr * 0.6, hr * 0.7);
    drawHex(-hr * 1.1, hr * 0.65, hr * 0.7);
    drawHex(hr * 1.1, hr * 0.65, hr * 0.7);
  }

  // Head
  const headR = shellR * 0.32;
  const headX = cx;
  const headY = shellY - shellR * 0.75;
  const headGrad = ctx.createRadialGradient(headX - headR * 0.2, headY - headR * 0.2, headR * 0.05, headX, headY, headR);
  headGrad.addColorStop(0, "#60d890");
  headGrad.addColorStop(1, "#2a8a4e");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  if (size >= 48) {
    const eyeR = headR * 0.28;
    const eyeX = headX + headR * 0.28;
    const eyeY = headY - headR * 0.15;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a3a20";
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.15, eyeY, eyeR * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY - eyeR * 0.3, eyeR * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flippers
  const flipperPairs = [
    { x: -0.68, y: -0.15, a: -0.4, l: 0.32, w: 0.12 },
    { x:  0.68, y: -0.15, a:  0.4, l: 0.32, w: 0.12 },
    { x: -0.55, y:  0.52, a:  0.5, l: 0.25, w: 0.10 },
    { x:  0.55, y:  0.52, a: -0.5, l: 0.25, w: 0.10 },
  ];
  ctx.fillStyle = "#2a8a4e";
  flipperPairs.forEach(f => {
    ctx.save();
    ctx.translate(cx + f.x * shellR, shellY + f.y * shellR);
    ctx.rotate(f.a);
    ctx.beginPath();
    ctx.ellipse(0, 0, f.l * shellR, f.w * shellR, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Ocean glow at bottom
  const glowGrad = ctx.createLinearGradient(0, size * 0.75, 0, size);
  glowGrad.addColorStop(0, "rgba(0,100,200,0)");
  glowGrad.addColorStop(1, "rgba(0,60,120,0.35)");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Slight vignette
  const vig = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vig;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function generatePng(size, outPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  drawIcon(ctx, size);
  const dir = dirname(outPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`  ✓ ${size}×${size}  → ${outPath.replace(ROOT + "/", "")}`);
}

const ANDROID_SIZES = [
  { dpi: "mdpi",    size: 48  },
  { dpi: "hdpi",    size: 72  },
  { dpi: "xhdpi",   size: 96  },
  { dpi: "xxhdpi",  size: 144 },
  { dpi: "xxxhdpi", size: 192 },
];

const IOS_SIZES = [
  { name: "Icon-20",    size: 20  },
  { name: "Icon-20@2x", size: 40  },
  { name: "Icon-20@3x", size: 60  },
  { name: "Icon-29",    size: 29  },
  { name: "Icon-29@2x", size: 58  },
  { name: "Icon-29@3x", size: 87  },
  { name: "Icon-40",    size: 40  },
  { name: "Icon-40@2x", size: 80  },
  { name: "Icon-40@3x", size: 120 },
  { name: "Icon-60@2x", size: 120 },
  { name: "Icon-60@3x", size: 180 },
  { name: "Icon-76",    size: 76  },
  { name: "Icon-76@2x", size: 152 },
  { name: "Icon-83.5@2x", size: 167 },
  { name: "Icon-1024",  size: 1024 },
];

try {
  console.log("\n🐢 Ocean Survivor — Icon Generator\n");

  console.log("Android icons:");
  ANDROID_SIZES.forEach(({ dpi, size }) => {
    const dir = join(ROOT, "android/app/src/main/res", `mipmap-${dpi}`);
    generatePng(size, join(dir, "ic_launcher.png"));
    generatePng(size, join(dir, "ic_launcher_round.png"));
    generatePng(size, join(dir, "ic_launcher_foreground.png"));
  });

  console.log("\niOS icons:");
  const iosIconSet = join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
  IOS_SIZES.forEach(({ name, size }) => {
    generatePng(size, join(iosIconSet, `${name}.png`));
  });

  console.log("\nPWA / store listing:");
  generatePng(512, join(ROOT, "public/icon-512.png"));
  generatePng(1024, join(ROOT, "public/icon-1024.png"));

  console.log("\n✅ All icons generated successfully!\n");
} catch (err) {
  if (err.code === "MODULE_NOT_FOUND" || err.message?.includes("canvas")) {
    console.error("\n⚠️  The `canvas` package is not installed.\n");
    console.log("Option A — Install canvas and run again:");
    console.log("  pnpm add -D canvas\n");
    console.log("Option B — Use @capacitor/assets (recommended for production):");
    console.log("  1. Create a 1024×1024 source icon at: resources/icon.png");
    console.log("  2. Run: pnpm exec capacitor-assets generate\n");
    console.log("Option C — Use an online tool or Figma to export at all required sizes.");
    process.exit(1);
  }
  throw err;
}
