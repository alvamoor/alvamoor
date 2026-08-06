import { InfiniteScroll } from "./InfiniteScroll";
import { TileField } from "./TileField";

// The coloured tile field, mounted once in the locale layout so it is the same
// element on every route — navigating never re-creates it, and the field keeps
// whatever position you scrolled it to.
//
// data-backdrop is the styling hook. It is an attribute rather than a class
// because the rules that target it live in another CSS module, where class
// names hash differently: the shell lays a scrim over it and makes it
// non-interactive everywhere except the landing (where panning the field is the
// point, and where nothing else wants the scroll).
export function Backdrop() {
  return (
    <div data-backdrop="">
      <InfiniteScroll>
        <TileField />
      </InfiniteScroll>
    </div>
  );
}
