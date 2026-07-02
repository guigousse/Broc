import { describe, expect, it } from "vitest";
import {
  getVendeurIllustration,
  getVendeurIllustrationFache,
} from "./personaIllustrations";
import { EXPEDITEURS } from "@/data/expediteursCourrier";

describe("illustrations des commanditaires vendeurs", () => {
  const CAS = [
    { arch: "joueur", expediteur: "jeux-video" },
    { arch: "setdesigner", expediteur: "set-designer" },
    { arch: "modeuse", expediteur: "mode" },
    { arch: "esthete", expediteur: "art" },
  ] as const;

  it("calme et fâché pointent sur l'avatar du commanditaire (pas le placeholder)", () => {
    for (const { arch, expediteur } of CAS) {
      const avatar = EXPEDITEURS[expediteur].avatar;
      expect(avatar).toBeTruthy();
      expect(getVendeurIllustration(arch)).toBe(avatar);
      expect(getVendeurIllustrationFache(arch)).toBe(avatar);
      expect(getVendeurIllustration(arch)).not.toBe("/personas/vendeur-mystere.webp");
    }
  });
});
