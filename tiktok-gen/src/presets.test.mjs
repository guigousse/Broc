import { describe, expect, it } from "vitest";
import { REGLAGES_DEFAUT } from "./reglages.js";
import {
  CLE_PRESETS, appliquerPreset, chargerPreset, extrairePreset, nettoyerNom, nomsPresets, sauverPreset, supprimerPreset,
} from "./presets.js";

const memoire = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const T = [{ id: "sous-titre", texte: "Yo", x: 540, y: 520, police: "Cinzel", taille: 64, couleur: "ivoire", gras: true }];
const R = { ...REGLAGES_DEFAUT, objets: ["a", "b"], cible: "a", fond: "grange", fondPerso: "data:x", vitesse: 3, type: "ralentie", textes: T };

describe("extrairePreset / appliquerPreset", () => {
  it("exclut objets, cible et photo ; garde fond, curseurs, type, textes", () => {
    const p = extrairePreset(R);
    expect(p).not.toHaveProperty("objets"); expect(p).not.toHaveProperty("cible"); expect(p).not.toHaveProperty("fondPerso");
    expect(p).toMatchObject({ fond: "grange", vitesse: 3, type: "ralentie", textes: T });
  });
  it("appliquer garde la sélection courante et normalise", () => {
    const courant = { ...REGLAGES_DEFAUT, objets: ["z"], cible: "z", fondPerso: null };
    const r = appliquerPreset(courant, { vitesse: 99, type: "ralentie", textes: T });
    expect(r.objets).toEqual(["z"]); expect(r.cible).toBe("z");
    expect(r.vitesse).toBe(4); expect(r.type).toBe("ralentie"); expect(r.textes[0].texte).toBe("Yo");
  });
  it("un fond « perso » sans photo retombe sur le fond courant", () => {
    const courant = { ...REGLAGES_DEFAUT, fond: "grange", fondPerso: null };
    expect(appliquerPreset(courant, { fond: "perso" }).fond).toBe("grange");
    const avecPhoto = { ...REGLAGES_DEFAUT, fond: "grange", fondPerso: "data:x" };
    expect(appliquerPreset(avecPhoto, { fond: "perso" }).fond).toBe("perso");
  });
});

describe("stockage des préréglages", () => {
  it("sauver / lister triés / charger / supprimer", () => {
    const s = memoire();
    expect(sauverPreset(s, "  Reels  soir ", R)).toBe("Reels soir");
    expect(sauverPreset(s, "abc", R)).toBe("abc");
    expect(sauverPreset(s, "   ", R)).toBeNull();
    expect(nomsPresets(s)).toEqual(["abc", "Reels soir"]);
    expect(chargerPreset(s, "Reels soir")).toMatchObject({ vitesse: 3 });
    expect(chargerPreset(s, "inconnu")).toBeNull();
    expect(supprimerPreset(s, "abc")).toBe(true);
    expect(supprimerPreset(s, "abc")).toBe(false);
    expect(nomsPresets(s)).toEqual(["Reels soir"]);
  });
  it("remplace un nom existant, tolère un stockage corrompu", () => {
    const s = memoire();
    sauverPreset(s, "x", R); sauverPreset(s, "x", { ...R, vitesse: 2 });
    expect(chargerPreset(s, "x").vitesse).toBe(2);
    s.setItem(CLE_PRESETS, "{pas du json");
    expect(nomsPresets(s)).toEqual([]);
  });
  it("nettoyerNom tronque à 40", () => expect(nettoyerNom("a".repeat(60))).toHaveLength(40));
});
