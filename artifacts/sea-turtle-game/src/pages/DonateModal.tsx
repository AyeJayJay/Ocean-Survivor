import { useState, useEffect } from "react";

interface DonationTier {
  priceId: string;
  amount: number;
  label: string;
  description: string;
}

const FALLBACK_TIERS: DonationTier[] = [
  { priceId: "", amount: 500,  label: "$5",  description: "Fund sea turtle nest monitoring" },
  { priceId: "", amount: 1000, label: "$10", description: "Sponsor one beach patrol" },
  { priceId: "", amount: 2500, label: "$25", description: "Fund a sea turtle rescue kit" },
  { priceId: "", amount: 5000, label: "$50", description: "Sponsor a satellite tracker" },
];

interface Props {
  onClose: () => void;
}

export default function DonateModal({ onClose }: Props) {
  const [tiers, setTiers] = useState<DonationTier[]>([]);
  const [selected, setSelected] = useState<DonationTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL ?? "/";
    fetch(`${base}api/donate/prices`)
      .then((r) => r.json())
      .then((data) => {
        if (data.prices && data.prices.length > 0) {
          const mapped: DonationTier[] = data.prices.map((p: any) => ({
            priceId: p.price_id,
            amount: p.unit_amount,
            label: `$${(p.unit_amount / 100).toFixed(0)}`,
            description: p.product_description ?? "",
          }));
          setTiers(mapped);
          setSelected(mapped[1] ?? mapped[0]);
        } else {
          setTiers(FALLBACK_TIERS);
          setSelected(FALLBACK_TIERS[1]);
        }
      })
      .catch(() => {
        setTiers(FALLBACK_TIERS);
        setSelected(FALLBACK_TIERS[1]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDonate() {
    if (!selected) return;
    if (!selected.priceId) {
      setError("Stripe is not yet connected. Please connect Stripe via the Integrations tab to accept donations.");
      return;
    }
    setCheckingOut(true);
    setError(null);
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const res = await fetch(`${base}api/donate/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selected.priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Failed to start checkout. Please try again.");
        setCheckingOut(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setCheckingOut(false);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(2,8,18,0.93)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "24px 20px",
        overflowY: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 14,
          right: 18,
          background: "rgba(255,255,255,0.1)",
          border: "none",
          color: "white",
          width: 32,
          height: 32,
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>🐢</div>
        <h2 style={{ color: "#4dc47a", margin: 0, fontSize: 19, fontFamily: "'Segoe UI', sans-serif", fontWeight: 700 }}>
          Sea Turtle Conservancy
        </h2>
        <p style={{ color: "rgba(180,230,255,0.85)", margin: "6px 0 0", fontSize: 13, fontFamily: "'Segoe UI', sans-serif", lineHeight: 1.4 }}>
          Every dollar protects real sea turtles and their ocean home.
          Your donation funds rescue operations, beach patrols, and satellite tracking.
        </p>
      </div>

      {/* Tier selector */}
      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 18 }}>Loading donation options...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 380, marginBottom: 16 }}>
          {tiers.map((tier) => (
            <button
              key={tier.label}
              onClick={() => setSelected(tier)}
              style={{
                background: selected?.label === tier.label ? "rgba(77,196,122,0.25)" : "rgba(255,255,255,0.07)",
                border: selected?.label === tier.label ? "2px solid #4dc47a" : "2px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "12px 10px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s",
              }}
            >
              <div style={{ color: selected?.label === tier.label ? "#4dc47a" : "white", fontSize: 22, fontWeight: 700, fontFamily: "'Segoe UI', sans-serif" }}>
                {tier.label}
              </div>
              <div style={{ color: "rgba(200,230,255,0.7)", fontSize: 11, fontFamily: "'Segoe UI', sans-serif", marginTop: 3, lineHeight: 1.3 }}>
                {tier.description}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ color: "#ff8080", fontSize: 12, textAlign: "center", marginBottom: 12, fontFamily: "'Segoe UI', sans-serif", maxWidth: 340 }}>
          {error}
        </div>
      )}

      {/* Donate button */}
      <button
        onClick={handleDonate}
        disabled={!selected || loading || checkingOut}
        style={{
          background: checkingOut ? "rgba(77,196,122,0.4)" : "linear-gradient(135deg, #4dc47a, #2d8a4e)",
          border: "none",
          borderRadius: 12,
          color: "white",
          padding: "14px 40px",
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "'Segoe UI', sans-serif",
          cursor: checkingOut ? "wait" : "pointer",
          width: "100%",
          maxWidth: 380,
          marginBottom: 14,
          opacity: (!selected || loading) ? 0.5 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {checkingOut ? "Redirecting to Stripe..." : `Donate ${selected?.label ?? ""} to Sea Turtles`}
      </button>

      {/* Conservancy link */}
      <a
        href="https://www.conserveturtles.org"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "rgba(150,210,255,0.6)", fontSize: 12, fontFamily: "'Segoe UI', sans-serif", textDecoration: "none" }}
      >
        Learn more at conserveturtles.org ↗
      </a>

      <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "'Segoe UI', sans-serif", marginTop: 12, textAlign: "center" }}>
        Powered by Stripe · Secure & encrypted
      </p>
    </div>
  );
}
