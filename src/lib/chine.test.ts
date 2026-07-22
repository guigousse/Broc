import { describe, expect, it } from "vitest";
import {
  BONUS_SPECIALISATION,
  CHANCE_EXCLUSIF_PAR_SESSION,
  MIX_RARETE_PAR_TIER,
  SEUIL_COLERE_VENDEUR,
  SURCOTE_BONIMENTEUR,
  genererRemplacement,
  genererSession,
  uniquesExclusDuChinage,
} from "./chine";
import {
  createMockBrocante,
  createMockGameState,
  createMockObjet,
  createMockSlot,
} from "./__test-fixtures__/gameState";
import { UNIQUES } from "@/data/uniques";
import type { CollectionSlot, Courrier, GameState } from "@/types/game";

describe("constantes exportées", () => {
  it("SEUIL_COLERE_VENDEUR est dans (0, 1)", () => {
    expect(SEUIL_COLERE_VENDEUR).toBeGreaterThan(0);
    expect(SEUIL_COLERE_VENDEUR).toBeLessThan(1);
  });

  it("BONUS_SPECIALISATION est > 1 (majoration de prix)", () => {
    expect(BONUS_SPECIALISATION).toBeGreaterThan(1);
  });
});

describe("genererSession — taille", () => {
  it("retourne un tableau vide si taille = 0", () => {
    const items = genererSession(0);
    expect(items).toEqual([]);
  });

  it("génère ~N items pour une demande de taille N", () => {
    const items = genererSession(10);
    // maxAttempts = N * 6, mais on évite les doublons rares/légendaires donc
    // il peut y avoir un léger sous-remplissage. On vérifie une borne basse.
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it("respecte la taille pour des sessions petites", () => {
    const items = genererSession(3);
    expect(items.length).toBe(3);
  });
});

describe("genererSession — structure des items", () => {
  it("chaque item a tous les champs requis", () => {
    const items = genererSession(5);
    for (const it of items) {
      expect(it.id).toBeTruthy();
      expect(it.objet).toBeDefined();
      expect(it.objet.id).toBeTruthy();
      expect(it.objet.templateId).toBeTruthy();
      expect(it.objet.nom).toBeTruthy();
      expect(it.objet.categorie).toBeTruthy();
      expect(it.objet.etat).toBeTruthy();
      expect(it.objet.prixReferenceReel).toBeGreaterThan(0);
      expect(it.prixVendeur).toBeGreaterThan(0);
      expect(it.prixMinAccept).toBeGreaterThan(0);
      expect(it.prixMinAccept).toBeLessThanOrEqual(it.prixVendeur);
      expect(it.statut).toBe("disponible");
      expect(it.negociation).toBeNull();
      expect(it.negociationsTentees).toBe(0);
      expect(typeof it.prixAffiche).toBe("boolean");
    }
  });

  it("ne génère pas d'objets en Pristin état (rare en chinage)", () => {
    const items = genererSession(20);
    const pristines = items.filter((i) => i.objet.etat === "Pristin état");
    expect(pristines.length).toBe(0);
  });

  it("chaque item a un UUID unique", () => {
    const items = genererSession(10);
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(items.length);
  });
});

describe("genererSession — pas de doublons rares/légendaires", () => {
  it("aucun template rare ou légendaire n'apparait deux fois", () => {
    // Plusieurs runs pour avoir des chances de tirer des rares
    for (let run = 0; run < 5; run++) {
      const items = genererSession(15);
      const rares = items
        .filter((i) => i.objet.rarete !== "commun")
        .map((i) => i.objet.templateId);
      expect(new Set(rares).size).toBe(rares.length);
    }
  });
});

describe("genererSession — brocante spécialisée", () => {
  it("respecte le quota d'au moins 50% d'items de la catégorie spécialisée", () => {
    const broc = createMockBrocante({
      specialisation: "Musique",
      taillePool: 10,
      tier: 2,
    });
    const items = genererSession(10, [], broc);
    const enMusique = items.filter(
      (i) => i.objet.categorie === "Musique",
    ).length;
    expect(enMusique).toBeGreaterThanOrEqual(Math.ceil(items.length * 0.5));
  });

  it("respecte le quota de 50% aussi quand une célébrité gonfle la session", () => {
    const broc = createMockBrocante({
      id: "broc-spe-celeb",
      specialisation: "Musique",
      taillePool: 12,
      tier: 2,
    });
    const celeb = { brocanteId: "broc-spe-celeb", nom: "La Comtesse", jourSemaine: 0 };
    for (let run = 0; run < 5; run++) {
      const items = genererSession(12, [], broc, celeb);
      const enMusique = items.filter(
        (i) => i.objet.categorie === "Musique",
      ).length;
      expect(enMusique).toBeGreaterThanOrEqual(Math.ceil(items.length * 0.5));
    }
  });
});

describe("genererSession — déterminisme du statut initial", () => {
  it("tous les items ont statut=disponible, negociation=null, negociationsTentees=0", () => {
    const items = genererSession(8);
    for (const it of items) {
      expect(it.statut).toBe("disponible");
      expect(it.negociation).toBeNull();
      expect(it.negociationsTentees).toBe(0);
    }
  });
});

describe("genererSession — surcote bonimenteur", () => {
  it("SURCOTE_BONIMENTEUR vaut 1.35", () => {
    expect(SURCOTE_BONIMENTEUR).toBe(1.35);
  });

  it("les objets du bonimenteur sont surcotés (jamais de prix bradé)", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    const items = [];
    for (let s = 0; s < 30; s++) items.push(...genererSession(12, [], broc));
    const duBonimenteur = items.filter((it) => it.persona.archetype === "bonimenteur");
    expect(duBonimenteur.length).toBeGreaterThan(0);
    for (const it of duBonimenteur) {
      // facteur min 0.6 × surcote 1.35 = 0.81 ; tolérance de 1 € pour l'arrondi.
      expect(it.prixVendeur).toBeGreaterThanOrEqual(
        Math.round(it.objet.prixReferenceReel * 0.81) - 1,
      );
    }
  });
});

describe("genererSession — disquaire connaît la cote", () => {
  it("le disquaire n'apparaît que sur des objets Musique, jamais bradés", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    const items = [];
    for (let s = 0; s < 40; s++) items.push(...genererSession(12, [], broc));
    const duDisquaire = items.filter((it) => it.persona.archetype === "disquaire");
    expect(duDisquaire.length).toBeGreaterThan(0);
    for (const it of duDisquaire) {
      expect(it.objet.categorie).toBe("Musique");
      // facteurCoteMin 0.95 ; tolérance de 1 € pour l'arrondi.
      expect(it.prixVendeur).toBeGreaterThanOrEqual(
        Math.round(it.objet.prixReferenceReel * 0.95) - 1,
      );
    }
  });
});

