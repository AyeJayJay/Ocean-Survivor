/*
 * TermsOfService — standalone Terms of Use page (route: /terms)
 *
 * Accessible via:
 *   - App Store Connect metadata "Terms of Use URL" field (link to /terms)
 *   - /about screen (linked from the Terms of Use section)
 *   - Direct URL navigation
 *
 * Keep in sync with the Terms of Use content in AboutScreen.tsx.
 */

import { useLocation } from "wouter";

const APP_NAME     = "Ocean Survivor";
const DEV_NAME     = "Ocean Survivor Development Team";
const CONTACT_EMAIL = "support@oceansurvivor.app";
const LAST_UPDATED = "May 13, 2026";

interface Props {
  onClose?: () => void;
}

export default function TermsOfService({ onClose }: Props) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (onClose) onClose();
    else navigate("/");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "#010c1a",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Sticky header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "#010c1a",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}>
        <button
          onClick={handleBack}
          aria-label="Back"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "white",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <h1 style={{
          color: "#00e8ff",
          fontSize: 18,
          fontFamily: "'Bangers', 'Arial Black', Impact, sans-serif",
          margin: 0,
        }}>
          Terms of Use
        </h1>
      </div>

      {/* Body */}
      <div style={{
        padding: "24px 20px 56px",
        maxWidth: 480,
        width: "100%",
        margin: "0 auto",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        color: "rgba(200,220,240,0.85)",
        fontSize: 13,
        lineHeight: 1.7,
      }}>

        <p style={{ color: "rgba(140,180,220,0.5)", fontSize: 11, marginBottom: 24 }}>
          Last updated: {LAST_UPDATED}
        </p>

        <section style={sectionStyle}>
          <h2 style={h2}>1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or playing {APP_NAME}, you agree to be
            bound by these Terms of Use. If you do not agree to these terms,
            do not use the game.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2}>2. License to Play</h2>
          <p>
            {APP_NAME} is provided free of charge for personal, non-commercial
            entertainment. We grant you a limited, non-exclusive, non-transferable
            license to use the game on your personal device for entertainment
            purposes only.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2}>3. Advertising</h2>
          <p>
            The game is free to play and supported by advertising. By using{" "}
            {APP_NAME} you agree that advertisements may be shown during gameplay.
            Optional rewarded ads are available to earn in-game benefits such as
            continuing after a life is lost. You are never required to watch
            rewarded ads.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2}>4. No Warranties</h2>
          <p>
            {APP_NAME} is provided "as is" and "as available" without warranty of
            any kind, express or implied, including but not limited to warranties
            of merchantability, fitness for a particular purpose, or
            non-infringement. We do not guarantee that the game will always be
            available, error-free, or unchanged.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2}>5. Intellectual Property</h2>
          <p>
            All content in {APP_NAME} — including but not limited to game design,
            artwork, music, and code — is the property of the {DEV_NAME} and is
            protected by applicable intellectual property laws. You may not copy,
            modify, distribute, sell, or reverse-engineer any part of {APP_NAME}{" "}
            without our express written permission.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2}>6. Age Restrictions</h2>
          <p>
            {APP_NAME} is intended for general audiences. It is not directed at
            children under the age of 13. If you are under 13, please do not use
            this game without verifiable parental consent.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2}>7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, the {DEV_NAME}{" "}
            shall not be liable for any indirect, incidental, special, exemplary,
            or consequential damages arising from your use of {APP_NAME}. Our
            total cumulative liability to you for any claims arising from your use
            of the game shall not exceed the amount you paid for the game (zero,
            since the game is free).
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2}>8. Modifications</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue {APP_NAME} or
            any part thereof at any time without notice. We may also update these
            Terms of Use at any time by updating the "Last updated" date above.
            Continued use of the game after any changes constitutes acceptance of
            the revised terms.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2}>9. Privacy</h2>
          <p>
            Your use of {APP_NAME} is also governed by our{" "}
            <a
              href="/privacy"
              style={{ color: "#4dc8ff", textDecoration: "underline" }}
            >
              Privacy Policy
            </a>
            , which is incorporated into these Terms of Use by reference.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2}>10. Governing Law</h2>
          <p>
            These Terms of Use are governed by and construed in accordance with
            applicable laws. Any disputes arising under these terms shall be
            resolved through good-faith negotiation before pursuing other remedies.
          </p>
        </section>

        <section style={{ ...sectionStyle, marginBottom: 0 }}>
          <h2 style={h2}>11. Contact</h2>
          <p>
            If you have questions about these Terms of Use, please contact us:
          </p>
          <div style={{
            background: "rgba(0,40,80,0.4)",
            border: "1px solid rgba(0,100,160,0.25)",
            borderRadius: 10,
            padding: "14px 18px",
            marginTop: 8,
          }}>
            <div style={{ color: "rgba(140,200,240,0.9)", fontSize: 12, marginBottom: 4 }}>
              {DEV_NAME}
            </div>
            <div style={{ color: "#4dc8ff", fontSize: 13 }}>{CONTACT_EMAIL}</div>
          </div>
        </section>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
};

const h2: React.CSSProperties = {
  color: "#4dc8ff",
  fontSize: 14,
  fontFamily: "'Nunito', Arial, sans-serif",
  fontWeight: 700,
  margin: "0 0 10px",
  letterSpacing: "0.02em",
};
