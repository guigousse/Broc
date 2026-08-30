import { describe, expect, it } from "vitest";
import { acheterArticle, acheterLotPieces } from "@/lib/bazar/achat";
import { GAMMES_BAZAR, genererEtal, NB_LOTS_PIECES, PRIX_JETON_EUROS } from "@/lib/bazar/etal";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";
import type { GameState } from "@/types/game";

function avecEtal(patch: Partial<GameState> = {}): GameState {
  return createMockGameState({ jetons: 20, bazar: genererEtal("2026-W34"), ...patch });
}

describe("acheter un lot de pièces", () => {
  it("débite 1 jeton et crédite 5 pièces de la bonne catégorie", () => {
    const state = avecEtal();
    const cat = state.bazar!.lotsPieces[0].categorie;
    const avant = state.piecesAmelioration[cat];
    const r = acheterLotPieces(state, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.jetons).toBe(19);
    expect(r.state.piecesAmelioration[cat]).toBe(avant + 5);
  });

  it("le lot reste à l'étal — stock illimité", () => {
    const r = acheterLotPieces(avecEtal(), 0);
    expect(r.ok && r.state.bazar!.lotsPieces).toHaveLength(NB_LOTS_PIECES);
  });

  it("refuse sans effet de bord quand les jetons manquent", () => {
    const state = avecEtal({ jetons: 0 });
    const r = acheterLotPieces(state, 0);
    expect(r).toEqual({ ok: false, raison: "jetons" });
  });
});

describe("acheter un article de l'étagère du haut", () => {
  // Les trois cases suivent la MÊME règle : ce qui change d'une gamme à
  // l'autre, c'est le prix, rien d'autre. Le test tourne donc sur les trois.
  for (let index = 0; index < GAMMES_BAZAR.length; index++) {
    const gamme = GAMMES_BAZAR[index].cle;

    it(`gamme ${gamme} : débite le prix et pose l'objet en Pristin dans l'inventaire`, () => {
      const state = avecEtal({ jetons: 100 });
      const prix = state.bazar!.articles[index]!.prix;
      const r = acheterArticle(state, index, Date.now());
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.state.jetons).toBe(100 - prix);
      expect(r.state.inventaireJoueur).toHaveLength(1);
      expect(r.state.inventaireJoueur[0].etat).toBe("Pristin état");
    });

    it(`gamme ${gamme} : GARDE-FOU — prix d'achat en euros égal à ce qui a été payé`, () => {
      const state = avecEtal({ jetons: 100 });
      const prix = state.bazar!.articles[index]!.prix;
      const r = acheterArticle(state, index, Date.now());
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      // Sans ce prix d'achat, la revente serait un bénéfice pur : elle validerait
      // les quêtes de bénéfice, qui paient des jetons — boucle fermée et rentable.
      expect(r.state.inventaireJoueur[0].prixAchat).toBe(prix * PRIX_JETON_EUROS);
    });

    /**
     * L'article n'est plus EFFACÉ mais MARQUÉ (2026-08-26) : l'étagère le garde
     * en noir et blanc, tamponné « Vendu », jusqu'au renouvellement du lundi.
     * Effacé, il ne restait plus rien à montrer — c'est tout le sujet du
     * changement.
     */
    it(`gamme ${gamme} : marque SA case vendue et laisse les deux autres en vente`, () => {
      // L'étal est TIRÉ AU SORT à chaque appel : on garde l'état de départ
      // sous la main, sinon la comparaison porterait sur deux étals différents.
      const avant = avecEtal({ jetons: 100 });
      const r = acheterArticle(avant, index, Date.now());
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const vendu = r.state.bazar!.articles[index];
      expect(vendu).not.toBeNull();
      expect(vendu!.vendu).toBe(true);
      // Le reste de la fiche article est intact : c'est lui qui permet de
      // redessiner l'objet vendu.
      expect(vendu!.templateId).toBe(avant.bazar!.articles[index]!.templateId);
      const autres = r.state.bazar!.articles.filter((_, i) => i !== index);
      expect(autres.every((a) => a !== null && !a.vendu)).toBe(true);
    });

    it(`gamme ${gamme} : un article déjà vendu ne se rachète pas`, () => {
      const premier = acheterArticle(avecEtal({ jetons: 100 }), index, Date.now());
      expect(premier.ok).toBe(true);
      if (!premier.ok) return;
      expect(acheterArticle(premier.state, index, Date.now())).toEqual({
        ok: false,
        raison: "indisponible",
      });
    });
  }

  it("refuse une case déjà vide", () => {
    const state = avecEtal({ jetons: 100 });
    const articles = [...state.bazar!.articles];
    articles[1] = null;
    const vide = { ...state, bazar: { ...state.bazar!, articles } };
    expect(acheterArticle(vide, 1, Date.now())).toEqual({ ok: false, raison: "indisponible" });
  });

  it("refuse un index hors de l'étagère", () => {
    expect(acheterArticle(avecEtal({ jetons: 100 }), 7, Date.now())).toEqual({
      ok: false,
      raison: "indisponible",
    });
  });

  // La pièce de caractère coûte 17 à 40 jetons : c'est la case sur laquelle un
  // joueur tombera le plus souvent à court, et le refus doit rester propre.
  it("refuse sans effet de bord quand les jetons manquent", () => {
    const state = avecEtal({ jetons: 0 });
    expect(acheterArticle(state, 2, Date.now())).toEqual({ ok: false, raison: "jetons" });
  });

  it("refuse sans effet de bord quand le stockage est plein — comme tout autre chemin d'acquisition", () => {
    const plein = Array.from({ length: 10 }, (_, i) => createMockObjet({ id: `plein-${i}` }));
    const state = avecEtal({ jetons: 100, inventaireJoueur: plein });
    expect(acheterArticle(state, 1, Date.now())).toEqual({ ok: false, raison: "stockagePlein" });
  });

  it("n'écrit rien au grand livre — aucun euro ne bouge", () => {
    const state = avecEtal({ jetons: 100 });
    const r = acheterArticle(state, 1, Date.now());
    expect(r.ok && r.state.grandLivre).toHaveLength(state.grandLivre.length);
    expect(r.ok && r.state.budget).toBe(state.budget);
  });
});
