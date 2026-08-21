import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getCelebriteIllustration,
  getCelebriteIllustrationFache,
  getVendeurIllustration,
  getVendeurIllustrationFache,
} from "./personaIllustrations";
import { CELEBRITES } from "@/data/celebrites";
import { EXPEDITEURS } from "@/data/expediteursCourrier";

const ARCHETYPES = [
  "naif", "bonhomme", "mamie", "malin", "grincheux", "antiquaire",
  "pipelette", "videcave", "bonimenteur", "disquaire",
  "joueur", "setdesigner", "modeuse", "esthete",
] as const;

describe("illustrations des commanditaires vendeurs", () => {
  const CAS = [
    { arch: "joueur", expediteur: "jeux-video", fache: "/personas/commanditaires/jeux-video-fache.webp" },
    { arch: "setdesigner", expediteur: "set-designer", fache: "/personas/commanditaires/set-designer-fache.webp" },
    { arch: "modeuse", expediteur: "mode", fache: "/personas/commanditaires/mode-fache.webp" },
    { arch: "esthete", expediteur: "art", fache: "/personas/commanditaires/art-fache.webp" },
  ] as const;

  it("le calme pointe sur l'avatar du commanditaire (pas le placeholder)", () => {
    for (const { arch, expediteur } of CAS) {
      const avatar = EXPEDITEURS[expediteur].avatar;
      expect(avatar).toBeTruthy();
      expect(getVendeurIllustration(arch)).toBe(avatar);
      expect(getVendeurIllustration(arch)).not.toBe("/personas/vendeur-mystere.webp");
    }
  });

  it("le fâché pointe sur la variante fâchée, distincte du calme", () => {
    for (const { arch, fache } of CAS) {
      expect(getVendeurIllustrationFache(arch)).toBe(fache);
      expect(getVendeurIllustrationFache(arch)).not.toBe(getVendeurIllustration(arch));
    }
  });
});

describe("fichiers d'illustration présents dans public/", () => {
  it("chaque chemin référencé (hors placeholders) existe sur le disque", () => {
    for (const arch of ARCHETYPES) {
      for (const chemin of [getVendeurIllustration(arch), getVendeurIllustrationFache(arch)]) {
        expect(chemin).toBeTruthy();
        expect(existsSync(join(process.cwd(), "public", chemin as string)), `fichier manquant : ${chemin}`).toBe(true);
      }
    }
  });
});

describe("célébrités du carnet mondain", () => {
  it("les 19 noms de data/celebrites.ts résolvent TOUS un portrait, calme et fâché", () => {
    // Ce test est la vraie garde du sujet. La gazette affichait un « ? » à la
    // place du portrait ; la table de slugs vit dans personaIllustrations.ts et
    // les noms dans data/celebrites.ts, sans rien qui les relie. Renommer une
    // célébrité côté données remettrait le « ? » en silence — aucun type, aucun
    // lint, aucun test ne l'aurait vu.
    expect(CELEBRITES.length).toBeGreaterThan(0);
    for (const nom of CELEBRITES) {
      const calme = getCelebriteIllustration(nom);
      const fache = getCelebriteIllustrationFache(nom);
      expect(calme, `aucun portrait pour « ${nom} »`).toBeTruthy();
      expect(fache, `aucun portrait fâché pour « ${nom} »`).toBeTruthy();
      for (const chemin of [calme, fache]) {
        expect(
          existsSync(join(process.cwd(), "public", chemin as string)),
          `fichier manquant : ${chemin}`,
        ).toBe(true);
      }
    }
  });

  it("un nom inconnu ne résout rien (le « ? » de repli reste possible)", () => {
    expect(getCelebriteIllustration("un nom qui n'existe pas")).toBeUndefined();
    expect(getCelebriteIllustrationFache("un nom qui n'existe pas")).toBeUndefined();
  });
});
