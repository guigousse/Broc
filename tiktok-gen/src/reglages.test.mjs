import { describe, expect, it } from "vitest";
import { REGLAGES_DEFAUT, normaliserReglages, chargerReglages, sauverReglages, consigneParDefaut, nouveauTexte } from "./reglages.js";

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
    expect(d.map((c) => c.id)).toEqual(["sous-titre", "objet", "autres", "dispo"]);
    expect(d[1].texte).toBe("{nom} · {prix}");
    expect(d[0]).toMatchObject({ texte: "Le jeu de brocante", x: 540, y: 520, police: "Cinzel", taille: 64 });
    const m = normaliserReglages({ sousTitre: "Yo", texteAutres: "", texteDispo: "x".repeat(100) }).textes;
    expect(m.map((c) => c.id)).toEqual(["sous-titre", "objet", "dispo"]);
    expect(m[0].texte).toBe("Yo"); expect(m[2].texte).toHaveLength(80);
  });
  it("calques de texte : liste normalisée, bornée, sans entrée invalide", () => {
    const r = normaliserReglages({ textes: [
      { id: "a", texte: "A", x: -5, y: 5000, police: "Comic", taille: 999, couleur: "rose", gras: 0 },
      { texte: "sans id" }, null,
    ] }).textes;
    expect(r.map((c) => c.id)).toEqual(["a", "objet"]);   // le calque objet est ajouté aux sauvegardes qui ne l'ont pas
    expect(r[0]).toEqual({ id: "a", texte: "A", x: 0, y: 1920, police: "Cinzel", taille: 220, couleur: "ivoire", gras: false });
    expect(normaliserReglages({ textes: [] }).textes.map((c) => c.id)).toEqual(["objet"]);
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
