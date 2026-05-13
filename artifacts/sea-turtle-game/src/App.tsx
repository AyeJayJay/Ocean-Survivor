import { useEffect, useRef, useState, useCallback } from "react";
import { Switch, Route, useLocation } from "wouter";
import PhaserGame from "./game/PhaserGame";
import BannerAd from "./ads/BannerAd";
import InterstitialAd from "./ads/InterstitialAd";
import RewardedAd from "./ads/RewardedAd";
import AdConsentModal from "./ads/AdConsentModal";
import { AdErrorBoundary } from "./ads/AdErrorBoundary";
import { AdmobBridge } from "./ads/AdmobBridge";
import { adFrequencyManager } from "./ads/AdFrequencyManager";
import { analytics } from "./analytics/Analytics";
import { soundManager } from "./audio/SoundManager";
import { saveManager } from "./save/SaveManager";
import DonateModal from "./pages/DonateModal";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import {
  onGameState, onSceneChange, onAchievementToast, onGameOverAd, onPrivacyPolicy,
  emitReviveCommand, emitRestartCommand, emitGameOverAdResult,
  type GameUIState, type GameStatePayload, type ScenePayload,
  type AchievementToastPayload,
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

// ── Achievement toast component ───────────────────────────────────────────────

interface ToastData {
  id: string;
  name: string;
  icon: string;
  key: number;
}

function AchievementToast({ toast, onDone }: { toast: ToastData; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        background: "linear-gradient(135deg, rgba(0,40,20,0.96), rgba(0,20,40,0.96))",
        border: "1.5px solid rgba(0,200,100,0.5)",
        borderRadius: 14,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 240,
        maxWidth: 340,
        boxShadow: "0 4px 24px rgba(0,200,100,0.25)",
        animation: "toast-in 0.3s ease-out",
      }}
    >
      <span style={{ fontSize: 24 }}>{toast.icon}</span>
      <div>
        <div style={{
          fontSize: 10, fontFamily: "Arial, sans-serif",
          color: "rgba(100,200,150,0.7)", letterSpacing: 2, marginBottom: 2,
        }}>
          ACHIEVEMENT UNLOCKED
        </div>
        <div style={{
          fontSize: 14, fontFamily: "Arial Black, sans-serif",
          color: "#80ffcc",
        }}>
          {toast.name}
        </div>
      </div>
    </div>
  );
}

// ── Game shell (main route at /) ───────────────────────────────────────────────

