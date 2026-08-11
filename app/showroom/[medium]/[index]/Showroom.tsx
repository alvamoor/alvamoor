"use client";

import { useEffect, useRef, useState } from "react";

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { SRGBColorSpace, type Texture, Vector3 } from "three";

import styles from "@/app/showroom/showroom.module.css";

// One three.js unit is one metre. Every number below is a real-world measurement,
// which is the whole point of the route: the old scene drew nine identical
// 2.4 × 3.2 planes and told you nothing about how big anything was.

/** Vertical field of view, ≈ a 35 mm lens. The scene this replaces used 72°, and a
 *  wide lens flattens the depth cues that size perception depends on. */
const FOV = 38;

/** Standing eye height, and the height the camera looks at — just below eye level,
 *  so verticals stay near-vertical and the room does not keel. */
const EYE = 1.6;
const LOOK_AT_Y = 1.4;

/** Museum convention: 57 inches to the centre of the work. */
const HANG_CENTRE = 1.45;
/** No work's bottom edge goes below this, however tall it is. */
const MIN_BOTTOM = 0.15;

/** The reference body: 175 cm to the crown. */
const FIGURE_HEIGHT = 1.75;
const BODY_RADIUS = 0.17;
/** CapsuleGeometry's `height` is the middle section only — total is height + 2r.
 *  1.18 + 0.34 = 1.52 m to the shoulders, feet at 0. */
const BODY_MIDDLE = 1.18;
const HEAD_RADIUS = 0.105;
/** Clear air between the work's edge and the body, so it never occludes the work. */
const FIGURE_GAP = 0.55;

// The framing targets. What matters is that these are CONSTANTS: the room camera
// is a function of the viewport alone, never of the work in front of it. A camera
// that framed each painting nicely would render every work the same size on screen
// and destroy the only thing this route exists to show.
//
// Vertically we must hold the floor line (y = 0) through the top of the tallest
// work (1.45 + 1.10 = 2.55 m) — the wall/floor junction is the strongest anchor in
// the scene and must never leave frame. Horizontally we aim to hold the work plus
// the figure. On a tall phone the horizontal solve runs away (a 0.5 aspect wants
// ~10 m), so it is capped: wide works then run past the frame edges, which is
// itself an honest signal, and the fit view is there for anyone who wants the whole
// thing.
const VERTICAL_SPAN = 3.0;
const HORIZONTAL_SPAN = 3.6;
const DISTANCE_MAX = 7;
const DISTANCE_MIN = 1.2;
/** Share of frame height the work fills in the fit view. */
const FIT_FILL = 0.7;

const WALL_COLOR = "#e8e4dc";
const FLOOR_COLOR = "#cfc7b8";
const FIGURE_COLOR = "#9d9587";

export type ShowroomWork = {
  src: string;
  widthCm: number;
  heightCm: number;
  title: string;
};

/** Half the visible height one metre from the camera. */
const halfAngle = Math.tan((FOV * Math.PI) / 360);

/** Where the centre of a work of this height sits, in metres. */
function hangCentre(heightM: number) {
  return Math.max(HANG_CENTRE, MIN_BOTTOM + heightM / 2);
}

function roomDistance(aspect: number) {
  const vertical = VERTICAL_SPAN / (2 * halfAngle);
  const horizontal = HORIZONTAL_SPAN / (2 * halfAngle * aspect);
  // Vertical wins whenever the viewport is wide, which keeps the room camera at a
  // constant ~4.35 m on any landscape screen.
  return Math.max(vertical, Math.min(horizontal, DISTANCE_MAX));
}

function fitDistance(heightM: number) {
  return Math.max(DISTANCE_MIN, heightM / (FIT_FILL * 2 * halfAngle));
}

/**
 * Moves the camera between the two framings. The move is tweened rather than cut
 * because the viewer has to feel that *they* moved — a cut reads as the painting
 * changing size, which is the one misreading this route cannot afford.
 */
function CameraRig({ heightM, fit }: { heightM: number; fit: boolean }) {
  const { camera, size } = useThree();
  const target = useRef(new Vector3());
  const lookAt = useRef(new Vector3(0, LOOK_AT_Y, 0));

  const aspect = size.width / size.height;
  const distance = fit ? fitDistance(heightM) : roomDistance(aspect);
  target.current.set(0, fit ? hangCentre(heightM) : EYE, distance);

  // Start already in place, so the first frame is the composition rather than a
  // swoop in from wherever the default camera sat.
  const placed = useRef(false);
  if (!placed.current) {
    placed.current = true;
    camera.position.copy(target.current);
  }

  useFrame((_, delta) => {
    // Exponential approach: framerate-independent, and settles in ~0.6 s.
    camera.position.lerp(target.current, 1 - Math.exp(-6 * delta));
    lookAt.current.set(0, fit ? hangCentre(heightM) : LOOK_AT_Y, 0);
    camera.lookAt(lookAt.current);
  });

  return null;
}

