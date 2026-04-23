import { ImageResponse } from "next/og";

export const alt = "Attendance Mark — shift attendance with live GPS and camera";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)",
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: "#a5b4fc",
            fontWeight: 700,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
          }}
        >
          Attendance Mark
        </div>
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxWidth: 900,
          }}
        >
          <div style={{ fontSize: 58, fontWeight: 800, color: "#ffffff", lineHeight: 1.08 }}>Lovely dashboards.</div>
          <div style={{ fontSize: 58, fontWeight: 800, color: "#ffffff", lineHeight: 1.08 }}>Clear roles.</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 26, color: "#cbd5e1", maxWidth: 820, lineHeight: 1.45 }}>
          Live GPS + camera check-in/out · Company admin and member portals
        </div>
      </div>
    ),
    { ...size },
  );
}