describe("genererSession — commanditaires connaissent leur cote", () => {
  it("chaque commanditaire n'apparaît que sur sa catégorie, au-dessus de son plancher", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    const items = [];
    for (let s = 0; s < 40; s++) items.push(...genererSession(12, [], broc));
    const CAS = [
      { arch: "joueur", cat: "Jeux & Loisirs", min: 0.85 },
      { arch: "setdesigner", cat: "Maison", min: 0.8 },
      { arch: "modeuse", cat: "Mode", min: 0.95 },
      { arch: "esthete", cat: "Objets d'art", min: 0.95 },
    ] as const;
    for (const { arch, cat, min } of CAS) {
      const duSpe = items.filter((it) => it.persona.archetype === arch);
      expect(duSpe.length).toBeGreaterThan(0);
      for (const it of duSpe) {
        expect(it.objet.categorie).toBe(cat);
        // facteurCoteMin ; tolérance de 1 € pour l'arrondi.
        expect(it.prixVendeur).toBeGreaterThanOrEqual(
          Math.round(it.objet.prixReferenceReel * min) - 1,
        );
      }
    }
  });
});

/* ===================================================================== */
/* Unicité effective des objets uniques (anti-farm du boss)              */
/* ===================================================================== */

describe("uniquesExclusDuChinage", () => {
  const BIJOU = "uniq.mo.bijou_marie_antoinette";
  const VIOLON = "uniq.mus.violon_paganini";

  /** État avec le slot de collection d'un unique donné (placé dans sa catégorie). */
  function stateAvecSlot(
    templateId: string,
    slotPatch: Partial<CollectionSlot>,
    statePatch: Partial<GameState> = {},
  ): GameState {
    const template = UNIQUES.find((u) => u.templateId === templateId)!;
    const state = createMockGameState(statePatch);
    state.collection[template.categorie] = [
      createMockSlot({
        templateId,
        nom: template.nom,
        categorie: template.categorie,
        rarete: "legendaire",
        unique: true,
        ...slotPatch,
      }),
    ];
    return state;
  }

  /** Courrier mission principale ciblant le bijou (finale de l'arc). */
  const courrierCh5: Courrier = {
    id: "c-ch5",
    type: "mission",
    jourRecu: 1,
    lu: true,
    payload: {
      type: "mission",
      categorie: "principale",
      expediteurId: "grandpere",
      titre: "Les bijoux de la reine",
      corps: [],
      cibles: [{ templateId: BIJOU }],
      recompense: { argent: 500 },
      conserverCibles: true,
    },
  };

  it("un unique jamais possédé n'est pas exclu", () => {
    const state = stateAvecSlot(VIOLON, { dejaPossede: false });
    expect(uniquesExclusDuChinage(state).has(VIOLON)).toBe(false);
  });

  it("un unique déjà possédé puis revendu est exclu (une seule fois par partie)", () => {
    const state = stateAvecSlot(VIOLON, { dejaPossede: true, vu: true });
    expect(uniquesExclusDuChinage(state).has(VIOLON)).toBe(true);
  });

  it("un unique encore dans l'inventaire est exclu", () => {
    const state = stateAvecSlot(
      BIJOU,
      { dejaPossede: true, vu: true },
      {
        inventaireJoueur: [
          createMockObjet({ templateId: BIJOU, categorie: "Mode", rarete: "legendaire" }),
        ],
      },
    );
    expect(uniquesExclusDuChinage(state).has(BIJOU)).toBe(true);
  });

  it("un unique donné à la collection est exclu", () => {
    const state = stateAvecSlot(BIJOU, {
      dejaPossede: true,
      vu: true,
      donation: { etat: "Bon", valeur: 8500 },
    });
    expect(uniquesExclusDuChinage(state).has(BIJOU)).toBe(true);
  });

  it("un unique posé en vitrine est exclu", () => {
    const state = stateAvecSlot(
      BIJOU,
      { dejaPossede: true, vu: true },
      {
        vitrine: {
          brocanteId: "broc-test",
          objets: [
            {
              objet: createMockObjet({ templateId: BIJOU, categorie: "Mode", rarete: "legendaire" }),
              prixVente: 9000,
            },
          ],
        },
      },
    );
    expect(uniquesExclusDuChinage(state).has(BIJOU)).toBe(true);
  });

  it("anti-softlock : le bijou revendu avant la livraison du ch. 5 reste disponible", () => {
    // Cible de l'arc principal, plus possédé nulle part, mission non livrée
    // → il doit pouvoir réapparaître, sinon l'histoire est bloquée à jamais.
    const state = stateAvecSlot(BIJOU, { dejaPossede: true, vu: true });
    expect(uniquesExclusDuChinage(state).has(BIJOU)).toBe(false);
  });

  it("le bijou est exclu une fois le ch. 5 livré (même revendu ensuite)", () => {
    const state = stateAvecSlot(
      BIJOU,
      { dejaPossede: true, vu: true },
      {
        courriers: [courrierCh5],
        missions: [{ courrierId: "c-ch5", statut: "livree", jourResolution: 10 }],
      },
    );
    expect(uniquesExclusDuChinage(state).has(BIJOU)).toBe(true);
  });
});

