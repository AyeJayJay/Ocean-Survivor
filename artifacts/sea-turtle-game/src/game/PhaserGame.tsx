import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { GameScene } from "../scenes/GameScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { SkinSelectScene } from "../scenes/SkinSelectScene";
import { SettingsScene } from "../scenes/SettingsScene";
import { AchievementScene } from "../scenes/AchievementScene";
import { GAME_WIDTH, GAME_HEIGHT } from "./GameConfig";

/*
 * PhaserGame — mounts the Phaser.Game inside the provided container div.
 *
 * Waits for web fonts (Bangers, Nunito) to be available before creating the
 * game so Phaser's text objects render with the correct typeface on first draw.
 *
 * Cleanup: destroys the Phaser.Game instance when the component unmounts to
 * prevent canvas / WebGL context leaks.
 */

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

let _game: Phaser.Game | null = null;

export function createPhaserGame(container: HTMLElement): Phaser.Game {
  if (_game) {
    _game.destroy(true);
    _game = null;
  }

  const config: Phaser.Types.Core.GameConfig = {
    // Use WebGL when available (preferred for performance on iOS/Android).
    // Phaser.AUTO already prefers WebGL but we set it explicitly and add
    // powerPreference so the GPU scheduler gives us the high-performance tier.
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: container,
    backgroundColor: "#010609",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [
      BootScene,
      PreloadScene,
      MainMenuScene,
      GameScene,
      GameOverScene,
      SkinSelectScene,
      SettingsScene,
      AchievementScene,
    ],
    input: {
      activePointers: 3,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: "high-performance",
    },
    disableContextMenu: true,
    transparent: false,
  };

  _game = new Phaser.Game(config);

  try {
    (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })
      .lock?.("portrait-primary")
      ?.catch(() => { /* silently ignore */ });
  } catch (_) { /* silently ignore */ }

  return _game;
}

export function destroyPhaserGame(): void {
  if (_game) {
    _game.destroy(true);
    _game = null;
  }
}

export default function PhaserGame({ containerRef }: Props) {
  const initialized = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || initialized.current) return;
    initialized.current = true;

    // Wait for web fonts (Bangers, Nunito) before creating the game instance
    // so Phaser text objects render with the correct typeface on first frame.
    document.fonts.ready.then(() => {
      if (containerRef.current && initialized.current) {
        createPhaserGame(containerRef.current);
      }
    });

    return () => {
      initialized.current = false;
      destroyPhaserGame();
    };
  }, [containerRef]);

  return null;
}
