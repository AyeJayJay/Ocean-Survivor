/*
 * AboutScreen — About, Terms of Use, and Data Disclosure (route: /about)
 *
 * Accessible via Settings → About & Terms.
 * Provides a simple, honest overview of:
 *   - What the game is
 *   - Terms of use (casual indie game terms)
 *   - A plain-language data disclosure summary
 *   - Third-party services used
 *   - How to get support
 */

import { useLocation } from "wouter";

const APP_VERSION    = "1.0";
const CONTACT_EMAIL  = "support@oceansurvivor.app";
const DEV_NAME       = "Ocean Survivor Development Team";

interface Props {
  onClose?: () => void;
}

export default function AboutScreen({ onClose }: Props) {
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
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%",
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "white",
            fontSize: 16,
            flexShrink: 0,
          }}
          aria-label="Back"
        >
          ←
        </button>
        <h1 style={{
          color: "#00e8ff",
          fontSize: 18,
          fontFamily: "Arial Black, sans-serif",
          margin: 0,
        }}>
          About & Terms
        </h1>
      </div>

      <div style={{
        padding: "24px 20px 56px",
        maxWidth: 480,
        width: "100%",
        margin: "0 auto",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "rgba(200,220,240,0.85)",
        fontSize: 13,
        lineHeight: 1.7,
      }}>

        {/* About the game */}
        <section style={sectionStyle}>
          <div style={{
            textAlign: "center",
            padding: "20px 0 16px",
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🐢</div>
            <div style={{
              color: "#00e8ff",
              fontSize: 20,
              fontFamily: "Arial Black, sans-serif",
              fontWeight: 900,
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}>
              OCEAN SURVIVOR
            </div>
            <div style={{
              color: "rgba(140,190,230,0.55)",
              fontSize: 11,
              letterSpacing: "0.06em",
            }}>
              Version {APP_VERSION} · {DEV_NAME}
            </div>
          </div>
          <p style={{ textAlign: "center", color: "rgba(170,210,250,0.7)", fontSize: 13, marginBottom: 0 }}>
            Help a baby sea turtle navigate a polluted ocean. Dodge pollution,
            collect golden shells, and unlock new turtle skins as you swim further
            and further.
          </p>
        </section>

        <div style={divider} />

        {/* Terms of use */}
        <section style={sectionStyle}>
          <h2 style={h2}>Terms of Use</h2>
          <p>
            Ocean Survivor is provided free of charge for personal, non-commercial
            entertainment. By playing this game you agree to these terms.
          </p>
          <ul style={ul}>
            <li>
              <strong style={strong}>Free to play.</strong> The game is free. Ads are shown to fund ongoing
              development. Optional rewarded ads let you continue after dying.
            </li>
            <li>
              <strong style={strong}>No guarantees.</strong> This game is provided "as is." We don't guarantee
              it will always be available, bug-free, or unchanged.
            </li>
            <li>
              <strong style={strong}>Personal use only.</strong> You may not copy, reverse-engineer, or
              redistribute any part of Ocean Survivor without permission.
            </li>
            <li>
              <strong style={strong}>Age.</strong> This game is intended for general audiences. It is not
              directed at children under 13.
            </li>
            <li>
              <strong style={strong}>Changes.</strong> We may update the game, these terms, or our privacy
              policy at any time. Continued play means acceptance of any updates.
            </li>
          </ul>
        </section>

        <div style={divider} />

        {/* Data at a glance */}
        <section style={sectionStyle}>
          <h2 style={h2}>Data at a Glance</h2>
          <p>
            Here's a quick honest summary of what this game does and doesn't do
            with information about you:
          </p>

          <div style={{ marginTop: 14, marginBottom: 14 }}>
            {[
              { icon: "✅", label: "Game progress saved on your device only" },
              { icon: "✅", label: "Works fully offline — no account needed" },
              { icon: "✅", label: "You can delete all data by clearing app storage" },
              { icon: "✅", label: "You choose between personalized or basic ads" },
              { icon: "⚠️", label: "Ads may use device advertising ID (can be opted out)" },
              { icon: "⚠️", label: "Anonymous play events sent to analytics (no personal info)" },
              { icon: "❌", label: "No accounts, logins, or personal registration" },
              { icon: "❌", label: "No microphone, camera, or contacts access" },
              { icon: "❌", label: "We don't sell your data" },
              { icon: "❌", label: "No cloud syncing of game saves" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "7px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.5 }}>{icon}</span>
                <span style={{ color: "rgba(180,215,245,0.75)", fontSize: 12, lineHeight: 1.5 }}>{label}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: "rgba(120,160,200,0.55)" }}>
            For full details, see our{" "}
            <a
              href="/privacy"
              style={{ color: "rgba(70,170,220,0.8)", textDecoration: "underline" }}
            >
              Privacy Policy
            </a>.
          </p>
        </section>

        <div style={divider} />

        {/* Third-party services */}
        <section style={sectionStyle}>
          <h2 style={h2}>Third-Party Services</h2>
          <p>
            Ocean Survivor uses the following third-party services. Each has its own
            privacy policy:
          </p>

          {[
            {
              name: "Google AdMob",
              purpose: "In-app advertising",
              policy: "admob.google.com · policies.google.com/privacy",
            },
            {
              name: "Capacitor / Ionic",
              purpose: "Native mobile packaging (Android & iOS)",
              policy: "capacitorjs.com",
            },
            {
              name: "Phaser",
              purpose: "Game engine (runs entirely on your device)",
              policy: "phaser.io — no data collection",
            },
          ].map(({ name, purpose, policy }) => (
            <div
              key={name}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                padding: "11px 14px",
                marginBottom: 8,
              }}
            >
              <div style={{ color: "rgba(200,230,255,0.9)", fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
                {name}
              </div>
              <div style={{ color: "rgba(160,200,235,0.6)", fontSize: 12, marginBottom: 3 }}>
                {purpose}
              </div>
              <div style={{ color: "rgba(70,140,200,0.5)", fontSize: 11, fontStyle: "italic" }}>
                {policy}
              </div>
            </div>
          ))}
        </section>

        <div style={divider} />

        {/* Support & contact */}
        <section style={{ ...sectionStyle, marginBottom: 0 }}>
          <h2 style={h2}>Support & Contact</h2>
          <p>
            Found a bug? Have a question? Want to share feedback?
          </p>
          <div style={{
            background: "rgba(0,40,80,0.4)",
            border: "1px solid rgba(0,100,160,0.25)",
            borderRadius: 10,
            padding: "14px 18px",
          }}>
            <div style={{ color: "rgba(140,200,240,0.9)", fontSize: 12, marginBottom: 6 }}>
              {DEV_NAME}
            </div>
            <div style={{ color: "#4dc8ff", fontSize: 14 }}>
              {CONTACT_EMAIL}
            </div>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: "rgba(120,160,200,0.5)" }}>
            We're a small indie team and aim to respond within a few days.
            Thanks for playing — your feedback helps us improve the game.
          </p>
        </section>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = { marginBottom: 4 };

const h2: React.CSSProperties = {
  color: "#4dc8ff",
  fontSize: 14,
  fontFamily: "Arial, sans-serif",
  fontWeight: 700,
  margin: "0 0 10px",
  letterSpacing: "0.02em",
};

const ul: React.CSSProperties = {
  paddingLeft: 20,
  margin: "6px 0 10px",
  color: "rgba(175,210,240,0.75)",
};

const strong: React.CSSProperties = {
  color: "rgba(200,230,255,0.9)",
};

const divider: React.CSSProperties = {
  height: 1,
  background: "rgba(255,255,255,0.06)",
  margin: "20px 0",
};
