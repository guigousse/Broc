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
 * voit, les composants concernés (contenu Atelier de la Réserve, overlay
 * boîte) n'ayant pas de harnais de rendu.
 */
const APPELANTS = [
  ["src/components/mobile/EnergieRecharge.tsx", "energie"],
  ["src/components/mobile/BoiteMystereOverlay.tsx", "boiteMystere"],
  ["src/components/mobile/reserve/AtelierContenu.tsx", "restauration"],
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

/**
 * Même garde pour le plugin Kotlin (sous-projet B). Syntaxe Kotlin :
 *   "energie" to AD_UNIT_ENERGIE,
 *   "boite-mystere" to "ca-app-pub-…/…",
 * Tant que les blocs Android n'existent pas dans la console AdMob, les trois
 * entrées pointent le bloc rewarded de TEST Google : la distinction est alors
 * volontairement absente, le test la saute en le disant.
 */
describe("AD_UNITS (plugin Kotlin Android) — un bloc distinct par emplacement", () => {
  const BLOC_TEST_GOOGLE = "ca-app-pub-3940256099942544/5224354917";
  const source = readFileSync(
    "src-tauri/vendor/tauri-plugin-admob/android/src/main/java/AdmobPlugin.kt",
    "utf8",
  );
  // Constantes `private const val X = "…"` ou `= AUTRE_CONSTANTE`, résolues en
  // chaîne (une constante peut en référencer une autre).
  const constantes = new Map(
    [...source.matchAll(/private const val (\w+) = (?:"([^"]*)"|(\w+))/g)].map((m) => [
      m[1],
      m[2] !== undefined ? `"${m[2]}"` : m[3],
    ]),
  );
  const resoudre = (v: string, profondeur = 0): string => {
    if (v.startsWith('"')) return v.slice(1, -1);
    const suivant = constantes.get(v);
    if (suivant === undefined || profondeur > 5) return v;
    return resoudre(suivant, profondeur + 1);
  };
  const table = source.match(/AD_UNITS: Map<String, String> = mapOf\(([\s\S]*?)\n\)/);
  const blocs = new Map(
    [...(table?.[1] ?? "").matchAll(/"([^"]+)" to ("[^"]*"|\w+)/g)].map((m) => [
      m[1],
      resoudre(m[2]),
    ]),
  );
  const ids = [...blocs.values()];
  const enTest = ids.length > 0 && ids.every((id) => id === BLOC_TEST_GOOGLE);

  it.each(Object.values(EMPLACEMENTS_PUB))("%s a son propre bloc AdMob", (emplacement) => {
    const bloc = blocs.get(emplacement);
    expect(bloc, `emplacement absent de AD_UNITS (Kotlin)`).toBeDefined();
    expect(bloc, `bloc AdMob non renseigné`).not.toBe("");
    expect(bloc, `bloc AdMob non résolu (constante inconnue)`).toMatch(/^ca-app-pub-/);
  });

  it.skipIf(enTest)("aucun bloc n'est partagé entre deux emplacements", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * L'App ID vit dans le manifeste de l'app, les blocs dans le plugin : deux
   * fichiers, donc un oubli possible. Mélanger un App ID de test avec des blocs
   * de production ne casse RIEN de visible — les pubs s'affichent sur un
   * appareil de test — mais aucune impression réelle n'est comptée en
   * production. C'est le mode de panne le plus cher et le plus silencieux.
   */
  it("l'App ID du manifeste appartient au même compte AdMob que les blocs", () => {
    const manifeste = readFileSync(
      "src-tauri/gen/android/app/src/main/AndroidManifest.xml",
      "utf8",
    );
    const appId = manifeste.match(
      /APPLICATION_ID"\s*\n?\s*android:value="([^"]+)"/,
    )?.[1];
    expect(appId, "meta-data APPLICATION_ID absent du manifeste").toBeDefined();
    const editeur = (v: string) => v.match(/^ca-app-pub-(\d+)/)?.[1];
    const editeurBlocs = editeur(ids[0] ?? "");
    expect(
      editeur(appId ?? ""),
      enTest
        ? "blocs de test : l'App ID doit être celui de test Google"
        : "blocs de PRODUCTION avec un App ID d'un autre compte — aucune impression ne serait comptée",
    ).toBe(editeurBlocs);
  });
});
