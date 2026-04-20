import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "AI Fence Estimator — Upload a photo, get a quote";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TryItOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background:
            "linear-gradient(135deg, #0b2545 0%, #081a32 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "#c9a84c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#0b2545",
              fontSize: 22,
            }}
          >
            F
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
            FenceEstimatePro
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 10,
              background: "rgba(201,168,76,0.15)",
              border: "1px solid rgba(201,168,76,0.4)",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 15,
              color: "#f0dfaa",
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            <span>New · Free · No signup</span>
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.05,
              maxWidth: 980,
            }}
          >
            See a fence estimate from a photo.
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: "rgba(255,255,255,0.75)",
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            Upload any yard photo. Our AI identifies the fence run, counts
            gates, and returns a price range in seconds.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <div>fenceestimatepro.com/try-it</div>
          <div>Built for fence contractors.</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
