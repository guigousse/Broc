import { describe, expect, it } from "vitest";
import { getTemplate } from "@/data/objetTemplates";
import { calculerPrixMinAcceptDepuisPersona } from "@/lib/personas";
import {
  PELUCHE_TEMPLATE_ID, SESSION_TUTORIEL, TRACES_TUTORIEL,
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
  it("vise la manette (droite) puis la carafe (pivotée)", () => {
    expect(TRACES_TUTORIEL[0]).toMatchObject({ templateId: "jx.manette_vibraduo", rotation: 0 });
    expect(TRACES_TUTORIEL[1].templateId).toBe("ma.carafe_cristal_taille");
    expect(TRACES_TUTORIEL[1].rotation).toBeGreaterThanOrEqual(30);
  });
  it("reste dans les bornes du coffre sans se chevaucher", () => {
    for (const t of TRACES_TUTORIEL) {
      expect(t.posX).toBeGreaterThan(0.12); expect(t.posX).toBeLessThan(0.88);
      expect(t.posY).toBeGreaterThan(0.12); expect(t.posY).toBeLessThan(0.88);
    }
    const [a, b] = TRACES_TUTORIEL;
    expect(Math.hypot(a.posX - b.posX, a.posY - b.posY)).toBeGreaterThan(0.2);
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
