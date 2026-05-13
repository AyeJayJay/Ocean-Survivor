import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, PLAYER_X, INITIAL_SPEED, INITIAL_GAP,
  SPEED_RAMP, MAX_SPEED, GAP_SHRINK_RATE, MIN_GAP,
  SCORE_DIST_DIVISOR, LS_HIGH_SCORE, SCENE,
} from "../game/GameConfig";
import { Player } from "../player/Player";
import { ObstacleManager } from "../obstacles/ObstacleManager";
import { emitGameState, emitSceneChange, onCommand } from "../game/EventBus";
import { analytics } from "../analytics/Analytics";

// ── Local types ────────────────────────────────────────────────────────────────

interface BgShape {
  x: number; y: number; w: number; h: number;
  type: "rect" | "ellipse";
  layer: 0 | 1;
}

interface Bubble {
  x: number; y: number; r: number;
  speed: number; alpha: number;
}

type GameState = "playing" | "dead";

/*
 * GameScene — the main gameplay loop.
 *
 * State machine:
 *   playing → (collision) → dead → (revive command) → playing
 *   playing → (collision) → dead → (restart command) → GameOverScene
 *
 * React shell (App.tsx) handles all ad UI; this scene communicates via EventBus.
 */
export class GameScene extends Phaser.Scene {
  // Game objects
  private player!: Player;
  private obstacleManager!: ObstacleManager;

  // Background
  private bgGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private bgShapes: BgShape[] = [];
  private bubbles: Bubble[] = [];
  private scrollX = 0;
  private tick = 0;

  // HUD
  private scoreText!: Phaser.GameObjects.Text;
  private shellText!: Phaser.GameObjects.Text;

  // State
  private gameState: GameState = "playing";
  private score = 0;
  private bestScore = 0;
  private distanceTraveled = 0; // accumulated pixels (drives display score)
  private reviveUsed = false;
  private deathY = GAME_HEIGHT / 2;
  private speed = INITIAL_SPEED;
  private gap = INITIAL_GAP;
  private sessionStartTime = 0;

