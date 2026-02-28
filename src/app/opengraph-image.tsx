import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FenceEstimatePro — Built for Fence Contractors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a1a12 0%, #0d2016 50%, #071510 100%)",
          padding: "0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(45,106,79,0.25) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          display: "flex",
        }} />

        {/* Green glow */}
        <div style={{
          position: "absolute",
          top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "700px", height: "400px",
          background: "radial-gradient(ellipse, rgba(45,106,79,0.2) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* Left accent bar */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: "6px",
          background: "linear-gradient(to bottom, transparent, #2D6A4F, transparent)",
          display: "flex",
        }} />

        {/* Content */}
        <div style={{
          position: "relative", zIndex: 2,
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          height: "100%",
        }}>
          {/* Top: Logo + brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "52px", height: "52px",
              background: "#2D6A4F",
              borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: "30px", height: "24px",
                display: "flex", flexDirection: "column", gap: "5px",
              }}>
                <div style={{ height: "4px", background: "white", borderRadius: "2px", display: "flex" }} />
                <div style={{ height: "4px", background: "white", borderRadius: "2px", display: "flex" }} />
                <div style={{ height: "4px", background: "white", borderRadius: "2px", display: "flex" }} />
              </div>
            </div>
            <span style={{
              fontFamily: "sans-serif", fontWeight: 700,
              fontSize: "22px", color: "white", letterSpacing: "-0.5px",
            }}>
              FenceEstimatePro
            </span>
          </div>

          {/* Center: Main headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "rgba(45,106,79,0.15)",
              border: "1px solid rgba(45,106,79,0.3)",
              borderRadius: "100px", padding: "6px 16px",
              width: "fit-content",
            }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", display: "flex" }} />
              <span style={{ fontFamily: "sans-serif", fontSize: "14px", color: "#86efac", letterSpacing: "0.08em", fontWeight: 600 }}>
                BUILT FOR FENCE CONTRACTORS
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{
                fontFamily: "sans-serif", fontWeight: 800,
                fontSize: "72px", color: "white",
                letterSpacing: "-2px", lineHeight: "1",
                display: "flex",
              }}>
                Know Your Profit
              </span>
              <span style={{
                fontFamily: "sans-serif", fontWeight: 800,
                fontSize: "72px", color: "#4ade80",
                letterSpacing: "-2px", lineHeight: "1",
                display: "flex",
              }}>
                Before You Quote.
              </span>
            </div>

            <span style={{
              fontFamily: "sans-serif", fontSize: "24px",
              color: "rgba(255,255,255,0.5)",
              lineHeight: "1.4", display: "flex",
            }}>
              Estimates, jobs, materials & margin — all in one platform.
            </span>
          </div>

          {/* Bottom: Stats */}
          <div style={{ display: "flex", gap: "48px" }}>
            {[
              ["$1,200+", "avg. profit protected per job"],
              ["35%", "avg. margin maintained"],
              ["5 min", "to build a professional quote"],
            ].map(([val, label]) => (
              <div key={val} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: "32px", color: "#4ade80" }}>{val}</span>
                <span style={{ fontFamily: "sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.35)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side decorative fence graphic */}
        <div style={{
          position: "absolute", right: "80px", top: "50%",
          transform: "translateY(-50%)",
          display: "flex", gap: "16px", alignItems: "center",
          opacity: 0.08,
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "0", height: "0", borderLeft: "20px solid transparent", borderRight: "20px solid transparent", borderBottom: "30px solid white", display: "flex" }} />
              <div style={{ width: "40px", height: "180px", background: "white", borderRadius: "4px", display: "flex" }} />
            </div>
          ))}
          <div style={{ position: "absolute", top: "40px", left: "-20px", right: "-20px", height: "24px", background: "white", borderRadius: "4px", display: "flex" }} />
          <div style={{ position: "absolute", top: "110px", left: "-20px", right: "-20px", height: "24px", background: "white", borderRadius: "4px", display: "flex" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
