import { describe, it, test, expect } from "vitest";
import { genererLot } from "./periodiques";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { FAMILLE, type FormeQuete } from "./formes";
import { objetsAtteignables } from "./atteignables";
import { EXPEDITEURS } from "@/data/expediteursCourrier";
import type { Courrier, CourrierPayloadMission, CompetenceId } from "@/types/game";
import { emptyBrocanteur } from "@/lib/xp";
import { CATEGORIES } from "@/data/categories";
import { catTreeId } from "@/data/competences";

function rngSeq(vals: number[]): () => number {
  let i = 0;
  return () => vals[i++ % vals.length];
}

/**
 * Générateur pseudo-aléatoire déterministe, pour rejouer une graine.
 *
 * mulberry32 et non un LCG brut : mesuré, un LCG congruentiel seedé par des
 * entiers consécutifs et lu immédiatement rend `floor(r * 5) === 1` pour TOUTES
 * les graines de ces tests. Le premier échange de Fisher-Yates devient alors
 * déterministe, épingle une forme en dernière position — que le mélange ne
 * revisite jamais — et la rend intirable. Les tests de variété passaient à
 * côté de leur objet.
 */
function rngGraine(graine: number): () => number {
  let s = (graine + 0x6d2b79f5) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Forme d'un courrier généré, déduite de son unique objectif. */
function formeDe(c: Courrier): FormeQuete {
  if (c.payload.type !== "mission") throw new Error("pas une mission");
  const o = c.payload.objectifs?.[0];
  switch (o?.type) {
    case "objetsRares": return "objetsRares";
    case "objetLegendaire": return "objetLegendaire";
    case "restauration": return "restauration";
    case "beneficeCumule": return "beneficeCumule";
    case "ventesCumulees": return "chiffreAffaires";
    case "profitVente": return "profitVente";
    case "ventesCategorie": return "ventesCategorie";
    default: return "objet";
  }
}

describe("genererLot", () => {
  it("quotidienne : missions de catégorie quotidienne, 1 cible chacune", () => {
    const state = createMockGameState();
    const lot = genererLot(state, "quotidienne", "2026-06-25", rngSeq([0.1, 0.5, 0.9]));
    expect(lot.length).toBeGreaterThan(0);
    expect(lot.length).toBeLessThanOrEqual(3);
    for (const c of lot) {
      expect(c.payload.type).toBe("mission");
      if (c.payload.type === "mission") {
        if (c.payload.cibles.length === 0) continue; // quête chiffrée : pas de cible
        expect(c.payload.categorie).toBe("quotidienne");
        expect(c.payload.cibles).toHaveLength(1);
      }
      expect(c.id).toContain("2026-06-25");
    }
  });

  it("hebdomadaire : 2 à 3 cibles par commande", () => {
    const state = createMockGameState();
    const lot = genererLot(state, "hebdomadaire", "2026-W26", rngSeq([0.1, 0.5, 0.9, 0.3]));
    for (const c of lot) {
      if (c.payload.type === "mission") {
        if (c.payload.cibles.length === 0) continue; // quête chiffrée : pas de cible
        expect(c.payload.cibles.length).toBeGreaterThanOrEqual(2);
        expect(c.payload.cibles.length).toBeLessThanOrEqual(3);
        expect(c.payload.categorie).toBe("hebdomadaire");
      }
    }
  });

  it("ids uniques dans le lot", () => {
    const state = createMockGameState();
    const lot = genererLot(state, "quotidienne", "2026-06-25", rngSeq([0.2, 0.7, 0.4]));
    const ids = lot.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("composition des lots", () => {
  test("quotidienne : une seule quête d'objet, deux formes tirées distinctes", () => {
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      expect(lot).toHaveLength(3);
      const formes = lot.map(formeDe);
      expect(formes.filter((f) => f === "objet")).toHaveLength(1);
      const tirees = formes.filter((f) => f !== "objet");
      expect(new Set(tirees).size).toBe(2);
    }
  });

  test("quotidienne : au plus UNE forme de vente parmi les tirées", () => {
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      const tirees = lot.map(formeDe).filter((f) => f !== "objet");
      expect(tirees.filter((f) => FAMILLE[f] === "vente").length).toBeLessThanOrEqual(1);
    }
  });

  test("quotidienne : la position de la quête d'objet varie", () => {
    // L'invariant qui interdit le retour du lot scripté : avant ce chantier,
    // les deux quêtes d'objet occupaient TOUJOURS les slots 0 et 1.
    const positions = new Set<number>();
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      positions.add(lot.findIndex((c) => formeDe(c) === "objet"));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  test("quotidienne : la composition varie d'une graine à l'autre", () => {
    const vues = new Set<string>();
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      vues.add(lot.map(formeDe).sort().join("|"));
    }
    expect(vues.size).toBeGreaterThan(3);
  });

  test("quotidienne : sans verrou ouvert, ni légendaire ni restauration", () => {
    // `createMockGameState()` = partie neuve : pas de tier 4, pas de Réparer.
    for (let g = 1; g <= 80; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      const formes = lot.map(formeDe);
      expect(formes).not.toContain("objetLegendaire");
      expect(formes).not.toContain("restauration");
    }
  });

  test("quotidienne : Réparer débloqué fait apparaître la restauration", () => {
    const state = createMockGameState({
      competencesDebloquees: [`${catTreeId(CATEGORIES[0])}.reparer.1`] as CompetenceId[],
    });
    let vue = false;
    for (let g = 1; g <= 80 && !vue; g++) {
      vue = genererLot(state, "quotidienne", `c${g}`, rngGraine(g))
        .map(formeDe)
        .includes("restauration");
    }
    expect(vue).toBe(true);
  });

  test("hebdomadaire : trois formes distinctes, dont au moins une de vente", () => {
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "hebdomadaire", `c${g}`, rngGraine(g));
      expect(lot).toHaveLength(3);
      const formes = lot.map(formeDe);
      expect(new Set(formes).size).toBe(3);
      expect(formes.some((f) => FAMILLE[f] === "vente")).toBe(true);
    }
  });

  test("hebdomadaire : la composition varie d'une graine à l'autre", () => {
    const vues = new Set<string>();
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "hebdomadaire", `c${g}`, rngGraine(g));
      vues.add(lot.map(formeDe).sort().join("|"));
    }
    expect(vues.size).toBeGreaterThan(3);
  });

  test("les identifiants de courrier restent uniques dans un lot", () => {
    const lot = genererLot(createMockGameState(), "hebdomadaire", "cle", rngGraine(7));
    expect(new Set(lot.map((c) => c.id)).size).toBe(lot.length);
  });

  test("la catégorie demandée est toujours accessible au joueur", () => {
    const state = createMockGameState();
    const accessibles = new Set(objetsAtteignables(state).map((t) => t.categorie));
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(state, "hebdomadaire", `c${g}`, rngGraine(g));
      for (const c of lot) {
        if (c.payload.type !== "mission") continue;
        const o = c.payload.objectifs?.[0];
        if (o?.type === "ventesCategorie") expect(accessibles.has(o.categorie)).toBe(true);
      }
    }
  });

  test("ventesCategorie : le commanditaire est choisi dans la catégorie demandée (spec §5)", () => {
    // Régression : `contenuFormeChiffree` tirait la catégorie uniformément
    // parmi TOUTES les catégories atteignables, alors que seules 4 des 7
    // catégories ont un commanditaire dédié dans `EXPEDITEURS` — un lot
    // pouvait donc demander « Bricolage » et faire signer la lettre par le
    // collectionneur d'art. Le tirage doit maintenant préférer l'intersection
    // catégories atteignables ∩ domaines de commanditaires.
    const state = createMockGameState();
    let auMoinsUneVentesCategorie = false;
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(state, "hebdomadaire", `c${g}`, rngGraine(g));
      for (const c of lot) {
        if (c.payload.type !== "mission") continue;
        const o = c.payload.objectifs?.[0];
        if (o?.type !== "ventesCategorie") continue;
        auMoinsUneVentesCategorie = true;
        const exp = EXPEDITEURS[c.payload.expediteurId];
        expect(exp?.domaine).toBe(o.categorie);
      }
    }
    // Filet : si ce garde-fou ne se déclenche jamais, le test ne prouve rien.
    expect(auMoinsUneVentesCategorie).toBe(true);
  });

  test("les quêtes chiffrées portent un gabaritId et un texte sans marque", () => {
    for (let g = 1; g <= 30; g++) {
      const lot = genererLot(createMockGameState(), "hebdomadaire", `c${g}`, rngGraine(g));
      for (const c of lot) {
        if (c.payload.type !== "mission") continue;
        if (c.payload.cibles.length > 0) continue; // quête d'objet : autre voie
        expect(c.payload.gabaritId).toBeDefined();
        expect([c.payload.titre, ...c.payload.corps].join(" ")).not.toMatch(/\{[a-z]+\}/);
      }
    }
  });
});

describe("jetons figés à la naissance", () => {
  it("une quotidienne naît avec 1 jeton", () => {
    const lot = genererLot(createMockGameState({ brocanteur: { ...emptyBrocanteur(), niveau: 5 } }), "quotidienne", "2026-08-19");
    for (const c of lot) {
      const p = c.payload as CourrierPayloadMission;
      expect(p.recompense.jetons).toBe(1);
    }
  });

  it("une hebdomadaire naît avec 3 jetons", () => {
    const lot = genererLot(createMockGameState({ brocanteur: { ...emptyBrocanteur(), niveau: 5 } }), "hebdomadaire", "2026-W34");
    for (const c of lot) {
      const p = c.payload as CourrierPayloadMission;
      expect(p.recompense.jetons).toBe(3);
    }
  });
});
