import styles from "./ScrollSpacer.module.css";

const COLORS = [
  "#4a3829",
  "#8c4a1c",
  "#a8421e",
  "#7a2818",
  "#6b1f3e",
  "#4a1f3a",
  "#2d5234",
  "#1c4a52",
  "#1f2a4d",
];

const TILES = 9;

export function ScrollSpacer() {
  const cells = [];
  for (let row = 0; row < TILES; row++) {
    for (let col = 0; col < TILES; col++) {
      const color = COLORS[(row % 3) * 3 + (col % 3)];
      cells.push(
        <div
          key={`${row}-${col}`}
          className={styles.cell}
          style={{ background: color }}
        />,
      );
    }
  }
  return (
    <div className={styles.spacer} aria-hidden>
      {cells}
    </div>
  );
}
