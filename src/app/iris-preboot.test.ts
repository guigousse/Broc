// @vitest-environment jsdom
/**
 * Régression : le voile pré-hydratation de la transition iris (#broc-iris-preboot)
 * ne doit JAMAIS être inséré dans <body>. React hydrate les enfants de body ;
 * un div inattendu y fait échouer toute l'hydratation (constaté dans le webview
 * Tauri iOS où le flag sessionStorage persiste entre lancements : menu rendu
 * mais handlers jamais branchés → UI morte). Le voile va sur <html>, hors du
 * périmètre React.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const layoutSource = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "layout.tsx"),
  "utf8",
);

function extraireScriptVoile(): string {
  // Le script inline est le seul à référencer broc-iris-preboot.
  const match = layoutSource.match(/'(\(function\(\)\{[^']*broc-iris-preboot[^']*\}\)\(\);?)'/);
  if (!match) throw new Error("script du voile introuvable dans layout.tsx");
  // Le JSX stocke la source dans une chaîne simple : dé-échapper les \n éventuels.
  return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
}

describe("voile pré-hydratation iris", () => {
  it("s'attache à <html>, pas à <body>, quand le flag est posé", () => {
    sessionStorage.setItem("broc.transition-iris", "1");
    try {
      // eslint-disable-next-line no-new-func
      new Function(extraireScriptVoile())();
      const voile = document.getElementById("broc-iris-preboot");
      expect(voile, "le voile doit être créé quand le flag est posé").not.toBeNull();
      expect(voile!.parentElement).toBe(document.documentElement);
      expect(document.body.contains(voile)).toBe(false);
    } finally {
      sessionStorage.removeItem("broc.transition-iris");
      document.getElementById("broc-iris-preboot")?.remove();
    }
  });
});