function GameShell() {
  const [, navigate] = useLocation();
  const phaserContainerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(calcScale);
  const [gameState, setGameState] = useState<GameUIState>("idle");
  const [activeScene, setActiveScene] = useState<ScenePayload["scene"]>("MainMenu");
  const [reviveAvailable, setReviveAvailable] = useState(false);

  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewarded, setShowRewarded] = useState(false);
  const [rewardedForGameOver, setRewardedForGameOver] = useState(false);

  const [deathButtonsReady, setDeathButtonsReady] = useState(false);
  const deathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [soundMuted, setSoundMuted] = useState(() => soundManager.sfxMuted);
  const [showDonate, setShowDonate] = useState(false);

  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastKeyRef = useRef(0);

  const [showAdConsent, setShowAdConsent] = useState(false);

  // ── Back-button handler (Android) — prevent accidental exit ──────────────────
  // Capacitor/WebView surfaces Android back-button as a popstate or a custom
  // 'backbutton' event. We intercept it to keep players in the game.
  useEffect(() => {
    const handleBackButton = (e: Event) => { e.preventDefault(); };
    document.addEventListener("backbutton", handleBackButton, false);
    return () => document.removeEventListener("backbutton", handleBackButton, false);
  }, []);

  // ── Ad consent + AdMob init on mount ─────────────────────────────────────────

  useEffect(() => {
    const consent = saveManager.adConsentGiven;
    if (consent === null) {
      setShowAdConsent(true);
    } else if (consent === true) {
      AdmobBridge.initialize().catch(() => {});
    }
  }, []);

  const handleConsentDone = useCallback(() => {
    setShowAdConsent(false);
  }, []);

  // ── Resize handler ────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleResize = () => setScale(calcScale());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── EventBus listeners ───────────────────────────────────────────────────────

  useEffect(() => {
    const offState = onGameState((payload: GameStatePayload) => {
      setGameState(payload.state);
      setReviveAvailable(payload.reviveAvailable);

      if (payload.state === "dead") {
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
        const decision = adFrequencyManager.canShowInterstitial();
        if (decision.allowed) {
          adFrequencyManager.recordInterstitial();
          analytics.track("interstitial_impression");
          setShowInterstitial(true);
        } else {
          analytics.track("interstitial_suppressed");
        }
      }

      if (payload.scene === "MainMenu" || payload.scene === "GameOver") {
        analytics.track("banner_impression");
      }
    });

    const offToast = onAchievementToast((payload: AchievementToastPayload) => {
      const key = ++toastKeyRef.current;
      setToasts(prev => [...prev, { ...payload, key }]);
    });

    const offGameOverAd = onGameOverAd((payload) => {
      if (payload.type === "request") {
        analytics.track("rewarded_game_over_preroll_shown");
        setRewardedForGameOver(true);
        setShowRewarded(true);
      }
    });

    // Navigate to the /privacy route instead of showing an overlay —
    // this makes Privacy Policy accessible via a real URL on web and
    // as a full screen within the Capacitor WebView on native.
    const offPrivacy = onPrivacyPolicy(() => {
      navigate("/privacy");
    });

    return () => { offState(); offScene(); offToast(); offGameOverAd(); offPrivacy(); };
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeToast = useCallback((key: number) => {
    setToasts(prev => prev.filter(t => t.key !== key));
  }, []);

  // ── Ad handlers ──────────────────────────────────────────────────────────────

  const handleWatchAd = useCallback(() => {
    analytics.track("rewarded_preroll_shown");
    setShowRewarded(true);
  }, []);

  const handleReviveResult = useCallback((rewarded: boolean) => {
    setShowRewarded(false);
    if (rewardedForGameOver) {
      setRewardedForGameOver(false);
      if (rewarded) analytics.track("rewarded_game_over_completed");
      emitGameOverAdResult({ rewarded });
    } else {
      if (rewarded) {
        analytics.track("rewarded_completed");
        adFrequencyManager.recordRewardedAd();
        emitReviveCommand({ revived: true });
      } else {
        emitReviveCommand({ revived: false });
      }
    }
  }, [rewardedForGameOver]);

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
    setSoundMuted(soundManager.sfxMuted);
  }, []);

  // ── Banner visibility rules ───────────────────────────────────────────────────

  const anyFullScreenAd = showInterstitial || showRewarded;
  const isGameplay = activeScene === "Game";
  const isMenuScreen = activeScene === "MainMenu" || activeScene === "GameOver";
  const bannerVisible = !anyFullScreenAd && (isMenuScreen || isGameplay);
  const bannerCompact = isGameplay;
  const bannerInteractive = !isGameplay;
  const bannerPosition = bannerCompact ? "top" : "bottom";

  const showDeathButtons = gameState === "dead" && deathButtonsReady && !anyFullScreenAd;
  const showMuteBtn = !anyFullScreenAd;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#010609",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.92); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        position: "relative",
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        overflow: "hidden",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}>
        <div ref={phaserContainerRef} style={{ position: "absolute", inset: 0 }} />
        <PhaserGame containerRef={phaserContainerRef} />

        {toasts.map((toast) => (
          <AchievementToast
            key={toast.key}
            toast={toast}
            onDone={() => removeToast(toast.key)}
          />
        ))}

        {showDeathButtons && (
          <div
            style={{
              position: "absolute", inset: 0,
              zIndex: 100,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "flex-end",
              paddingBottom: 110,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
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

        {DONATIONS_ENABLED && showDonate && (
          <DonateModal onClose={() => setShowDonate(false)} />
        )}

        <AdErrorBoundary onError={() => {}}>
          <BannerAd
            visible={bannerVisible}
            position={bannerPosition}
            compact={bannerCompact}
            interactive={bannerInteractive}
            offset={bannerCompact ? 4 : 8}
          />
        </AdErrorBoundary>

        {showMuteBtn && (
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
        )}

        {showAdConsent && (
          <AdConsentModal onDone={handleConsentDone} />
        )}
      </div>
    </div>
  );
}

// ── App — top-level router ────────────────────────────────────────────────────

export default function App() {
  return (
    <Switch>
      <Route path="/privacy">{() => <PrivacyPolicy />}</Route>
      <Route>{() => <GameShell />}</Route>
    </Switch>
  );
}