/**
 * The work, at its recorded size.
 *
 * The geometry comes from widthCm/heightCm rather than from the image, because the
 * measurement is the claim being made. When the image's own aspect disagrees, the
 * image is cropped to fit rather than stretched — a stretched painting would be a
 * second, quieter lie on top of a data error.
 */
function Painting({ work }: { work: ShowroomWork }) {
  const texture = useTexture(work.src) as Texture;
  const w = work.widthCm / 100;
  const h = work.heightCm / 100;

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;

    const image = texture.image as
      { width: number; height: number } | undefined;
    if (!image?.width || !image?.height) return;

    const imageAspect = image.width / image.height;
    const recordedAspect = w / h;
    const drift = Math.abs(imageAspect - recordedAspect) / recordedAspect;

    if (drift > 0.05 && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `showroom: "${work.title}" is recorded as ${work.widthCm}×${work.heightCm} cm ` +
          `(${recordedAspect.toFixed(2)}) but its image is ${imageAspect.toFixed(2)} — ` +
          `one of the two is wrong.`,
      );
    }

    // Cover-fit, centred.
    if (imageAspect > recordedAspect) {
      texture.repeat.set(recordedAspect / imageAspect, 1);
      texture.offset.set((1 - recordedAspect / imageAspect) / 2, 0);
    } else {
      texture.repeat.set(1, imageAspect / recordedAspect);
      texture.offset.set(0, (1 - imageAspect / recordedAspect) / 2);
    }
    texture.needsUpdate = true;
  }, [texture, w, h, work.title, work.widthCm, work.heightCm]);

  return (
    // 3 cm proud of the wall: canvases have depth, and it keeps the two planes from
    // fighting for the same pixels.
    <mesh position={[0, hangCentre(h), 0.03]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  );
}

/**
 * The scale reference, built from primitives on purpose. No model file and no
 * texture: the route this replaces spent its whole life drawing nine invisible
 * planes because the images it pointed at had been deleted, and a scale reference
 * that fails to load is worse than none — it would leave a plausible, unlabelled
 * painting floating on a wall.
 *
 * Deliberately a mannequin rather than a person: enough to read as a body at a
 * glance, not enough to look at instead of the painting.
 */
function Figure({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0.25]}>
      <mesh position={[0, BODY_MIDDLE / 2 + BODY_RADIUS, 0]}>
        <capsuleGeometry args={[BODY_RADIUS, BODY_MIDDLE, 8, 16]} />
        <meshStandardMaterial color={FIGURE_COLOR} roughness={0.85} />
      </mesh>
      <mesh position={[0, FIGURE_HEIGHT - HEAD_RADIUS, 0]}>
        <sphereGeometry args={[HEAD_RADIUS, 24, 16]} />
        <meshStandardMaterial color={FIGURE_COLOR} roughness={0.85} />
      </mesh>
      {/* Grounding, in place of a shadow map: enough to stop the body hovering. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[BODY_RADIUS * 1.6, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.13} />
      </mesh>
    </group>
  );
}

function Room() {
  return (
    <>
      {/* Both are far larger than the frame ever shows, so no edge of the room is
          ever visible — an edge would read as a panel, and a panel has no size. */}
      <mesh position={[0, 4, 0]}>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 8]}>
        <planeGeometry args={[14, 16]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9} />
      </mesh>
    </>
  );
}

export default function Showroom({ work }: { work: ShowroomWork }) {
  const [fit, setFit] = useState(false);
  const h = work.heightCm / 100;
  const figureX = work.widthCm / 200 + FIGURE_GAP;

  return (
    <>
      <Canvas
        camera={{ fov: FOV, near: 0.1, far: 100, position: [0, EYE, 4.35] }}
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
      >
        <color attach="background" args={[WALL_COLOR]} />
        {/* Even gallery light. The scene this replaces put a spotlight of intensity
            25 on every work; theatre is the opposite of what a measurement wants. */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 5, 6]} intensity={0.6} />

        <Room />
        <Figure x={figureX} />
        <Painting work={work} />
        <CameraRig heightM={h} fit={fit} />
      </Canvas>

      <button
        type="button"
        className={styles.distance}
        onClick={() => setFit((v) => !v)}
        // Said plainly, because the two views mean different things: one is
        // comparable between works and one is not.
        aria-label={
          fit
            ? "Return to the room view, where every work is seen from the same distance"
            : "Move closer to fill the frame with this work"
        }
      >
        {fit ? "room view" : "fit to work"}
      </button>
    </>
  );
}
