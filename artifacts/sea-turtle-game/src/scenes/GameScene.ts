import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, PLAYER_X, INITIAL_SPEED, INITIAL_GAP,
  SPEED_RAMP, MAX_SPEED, GAP_SHRINK_RATE, MIN_GAP,
  SCORE_DIST_DIVISOR, SCENE,
  PLAYER_RADIUS, NEAR_MISS_THRESHOLD, SCORE_MILESTONES,
} from "../game/GameConfig";
import { Player } from "../player/Player";
import { ObstacleManager } from "../obstacles/ObstacleManager";
import { ProgressionManager } from "../progression/ProgressionManager";
import { achievementManager } from "../progression/AchievementManager";
import { dailyChallengeManager } from "../progression/DailyChallengeManager";
import { saveManager } from "../save/SaveManager";
import type { SkinId } from "../save/SaveManager";
import { emitGameState, emitSceneChange, emitAchievementToast, onCommand } from "../game/EventBus";
import { soundManager } from "../audio/SoundManager";
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

type GameState = "playing" | "paused" | "dead";

/*
 * GameScene — the main gameplay loop.
 *
 * New in Task 3:
 *  - Pause overlay (pause button, resume/settings/quit panel)
 *  - Near-miss detection with screen edge flash + "So Close!" text
 *  - Milestone score popups (25, 50, 100, …)
 *  - Achievement evaluation + toast on game-over
 *  - Daily challenge evaluation on game-over
 *  - SoundManager SFX: jump, collect, death, near-miss, milestone
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
  private pauseBtn!: Phaser.GameObjects.Text;

  // Pause overlay
  private pausePanel!: Phaser.GameObjects.Container;
  private pauseOverlayGfx!: Phaser.GameObjects.Graphics;

  // Near-miss
  private nearMissGfx!: Phaser.GameObjects.Graphics;
  private nearMissCooldown = 0;
  private lastNearMissScore = -999;

  // Revive shield (drawn during invincibility window)
  private reviveGfx!: Phaser.GameObjects.Graphics;
  private invincibleUntil = 0; // Phaser time.now timestamp; 0 = not invincible

  // State
  private gameState: GameState = "playing";
  private transitioning = false; // guard against duplicate scene.start() on rapid restart/death
  private score = 0;
  private bestScore = 0;
  private distanceTraveled = 0;
  private reviveUsed = false;
  private deathY = GAME_HEIGHT / 2;
  private speed = INITIAL_SPEED;
  private gap = INITIAL_GAP;
  private sessionStartTime = 0;

  // Score milestones
  private milestonesHit = new Set<number>();

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
    this.nearMissCooldown = 0;
    this.lastNearMissScore = -999;
    this.milestonesHit.clear();

    // Background (depth 0, 1)
    this.bgGfx = this.add.graphics().setDepth(0);
    this.fxGfx = this.add.graphics().setDepth(1);
    this.buildBgShapes();

    // Near-miss edge flash (depth 49 — just below death flash)
    this.nearMissGfx = this.add.graphics().setDepth(49);

    // Revive shield ring (depth 25 — just above player)
    this.reviveGfx = this.add.graphics().setDepth(25);
    this.invincibleUntil = 0;

    // Progression manager (depth 2, 3)
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

    // Pause button (top-left, safe below banner ad)
    this.pauseBtn = this.add.text(18, 52, "⏸", {
      fontSize: "22px", fontFamily: "Arial, sans-serif",
      color: "rgba(255,255,255,0.55)",
    }).setOrigin(0, 0.5).setDepth(30).setInteractive({ useHandCursor: true });

    this.pauseBtn.on("pointerdown", () => this.togglePause());
    this.pauseBtn.on("pointerover", () => this.pauseBtn.setAlpha(1));
    this.pauseBtn.on("pointerout",  () => this.pauseBtn.setAlpha(0.7));

    // Build (hidden) pause panel
    this.buildPausePanel();

    // Input
    this.input.on("pointerdown", this.handleInput, this);
    this.input.keyboard?.on("keydown-SPACE", this.handleInput, this);
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.gameState === "playing" || this.gameState === "paused") this.togglePause();
    });

    // Command listener from React
    const removeCommandListener = onCommand((detail) => {
      if (this.transitioning) return; // ignore commands mid-transition
      if (detail.type === "revive") {
        if (detail.revived) this.doRevive();
        else this.goToGameOver();
      } else if (detail.type === "restart") {
        this.goToGameOver();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      removeCommandListener();
      this.input.off("pointerdown", this.handleInput, this);
      this.input.keyboard?.off("keydown-SPACE", this.handleInput, this);
      this.input.keyboard?.off("keydown-ESC");
      this.player?.destroy();
      this.obstacleManager?.destroy();
      this.progressionManager?.destroy();
      this.bgGfx?.destroy();
      this.fxGfx?.destroy();
      this.nearMissGfx?.destroy();
      this.reviveGfx?.destroy();
      this.pauseOverlayGfx?.destroy();
    }, this);

    emitSceneChange({ scene: "Game" });
    this.emitState();
    analytics.track("game_start");
  }

  update(_time: number, delta: number): void {
    this.tick++;
    const dt = delta / 1000;

    if (this.nearMissCooldown > 0) this.nearMissCooldown -= dt;

    if (this.gameState === "paused") return;

    this.scrollX += this.speed * dt;

    // Always update background
    this.updateBubbles(dt);
    this.drawBackground();

    if (this.gameState === "playing") {
      // Difficulty ramp
      this.speed = Math.min(this.speed + SPEED_RAMP * dt, MAX_SPEED);
      this.obstacleManager.setSpeed(this.speed);

      // Progression
      this.progressionManager.update(dt, this.scrollX);

      // Update gameplay objects
      this.player.update();
      this.obstacleManager.update(delta);

      // Score
      this.distanceTraveled += this.speed * dt;
      const newScore = Math.floor(this.distanceTraveled / SCORE_DIST_DIVISOR);
      if (newScore > this.score) {
        this.score = newScore;
        this.scoreText.setText(this.score.toString());
        this.checkScoreMilestone(newScore);
      }

      // Gap shrink
      const newlyPassed = this.obstacleManager.countNewlyScored(this.player.x);
      if (newlyPassed > 0) {
        this.gap = Math.max(this.gap - GAP_SHRINK_RATE * newlyPassed, MIN_GAP);
        this.obstacleManager.setGap(this.gap);
      }

      // Shells
      if (this.obstacleManager.checkShellCollision(this.player.x, this.player.y)) {
        soundManager.playCollect();
        this.shellText.setText(`🐚 ${this.obstacleManager.shellsCollected}`);
        this.spawnScorePopup(1);
      }

      // Near-miss check
      this.checkNearMiss();

      // ── Invincibility shield ring ────────────────────────────────────────────
      this.reviveGfx.clear();
      const isInvincible = this.time.now < this.invincibleUntil;
      if (isInvincible) {
        const remaining = this.invincibleUntil - this.time.now;
        const progress  = 1 - remaining / 2500;                // 0 → 1 over 2.5 s
        const alpha     = Phaser.Math.Clamp(0.75 - progress * 0.65, 0.05, 0.75);
        const pulse     = Math.sin(this.time.now * 0.008) * 4; // oscillating radius
        const r1 = PLAYER_RADIUS + 10 + pulse;
        const r2 = PLAYER_RADIUS + 18 + pulse;
        // Inner ring
        this.reviveGfx.lineStyle(2.5, 0x40ffcc, alpha);
        this.reviveGfx.strokeCircle(this.player.x, this.player.y, r1);
        // Outer softer ring
        this.reviveGfx.lineStyle(1.5, 0x80ffe8, alpha * 0.45);
        this.reviveGfx.strokeCircle(this.player.x, this.player.y, r2);
      }

      // ── Collision / out of bounds ────────────────────────────────────────────
      // Both checks are skipped during invincibility. outOfBounds must also be
      // skipped because after a long ad (15 s) the physics body drifts far below
      // the screen; body.reset() in revive() snaps it back, but there can be a
      // single-frame window before Phaser fully reconciles the new position.
      const hitObstacle = !isInvincible &&
        this.obstacleManager.checkObstacleCollision(this.player.x, this.player.y);
      const outOfBounds = !isInvincible && this.player.isOutOfBounds();
      if (hitObstacle || outOfBounds) {
        this.onPlayerDeath();
      }
    } else {
      // Dead state: still animate (death flicker)
      this.reviveGfx.clear();
      this.player.update();
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  private handleInput(): void {
    if (this.gameState === "playing") {
      this.player.jump();
      soundManager.playFlapForSkin(saveManager.selectedSkin);
    }
  }

  // ── Pause ────────────────────────────────────────────────────────────────────

  private togglePause(): void {
    if (this.gameState === "dead") return;
    if (this.gameState === "playing") {
      this.gameState = "paused";
      soundManager.playTap();
      this.pauseBtn.setText("▶");
      this.pausePanel.setVisible(true);
      this.pauseOverlayGfx.setVisible(true);
      this.physics.pause();
    } else if (this.gameState === "paused") {
      this.gameState = "playing";
      soundManager.playTap();
      this.pauseBtn.setText("⏸");
      this.pausePanel.setVisible(false);
      this.pauseOverlayGfx.setVisible(false);
      this.physics.resume();
    }
  }

  private buildPausePanel(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.pauseOverlayGfx = this.add.graphics().setDepth(60);
    this.pauseOverlayGfx.fillStyle(0x000000, 0.55);
    this.pauseOverlayGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.pauseOverlayGfx.setVisible(false);

    const panelW = 300;
    const panelH = 240;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x021020, 0.96);
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
    panelBg.lineStyle(1.5, 0x204060, 0.8);
    panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);

    const title = this.add.text(0, -panelH / 2 + 36, "PAUSED", {
      fontSize: "24px", fontFamily: "Arial Black, sans-serif",
      color: "#80c8ff", stroke: "#001828", strokeThickness: 4,
    }).setOrigin(0.5);

    const resumeBtn = this.makeMenuBtn(0, -30, "▶  RESUME", "#1a6e40", "#ffffff", () => {
      this.togglePause();
    });

    const settingsBtn = this.makeMenuBtn(0, 30, "⚙  SETTINGS", "#102840", "#c0d8ff", () => {
      soundManager.playTap();
      // Pause this scene (keeps state + visuals) and launch Settings on top.
      // SettingsScene will resume us on Back when from === SCENE.GAME.
      this.scene.pause();
      this.scene.launch(SCENE.SETTINGS, { from: SCENE.GAME });
    });

    const quitBtn = this.makeMenuBtn(0, 90, "⌂  QUIT TO MENU", "#0a1428", "#a0b8d8", () => {
      soundManager.playTap();
      this.cameras.main.fade(220, 0, 0, 0, false, (_: unknown, p: number) => {
        if (p >= 1) this.scene.start(SCENE.MAIN_MENU);
      });
    });

    this.pausePanel = this.add.container(cx, cy, [panelBg, title, resumeBtn, settingsBtn, quitBtn]);
    this.pausePanel.setDepth(61);
    this.pausePanel.setVisible(false);
  }

  private makeMenuBtn(
    x: number, y: number,
    label: string,
    bg: string,
    color: string,
    onClick: () => void
  ): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontSize: "15px", fontFamily: "Arial, sans-serif",
      color, backgroundColor: bg,
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => btn.setAlpha(0.8));
    btn.on("pointerout",  () => btn.setAlpha(1));
    return btn;
  }

  // ── Near-miss ────────────────────────────────────────────────────────────────

  private checkNearMiss(): void {
    if (this.nearMissCooldown > 0) return;
    if (this.score - this.lastNearMissScore < 3) return; // prevent duplicate in same area

    const nearMiss = this.obstacleManager.isNearMiss(
      this.player.x, this.player.y,
      PLAYER_RADIUS, NEAR_MISS_THRESHOLD
    );

    if (nearMiss) {
      this.nearMissCooldown = 1.5; // 1.5s cooldown
      this.lastNearMissScore = this.score;
      soundManager.playNearMiss();
      this.showNearMissEffect();
    }
  }

  private showNearMissEffect(): void {
    // Edge flash
    const g = this.nearMissGfx;
    g.clear();
    g.lineStyle(10, 0xffff00, 0.6);
    g.strokeRect(5, 5, GAME_WIDTH - 10, GAME_HEIGHT - 10);

    this.tweens.add({
      targets: g, alpha: 0, duration: 500,
      onComplete: () => { g.setAlpha(1); g.clear(); },
    });

    // "So Close!" text
    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, "So Close!", {
      fontSize: "22px", fontFamily: "Arial Black, sans-serif",
      color: "#ffff60", stroke: "#4a4a00", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(48).setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha: { from: 0, to: 1 },
      y: { from: GAME_HEIGHT * 0.35, to: GAME_HEIGHT * 0.32 },
      duration: 180,
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, y: GAME_HEIGHT * 0.28,
          duration: 600, delay: 400,
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  // ── Score milestone popups ────────────────────────────────────────────────────

  private checkScoreMilestone(score: number): void {
    for (const milestone of SCORE_MILESTONES) {
      if (score >= milestone && !this.milestonesHit.has(milestone)) {
        this.milestonesHit.add(milestone);
        this.spawnMilestonePopup(milestone);
        soundManager.playMilestone();
      }
    }
  }

  private spawnMilestonePopup(milestone: number): void {
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT * 0.22;

    const txt = this.add.text(x, y, `${milestone}!`, {
      fontSize: "30px", fontFamily: "Arial Black, sans-serif",
      color: "#ffd84a", stroke: "#4a2800", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(45).setAlpha(0).setScale(0.6);

    this.tweens.add({
      targets: txt,
      alpha: 1, scale: 1.1,
      duration: 200, ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, scale: 1.3, y: y - 40,
          duration: 700, delay: 350, ease: "Power2",
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  // ── Score popup (per-shell) ────────────────────────────────────────────────────

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

  // ── Death / Revive ───────────────────────────────────────────────────────────

  private onPlayerDeath(): void {
    if (this.gameState !== "playing") return;
    this.gameState = "dead";

    this.deathY = this.player.y;
    this.player.kill();
    soundManager.playDeath();

    this.speed = 0;
    this.obstacleManager.setSpeed(0);

    const flash = this.add.graphics().setDepth(50);
    flash.fillStyle(0xff4040, 0.3);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 350,
      onComplete: () => flash.destroy(),
    });

    this.emitState();
  }

  private doRevive(): void {
    if (this.gameState !== "dead") return;
    this.reviveUsed = true;
    this.gameState = "playing";

    // 1. Clear the obstacle that killed the player + anything in the next 260 px,
    //    so the turtle never instantly re-dies into the same column.
    this.obstacleManager.clearNearPlayer(PLAYER_X);

    // 2. Grant 2.5 s of invincibility — shield ring renders in update().
    this.invincibleUntil = this.time.now + 2500;

    // 3. Revive the player physics & reset flicker alpha.
    this.player.revive(this.deathY);

    // 4. Resume at 40% of starting speed so the player can orient themselves;
    //    the normal SPEED_RAMP in update() takes over from here.
    this.speed = INITIAL_SPEED * 0.4;
    this.obstacleManager.setSpeed(this.speed);

    // 5. Visual + audio celebration.
    this.spawnReviveEffect();
    soundManager.playCollect(); // warm chime — "you earned it"

    analytics.track("game_revived", { score: this.score });
    this.emitState();
  }

  private spawnReviveEffect(): void {
    const cx = PLAYER_X;
    const cy = this.deathY;

    // ── Soft green flash (much gentler than the red death flash) ─────────────
    const flash = this.add.graphics().setDepth(50);
    flash.fillStyle(0x20ff80, 0.18);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 400,
      onComplete: () => flash.destroy(),
    });

    // ── Bubble burst — 10 small circles radiating outward ────────────────────
    for (let i = 0; i < 10; i++) {
      const angle  = (i / 10) * Math.PI * 2;
      const dist   = 48 + Math.random() * 32;
      const radius = 3 + Math.random() * 3.5;
      const bubble = this.add.graphics().setDepth(30);
      bubble.fillStyle(0x40ffcc, 0.85);
      bubble.fillCircle(0, 0, radius);
      bubble.lineStyle(1, 0xffffff, 0.4);
      bubble.strokeCircle(0, 0, radius);
      bubble.setPosition(cx, cy);
      this.tweens.add({
        targets: bubble,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        duration: 520 + Math.random() * 180,
        ease: "Power2",
        onComplete: () => bubble.destroy(),
      });
    }

    // ── "Keep Swimming! 🐢" popup text ───────────────────────────────────────
    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36, "Keep Swimming! 🐢", {
      fontSize: "22px",
      fontFamily: "Arial Black, sans-serif",
      color: "#80ffcc",
      stroke: "#003322",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51).setAlpha(0).setScale(0.7);

    this.tweens.add({
      targets: txt,
      alpha: 1,
      scale: 1.05,
      duration: 240,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          alpha: 0,
          y: GAME_HEIGHT * 0.29,
          duration: 650,
          delay: 500,
          ease: "Power2",
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  private goToGameOver(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    const sessionShells = this.obstacleManager.shellsCollected;
    const sessionDuration = Math.round((Date.now() - this.sessionStartTime) / 1000);

    analytics.track("game_over", {
      score: this.score,
      best_score: this.bestScore,
      shells: sessionShells,
      duration_s: sessionDuration,
    });

    // Persist results first
    saveManager.recordGameOver(this.score, sessionShells);
    this.bestScore = saveManager.highScore;

    // Unlock skins
    const newlyUnlocked = saveManager.checkNewUnlocks();
    for (const id of newlyUnlocked) {
      saveManager.unlockSkin(id);
    }

    // Evaluate achievements
    const newAchievements = achievementManager.evaluate();
    for (const ach of newAchievements) {
      emitAchievementToast({ id: ach.id, name: ach.name, icon: ach.icon });
      soundManager.playAchievement();
    }

    // Evaluate daily challenge
    dailyChallengeManager.evaluateRun({
      score: this.score,
      shellsCollected: sessionShells,
      survived: true,
      restorationReached: this.progressionManager?.reachedMilestone ?? false,
    });

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

  // ── EventBus ──────────────────────────────────────────────────────────────────

  private emitState(): void {
    emitGameState({
      state: this.gameState === "playing" ? "playing" : (this.gameState === "paused" ? "playing" : "dead"),
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
    const stage = this.progressionManager?.stage ?? 0;
    const spawnRate = 5 + stage * 1.5;
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

    const bf = this.progressionManager?.brightnessFactor ?? 0;
    const topDark   = 0x010609; const botDark   = 0x041828;
    const topBright = 0x042848; const botBright = 0x0a4060;

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

    if (bf > 0.3) {
      const shaftAlpha = (bf - 0.3) * 0.06;
      g.fillStyle(0x40d0ff, shaftAlpha);
      for (let i = 0; i < 5; i++) {
        const sx = (i * 120 - (this.scrollX * 0.04) % 600 + 600) % 600;
        g.beginPath();
        g.moveTo(sx - 20, 0); g.lineTo(sx + 20, 0);
        g.lineTo(sx + 60, GAME_HEIGHT); g.lineTo(sx + 20, GAME_HEIGHT);
        g.closePath(); g.fillPath();
      }
    }

    const fx = this.fxGfx;
    fx.clear();

    for (const shape of this.bgShapes) {
      const ratio = shape.layer === 0 ? 0.12 : 0.28;
      const offset = this.scrollX * ratio;
      const baseX = ((shape.x - offset % GAME_WIDTH) % GAME_WIDTH + GAME_WIDTH) % GAME_WIDTH;

      for (let rep = 0; rep < 2; rep++) {
        const dx = baseX + rep * GAME_WIDTH - GAME_WIDTH;
        if (dx + shape.w < 0 || dx > GAME_WIDTH) continue;

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

    const bubbleColor = bf > 0.5 ? 0xa0eeff : 0x80d0ff;
    for (const b of this.bubbles) {
      fx.lineStyle(1.2, bubbleColor, b.alpha);
      fx.strokeCircle(b.x, b.y, b.r);
    }
  }
}
