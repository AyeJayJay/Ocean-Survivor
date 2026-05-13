import { useEffect, useRef, useState, useCallback } from "react";
import PhaserGame from "./game/PhaserGame";
import BannerAd from "./ads/BannerAd";
import InterstitialAd from "./ads/InterstitialAd";
import RewardedAd from "./ads/RewardedAd";
import { AdErrorBoundary } from "./ads/AdErrorBoundary";
import { adFrequencyManager } from "./ads/AdFrequencyManager";
import { analytics } from "./analytics/Analytics";
import { soundManager } from "./audio/SoundManager";
import DonateModal from "./pages/DonateModal";
import {
  onGameState, onSceneChange,
  emitReviveCommand, emitRestartCommand,
  type GameUIState, type GameStatePayload, type ScenePayload,
} from "./game/EventBus";
import { GAME_WIDTH, GAME_HEIGHT } from "./game/GameConfig";

// Set to true once an LLC is established and Stripe donations are ready
const DONATIONS_ENABLED: boolean = false;

// ── Scaling ───────────────────────────────────────────────────────────────────

function calcScale(): number {
  return Math.min(
    window.innerWidth  / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT,
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const phaserContainerRef = useRef<HTMLDivElement>(null);

  // Layout scale
  const [scale, setScale] = useState(calcScale);

  // Game state mirrored from Phaser via EventBus
  const [gameState, setGameState] = useState<GameUIState>("idle");
  const [activeScene, setActiveScene] = useState<ScenePayload["scene"]>("MainMenu");
  const [reviveAvailable, setReviveAvailable] = useState(false);

  // Ad UI state
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewarded, setShowRewarded] = useState(false);

  // Death overlay delay (same 750ms as the original game)
  const [deathButtonsReady, setDeathButtonsReady] = useState(false);
  const deathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sound
  const [soundMuted, setSoundMuted] = useState(() => soundManager.muted);

  // Donate modal
  const [showDonate, setShowDonate] = useState(false);

  // ── Resize handler ──────────────────────────────────────────────────────────

  useEffect(() => {
    const handleResize = () => setScale(calcScale());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── EventBus listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    const offState = onGameState((payload: GameStatePayload) => {
      setGameState(payload.state);
      setReviveAvailable(payload.reviveAvailable);

      if (payload.state === "dead") {
        // Show death buttons after 750ms to prevent accidental taps
        if (deathTimerRef.current) clearTimeout(deathTimerRef.current);
        deathTimerRef.current = setTimeout(() => setDeathButtonsReady(true), 750);
      } else {
        if (deathTimerRef.current) clearTimeout(deathTimerRef.current);
        setDeathButtonsReady(false);
      }
    });

    const offScene = onSceneChange((payload: ScenePayload) => {
      setActiveScene(payload.scene);

      if (payload.scene === "GameOver") {
        // Check interstitial eligibility when GameOver scene activates
        const decision = adFrequencyManager.canShowInterstitial();
        if (decision.allowed) {
          adFrequencyManager.recordInterstitial();
          analytics.track("interstitial_impression");
          setShowInterstitial(true);
        } else {
          analytics.track("interstitial_suppressed");
        }
      }

      // Banner impression tracking
      if (payload.scene === "MainMenu" || payload.scene === "GameOver") {
        analytics.track("banner_impression");
      }
    });

    return () => { offState(); offScene(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ad handlers ──────────────────────────────────────────────────────────────

  const handleWatchAd = useCallback(() => {
    analytics.track("rewarded_preroll_shown");
    setShowRewarded(true);
  }, []);

  const handleReviveResult = useCallback((rewarded: boolean) => {
    setShowRewarded(false);
    if (rewarded) {
      analytics.track("rewarded_completed");
      adFrequencyManager.recordRewardedAd();
      emitReviveCommand({ revived: true });
    } else {
      emitReviveCommand({ revived: false });
    }
  }, []);

  const handleRestartNow = useCallback(() => {
    setDeathButtonsReady(false);
    emitRestartCommand();
  }, []);

  const handleInterstitialClose = useCallback(() => {
    analytics.track("interstitial_dismissed");
    setShowInterstitial(false);
  }, []);

  // ── Sound toggle ──────────────────────────────────────────────────────────────

  const toggleSound = useCallback(() => {
    soundManager.toggle();
    setSoundMuted(soundManager.muted);
  }, []);

  // ── Banner visibility rules ───────────────────────────────────────────────────

  const anyFullScreenAd = showInterstitial || showRewarded;
  const bannerVisible = !anyFullScreenAd && (activeScene === "MainMenu" || activeScene === "GameOver" || activeScene === "Game");
  const bannerCompact = activeScene === "Game";
  const bannerInteractive = activeScene !== "Game";
  const bannerPosition = bannerCompact ? "top" : "bottom";

  // ── Death overlay (shown while state='dead' after 750ms delay) ────────────────

  const showDeathButtons = gameState === "dead" && deathButtonsReady && !anyFullScreenAd;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#010609",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Scaled game container — Phaser canvas + React overlays together */}
      <div style={{
        position: "relative",
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        overflow: "hidden",
      }}>
        {/* Phaser mounts its canvas into this div */}
        <div
          ref={phaserContainerRef}
          style={{ position: "absolute", inset: 0 }}
        />
        <PhaserGame containerRef={phaserContainerRef} />

        {/* ── Death overlay ──────────────────────────────────────────────────── */}
        {showDeathButtons && (
          <div
            style={{
              position: "absolute", inset: 0,
              zIndex: 100,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "flex-end",
              paddingBottom: 110,
              // Transparent capture layer — blocks taps from reaching Phaser
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Watch ad button (only shown if revive is still available) */}
            {reviveAvailable && (
              <button
                onClick={handleWatchAd}
                style={{
                  background: "linear-gradient(135deg, #1e7aff, #0d4aaa)",
                  border: "2px solid rgba(100,180,255,0.4)",
                  borderRadius: 28,
                  color: "white",
                  padding: "14px 32px",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "Arial, sans-serif",
                  cursor: "pointer",
                  marginBottom: 12,
                  width: 300,
                  boxShadow: "0 4px 24px rgba(30,122,255,0.4)",
                  letterSpacing: 0.3,
                }}
              >
                ❤️  Watch Ad — Continue
              </button>
            )}
            {/* Restart button */}
            <button
              onClick={handleRestartNow}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 22,
                color: "rgba(255,255,255,0.65)",
                padding: "10px 28px",
                fontSize: 13,
                fontFamily: "Arial, sans-serif",
                cursor: "pointer",
                width: 200,
              }}
            >
              ↩  Restart
            </button>
          </div>
        )}

        {/* ── Full-screen ad overlays ──────────────────────────────────────── */}

        {showInterstitial && (
          <AdErrorBoundary onError={handleInterstitialClose}>
            <InterstitialAd onClose={handleInterstitialClose} />
          </AdErrorBoundary>
        )}

        {showRewarded && (
          <AdErrorBoundary onError={() => handleReviveResult(false)}>
            <RewardedAd onComplete={handleReviveResult} />
          </AdErrorBoundary>
        )}

        {/* ── Donate modal ─────────────────────────────────────────────────── */}
        {DONATIONS_ENABLED && showDonate && (
          <DonateModal onClose={() => setShowDonate(false)} />
        )}

        {/* ── Banner ad ────────────────────────────────────────────────────── */}
        <AdErrorBoundary onError={() => {}}>
          <BannerAd
            visible={bannerVisible}
            position={bannerPosition}
            compact={bannerCompact}
            interactive={bannerInteractive}
            offset={bannerCompact ? 4 : 8}
          />
        </AdErrorBoundary>

        {/* ── Mute button ──────────────────────────────────────────────────── */}
        <button
          onClick={toggleSound}
          style={{
            position: "absolute",
            top: bannerCompact ? 48 : 16,
            right: 14,
            zIndex: 50,
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            fontSize: 16,
            color: "white",
            backdropFilter: "blur(4px)",
          }}
          aria-label={soundMuted ? "Unmute" : "Mute"}
        >
          {soundMuted ? "🔇" : "🔊"}
        </button>
      </div>
    </div>
  );
}
