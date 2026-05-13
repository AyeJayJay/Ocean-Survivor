import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, PLAYER_X, INITIAL_SPEED, INITIAL_GAP,
  SPEED_RAMP, MAX_SPEED, GAP_SHRINK_RATE, MIN_GAP,
  SCORE_DIST_DIVISOR, SCENE,
} from "../game/GameConfig";
import { Player } from "../player/Player";
import { ObstacleManager } from "../obstacles/ObstacleManager";
import { ProgressionManager } from "../progression/ProgressionManager";
import { saveManager } from "../save/SaveManager";
import type { SkinId } from "../save/SaveManager";
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
 * REVIVE / RESTART UX DESIGN
 * ──────────────────────────
 * When the turtle dies, GameScene enters the "dead" state but does NOT
 * immediately transition to GameOverScene. Instead, it emits a "dead" game-
 * state event; App.tsx surfaces an overlay 750 ms later with two choices:
 *
 *   1. "Watch Ad — Continue"  → RewardedAd plays → emitReviveCommand({revived:true})
 *                               → doRevive() restores turtle at death Y and resumes
 *
 *   2. "Restart"              → emitRestartCommand() → goToGameOver() fades
 *                               to GameOverScene, which shows final score + high score
 *
 * This "revive while still in-run" pattern (used by Subway Surfers, Temple Run
 * etc.) is intentionally chosen over showing the offer on GameOverScene: the
 * player can see the game world frozen at the moment of death, raising emotional
 * investment and ad conversion rate. The GameOverScene is purely a score summary
 * screen; the ad/revive lifecycle is entirely owned by GameScene + App.tsx.
 *
 * React shell (App.tsx) handles all ad UI; this scene communicates via EventBus.
 */
export class GameScene extends Phaser.Scene {
  // Game objects
  private player!: Player;
  private obstacleManager!: ObstacleManager;
  private progressionManager!: ProgressionManager;

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
    this.bestScore = saveManager.highScore;
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

    // Background (depth 0, 1)
    this.bgGfx = this.add.graphics().setDepth(0);
    this.fxGfx = this.add.graphics().setDepth(1);
    this.buildBgShapes();

    // Progression manager (depth 2, 3 — above background, below obstacles)
    this.progressionManager = new ProgressionManager(this, () => {
      saveManager.setRestorationMilestone();
    });

    // Player (depth 20)
    this.player = new Player(this, PLAYER_X, GAME_HEIGHT / 2);

    // ObstacleManager (depth 5, 8)
    this.obstacleManager = new ObstacleManager(this);
    this.obstacleManager.reset(this.speed, this.gap);

    // HUD (depth 30)
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
    // Cleanup is bound to the Phaser SHUTDOWN scene event.
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
      this.progressionManager?.destroy();
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

      // Progression — ticks elapsed time and updates visual layers
      this.progressionManager.update(dt, this.scrollX);

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

      // Shells — collect and persist to SaveManager
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
    const sessionShells = this.obstacleManager.shellsCollected;
    const sessionDuration = Math.round((Date.now() - this.sessionStartTime) / 1000);

    analytics.track("game_over", {
      score: this.score,
      best_score: this.bestScore,
      shells: sessionShells,
      duration_s: sessionDuration,
    });

    // Persist game results — must happen before checkNewUnlocks()
    saveManager.recordGameOver(this.score, sessionShells);

    // Update local bestScore from SaveManager (it handles new-record logic)
    this.bestScore = saveManager.highScore;

    // Check and commit newly unlocked skins
    const newlyUnlocked = saveManager.checkNewUnlocks();
    for (const id of newlyUnlocked) {
      saveManager.unlockSkin(id);
    }

    const newRecord = this.score > 0 && this.score === this.bestScore;

    this.cameras.main.fade(250, 0, 0, 0, false, (_: unknown, progress: number) => {
      if (progress >= 1) {
        this.scene.start(SCENE.GAME_OVER, {
          score: this.score,
          bestScore: this.bestScore,
          shellsCollected: sessionShells,
          newRecord,
          newlyUnlockedSkins: newlyUnlocked as SkinId[],
          lifetimeShells: saveManager.lifetimeShells,
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
    // Bubble count scales with restoration stage
    const stage = this.progressionManager?.stage ?? 0;
    const spawnRate = 5 + stage * 1.5; // more bubbles as ocean heals
    if (Math.random() < spawnRate * dt) {
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

    // Blend from dark polluted ocean → bright restored ocean based on stage
    const bf = this.progressionManager?.brightnessFactor ?? 0;

    // Dark palette (polluted): deep dark blue-black
    // Bright palette (restored): medium ocean blue-teal
    const topDark   = 0x010609;
    const botDark   = 0x041828;
    const topBright = 0x042848;
    const botBright = 0x0a4060;

    const topColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(topDark),
      Phaser.Display.Color.IntegerToColor(topBright),
      100, Math.round(bf * 100)
    );
    const botColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(botDark),
      Phaser.Display.Color.IntegerToColor(botBright),
      100, Math.round(bf * 100)
    );

    const topInt = Phaser.Display.Color.GetColor(topColor.r, topColor.g, topColor.b);
    const botInt = Phaser.Display.Color.GetColor(botColor.r, botColor.g, botColor.b);

    g.fillGradientStyle(topInt, topInt, botInt, botInt, 1, 1, 1, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Light shafts at higher restoration stages
    if (bf > 0.3) {
      const shaftAlpha = (bf - 0.3) * 0.06;
      g.fillStyle(0x40d0ff, shaftAlpha);
      for (let i = 0; i < 5; i++) {
        const sx = (i * 120 - (this.scrollX * 0.04) % 600 + 600) % 600;
        g.beginPath();
        g.moveTo(sx - 20, 0);
        g.lineTo(sx + 20, 0);
        g.lineTo(sx + 60, GAME_HEIGHT);
        g.lineTo(sx + 20, GAME_HEIGHT);
        g.closePath();
        g.fillPath();
      }
    }

    const fx = this.fxGfx;
    fx.clear();

    // Parallax shapes (silhouette seabed shapes)
    for (const shape of this.bgShapes) {
      const ratio = shape.layer === 0 ? 0.12 : 0.28;
      const offset = this.scrollX * ratio;
      const baseX = ((shape.x - offset % GAME_WIDTH) % GAME_WIDTH + GAME_WIDTH) % GAME_WIDTH;

      for (let rep = 0; rep < 2; rep++) {
        const dx = baseX + rep * GAME_WIDTH - GAME_WIDTH;
        if (dx + shape.w < 0 || dx > GAME_WIDTH) continue;

        // Shapes brighten slightly at higher stages
        const colDark   = shape.layer === 0 ? 0x020e1c : 0x031526;
        const colBright = shape.layer === 0 ? 0x083858 : 0x0c4a70;
        const col = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(colDark),
          Phaser.Display.Color.IntegerToColor(colBright),
          100, Math.round(bf * 100)
        );
        const colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
        const alpha = shape.layer === 0 ? 0.6 : 0.8;
        fx.fillStyle(colInt, alpha);
        if (shape.type === "ellipse") {
          fx.fillEllipse(dx + shape.w / 2, shape.y, shape.w, shape.h);
        } else {
          fx.fillRect(dx, shape.y - shape.h, shape.w, shape.h);
        }
      }
    }

    // Bubbles
    const bubbleColor = bf > 0.5 ? 0xa0eeff : 0x80d0ff;
    for (const b of this.bubbles) {
      fx.lineStyle(1.2, bubbleColor, b.alpha);
      fx.strokeCircle(b.x, b.y, b.r);
    }
  }
}
