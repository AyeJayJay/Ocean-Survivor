/*
 * AdConsentModal — shown on first launch to collect ad consent.
 *
 * Gives the player a real choice between personalized and non-personalized ads.
 * Both choices initialize AdMob; the difference is whether the advertising
 * identifier is used for targeting.
 *
 * Re-shown when the user taps "Manage Ad Preferences" in Settings.
 * On re-open, the player's previous choice is highlighted so they know
 * what they currently have set.
 *
 * Note on platform compliance:
 *   - Android: Full UMP (User Messaging Platform) SDK consent flow should be
 *     integrated for EEA/UK users before production release.
 *   - iOS: ATT (App Tracking Transparency) prompt must be presented before
 *     accessing IDFA in production builds.
 *   This component covers the in-app UX layer; native SDK wrappers are
 *   handled in AdmobBridge.ts.
 */

import { useEffect, useRef } from "react";
import { AdmobBridge } from "./AdmobBridge";
import { saveManager } from "../save/SaveManager";
import { analytics } from "../analytics/Analytics";

interface Props {
  onDone: () => void;
}

export default function AdConsentModal({ onDone }: Props) {
  const closedRef = useRef(false);

  const safeClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onDone();
  };

  const handlePersonalized = async () => {
    saveManager.setAdConsent(true);
    analytics.track("ad_consent_accepted");
    await AdmobBridge.initialize(true);
    safeClose();
  };

  const handleBasic = async () => {
    saveManager.setAdConsent(false);
    analytics.track("ad_consent_declined");
    await AdmobBridge.initialize(false);
    safeClose();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleBasic();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentConsent = saveManager.adConsentGiven;
  const isRevisit = currentConsent !== null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 500,
        background: "rgba(1,6,14,0.97)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px 22px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>

        <div style={{ fontSize: 48, marginBottom: 14 }}>🐢</div>

        <h2 style={{
          color: "#00e8ff",
          fontSize: 19,
          fontWeight: 800,
          fontFamily: "Arial Black, sans-serif",
          margin: "0 0 10px",
          letterSpacing: "-0.01em",
        }}>
          {isRevisit ? "Ad Preferences" : "Ocean Survivor is Free"}
        </h2>

        <p style={{
          color: "rgba(170,210,250,0.8)",
          fontSize: 13,
          fontFamily: "'Segoe UI', sans-serif",
          lineHeight: 1.6,
          margin: "0 0 20px",
        }}>
          {isRevisit
            ? "Choose how ads work in this game. Your current preference is highlighted below."
            : "Ads keep this game free. Choose how you'd like ads to work — you can change this any time in Settings."
          }
        </p>

        {/* Personalized option */}
        <button
          onClick={handlePersonalized}
          style={{
            background: currentConsent === true
              ? "linear-gradient(135deg, #00a060, #006040)"
              : "linear-gradient(135deg, #0a3a6a, #061e3a)",
            border: currentConsent === true
              ? "2px solid rgba(0,200,120,0.5)"
              : "2px solid rgba(0,100,180,0.4)",
            borderRadius: 14,
            color: "white",
            padding: "16px 20px",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Segoe UI', sans-serif",
            cursor: "pointer",
            width: "100%",
            marginBottom: 10,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            boxShadow: currentConsent === true ? "0 4px 20px rgba(0,180,100,0.25)" : "none",
          } as React.CSSProperties}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>🎯</span>
            <span>Personalized Ads</span>
            {currentConsent === true && (
              <span style={{ fontSize: 11, background: "rgba(0,200,100,0.25)", borderRadius: 6, padding: "2px 7px", marginLeft: "auto", fontWeight: 400 }}>
                current
              </span>
            )}
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 400,
            color: "rgba(200,230,255,0.65)",
            lineHeight: 1.5,
          }}>
            Ads tailored to your interests using device identifiers.
            Supports the game more effectively.
          </span>
        </button>

        {/* Basic / non-personalized option */}
        <button
          onClick={handleBasic}
          style={{
            background: currentConsent === false
              ? "linear-gradient(135deg, #1a3050, #0e1e30)"
              : "rgba(255,255,255,0.04)",
            border: currentConsent === false
              ? "2px solid rgba(100,160,220,0.5)"
              : "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            color: "white",
            padding: "14px 20px",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Segoe UI', sans-serif",
            cursor: "pointer",
            width: "100%",
            marginBottom: 18,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          } as React.CSSProperties}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>🛡️</span>
            <span>Basic Ads Only</span>
            {currentConsent === false && (
              <span style={{ fontSize: 11, background: "rgba(100,160,220,0.2)", borderRadius: 6, padding: "2px 7px", marginLeft: "auto", fontWeight: 400 }}>
                current
              </span>
            )}
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 400,
            color: "rgba(180,210,240,0.55)",
            lineHeight: 1.5,
          }}>
            Non-personalized ads. No advertising identifier used.
            Ads still appear to keep the game free.
          </span>
        </button>

        {/* Disclosure */}
        <p style={{
          color: "rgba(110,150,190,0.6)",
          fontSize: 11,
          fontFamily: "'Segoe UI', sans-serif",
          lineHeight: 1.55,
          margin: "0 0 16px",
        }}>
          By playing Ocean Survivor you agree to our{" "}
          <a
            href="/privacy"
            style={{ color: "rgba(80,170,220,0.8)", textDecoration: "underline" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>.
          Ad networks may collect device identifiers to serve and measure ads.
          Change your preference any time in Settings.
        </p>

      </div>
    </div>
  );
}
