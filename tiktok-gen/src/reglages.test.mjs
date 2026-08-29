import { describe, expect, it } from "vitest";
import { REGLAGES_DEFAUT, normaliserReglages, chargerReglages, sauverReglages, consigneParDefaut, nouveauTexte, deplacerTexte } from "./reglages.js";

const memoire = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

describe("normaliserReglages", () => {
  it("borne les valeurs", () => {
    const r = normaliserReglages({ vitesse: 9, espacement: 10, nbPassages: 0, largeurFlash: 100 });
    expect(r.vitesse).toBe(4);
    expect(r.espacement).toBe(400);
    expect(r.nbPassages).toBe(2);
    expect(r.largeurFlash).toBe(8);
  });
  it("la cible doit faire partie des objets", () => {
    expect(normaliserReglages({ objets: ["a"], cible: "z" }).cible).toBeNull();
    expect(normaliserReglages({ objets: ["a"], cible: "a" }).cible).toBe("a");
  });
  it("borne la saturation du fond entre 0 et 200 %, entier, 100 par défaut", () => {
    expect(normaliserReglages({ saturation: 350 }).saturation).toBe(200);
    expect(normaliserReglages({ saturation: -1 }).saturation).toBe(0);
    expect(normaliserReglages({ saturation: 49.6 }).saturation).toBe(50);
    expect(normaliserReglages({}).saturation).toBe(100);
  });
  it("borne le flou entre 0 et 40 px, entier", () => {
    expect(normaliserReglages({ flou: 99 }).flou).toBe(40);
    expect(normaliserReglages({ flou: -3 }).flou).toBe(0);
    expect(normaliserReglages({ flou: 12.6 }).flou).toBe(13);
    expect(normaliserReglages({}).flou).toBe(0);
  });
  it("type de vidéo et réglages du ralenti bornés", () => {
    expect(normaliserReglages({}).type).toBe("pause");
    expect(normaliserReglages({ type: "ralentie" }).type).toBe("ralentie");
    expect(normaliserReglages({ type: "n'importe quoi" }).type).toBe("pause");
    expect(normaliserReglages({ nbTours: 99, dureeDefilement: 1, arretFinal: 9 })).toMatchObject({ nbTours: 6, dureeDefilement: 3, arretFinal: 5 });
    expect(normaliserReglages({})).toMatchObject({ nbTours: 3, dureeDefilement: 8, arretFinal: 2 });
  });
  it("liseré de la silhouette borné 0–30, défaut 17", () => {
    expect(normaliserReglages({}).liseret).toBe(17);
    expect(normaliserReglages({ liseret: 99 }).liseret).toBe(30);
    expect(normaliserReglages({ liseret: -1 }).liseret).toBe(0);
  });
  it("calques de texte : les trois d'origine par défaut, migration des anciens champs", () => {
    const d = normaliserReglages({}).textes;
    expect(d.map((c) => c.id)).toEqual(["sous-titre", "nom", "prix", "autres", "dispo"]);
    expect(d[1].texte).toBe("{nom}"); expect(d[2]).toMatchObject({ texte: "{prix}", couleur: "laiton", taille: 68 });
    expect(d[2].y).toBeGreaterThan(d[1].y);
    expect(d[0]).toMatchObject({ texte: "Le jeu de brocante", x: 540, y: 520, police: "Cinzel", taille: 64 });
    const m = normaliserReglages({ sousTitre: "Yo", texteAutres: "", texteDispo: "x".repeat(100) }).textes;
    expect(m.map((c) => c.id)).toEqual(["sous-titre", "nom", "prix", "dispo"]);
    expect(m[0].texte).toBe("Yo"); expect(m[3].texte).toHaveLength(80);
  });
  it("calques de texte : liste normalisée, bornée, sans entrée invalide", () => {
    const r = normaliserReglages({ textes: [
      { id: "a", texte: "A", x: -5, y: 5000, police: "Comic", taille: 999, couleur: "rose", gras: 0 },
      { texte: "sans id" }, null,
    ] }).textes;
    expect(r.map((c) => c.id)).toEqual(["a", "nom", "prix"]);   // nom et prix sont ajoutés aux sauvegardes qui ne les ont pas
    expect(r[0]).toEqual({ id: "a", texte: "A", x: 0, y: 1920, police: "Cinzel", taille: 220, couleur: "ivoire", gras: false });
    expect(normaliserReglages({ textes: [] }).textes.map((c) => c.id)).toEqual(["nom", "prix"]);
    expect(normaliserReglages({ textes: [{ id: "z", texte: "Prix : {prix}" }] }).textes.map((c) => c.id)).toEqual(["z"]);
  });
  it("complète avec les défauts", () => expect(normaliserReglages({}).consigne).toBe(REGLAGES_DEFAUT.consigne));
});

