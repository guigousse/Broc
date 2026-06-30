import { describe, it, expect } from "vitest";
import {
  CHANCE_APPARITION_BASE,
  chanceApparition,
  tenterApparition,
  nbBoitesReclamees,
  tirerContenuBoite,
  appliquerReclamation,
  DISTRIB_ETAT_BOITE,
  POIDS_RARETE_BOITE,
} from "./boiteMystere";
import { FACTEUR_ETAT } from "./etat";
import { poolPourTier, getTemplate } from "@/data/objetTemplates";
import type { GameState, Objet } from "@/types/game";

describe("chanceApparition", () => {
  it("vaut la base à n=0 puis divise par 2", () => {
    expect(chanceApparition(0)).toBeCloseTo(CHANCE_APPARITION_BASE);
    expect(chanceApparition(1)).toBeCloseTo(CHANCE_APPARITION_BASE / 2);
    expect(chanceApparition(2)).toBeCloseTo(CHANCE_APPARITION_BASE / 4);
  });
});

describe("tenterApparition", () => {
  it("réussit quand le tirage est sous le seuil", () => {
    expect(tenterApparition(0, () => 0.05)).toBe(true); // 0.05 < 0.10
    expect(tenterApparition(0, () => 0.5)).toBe(false); // 0.5 >= 0.10
    expect(tenterApparition(1, () => 0.06)).toBe(false); // 0.06 >= 0.05
  });
});

describe("nbBoitesReclamees", () => {
  it("renvoie le compteur du jour courant, sinon 0", () => {
    expect(nbBoitesReclamees({ boiteMystere: undefined }, 3)).toBe(0);
    expect(
      nbBoitesReclamees({ boiteMystere: { jour: 3, reclamees: 2 } }, 3),
    ).toBe(2);
    expect(
      nbBoitesReclamees({ boiteMystere: { jour: 2, reclamees: 5 } }, 3),
    ).toBe(0);
  });
});

describe("tirerContenuBoite", () => {
  it("produit un objet valide du pool, prix cohérent avec l'état", () => {
    const poolIds = new Set(poolPourTier(1).map((t) => t.templateId));
    const o = tirerContenuBoite({ tier: 1 }, () => 0);
    expect(poolIds.has(o.templateId)).toBe(true);
    expect(["commun", "rare", "legendaire"]).toContain(o.rarete);
    expect(["Mauvais", "Bon", "Très bon", "Pristin état"]).toContain(o.etat);
    expect(o.prixReferenceReel).toBeGreaterThanOrEqual(1);
    expect(typeof o.id).toBe("string");
    const tmpl = getTemplate(o.templateId)!;
    expect(o.prixReferenceReel).toBe(
      Math.max(1, Math.round(tmpl.prixRefBase * FACTEUR_ETAT[o.etat])),
    );
  });

  it("peut sortir du Pristin (introuvable en chinage normal)", () => {
    let pristinVu = false;
    let i = 0;
    // rng séquentiel déterministe couvrant toute la distribution d'état.
    const rng = () => ((i++ % 100) + 0.5) / 100;
    for (let k = 0; k < 400 && !pristinVu; k++) {
      if (tirerContenuBoite({ tier: 3 }, rng).etat === "Pristin état") {
        pristinVu = true;
      }
    }
    expect(pristinVu).toBe(true);
  });

  it("respecte grossièrement la table de rareté sur un gros échantillon", () => {
    const counts = { commun: 0, rare: 0, legendaire: 0 };
    for (let k = 0; k < 5000; k++) {
      counts[tirerContenuBoite({ tier: 3 }).rarete] += 1;
    }
    // Communs largement majoritaires, légendaires les plus rares.
    expect(counts.commun).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.legendaire);
    expect(counts.legendaire).toBeGreaterThan(0);
  });
});

describe("appliquerReclamation", () => {
  const base = {
    jourActuel: 3,
    inventaireJoueur: [] as Objet[],
    boiteMystere: undefined as GameState["boiteMystere"],
  };
  const objet = { id: "x", templateId: "t", nom: "N" } as unknown as Objet;

  it("démarre le compteur du jour et ajoute l'objet", () => {
    const r = appliquerReclamation(base, objet);
    expect(r.boiteMystere).toEqual({ jour: 3, reclamees: 1 });
    expect(r.inventaireJoueur).toHaveLength(1);
  });

  it("incrémente si déjà réclamé le même jour", () => {
    const r = appliquerReclamation(
      { ...base, boiteMystere: { jour: 3, reclamees: 1 } },
      objet,
    );
    expect(r.boiteMystere).toEqual({ jour: 3, reclamees: 2 });
  });

  it("réinitialise à 1 si le dernier jour diffère", () => {
    const r = appliquerReclamation(
      { ...base, boiteMystere: { jour: 2, reclamees: 5 } },
      objet,
    );
    expect(r.boiteMystere).toEqual({ jour: 3, reclamees: 1 });
  });
});

describe("constantes de table", () => {
  it("la table d'état somme à 100", () => {
    expect(DISTRIB_ETAT_BOITE.reduce((s, e) => s + e.poids, 0)).toBe(100);
  });
  it("la table de rareté correspond au spec", () => {
    expect(POIDS_RARETE_BOITE).toEqual({ commun: 70, rare: 26, legendaire: 4 });
  });
});
