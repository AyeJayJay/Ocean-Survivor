/*
 * MainMenuScene — polished title screen.
 *
 * Features:
 *  - Animated ocean background with parallax + bubbles
 *  - Bobbing turtle skin preview (selected skin)
 *  - Logo, high score, and tagline
 *  - Play, Settings, Achievements, Skins buttons
 *  - Daily challenge badge
 *  - Ocean music starts here
 */

import Phaser from "phaser";
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from "../game/GameConfig";
import { emitSceneChange } from "../game/EventBus";
import { saveManager } from "../save/SaveManager";
import { getSkinDef } from "../player/SkinDefs";
import { soundManager } from "../audio/SoundManager";
import { dailyChallengeManager } from "../progression/DailyChallengeManager";

interface BgShape {
  x: number; y: number; w: number; h: number;
  type: "rect" | "ellipse";
  layer: 0 | 1;
}

interface Bubble {
  x: number; y: number; r: number; speed: number; alpha: number;
}

export class MainMenuScene extends Phaser.Scene {
  private bgGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private turtleGfx!: Phaser.GameObjects.Graphics;

  private bgShapes: BgShape[] = [];
  private bubbles: Bubble[] = [];
  private scrollX = 0;
  private tick = 0;

  constructor() { super(SCENE.MAIN_MENU); }

  create(): void {
    this.bgGfx = this.add.graphics().setDepth(0);
    this.fxGfx = this.add.graphics().setDepth(1);
    this.turtleGfx = this.add.graphics().setDepth(10);

    this.buildBgShapes();
    this.buildUI();
    this.drawBackground();

    // Start music lazily (after any user interaction has unlocked AudioContext)
    this.input.once("pointerdown", () => soundManager.startMusic());

    emitSceneChange({ scene: "MainMenu" });
  }

  update(time: number, delta: number): void {
    this.tick++;
    const dt = delta / 1000;
    this.scrollX += 60 * dt;

    this.spawnBubbles(dt);
    this.updateBubbles(dt);
    this.drawBackground();

    // Bobbing turtle preview using current selected skin
    const bobY = Math.sin(time / 900) * 12;
    this.drawTurtle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.38 + bobY, time);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private startGame(): void {
    soundManager.playTap();
    this.cameras.main.fade(200, 0, 0, 0, false, (_: unknown, progress: number) => {
      if (progress >= 1) this.scene.start(SCENE.GAME);
    });
  }

