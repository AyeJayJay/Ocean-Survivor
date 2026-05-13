import Phaser from "phaser";
import { SCENE, TEX } from "../game/GameConfig";

/*
 * PreloadScene — generates procedural textures that subsequent scenes need,
 * then launches MainMenuScene. Because all artwork is drawn with Phaser's
 * Graphics API we only need one shared 1×1 white "pixel" texture to back
 * the player's physics body.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() { super(SCENE.PRELOAD); }

  create(): void {
    // 1×1 white pixel — used as the invisible physics body sprite for the player
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture(TEX.PIXEL, 1, 1);
    g.destroy();

    this.scene.start(SCENE.MAIN_MENU);
  }
}
