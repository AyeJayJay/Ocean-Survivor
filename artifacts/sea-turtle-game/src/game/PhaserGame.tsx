import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { GameScene } from "../scenes/GameScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { GAME_WIDTH, GAME_HEIGHT } from "./GameConfig";

/*
 * PhaserGame — mounts the Phaser.Game inside the provided container div.
 *
 * The container must have an explicit pixel size so Phaser's Scale.NONE mode
 * renders the canvas at exactly that size (React handles the outer scaling).
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
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: container,
    backgroundColor: "#010609",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 }, // player sets its own gravity per-body
        debug: false,
      },
    },
    scale: {
      // FIT mode: Phaser's Scale Manager owns responsive scaling.
      // The React container (480×854) matches game dimensions so the canvas
      // renders at 1:1; the outer React transform handles viewport scaling.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [BootScene, PreloadScene, MainMenuScene, GameScene, GameOverScene],
    input: {
      activePointers: 3, // multi-touch support
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    disableContextMenu: true,
    // Transparent: false keeps the dark bg even before first draw
    transparent: false,
  };

  _game = new Phaser.Game(config);

  // Lock to portrait via Screen Orientation API (best-effort; no-op in unsupported browsers)
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

    createPhaserGame(el);

    return () => {
      initialized.current = false;
      destroyPhaserGame();
    };
  }, [containerRef]);

  return null; // renders into containerRef, not here
}
