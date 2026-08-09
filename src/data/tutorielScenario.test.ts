import { describe, expect, it } from "vitest";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { calculerPrixMinAcceptDepuisPersona } from "@/lib/personas";
import { getClientIllustration } from "@/lib/personaIllustrations";
import {
  acheteurDeLEtape, COLIS_TUTORIEL_SCRIPTE, PELUCHE_TEMPLATE_ID, personnageScenario,
  PREFILL_COFFRE_TUTORIEL, PRIX_CONSEILLES_TUTORIEL, SESSION_TUTORIEL, SESSION_VENTE_TUTORIEL,
  TOLERANCE_PRIX_CONSEILLE, TRACES_TUTORIEL,
} from "./tutorielScenario";
import {
  deckVerrouille, donCollectionPermis, indexObjetScenario,
  ongletTutorielPermis, scenarioDeLEtape,
} from "@/lib/tutoriel";
import { ITEMS_WITH_IMAGE } from "@/lib/itemImages";
import { ALEA_NEGO_SCRIPTEE, ouvrirNegociation, proposerOffre } from "@/lib/negociation";
import { genererSessionScriptee } from "@/lib/chine";

describe("SESSION_TUTORIEL", () => {
  it("contient 6 objets aux templates connus, illustrés, sans doublon", () => {
    expect(SESSION_TUTORIEL).toHaveLength(6);
    const ids = SESSION_TUTORIEL.map((s) => s.templateId);
    expect(new Set(ids).size).toBe(6);
    for (const s of SESSION_TUTORIEL) {
      expect(getTemplate(s.templateId), s.templateId).toBeDefined();
      expect(ITEMS_WITH_IMAGE.has(s.templateId), s.templateId).toBe(true);
    }
  });
  it("suit l'ordre des rôles : échec, direct, réussite ×2, décor ×2", () => {
    expect(SESSION_TUTORIEL.map((s) => s.role)).toEqual([
      "nego-echec", "achat-direct", "nego-reussie", "nego-reussie", "decor", "decor",
    ]);
  });
  it("la peluche est le 4e objet et part en collection", () => {
    expect(SESSION_TUTORIEL[3].templateId).toBe(PELUCHE_TEMPLATE_ID);
  });
  it("l'échec est garanti : toute offre bornée est insultante au tour 1", () => {
    const s = SESSION_TUTORIEL[0];
    const seuil = s.prixVendeur * (1 - s.persona.tolerancePct);
    expect(s.bornesOffre!.max).toBeLessThan(seuil);
  });
  it("les réussites sont garanties : min ≥ prix plancher et jamais d'insulte", () => {
    for (const s of SESSION_TUTORIEL.filter((x) => x.role === "nego-reussie")) {
      const plancher = calculerPrixMinAcceptDepuisPersona(s.persona, s.prixVendeur);
      expect(s.bornesOffre!.min).toBeGreaterThanOrEqual(plancher);
      // pire cas d'insulte : prix adverse au plus haut (tour 1)
      expect(s.bornesOffre!.min).toBeGreaterThanOrEqual(
        s.prixVendeur * (1 - s.persona.tolerancePct),
      );
      expect(s.bornesOffre!.max).toBeLessThan(s.prixVendeur);
    }
  });
  it("le budget initial couvre large les 3 achats au pire prix", () => {
    const pire = SESSION_TUTORIEL[1].prixVendeur +
      SESSION_TUTORIEL[2].bornesOffre!.max + SESSION_TUTORIEL[3].bornesOffre!.max;
    expect(pire).toBeLessThanOrEqual(120); // INITIAL_BUDGET = 150, marge 30
  });
  it("la valeur de donation de la peluche franchit le seuil de 30 €", () => {
    const tpl = getTemplate(PELUCHE_TEMPLATE_ID)!;
    // état "Très bon" → prixReferenceReel = prixRefBase ; prime donation 1.1
    expect(SESSION_TUTORIEL[3].etat).toBe("Très bon");
    expect(Math.round(tpl.prixRefBase * 1.1)).toBeGreaterThanOrEqual(30);
  });
});

