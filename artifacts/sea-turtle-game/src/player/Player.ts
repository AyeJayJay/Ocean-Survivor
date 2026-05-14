import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GRAVITY_Y,
  JUMP_VELOCITY,
  MAX_FALL_VELOCITY,
  PLAYER_RADIUS,
  TEX,
} from "../game/GameConfig";
import { soundManager } from "../audio/SoundManager";
import { saveManager } from "../save/SaveManager";
import { getSkinDef } from "./SkinDefs";

/*
 * Player — baby sea turtle
 *
 * Architecture:
 *  • An invisible Phaser.Physics.Arcade.Image handles physics (gravity, velocity,
 *    world bounds awareness). It holds no visual; only the collision point matters.
 *  • A Phaser.GameObjects.Graphics object renders the procedural turtle art.
 *    The art is drawn ONCE at local origin (0,0) and then the graphics object
 *    is repositioned each frame to match the physics sprite — no per-frame redraw.
 *  • Public API mirrors the old Game.tsx turtle: jump(), revive(), reset(), update().
 *  • Skin is read from SaveManager at construction time and drawn once.
 */
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Image;
  private gfx: Phaser.GameObjects.Graphics;
  private alive = true;

  // Expose position helpers
  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get radius(): number { return PLAYER_RADIUS; }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Physics body (invisible)
    this.sprite = scene.physics.add.image(x, y, TEX.PIXEL);
    this.sprite.setVisible(false);
    this.sprite.setDepth(20);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(GRAVITY_Y);
    body.setMaxVelocityY(MAX_FALL_VELOCITY);
    body.setCollideWorldBounds(false);
    // Circular collision hitbox (only the physics body size matters for manual collision)
    body.setCircle(PLAYER_RADIUS, -PLAYER_RADIUS, -PLAYER_RADIUS);

    // Visual turtle — drawn once using the selected skin; repositioned each frame
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(20);
    this.drawSkin();
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  jump(): void {
    if (!this.alive) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(JUMP_VELOCITY);
    // Flap SFX is played by GameScene with per-skin variant via soundManager.playFlapForSkin()
  }

  kill(): void {
    this.alive = false;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-200); // small death bounce
    body.setGravityY(GRAVITY_Y * 0.6);

    // Expressive death spin — makes death memorable and clip-worthy
    this.sprite.scene.tweens.add({
      targets: this.gfx,
      rotation: this.gfx.rotation + Math.PI * 2.5,
      duration: 700,
      ease: "Power2",
    });

    // Debris particle burst — visual "impact" moment
    this.spawnDeathParticles();
  }

  revive(atY: number): void {
    this.alive = true;
    this.gfx.setAlpha(1); // reset death-flicker alpha before first update

    // body.reset() is the ONLY correct way to teleport an arcade physics body.
    // sprite.setY() only moves the display object; the physics engine overwrites
    // it on the next step from the body's internal position — which can be thousands
    // of pixels off-screen after the player has been dead for a full ad duration.
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.reset(this.sprite.x, atY); // teleports body + clears all accumulated velocity
    body.setVelocityY(-150);         // gentle upward nudge after reset
    body.setGravityY(GRAVITY_Y);     // restore normal gravity (kill() reduced it to 0.6×)
  }

  reset(x: number, y: number): void {
    this.alive = true;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y); // teleports body + clears velocity (sprite position auto-synced)
    body.setGravityY(GRAVITY_Y);
    this.gfx.setAlpha(1);
  }

  setVisible(v: boolean): void {
    this.gfx.setVisible(v);
  }

  isOutOfBounds(): boolean {
    return this.sprite.y - PLAYER_RADIUS > GAME_HEIGHT || this.sprite.y + PLAYER_RADIUS < 0;
  }

  update(): void {
    // Sync visual to physics position
    this.gfx.x = this.sprite.x;
    this.gfx.y = this.sprite.y;

    if (!this.alive) {
      // Flash on death; rotation is owned by the kill() tween — don't override it
      this.gfx.setAlpha(0.75 + Math.sin(Date.now() * 0.025) * 0.25);
    } else {
      // Tilt based on vertical velocity
      const vy = (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y;
      this.gfx.rotation = Phaser.Math.Clamp(vy * 0.0022, -0.55, 1.25);
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.gfx.destroy();
  }

  // ── Skin drawing ──────────────────────────────────────────────────────────────

  private drawSkin(): void {
    const skinId = saveManager.selectedSkin;
    const skin = getSkinDef(skinId);
    skin.drawFn(this.gfx);
  }

  // ── Death particles ───────────────────────────────────────────────────────────
  //
  // 14 small debris dots burst outward from the player's position on death.
  // Colors are deliberately varied — ocean debris has many hues.

  private spawnDeathParticles(): void {
    const scene = this.sprite.scene;
    const cx = this.sprite.x;
    const cy = this.sprite.y;

    // Ocean debris palette: pollution colors + ocean blues
    const colors = [0xff6040, 0x60d0ff, 0xffd84a, 0xff9060, 0x40ffcc, 0xffffff, 0xff4488, 0xa0e0ff];

    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const dist  = 38 + Math.random() * 52;
      const radius = 2.5 + Math.random() * 3;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = Math.random() * 60;

      const dot = scene.add.graphics().setDepth(22);
      dot.fillStyle(color, 0.92);
      dot.fillCircle(0, 0, radius);
      dot.setPosition(cx, cy);

      scene.tweens.add({
        targets: dot,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.15,
        scaleY: 0.15,
        duration: 480 + Math.random() * 280,
        delay,
        ease: "Power2",
        onComplete: () => dot.destroy(),
      });
    }

    // Larger slow-floater (mimics a plastic bag drifting away)
    const floater = scene.add.graphics().setDepth(21);
    floater.fillStyle(0xffffff, 0.22);
    floater.fillEllipse(0, 0, 18, 12);
    floater.setPosition(cx, cy);
    scene.tweens.add({
      targets: floater,
      x: cx + (Math.random() - 0.5) * 60,
      y: cy - 60 - Math.random() * 40,
      alpha: 0,
      duration: 900,
      ease: "Power1",
      onComplete: () => floater.destroy(),
    });
  }
}
