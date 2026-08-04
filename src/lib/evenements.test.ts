import { describe, expect, it } from "vitest";
import {
  ID_GRANDE_BRADERIE,
  brocantesVisiblesAuJour,
  estGrandeBraderie,
  estJourBraderie,
  prochaineBraderie,
  samediBraderie,
} from "@/lib/evenements";
import { dateForJour } from "@/lib/calendrier";

describe("samediBraderie", () => {
  it("retourne le 1ᵉʳ samedi de septembre 1924 (jour 93)", () => {
    expect(samediBraderie(1924)).toBe(93);
    const d = dateForJour(93);
    expect(d.getUTCMonth()).toBe(8);
    expect(d.getUTCDate()).toBe(6);
    expect(d.getUTCDay()).toBe(6); // samedi
  });

  it("tombe toujours un samedi de septembre entre le 1ᵉʳ et le 7 (10 années)", () => {
    for (let annee = 1924; annee < 1934; annee++) {
      const d = dateForJour(samediBraderie(annee));
      expect(d.getUTCDay()).toBe(6);
      expect(d.getUTCMonth()).toBe(8);
      expect(d.getUTCDate()).toBeGreaterThanOrEqual(1);
      expect(d.getUTCDate()).toBeLessThanOrEqual(7);
    }
  });
});

describe("estJourBraderie", () => {
  it("vrai le samedi et le dimanche de la braderie, faux autour", () => {
    expect(estJourBraderie(92)).toBe(false);
    expect(estJourBraderie(93)).toBe(true); // samedi
    expect(estJourBraderie(94)).toBe(true); // dimanche
    expect(estJourBraderie(95)).toBe(false);
  });

  it("exactement 2 jours de braderie par année de jeu (vérifié sur 3 ans)", () => {
    let count = 0;
    for (let jour = 1; jour <= 3 * 365; jour++) {
      if (estJourBraderie(jour)) count += 1;
    }
    expect(count).toBe(6);
  });
});

describe("prochaineBraderie", () => {
  it("retourne le samedi à venir depuis le début de partie", () => {
    expect(prochaineBraderie(1)).toBe(93);
  });
  it("retourne le samedi courant pendant la braderie (samedi et dimanche)", () => {
    expect(prochaineBraderie(93)).toBe(93);
    expect(prochaineBraderie(94)).toBe(93);
  });
  it("bascule sur l'année suivante dès le lundi", () => {
    const suivant = prochaineBraderie(95);
    expect(suivant).toBeGreaterThan(94);
    expect(estJourBraderie(suivant)).toBe(true);
    expect(dateForJour(suivant).getUTCFullYear()).toBe(1925);
  });
});

describe("estGrandeBraderie", () => {
  it("matche uniquement l'id de la braderie", () => {
    expect(estGrandeBraderie({ id: ID_GRANDE_BRADERIE })).toBe(true);
    expect(estGrandeBraderie({ id: "vide-grenier-quartier" })).toBe(false);
  });
});

describe("brocantesVisiblesAuJour", () => {
  it("brocantesVisiblesAuJour masque la braderie hors braderie", () => {
    const liste = [{ id: "vide-grenier-quartier" }, { id: ID_GRANDE_BRADERIE }];
    expect(brocantesVisiblesAuJour(liste, 92).map((b) => b.id)).toEqual(["vide-grenier-quartier"]);
    expect(brocantesVisiblesAuJour(liste, 93).map((b) => b.id)).toEqual([
      "vide-grenier-quartier",
      ID_GRANDE_BRADERIE,
    ]);
  });
});
