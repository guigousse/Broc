import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NegoPersona, NegociationState } from "@/types/game";
import { HUMEUR_RELANCE, ouvrirNegociation, proposerOffre, relancerNegociation } from "./negociation";
import { texteNego } from "@/lib/i18n/contenu";

function persona(patch: Partial<NegoPersona> = {}): NegoPersona {
  return {
    archetype: "test",
    margePct: 0.2,
    elanPct: 0.3,
    patience: 5,
    tolerancePct: 0.2,
    sangFroid: 1, // 1 = aucune fin probabiliste (chanceFin × 0.5)
    ...patch,
  };
}

// Fige Math.random() à une valeur connue pour les chemins probabilistes.
function freezeRandom(value: number) {
  return vi.spyOn(Math, "random").mockReturnValue(value);
}

beforeEach(() => {
  // Par défaut : random = 1 → la condition `Math.random() < chanceFin` est
  // toujours fausse, donc la branche "fin probabiliste" ne se déclenche pas.
  freezeRandom(0.99);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ouvrirNegociation", () => {
  it("crée un état initial valide en mode achat", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    expect(n.mode).toBe("achat");
    expect(n.tour).toBe(0);
    expect(n.humeur).toBe(0);
    expect(n.prixAdverseCourant).toBe(100);
    expect(n.cibleSecrete).toBe(60);
    expect(n.derniereOffreJoueur).toBeNull();
    expect(n.statut).toBe("en_cours");
    expect(n.message.cle).toBe("ouvertureAchat");
    expect(texteNego(n.message, "fr")).toMatch(/curseur/);
  });

  it("crée un état initial valide en mode vente", () => {
    const n = ouvrirNegociation("vente", 50, 90);
    expect(n.mode).toBe("vente");
    expect(n.message.cle).toBe("ouvertureVente");
    expect(texteNego(n.message, "fr")).toMatch(/offre/i);
  });
});

describe("proposerOffre — statut non en_cours", () => {
  it("retourne l'état inchangé si statut conclu", () => {
    const n: NegociationState = {
      ...ouvrirNegociation("achat", 100, 60),
      statut: "conclu",
    };
    expect(proposerOffre(n, persona(), 80)).toBe(n);
  });

  it("retourne l'état inchangé si statut fache", () => {
    const n: NegociationState = {
      ...ouvrirNegociation("achat", 100, 60),
      statut: "fache",
    };
    expect(proposerOffre(n, persona(), 80)).toBe(n);
  });

  it("retourne l'état inchangé si statut refus_poli", () => {
    const n: NegociationState = {
      ...ouvrirNegociation("vente", 50, 90),
      statut: "refus_poli",
    };
    expect(proposerOffre(n, persona(), 70)).toBe(n);
  });
});

describe("proposerOffre — accord direct (mode achat)", () => {
  it("conclu si offre >= prixAdverseCourant", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    const res = proposerOffre(n, persona(), 100);
    expect(res.statut).toBe("conclu");
    expect(res.derniereOffreJoueur).toBe(100);
    expect(res.message.cle).toBe("accord");
    expect(res.message.params).toEqual({ prix: 100 });
    expect(texteNego(res.message, "fr")).toMatch(/\b100 €/);
  });

  it("conclu si offre dépasse strictement le prix adverse", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    const res = proposerOffre(n, persona(), 120);
    expect(res.statut).toBe("conclu");
  });

  it("apaise l'humeur (min(humeur, 0.3))", () => {
    const n: NegociationState = { ...ouvrirNegociation("achat", 100, 60), humeur: 0.9 };
    const res = proposerOffre(n, persona(), 100);
    expect(res.humeur).toBeLessThanOrEqual(0.3);
  });
});

describe("proposerOffre — accord direct (mode vente)", () => {
  it("conclu si offre <= prixAdverseCourant", () => {
    const n = ouvrirNegociation("vente", 50, 90);
    const res = proposerOffre(n, persona(), 50);
    expect(res.statut).toBe("conclu");
  });
});

describe("proposerOffre — offre insultante (colère franche)", () => {
  it("achat : offre très basse → fache", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    // tolerancePct 0.2 → seuil insulte = 80. Offre 70 < 80 = insulte.
    const res = proposerOffre(n, persona({ tolerancePct: 0.2 }), 70);
    expect(res.statut).toBe("fache");
    expect(res.humeur).toBe(1);
  });

  it("vente : offre très haute → fache", () => {
    const n = ouvrirNegociation("vente", 50, 90);
    // tolerance 0.2 → seuil 60. Offre 70 > 60 = insulte.
    const res = proposerOffre(n, persona({ tolerancePct: 0.2 }), 70);
    expect(res.statut).toBe("fache");
  });
});

describe("proposerOffre — refus poli par patience épuisée", () => {
  it("au dernier tour, refus poli si pas d'accord et pas d'insulte", () => {
    let n = ouvrirNegociation("achat", 100, 60);
    n = { ...n, tour: 4 }; // tour suivant = 5 = patience
    const res = proposerOffre(n, persona({ patience: 5 }), 85);
    expect(res.statut).toBe("refus_poli");
    expect(res.tour).toBe(5);
    expect(res.humeur).toBeGreaterThanOrEqual(0.8);
  });
});

