# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Ocean Survivor (`/`)
- Phaser.js (v3.90) mobile-first endless survival game
- Player is a baby sea turtle navigating a polluted ocean
- React shell (App.tsx) mounts the Phaser canvas + overlays ad components on top
- Phaser ↔ React communication via typed window CustomEvents (EventBus.ts)
- **Scenes**: Boot → Preload → MainMenu → Game → GameOver
- **8 obstacle types**: plastic bags, fishing nets, oil blobs, soda rings, jellyfish, sharks, fishing hooks, boat hulls
- **Collectibles**: golden shells (basic collect + sound; full shell economy in Task 2)
- **Parallax background**: two-layer ocean silhouettes + rising bubbles
- **Physics**: 480×854 portrait canvas, arcade physics, GRAVITY_Y=1700, JUMP=-560 px/s
- **Ads**: BannerAd (bottom on menu/game-over, top compact during play), InterstitialAd (game-over), RewardedAd (revive)
- **Analytics**: analytics.ts tracks game_start, game_over, game_revived, ad events
- **Audio**: SoundManager.ts — procedural Web Audio (bubble on jump, chime on shell)
- Controls: tap or spacebar to swim
- `DONATIONS_ENABLED = false` in App.tsx (preserved, set true when LLC is ready)

### Key source files
- `artifacts/sea-turtle-game/src/App.tsx` — React shell with ad/UI overlays + scale calculation
- `artifacts/sea-turtle-game/src/game/GameConfig.ts` — all tunable constants
- `artifacts/sea-turtle-game/src/game/EventBus.ts` — Phaser↔React typed event bridge
- `artifacts/sea-turtle-game/src/game/PhaserGame.tsx` — Phaser.Game React wrapper
- `artifacts/sea-turtle-game/src/scenes/GameScene.ts` — main game loop
- `artifacts/sea-turtle-game/src/obstacles/ObstacleManager.ts` — 8 obstacle type drawing + pooling
- `artifacts/sea-turtle-game/src/player/Player.ts` — turtle physics + procedural art
- `artifacts/sea-turtle-game/src/pages/Game.tsx` — **legacy** original Canvas engine (unused, preserved as reference for Tasks 2–4)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