describe("TRACES_TUTORIEL", () => {
  it("vise la manette (pivotée, démo du grand-père) puis la carafe (remontée)", () => {
    expect(TRACES_TUTORIEL[0]).toMatchObject({ templateId: "jx.manette_vibraduo", rotation: 25 });
    expect(TRACES_TUTORIEL[1].templateId).toBe("ma.carafe_cristal_taille");
    expect(TRACES_TUTORIEL[1].rotation).toBeGreaterThanOrEqual(30);
  });
  it("reste dans les bornes du coffre sans se chevaucher", () => {
    for (const t of TRACES_TUTORIEL) {
      expect(t.posX).toBeGreaterThan(0.12); expect(t.posX).toBeLessThan(0.88);
      expect(t.posY).toBeGreaterThan(0.12); expect(t.posY).toBeLessThan(0.88);
    }
    const [a, b] = TRACES_TUTORIEL;
    // Seuil aligné sur TOLERANCE_TRACE_POS × 2 (v3 : les traces se sont
    // rapprochées pour laisser la place au préfill Tetris, mais restent
    // hors de portée du disque de tolérance l'une de l'autre).
    expect(Math.hypot(a.posX - b.posX, a.posY - b.posY)).toBeGreaterThan(0.16);
  });
});

describe("helpers d'étape", () => {
  it("scenarioDeLEtape mappe les 4 étapes scriptées", () => {
    expect(scenarioDeLEtape("chine-nego-echec")).toBe(SESSION_TUTORIEL[0]);
    expect(scenarioDeLEtape("chine-achat-direct")).toBe(SESSION_TUTORIEL[1]);
    expect(scenarioDeLEtape("chine-nego-un")).toBe(SESSION_TUTORIEL[2]);
    expect(scenarioDeLEtape("chine-nego-deux")).toBe(SESSION_TUTORIEL[3]);
    expect(scenarioDeLEtape("chine-sortir")).toBeNull();
    expect(indexObjetScenario("chine-nego-deux")).toBe(3);
  });
  it("deckVerrouille : vrai sur les 4 étapes scriptées, faux ensuite", () => {
    expect(deckVerrouille("chine-nego-echec")).toBe(true);
    expect(deckVerrouille("chine-sortir")).toBe(false);
    expect(deckVerrouille("termine")).toBe(false);
  });
  it("ongletTutorielPermis guide stockage → collection → bureau", () => {
    expect(ongletTutorielPermis("stockage-ouvrir")).toBe("/stockage");
    expect(ongletTutorielPermis("stockage-focus")).toBe("/stockage");
    expect(ongletTutorielPermis("collection-envoyer")).toBe("/stockage");
    expect(ongletTutorielPermis("collection-lecon")).toBe("/collection");
    expect(ongletTutorielPermis("preparer-etal")).toBe("/bureau");
    expect(ongletTutorielPermis("accueil")).toBeNull();
    expect(ongletTutorielPermis("termine")).toBeNull();
  });
  it("donCollectionPermis : seule la peluche pendant collection-envoyer, tout hors tuto", () => {
    expect(donCollectionPermis("collection-envoyer", PELUCHE_TEMPLATE_ID)).toBe(true);
    expect(donCollectionPermis("collection-envoyer", "ma.carafe_cristal_taille")).toBe(false);
    expect(donCollectionPermis("stockage-focus", PELUCHE_TEMPLATE_ID)).toBe(false);
    expect(donCollectionPermis("termine", "ma.carafe_cristal_taille")).toBe(true);
  });
});

