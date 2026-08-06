import { TILE_TINTS } from "@/app/lib/palette";

import styles from "./TileField.module.css";

const TILES = 9;

export function TileField() {
  const cells = [];
  for (let row = 0; row < TILES; row++) {
    for (let col = 0; col < TILES; col++) {
      const color = TILE_TINTS[(row % 3) * 3 + (col % 3)];
      cells.push(<div key={`${row}-${col}`} style={{ background: color }} />);
    }
  }
  return (
    <div className={styles.field} aria-hidden>
      {cells}
    </div>
  );
}
