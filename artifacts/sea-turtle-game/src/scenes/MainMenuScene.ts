import Phaser from "phaser";
import { SCENE, GAME_WIDTH, GAME_HEIGHT, LS_HIGH_SCORE } from "../game/GameConfig";
import { emitSceneChange } from "../game/EventBus";

interface BgShape {
  x: number; y: number; w: number; h: number;
  type: "rect" | "ellipse";
  layer: 0 | 1;
}

interface Bubble {
  x: number; y: number; r: number; speed: number; alpha: number;
}

/*
 * MainMenuScene — title screen shown on launch and after returning from Game Over.
 * The actual "start game" transition happens here. The React shell shows a banner
 * ad at the bottom while this scene is active.
 */
export class MainMenuScene extends Phaser.Scene {
  private bgGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private turtleGfx!: Phaser.GameObjects.Graphics;
  private tapText!: Phaser.GameObjects.Text;

  private bgShapes: BgShape[] = [];
  private bubbles: Bubble[] = [];
  private scrollX = 0;
  private turtleBobY = 0;
  private tick = 0;

  constructor() { super(SCENE.MAIN_MENU); }

  create(): void {
    this.bgGfx = this.add.graphics().setDepth(0);
    this.fxGfx = this.add.graphics().setDepth(1);
    this.turtleGfx = this.add.graphics().setDepth(10);

    this.buildBgShapes();
    this.buildUI();
    this.drawBackground();

    // Tell React shell we're on the main menu (shows banner ad at bottom)
    emitSceneChange({ scene: "MainMenu" });

    // Input
    this.input.on("pointerdown", this.startGame, this);
    this.input.keyboard?.on("keydown-SPACE", this.startGame, this);
  }

  update(time: number, delta: number): void {
    this.tick++;
    const dt = delta / 1000;
    this.scrollX += 60 * dt; // px/s for parallax

    this.spawnBubbles(dt);
    this.updateBubbles(dt);
    this.drawBackground();

    // Turtle float bob
    this.turtleBobY = Math.sin(time / 900) * 12;
    this.drawTurtle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.4 + this.turtleBobY, time);

    // Pulse tap text
    this.tapText.setAlpha(0.65 + 0.35 * Math.sin(time / 500));
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private startGame(): void {
    this.input.off("pointerdown", this.startGame, this);
    this.input.keyboard?.off("keydown-SPACE", this.startGame, this);
    this.cameras.main.fade(200, 0, 0, 0, false, (_: unknown, progress: number) => {
      if (progress >= 1) this.scene.start(SCENE.GAME);
    });
  }

  private buildBgShapes(): void {
    const rng = (a: number, b: number) => Phaser.Math.Between(a, b);
    // Far layer — distant silhouettes
    for (let i = 0; i < 22; i++) {
      this.bgShapes.push({
        x: rng(0, GAME_WIDTH),
        y: rng(Math.floor(GAME_HEIGHT * 0.5), GAME_HEIGHT),
        w: rng(18, 55), h: rng(35, 90),
        type: rng(0, 1) === 0 ? "rect" : "ellipse",
        layer: 0,
      });
    }
    // Mid layer
    for (let i = 0; i < 16; i++) {
      this.bgShapes.push({
        x: rng(0, GAME_WIDTH),
        y: rng(Math.floor(GAME_HEIGHT * 0.6), GAME_HEIGHT),
        w: rng(10, 30), h: rng(50, 120),
        type: "rect",
        layer: 1,
      });
    }
  }

