import { describe, expect, it } from "vitest";
import { brocanteTier4Debloquee, formeEligible } from "./eligibilite";
import { createMockGameState, createMockSlot } from "@/lib/__test-fixtures__/gameState";
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import { ID_GRANDE_BRADERIE, prochaineBraderie } from "@/lib/evenements";
import { CATEGORIES } from "@/data/categories";
import { catTreeId } from "@/data/competences";
import { chapitreParOrdre } from "@/data/quetesPrincipales";
import type { CategorieObjet, CompetenceId, CollectionSlot } from "@/types/game";

describe("brocanteTier4Debloquee", () => {
  it("est faux sur une partie neuve", () => {
    expect(brocanteTier4Debloquee(createMockGameState())).toBe(false);
  });

  it("la Grande Braderie ouverte ne débloque PAS le tier 4", () => {
    // La braderie s'ouvre sur `estJourBraderie(jourActuel)` : sur une partie
    // neuve elle est FERMÉE, et un test posé là n'exercerait pas l'exclusion
    // qu'il prétend couvrir. On se cale donc sur son jour.
    const state = createMockGameState({ jourActuel: prochaineBraderie(1) });
    const tier4 = calculerBrocantesDebloqueesParTier(state).get(4) ?? new Set<string>();
    // Le test n'a de sens que si la braderie est ouverte ce jour-là ET seule.
    expect([...tier4]).toEqual([ID_GRANDE_BRADERIE]);
    expect(brocanteTier4Debloquee(state)).toBe(false);
  });
});

describe("formeEligible", () => {
  it("une forme sans verrou est toujours éligible", () => {
    const state = createMockGameState();
    for (const f of ["objet", "objetsRares", "beneficeCumule", "chiffreAffaires", "profitVente", "ventesCategorie"] as const) {
      expect(formeEligible(f, state)).toBe(true);
    }
  });

  it("la restauration attend la première compétence Réparer", () => {
    expect(formeEligible("restauration", createMockGameState())).toBe(false);
    const state = createMockGameState({
      competencesDebloquees: [`${catTreeId(CATEGORIES[0])}.reparer.1`] as CompetenceId[],
    });
    expect(formeEligible("restauration", state)).toBe(true);
  });

  it("la pièce légendaire attend une brocante tier 4", () => {
    expect(formeEligible("objetLegendaire", createMockGameState())).toBe(false);
  });

  it("quand une brocante de tier 4 (hors braderie) s'ouvre, la pièce légendaire est éligible", () => {
    // Débloquer le tier 4 : trois chapitres + seuils de valeur.
    // Les chapitres se livrent dans les missions ; leur condition d'accès
    // se lit dans deblocage.ts. On les déclare livrés directement ici.
    const ch4 = chapitreParOrdre(4)!;
    const ch8 = chapitreParOrdre(8)!;
    const ch13 = chapitreParOrdre(13)!;

    // Seuils de valeur par catégorie : Maison ≥ 600, Musique ≥ 500,
    // Mode ≥ 400, Objets d'art ≥ 350, Bricolage ≥ 60, total ≥ 5000.
    // On utilise createMockSlot pour construire des slots avec donations.
    const slotMaison = createMockSlot({
      categorie: "Maison",
      donation: { etat: "Pristin état", valeur: 1500 },
    });
    const slotMusique = createMockSlot({
      categorie: "Musique",
      donation: { etat: "Pristin état", valeur: 1300 },
    });
    const slotMode = createMockSlot({
      categorie: "Mode",
      donation: { etat: "Pristin état", valeur: 1000 },
    });
    const slotArt = createMockSlot({
      categorie: "Objets d'art",
      donation: { etat: "Pristin état", valeur: 800 },
    });
    const slotBrico = createMockSlot({
      categorie: "Bricolage",
      donation: { etat: "Pristin état", valeur: 500 },
    });

    // Construire la collection avec les donations. Pour chaque catégorie,
    // assigner le slot.
    const collection: Record<CategorieObjet, CollectionSlot[]> = {
      Maison: [slotMaison],
      Musique: [slotMusique],
      Mode: [slotMode],
      "Objets d'art": [slotArt],
      Bricolage: [slotBrico],
      "Jeux & Loisirs": [],
      "Livres & Papeterie": [],
    };

    const state = createMockGameState({
      missions: [
        { courrierId: ch4.id, statut: "livree" },
        { courrierId: ch8.id, statut: "livree" },
        { courrierId: ch13.id, statut: "livree" },
      ],
      collection,
    });

    // Vérifier que le Salon des Antiquaires est bien dans le tier 4 débloqueé.
    const tier4 = calculerBrocantesDebloqueesParTier(state).get(4) ?? new Set<string>();
    expect([...tier4]).toContain("salon-antiquaires-drouot");

    // Vérifier que la pièce légendaire devient éligible.
    expect(brocanteTier4Debloquee(state)).toBe(true);
    expect(formeEligible("objetLegendaire", state)).toBe(true);
  });
});
