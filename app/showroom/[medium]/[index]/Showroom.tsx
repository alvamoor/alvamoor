"use client";

import {
  type ComponentRef,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
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

// Gallery white — but a shade under paper-white on purpose. A wall painted to render
// at full brightness everywhere has nowhere left to go when the lighting hits it, and
// reads as a flat card. Left slightly down, the wash from the ceiling spots is what
// lifts it to white where the work hangs, which is what a lit gallery wall looks like.
const WALL_COLOR = "#eceae7";
const FLOOR_BASE = "#d6cebf";
/** White skirting, painted with the wall, as galleries do it. */
const SKIRTING_COLOR = "#f6f5f2";
/** A shade off the back wall, so a corner is a corner rather than a seam. */
const SIDE_WALL_COLOR = "#e7e5e1";
const CEILING_COLOR = "#fbfaf8";
const FRAME_COLOR = "#f8f7f4";
const POT_COLOR = "#b0705a";
const SOIL_COLOR = "#42352a";
const LEAF_COLOR = "#6d8a62";
const STEM_COLOR = "#5f7a55";

// An ordinary domestic window, and ordinary is the point: 120 × 150 with the sill at
// 90 cm is a size everybody has stood next to, so it reads as scale as well as light.
// On the right-hand wall, because the key light already comes from that side — a
// window opposite the light would have the room lit from nowhere.
const WINDOW_W = 1.2;
const WINDOW_H = 1.5;
const SILL_H = 0.9;
const FRAME_STOCK = 0.06;
const MULLION = 0.035;
/** Along the room's depth. Near the corner on purpose: at 2.2 m it sat forward of
 *  everything the camera can turn to see, so the window existed and was unreachable.
 *  At 1.0 it comes into frame with the corner. */
const WINDOW_Z = 0.8;
const FIGURE_COLOR = "#9d9587";
const CHAIR_COLOR = "#8a7f6d";
const CANVAS_EDGE = "#ddd7c9";

// Ceiling track and three spot heads, raked at the wall. They are the reason the room
// is lit the way it is, and having the fittings visible is a large part of why a space
// reads as a gallery rather than as a room with a picture in it.
const TRACK_Y = 3.18;
const TRACK_Z = 1.45;
const SPOT_XS = [-1.75, 0, 1.75];

// The rake, measured from straight down, and the single number the fittings, the beams
// and the pools on the wall are all derived from. Set independently they drifted apart
// immediately — the wash sat centred at x = 0 while the lamps making it hung at ±1.75,
// so the light on the wall belonged to nothing in the room.
const SPOT_RAKE = 0.775;
/** Rotation that points a head down and at the wall (local +Z becomes the beam). */
const SPOT_ROT_X = Math.PI - SPOT_RAKE;
/** Where a beam meets the wall: the drop over the run out from it. */
const WASH_Y = TRACK_Y - TRACK_Z / Math.tan(SPOT_RAKE);

/** Where the side walls stand: outside the default frame, found by turning. */
const ROOM_HALF_W = 3.6;
/** A gallery ceiling, and high enough to clear the tallest work hung at 145 to
 *  centre (2.55 m) with room to spare. */
const CEILING_H = 3.3;

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
        const l = 79 + t * 7;
        g.fillStyle = `hsl(38 14% ${l}%)`;
        g.fillRect(i * bw, 0, bw, PX);
        g.strokeStyle = "rgba(70, 58, 44, 0.16)";
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
// Movement limits. The room stays a room: you can walk up to a painting and step
// back from it, and look at it from either side, but you cannot leave, get behind the
// wall, or float. Clamped orbit is also what keeps the side walls and ceiling doing
// their job — they come into view as you turn, which is when a flat backdrop would
// have given itself away.
const NEAR_LIMIT = 1.1;
const FAR_LIMIT = 9;
/** ±35° of turn: enough to see the canvas edge-on, the room's corner, and the window
 *  in the side wall. At ±29° the window was reachable only as a sliver at the frame
 *  edge — present in the room and not really visible in it. */
const AZIMUTH_LIMIT = 0.62;
// Polar angle is measured from straight up, so these read backwards from instinct and I
// had them backwards at first: a *smaller* angle lifts the camera and tilts the view
// DOWN, a larger one drops it and tilts UP. Hence min is how far you may rise, max how
// far you may crouch.
//
// The crouch is what reaches the ceiling track, and it has to be a real crouch: the
// track sits ~30° above the eye while the frame's top edge only covers 19°, so seeing
// it means getting low. That is fair enough — in a gallery you tilt your head to find
// the lights too — and the lighting is legible without it, from the wash on the wall and
// from shadows that pool at people's feet instead of streaking sideways.
const POLAR_MIN = 1.3;
const POLAR_MAX = 1.78;

/** Seconds the move to a named view takes. */
const VIEW_TWEEN = 0.55;

type View = "room" | "fit";

/**
 * What is outside: sky over a band of foliage, in a canvas rather than a photograph.
 *
 * A window onto a flat colour reads as a lightbox. Two or three bands of gradient are
 * enough for the eye to accept a world out there, and generating them keeps the
 * promise the floor texture makes — nothing here can 404.
 */
function useSkyTexture() {
  return useMemo(() => {
    const W = 64;
    const H = 256;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext("2d");
    if (g) {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#b9d6ea");
      sky.addColorStop(0.55, "#dde9ef");
      sky.addColorStop(0.72, "#eef2ee");
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      // Foliage: a soft mass rather than drawn trees, which at this size would only
      // read as noise.
      const trees = g.createLinearGradient(0, H * 0.66, 0, H);
      trees.addColorStop(0, "rgba(122, 148, 112, 0)");
      trees.addColorStop(0.35, "rgba(108, 136, 100, 0.85)");
      trees.addColorStop(1, "rgba(86, 110, 82, 0.95)");
      g.fillStyle = trees;
      g.fillRect(0, H * 0.66, W, H * 0.34);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);
}

/**
 * The pool of light ceiling spots throw down a gallery wall: brightest high and behind
 * the work, falling away at the edges.
 *
 * This is what actually communicates "lit from above". The direction of a light is
 * almost impossible to read off a flat matte wall — what you read is the gradient it
 * leaves. Additive over a wall painted slightly under white, so the lit area arrives
 * at white and the corners stay a shade down, which is the whole look.
 */
function useWallWashTexture() {
  return useMemo(() => {
    const S = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = S;
    const g = canvas.getContext("2d");
    if (g) {
      // Centred high: the spots are above and in front, so the brightest band sits
      // above the painting rather than behind its middle.
      const glow = g.createRadialGradient(
        S / 2,
        S * 0.3,
        0,
        S / 2,
        S * 0.3,
        S * 0.62,
      );
      glow.addColorStop(0, "rgba(255, 255, 252, 0.72)");
      glow.addColorStop(0.5, "rgba(255, 255, 250, 0.34)");
      glow.addColorStop(1, "rgba(255, 255, 250, 0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, S, S);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);
}

/**
 * The patch of daylight a window throws on the floor — soft-edged, so it lies on the
 * boards rather than sitting on them like a decal.
 *
 * This is the one piece of the window visible without turning, and it does more for
 * the room than the window itself: light on the floor says the space has an outside,
 * before you have found where it is.
 */
function useSunTexture() {
  return useMemo(() => {
    const S = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = S;
    const g = canvas.getContext("2d");
    if (g) {
      const glow = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      glow.addColorStop(0, "rgba(252, 253, 255, 0.6)");
      glow.addColorStop(0.55, "rgba(250, 252, 255, 0.3)");
      glow.addColorStop(1, "rgba(250, 252, 255, 0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, S, S);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);
}

/**
 * The camera: placed by us, then driven by you.
 *
 * Free movement and an honest scale are not in conflict, as long as the moving is
 * yours. A camera that silently re-framed each painting would make every work look
 * the same size, which is the failure this route exists to avoid — but a viewer who
 * walks closer knows they walked closer. So orbit and dolly are unrestricted within
 * the room, "room view" returns to the one distance that is constant across every
 * work, and the metres are on screen the whole time so you always know where you are
 * standing.
 *
 * The tween matters for the same reason it always did: a cut between two distances
 * reads as the painting changing size. Controls are suspended while it runs so the
 * two are never fighting for the camera.
 */
function CameraRig({
  heightM,
  view,
  onDistance,
}: {
  heightM: number;
  view: View;
  onDistance: (metres: number) => void;
}) {
  const { camera, size } = useThree();
  // Typed off the component rather than three-stdlib, which is drei's transitive
  // dependency and not ours to import.
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const goal = useRef(new Vector3());
  const goalTarget = useRef(new Vector3());
  const tween = useRef(0);
  const reported = useRef(-1);

  const aspect = size.width / size.height;

  // Recompute on every view change — and on nothing else. Stepping to another work
  // deliberately leaves the camera exactly where it is: an unchanged viewpoint is the
  // whole reason two works can be compared at all.
  useEffect(() => {
    const distance =
      view === "fit" ? fitDistance(heightM) : roomDistance(aspect);
    const y = view === "fit" ? hangCentre(heightM) : EYE;
    goal.current.set(0, y, distance);
    goalTarget.current.set(
      0,
      view === "fit" ? hangCentre(heightM) : LOOK_AT_Y,
      0,
    );
    tween.current = VIEW_TWEEN;
  }, [view, heightM, aspect]);

  useFrame((_, delta) => {
    const orbit = controls.current;

    if (tween.current > 0 && orbit) {
      tween.current = Math.max(0, tween.current - delta);
      orbit.enabled = false;
      const k = 1 - Math.exp(-7 * delta);
      camera.position.lerp(goal.current, k);
      orbit.target.lerp(goalTarget.current, k);
      orbit.update();
      if (tween.current === 0) orbit.enabled = true;
    }

    // Reported to the tenth of a metre, and only when it changes, so the readout does
    // not set React state sixty times a second.
    const metres =
      Math.round(
        camera.position.distanceTo(orbit?.target ?? goalTarget.current) * 10,
      ) / 10;
    if (metres !== reported.current) {
      reported.current = metres;
      onDistance(metres);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      // No panning: sliding the camera sideways would take you out of the room and
      // break the one composition the scene is built around.
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      minDistance={NEAR_LIMIT}
      maxDistance={FAR_LIMIT}
      minAzimuthAngle={-AZIMUTH_LIMIT}
      maxAzimuthAngle={AZIMUTH_LIMIT}
      minPolarAngle={POLAR_MIN}
      maxPolarAngle={POLAR_MAX}
      target={[0, LOOK_AT_Y, 0]}
    />
  );
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

/**
 * A window on the right-hand wall: reveal, frame, mullions and a view out.
 *
 * On the right because that is where the key light already comes from. A window on the
 * shadowed side would leave the room lit by nothing, which the eye notices even when
 * it cannot say why.
 */
function Window() {
  const sky = useSkyTexture();
  const halfW = WINDOW_W / 2;
  const halfH = WINDOW_H / 2;
  const centreY = SILL_H + halfH;

  return (
    // Laid out flat in local X/Y and turned to face into the room, like the wall it
    // sits in.
    <group
      position={[ROOM_HALF_W - 0.02, centreY, WINDOW_Z]}
      rotation={[0, -Math.PI / 2, 0]}
    >
      {/* The view out. Unlit, because it is outside: shading daylight with the room's
          own lamps would make it darker than the wall around it. */}
      <mesh>
        <planeGeometry args={[WINDOW_W, WINDOW_H]} />
        <meshBasicMaterial map={sky} />
      </mesh>

      {/* Frame: four lengths around the opening. */}
      {[
        {
          p: [0, halfH + FRAME_STOCK / 2, 0],
          a: [WINDOW_W + FRAME_STOCK * 2, FRAME_STOCK, 0.09],
        },
        {
          p: [0, -halfH - FRAME_STOCK / 2, 0],
          a: [WINDOW_W + FRAME_STOCK * 2, FRAME_STOCK, 0.12],
        },
        {
          p: [-halfW - FRAME_STOCK / 2, 0, 0],
          a: [FRAME_STOCK, WINDOW_H, 0.09],
        },
        {
          p: [halfW + FRAME_STOCK / 2, 0, 0],
          a: [FRAME_STOCK, WINDOW_H, 0.09],
        },
      ].map(({ p, a }, i) => (
        // Deliberately not casting. No light actually passes through the glass, so a
        // frame-shaped shadow would land on the wall with nothing to explain it.
        <mesh key={i} position={p as [number, number, number]}>
          <boxGeometry args={a as [number, number, number]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.8} />
        </mesh>
      ))}

      {/* Mullions. They divide the glass into panes of a size everyone has seen, which
          is half of what makes a window legible as a window. */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[MULLION, WINDOW_H, 0.03]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[WINDOW_W, MULLION, 0.03]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.8} />
      </mesh>
    </group>
  );
}

/**
 * Daylight on the boards, as a soft-edged quad rather than a real light.
 *
 * Additive and unlit, so it brightens the floor without lighting anything else — a
 * second casting light would have thrown a second set of shadows and undone the one
 * clear direction the room is lit from. Angled off the grain so it reads as light
 * falling across the boards rather than as a board.
 */
function SunPatch() {
  const sun = useSunTexture();

  // Left of centre and hard against the wall, for two reasons. The key light travels
  // left-and-back, so a pool from a right-hand window belongs on this side — the
  // figure's shadow already falls that way. And the visible band of floor is far
  // narrower than it looks: at the room distance the frame's lower edge crosses the
  // floor around z = 0.5, so anything further forward than that is simply below the
  // picture.
  // Wide and shallow, sitting in the strip of floor that is on screen. A square pool
  // put most of its gradient behind the wall or below the frame, so all that showed
  // was the faint outer edge of it — which is to say, nothing.
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0.28]} position={[-0.5, 0.004, 0.26]}>
      <planeGeometry args={[2.6, 0.7]} />
      <meshBasicMaterial map={sun} transparent depthWrite={false} />
    </mesh>
  );
}

/**
 * A potted plant, at the size a floor plant actually is: about a metre over a 30 cm
 * pot. Placed on the opposite side from the figure and inside the default frame, so
 * the room has something living in it before you have moved at all.
 *
 * Leaves are flattened spheres on stems. Not botany — but a fan of green shapes rising
 * out of a terracotta pot is read as a plant instantly, and anything more detailed
 * would start competing with the painting.
 */
function Plant({ x }: { x: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        // Deterministic spread: a fan, tilted a little further out as it goes round.
        const around = (i / 9) * Math.PI * 2;
        const lean = 0.34 + ((i * 5) % 7) / 24;
        const rise = 0.42 + ((i * 3) % 5) / 12;
        return { around, lean, rise };
      }),
    [],
  );

  return (
    <group position={[x, 0, 0.5]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.13, 0.3, 20]} />
        <meshStandardMaterial color={POT_COLOR} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.155, 0.155, 0.02, 20]} />
        <meshStandardMaterial color={SOIL_COLOR} roughness={1} />
      </mesh>
      {leaves.map(({ around, lean, rise }, i) => (
        <group key={i} rotation={[0, around, 0]}>
          <mesh
            position={[Math.sin(lean) * rise * 0.5, 0.3 + rise * 0.5, 0]}
            rotation={[0, 0, -lean]}
            castShadow
          >
            <cylinderGeometry args={[0.008, 0.012, rise, 6]} />
            <meshStandardMaterial color={STEM_COLOR} roughness={0.9} />
          </mesh>
          <mesh
            position={[Math.sin(lean) * rise, 0.3 + rise, 0]}
            rotation={[0, 0, -lean]}
            scale={[0.042, 0.18, 0.055]}
            castShadow
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color={LEAF_COLOR} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The ceiling track and its heads, aimed at the wall.
 *
 * Raked rather than pointing straight down, for the same reason real galleries rake
 * theirs: a wall's normal is horizontal, so a light directly overhead barely touches
 * it. Straight down would leave the painting darker than the floor.
 */
function TrackLights() {
  return (
    <group position={[0, TRACK_Y, TRACK_Z]}>
      <mesh>
        <boxGeometry args={[5.4, 0.05, 0.06]} />
        <meshStandardMaterial color="#3c3a36" roughness={0.6} metalness={0.2} />
      </mesh>
      {SPOT_XS.map((x) => (
        <group key={x} position={[x, -0.1, 0]} rotation={[SPOT_ROT_X, 0, 0]}>
          {/* Stem, then a barrel pointing where the light goes. */}
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.12, 10]} />
            <meshStandardMaterial color="#3c3a36" roughness={0.6} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.07, 0.17, 16]} />
            <meshStandardMaterial
              color="#35332f"
              roughness={0.55}
              metalness={0.25}
            />
          </mesh>
          {/* The lens, lit so the fitting looks switched on. */}
          <mesh position={[0, 0, 0.088]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.004, 16]} />
            <meshBasicMaterial color="#fff8e6" />
          </mesh>

          {/* A halo at the lens rather than a beam down to the wall.
              A visible cone was the obvious thing to try and cannot work here: it is
              aimed at the wall the painting hangs on, so it crosses in front of the
              work — and nothing fixes that, because the beam really is between the
              viewer and the picture. Depth tricks do not help; only not drawing it
              does. The light gets to announce itself at the fitting and in the pool it
              lands in, and the painting stays unveiled. */}
          <mesh position={[0, 0, 0.094]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.115, 20]} />
            <meshBasicMaterial
              color="#fff4d4"
              transparent
              opacity={0.5}
              blending={AdditiveBlending}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * What the spots leave on the wall: one pool per head, where that head is actually
 * pointing.
 *
 * Overlapping, so they read as a continuously lit wall with three bright centres —
 * which is what track lighting looks like, and what a single centred gradient could
 * never be. Additive over a wall painted a shade under white, so the lit band arrives
 * at white while the corners stay down.
 */
function WallPools() {
  const wash = useWallWashTexture();

  return (
    <>
      {SPOT_XS.map((x) => (
        <mesh key={x} position={[x, WASH_Y, 0.004]}>
          <planeGeometry args={[2.9, 3.2]} />
          <meshBasicMaterial
            map={wash}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

function Room() {
  const floor = useFloorTexture();

  return (
    <>
      {/* Back wall. Larger than the frame shows, so its edges are never the thing you
          notice — an edge reads as a panel, and a panel has no size. */}
      <mesh position={[0, 4, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_W, 8]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>

      {/* Side walls and a ceiling, just outside the default frame. They cost two
          planes and a third, and they are what turns a backdrop into a room the moment
          you turn or look up: the corners give perspective two more converging lines,
          and the ceiling closes the space so the wall stops reading as a flat card
          standing in the open. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          rotation={[0, (side * -Math.PI) / 2, 0]}
          position={[side * ROOM_HALF_W, 4, FLOOR_D / 2]}
          receiveShadow
        >
          <planeGeometry args={[FLOOR_D, 8]} />
          <meshStandardMaterial color={SIDE_WALL_COLOR} roughness={0.95} />
        </mesh>
      ))}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, CEILING_H, FLOOR_D / 2]}
      >
        <planeGeometry args={[ROOM_HALF_W * 2, FLOOR_D]} />
        <meshStandardMaterial color={CEILING_COLOR} roughness={1} />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, FLOOR_D / 2]}
        receiveShadow
      >
        <planeGeometry args={[FLOOR_W, FLOOR_D]} />
        <meshStandardMaterial map={floor} color={FLOOR_BASE} roughness={0.75} />
      </mesh>

      <WallPools />
      <TrackLights />
      <Window />

      {/* Skirting. A 10 cm datum along the junction the whole composition hangs from,
          and it turns that junction from a colour change into an edge. */}
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
  const [view, setView] = useState<View>("room");
  // Metres from the camera to what it is looking at, reported up from the rig. On
  // screen the whole time: once you can move, the only thing that keeps the scale
  // honest is knowing where you are standing.
  const [metres, setMetres] = useState<number | null>(null);

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

        {/* Overhead now, and raked at the wall rather than aimed at the floor. A wall's
            normal is horizontal, so a light straight above it contributes almost
            nothing: point these down and the painting ends up darker than the boards.
            From [0.9, 5.4, 2.9] the wall still sees cos θ ≈ 0.58 while the shadows fall
            downward and back, which is the difference you actually notice — bodies
            planted on the floor instead of pinned to the wall.

            Intensities look high next to pre-r155 three.js examples and have to be:
            lights are physically based by default, so a Lambertian surface reflects
            irradiance/π. Reflected luminance ≈ albedo × (ambient + 0.58 × key) / π, so
            white walls want ambient + 0.58 × key ≈ π — not "more light" but that
            equation. Ambient at roughly half the key keeps shadow contrast steady as
            the pair scale. */}
        <ambientLight intensity={1.45} />
        <directionalLight
          position={[0.9, 5.4, 2.9]}
          intensity={2.9}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={7}
          shadow-camera-bottom={-3}
          shadow-camera-near={0.5}
          shadow-camera-far={22}
          shadow-bias={-0.0008}
        />
        {/* Fill from high on the other side, uncast, so the shadowed faces do not go
            dead and the single shadow direction stays single. */}
        <directionalLight position={[-2.4, 4.4, 1.8]} intensity={0.55} />

        <Room />
        <SunPatch />
        {/* Furniture is placed relative to the work so nothing ever crowds it, and
            clamped so a 250 cm canvas does not push the plant through the wall. */}
        <Plant x={Math.max(-2.7, -(halfW + 1.15))} />
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
        <CameraRig heightM={h} view={view} onDistance={setMetres} />
      </Canvas>

      <div className={styles.viewControls}>
        {/* Where you are standing. Drag to look, scroll or pinch to walk in and out —
            and this is the number that stops that freedom from quietly undoing the
            comparison, because the room view is one fixed distance for every work. */}
        {metres !== null && (
          <span className={styles.metres} aria-live="off">
            {metres.toFixed(1)} m
          </span>
        )}
        <button
          type="button"
          className={styles.distance}
          onClick={() => setView((v) => (v === "fit" ? "room" : "fit"))}
          // Said plainly, because the two views mean different things: one is
          // comparable between works and one is not.
          aria-label={
            view === "fit"
              ? "Return to the room view, where every work is seen from the same distance"
              : "Move closer to fill the frame with this work"
          }
        >
          {view === "fit" ? "room view" : "fit to work"}
        </button>
      </div>
    </>
  );
}
