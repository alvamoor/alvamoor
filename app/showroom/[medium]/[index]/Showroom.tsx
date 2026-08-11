"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  NoToneMapping,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from "three";

import styles from "@/app/showroom/showroom.module.css";

// One three.js unit is one metre. Every number is a real measurement.
//
// The first version of this scene got the geometry right and still read wrong: the
// painting drew at 2.68 px/cm and the reference figure at 2.95, feet exactly on the
// floor line — correct, and unreadable. Correct metric geometry is necessary and not
// sufficient. Perception needs cues the maths does not supply: shadows to ground
// things, a floor with lines running away from you, a reference that unmistakably
// reads as a body, and a second object whose size everyone already knows.

/** Vertical field of view, ≈ a 35 mm lens. The scene before this used 72°, and a
 *  wide lens flattens the depth cues size perception runs on. */
const FOV = 38;

/** Standing eye height. */
const EYE = 1.6;
/** Aimed below eye level, which is what puts a band of floor in shot. The first
 *  version looked at 1.4 and left the floor a 30-pixel sliver at the bottom edge. */
const LOOK_AT_Y = 1.25;

/** Museum convention: 57 inches to the centre of the work. */
const HANG_CENTRE = 1.45;
/** No work's bottom edge goes below this, however tall it is. */
const MIN_BOTTOM = 0.15;
/** Stretcher depth. A canvas is an object on the wall, not a decal. */
const CANVAS_DEPTH = 0.035;

// A body, in parts, because one capsule was a bollard. Proportions of a 175 cm
// adult: floor to hip 85, hip to shoulder 63, then neck and head to 175.
const FIGURE_HEIGHT = 1.75;
const LEG_RADIUS = 0.075;
const LEG_TOP = 0.85;
const TORSO_RADIUS = 0.15;
const TORSO_TOP = 1.48;
const HEAD_RADIUS = 0.105;
/** Clear air between the work's edge and the body, so it never occludes the work. */
const FIGURE_GAP = 0.55;
/** Far enough off the wall to cast a readable shadow, close enough that perspective
 *  does not inflate it: at 45 cm the figure sat ~9% nearer the camera than the
 *  painting and measured ~9% larger per centimetre, which is true and unhelpful when
 *  the two are there to be compared. The chair stays further out — its job is depth,
 *  not measurement. */
const FIGURE_Z = 0.3;

// A chair, at the dimensions every chair has: 45 cm to the seat, 90 cm to the top of
// the back. Asked for, and the right thing to add — two independent references
// disagree visibly if the scale is wrong, where one can only ever look plausible.
const SEAT_H = 0.45;
const SEAT_W = 0.45;
const SEAT_D = 0.45;
const BACK_H = 0.9;
const CHAIR_STOCK = 0.04;
const CHAIR_GAP = 0.75;
const CHAIR_Z = 0.6;

// Framing targets, and they are CONSTANTS: the room camera is a function of the
// viewport alone, never of the work in front of it. A camera that framed each
// painting nicely would render every work the same size on screen and destroy the
// one thing this route exists to show.
//
// The vertical span runs from below the floor line to above the tallest work
// (1.45 + 1.10 = 2.55 m), with enough floor left in shot for its lines to converge.
const VERTICAL_SPAN = 3.4;
const HORIZONTAL_SPAN = 4.2;
const DISTANCE_MAX = 7.5;
const DISTANCE_MIN = 1.2;
/** Share of frame height the work fills in the fit view. */
const FIT_FILL = 0.7;

const WALL_COLOR = "#e8e4dc";
const FLOOR_BASE = "#c9bfae";
const SKIRTING_COLOR = "#dcd6cb";
const FIGURE_COLOR = "#9d9587";
const CHAIR_COLOR = "#8a7f6d";
const CANVAS_EDGE = "#ddd7c9";

/** Board pitch. 20 cm boards are a ruler laid on the floor, not just texture. */
const BOARD_CM = 20;
const FLOOR_W = 14;
const FLOOR_D = 16;