describe("garanties de négo du scénario", () => {
  it("objet 1 : TOUTE offre bornée fâche le vendeur au tour 1", () => {
    const s = SESSION_TUTORIEL[0];
    const it = genererSessionScriptee()[0];
    for (let offre = s.bornesOffre!.min; offre <= s.bornesOffre!.max; offre++) {
      const nego = proposerOffre(
        ouvrirNegociation("achat", it.prixVendeur, it.prixMinAccept),
        s.persona, offre, ALEA_NEGO_SCRIPTEE,
      );
      expect(nego.statut, `offre ${offre}`).toBe("fache");
    }
  });
  it.each([[2], [3]])("objet %d : aucune suite d'offres bornées ne peut échouer", (idx) => {
    const s = SESSION_TUTORIEL[idx];
    const it = genererSessionScriptee()[idx];
    // Pire stratégie pour l'accord : offrir la borne MIN à chaque tour
    // (une offre plus haute conclut plus tôt). La trajectoire adverse est
    // déterministe : il suffit de la dérouler.
    let nego = ouvrirNegociation("achat", it.prixVendeur, it.prixMinAccept);
    let tours = 0;
    while (nego.statut === "en_cours" && tours < 10) {
      nego = proposerOffre(nego, s.persona, s.bornesOffre!.min, ALEA_NEGO_SCRIPTEE);
      tours++;
      expect(["en_cours", "conclu"], `tour ${tours}`).toContain(nego.statut);
    }
    expect(nego.statut).toBe("conclu");
    expect(tours).toBeLessThanOrEqual(s.persona.patience);
    // Et l'insulte est impossible sur TOUTE la plage au prix adverse le plus
    // haut (tour 1) — les prix suivants ne font que baisser le seuil.
    expect(s.bornesOffre!.min).toBeGreaterThanOrEqual(
      it.prixVendeur * (1 - s.persona.tolerancePct),
    );
  });
});

describe("COLIS_TUTORIEL_SCRIPTE", () => {
  it("5 objets connus, illustrés, petits, 4 communs + 1 rare en dernier", () => {
    expect(COLIS_TUTORIEL_SCRIPTE).toHaveLength(5);
    const dejaVus = new Set([...SESSION_TUTORIEL.map((s) => s.templateId), PELUCHE_TEMPLATE_ID]);
    for (const o of COLIS_TUTORIEL_SCRIPTE) {
      const t = getTemplate(o.templateId);
      expect(t, o.templateId).toBeDefined();
      expect(ITEMS_WITH_IMAGE.has(o.templateId), o.templateId).toBe(true);
      expect(["XS", "S", "M"], o.templateId).toContain(tailleDe(t!));
      expect(dejaVus.has(o.templateId), o.templateId).toBe(false);
    }
    expect(COLIS_TUTORIEL_SCRIPTE.slice(0, 4).every((o) => getTemplate(o.templateId)!.rarete === "commun")).toBe(true);
    expect(getTemplate(COLIS_TUTORIEL_SCRIPTE[4].templateId)!.rarete).toBe("rare");
  });
});

describe("PREFILL_COFFRE_TUTORIEL", () => {
  it("3 objets pris dans le colis, dans les bornes, sans chevaucher les traces (bbox)", () => {
    expect(PREFILL_COFFRE_TUTORIEL).toHaveLength(3);
    const colisIds = new Set(COLIS_TUTORIEL_SCRIPTE.map((o) => o.templateId));
    for (const p of PREFILL_COFFRE_TUTORIEL) {
      expect(colisIds.has(p.templateId), p.templateId).toBe(true);
      expect(p.posX).toBeGreaterThan(0.1); expect(p.posX).toBeLessThan(0.9);
      expect(p.posY).toBeGreaterThan(0.1); expect(p.posY).toBeLessThan(0.9);
      expect(p.prixVente).toBeGreaterThan(0);
    }
    // Écart minimal entre chaque objet verrouillé et chaque trace (les
    // formes réelles sont plus petites que ces disques — garde grossière).
    for (const p of PREFILL_COFFRE_TUTORIEL) {
      for (const t of TRACES_TUTORIEL) {
        expect(Math.hypot(p.posX - t.posX, p.posY - t.posY), `${p.templateId}↔${t.templateId}`).toBeGreaterThan(0.16);
      }
    }
  });
});

describe("traces v3", () => {
  it("manette pivotée (démo), carafe remontée", () => {
    expect(TRACES_TUTORIEL[0].rotation).toBeGreaterThanOrEqual(20);
    expect(TRACES_TUTORIEL[1].posY).toBeLessThanOrEqual(0.45);
  });
});

describe("PRIX_CONSEILLES_TUTORIEL", () => {
  it("couvre manette et carafe, dans l'échelle du PrixSlider (1..2×réf)", () => {
    const manette = getTemplate("jx.manette_vibraduo")!;
    const carafe = getTemplate("ma.carafe_cristal_taille")!;
    // états scriptés du chinage : manette Très bon (réf 18), carafe Bon (réf 21)
    expect(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]).toBeLessThanOrEqual(18 * 2);
    expect(PRIX_CONSEILLES_TUTORIEL["ma.carafe_cristal_taille"]).toBeLessThanOrEqual(21 * 2);
    expect(TOLERANCE_PRIX_CONSEILLE).toBeGreaterThan(0);
    void manette; void carafe;
  });
});

