import { describe, expect, it } from "vitest";
import { MIMES, choisirMime, nomFichierPour } from "./enregistreur.js";

describe("choisirMime", () => {
  it("préfère le mp4 h264/aac quand tout est supporté (Safari)", () => {
    expect(choisirMime(() => true)).toBe("video/mp4;codecs=avc1,mp4a.40.2");
  });
  it("retombe sur le premier supporté de la liste (Chrome : webm vp9)", () => {
    expect(choisirMime((m) => m.startsWith("video/webm"))).toBe("video/webm;codecs=vp9,opus");
  });
  it("retombe sur le mp4 nu si les codecs explicites sont refusés", () => {
    expect(choisirMime((m) => m === "video/mp4" || m === "video/webm")).toBe("video/mp4");
  });
  it("rend null si rien n'est supporté", () => {
    expect(choisirMime(() => false)).toBeNull();
  });
  it("interroge les mimes dans l'ordre de préférence, sans doublon", () => {
    const vus = [];
    choisirMime((m) => { vus.push(m); return false; });
    expect(vus).toEqual(MIMES);
    expect(new Set(MIMES).size).toBe(MIMES.length);
  });
});

describe("nomFichierPour", () => {
  it("mp4 pour un mime mp4, codecs compris", () => {
    expect(nomFichierPour("lampe-art-deco", "video/mp4;codecs=avc1,mp4a.40.2"))
      .toBe("broc-roulette-lampe-art-deco.mp4");
    expect(nomFichierPour("lampe-art-deco", "video/mp4")).toBe("broc-roulette-lampe-art-deco.mp4");
  });
  it("webm pour tout le reste", () => {
    expect(nomFichierPour("vinyle", "video/webm;codecs=vp9,opus")).toBe("broc-roulette-vinyle.webm");
    expect(nomFichierPour("vinyle", null)).toBe("broc-roulette-vinyle.webm");
  });
  it("assainit l'identifiant : rien qui puisse casser un nom de fichier", () => {
    expect(nomFichierPour("Miroir/Doré 2", "video/mp4")).toBe("broc-roulette-miroir-dore-2.mp4");
  });
  it("sans cible, un nom générique plutôt qu'un trou", () => {
    expect(nomFichierPour(null, "video/mp4")).toBe("broc-roulette.mp4");
    expect(nomFichierPour("", "video/webm")).toBe("broc-roulette.webm");
  });
});