  private buildBgShapes(): void {
    const rng = (a: number, b: number) => Phaser.Math.Between(a, b);
    for (let i = 0; i < 22; i++) {
      this.bgShapes.push({
        x: rng(0, GAME_WIDTH),
        y: rng(Math.floor(GAME_HEIGHT * 0.5), GAME_HEIGHT),
        w: rng(18, 55), h: rng(35, 90),
        type: rng(0, 1) === 0 ? "rect" : "ellipse",
        layer: 0,
      });
    }
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

    // Logo
    this.add.text(cx, GAME_HEIGHT * 0.14, "OCEAN", {
      fontSize: "56px", fontFamily: "Arial Black, Impact, sans-serif",
      color: "#00e8ff", stroke: "#003a60", strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(cx, GAME_HEIGHT * 0.14 + 58, "SURVIVOR", {
      fontSize: "38px", fontFamily: "Arial Black, Impact, sans-serif",
      color: "#80ffe8", stroke: "#003a60", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);

    // High score
    const hs = saveManager.highScore;
    if (hs > 0) {
      this.add.text(cx, GAME_HEIGHT * 0.14 + 104, `Best: ${hs}`, {
        fontSize: "17px", fontFamily: "Arial, sans-serif",
        color: "#ffd84a", stroke: "#2a1800", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    }

    // Tagline below turtle
    this.add.text(cx, GAME_HEIGHT * 0.58, "Help the turtle clean up the ocean", {
      fontSize: "13px", fontFamily: "Arial, sans-serif",
      color: "rgba(160,220,255,0.65)", align: "center",
    }).setOrigin(0.5).setDepth(20);

    // ── Daily challenge badge ──────────────────────────────────────────────────

    const dc = dailyChallengeManager.challenge;
    const dcDone = dailyChallengeManager.isCompleted;
    const dcProgress = dailyChallengeManager.progress;
    const dcFrac = Math.min(dcProgress / dc.goal, 1);

    const badgeY = GAME_HEIGHT * 0.63;
    const badgeW = 320;
    const badgeX = cx - badgeW / 2;

    const badgeG = this.add.graphics().setDepth(18);
    badgeG.fillStyle(dcDone ? 0x0a2818 : 0x0a1828, 0.88);
    badgeG.fillRoundedRect(badgeX, badgeY, badgeW, 52, 10);
    badgeG.lineStyle(1.5, dcDone ? 0x00a050 : 0x1e4060, 0.8);
    badgeG.strokeRoundedRect(badgeX, badgeY, badgeW, 52, 10);

    this.add.text(badgeX + 18, badgeY + 10, `${dc.icon}  DAILY`, {
      fontSize: "10px", fontFamily: "Arial, sans-serif",
      color: "rgba(100,180,220,0.7)", letterSpacing: 2,
    }).setOrigin(0, 0).setDepth(20);

    this.add.text(badgeX + 18, badgeY + 26, dc.description, {
      fontSize: "12px", fontFamily: "Arial, sans-serif",
      color: dcDone ? "#80ffcc" : "#c0e0ff",
    }).setOrigin(0, 0).setDepth(20);

    if (dcDone) {
      this.add.text(badgeX + badgeW - 16, badgeY + 26, "✓ Done!", {
        fontSize: "12px", fontFamily: "Arial, sans-serif",
        color: "#00e080",
      }).setOrigin(1, 0).setDepth(20);
    } else if (dcFrac > 0) {
      // Progress bar
      const pbX = badgeX + badgeW - 70;
      const pbY = badgeY + 30;
      const pbW = 60;
      badgeG.fillStyle(0x102030, 1);
      badgeG.fillRoundedRect(pbX, pbY, pbW, 6, 3);
      badgeG.fillStyle(0x2060a0, 1);
      badgeG.fillRoundedRect(pbX, pbY, Math.max(4, dcFrac * pbW), 6, 3);
    }

    // ── Play button ────────────────────────────────────────────────────────────

    const playBtn = this.add.text(cx, GAME_HEIGHT * 0.76, "▶  PLAY", {
      fontSize: "20px", fontFamily: "Arial Black, sans-serif",
      color: "#ffffff", backgroundColor: "#0e6e30",
      padding: { x: 34, y: 14 }, stroke: "#083018", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

    playBtn.on("pointerdown", () => this.startGame());
    playBtn.on("pointerover", () => playBtn.setStyle({ color: "#a0ffc0" }));
    playBtn.on("pointerout",  () => playBtn.setStyle({ color: "#ffffff" }));

    // Pulsing glow on play button
    this.tweens.add({
      targets: playBtn,
      scaleX: 1.04, scaleY: 1.04,
      yoyo: true, repeat: -1,
      duration: 800, ease: "Sine.easeInOut",
    });

    // ── Secondary buttons ──────────────────────────────────────────────────────

    const btnY = GAME_HEIGHT * 0.87;
    const btnStyle = {
      fontSize: "13px", fontFamily: "Arial, sans-serif",
      color: "#80b8e0", backgroundColor: "#0a1e30",
      padding: { x: 14, y: 10 }, stroke: "#040e18", strokeThickness: 2,
    };

    const skinsBtn = this.add.text(cx - 112, btnY, "🐢  SKINS", btnStyle)
      .setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

    const achBtn = this.add.text(cx, btnY, "🏆  AWARDS", btnStyle)
      .setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

    const settingsBtn = this.add.text(cx + 112, btnY, "⚙  OPTIONS", btnStyle)
      .setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

    const hover = (btn: Phaser.GameObjects.Text) => {
      btn.on("pointerover", () => btn.setStyle({ color: "#c0e8ff" }));
      btn.on("pointerout",  () => btn.setStyle({ color: "#80b8e0" }));
    };
    hover(skinsBtn); hover(achBtn); hover(settingsBtn);

    skinsBtn.on("pointerdown", () => {
      soundManager.playTap();
      this.cameras.main.fade(180, 0, 0, 0, false, (_: unknown, p: number) => {
        if (p >= 1) this.scene.start(SCENE.SKIN_SELECT, { from: SCENE.MAIN_MENU });
      });
    });

    achBtn.on("pointerdown", () => {
      soundManager.playTap();
      this.cameras.main.fade(180, 0, 0, 0, false, (_: unknown, p: number) => {
        if (p >= 1) this.scene.start(SCENE.ACHIEVEMENT, { from: SCENE.MAIN_MENU });
      });
    });

    settingsBtn.on("pointerdown", () => {
      soundManager.playTap();
      this.cameras.main.fade(180, 0, 0, 0, false, (_: unknown, p: number) => {
        if (p >= 1) this.scene.start(SCENE.SETTINGS, { from: SCENE.MAIN_MENU });
      });
    });
  }

  private spawnBubbles(dt: number): void {
    if (Math.random() < 6 * dt) {
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
    g.fillGradientStyle(0x010609, 0x010609, 0x041828, 0x041828, 1, 1, 1, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const fx = this.fxGfx;
    fx.clear();

    for (const shape of this.bgShapes) {
      const ratio = shape.layer === 0 ? 0.12 : 0.28;
      const sx = ((shape.x - this.scrollX * ratio) % GAME_WIDTH + GAME_WIDTH) % GAME_WIDTH;
      for (let rep = 0; rep < 2; rep++) {
        const dx = sx + rep * GAME_WIDTH;
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
    g.rotation = Math.sin(time / 1400) * 0.08;
    g.setScale(1.6);

    const skinDef = getSkinDef(saveManager.selectedSkin);
    skinDef.drawFn(g);
  }
}
