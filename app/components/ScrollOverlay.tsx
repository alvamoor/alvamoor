import styles from "./ScrollOverlay.module.css";

const COLORS = [
  "#a8421e",
  "#1f2a4d",
  "#2d5234",
  "#4a1f3a",
  "#4a3829",
  "#8c4a1c",
  "#1c4a52",
  "#7a2818",
  "#6b1f3e",
];

const TILES = 9;

export function ScrollOverlay() {
  const cells = [];
  for (let row = 0; row < TILES; row++) {
    for (let col = 0; col < TILES; col++) {
      const color = COLORS[(row % 3) * 3 + (col % 3)];
      cells.push(
        <div
          key={`${row}-${col}`}
          className={styles.cell}
          style={{ backgroundColor: color }}
        />,
      );
    }
  }
  return (
    <div className={styles.overlay} aria-hidden>
      {cells}
    </div>
  );
}
