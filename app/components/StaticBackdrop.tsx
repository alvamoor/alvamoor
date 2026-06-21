import styles from "./StaticBackdrop.module.css";

export function StaticBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden>
      <div className={styles.tiles}>
        <span style={{ background: "#666f70" }} />
        <span style={{ background: "#484e5f" }} />
        <span style={{ background: "#918277" }} />
        <span style={{ background: "#b39c94" }} />
      </div>
    </div>
  );
}
