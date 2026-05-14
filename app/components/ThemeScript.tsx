import { STORAGE_KEY, THEMES } from "./theme";

// Runs synchronously before paint to apply the saved theme to <html>,
// preventing a flash of the default palette on reload.
const SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(${JSON.stringify(THEMES.filter((t) => t !== "classic"))}.indexOf(t)!==-1){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
