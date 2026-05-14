/*
 * SkinSelectScene — full-screen grid of all 6 turtle skins.
 *
 * Shows each skin's procedural art, name, lock status, and unlock hint.
 * Tap an unlocked skin to equip it. Tap a locked skin to see how to unlock it.
 */

import Phaser from "phaser";
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from "../game/GameConfig";
import { emitSceneChange } from "../game/EventBus";
import { saveManager, type SkinId } from "../save/SaveManager";
import { SKIN_DEFS, type SkinDef } from "../player/SkinDefs";
import { soundManager } from "../audio/SoundManager";

// Unlock hints — mirrors SaveManager.checkNewUnlocks()
const UNLOCK_HINTS: Record<SkinId, string> = {
  baby:      "Default skin",
  survivor:  "Play 3 games",
  green_sea: "Score ≥ 50",
  glowing:   "Score ≥ 150",
  golden:    "500 lifetime shells",
  cyber:     "Play 10 games",
  coral:     "Restore the ocean",
};

interface SkinCell {
  def: SkinDef;
  locked: boolean;
  x: number;
  y: number;
  gfx: Phaser.GameObjects.Graphics;
  bg: Phaser.GameObjects.Graphics;
}

export class SkinSelectScene extends Phaser.Scene {
  private fromScene: string = SCENE.MAIN_MENU;
  private cells: SkinCell[] = [];
  private selectedId: SkinId = "baby";
  private hintText!: Phaser.GameObjects.Text;

  constructor() { super(SCENE.SKIN_SELECT); }