describe("localStorage", () => {
  it("aller-retour", () => {
    const s = memoire();
    sauverReglages(s, { ...REGLAGES_DEFAUT, vitesse: 3 });
    expect(chargerReglages(s).vitesse).toBe(3);
  });
  it("stockage vide ou corrompu → défauts", () => {
    const s = memoire();
    s.setItem("broc-tiktok-gen", "{oops");
    expect(chargerReglages(s)).toEqual(REGLAGES_DEFAUT);
    expect(chargerReglages(memoire())).toEqual(REGLAGES_DEFAUT);
  });
  it("fondPerso trop lourd (> 2 000 000 caractères) n'est pas persisté", () => {
    const s = memoire();
    const enorme = "x".repeat(2_000_001);
    sauverReglages(s, { ...REGLAGES_DEFAUT, fondPerso: enorme });
    expect(chargerReglages(s).fondPerso).toBeNull();
  });
});

it("consigneParDefaut", () => expect(consigneParDefaut("la lampe")).toBe("Mets pause sur la lampe !"));

describe("nouveauTexte", () => {
  it("ids distincts, calque au centre, taille 56", () => {
    const a = nouveauTexte(), b = nouveauTexte("B");
    expect(a.id).not.toBe(b.id);
    expect(a).toMatchObject({ x: 540, taille: 56, police: "Cinzel" });
    expect(b.texte).toBe("B");
  });
});

describe("migration du calque « {nom} · {prix} »", () => {
  it("devient nom puis prix, et la pile intacte descend", () => {
    const r = normaliserReglages({ textes: [
      { id: "sous-titre", texte: "S", x: 540, y: 520 },
      { id: "objet", texte: "{nom} · {prix}", x: 540, y: 1226 },
      { id: "autres", texte: "+ {n}", x: 540, y: 1284, taille: 40 },
      { id: "dispo", texte: "D", x: 540, y: 1358, taille: 46 },
    ] }).textes;
    expect(r.map((c) => c.id)).toEqual(["sous-titre", "nom", "prix", "autres", "dispo"]);
    expect(r[3]).toMatchObject({ y: 1346, taille: 36 }); expect(r[4]).toMatchObject({ y: 1396, taille: 38 });
    // Un calque déjà déplacé à la main ne bouge pas.
    const d = normaliserReglages({ textes: [{ id: "objet", texte: "{nom} · {prix}" }, { id: "dispo", texte: "D", y: 1000, taille: 46 }] }).textes;
    expect(d.find((c) => c.id === "dispo")).toMatchObject({ y: 1000, taille: 46 });
  });
});

describe("deplacerTexte", () => {
  const pile = () => [{ id: "a" }, { id: "b" }, { id: "c" }];   // c = dessiné en dernier = devant
  it("+1 avance d'un cran (vers la fin du tableau), −1 recule", () => {
    const t = pile();
    expect(deplacerTexte(t, "a", +1)).toBe(true);
    expect(t.map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(deplacerTexte(t, "c", -1)).toBe(true);
    expect(t.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });
  it("ne bouge pas en bout de pile ni pour un id inconnu", () => {
    const t = pile();
    expect(deplacerTexte(t, "c", +1)).toBe(false);
    expect(deplacerTexte(t, "a", -1)).toBe(false);
    expect(deplacerTexte(t, "zz", +1)).toBe(false);
    expect(t.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("réglages « Devine le prix »", () => {
  it("type accepté, durées bornées, dernier mystère booléen strict", () => {
    const r = normaliserReglages({ type: "devine", dureeCompte: 9, dureeRevele: 0.2, dernierMystere: "oui" });
    expect(r.type).toBe("devine");
    expect(r.dureeCompte).toBe(5);
    expect(r.dureeRevele).toBe(1);
    expect(r.dernierMystere).toBe(false);
    expect(normaliserReglages({}).dureeCompte).toBe(3);
    expect(normaliserReglages({ type: "n'importe" }).type).toBe("pause");
  });
});
