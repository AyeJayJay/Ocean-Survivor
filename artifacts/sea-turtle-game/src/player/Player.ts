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

    // Visual turtle (drawn once; repositioned each frame)
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(20);
    this.drawTurtle();
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  jump(): void {
    if (!this.alive) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(JUMP_VELOCITY);
    soundManager.playBubble();
  }

  kill(): void {
    this.alive = false;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-200); // small death bounce
    body.setGravityY(GRAVITY_Y * 0.6);
  }

  revive(atY: number): void {
    this.alive = true;
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

  // ── Procedural turtle drawing ─────────────────────────────────────────────────
  //
  // All coordinates are in local space relative to the turtle's centre.
  // The turtle faces RIGHT (positive x direction).

  private drawTurtle(): void {
    const g = this.gfx;
    g.clear();

    // ── Tail / rear flipper ─────────────────────────────────────────────────
    g.fillStyle(0x1e6b38, 1);
    g.fillEllipse(-21, 0, 12, 7);

    // ── Four side flippers ───────────────────────────────────────────────────
    g.fillStyle(0x236e3c, 1);
    g.fillEllipse(9, -18, 11, 22);   // front-top
    g.fillEllipse(9, 18, 11, 22);    // front-bottom
    g.fillEllipse(-12, -13, 9, 17);  // rear-top
    g.fillEllipse(-12, 13, 9, 17);   // rear-bottom

    // ── Shell base ───────────────────────────────────────────────────────────
    g.fillStyle(0x2d8a4e, 1);
    g.fillEllipse(0, 0, 40, 32);

    // Shell mid-tone highlight
    g.fillStyle(0x3ea85e, 0.55);
    g.fillEllipse(-3, -5, 30, 24);

    // Shell bright highlight
    g.fillStyle(0x62d488, 0.35);
    g.fillEllipse(-6, -7, 20, 15);

    // Shell hexagon center outline
    g.lineStyle(1.5, 0x1a5c33, 0.55);
    g.strokeEllipse(0, 0, 16, 13);

    // Shell radial lines from center to edge
    g.lineStyle(1.2, 0x1a5c33, 0.38);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const ix = Math.cos(ang) * 8;
      const iy = Math.sin(ang) * 6.5;
      const ox = Math.cos(ang) * 18;
      const oy = Math.sin(ang) * 14;
      g.beginPath();
      g.moveTo(ix, iy);
      g.lineTo(ox, oy);
      g.strokePath();
    }

    // ── Head ─────────────────────────────────────────────────────────────────
    g.fillStyle(0x39a65b, 1);
    g.fillEllipse(21, -1, 19, 15);

    // Head highlight
    g.fillStyle(0x7ee8a8, 0.45);
    g.fillEllipse(19, -3, 12, 9);

    // ── Eye ──────────────────────────────────────────────────────────────────
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(27, -4, 3);

    // Eye specular
    g.fillStyle(0xffffff, 1);
    g.fillCircle(28, -5, 1.2);

    // ── Smile (tiny arc via line) ─────────────────────────────────────────────
    g.lineStyle(1, 0x1a6e38, 0.8);
    g.beginPath();
    g.moveTo(22, 1);
    g.lineTo(26, 2.5);
    g.strokePath();
  }
}
