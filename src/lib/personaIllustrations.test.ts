import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getVendeurIllustration,
  getVendeurIllustrationFache,
} from "./personaIllustrations";
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
