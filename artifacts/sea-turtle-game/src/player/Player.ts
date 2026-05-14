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
  }

  revive(atY: number): void {
    this.alive = true;
    this.gfx.setAlpha(1); // reset death-flicker alpha before first update
    this.sprite.setY(atY);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-150); // gentle upward nudge
    body.setGravityY(GRAVITY_Y);
  }

  reset(x: number, y: number): void {
    this.alive = true;
    this.sprite.setPosition(x, y);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
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

    // Tilt based on vertical velocity
    const vy = (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y;
    this.gfx.rotation = Phaser.Math.Clamp(vy * 0.0022, -0.55, 1.25);

    // Flash on death (simple alpha flicker)
    if (!this.alive) {
      this.gfx.setAlpha(0.75 + Math.sin(Date.now() * 0.025) * 0.25);
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.gfx.destroy();
  }

  // ── Skin drawing ──────────────────────────────────────────────────────────────
  //
  // Reads the currently selected skin from SaveManager and delegates to the
  // skin's draw function. All skin coordinates are in local space (turtle centre).

  private drawSkin(): void {
    const skinId = saveManager.selectedSkin;
    const skin = getSkinDef(skinId);
    skin.drawFn(this.gfx);
  }
}
