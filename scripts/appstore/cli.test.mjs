import { describe, expect, it } from "vitest";
import { parserArgs } from "./cli.mjs";

describe("ligne de commande des visuels App Store", () => {
  it("produit tout par défaut", () => {
    const a = parserArgs([]);
    expect(a.langues).toEqual(["fr", "en", "es", "el"]);
    expect(a.appareils).toEqual(["iphone", "ipad"]);
    expect(a.visuels).toEqual([1, 2, 3, 4, 5]);
    expect(a.sauterCapture).toBe(false);
    expect(a.aide).toBe(false);
  });

  it("restreint les langues", () => {
    expect(parserArgs(["--lang=fr,en"]).langues).toEqual(["fr", "en"]);
  });

  it("restreint les appareils", () => {
    expect(parserArgs(["--device=ipad"]).appareils).toEqual(["ipad"]);
  });

  it("restreint les visuels et les trie", () => {
    expect(parserArgs(["--only=5,1"]).visuels).toEqual([1, 5]);
  });

  it("reconnaît --skip-capture et --help", () => {
    expect(parserArgs(["--skip-capture"]).sauterCapture).toBe(true);
    expect(parserArgs(["--help"]).aide).toBe(true);
  });

  it("rejette un drapeau inconnu", () => {
    expect(() => parserArgs(["--turbo"])).toThrow(/turbo/);
  });

  it("rejette une langue inconnue", () => {
    expect(() => parserArgs(["--lang=de"])).toThrow(/de/);
  });

  it("rejette un appareil inconnu", () => {
    expect(() => parserArgs(["--device=watch"])).toThrow(/watch/);
  });

  it("rejette un numéro de visuel hors bornes", () => {
    expect(() => parserArgs(["--only=9"])).toThrow(/9/);
  });

  it("rejette une valeur vide pour --lang", () => {
    expect(() => parserArgs(["--lang="])).toThrow(/langue vide/);
  });

  it("rejette une valeur vide pour --device", () => {
    expect(() => parserArgs(["--device="])).toThrow(/appareil vide/);
  });

  it("rejette une valeur vide pour --only", () => {
    expect(() => parserArgs(["--only="])).toThrow(/visuel vide/);
  });

  it("ignore les virgules superflues dans --only", () => {
    expect(parserArgs(["--only=1,,5"]).visuels).toEqual([1, 5]);
  });

  it("rejette une valeur non numérique dans --only", () => {
    expect(() => parserArgs(["--only=abc"])).toThrow(/invalide/);
  });

  it("trie explicitement les visuels en ordre croissant", () => {
    expect(parserArgs(["--only=5,3,1,4,2"]).visuels).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejette un argument positionnel", () => {
    expect(() => parserArgs(["abc"])).toThrow(/argument/);
  });
});
