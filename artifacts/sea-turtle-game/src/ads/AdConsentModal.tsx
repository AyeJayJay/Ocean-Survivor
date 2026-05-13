import { useEffect, useRef } from "react";
import { AdmobBridge } from "./AdmobBridge";
import { saveManager } from "../save/SaveManager";
import { analytics } from "../analytics/Analytics";

/*
 * AdConsentModal — shown on first launch to inform the player about ads.
 *
 * This is a PLACEHOLDER structure. Before app store submission, replace this
 * with a real UMP (User Messaging Platform) SDK flow on Android and an
 * ATT (App Tracking Transparency) flow on iOS.
 *
 * References:
 *   UMP SDK:  https://developers.google.com/admob/ump/android/quick-start
 *   ATT:      https://developer.apple.com/documentation/apptrackingtransparency
 *
 * On acceptance: initializes AdMob and stores the consent flag in SaveManager.
 * On decline:    stores the decline flag; ads are not initialized.
 */

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

  const handleAccept = async () => {
    saveManager.setAdConsent(true);
    analytics.track("ad_consent_accepted");
    await AdmobBridge.initialize();
    safeClose();
  };

  const handleDecline = () => {
    saveManager.setAdConsent(false);
    analytics.track("ad_consent_declined");
    safeClose();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDecline();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        padding: "32px 24px",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{
        maxWidth: 380,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🐢</div>

        <h2 style={{
          color: "#00e8ff",
          fontSize: 20,
          fontWeight: 800,
          fontFamily: "Arial Black, sans-serif",
          margin: "0 0 12px",
          letterSpacing: "-0.01em",
        }}>
          Ocean Survivor is Free
        </h2>

        <p style={{
          color: "rgba(180,220,255,0.85)",
          fontSize: 14,
          fontFamily: "'Segoe UI', sans-serif",
          lineHeight: 1.6,
          margin: "0 0 20px",
        }}>
          This game is kept free thanks to ads. We show short ads between
          games and optional rewarded ads that let you continue after dying.
        </p>

        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: "16px 18px",
          marginBottom: 24,
          textAlign: "left",
        }}>
          <div style={{
            color: "rgba(150,200,255,0.6)",
            fontSize: 10,
            fontFamily: "'Segoe UI', sans-serif",
            letterSpacing: "0.08em",
            marginBottom: 10,
          }}>
            ABOUT ADS IN THIS GAME
          </div>

          {[
            ["🎯", "Ad networks may use device identifiers to show relevant ads"],
            ["🔒", "No personal data is shared with third parties by us"],
            ["📋", "You can review our full Privacy Policy in Settings"],
            ["🛠️", "Manage ad preferences any time in Settings"],
          ].map(([icon, text]) => (
            <div key={text as string} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <span style={{
                color: "rgba(180,210,240,0.75)",
                fontSize: 12,
                fontFamily: "'Segoe UI', sans-serif",
                lineHeight: 1.5,
              }}>{text}</span>
            </div>
          ))}

          <p style={{
            color: "rgba(120,160,200,0.45)",
            fontSize: 10,
            fontFamily: "'Segoe UI', sans-serif",
            margin: "10px 0 0",
            fontStyle: "italic",
          }}>
            [PLACEHOLDER] This modal will be replaced with a UMP/ATT SDK flow before store submission.
          </p>
        </div>

        <button
          onClick={handleAccept}
          style={{
            background: "linear-gradient(135deg, #00c87a, #007a4a)",
            border: "none",
            borderRadius: 14,
            color: "white",
            padding: "15px 32px",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'Segoe UI', sans-serif",
            cursor: "pointer",
            width: "100%",
            marginBottom: 10,
            boxShadow: "0 4px 20px rgba(0,200,122,0.3)",
          }}
        >
          Got it — Let's Play!
        </button>

        <button
          onClick={handleDecline}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.4)",
            padding: "10px 24px",
            fontSize: 12,
            fontFamily: "'Segoe UI', sans-serif",
            cursor: "pointer",
            width: "100%",
          }}
        >
          No thanks (ads will still appear but may be less relevant)
        </button>
      </div>
    </div>
  );
}