  init(data: { from?: string }): void {
    this.fromScene = data?.from ?? SCENE.MAIN_MENU;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.selectedId = saveManager.selectedSkin;
    const unlocked = new Set(saveManager.unlockedSkins);

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x010c1a, 0x010c1a, 0x021828, 0x021828, 1, 1, 1, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    this.add.text(cx, 52, "CHOOSE YOUR TURTLE", {
      fontSize: "22px", fontFamily: "Arial Black, sans-serif",
      color: "#00e8ff", stroke: "#002a40", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    // Grid layout — 2 columns × 3 rows
    const cols = 2;
    const cellW = 200;
    const cellH = 210;
    const startX = cx - cellW / 2 - cellW * 0.5 + 20;
    const startY = 110;

    SKIN_DEFS.forEach((def, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellX = startX + col * (cellW + 12);
      const cellY = startY + row * (cellH + 10);
      const locked = !unlocked.has(def.id);

      const cellBg = this.add.graphics().setDepth(5);
      const gfx = this.add.graphics().setDepth(8);
      gfx.x = cellX + cellW / 2;
      gfx.y = cellY + 70;

      this.drawCell(cellBg, cellX, cellY, cellW, cellH, def, locked, def.id === this.selectedId);

      if (!locked) {
        def.drawFn(gfx);
      } else {
        // Lock icon (circle body + shackle arc drawn as two lines)
        gfx.fillStyle(0x4a4a6a, 0.9);
        gfx.fillCircle(0, 0, 26);
        gfx.fillStyle(0x8080aa, 1);
        gfx.fillRect(-8, -4, 16, 14);
        // Shackle: semicircle drawn as left+right vertical lines + top horizontal
        gfx.lineStyle(3, 0x8080aa, 1);
        gfx.beginPath();
        gfx.moveTo(-7, -4);
        gfx.lineTo(-7, -10);
        gfx.moveTo(7, -4);
        gfx.lineTo(7, -10);
        gfx.moveTo(-7, -10);
        gfx.lineTo(7, -10);
        gfx.strokePath();
      }

      // Name label
      const nameText = this.add.text(
        cellX + cellW / 2, cellY + cellH - 42,
        def.name,
        { fontSize: "12px", fontFamily: "Arial, sans-serif", color: locked ? "#6070a0" : "#c0e8ff" }
      ).setOrigin(0.5).setDepth(10);

      // Status label
      const statusLabel = locked
        ? UNLOCK_HINTS[def.id]
        : (def.id === this.selectedId ? "EQUIPPED" : "Tap to equip");

      this.add.text(
        cellX + cellW / 2, cellY + cellH - 24,
        statusLabel,
        { fontSize: "10px", fontFamily: "Arial, sans-serif", color: locked ? "#404060" : "#60c080" }
      ).setOrigin(0.5).setDepth(10);

      // Hit area
      const hitZone = this.add.zone(cellX, cellY, cellW, cellH)
        .setOrigin(0, 0).setInteractive({ useHandCursor: !locked }).setDepth(15);

      const cell: SkinCell = { def, locked, x: cellX, y: cellY, gfx, bg: cellBg };
      this.cells.push(cell);

      hitZone.on("pointerdown", () => {
        soundManager.playTap();
        if (locked) {
          this.hintText.setText(`Unlock: ${UNLOCK_HINTS[def.id]}`);
          this.hintText.setAlpha(1);
          this.tweens.add({ targets: this.hintText, alpha: 0, delay: 2000, duration: 600 });
        } else {
          this.selectedId = def.id;
          saveManager.selectSkin(def.id);
          this.refreshCells(unlocked);
          // Update name text
          nameText.setText(def.name);
        }
      });

      hitZone.on("pointerover", () => {
        if (!locked) {
          cellBg.setAlpha(1.15);
        }
      });
      hitZone.on("pointerout", () => { cellBg.setAlpha(1); });
    });

    // Hint text for locked skins
    this.hintText = this.add.text(cx, GAME_HEIGHT - 106, "", {
      fontSize: "13px", fontFamily: "Arial, sans-serif",
      color: "#ffd84a", stroke: "#4a2800", strokeThickness: 2,
      align: "center",
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    // Back button
    const backBtn = this.add.text(cx, GAME_HEIGHT - 60, "◄  BACK", {
      fontSize: "16px", fontFamily: "Arial, sans-serif",
      color: "#c0d8ff", backgroundColor: "#102840",
      padding: { x: 20, y: 11 }, stroke: "#061428", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

    backBtn.on("pointerdown", () => {
      soundManager.playTap();
      this.cameras.main.fade(200, 0, 0, 0, false, (_: unknown, p: number) => {
        if (p >= 1) this.scene.start(this.fromScene);
      });
    });
    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#80c8ff" }));
    backBtn.on("pointerout",  () => backBtn.setStyle({ color: "#c0d8ff" }));

    emitSceneChange({ scene: "SkinSelect" });
  }

  private drawCell(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    def: SkinDef, locked: boolean, selected: boolean
  ): void {
    g.clear();
    const borderColor = selected ? 0x00e8ff : (locked ? 0x1a2040 : 0x1e4060);
    const bgColor = selected ? 0x012038 : (locked ? 0x080c18 : 0x0a1828);
    const borderAlpha = selected ? 1.0 : 0.7;

    g.fillStyle(bgColor, 0.92);
    g.fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(selected ? 2 : 1, borderColor, borderAlpha);
    g.strokeRoundedRect(x, y, w, h, 12);

    if (selected) {
      // Selection glow
      g.lineStyle(3, 0x00e8ff, 0.25);
      g.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 14);
    }

    // Top color bar
    const barColor = locked ? 0x1a2040 : (selected ? 0x00e8ff : 0x1e5080);
    g.fillStyle(barColor, locked ? 0.3 : (selected ? 0.2 : 0.15));
    g.fillRoundedRect(x + 4, y + 4, w - 8, 8, 4);
  }

  private refreshCells(unlocked: Set<string>): void {
    this.cells.forEach((cell) => {
      this.drawCell(
        cell.bg, cell.x, cell.y, 200, 210,
        cell.def, cell.locked, cell.def.id === this.selectedId
      );
      if (!cell.locked) {
        cell.def.drawFn(cell.gfx);
      }
    });
  }
}
