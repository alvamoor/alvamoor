import styles from "./ScrollSpacer.module.css";

const CELL_COLORS = [
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

export function ScrollSpacer() {
  return (
    <div className={styles.spacer} aria-hidden>
      {CELL_COLORS.map((color, i) => (
        <div key={i} className={styles.cell} style={{ background: color }} />
      ))}
    </div>
  );
}
