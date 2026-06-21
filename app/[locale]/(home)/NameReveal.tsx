import styles from "./landing.module.css";

// The name + statement.
// Desktop (hover): the name slides up behind a line and the full `about`
// statement unrolls from it (CSS-only). Mobile: the short `description` is
// shown statically under the name.
export function NameReveal({
  name,
  about,
  description,
}: {
  name: string;
  about: string;
  description: string;
}) {
  return (
    <div className={styles.reveal}>
      <h1 className={styles.name}>
        <span className={styles.nameInner}>{name}</span>
      </h1>
      <span className={styles.line} aria-hidden="true" />
      <p className={styles.about}>{about}</p>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
