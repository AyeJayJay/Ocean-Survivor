/*
 * PrivacyPolicy — full-page privacy policy (route: /privacy)
 *
 * Accessible via:
 *   - Settings → Privacy Policy (Phaser emitPrivacyPolicy → EventBus → navigate)
 *   - AdConsentModal → "Privacy Policy" link
 *   - Web: /privacy URL directly
 *
 * Update POLICY_DATE whenever content changes.
 * Update CONTACT_EMAIL and DEV_NAME before app store submission.
 */

import { useLocation } from "wouter";

const POLICY_DATE   = "May 13, 2026";
const DEV_NAME      = "Ocean Survivor Development Team";
const CONTACT_EMAIL = "support@oceansurvivor.app";

interface Props {
  onClose?: () => void;
}

export default function PrivacyPolicy({ onClose }: Props) {
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
      }}
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
          Privacy Policy
        </h1>
      </div>

      {/* Body */}
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

        <p style={{ color: "rgba(140,180,220,0.5)", fontSize: 11, marginBottom: 24 }}>
          Last updated: {POLICY_DATE}
        </p>

        {/* 1 */}
        <section style={sectionStyle}>
          <h2 style={h2}>1. Introduction</h2>
          <p>
            Ocean Survivor is a free mobile arcade game developed and published by the{" "}
            <em>{DEV_NAME}</em>. This Privacy Policy describes how we handle information
            in connection with our app.
          </p>
          <p>
            We built Ocean Survivor to be as privacy-friendly as possible. The game works
            fully offline, stores your progress on your own device, and does not require
            an account or personal registration.
          </p>
          <p>
            The only third-party data collection that occurs is through advertising
            networks used to keep the game free — described in detail below.
          </p>
        </section>

        {/* 2 */}
        <section style={sectionStyle}>
          <h2 style={h2}>2. What Information Is Involved</h2>

          <h3 style={h3}>Information stored only on your device</h3>
          <p>
            Ocean Survivor saves your game progress locally using your device's storage.
            This data never leaves your device and we do not have access to it:
          </p>
          <ul style={ul}>
            <li>High score and game statistics</li>
            <li>Lifetime shells collected and achievements</li>
            <li>Unlocked and selected turtle skins</li>
            <li>Sound and music preferences</li>
            <li>Your ad preference choice (personalized or basic ads)</li>
          </ul>

          <h3 style={h3}>Information collected by advertising partners</h3>
          <p>
            We use Google AdMob to display advertisements. When ads are shown, AdMob
            may collect and use the following to serve and measure ads:
          </p>
          <ul style={ul}>
            <li>Your device advertising identifier (IDFA on iOS, GAID on Android)</li>
            <li>Your approximate IP address (used to infer general location)</li>
            <li>Device type, operating system version, and language</li>
            <li>App interaction signals (ad views, taps, time spent)</li>
          </ul>
          <p>
            If you choose <strong style={{ color: "rgba(200,230,255,0.9)" }}>non-personalized ads</strong>,
            AdMob will still show ads but will not use your advertising identifier
            for targeting. Contextual signals (country, language) may still be used.
          </p>

          <h3 style={h3}>Analytics</h3>
          <p>
            We collect minimal, anonymous game events (such as game start, game over, and
            ad interactions) to help us understand how the game is playing and fix issues.
            These events contain no personally identifying information and are not linked to
            any account or device identity.
          </p>
        </section>

        {/* 3 */}
        <section style={sectionStyle}>
          <h2 style={h2}>3. How We Use Information</h2>
          <p>We use information for the following limited purposes:</p>
          <ul style={ul}>
            <li>To display advertisements that fund free access to the game</li>
            <li>To measure ad performance and comply with advertiser requirements</li>
            <li>To identify and fix crashes or technical issues</li>
            <li>To understand broad usage patterns so we can improve the game</li>
          </ul>
          <p>
            We do not sell your data. We do not build behavioral profiles. We do not use
            your information for any purpose beyond operating and improving this game.
          </p>
        </section>

        {/* 4 */}
        <section style={sectionStyle}>
          <h2 style={h2}>4. Your Ad Choices</h2>
          <p>
            When you first open Ocean Survivor, we ask whether you'd like to receive
            personalized ads or basic (non-personalized) ads. You can change this
            preference at any time in <strong style={{ color: "rgba(200,230,255,0.9)" }}>
            Settings → Manage Ad Preferences</strong>.
          </p>
          <p>
            You can also opt out of personalized advertising through your device settings:
          </p>
          <ul style={ul}>
            <li>
              <strong style={{ color: "rgba(200,230,255,0.9)" }}>iOS:</strong> Settings → Privacy & Security → Tracking — disable
              "Allow Apps to Request to Track"
            </li>
            <li>
              <strong style={{ color: "rgba(200,230,255,0.9)" }}>Android:</strong> Settings → Google → Ads — tap "Delete advertising ID"
              or enable "Opt out of Ads Personalization"
            </li>
          </ul>
          <p>
            Choosing non-personalized ads or opting out through device settings does not
            remove ads from the game — it only means the ads shown will be less tailored
            to your interests.
          </p>
        </section>

        {/* 5 */}
        <section style={sectionStyle}>
          <h2 style={h2}>5. Third-Party Services</h2>
          <div style={serviceCard}>
            <div style={serviceName}>Google AdMob</div>
            <div style={serviceDesc}>
              In-app advertising. AdMob is operated by Google LLC and governed by
              Google's Privacy Policy.
            </div>
            <div style={serviceLink}>google.com/policies/privacy</div>
          </div>
          <div style={serviceCard}>
            <div style={serviceName}>Google Analytics for Firebase</div>
            <div style={serviceDesc}>
              Anonymous event analytics for understanding game performance. No personally
              identifiable information is collected.
            </div>
            <div style={serviceLink}>firebase.google.com/policies/analytics</div>
          </div>
          <p style={{ marginTop: 12 }}>
            Each third-party service operates under its own privacy policy and data
            practices. We encourage you to review those policies if you have questions
            about their specific data handling.
          </p>
        </section>

        {/* 6 */}
        <section style={sectionStyle}>
          <h2 style={h2}>6. Children's Privacy</h2>
          <p>
            Ocean Survivor is a general-audience game and is not directed to children
            under the age of 13. We do not knowingly collect personal information from
            children under 13.
          </p>
          <p>
            If you believe your child under 13 has been exposed to personalized
            advertising through this game, please contact us at{" "}
            <span style={emailStyle}>{CONTACT_EMAIL}</span> and we will take appropriate steps,
            including ensuring child-directed ad treatment is applied on that device.
          </p>
        </section>

        {/* 7 */}
        <section style={sectionStyle}>
          <h2 style={h2}>7. Your Privacy Rights</h2>

          <h3 style={h3}>All users</h3>
          <ul style={ul}>
            <li>
              <strong style={{ color: "rgba(200,230,255,0.9)" }}>Delete local data:</strong>{" "}
              Clear all game data by uninstalling the app or clearing the app's cache
              in your device settings.
            </li>
            <li>
              <strong style={{ color: "rgba(200,230,255,0.9)" }}>Ad opt-out:</strong>{" "}
              Change your ad preference in Settings → Manage Ad Preferences, or through
              your device advertising settings (see Section 4).
            </li>
          </ul>

          <h3 style={h3}>EU / UK users (GDPR)</h3>
          <p>
            If you are located in the European Economic Area or United Kingdom, you
            have rights under the General Data Protection Regulation (GDPR) including
            the right to access, rectify, and erase personal data processed about you.
            Because Ocean Survivor does not directly collect personal data, most
            data-subject requests should be directed to our ad partners. Contact us
            at <span style={emailStyle}>{CONTACT_EMAIL}</span> for assistance.
          </p>
          <p>
            Our legal basis for processing ad-related data is your consent, which
            you grant when you accept personalized ads on first launch.
          </p>

          <h3 style={h3}>California users (CCPA / CPRA)</h3>
          <p>
            California residents have rights under the California Consumer Privacy Act.
            We do not "sell" personal information as defined by CCPA. Ad partners may
            use data for cross-context behavioral advertising; you can opt out via your
            device advertising settings (see Section 4).
          </p>
        </section>

        {/* 8 */}
        <section style={sectionStyle}>
          <h2 style={h2}>8. Data Retention</h2>
          <p>
            Game progress data is stored on your device until you clear the app cache
            or uninstall the app. We do not retain copies of this data on any server.
          </p>
          <p>
            Anonymous analytics events are retained for up to 14 months in accordance
            with our analytics provider's default policy, after which they are
            automatically deleted.
          </p>
          <p>
            Ad-related data is retained by ad partners according to their own policies.
          </p>
        </section>

        {/* 9 */}
        <section style={sectionStyle}>
          <h2 style={h2}>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we make material
            changes, we will update the "Last updated" date at the top of this page.
            Continued use of Ocean Survivor after a policy update indicates acceptance
            of the revised policy.
          </p>
          <p>
            For significant changes that affect how ad data is collected, we will
            re-show the in-app consent prompt so you can review and confirm your
            preferences.
          </p>
        </section>

        {/* 10 */}
        <section style={{ ...sectionStyle, marginBottom: 0 }}>
          <h2 style={h2}>10. Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy or how your
            data is handled, please reach out:
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
            <div style={emailStyle}>{CONTACT_EMAIL}</div>
          </div>
          <p style={{ marginTop: 12 }}>
            We aim to respond to all privacy inquiries within 30 days.
          </p>
        </section>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  marginBottom: 28,
};

const h2: React.CSSProperties = {
  color: "#4dc8ff",
  fontSize: 14,
  fontFamily: "Arial, sans-serif",
  fontWeight: 700,
  margin: "0 0 10px",
  letterSpacing: "0.02em",
};

const h3: React.CSSProperties = {
  color: "rgba(160,210,255,0.85)",
  fontSize: 12,
  fontFamily: "Arial, sans-serif",
  fontWeight: 700,
  margin: "14px 0 6px",
};

const ul: React.CSSProperties = {
  paddingLeft: 20,
  margin: "6px 0 10px",
  color: "rgba(180,210,240,0.75)",
};

const serviceCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  padding: "12px 14px",
  marginBottom: 10,
};

const serviceName: React.CSSProperties = {
  color: "rgba(200,230,255,0.9)",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 4,
};

const serviceDesc: React.CSSProperties = {
  color: "rgba(160,200,235,0.65)",
  fontSize: 12,
  lineHeight: 1.5,
  marginBottom: 4,
};

const serviceLink: React.CSSProperties = {
  color: "rgba(70,160,220,0.6)",
  fontSize: 11,
  fontStyle: "italic",
};

const emailStyle: React.CSSProperties = {
  color: "#4dc8ff",
  fontSize: 13,
};