describe("genererSession — exclusion des uniques déjà possédés", () => {
  const TOUS_LES_UNIQUES = UNIQUES.map((u) => u.templateId);

  it("ne propose jamais un unique exclu, même au boss", () => {
    const boss = createMockBrocante({
      id: "boss-test",
      tier: 4,
      etoiles: 4,
      taillePool: 12,
      poolExclusif: [...TOUS_LES_UNIQUES],
    });
    const exclus = new Set(["uniq.art.toile_monet_inedite", "uniq.mus.violon_paganini"]);
    const items = [];
    for (let s = 0; s < 30; s++) items.push(...genererSession(12, [], boss, null, exclus));
    // Aucun exclu ne sort…
    for (const it of items) {
      expect(exclus.has(it.objet.templateId)).toBe(false);
    }
    // …mais les uniques non exclus apparaissent bien (contrôle : le filtre ne vide pas le pool).
    const uniquesProposes = items.filter((it) => TOUS_LES_UNIQUES.includes(it.objet.templateId));
    expect(uniquesProposes.length).toBeGreaterThan(0);
  });

  it("sans ensemble d'exclus, le comportement est inchangé", () => {
    const boss = createMockBrocante({
      id: "boss-test",
      tier: 4,
      etoiles: 4,
      taillePool: 12,
      poolExclusif: [...TOUS_LES_UNIQUES],
    });
    const items = [];
    for (let s = 0; s < 30; s++) items.push(...genererSession(12, [], boss, null));
    const uniquesProposes = items.filter((it) => TOUS_LES_UNIQUES.includes(it.objet.templateId));
    expect(uniquesProposes.length).toBeGreaterThan(0);
  });
});