export type ShowroomWork = {
  src: string;
  widthCm: number;
  heightCm: number;
  title: string;
};

/** Half the visible height one metre from the camera. */
const halfAngle = Math.tan((FOV * Math.PI) / 360);

function hangCentre(heightM: number) {
  return Math.max(HANG_CENTRE, MIN_BOTTOM + heightM / 2);
}

function roomDistance(aspect: number) {
  const vertical = VERTICAL_SPAN / (2 * halfAngle);
  const horizontal = HORIZONTAL_SPAN / (2 * halfAngle * aspect);
  return Math.max(vertical, Math.min(horizontal, DISTANCE_MAX));
}

function fitDistance(heightM: number) {
  return Math.max(DISTANCE_MIN, heightM / (FIT_FILL * 2 * halfAngle));
}

/**
 * Floorboards, drawn in a 2D canvas at build-free runtime rather than loaded.
 *
 * This is the largest single depth cue in the scene. A flat-coloured floor gives
 * perspective nothing to work with; boards running away from the viewer converge,
 * and convergence is what the eye reads distance from. At a 20 cm pitch they double
 * as a measuring stick laid beside the painting.
 *
 * Generated instead of shipped because the route this replaced spent its whole life
 * drawing invisible planes: its textures pointed at a directory that had been
 * deleted. A texture that cannot 404 cannot do that.
 */
function useFloorTexture() {
  return useMemo(() => {
    // One tile is 2 m of floor, so the pitch below is honest at any repeat count.
    const TILE_M = 2;
    const PX = 512;
    const boards = (TILE_M * 100) / BOARD_CM;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PX;
    const g = canvas.getContext("2d");
    if (g) {
      const bw = PX / boards;
      for (let i = 0; i < boards; i++) {
        // Deterministic per-board tone: real floors are not one colour, and the
        // variation is what stops the repeat reading as wallpaper.
        const t = ((i * 37) % 11) / 11;
        const l = 74 + t * 8;
        g.fillStyle = `hsl(38 14% ${l}%)`;
        g.fillRect(i * bw, 0, bw, PX);
        g.strokeStyle = "rgba(60, 48, 34, 0.22)";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(i * bw + 0.75, 0);
        g.lineTo(i * bw + 0.75, PX);
        g.stroke();
      }
    }
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    // Seams run along Z — away from the viewer — because the plane is laid down by
    // a -90° rotation about X, which maps the texture's U to world X.
    texture.repeat.set(FLOOR_W / TILE_M, FLOOR_D / TILE_M);
    return texture;
  }, []);
}

/**
 * Moves the camera between the two framings, tweened rather than cut: the viewer has
 * to feel that *they* moved, or the move reads as the painting resizing, which is
 * the one misreading this route cannot afford.
 */
/** How far the camera leans with the pointer. Small on purpose: 12 cm of sway at
 *  ~5 m changes apparent size by under 3%, so the comparison survives, while motion
 *  parallax is the strongest depth cue available to a flat screen. Leaning is also
 *  what a person actually does in front of a painting. */
const SWAY_X = 0.12;
const SWAY_Y = 0.06;

function CameraRig({ heightM, fit }: { heightM: number; fit: boolean }) {
  const { camera, size, pointer } = useThree();
  const target = useRef(new Vector3());
  const lookAt = useRef(new Vector3(0, LOOK_AT_Y, 0));
  const sway = useRef(new Vector3());
  const swayed = useRef(new Vector3());
  const placed = useRef(false);

  const aspect = size.width / size.height;
  const distance = fit ? fitDistance(heightM) : roomDistance(aspect);
  target.current.set(0, fit ? hangCentre(heightM) : EYE, distance);

  if (!placed.current) {
    placed.current = true;
    camera.position.copy(target.current);
  }

  useFrame((_, delta) => {
    // The sway is added to the target rather than the camera, so it eases with the
    // same tween and never fights the view change.
    swayed.current
      .copy(target.current)
      .add(sway.current.set(pointer.x * SWAY_X, pointer.y * SWAY_Y, 0));
    camera.position.lerp(swayed.current, 1 - Math.exp(-6 * delta));
    lookAt.current.set(0, fit ? hangCentre(heightM) : LOOK_AT_Y, 0);
    camera.lookAt(lookAt.current);
  });

  return null;
}

