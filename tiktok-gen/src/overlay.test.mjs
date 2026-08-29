import { describe, expect, it } from "vitest";
import { dessinerOverlay, policeCss, texteCouche } from "./overlay.js";

describe("policeCss", () => {
  it("graisse, taille, famille — Verve Shadow sans graisse, Système = police du téléphone", () => {
    expect(policeCss({ police: "Cinzel", taille: 64, gras: true })).toBe("600 64px 'Cinzel'");
    expect(policeCss({ police: "Cinzel", taille: 40, gras: false })).toBe("40px 'Cinzel'");
    expect(policeCss({ police: "Verve Shadow", taille: 200, gras: true })).toBe("200px 'Verve Shadow'");
    expect(policeCss({ police: "Système", taille: 30, gras: true })).toBe("600 30px -apple-system, system-ui, sans-serif");
  });
});

describe("texteCouche", () => {
  it("remplace {n}, {nom} et {prix}", () => {
    expect(texteCouche({ texte: "+ {n} objets" }, 391)).toBe("+ 391 objets");
    expect(texteCouche({ texte: "{nom} · {prix}" }, { nbAutres: 3, cible: { nom: "Marteau", prix: 1200 } })).toBe("Marteau · 1\u202f200\u202f€");
    expect(texteCouche({ texte: "{nom}" }, {})).toBe("");
  });
});

describe("dessinerOverlay", () => {
  it("peint les textes APRÈS les badges : un texte glissé sur les badges passe devant", () => {
    const appels = [];
    const ctx = new Proxy({}, {
      get: (_, nom) => {
        if (nom === "measureText") return () => ({ width: 10 });
        if (nom === "createRadialGradient") return () => ({ addColorStop() {} });
        return (...args) => { appels.push([nom, args]); };
      },
      set: () => true,
    });
    const badge = { naturalWidth: 300, naturalHeight: 100 };
    dessinerOverlay(ctx, { badges: { appStore: badge, googlePlay: badge }, cible: null, nbAutres: 0,
      textes: [{ id: "a", texte: "Ma légende", x: 540, y: 1700, police: "Cinzel", taille: 40, couleur: "ivoire", gras: true }] });
    const iBadge = appels.findIndex(([nom, args]) => nom === "drawImage" && args[0] === badge);
    const iTexte = appels.findIndex(([nom, args]) => nom === "fillText" && args[0] === "Ma légende");
    expect(iBadge).toBeGreaterThanOrEqual(0);
    expect(iTexte).toBeGreaterThan(iBadge);
  });
});
