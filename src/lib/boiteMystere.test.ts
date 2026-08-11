import { describe, it, expect } from "vitest";
import {
  CHANCE_APPARITION_BASE,
  chanceApparition,
  tenterApparition,
  tirerPositionVendeur,
  insererSlideMystere,
  nbBoitesReclamees,
  tirerContenuBoite,
  appliquerReclamation,
  vendeurMysterePeutApparaitre,
  DISTRIB_ETAT_BOITE,
  POIDS_RARETE_BOITE,
} from "./boiteMystere";
import { FACTEUR_ETAT } from "./etat";
import { poolPourTier, getTemplate } from "@/data/objetTemplates";
import { VINYLES_CADEAU_PAR_ANNEE } from "./anniversaire";
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
    expect(tenterApparition(0, () => 0.05)).toBe(true); // 0.05 < 0.20
    expect(tenterApparition(0, () => 0.5)).toBe(false); // 0.5 >= 0.20
    expect(tenterApparition(1, () => 0.12)).toBe(false); // 0.12 >= 0.10
  });
});

describe("tirerPositionVendeur", () => {
  it("couvre uniformément les N+1 positions, bornes incluses", () => {
    // 6 objets → positions 0..6. rng juste sous 1 → dernière position.
    expect(tirerPositionVendeur(6, () => 0)).toBe(0);
    expect(tirerPositionVendeur(6, () => 0.999999)).toBe(6);
    // Milieu de plage : 0.5 * 7 = 3.5 → position 3 (entre deux objets).
    expect(tirerPositionVendeur(6, () => 0.5)).toBe(3);
  });

  it("renvoie 0 quand la session est vide", () => {
    expect(tirerPositionVendeur(0, () => 0.99)).toBe(0);
  });
});

describe("insererSlideMystere", () => {
  it("insère la slide à la position tirée", () => {
    expect(insererSlideMystere(["a", "b", "c"], "M", 0)).toEqual(["M", "a", "b", "c"]);
    expect(insererSlideMystere(["a", "b", "c"], "M", 2)).toEqual(["a", "b", "M", "c"]);
    expect(insererSlideMystere(["a", "b", "c"], "M", 3)).toEqual(["a", "b", "c", "M"]);
  });

  it("clampe quand la liste a rétréci sous la position tirée", () => {
    // Des objets refusés ont raccourci la liste : la slide reste en fin.
    expect(insererSlideMystere(["a"], "M", 3)).toEqual(["a", "M"]);
    expect(insererSlideMystere([], "M", 2)).toEqual(["M"]);
  });

  it("ne mute pas la liste d'origine", () => {
    const liste = ["a", "b"];
    insererSlideMystere(liste, "M", 1);
    expect(liste).toEqual(["a", "b"]);
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

  it("n'inclut jamais un vinyle cadeau exclu (tant qu'il n'a pas été offert)", () => {
    const exclus = new Set<string>(VINYLES_CADEAU_PAR_ANNEE);
    for (let k = 0; k < 500; k++) {
      const o = tirerContenuBoite({ tier: 3 }, Math.random, exclus);
      expect(exclus.has(o.templateId)).toBe(false);
    }
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

describe("vendeurMysterePeutApparaitre", () => {
  const base = { tutorielActif: false, placeRestante: 3, pubDisponible: true };

  it("vrai dans le cas nominal", () => {
    expect(vendeurMysterePeutApparaitre(base)).toBe(true);
  });

  it("faux pendant le tutoriel guidé (pas de distraction pub)", () => {
    expect(vendeurMysterePeutApparaitre({ ...base, tutorielActif: true })).toBe(false);
  });

  it("faux si le stockage est plein (jamais de pub gâchée)", () => {
    expect(vendeurMysterePeutApparaitre({ ...base, placeRestante: 0 })).toBe(false);
  });

  it("faux si aucune régie n'est branchée — sinon carte inouvrable dans le deck", () => {
    expect(vendeurMysterePeutApparaitre({ ...base, pubDisponible: false })).toBe(false);
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
