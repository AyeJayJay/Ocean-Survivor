import Phaser from "phaser";
import { SCENE } from "../game/GameConfig";

/*
 * BootScene — minimal first scene; sets up any one-time globals then
 * immediately hands off to PreloadScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() { super(SCENE.BOOT); }

  create(): void {
    this.scene.start(SCENE.PRELOAD);
  }
}
