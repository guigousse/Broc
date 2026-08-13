import { describe, expect, it, test } from "vitest";
import { genererTexte, genererTexteChiffre, nombreVariantesChiffrees } from "./textes";

describe("genererTexte", () => {
  it("insère le nom de l'objet et renvoie titre + corps + gabaritId", () => {
    const t = genererTexte("mode", ["Veste en jean délavée"], undefined, () => 0);
    expect(t.titre.length).toBeGreaterThan(0);
    expect(t.corps.join(" ")).toContain("Veste en jean délavée");
    expect(t.gabaritId).toBe("mode#0");
  });

  it("gère un commanditaire inconnu via le gabarit générique", () => {
    const t = genererTexte("inconnu", ["Lampe"], undefined, () => 0);
    expect(t.corps.join(" ")).toContain("Lampe");
    expect(t.gabaritId).toBe("generique#0");
  });

  it("trace la variante tirée par le RNG dans le gabaritId", () => {
    // rng ≈ 0.99 → dernière variante de « jeux-video » (2 variantes → index 1).
    const t = genererTexte("jeux-video", ["Manette"], "Bon", () => 0.99);
    expect(t.gabaritId).toBe("jeux-video#1");
  });
});

describe("genererTexteChiffre", () => {
  test("interpole le montant et renvoie un gabaritId de la bonne famille", () => {
    const t = genererTexteChiffre("benefice", { montant: 850 }, () => 0);
    expect(t.gabaritId.startsWith("benefice#")).toBe(true);
    expect(t.corps.join(" ")).toContain("850");
    expect(t.corps.join(" ")).not.toContain("{montant}");
  });

  test("interpole nombre et catégorie", () => {
    const t = genererTexteChiffre("categorie", { nombre: 5, categorie: "Mode" }, () => 0);
    const tout = [t.titre, ...t.corps].join(" ");
    expect(tout).toContain("5");
    expect(tout).toContain("Mode");
    expect(tout).not.toContain("{nombre}");
    expect(tout).not.toContain("{categorie}");
  });

  test("aucune marque non remplacée, quelle que soit la famille, pour chaque variante", () => {
    for (const cle of ["rares", "benefice", "chiffre", "marge", "categorie"]) {
      const n = nombreVariantesChiffrees(cle);
      for (let i = 0; i < n; i++) {
        // Vise précisément la variante i : rng() * n tombe au milieu du seau i.
        const rng = () => (i + 0.5) / n;
        const t = genererTexteChiffre(
          cle,
          { nombre: 3, montant: 500, categorie: "Musique" },
          rng,
        );
        expect(t.gabaritId).toBe(`${cle}#${i}`);
        const tout = [t.titre, ...t.corps].join(" ");
        expect(tout).not.toMatch(/\{[a-z]+\}/);
      }
    }
  });

  test("un rng renvoyant une valeur hors intervalle [0, 1) retombe sur la variante 0", () => {
    // Un rng bien élevé ne renvoie jamais 1, mais rien n'empêche un appelant
    // de fournir une implémentation qui le fait (ou plus) : l'index calculé
    // sort alors du tableau et le repli `?? gabarits[0]` doit s'activer.
    const t = genererTexteChiffre("benefice", { montant: 100 }, () => 1);
    expect(t.gabaritId).toBe("benefice#0");
  });
});
