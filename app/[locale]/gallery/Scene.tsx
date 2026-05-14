"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Center,
  KeyboardControls,
  PointerLockControls,
  Stars,
  Text3D,
  useKeyboardControls,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Euler,
  type Mesh,
  type Object3D,
  RepeatWrapping,
  type SpotLight,
  Vector3,
} from "three";

import {
  ARTWORK_COLORS,
  EYE_HEIGHT,
  KEY_MAP,
  type KeyName,
  RING_HEIGHT,
  RING_RADIUS,
  SPEED,
  artworkAngle,
  artworkPosition,
  viewPosition,
} from "./controls";
import { navTarget } from "./nav";

const ARTWORKS: {
  color: string;
  position: [number, number, number];
  rotationY: number;
}[] = ARTWORK_COLORS.map((color, i) => ({
  color,
  position: [
    Math.sin(artworkAngle(i)) * RING_RADIUS,
    RING_HEIGHT,
    Math.cos(artworkAngle(i)) * RING_RADIUS,
  ],
  rotationY: artworkAngle(i) + Math.PI,
}));

function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    setIsTouch(mq.matches);
    const handler = () => setIsTouch(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isTouch;
}

function DragLook() {
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const euler = new Euler(0, 0, 0, "YXZ");
    euler.setFromQuaternion(camera.quaternion);

    let dragging = false;
    let started = false;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;
    let pid: number | null = null;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      started = false;
      downX = lastX = e.clientX;
      downY = lastY = e.clientY;
      pid = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const tdx = e.clientX - downX;
      const tdy = e.clientY - downY;
      if (!started && Math.hypot(tdx, tdy) < 5) return;
      started = true;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      euler.y -= dx * 0.005;
      euler.x -= dy * 0.005;
      euler.x = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, euler.x),
      );
      camera.quaternion.setFromEuler(euler);
    };

    const onUp = () => {
      dragging = false;
      if (pid !== null) {
        try {
          canvas.releasePointerCapture(pid);
        } catch {
          // ignore
        }
        pid = null;
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [camera, gl]);

  return null;
}

function NavSpot({ index }: { index: number }) {
  const ref = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const angle = artworkAngle(index);
  const r = RING_RADIUS - 1.8;
  const x = Math.sin(angle) * r;
  const z = Math.cos(angle) * r;
  const color = ARTWORK_COLORS[index];

  useFrame((state) => {
    if (ref.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.4 + index) * 0.12;
      ref.current.scale.set(s, s, s);
    }
  });

  return (
    <mesh
      ref={ref}
      position={[x, 0.06, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        if (document.pointerLockElement) document.exitPointerLock();
        navTarget.current = index;
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <ringGeometry args={[0.22, 0.45, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={hovered ? 1 : 0.85}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function Wordmark() {
  return (
    <Center position={[0, 4, -28]}>
      <Text3D
        font="/fonts/helvetiker_bold.typeface.json"
        size={2.4}
        height={0.6}
        curveSegments={6}
        bevelEnabled
        bevelSize={0.04}
        bevelThickness={0.05}
        bevelSegments={3}
        letterSpacing={-0.05}
      >
        ALVA MOOR
        <meshStandardMaterial
          color="#ede2cb"
          emissive="#ede2cb"
          emissiveIntensity={0.15}
          roughness={0.8}
          metalness={0.05}
        />
      </Text3D>
    </Center>
  );
}

function NightFloor() {
  const ref = useRef<Mesh>(null);
  useFrame(({ camera }) => {
    if (ref.current) {
      ref.current.position.x = camera.position.x;
      ref.current.position.z = camera.position.z;
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[400, 400, 1, 1]} />
      <meshStandardMaterial color="#0e1428" roughness={0.9} />
    </mesh>
  );
}

function FloatingArt({
  color,
  position,
  rotationY,
}: {
  color: string;
  position: [number, number, number];
  rotationY: number;
}) {
  const artRef = useRef<Mesh>(null);
  const targetRef = useRef<Object3D>(null);
  const spotRef = useRef<SpotLight>(null);

  const washedColor = useMemo(
    () => new Color(color).lerp(new Color("#d4c8b0"), 0.32).getStyle(),
    [color],
  );

  const noiseTexture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const id = ctx.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.floor(80 + Math.random() * 175);
      id.data[i] = v;
      id.data[i + 1] = v;
      id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    const tex = new CanvasTexture(c);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(2, 3);
    return tex;
  }, []);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  useFrame((state) => {
    if (artRef.current) {
      artRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.5 + position[0] * 0.3) * 0.15;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh ref={artRef} position={[0, 0, 0]}>
        <planeGeometry args={[2.4, 3.2]} />
        <meshStandardMaterial
          color={washedColor}
          emissive={washedColor}
          emissiveIntensity={0.08}
          roughness={1}
          metalness={0}
          bumpMap={noiseTexture}
          bumpScale={0.05}
          side={DoubleSide}
        />
      </mesh>
      <object3D ref={targetRef} position={[0, 0, 0]} />
      <spotLight
        ref={spotRef}
        position={[0, 1.2, 4]}
        intensity={25}
        angle={0.45}
        penumbra={0.55}
        distance={14}
        color="#fff4d8"
        decay={1.2}
      />
    </group>
  );
}

function Player() {
  const { camera } = useThree();
  const [, get] = useKeyboardControls<KeyName>();
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const move = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    if (navTarget.current !== null) {
      const i = navTarget.current;
      const view = viewPosition(i);
      const art = artworkPosition(i);
      camera.position.set(view[0], view[1], view[2]);
      camera.lookAt(art[0], art[1], art[2]);
      navTarget.current = null;
      return;
    }

    const keys = get();

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    move.set(0, 0, 0);
    if (keys.forward) move.add(forward);
    if (keys.backward) move.sub(forward);
    if (keys.right) move.add(right);
    if (keys.left) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(SPEED * delta);
      camera.position.add(move);
    }

    camera.position.y = EYE_HEIGHT;
  });

  return null;
}

export default function Scene() {
  const isTouch = useTouchDevice();

  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas
        camera={{ position: [0, EYE_HEIGHT, 6], fov: 72 }}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
        }}
      >
        <color attach="background" args={["#06090f"]} />
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
        <fog attach="fog" args={["#06090f", 15, 80]} />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[6, 8, 4]}
          intensity={0.4}
          color="#aabbdd"
        />
        <NightFloor />
        <Wordmark />
        {ARTWORKS.map((art, i) => (
          <FloatingArt
            key={i}
            color={art.color}
            position={art.position}
            rotationY={art.rotationY}
          />
        ))}
        {ARTWORKS.map((_, i) => (
          <NavSpot key={`spot-${i}`} index={i} />
        ))}
        <Player />
        {isTouch ? <DragLook /> : <PointerLockControls />}
      </Canvas>
    </KeyboardControls>
  );
}
