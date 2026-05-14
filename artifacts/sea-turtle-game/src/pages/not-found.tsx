export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#010609" }}>
      <div style={{ textAlign: "center", color: "white", fontFamily: "'Nunito', Arial, sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🐢</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>404 — Page Not Found</h1>
        <p style={{ color: "rgba(160,200,255,0.6)", fontSize: 14 }}>This page doesn't exist in the ocean.</p>
      </div>
    </div>
  );
}
