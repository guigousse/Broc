import { describe, expect, it } from "vitest";
import { libelleObjectif, objectifEnEuros, progressionAffichee } from "./objectifs";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { ICONE_FORME } from "@/lib/quetes/formes";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { CourrierPayloadMission, ObjectifMission } from "@/types/game";

const d = DICTIONNAIRES.fr;
const tr = (g: string, p?: Record<string, string | number>) =>
  Object.entries(p ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), g);

describe("objectifEnEuros", () => {
  it("les quatre types monétaires sont vrais", () => {
    for (const t of ["ventesCumulees", "profitVente", "valeurCollection", "beneficeCumule"] as const) {
      expect(objectifEnEuros(t)).toBe(true);
    }
  });
  it("les types qui comptent autre chose sont faux", () => {
    for (const t of ["objet", "objetsRares", "objetLegendaire", "ventesCategorie", "niveau", "restauration"] as const) {
      expect(objectifEnEuros(t)).toBe(false);
    }
  });
});

describe("libelleObjectif", () => {
  it("interpole la catégorie traduite", () => {
    const o: ObjectifMission = { type: "ventesCategorie", categorie: "Mode", nombre: 5 };
    const s = libelleObjectif(o, d, tr);
    expect(s).toContain("Mode");
    expect(s).not.toMatch(/\{[a-z]+\}/);
  });
  it("aucun type ne rend une accolade non remplacée", () => {
    const tous: ObjectifMission[] = [
      { type: "objet", templateId: "ma.x" },
      { type: "ventesCumulees", montant: 300 },
      { type: "profitVente", montant: 60 },
      { type: "restauration", etatMin: "Bon" },
      { type: "valeurCollection", montant: 1500 },
      { type: "niveau", niveau: 12 },
      { type: "objetsRares", nombre: 2 },
      { type: "objetLegendaire", nombre: 1 },
      { type: "beneficeCumule", montant: 850 },
      { type: "ventesCategorie", categorie: "Musique", nombre: 4 },
    ];
    for (const o of tous) expect(libelleObjectif(o, d, tr)).not.toMatch(/\{[a-z]+\}/);
  });
});

describe("progressionAffichee", () => {
  const courrier = { id: "c1", jourRecu: 1 };
  const state = createMockGameState({});

  const payloadCibles: CourrierPayloadMission = {
    type: "mission",
    categorie: "quotidienne",
    expediteurId: "mode",
    titre: "Pièce vintage",
    corps: [],
    cibles: [{ templateId: "ma.lampe_petrole_ancienne" }],
    recompense: { argent: 10 },
  };

  const payloadChiffre: CourrierPayloadMission = {
    type: "mission",
    categorie: "hebdomadaire",
    expediteurId: "mode",
    titre: "Le nerf de la guerre",
    corps: [],
    cibles: [],
    objectifs: [{ type: "beneficeCumule", montant: 850 }],
    recompense: { argent: 210 },
  };

  it("mission à cibles pures : compteur agrégé remplies/total, pas de forme, pas de €", () => {
    const res = progressionAffichee(payloadCibles, courrier, state, undefined, false, false, false);
    expect(res.compteur).toBe("0/1");
    expect(res.pct).toBe(0);
    expect(res.objectifChiffre).toBeNull();
    expect(res.IconeForme).toBeNull();
  });

  it("objectif chiffré unique : compteur fin-grain actuel / cible avec suffixe €", () => {
    const res = progressionAffichee(payloadChiffre, courrier, state, undefined, false, false, false);
    expect(res.compteur).toBe("0 / 850 €");
    expect(res.pct).toBe(0);
    expect(res.objectifChiffre).toEqual({ type: "beneficeCumule", montant: 850 });
    expect(res.premierObjectifNonObjet).toEqual({ type: "beneficeCumule", montant: 850 });
    // Une forme chiffrée résout TOUJOURS une icône Lucide (voir formeDepuisObjectif).
    expect(res.IconeForme).toBeTruthy(); // cf. le test de résolution : `undefined` passe `not.toBeNull`
  });

  it("chaque forme chiffrée résout une VRAIE icône Lucide (ICONE_FORME ↔ table du carnet)", () => {
    // `ICONE_FORME` nomme ses icônes par chaîne ; la table `ICONES_LUCIDE` de
    // ce module doit en importer une par nom. Ajouter un nom sans l'importer
    // ne casse NI le type NI le rendu : `ICONES_LUCIDE[nom]` vaut undefined et
    // la carte affiche un cadre de scotch sur rien. Ce test est le seul filet.
    const objectifDeForme: Record<string, ObjectifMission> = {
      objetsRares: { type: "objetsRares", nombre: 2 },
      objetLegendaire: { type: "objetLegendaire", nombre: 1 },
      restauration: { type: "restauration", etatMin: "Bon" },
      beneficeCumule: { type: "beneficeCumule", montant: 850 },
      chiffreAffaires: { type: "ventesCumulees", montant: 900 },
      profitVente: { type: "profitVente", montant: 120 },
      ventesCategorie: { type: "ventesCategorie", categorie: "Musique", nombre: 4 },
    };
    for (const [forme, nom] of Object.entries(ICONE_FORME)) {
      if (nom === null) continue;
      const objectif = objectifDeForme[forme];
      expect(objectif, `forme "${forme}" absente du fixture de ce test`).toBeTruthy();
      const res = progressionAffichee(
        { ...payloadChiffre, objectifs: [objectif] }, courrier, state, undefined, false, false, false,
      );
      // ⚠ `toBeTruthy`, PAS `not.toBeNull` : une clé absente de `ICONES_LUCIDE`
      // rend `undefined`, que `not.toBeNull()` laisse passer — ce test était
      // creux avant cette correction (prouvé : retirer `Receipt` de la table
      // le laissait vert).
      expect(res.IconeForme, `icône "${nom}" non résolue pour la forme "${forme}"`).toBeTruthy();
    }
  });

  it("accompli force l'affichage plein même sur un state à progression nulle (garde-fou cérémonie)", () => {
    // Le state passé ici est délibérément à zéro (aucune vente en historique) :
    // c'est exactement le state post-livraison réel pendant la cérémonie. Sans
    // le garde-fou `accompli`, pct et compteur retomberaient à 0 pile au payoff.
    const reso = { courrierId: "c1", statut: "livree" as const, jourResolution: 2 };
    const res = progressionAffichee(payloadChiffre, courrier, state, reso, true, false, false);
    expect(res.pct).toBe(100);
    expect(res.compteur).toBe("850 / 850 €");
    expect(res.iconeAccompli).toBe(true);
    expect(res.bandeauPret).toBe(true);
    expect(res.paveVerrouille).toBe(true);
  });

  it("bandeauPret et paveVerrouille : dérivés de livrable/accompli/livrerVerrouille, rien d'autre", () => {
    expect(progressionAffichee(payloadCibles, courrier, state, undefined, false, false, false)).toMatchObject({
      bandeauPret: false,
      paveVerrouille: false,
    });
    expect(progressionAffichee(payloadCibles, courrier, state, undefined, false, true, false)).toMatchObject({
      bandeauPret: true,
      paveVerrouille: false,
    });
    // Verrouillé pour une AUTRE cérémonie en cours, même non livrable ici.
    expect(progressionAffichee(payloadCibles, courrier, state, undefined, false, false, true)).toMatchObject({
      bandeauPret: false,
      paveVerrouille: true,
    });
  });
});