/**
 * The work at its recorded size, with a stretcher behind it.
 *
 * The geometry comes from widthCm/heightCm, not from the image, because the
 * measurement is the claim being made. When the image's aspect disagrees it is
 * cropped rather than stretched — a stretched painting would be a second, quieter
 * lie on top of a data error.
 */
function Painting({ work }: { work: ShowroomWork }) {
  const texture = useTexture(work.src) as Texture;
  const w = work.widthCm / 100;
  const h = work.heightCm / 100;
  const y = hangCentre(h);

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
    <group position={[0, y, 0]}>
      {/* The stretcher: gives the work a lit edge and a shadow on the wall behind
          it, which is most of what makes it read as hanging rather than printed. */}
      <mesh position={[0, 0, CANVAS_DEPTH / 2]} castShadow>
        <boxGeometry args={[w, h, CANVAS_DEPTH]} />
        <meshStandardMaterial color={CANVAS_EDGE} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, CANVAS_DEPTH + 0.001]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * The scale reference, in parts. The first version was a single capsule 34 cm wide
 * from floor to shoulder, which read as a bollard — and a bollard has no known size,
 * so it calibrated nothing. Legs are what make it a person, and a person is the one
 * object every viewer measures instinctively.
 *
 * Still deliberately a mannequin: enough to read as a body at a glance, not enough
 * to look at instead of the painting. Built from primitives, so there is no asset to
 * go missing.
 */