describe("SESSION_VENTE_TUTORIEL — garanties", () => {
  it("3 acheteurs résolus (personnage nommé + portrait) visant des objets du coffre", () => {
    expect(SESSION_VENTE_TUTORIEL).toHaveLength(3);
    for (const a of SESSION_VENTE_TUTORIEL) {
      const p = personnageScenario(a);
      expect(getClientIllustration(p.id), p.nom).toBeDefined();
      expect(["jx.manette_vibraduo", "ma.carafe_cristal_taille"]).toContain(a.templateIdCible);
    }
    expect(SESSION_VENTE_TUTORIEL.map((a) => a.mode)).toEqual(["negociation", "achat-direct", "negociation"]);
  });
  it("acheteurDeLEtape mappe les 3 étapes de vente", () => {
    expect(acheteurDeLEtape("vente-refus")).toBe(SESSION_VENTE_TUTORIEL[0]);
    expect(acheteurDeLEtape("vente-directe")).toBe(SESSION_VENTE_TUTORIEL[1]);
    expect(acheteurDeLEtape("vente-nego")).toBe(SESSION_VENTE_TUTORIEL[2]);
    expect(acheteurDeLEtape("conclusion")).toBeNull();
  });
  it("radin : AUCUNE offre bornée ne peut conclure ni insulter", () => {
    const a = SESSION_VENTE_TUTORIEL[0];
    // borne min > prixMax → jamais d'accord (offreRejoint vente : offre ≤ prixAdverse ≤ prixMax)
    expect(a.bornesOffre!.min).toBeGreaterThan(a.prixMax);
    // pire cas d'insulte : prixAdverse au plus bas (tour 1 = offreInitiale)
    expect(a.bornesOffre!.max).toBeLessThanOrEqual(a.offreInitiale! * (1 + a.persona.tolerancePct));
    // déroulé complet : quelle que soit l'offre constante, fin en refus_poli (patience), jamais conclu/fache
    for (let offre = a.bornesOffre!.min; offre <= a.bornesOffre!.max; offre++) {
      let nego = ouvrirNegociation("vente", a.offreInitiale!, a.prixMax);
      let tours = 0;
      while (nego.statut === "en_cours" && tours < 12) {
        nego = proposerOffre(nego, a.persona, offre, ALEA_NEGO_SCRIPTEE);
        tours++;
      }
      expect(nego.statut, `offre ${offre}`).toBe("refus_poli");
    }
  });
  it("négociatrice : la stratégie borne MAX (la plus lente) conclut dans la patience", () => {
    const a = SESSION_VENTE_TUTORIEL[2];
    expect(a.prixMax).toBeGreaterThanOrEqual(a.bornesOffre!.max); // alignement toujours atteignable
    let nego = ouvrirNegociation("vente", a.offreInitiale!, a.prixMax);
    let tours = 0;
    while (nego.statut === "en_cours" && tours < 10) {
      nego = proposerOffre(nego, a.persona, a.bornesOffre!.max, ALEA_NEGO_SCRIPTEE);
      tours++;
      expect(["en_cours", "conclu"], `tour ${tours}`).toContain(nego.statut);
    }
    expect(nego.statut).toBe("conclu");
    expect(tours).toBeLessThanOrEqual(a.persona.patience);
    // et jamais d'insulte sur la plage au prix adverse le plus bas
    expect(a.bornesOffre!.max).toBeLessThanOrEqual(a.offreInitiale! * (1 + a.persona.tolerancePct));
  });
  it("cohérence prix : l'ami paie le prix conseillé de la manette, le radin ne peut pas payer la carafe", () => {
    expect(SESSION_VENTE_TUTORIEL[1].prixMax).toBeGreaterThanOrEqual(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]);
    expect(SESSION_VENTE_TUTORIEL[0].prixMax).toBeLessThan(PRIX_CONSEILLES_TUTORIEL["ma.carafe_cristal_taille"]);
  });
});