describe("proposerOffre — contre-offre", () => {
  it("avance le prix adverse vers la cibleSecrete (achat)", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    // elan faible pour éviter l'alignement immédiat avec l'offre 85
    const res = proposerOffre(n, persona({ elanPct: 0.2 }), 85);
    // Mode achat : prix descend, donc nouveau prix < 100
    expect(res.prixAdverseCourant).toBeLessThan(100);
    expect(res.prixAdverseCourant).toBeGreaterThanOrEqual(60);
    expect(res.statut).toBe("en_cours");
  });

  it("avance le prix adverse vers la cibleSecrete (vente)", () => {
    const n = ouvrirNegociation("vente", 50, 90);
    // elan 0.2 → nouveau prix = 58. Offre 60 reste au-dessus (pas d'alignement,
    // 58 < 60), pile au seuil d'insulte (50 × 1.2 = 60, comparaison stricte).
    const res = proposerOffre(n, persona({ elanPct: 0.2 }), 60);
    expect(res.prixAdverseCourant).toBeGreaterThan(50);
    expect(res.prixAdverseCourant).toBeLessThanOrEqual(90);
    expect(res.statut).toBe("en_cours");
  });

  it("ne dépasse jamais la cibleSecrete (achat : floor)", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    // elan=1 = concession totale en 1 coup. Le prix doit être >= cibleSecrete.
    const res = proposerOffre(n, persona({ elanPct: 1 }), 85);
    expect(res.prixAdverseCourant).toBeGreaterThanOrEqual(60);
  });

  it("incrémente le tour", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    const res = proposerOffre(n, persona(), 85);
    expect(res.tour).toBe(1);
  });
});

describe("proposerOffre — accord par alignement", () => {
  it("achat : si l'adverse descend en-dessous de l'offre, accord à l'offre", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    // elan=1 → adverse va à cibleSecrete=60 ; offre 85 >= 60 ⇒ alignement
    const res = proposerOffre(n, persona({ elanPct: 1 }), 85);
    expect(res.statut).toBe("conclu");
    expect(res.prixAdverseCourant).toBe(85);
  });

  it("vente : si l'adverse monte au-dessus de l'offre, accord à l'offre", () => {
    const n = ouvrirNegociation("vente", 50, 90);
    // elan=1 → adverse va à cibleSecrete=90 ; offre 55 <= 90 ⇒ alignement.
    // Offre 55 reste sous le seuil d'insulte (50 × 1.2 = 60).
    const res = proposerOffre(n, persona({ elanPct: 1 }), 55);
    expect(res.statut).toBe("conclu");
    expect(res.prixAdverseCourant).toBe(55);
  });
});

describe("proposerOffre — fin probabiliste (humeur élevée)", () => {
  it("avec random=0 et humeur élevée, fin probabiliste se déclenche", () => {
    freezeRandom(0);
    const n = ouvrirNegociation("achat", 100, 60);
    // Offre proche du seuil d'insulte → humeur monte
    const res = proposerOffre(
      n,
      persona({ tolerancePct: 0.3, sangFroid: 0 }),
      75,
    );
    // Avec sangFroid=0, chanceFin = humeur^1.5. random=0 < chanceFin (sauf humeur=0).
    expect(["fache", "refus_poli"]).toContain(res.statut);
  });

  it("avec sangFroid=1, la fin probabiliste est divisée par 2 ⇒ moins fréquente", () => {
    freezeRandom(0.9);
    const n = ouvrirNegociation("achat", 100, 60);
    const res = proposerOffre(
      n,
      persona({ tolerancePct: 0.3, sangFroid: 1 }),
      82,
    );
    // Persona très calme + random élevé → contre-offre attendue, pas refus
    expect(res.statut).toBe("en_cours");
  });
});

describe("relancerNegociation (La Tchatche)", () => {
  const base: NegociationState = {
    mode: "achat",
    tour: 3,
    humeur: 1,
    prixAdverseCourant: 80,
    cibleSecrete: 60,
    derniereOffreJoueur: 50,
    statut: "fache",
    message: { cle: "fache", variante: 0 },
  };
  it("rouvre une négo fâchée avec humeur neutre", () => {
    const r = relancerNegociation(base);
    expect(r.statut).toBe("en_cours");
    expect(r.humeur).toBe(HUMEUR_RELANCE);
    expect(r.prixAdverseCourant).toBe(80); // le prix courant ne bouge pas
    expect(r.message.cle).toBe("relance");
    expect(texteNego(r.message, "fr")).toContain("écoute");
  });
  it("rouvre aussi un refus poli", () => {
    expect(relancerNegociation({ ...base, statut: "refus_poli" }).statut).toBe("en_cours");
  });
  it("ne touche pas une négo en cours ou conclue", () => {
    expect(relancerNegociation({ ...base, statut: "en_cours" })).toEqual({ ...base, statut: "en_cours" });
    expect(relancerNegociation({ ...base, statut: "conclu" })).toEqual({ ...base, statut: "conclu" });
  });
});

describe("proposerOffre — invariants", () => {
  it("humeur reste dans [0, 1]", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    for (const offre of [60, 70, 80, 85, 90, 95, 100, 200]) {
      const res = proposerOffre(n, persona(), offre);
      expect(res.humeur).toBeGreaterThanOrEqual(0);
      expect(res.humeur).toBeLessThanOrEqual(1);
    }
  });

  it("derniereOffreJoueur reflète toujours l'offre proposée", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    const res = proposerOffre(n, persona(), 85);
    expect(res.derniereOffreJoueur).toBe(85);
  });

  it("ne mute pas l'état d'entrée", () => {
    const n = ouvrirNegociation("achat", 100, 60);
    const snapshot = JSON.stringify(n);
    proposerOffre(n, persona(), 85);
    expect(JSON.stringify(n)).toBe(snapshot);
  });
});
