"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Center,
  KeyboardControls,
  Stars,
  Text3D,
  useKeyboardControls,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  Euler,
  type Mesh,
  type Object3D,
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
}[] = ARTWORK_COLORS.map((color, index) => ({
  color,
  position: [
    Math.sin(artworkAngle(index)) * RING_RADIUS,
    RING_HEIGHT,
    Math.cos(artworkAngle(index)) * RING_RADIUS,
  ],
  rotationY: artworkAngle(index) + Math.PI,
}));

function DragLook() {
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const euler = new Euler(0, 0, 0, "YXZ");
    euler.setFromQuaternion(camera.quaternion);

    let dragging = false;
    let dragStarted = false;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;
    let activePointerId: number | null = null;

    const onDown = (event: PointerEvent) => {
      dragging = true;
      dragStarted = false;
      downX = lastX = event.clientX;
      downY = lastY = event.clientY;
      activePointerId = event.pointerId;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const totalDeltaX = event.clientX - downX;
      const totalDeltaY = event.clientY - downY;
      if (!dragStarted && Math.hypot(totalDeltaX, totalDeltaY) < 5) return;
      dragStarted = true;
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      euler.y -= deltaX * 0.005;
      euler.x -= deltaY * 0.005;
      euler.x = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, euler.x),
      );
      camera.quaternion.setFromEuler(euler);
    };

    const onUp = () => {
      dragging = false;
      if (activePointerId !== null) {
        try {
          canvas.releasePointerCapture(activePointerId);
        } catch {
          // ignore
        }
        activePointerId = null;
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
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const angle = artworkAngle(index);
  const spotRadius = RING_RADIUS - 1.8;
  const x = Math.sin(angle) * spotRadius;
  const z = Math.cos(angle) * spotRadius;
  const color = ARTWORK_COLORS[index];

  useFrame((state) => {
    if (meshRef.current) {
      const pulseScale =
        1 + Math.sin(state.clock.elapsedTime * 1.4 + index) * 0.12;
      meshRef.current.scale.set(pulseScale, pulseScale, pulseScale);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[x, 0.06, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
        navTarget.current = index;
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
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
  const meshRef = useRef<Mesh>(null);
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.position.x = camera.position.x;
      meshRef.current.position.z = camera.position.z;
    }
  });
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
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
  const [, getKeys] = useKeyboardControls<KeyName>();
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const move = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    if (navTarget.current !== null) {
      const targetIndex = navTarget.current;
      const standingPosition = viewPosition(targetIndex);
      const lookAtPosition = artworkPosition(targetIndex);
      camera.position.set(
        standingPosition[0],
        standingPosition[1],
        standingPosition[2],
      );
      camera.lookAt(lookAtPosition[0], lookAtPosition[1], lookAtPosition[2]);
      navTarget.current = null;
      return;
    }

    const keys = getKeys();

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
        {ARTWORKS.map((artwork, index) => (
          <FloatingArt
            key={index}
            color={artwork.color}
            position={artwork.position}
            rotationY={artwork.rotationY}
          />
        ))}
        {ARTWORKS.map((_, index) => (
          <NavSpot key={`spot-${index}`} index={index} />
        ))}
        <Player />
        <DragLook />
      </Canvas>
    </KeyboardControls>
  );
}
