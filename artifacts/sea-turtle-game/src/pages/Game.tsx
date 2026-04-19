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

type GameState = "idle" | "playing" | "dead";

interface TurtleState {
  y: number;
  vy: number;
  angle: number;
}

interface Obstacle {
  x: number;
  gapY: number;
  scored: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  alpha: number;
}

function drawTurtle(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const s = size / 46;

  // Shadow
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 10;

  // Body shell
  const shellGrad = ctx.createRadialGradient(-2 * s, -4 * s, 2 * s, 0, 0, 18 * s);
  shellGrad.addColorStop(0, "#4dc47a");
  shellGrad.addColorStop(0.5, "#2d8a4e");
  shellGrad.addColorStop(1, "#1a5c33");
  ctx.fillStyle = shellGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shell pattern
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1.5 * s;
  // Center hexagon
  ctx.beginPath();
  ctx.ellipse(0, 0, 7 * s, 5.5 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Ribs
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const ang = (i / 5) * Math.PI * 2;
    ctx.moveTo(Math.cos(ang) * 7 * s, Math.sin(ang) * 5.5 * s);
    ctx.lineTo(Math.cos(ang) * 16 * s, Math.sin(ang) * 12 * s);
    ctx.stroke();
  }

  // Head
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 6;
  const headGrad = ctx.createRadialGradient(20 * s, -2 * s, 1 * s, 20 * s, -1 * s, 9 * s);
  headGrad.addColorStop(0, "#7ee8a0");
  headGrad.addColorStop(1, "#3dab60");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(20 * s, -1 * s, 9 * s, 7.5 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(25 * s, -4 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(25.8 * s, -4.8 * s, 1 * s, 0, Math.PI * 2);
  ctx.fill();

  // Flippers
  const flipperColor = "#2d8a4e";
  ctx.fillStyle = flipperColor;

  // Front flippers
  ctx.beginPath();
  ctx.ellipse(10 * s, -16 * s, 5 * s, 10 * s, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10 * s, 16 * s, 5 * s, 10 * s, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Back flippers
  ctx.beginPath();
  ctx.ellipse(-12 * s, -14 * s, 4 * s, 8 * s, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-12 * s, 14 * s, 4 * s, 8 * s, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.beginPath();
  ctx.ellipse(-20 * s, 0, 5 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCoralObstacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  gapY: number,
  gap: number,
  w: number,
  canvasH: number,
  tick: number
) {
  const topH = gapY - gap / 2;
  const botY = gapY + gap / 2;
  const botH = canvasH - botY;

  // Coral colors
  const coralColors = ["#e8507a", "#d94040", "#f07050", "#c84080"];
  const coralColors2 = ["#40b0d8", "#2080c0", "#60c8e8", "#3090d0"];

  // TOP obstacle (coral hanging from top - like stalactites)
  drawCoralPillar(ctx, x, 0, w, topH, coralColors, tick, true);

  // BOTTOM obstacle (coral growing from bottom)
  drawCoralPillar(ctx, x, botY, w, botH, coralColors2, tick, false);
}

function drawCoralPillar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: string[],
  tick: number,
  fromTop: boolean
) {
  if (h <= 0) return;

  ctx.save();

  // Base block with gradient
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.4, colors[1]);
  grad.addColorStop(0.7, colors[2]);
  grad.addColorStop(1, colors[3]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();

  // Rocky / rough edge at the gap opening
  ctx.fillStyle = colors[1];
  const edgeY = fromTop ? y + h : y;
  const spikes = 6;
  const sw = w / spikes;
  ctx.beginPath();
  if (fromTop) {
    ctx.moveTo(x, edgeY);
    for (let i = 0; i < spikes; i++) {
      const sx = x + i * sw;
      const peakH = 10 + Math.sin(i * 1.7 + tick * 0.01) * 5;
      ctx.lineTo(sx + sw / 2, edgeY + peakH);
      ctx.lineTo(sx + sw, edgeY);
    }
    ctx.lineTo(x + w, edgeY);
    ctx.closePath();
  } else {
    ctx.moveTo(x, edgeY);
    for (let i = 0; i < spikes; i++) {
      const sx = x + i * sw;
      const peakH = 10 + Math.sin(i * 1.7 + tick * 0.01) * 5;
      ctx.lineTo(sx + sw / 2, edgeY - peakH);
      ctx.lineTo(sx + sw, edgeY);
    }
    ctx.lineTo(x + w, edgeY);
    ctx.closePath();
  }
  ctx.fill();

  // Draw coral branches
  const branchColors = fromTop
    ? ["#ff8fa0", "#e05070", "#ff6080"]
    : ["#80d0f0", "#50b0e0", "#90d8f8"];

  const numBranches = 3;
  for (let b = 0; b < numBranches; b++) {
    const bx = x + (w / (numBranches + 1)) * (b + 1);
    const by = fromTop ? y + h * 0.2 + b * (h * 0.22) : y + h - h * 0.2 - b * (h * 0.22);
    const baseColor = branchColors[b % branchColors.length];
    drawCoralBranch(ctx, bx, by, fromTop ? 1 : -1, baseColor, tick + b * 30);
  }

  // Seaweed swaying on bottom obstacles
  if (!fromTop && h > 60) {
    for (let s = 0; s < 3; s++) {
      const sx = x + w * 0.2 + s * (w * 0.3);
      const sy = y + h;
      const swayH = 30 + s * 10;
      const swayAmt = Math.sin(tick * 0.04 + s * 1.5) * 6;
      ctx.strokeStyle = `hsl(${140 + s * 15}, 60%, 35%)`;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + swayAmt, sy - swayH / 2, sx + swayAmt * 1.5, sy - swayH);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawCoralBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  color: string,
  tick: number
) {
  const sway = Math.sin(tick * 0.05) * 3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  // Main stem
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + sway, y + dir * 25);
  ctx.stroke();

  // Branches
  ctx.lineWidth = 3;
  for (let i = 0; i < 2; i++) {
    const angle = (i === 0 ? -0.6 : 0.6) + sway * 0.05;
    ctx.beginPath();
    ctx.moveTo(x + sway * 0.5, y + dir * 12);
    ctx.lineTo(
      x + sway * 0.5 + Math.sin(angle) * 14,
      y + dir * 12 + Math.cos(angle) * dir * 14
    );
    ctx.stroke();
  }

  // Tips - circles simulating polyps
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  [[x + sway, y + dir * 27], [x + sway * 0.5 + Math.sin(-0.6) * 15, y + dir * 27], [x + sway * 0.5 + Math.sin(0.6) * 15, y + dir * 27]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scrollX: number,
  bubbles: Bubble[]
) {
  // Deep ocean gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#051224");
  bg.addColorStop(0.4, "#0a1e3d");
  bg.addColorStop(0.8, "#0d2a50");
  bg.addColorStop(1, "#071830");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // God rays / light shafts
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const rx = ((i * 110 + scrollX * 0.05) % (w + 100)) - 50;
    const rayGrad = ctx.createLinearGradient(rx, 0, rx + 60, h);
    rayGrad.addColorStop(0, "rgba(100,200,255,0.06)");
    rayGrad.addColorStop(0.5, "rgba(100,200,255,0.03)");
    rayGrad.addColorStop(1, "rgba(100,200,255,0)");
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + 60, 0);
    ctx.lineTo(rx + 120, h);
    ctx.lineTo(rx - 40, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Bubbles
  bubbles.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(150,230,255,${b.alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Highlight
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,245,255,${b.alpha * 0.7})`;
    ctx.fill();
  });

  // Ocean floor
  const floorGrad = ctx.createLinearGradient(0, h - 60, 0, h);
  floorGrad.addColorStop(0, "#1a3a0a");
  floorGrad.addColorStop(1, "#0d2006");
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.moveTo(0, h - 30);
  for (let i = 0; i <= w; i += 20) {
    const bump = Math.sin((i + scrollX * 0.3) * 0.06) * 10;
    ctx.lineTo(i, h - 30 + bump);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Sandy patches on floor
  ctx.fillStyle = "rgba(180,130,60,0.2)";
  for (let i = 0; i < 4; i++) {
    const sx = ((i * 140 + scrollX * 0.2) % (w + 60)) - 30;
    ctx.beginPath();
    ctx.ellipse(sx, h - 25, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawUI(
  ctx: CanvasRenderingContext2D,
  score: number,
  best: number,
  w: number
) {
  // Score
  ctx.shadowColor = "rgba(0,200,255,0.8)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "white";
  ctx.font = "bold 42px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(score), w / 2, 70);
  ctx.shadowBlur = 0;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  score: number,
  best: number,
  w: number,
  h: number
) {
  if (state === "idle") {
    // Title card
    ctx.fillStyle = "rgba(5,18,36,0.75)";
    ctx.beginPath();
    ctx.roundRect(w / 2 - 160, h / 2 - 140, 320, 260, 24);
    ctx.fill();

    ctx.fillStyle = "#80e8ff";
    ctx.font = "bold 34px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SEA TURTLE", w / 2, h / 2 - 95);
    ctx.fillStyle = "#4dc47a";
    ctx.font = "bold 20px 'Segoe UI', sans-serif";
    ctx.fillText("DASH", w / 2, h / 2 - 67);

    // Turtle icon text
    ctx.font = "54px serif";
    ctx.fillText("🐢", w / 2, h / 2 - 18);

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
    ctx.fillStyle = "rgba(5,18,36,0.82)";
    ctx.beginPath();
    ctx.roundRect(w / 2 - 160, h / 2 - 140, 320, 280, 24);
    ctx.fill();

    ctx.fillStyle = "#ff6b5b";
    ctx.font = "bold 30px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OH NO!", w / 2, h / 2 - 100);

    ctx.font = "48px serif";
    ctx.fillText("🐢", w / 2, h / 2 - 55);

    ctx.fillStyle = "white";
    ctx.font = "bold 24px 'Segoe UI', sans-serif";
    ctx.fillText(`Score: ${score}`, w / 2, h / 2 + 5);

    if (score >= best) {
      ctx.fillStyle = "#f0c060";
      ctx.font = "bold 16px 'Segoe UI', sans-serif";
      ctx.fillText("NEW BEST!", w / 2, h / 2 + 30);
    } else {
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

  // Initialize bubbles
  const initBubbles = useCallback(() => {
    const bs: Bubble[] = [];
    for (let i = 0; i < 20; i++) {
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

  const spawnParticles = useCallback((x: number, y: number) => {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: ["#4dc47a", "#ff6b5b", "#80e8ff", "#f0c060"][Math.floor(Math.random() * 4)],
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
    stateRef.current = "playing";
  }, []);

  const jump = useCallback(() => {
    if (stateRef.current === "idle") {
      resetGame();
      return;
    }
    if (stateRef.current === "dead") {
      if (deathCooldownRef.current > 0) return;
      resetGame();
      return;
    }
    if (stateRef.current === "playing") {
      turtleRef.current.vy = JUMP_FORCE;
      // Splash particles
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          x: TURTLE_X,
          y: turtleRef.current.y,
          vx: -1 - Math.random() * 2,
          vy: -1 - Math.random() * 2,
          alpha: 0.8,
          color: "#80e8ff",
          size: 2 + Math.random() * 3,
        });
      }
    }
  }, [resetGame]);

  useEffect(() => {
    initBubbles();

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKey);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function gameLoop(timestamp: number) {
      const tick = tickRef.current;
      tickRef.current++;
      const state = stateRef.current;
      const turtle = turtleRef.current;

      // Bubbles
      bubblesRef.current.forEach((b) => {
        b.y -= b.speed;
        if (b.y + b.r < 0) {
          b.y = CANVAS_HEIGHT + b.r;
          b.x = Math.random() * CANVAS_WIDTH;
        }
      });

      if (state === "playing") {
        scrollXRef.current += OBSTACLE_SPEED;

        // Physics
        turtle.vy += GRAVITY;
        turtle.y += turtle.vy;
        turtle.angle = Math.max(-0.5, Math.min(0.9, turtle.vy * 0.07));

        // Ceiling
        if (turtle.y - TURTLE_SIZE / 2 < 0) {
          turtle.y = TURTLE_SIZE / 2;
          turtle.vy = 1;
        }

        // Floor death
        if (turtle.y + TURTLE_SIZE / 2 > CANVAS_HEIGHT - 20) {
          spawnParticles(TURTLE_X, turtle.y);
          stateRef.current = "dead";
          deathCooldownRef.current = 60;
          if (scoreRef.current > bestRef.current) {
            bestRef.current = scoreRef.current;
          }
        }

        // Spawn obstacles
        if (timestamp - lastObstacleTimeRef.current > OBSTACLE_INTERVAL) {
          const minGapY = OBSTACLE_GAP / 2 + 60;
          const maxGapY = CANVAS_HEIGHT - OBSTACLE_GAP / 2 - 60;
          const gapY = minGapY + Math.random() * (maxGapY - minGapY);
          obstaclesRef.current.push({
            x: CANVAS_WIDTH + OBSTACLE_WIDTH,
            gapY,
            scored: false,
          });
          lastObstacleTimeRef.current = timestamp;
        }

        // Move & score obstacles
        obstaclesRef.current = obstaclesRef.current.filter((obs) => {
          obs.x -= OBSTACLE_SPEED;

          // Score
          if (!obs.scored && obs.x + OBSTACLE_WIDTH < TURTLE_X) {
            obs.scored = true;
            scoreRef.current++;
          }

          // Collision detection
          const tx = TURTLE_X;
          const ty = turtle.y;
          const hitR = TURTLE_SIZE / 2 - 6;

          const inXRange = tx + hitR > obs.x && tx - hitR < obs.x + OBSTACLE_WIDTH;
          if (inXRange) {
            const topEdge = obs.gapY - OBSTACLE_GAP / 2;
            const botEdge = obs.gapY + OBSTACLE_GAP / 2;
            if (ty - hitR < topEdge || ty + hitR > botEdge) {
              spawnParticles(tx, ty);
              stateRef.current = "dead";
              deathCooldownRef.current = 60;
              if (scoreRef.current > bestRef.current) {
                bestRef.current = scoreRef.current;
              }
            }
          }

          return obs.x + OBSTACLE_WIDTH > -10;
        });
      }

      if (deathCooldownRef.current > 0) deathCooldownRef.current--;

      // Update particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.alpha -= 0.025;
        return p.alpha > 0;
      });

      // ——— DRAW ———
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, scrollXRef.current, bubblesRef.current);

      // Obstacles
      obstaclesRef.current.forEach((obs) => {
        drawCoralObstacle(ctx, obs.x, obs.gapY, OBSTACLE_GAP, OBSTACLE_WIDTH, CANVAS_HEIGHT, tick);
      });

      // Turtle (flash on death)
      const showTurtle =
        state !== "dead" || Math.floor(tick / 5) % 2 === 0;
      if (showTurtle) {
        drawTurtle(ctx, TURTLE_X, turtle.y, turtle.angle, TURTLE_SIZE);
      }

      // Particles
      particlesRef.current.forEach((p) => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // UI
      if (state === "playing" || state === "dead") {
        drawUI(ctx, scoreRef.current, bestRef.current, CANVAS_WIDTH);
      }

      // Overlays
      drawOverlay(ctx, state, scoreRef.current, bestRef.current, CANVAS_WIDTH, CANVAS_HEIGHT);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("keydown", handleKey);
    };
  }, [jump, initBubbles, spawnParticles]);

  const handleTap = useCallback(() => {
    jump();
  }, [jump]);

  // Scale canvas to fit screen
  const scale = Math.min(
    typeof window !== "undefined" ? window.innerWidth / CANVAS_WIDTH : 1,
    typeof window !== "undefined" ? window.innerHeight / CANVAS_HEIGHT : 1
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        background: "#051224",
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          cursor: "pointer",
          imageRendering: "pixelated",
        }}
        onPointerDown={handleTap}
      />
    </div>
  );
}