  private buildUI(): void {
    const cx = GAME_WIDTH / 2;

    // Title
    this.add.text(cx, GAME_HEIGHT * 0.2, "OCEAN", {
      fontSize: "56px", fontFamily: "Arial Black, Impact, sans-serif",
      color: "#00e8ff", stroke: "#003a60", strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(cx, GAME_HEIGHT * 0.2 + 58, "SURVIVOR", {
      fontSize: "38px", fontFamily: "Arial Black, Impact, sans-serif",
      color: "#80ffe8", stroke: "#003a60", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);

    // High score
    const hs = parseInt(localStorage.getItem(LS_HIGH_SCORE) ?? "0", 10) || 0;
    if (hs > 0) {
      this.add.text(cx, GAME_HEIGHT * 0.2 + 104, `Best: ${hs}`, {
        fontSize: "17px", fontFamily: "Arial, sans-serif",
        color: "#ffd84a", stroke: "#2a1800", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    }

    // Tagline
    this.add.text(cx, GAME_HEIGHT * 0.62, "A baby turtle fights to survive\na polluted ocean", {
      fontSize: "14px", fontFamily: "Arial, sans-serif",
      color: "rgba(160,220,255,0.7)", align: "center",
    }).setOrigin(0.5).setDepth(20);

    // Tap prompt
    this.tapText = this.add.text(cx, GAME_HEIGHT * 0.8, "TAP  OR  SPACE  TO  PLAY", {
      fontSize: "16px", fontFamily: "Arial, sans-serif",
      color: "#ffffff", stroke: "#000000", strokeThickness: 3,
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(20);
  }

  private spawnBubbles(dt: number): void {
    if (Math.random() < 6 * dt) { // ~6 per second on average
      this.bubbles.push({
        x: Math.random() * GAME_WIDTH,
        y: GAME_HEIGHT + 5,
        r: 2 + Math.random() * 5,
        speed: 25 + Math.random() * 45,
        alpha: 0.2 + Math.random() * 0.35,
      });
    }
  }

  private updateBubbles(dt: number): void {
    for (const b of this.bubbles) b.y -= b.speed * dt;
    this.bubbles = this.bubbles.filter(b => b.y > -10);
  }

  private drawBackground(): void {
    const g = this.bgGfx;
    g.clear();

    // Ocean gradient
    g.fillGradientStyle(0x010609, 0x010609, 0x041828, 0x041828, 1, 1, 1, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const fx = this.fxGfx;
    fx.clear();

    // Far layer shapes
    for (const shape of this.bgShapes) {
      const ratio = shape.layer === 0 ? 0.12 : 0.28;
      let sx = ((shape.x - this.scrollX * ratio) % GAME_WIDTH + GAME_WIDTH) % GAME_WIDTH;
      // Draw twice for seamless wrapping
      for (let rep = 0; rep < 2; rep++) {
        const dx = sx + rep * GAME_WIDTH - (rep === 0 ? 0 : 0);
        if (dx + shape.w < 0 || dx > GAME_WIDTH) continue;
        const col = shape.layer === 0 ? 0x020e1c : 0x031526;
        const alpha = shape.layer === 0 ? 0.65 : 0.82;
        fx.fillStyle(col, alpha);
        if (shape.type === "ellipse") {
          fx.fillEllipse(dx + shape.w / 2, shape.y, shape.w, shape.h);
        } else {
          fx.fillRect(dx, shape.y - shape.h, shape.w, shape.h);
        }
      }
    }

    // Bubbles
    for (const b of this.bubbles) {
      fx.lineStyle(1, 0x80d0f8, b.alpha);
      fx.strokeCircle(b.x, b.y, b.r);
    }
  }

  private drawTurtle(x: number, y: number, time: number): void {
    const g = this.turtleGfx;
    g.clear();
    g.x = x;
    g.y = y;

    // Slight sway
    g.rotation = Math.sin(time / 1400) * 0.08;

    const scale = 1.5; // larger on menu
    this.drawTurtleShape(g, scale);
  }

  private drawTurtleShape(g: Phaser.GameObjects.Graphics, s: number): void {
    // Tail
    g.fillStyle(0x1e6b38, 1);
    g.fillEllipse(-21 * s, 0, 12 * s, 7 * s);

    // Flippers
    g.fillStyle(0x236e3c, 1);
    g.fillEllipse(9 * s, -18 * s, 11 * s, 22 * s);
    g.fillEllipse(9 * s, 18 * s, 11 * s, 22 * s);
    g.fillEllipse(-12 * s, -13 * s, 9 * s, 17 * s);
    g.fillEllipse(-12 * s, 13 * s, 9 * s, 17 * s);

    // Shell
    g.fillStyle(0x2d8a4e, 1);
    g.fillEllipse(0, 0, 40 * s, 32 * s);
    g.fillStyle(0x3ea85e, 0.55);
    g.fillEllipse(-3 * s, -5 * s, 30 * s, 24 * s);
    g.fillStyle(0x62d488, 0.35);
    g.fillEllipse(-6 * s, -7 * s, 20 * s, 15 * s);
    g.lineStyle(1.5, 0x1a5c33, 0.5);
    g.strokeEllipse(0, 0, 16 * s, 13 * s);

    // Head
    g.fillStyle(0x39a65b, 1);
    g.fillEllipse(21 * s, -1 * s, 19 * s, 15 * s);
    g.fillStyle(0x7ee8a8, 0.4);
    g.fillEllipse(19 * s, -3 * s, 12 * s, 9 * s);

    // Eye
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(27 * s, -4 * s, 3 * s);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(28 * s, -5 * s, 1.2 * s);
  }
}
