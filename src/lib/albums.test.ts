// src/lib/albums.test.ts
import { describe, expect, it } from "vitest";
import {
  cartesEnVrac,
  deplacerCarte,
  rendreCarteAuBac,
  slotsDuClasseur,
  acheterPiece, ajouterPiece, albumsDe, doublons, initAlbums, marquerConsultee, nbPossedees,
  ouvrirPaquet, piecePossedee, poserTimbre, premierePlaceLibre, recyclerDoublons, rendreAuBac,
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

  it("piecePossedee : faux tant que la pièce n'a jamais été ajoutée, vrai dès le premier exemplaire", () => {
    const a0 = initAlbums();
    expect(piecePossedee(a0, "timbre.renard_roux")).toBe(false);
    const a1 = ajouterPiece(a0, "timbre.renard_roux");
    expect(piecePossedee(a1, "timbre.renard_roux")).toBe(true);
  });

  it("ajouterPiece ignore un id inconnu (piece renommée/retirée depuis une save ancienne)", () => {
    const a = ajouterPiece(initAlbums(), "timbre.ceci_n_existe_pas");
    expect(a).toEqual(initAlbums());
  });

  it("nbPossedees/doublons ne comptent que les ids connus", () => {
    let a = ajouterPiece(initAlbums(), "timbre.renard_roux");
    a = ajouterPiece(a, "timbre.renard_roux");
    // Simule une save ancienne : un id inconnu resté dans `pieces` (avant
    // qu'`ajouterPiece` ne les refuse). Il ne doit pas fausser les comptes.
    a = {
      ...a,
      timbres: { ...a.timbres, pieces: { ...a.timbres.pieces, "timbre.disparu": 3 } },
    };
    expect(nbPossedees(a.timbres)).toBe(1);
    expect(doublons(a.timbres)).toBe(1);
  });

  it("recyclerDoublons ramène chaque quantité à 1 et crédite la catégorie de l'album", () => {
    let a = initAlbums();
    for (let i = 0; i < 3; i++) a = ajouterPiece(a, "carte.marteau_menuisier");
    a = ajouterPiece(a, "carte.boite_de_construction_metallique_no_3");
    a = ajouterPiece(a, "carte.boite_de_construction_metallique_no_3");
    const { state, n } = recyclerDoublons(createMockGameState({ albums: a }), "classeur");
    expect(n).toBe(3);
    expect(state.piecesAmelioration["Jeux & Loisirs"]).toBe(3);
    expect(state.albums!.classeur.pieces).toEqual({ "carte.marteau_menuisier": 1, "carte.boite_de_construction_metallique_no_3": 1 });
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
  it("poserTimbre borne x à la demi-largeur du timbre (pas au bord brut), aimante la ligne et passe le timbre dessus", () => {
    let a = ajouterPiece(initAlbums(), id);
    a = ajouterPiece(a, "timbre.lynx_boreal");
    a = poserTimbre(a, "timbre.lynx_boreal", 0, 2, 0.5);
    a = poserTimbre(a, id, 1, 4, 1.7);
    expect(a.timbres.placements[id].page).toBe(1);
    expect(a.timbres.placements[id].ligne).toBe(4);
    expect(a.timbres.placements[id].x).toBeCloseTo(11 / 12);
    expect(a.timbres.ordreZ).toEqual(["timbre.lynx_boreal", id]);
    a = poserTimbre(a, "timbre.lynx_boreal", 0, 0, -3);
    expect(a.timbres.placements["timbre.lynx_boreal"].x).toBeCloseTo(1 / 12);
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

/* ── Placement manuel du classeur (recette 2026-09-03) ── */
describe("slotsDuClasseur / deplacerCarte", () => {
  const cartes = piecesDe("classeur");
  const c0 = cartes[0].id; // ordre 0
  const c1 = cartes[1].id; // ordre 1

  function albumsAvecCartes(slots?: Record<string, number>) {
    const base = initAlbums();
    return {
      ...base,
      classeur: { achete: true, pieces: { [c0]: 1, [c1]: 1 }, nouvelles: [], ...(slots ? { slots } : {}) },
    };
  }

  it("sans `slots` (vieille save) : chaque carte occupe l'emplacement de son ordre", () => {
    const slots = slotsDuClasseur(albumsAvecCartes().classeur);
    expect(slots[c0]).toBe(0);
    expect(slots[c1]).toBe(1);
  });

  it("`slots` matérialisé : une carte absente est EN VRAC, pas dérivée", () => {
    const classeur = albumsAvecCartes({ [c1]: 0 }).classeur;
    const slots = slotsDuClasseur(classeur);
    expect(slots[c1]).toBe(0);
    expect(c0 in slots).toBe(false);
    expect(cartesEnVrac(classeur)).toEqual([c0]);
  });

  it("sans `slots`, rien n'est en vrac (toutes posées par ordre)", () => {
    expect(cartesEnVrac(albumsAvecCartes().classeur)).toEqual([]);
  });

  it("ajouterPiece matérialise `slots` : la NOUVELLE carte arrive en vrac, les anciennes restent posées", () => {
    const suite = ajouterPiece(albumsAvecCartes(), cartes[2].id);
    expect(suite.classeur.slots).toEqual({ [c0]: 0, [c1]: 1 });
    expect(cartesEnVrac(suite.classeur)).toEqual([cartes[2].id]);
  });

  it("poser une carte du vrac sur un slot occupé : l'occupante part en vrac", () => {
    const albums = albumsAvecCartes({ [c1]: 3 }); // c0 en vrac
    const suite = deplacerCarte(albums, c0, 3);
    expect(suite.classeur.slots).toEqual({ [c0]: 3 });
    expect(cartesEnVrac(suite.classeur)).toEqual([c1]);
  });

  it("rendreCarteAuBac retire la carte de son slot", () => {
    const suite = rendreCarteAuBac(albumsAvecCartes(), c0);
    expect(suite.classeur.slots).toEqual({ [c1]: 1 });
    expect(cartesEnVrac(suite.classeur)).toEqual([c0]);
  });

  it("deplacerCarte pose la carte pile sur le slot demandé et matérialise le reste", () => {
    const suite = deplacerCarte(albumsAvecCartes(), c0, 17);
    expect(suite.classeur.slots).toEqual({ [c0]: 17, [c1]: 1 });
  });

  it("slot occupé par une autre carte : ÉCHANGE", () => {
    const suite = deplacerCarte(albumsAvecCartes(), c0, 1);
    expect(suite.classeur.slots).toEqual({ [c0]: 1, [c1]: 0 });
  });

  it("slot hors bornes, carte non possédée ou id de timbre : inchangé", () => {
    const albums = albumsAvecCartes();
    expect(deplacerCarte(albums, c0, -1)).toBe(albums);
    expect(deplacerCarte(albums, c0, 54)).toBe(albums);
    expect(deplacerCarte(albums, cartes[10].id, 3)).toBe(albums);
    expect(deplacerCarte(albums, "timbre.renard_roux", 3)).toBe(albums);
  });

  it("déplacer une carte sur son propre slot : inchangé", () => {
    const albums = albumsAvecCartes();
    expect(deplacerCarte(albums, c0, 0)).toBe(albums);
  });
});