function Figure({ x }: { x: number }) {
  const legMiddle = LEG_TOP - 2 * LEG_RADIUS;
  const torsoMiddle = TORSO_TOP - LEG_TOP - 2 * TORSO_RADIUS;

  return (
    <group position={[x, 0, FIGURE_Z]}>
      {[-0.1, 0.1].map((dx) => (
        <mesh key={dx} position={[dx, LEG_TOP / 2, 0]} castShadow>
          <capsuleGeometry args={[LEG_RADIUS, legMiddle, 6, 12]} />
          <meshStandardMaterial color={FIGURE_COLOR} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, (LEG_TOP + TORSO_TOP) / 2, 0]} castShadow>
        <capsuleGeometry args={[TORSO_RADIUS, torsoMiddle, 6, 16]} />
        <meshStandardMaterial color={FIGURE_COLOR} roughness={0.85} />
      </mesh>
      <mesh position={[0, FIGURE_HEIGHT - HEAD_RADIUS, 0]} castShadow>
        <sphereGeometry args={[HEAD_RADIUS, 24, 16]} />
        <meshStandardMaterial color={FIGURE_COLOR} roughness={0.85} />
      </mesh>
    </group>
  );
}

/**
 * A chair, because a second reference is worth more than a better first one. If the
 * scale is off, a figure alone still looks plausible — but a figure and a chair
 * disagree with each other visibly, and everyone knows how high a seat is.
 *
 * Turned toward the camera so it presents three faces rather than a flat silhouette.
 */
function Chair({ x }: { x: number }) {
  const legInset = SEAT_W / 2 - CHAIR_STOCK / 2;
  const legDepth = SEAT_D / 2 - CHAIR_STOCK / 2;

  return (
    <group position={[x, 0, CHAIR_Z]} rotation={[0, 0.34, 0]}>
      {[
        [-legInset, -legDepth],
        [legInset, -legDepth],
        [-legInset, legDepth],
        [legInset, legDepth],
      ].map(([lx, lz]) => (
        <mesh
          key={`${lx}:${lz}`}
          position={[lx, (SEAT_H - CHAIR_STOCK) / 2, lz]}
          castShadow
        >
          <boxGeometry
            args={[CHAIR_STOCK, SEAT_H - CHAIR_STOCK, CHAIR_STOCK]}
          />
          <meshStandardMaterial color={CHAIR_COLOR} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, SEAT_H - CHAIR_STOCK / 2, 0]} castShadow>
        <boxGeometry args={[SEAT_W, CHAIR_STOCK, SEAT_D]} />
        <meshStandardMaterial color={CHAIR_COLOR} roughness={0.8} />
      </mesh>
      <mesh position={[0, (SEAT_H + BACK_H) / 2, -legDepth]} castShadow>
        <boxGeometry args={[SEAT_W, BACK_H - SEAT_H, CHAIR_STOCK]} />
        <meshStandardMaterial color={CHAIR_COLOR} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Room() {
  const floor = useFloorTexture();

  return (
    <>
      {/* Both are far larger than the frame shows, so no edge of the room is ever
          visible — an edge reads as a panel, and a panel has no size. */}
      <mesh position={[0, 4, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_W, 8]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, FLOOR_D / 2]}
        receiveShadow
      >
        <planeGeometry args={[FLOOR_W, FLOOR_D]} />
        <meshStandardMaterial map={floor} color={FLOOR_BASE} roughness={0.75} />
      </mesh>
      {/* Skirting. A 10 cm datum along the junction the whole composition hangs
          from, and it turns that junction from a colour change into an edge. */}
      <mesh position={[0, 0.05, 0.012]} receiveShadow castShadow>
        <boxGeometry args={[FLOOR_W, 0.1, 0.024]} />
        <meshStandardMaterial color={SKIRTING_COLOR} roughness={0.85} />
      </mesh>
    </>
  );
}

export default function Showroom({
  work,
  preload = [],
}: {
  work: ShowroomWork;
  preload?: string[];
}) {
  const [fit, setFit] = useState(false);

  // Fetch the neighbouring works' textures now, so stepping to one swaps the painting
  // instead of showing an empty wall while an image downloads. drei keeps a cache
  // keyed by URL, which is the same cache useTexture reads from, so an already
  // preloaded texture resolves without suspending at all.
  useEffect(() => {
    for (const src of preload) useTexture.preload(src);
  }, [preload]);
  const h = work.heightCm / 100;
  const halfW = work.widthCm / 200;

  return (
    <>
      <Canvas
        shadows
        // Tone mapping off: these are flat colours under even light and want to
        // arrive as authored, not filmically graded.
        gl={{ toneMapping: NoToneMapping }}
        camera={{ fov: FOV, near: 0.1, far: 100, position: [0, EYE, 4.94] }}
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
      >
        <color attach="background" args={[WALL_COLOR]} />

        {/* These look high next to pre-r155 three.js examples and have to be. Lights
            are physically based by default now, so a Lambertian surface reflects
            irradiance/π — which is the whole story of why this room started out
            gloomy. The wall faces +Z and the key light arrives at cos θ ≈ 0.6, so
            reflected luminance ≈ albedo × (ambient + 0.6 × key) / π. At 0.42 / 0.85
            that is 0.29 — a #e8e4dc wall rendering near #989790. Doubling both
            barely moved it, because the fix is not "more" but solving for
            ambient + 0.6 × key ≈ π.

            Holding ambient at roughly half the key keeps shadow contrast where it
            was while the pair scale. One casting light, from front-left: a single
            clear shadow direction reads better than several soft ones fighting. */}
        <ambientLight intensity={1.4} />
        <directionalLight
          position={[2.6, 4.2, 3.6]}
          intensity={2.85}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-2}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-bias={-0.0008}
        />
        {/* Fill from the other side, uncast, so the shadowed faces do not go dead. */}
        <directionalLight position={[-3, 2.5, 2]} intensity={0.6} />

        <Room />
        <Chair x={-(halfW + CHAIR_GAP)} />
        <Figure x={halfW + FIGURE_GAP} />
        {/* The boundary belongs *inside* the Canvas, around the one thing that
            suspends. Outside it — where this started — `useTexture` suspending
            unmounted the whole canvas element until the image resolved, so a slow
            or blocked texture left no scene at all rather than a room waiting for
            its painting. */}
        <Suspense fallback={null}>
          <Painting work={work} />
        </Suspense>
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
