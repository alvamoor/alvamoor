import { ImageResponse } from "next/og";

export const alt = "alvamoor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4a3829",
        color: "#ede2cb",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          fontSize: 220,
          fontStyle: "italic",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 0.9,
        }}
      >
        alvamoor
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 32,
          opacity: 0.7,
          letterSpacing: "0.02em",
        }}
      >
        a portfolio is being assembled
      </div>
    </div>,
    size,
  );
}