/* ===================================================================== */
/* Mix de rareté par tier (tirage en deux étages)                        */
/* ===================================================================== */

describe("MIX_RARETE_PAR_TIER — intentions de design", () => {
  it("la part de rares croît strictement avec le tier", () => {
    const part = (t: 1 | 2 | 3 | 4) => {
      const m = MIX_RARETE_PAR_TIER[t];
      return m.rare / (m.commun + m.rare + m.legendaire);
    };
    expect(part(1)).toBeLessThan(part(2));
    expect(part(2)).toBeLessThan(part(3));
    expect(part(3)).toBeLessThan(part(4));
  });

  it("le légendaire générique reste anecdotique (≤ 1 % — l'exclusif est le vrai canal)", () => {
    for (const t of [1, 2, 3, 4] as const) {
      const m = MIX_RARETE_PAR_TIER[t];
      expect(m.legendaire / (m.commun + m.rare + m.legendaire)).toBeLessThanOrEqual(0.01);
      expect(m.legendaire).toBeGreaterThan(0); // le jackpot de brocante reste possible
    }
  });
});

describe("genererSession — taux de rares effectifs", () => {
  /** Part observée de rares sur n sessions génériques (sans exclusif ni spé). */
  function partRares(tier: 1 | 2 | 3 | 4, taille: number, celebrite = false): number {
    const broc = createMockBrocante({ id: "broc-mix", tier, etoiles: tier, taillePool: taille });
    const celeb = celebrite
      ? { brocanteId: "broc-mix", nom: "La Comtesse", jourSemaine: 0 }
      : null;
    let rares = 0;
    let total = 0;
    for (let s = 0; s < 120; s++) {
      for (const it of genererSession(taille, [], broc, celeb)) {
        total += 1;
        if (it.objet.rarete === "rare") rares += 1;
      }
    }
    return rares / total;
  }

  it("T2 : ~12 % de rares par objet (l'ancien tirage par template les écrasait à ~3 %)", () => {
    const part = partRares(2, 9);
    expect(part).toBeGreaterThanOrEqual(0.07);
    expect(part).toBeLessThanOrEqual(0.18);
  });

  it("T3 : ~18 % de rares par objet", () => {
    const part = partRares(3, 10);
    expect(part).toBeGreaterThanOrEqual(0.13);
    expect(part).toBeLessThanOrEqual(0.24);
  });

  it("T1 : ~5 % de rares par objet (le vide-grenier reste humble)", () => {
    const part = partRares(1, 6);
    expect(part).toBeGreaterThanOrEqual(0.02);
    expect(part).toBeLessThanOrEqual(0.09);
  });

  it("T4 : ~28 % de rares par objet (le haut du panier se sent riche)", () => {
    const part = partRares(4, 12);
    expect(part).toBeGreaterThanOrEqual(0.22);
    expect(part).toBeLessThanOrEqual(0.35);
  });

  it("l'exclusif marque aussi l'écart entre tiers (rare en bas, quasi sûr au boss)", () => {
    expect(CHANCE_EXCLUSIF_PAR_SESSION[1]).toBeLessThanOrEqual(0.1);
    expect(CHANCE_EXCLUSIF_PAR_SESSION[3]).toBeGreaterThanOrEqual(0.4);
    expect(CHANCE_EXCLUSIF_PAR_SESSION[4]).toBeGreaterThanOrEqual(0.8);
    expect(CHANCE_EXCLUSIF_PAR_SESSION[1]).toBeLessThan(CHANCE_EXCLUSIF_PAR_SESSION[2]);
    expect(CHANCE_EXCLUSIF_PAR_SESSION[2]).toBeLessThan(CHANCE_EXCLUSIF_PAR_SESSION[3]);
    expect(CHANCE_EXCLUSIF_PAR_SESSION[3]).toBeLessThan(CHANCE_EXCLUSIF_PAR_SESSION[4]);
  });

  it("l'écart T1→T4 est franc (au moins ×4 sur la part de rares)", () => {
    const m1 = MIX_RARETE_PAR_TIER[1];
    const m4 = MIX_RARETE_PAR_TIER[4];
    const p1 = m1.rare / (m1.commun + m1.rare + m1.legendaire);
    const p4 = m4.rare / (m4.commun + m4.rare + m4.legendaire);
    expect(p4 / p1).toBeGreaterThanOrEqual(4);
  });

  it("célébrité présente : la part de rares double (boost ×2 conservé)", () => {
    const part = partRares(2, 9, true);
    expect(part).toBeGreaterThanOrEqual(0.16);
  });
});