  constructor() { super(SCENE.GAME); }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  create(): void {
    this.bestScore = parseInt(localStorage.getItem(LS_HIGH_SCORE) ?? "0", 10) || 0;
    this.score = 0;
    this.distanceTraveled = 0;
    this.reviveUsed = false;
    this.speed = INITIAL_SPEED;
    this.gap = INITIAL_GAP;
    this.gameState = "playing";
    this.sessionStartTime = Date.now();
    this.scrollX = 0;
    this.tick = 0;
    this.bubbles = [];

    // Background
    this.bgGfx = this.add.graphics().setDepth(0);
    this.fxGfx = this.add.graphics().setDepth(1);
    this.buildBgShapes();

    // Player
    this.player = new Player(this, PLAYER_X, GAME_HEIGHT / 2);

    // ObstacleManager
    this.obstacleManager = new ObstacleManager(this);
    this.obstacleManager.reset(this.speed, this.gap);

    // HUD
    this.scoreText = this.add.text(GAME_WIDTH / 2, 52, "0", {
      fontSize: "42px", fontFamily: "Arial Black, sans-serif",
      color: "#ffffff", stroke: "#000000", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30);

    this.shellText = this.add.text(GAME_WIDTH - 14, 68, "🐚 0", {
      fontSize: "14px", fontFamily: "Arial, sans-serif",
      color: "#ffd84a", stroke: "#4a2800", strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(30);

    // Input
    this.input.on("pointerdown", this.handleInput, this);
    this.input.keyboard?.on("keydown-SPACE", this.handleInput, this);

    // Command listener from React (revive / restart).
    // Cleanup is bound to the Phaser SHUTDOWN scene event so the window
    // listener is always removed — even if shutdown() is never called manually.
    const removeCommandListener = onCommand((detail) => {
      if (detail.type === "revive") {
        if (detail.revived) this.doRevive();
        else this.goToGameOver();
      } else if (detail.type === "restart") {
        this.goToGameOver();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      removeCommandListener();
      this.player?.destroy();
      this.obstacleManager?.destroy();
    }, this);

    // Notify React
    emitSceneChange({ scene: "Game" });
    this.emitState();

    analytics.track("game_start");
  }

  update(_time: number, delta: number): void {
    this.tick++;
    const dt = delta / 1000;
    this.scrollX += this.speed * dt;

    // Always update background regardless of game state
    this.updateBubbles(dt);
    this.drawBackground();

    if (this.gameState === "playing") {
      // Difficulty ramp
      this.speed = Math.min(this.speed + SPEED_RAMP * dt, MAX_SPEED);
      this.obstacleManager.setSpeed(this.speed);

      // Update gameplay objects
      this.player.update();
      this.obstacleManager.update(delta);

      // Score — distance-based, increments in real time as turtle swims
      this.distanceTraveled += this.speed * dt;
      const newScore = Math.floor(this.distanceTraveled / SCORE_DIST_DIVISOR);
      if (newScore > this.score) {
        this.score = newScore;
        this.scoreText.setText(this.score.toString());
      }

      // Difficulty ramp — gap shrinks each time an obstacle pair is cleared
      const newlyPassed = this.obstacleManager.countNewlyScored(this.player.x);
      if (newlyPassed > 0) {
        this.gap = Math.max(this.gap - GAP_SHRINK_RATE * newlyPassed, MIN_GAP);
        this.obstacleManager.setGap(this.gap);
      }

      // Shells
      if (this.obstacleManager.checkShellCollision(this.player.x, this.player.y)) {
        this.shellText.setText(`🐚 ${this.obstacleManager.shellsCollected}`);
      }

      // Collision / out of bounds
      const hitObstacle = this.obstacleManager.checkObstacleCollision(this.player.x, this.player.y);
      const outOfBounds = this.player.isOutOfBounds();
      if (hitObstacle || outOfBounds) {
        this.onPlayerDeath();
      }
    } else {
      // Dead state: still animate the player (death flicker)
      this.player.update();
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  private handleInput(): void {
    if (this.gameState === "playing") {
      this.player.jump();
    }
    // Dead state taps are handled by React overlay buttons
  }

  // ── Death / Revive ───────────────────────────────────────────────────────────

  private onPlayerDeath(): void {
    if (this.gameState !== "playing") return;
    this.gameState = "dead";

    // Record death Y for revive
    this.deathY = this.player.y;

    // Kill physics momentum
    this.player.kill();

    // Update high score
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(LS_HIGH_SCORE, this.bestScore.toString());
    }

    // Freeze obstacle scrolling
    this.speed = 0;
    this.obstacleManager.setSpeed(0);

    // Death screen flash
    const flash = this.add.graphics().setDepth(50);
    flash.fillStyle(0xff4040, 0.3);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 350,
      onComplete: () => flash.destroy(),
    });

    // Notify React so it can show rewarded ad offer after 750ms
    this.emitState();
  }

  private doRevive(): void {
    if (this.gameState !== "dead") return;
    this.reviveUsed = true;
    this.gameState = "playing";

    // Resume scrolling with slight slowdown as a grace period
    this.speed = INITIAL_SPEED;
    this.obstacleManager.setSpeed(this.speed);

    // Restore player at death position
    this.player.revive(this.deathY);

    analytics.track("game_revived", { score: this.score });

    this.emitState();
  }

  private goToGameOver(): void {
    analytics.track("game_over", {
      score: this.score,
      best_score: this.bestScore,
      shells: this.obstacleManager.shellsCollected,
      duration_s: Math.round((Date.now() - this.sessionStartTime) / 1000),
    });

    const newRecord = this.score > 0 && this.score === this.bestScore;

    this.cameras.main.fade(250, 0, 0, 0, false, (_: unknown, progress: number) => {
      if (progress >= 1) {
        this.scene.start(SCENE.GAME_OVER, {
          score: this.score,
          bestScore: this.bestScore,
          shellsCollected: this.obstacleManager.shellsCollected,
          newRecord,
        });
      }
    });
  }

  // ── Score popup ───────────────────────────────────────────────────────────────

  private spawnScorePopup(count: number): void {
    const x = PLAYER_X + 55;
    const y = this.player.y - 20;
    const txt = this.add.text(x, y, count > 1 ? `+${count}` : "+1", {
      fontSize: "18px", fontFamily: "Arial, sans-serif",
      color: "#ffffff", stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(40);

    this.tweens.add({
      targets: txt, y: y - 55, alpha: 0,
      duration: 800, ease: "Power2",
      onComplete: () => txt.destroy(),
    });
  }

  // ── EventBus ──────────────────────────────────────────────────────────────────

  private emitState(): void {
    emitGameState({
      state: this.gameState === "playing" ? "playing" : "dead",
      score: this.score,
      bestScore: this.bestScore,
      reviveAvailable: !this.reviveUsed,
      shellsThisRun: this.obstacleManager?.shellsCollected ?? 0,
    });
  }

  // ── Background ───────────────────────────────────────────────────────────────

  private buildBgShapes(): void {
    const rng = (a: number, b: number) => Phaser.Math.Between(a, b);
    for (let i = 0; i < 22; i++) {
      this.bgShapes.push({
        x: rng(0, GAME_WIDTH), y: rng(Math.floor(GAME_HEIGHT * 0.5), GAME_HEIGHT),
        w: rng(16, 52), h: rng(30, 88),
        type: rng(0, 1) === 0 ? "rect" : "ellipse",
        layer: 0,
      });
    }
    for (let i = 0; i < 16; i++) {
      this.bgShapes.push({
        x: rng(0, GAME_WIDTH), y: rng(Math.floor(GAME_HEIGHT * 0.6), GAME_HEIGHT),
        w: rng(10, 28), h: rng(48, 115),
        type: "rect", layer: 1,
      });
    }
  }

  private updateBubbles(dt: number): void {
    if (Math.random() < 5 * dt) { // ~5 per second on average
      this.bubbles.push({
        x: Math.random() * GAME_WIDTH, y: GAME_HEIGHT + 5,
        r: 2 + Math.random() * 5,
        speed: 28 + Math.random() * 48,
        alpha: 0.18 + Math.random() * 0.32,
      });
    }
    for (const b of this.bubbles) b.y -= b.speed * dt;
    this.bubbles = this.bubbles.filter(b => b.y > -10);
    if (this.bubbles.length > 80) this.bubbles.splice(0, 20);
  }

  private drawBackground(): void {
    const g = this.bgGfx;
    g.clear();
    g.fillGradientStyle(0x010609, 0x010609, 0x041828, 0x041828, 1, 1, 1, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const fx = this.fxGfx;
    fx.clear();

    // Parallax shapes
    for (const shape of this.bgShapes) {
      const ratio = shape.layer === 0 ? 0.12 : 0.28;
      const offset = this.scrollX * ratio;
      const baseX = ((shape.x - offset % GAME_WIDTH) % GAME_WIDTH + GAME_WIDTH) % GAME_WIDTH;

      for (let rep = 0; rep < 2; rep++) {
        const dx = baseX + rep * GAME_WIDTH - GAME_WIDTH;
        if (dx + shape.w < 0 || dx > GAME_WIDTH) continue;
        const col = shape.layer === 0 ? 0x020e1c : 0x031526;
        const alpha = shape.layer === 0 ? 0.6 : 0.8;
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
      fx.lineStyle(1.2, 0x80d0ff, b.alpha);
      fx.strokeCircle(b.x, b.y, b.r);
    }
  }
}
