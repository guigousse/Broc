import { describe, expect, it } from "vitest";
import { acheterLotPieces, acheterVitrine } from "@/lib/bazar/achat";
import { genererEtal, PRIX_JETON_EUROS } from "@/lib/bazar/etal";
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
    expect(r.ok && r.state.bazar!.lotsPieces).toHaveLength(3);
  });

  it("refuse sans effet de bord quand les jetons manquent", () => {
    const state = avecEtal({ jetons: 0 });
    const r = acheterLotPieces(state, 0);
    expect(r).toEqual({ ok: false, raison: "jetons" });
  });
});

describe("acheter l'objet de vitrine", () => {
  it("débite le prix et pose l'objet en Pristin dans l'inventaire", () => {
    const state = avecEtal();
    const prix = state.bazar!.vitrine!.prix;
    const r = acheterVitrine(state, Date.now());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.jetons).toBe(20 - prix);
    expect(r.state.inventaireJoueur).toHaveLength(1);
    expect(r.state.inventaireJoueur[0].etat).toBe("Pristin état");
  });

  it("GARDE-FOU : l'objet porte un prix d'achat en euros égal à ce qui a été payé", () => {
    const state = avecEtal();
    const prix = state.bazar!.vitrine!.prix;
    const r = acheterVitrine(state, Date.now());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Sans ce prix d'achat, la revente serait un bénéfice pur : elle validerait
    // les quêtes de bénéfice, qui paient des jetons — boucle fermée et rentable.
    expect(r.state.inventaireJoueur[0].prixAchat).toBe(prix * PRIX_JETON_EUROS);
  });

  it("vide la vitrine jusqu'à la rotation", () => {
    const r = acheterVitrine(avecEtal(), Date.now());
    expect(r.ok && r.state.bazar!.vitrine).toBeNull();
  });

  it("refuse une vitrine déjà vide", () => {
    const state = avecEtal();
    const vide = { ...state, bazar: { ...state.bazar!, vitrine: null } };
    expect(acheterVitrine(vide, Date.now())).toEqual({ ok: false, raison: "indisponible" });
  });

  it("refuse sans effet de bord quand le stockage est plein — comme tout autre chemin d'acquisition", () => {
    const plein = Array.from({ length: 10 }, (_, i) => createMockObjet({ id: `plein-${i}` }));
    const state = avecEtal({ inventaireJoueur: plein });
    const r = acheterVitrine(state, Date.now());
    expect(r).toEqual({ ok: false, raison: "stockagePlein" });
  });

  it("n'écrit rien au grand livre — aucun euro ne bouge", () => {
    const state = avecEtal();
    const r = acheterVitrine(state, Date.now());
    expect(r.ok && r.state.grandLivre).toHaveLength(state.grandLivre.length);
    expect(r.ok && r.state.budget).toBe(state.budget);
  });
});
