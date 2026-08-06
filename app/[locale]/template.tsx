import styles from "./shell.module.css";

// A template (unlike a layout) re-mounts on every navigation, which is exactly
// what the content fade needs: the animation replays for the incoming page
// while the chrome in layout.tsx stays mounted and motionless.
export default function ContentTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.fade}>{children}</div>;
}
