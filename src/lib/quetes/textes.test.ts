import { describe, expect, it, test } from "vitest";
import { gabaritsChiffres, genererTexte, genererTexteChiffre, nombreVariantesChiffrees } from "./textes";

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

describe("gabarits quotidiens", () => {
  const NOUVELLES = ["beneficeJour", "chiffreJour", "margeJour", "categorieJour", "restauration", "legendaire"];

  test("chaque nouvelle famille a deux variantes", () => {
    for (const cle of NOUVELLES) {
      expect(nombreVariantesChiffrees(cle), cle).toBe(2);
    }
  });

  test("aucune famille du jour ne parle de la semaine", () => {
    // Seules `benefice` et `chiffre` nomment une période côté hebdomadaire
    // (« cette semaine », « avant dimanche ») ; `marge` et `categorie` n'en
    // ont jamais nommé, d'où l'asymétrie assumée des deux boucles.
    for (const cle of ["benefice", "chiffre"]) {
      const texte = gabaritsChiffres(cle).flatMap((g) => g.corps).join(" ");
      expect(texte, cle).toMatch(/semaine|dimanche/i);
    }
    for (const cle of ["beneficeJour", "chiffreJour", "margeJour", "categorieJour"]) {
      const texte = gabaritsChiffres(cle).flatMap((g) => g.corps).join(" ");
      expect(texte, cle).not.toMatch(/semaine|dimanche/i);
    }
  });

  test("la restauration interpole l'état minimum", () => {
    const t = genererTexteChiffre("restauration", { etatMin: "Très bon" }, () => 0);
    expect(t.corps.join(" ")).toContain("Très bon");
    expect(t.corps.join(" ")).not.toContain("{etat}");
    expect(t.gabaritId).toBe("restauration#0");
  });

  test("le légendaire ne porte aucune marque à interpoler", () => {
    const t = genererTexteChiffre("legendaire", {}, () => 0);
    expect(t.corps.join(" ")).not.toMatch(/\{[a-z]+\}/);
    expect(t.gabaritId).toBe("legendaire#0");
  });

  test("aucun titre de gabarit ne porte de marque", () => {
    for (const cle of NOUVELLES) {
      for (const g of gabaritsChiffres(cle)) {
        expect(g.titre, `${cle} : ${g.titre}`).not.toMatch(/\{[a-z]+\}/);
      }
    }
  });
});
