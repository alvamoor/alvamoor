import styles from "./TileField.module.css";

const COLORS = [
  "#2d4d52",
  "#293149",
  "#3b503f",
  "#8b7565",
  "#a4887d",
  "#6d4e5a",
  "#45372d",
  "#75554e",
  "#47273b",
];

const TILES = 9;

export function TileField() {
  const cells = [];
  for (let row = 0; row < TILES; row++) {
    for (let col = 0; col < TILES; col++) {
      const color = COLORS[(row % 3) * 3 + (col % 3)];
      cells.push(<div key={`${row}-${col}`} style={{ background: color }} />);
    }
  }
  return (
    <div className={styles.field} aria-hidden>
      {cells}
    </div>
  );
}
