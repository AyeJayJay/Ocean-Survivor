/*
 * PrivacyPolicy — privacy policy page
 *
 * Rendered as a full-page route at /privacy (wouter), which makes it
 * linkable from web and navigable inside the Capacitor WebView on native.
 * The Settings scene emits emitPrivacyPolicy() → EventBus → navigate("/privacy").
 *
 * Contains placeholder text with clearly marked [PLACEHOLDER] sections for
 * a real attorney to complete before app store submission.
 */

import { useLocation } from "wouter";

interface Props {
  onClose?: () => void;
}

export default function PrivacyPolicy({ onClose }: Props) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/");
    }
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
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
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
        padding: "24px 20px 40px",
        maxWidth: 480,
        width: "100%",
        margin: "0 auto",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "rgba(200,220,240,0.85)",
        fontSize: 13,
        lineHeight: 1.65,
      }}>
        <p style={{ color: "rgba(150,190,230,0.55)", fontSize: 11, marginBottom: 20 }}>
          Last updated: [PLACEHOLDER — insert date before submission]
        </p>

        <section style={{ marginBottom: 24 }}>
          <h2 style={h2}>1. Introduction</h2>
          <p>
            Welcome to Ocean Survivor ("the App"), operated by [PLACEHOLDER — your legal entity name]
            ("we," "us," or "our"). This Privacy Policy explains how we collect, use, and protect
            information in connection with our App.
          </p>
          <p>
            By playing Ocean Survivor, you agree to the terms of this Privacy Policy.
            [PLACEHOLDER — have an attorney review this section for GDPR/CCPA compliance.]
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={h2}>2. Information We Collect</h2>
          <p>
            <strong style={{ color: "rgba(200,230,255,0.9)" }}>Information stored on your device:</strong> Your game progress (high score,
            shells collected, achievements, selected skin) is stored locally on your device using
            the browser's localStorage or device storage. This data never leaves your device.
          </p>
          <p>
            <strong style={{ color: "rgba(200,230,255,0.9)" }}>Advertising identifiers:</strong> We use Google AdMob to display ads.
            AdMob may collect your advertising identifier (IDFA on iOS, GAID on Android) and
            other device information to show personalized ads. See Google's Privacy Policy at
            https://policies.google.com/privacy.
          </p>
          <p>
            [PLACEHOLDER — list any analytics services you use (e.g., Firebase Analytics) and
            what device or behavioral data they collect.]
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={h2}>3. How We Use Your Information</h2>
          <p>We use the information collected to:</p>
          <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
            <li>Display relevant advertisements through Google AdMob</li>
            <li>Improve game performance and fix bugs</li>
            <li>[PLACEHOLDER — add other uses specific to your app]</li>
          </ul>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={h2}>4. Third-Party Services</h2>
          <p>
            <strong style={{ color: "rgba(200,230,255,0.9)" }}>Google AdMob:</strong> We use AdMob for in-app advertising. AdMob is
            governed by Google's Privacy Policy. You can opt out of personalized advertising
            in your device settings.
          </p>
          <p>
            [PLACEHOLDER — list all other third-party SDKs or services, their purpose, and link
            to their privacy policies. Common ones: Firebase, Crashlytics, AppsFlyer, etc.]
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={h2}>5. Children's Privacy</h2>
          <p>
            [PLACEHOLDER — if your app targets children under 13 (COPPA) or under 16 (GDPR),
            you must include specific language here and configure AdMob accordingly with
            tagForChildDirectedTreatment. An attorney must review this section.]
          </p>
          <p>
            This app is not directed to children under the age of 13. We do not knowingly
            collect personal information from children under 13.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={h2}>6. Your Rights</h2>
          <p>
            [PLACEHOLDER — depending on your users' locations, you may need to address GDPR
            rights (EU), CCPA rights (California), and other regional privacy laws. Have an
            attorney complete this section.]
          </p>
          <p>
            You can clear all locally stored game data by clearing your app's cache in device
            settings. To opt out of personalized ads, adjust your device's advertising settings.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={h2}>7. Data Retention</h2>
          <p>
            Game progress data is stored locally on your device indefinitely until you clear it.
            [PLACEHOLDER — describe how long you retain any server-side data, if applicable.]
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={h2}>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new policy in the App. [PLACEHOLDER — specify how users will be notified.]
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={h2}>9. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, contact us at:
          </p>
          <p style={{ fontStyle: "italic", color: "rgba(150,180,210,0.6)" }}>
            [PLACEHOLDER — your contact email address]<br />
            [PLACEHOLDER — your mailing address]
          </p>
        </section>

        <div style={{
          background: "rgba(255,200,0,0.06)",
          border: "1px solid rgba(255,200,0,0.2)",
          borderRadius: 10,
          padding: "14px 16px",
          marginTop: 12,
        }}>
          <p style={{
            color: "rgba(255,200,100,0.7)",
            fontSize: 11,
            margin: 0,
            fontStyle: "italic",
          }}>
            This privacy policy contains placeholder sections marked [PLACEHOLDER] that must be
            completed by a qualified attorney before submitting to the App Store or Google Play.
          </p>
        </div>
      </div>
    </div>
  );
}

const h2: React.CSSProperties = {
  color: "#4dc8ff",
  fontSize: 15,
  fontFamily: "Arial, sans-serif",
  fontWeight: 700,
  margin: "0 0 8px",
};
