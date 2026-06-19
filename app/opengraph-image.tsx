import { ImageResponse } from "next/og";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "alva moor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const direction = await readFile(
    join(process.cwd(), "app/fonts/Direction-R9e63.otf"),
  );

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#2d4d52",
        color: "#ede2cb",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 400,
          height: 472,
          backgroundColor: "#293149",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 800,
          height: 158,
          backgroundColor: "#8b7565",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 400,
          height: 158,
          backgroundColor: "#a4887d",
        }}
      />
      <div
        style={{
          fontFamily: "Direction",
          fontSize: 200,
          lineHeight: 0.92,
          letterSpacing: "-0.01em",
          textShadow: "0 2px 40px rgba(0, 0, 0, 0.25)",
        }}
      >
        ALVA MOOR
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Direction", data: direction, style: "normal", weight: 400 },
      ],
    },
  );
}
