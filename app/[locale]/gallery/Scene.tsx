"use client";

import { PointerLockControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

const ARTWORKS = ["#4a3829", "#7a2818", "#1f2a4d"];

function Room() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#dfd9cf" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 2.5, -10]}>
        <planeGeometry args={[20, 5]} />
        <meshStandardMaterial color="#f4f0e8" />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, 2.5, 10]}>
        <planeGeometry args={[20, 5]} />
        <meshStandardMaterial color="#f4f0e8" />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-10, 2.5, 0]}>
        <planeGeometry args={[20, 5]} />
        <meshStandardMaterial color="#f4f0e8" />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[10, 2.5, 0]}>
        <planeGeometry args={[20, 5]} />
        <meshStandardMaterial color="#f4f0e8" />
      </mesh>
      {ARTWORKS.map((color, i) => (
        <mesh key={i} position={[(i - 1) * 4, 2.5, -9.95]}>
          <planeGeometry args={[2.4, 3.2]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 1.7, 4], fov: 70 }}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      <color attach="background" args={["#1a1410"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <Room />
      <PointerLockControls />
    </Canvas>
  );
}
