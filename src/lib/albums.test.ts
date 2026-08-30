// src/lib/albums.test.ts
import { describe, expect, it } from "vitest";
import {
  acheterPiece, ajouterPiece, albumsDe, doublons, initAlbums, marquerConsultee, nbPossedees,
  ouvrirPaquet, poserTimbre, premierePlaceLibre, recyclerDoublons, rendreAuBac,
  tirerPiece, TAILLE_PAQUET,
} from "@/lib/albums";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";
import { piecesDe } from "@/data/pieces";

const rngFixe = (suite: number[]) => { let i = 0; return () => suite[i++ % suite.length]; };

describe("albums — état", () => {
  it("initAlbums : rien d'acheté, vide ; albumsDe remplace un champ absent", () => {
    const a = initAlbums();
    expect(a.classeur.achete).toBe(false);
    expect(a.timbres.placements).toEqual({});
    expect(albumsDe(createMockGameState())).toEqual(initAlbums());
  });

  it("ajouterPiece empile et note la nouveauté à la première fois seulement", () => {
    let a = ajouterPiece(initAlbums(), "timbre.renard_roux");
    a = ajouterPiece(a, "timbre.renard_roux");
    expect(a.timbres.pieces["timbre.renard_roux"]).toBe(2);
    expect(a.timbres.nouvelles).toEqual(["timbre.renard_roux"]);
    expect(nbPossedees(a.timbres)).toBe(1);
    expect(doublons(a.timbres)).toBe(1);
    expect(marquerConsultee(a, "timbre.renard_roux").timbres.nouvelles).toEqual([]);
  });

  it("recyclerDoublons ramène chaque quantité à 1 et crédite la catégorie de l'album", () => {
    let a = initAlbums();
    for (let i = 0; i < 3; i++) a = ajouterPiece(a, "carte.marteau_menuisier");
    a = ajouterPiece(a, "carte.risk_1992");
    a = ajouterPiece(a, "carte.risk_1992");
    const { state, n } = recyclerDoublons(createMockGameState({ albums: a }), "classeur");
    expect(n).toBe(3);
    expect(state.piecesAmelioration["Jeux & Loisirs"]).toBe(3);
    expect(state.albums!.classeur.pieces).toEqual({ "carte.marteau_menuisier": 1, "carte.risk_1992": 1 });
  });
});

describe("albums — tirage", () => {
  it("tirerPiece respecte les poids 70/25/5 et reste dans l'album demandé", () => {
    expect(tirerPiece("timbres", rngFixe([0.0, 0.0])).rarete).toBe("commun");
    expect(tirerPiece("timbres", rngFixe([0.71, 0.0])).rarete).toBe("rare");
    expect(tirerPiece("timbres", rngFixe([0.96, 0.0])).rarete).toBe("legendaire");
    expect(tirerPiece("classeur", rngFixe([0.5, 0.5])).album).toBe("classeur");
  });

  it("ouvrirPaquet donne 3 pièces, doublons possibles", () => {
    const p = ouvrirPaquet("classeur", rngFixe([0.1, 0.0]));
    expect(p).toHaveLength(TAILLE_PAQUET);
    expect(new Set(p.map((x) => x.id)).size).toBe(1);
  });
});

describe("album de timbres — placement", () => {
  const id = "timbre.renard_roux";
  it("poserTimbre borne x, aimante la ligne et passe le timbre dessus", () => {
    let a = ajouterPiece(initAlbums(), id);
    a = ajouterPiece(a, "timbre.lynx_boreal");
    a = poserTimbre(a, "timbre.lynx_boreal", 0, 2, 0.5);
    a = poserTimbre(a, id, 1, 4, 1.7);
    expect(a.timbres.placements[id]).toEqual({ page: 1, ligne: 4, x: 1 });
    expect(a.timbres.ordreZ).toEqual(["timbre.lynx_boreal", id]);
    a = poserTimbre(a, "timbre.lynx_boreal", 0, 0, -3);
    expect(a.timbres.placements["timbre.lynx_boreal"].x).toBe(0);
    expect(a.timbres.ordreZ).toEqual([id, "timbre.lynx_boreal"]);
  });

  it("refuse de poser un timbre non possédé", () => {
    const a = initAlbums();
    expect(poserTimbre(a, id, 0, 0, 0.5)).toBe(a);
  });

  it("rendreAuBac retire le placement et l'ordreZ", () => {
    let a = poserTimbre(ajouterPiece(initAlbums(), id), id, 0, 0, 0.5);
    a = rendreAuBac(a, id);
    expect(a.timbres.placements[id]).toBeUndefined();
    expect(a.timbres.ordreZ).toEqual([]);
  });

  it("premierePlaceLibre avance de 0,2 en 0,2 sur la ligne 0 et retombe au centre si tout est pris", () => {
    let a = initAlbums();
    expect(premierePlaceLibre(a, 0)).toEqual({ page: 0, ligne: 0, x: 0.1 });
    const ids = piecesDe("timbres").slice(0, 5).map((p) => p.id);
    ids.forEach((pid, k) => { a = ajouterPiece(a, pid); a = poserTimbre(a, pid, 0, 0, 0.1 + 0.2 * k); });
    expect(premierePlaceLibre(a, 0)).toEqual({ page: 0, ligne: 0, x: 0.5 });
    expect(premierePlaceLibre(a, 1)).toEqual({ page: 1, ligne: 0, x: 0.1 });
  });
});

describe("acheterPiece", () => {
  const objet = createMockObjet({ templateId: "timbre.renard_roux", categorie: "Livres & Papeterie", prixReferenceReel: 10 });
  it("refuse sans album", () => {
    const r = acheterPiece(createMockGameState({ budget: 100 }), objet, 8);
    expect(r).toEqual({ ok: false, raison: "albumManquant" });
  });
  it("refuse sans budget", () => {
    const a = { ...initAlbums(), timbres: { ...initAlbums().timbres, achete: true } };
    expect(acheterPiece(createMockGameState({ budget: 5, albums: a }), objet, 8)).toEqual({ ok: false, raison: "budget" });
  });
  it("débite et range dans l'album, sans toucher à la réserve", () => {
    const a = { ...initAlbums(), timbres: { ...initAlbums().timbres, achete: true } };
    const r = acheterPiece(createMockGameState({ budget: 100, albums: a }), objet, 8);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.budget).toBe(92);
    expect(r.state.albums!.timbres.pieces["timbre.renard_roux"]).toBe(1);
    expect(r.state.inventaireJoueur).toHaveLength(0);
  });
});
