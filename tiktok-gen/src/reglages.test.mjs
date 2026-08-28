import { describe, expect, it } from "vitest";
import { REGLAGES_DEFAUT, normaliserReglages, chargerReglages, sauverReglages, consigneParDefaut } from "./reglages.js";

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
  it("textes du flash : défauts, chaîne vide conservée (ligne masquée), tronqués à 80", () => {
    expect(normaliserReglages({}).sousTitre).toBe("Le jeu de brocante");
    expect(normaliserReglages({ texteAutres: "" }).texteAutres).toBe("");
    expect(normaliserReglages({ texteDispo: 42 }).texteDispo).toBe("Disponible gratuitement sur");
    expect(normaliserReglages({ sousTitre: "x".repeat(100) }).sousTitre).toHaveLength(80);
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
