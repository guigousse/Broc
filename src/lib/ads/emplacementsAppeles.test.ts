import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { EMPLACEMENTS_PUB } from "./adProvider";

/**
 * Garde de câblage : chaque écran qui déclenche une pub récompensée doit
 * demander SON emplacement. Sans ça tout le trafic retombe sur le bloc AdMob
 * de la recharge d'énergie (le défaut historique) et les revenus deviennent
 * illisibles par écran dans la console AdMob.
 *
 * Le test lit la source des appelants : c'est le seul endroit où l'oubli se
 * voit, les composants concernés (page atelier, overlay boîte) n'ayant pas de
 * harnais de rendu.
 */
const APPELANTS = [
  ["src/components/mobile/EnergieRecharge.tsx", "energie"],
  ["src/components/mobile/BoiteMystereOverlay.tsx", "boiteMystere"],
  ["src/app/(qg)/atelier/page.tsx", "restauration"],
] as const;

describe("emplacements publicitaires — câblage des appelants", () => {
  it.each(APPELANTS)("%s demande EMPLACEMENTS_PUB.%s", (fichier, cle) => {
    const source = readFileSync(fichier, "utf8");
    const args = [...source.matchAll(/showRewardedAd\(\s*([^)]*?)\s*\)/g)].map((m) => m[1]);
    expect(args.length).toBeGreaterThan(0);
    for (const arg of args) expect(arg).toBe(`EMPLACEMENTS_PUB.${cle}`);
  });

  it("couvre tous les emplacements déclarés", () => {
    expect(APPELANTS.map(([, cle]) => cle).sort()).toEqual(
      Object.keys(EMPLACEMENTS_PUB).sort(),
    );
  });
});

/**
 * Le pont natif est la moitié de la chaîne que rien d'autre ne couvre : un
 * emplacement absent de sa table, laissé vide ou pointant sur le même bloc
 * qu'un autre retombe silencieusement sur le bloc par défaut — soit très
 * exactement le bug qu'on vient de corriger, mais invisible côté web.
 */
describe("AD_UNITS (pont natif) — un bloc distinct par emplacement", () => {
  const source = readFileSync(
    "src-tauri/gen/apple/Sources/app/AdmobBridge.swift",
    "utf8",
  );
  const table = source.match(/AD_UNITS: \[String: String\] = \[([\s\S]*?)\n\]/);
  const blocs = new Map(
    [...(table?.[1] ?? "").matchAll(/"([^"]+)":\s*(?:"([^"]*)"|(\w+))/g)].map(
      (m) => [m[1], m[2] ?? m[3]],
    ),
  );

  it.each(Object.values(EMPLACEMENTS_PUB))("%s a son propre bloc AdMob", (emplacement) => {
    const bloc = blocs.get(emplacement);
    expect(bloc, `emplacement absent de AD_UNITS`).toBeDefined();
    expect(bloc, `bloc AdMob non renseigné`).not.toBe("");
  });

  it("aucun bloc n'est partagé entre deux emplacements", () => {
    const ids = [...blocs.values()];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
