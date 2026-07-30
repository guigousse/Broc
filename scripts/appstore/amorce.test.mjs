import { describe, expect, it } from "vitest";
import { scriptAmorce, scriptGraine } from "./amorce.mjs";
import { mulberry32 } from "./mulberry32.mjs";

/** Exécute la source de scriptGraine() dans une sandbox isolée du Math global. */
function sequenceInjectee(graine, n) {
  const contexte = { Math: { imul: Math.imul } };
  new Function("Math", `${scriptGraine(graine)}\nreturn Math;`)(contexte.Math);
  const rng = contexte.Math.random;
  return Array.from({ length: n }, () => rng());
}

const SAVE = JSON.stringify({ version: 17, budget: 8420 });

describe("amorçage du localStorage", () => {
  it("écrit la save dans le slot 1 et sa copie de secours", () => {
    const js = scriptAmorce(SAVE, "fr");
    expect(js).toContain("projet-broc:slot:1:v1");
    expect(js).toContain("projet-broc:slot:1:v1:backup");
    expect(js).toContain("projet-broc:slots:v1");
  });

  it("fixe la langue demandée", () => {
    expect(scriptAmorce(SAVE, "el")).toContain('\\"locale\\":\\"el\\"');
    expect(scriptAmorce(SAVE, "es")).toContain('\\"locale\\":\\"es\\"');
  });

  it("désigne le slot 1 comme actif", () => {
    expect(scriptAmorce(SAVE, "fr")).toContain('\\"actif\\":1');
  });

  it("produit du JavaScript syntaxiquement valide", () => {
    expect(() => new Function(scriptAmorce(SAVE, "fr"))).not.toThrow();
  });

  it("échappe une save contenant des guillemets sans casser le script", () => {
    const piege = JSON.stringify({ nom: 'un "beau" vase', chemin: "a\\b" });
    expect(() => new Function(scriptAmorce(piege, "fr"))).not.toThrow();
  });

  it("refuse une langue hors des quatre", () => {
    expect(() => scriptAmorce(SAVE, "de")).toThrow(/de/);
  });

  it("stocke les slots et langue comme des chaînes JSON parsables", () => {
    const js = scriptAmorce(SAVE, "el");
    const storage = {};
    // Faux localStorage qui applique String() comme le vrai.
    const fakeStorage = {
      setItem: (cle, val) => {
        storage[cle] = String(val);
      },
    };
    // Exécute le script avec le faux localStorage.
    new Function("localStorage", js)(fakeStorage);
    // Vérifie que chaque clé contient du JSON parsable.
    expect(() => JSON.parse(storage["projet-broc:slots:v1"])).not.toThrow();
    expect(() => JSON.parse(storage["projet-broc:langue:v1"])).not.toThrow();
    // Vérifie le contenu réel.
    const slots = JSON.parse(storage["projet-broc:slots:v1"]);
    expect(slots.actif).toBe(1);
    expect(slots.slots[1].nom).toBe("Démo App Store");
    const langue = JSON.parse(storage["projet-broc:langue:v1"]);
    expect(langue.locale).toBe("el");
  });
});

describe("graine du générateur pseudo-aléatoire", () => {
  it("produit du JavaScript syntaxiquement valide", () => {
    expect(() => new Function(scriptGraine(42))).not.toThrow();
  });

  it("refuse une graine non finie", () => {
    expect(() => scriptGraine(NaN)).toThrow(/graine invalide/);
    expect(() => scriptGraine(Infinity)).toThrow(/graine invalide/);
  });

  it("remplace Math.random par une fonction", () => {
    // Objet local isolé : ne touche jamais le Math global du process de test.
    const contexte = { Math: { imul: Math.imul } };
    new Function("Math", `${scriptGraine(1)}\nreturn Math;`)(contexte.Math);
    expect(typeof contexte.Math.random).toBe("function");
  });

  it("produit toujours la même séquence pour une même graine", () => {
    expect(sequenceInjectee(12345, 4)).toEqual(sequenceInjectee(12345, 4));
  });

  it("produit une séquence différente pour deux graines différentes", () => {
    expect(sequenceInjectee(1, 4)).not.toEqual(sequenceInjectee(2, 4));
  });

  it("produit des valeurs dans [0, 1)", () => {
    for (const v of sequenceInjectee(7, 50)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  // La source injectée dans le navigateur (scriptGraine) et l'implémentation
  // canonique côté Node (mulberry32.mjs, utilisée par gen-save-demo.ts) sont
  // deux copies du même algorithme — l'injection Playwright ne peut pas
  // importer un module. Ce test verrouille leur équivalence : si l'une des
  // deux dérive sans l'autre, la garantie « même graine, même contenu » se
  // casserait en silence, sans qu'aucun autre test ne le voie.
  it("produit exactement la même séquence que l'implémentation canonique mulberry32", () => {
    for (const graine of [0, 1, 42, 424242, 987654321]) {
      const attendu = Array.from({ length: 10 }, mulberry32(graine));
      expect(sequenceInjectee(graine, 10)).toEqual(attendu);
    }
  });
});
