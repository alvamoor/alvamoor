import type { KeyboardControlsEntry } from "@react-three/drei";

export type KeyName = "forward" | "backward" | "left" | "right";

export const KEY_MAP: KeyboardControlsEntry<KeyName>[] = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
];

export const SPEED = 3.5;
export const EYE_HEIGHT = 1.7;

export const ARTWORK_COLORS = [
  "#4a3829",
  "#7a2818",
  "#1c4a52",
  "#a8421e",
  "#6b1f3e",
  "#2d5234",
  "#1f2a4d",
  "#8c4a1c",
  "#4a1f3a",
  "#7a2818",
  "#1c4a52",
  "#4a3829",
];

export const RING_RADIUS = 13;
export const RING_HEIGHT = 2.5;
export const VIEW_DISTANCE = 4.5;

export function artworkAngle(i: number): number {
  return (i / ARTWORK_COLORS.length) * Math.PI * 2;
}

export function artworkPosition(i: number): [number, number, number] {
  const a = artworkAngle(i);
  return [Math.sin(a) * RING_RADIUS, RING_HEIGHT, Math.cos(a) * RING_RADIUS];
}

export function viewPosition(i: number): [number, number, number] {
  const a = artworkAngle(i);
  const r = RING_RADIUS - VIEW_DISTANCE;
  return [Math.sin(a) * r, EYE_HEIGHT, Math.cos(a) * r];
}