describe("genererSession — l'exclusif est un événement (au plus 1 par session)", () => {
  // 3 légendaires réels servent de pool exclusif de test (comme une brocante T3).
  const EXCLUSIFS_T3 = [
    "leg.mus.violon_de_maitre_cremonais_1715",
    "leg.lv.gutenberg_feuillet",
    "leg.ma.pendule_louis_xiv_boulle",
  ];

  function statsExclusif(tier: 3 | 4, chanceAttendue: [number, number]) {
    const broc = createMockBrocante({
      id: "broc-excl",
      tier,
      etoiles: tier,
      taillePool: tier === 4 ? 12 : 10,
      poolExclusif: EXCLUSIFS_T3,
    });
    let sessionsAvec = 0;
    let sessionsAvecPlusieurs = 0;
    const N = 300;
    for (let s = 0; s < N; s++) {
      const items = genererSession(broc.taillePool, [], broc);
      const nb = items.filter((it) => EXCLUSIFS_T3.includes(it.objet.templateId)).length;
      if (nb >= 1) sessionsAvec += 1;
      if (nb >= 2) sessionsAvecPlusieurs += 1;
    }
    // Au plus 1 par session (tolérance infime : le pool générique T3+ contient
    // aussi ces templates à ~0,3 % de mix légendaire).
    expect(sessionsAvecPlusieurs).toBeLessThanOrEqual(5);
    const part = sessionsAvec / N;
    expect(part).toBeGreaterThanOrEqual(chanceAttendue[0]);
    expect(part).toBeLessThanOrEqual(chanceAttendue[1]);
  }

  it("T3 : ~40 % des sessions contiennent une pièce d'exception, jamais une pile", () => {
    statsExclusif(3, [0.30, 0.52]);
  });

  it("T4 (boss) : ~80 % des sessions, toujours au plus une", () => {
    statsExclusif(4, [0.70, 0.90]);
  });
});

/* ===================================================================== */
/* La Fouille (N9) : remplacement d'un objet de l'étal                   */
/* ===================================================================== */

describe("genererRemplacement (La Fouille)", () => {
  const brocT2 = createMockBrocante({
    id: "broc-fouille-t2",
    tier: 2,
    etoiles: 2,
    taillePool: 6,
  });

  it("retourne un objet différent, jamais un template non-commun déjà sur l'étal, même statut/négo initiaux", () => {
    const session = genererSession(6, [], brocT2);
    const cible = session[0];
    for (let i = 0; i < 50; i++) {
      const r = genererRemplacement(cible, session, [], brocT2, null, undefined);
      expect(r.id).not.toBe(cible.id);
      if (r.objet.rarete !== "commun") {
        const autresTemplates = session
          .filter((s) => s.id !== cible.id)
          .map((s) => s.objet.templateId);
        expect(autresTemplates).not.toContain(r.objet.templateId);
      }
      expect(r.statut).toBe("disponible");
      expect(r.negociation).toBeNull();
      expect(r.negociationsTentees).toBe(0);
    }
  });

  it("ne pioche jamais dans le poolExclusif (pas de 2e pièce d'exception via la Fouille)", () => {
    const TOUS_LES_UNIQUES = UNIQUES.map((u) => u.templateId);
    const boss = createMockBrocante({
      id: "broc-fouille-boss",
      tier: 4,
      etoiles: 4,
      taillePool: 12,
      poolExclusif: [...TOUS_LES_UNIQUES],
    });
    const session = genererSession(boss.taillePool, [], boss);
    for (let i = 0; i < 100; i++) {
      const r = genererRemplacement(session[0], session, [], boss, null, undefined);
      expect(TOUS_LES_UNIQUES.includes(r.objet.templateId)).toBe(false);
    }
  });

  it("respecte l'exclusion (garde-fou `exclus`) pour un template du pool générique", () => {
    // Légendaire du pool générique T3+ (cf. describe "l'exclusif est un événement").
    const TEMPLATE_GENERIQUE_EXCLU = "leg.mus.violon_de_maitre_cremonais_1715";
    const brocT3 = createMockBrocante({
      id: "broc-fouille-t3",
      tier: 3,
      etoiles: 3,
      taillePool: 6,
    });
    const exclus = new Set([TEMPLATE_GENERIQUE_EXCLU]);
    const session = genererSession(6, [], brocT3);
    for (let i = 0; i < 200; i++) {
      const r = genererRemplacement(session[0], session, [], brocT3, null, exclus);
      expect(r.objet.templateId).not.toBe(TEMPLATE_GENERIQUE_EXCLU);
    }
  });
});
