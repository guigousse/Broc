import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { controlerFichier, resumerControles } from "./controle.mjs";

let dossier;
const f = (n) => path.join(dossier, n);

beforeAll(async () => {
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), "appstore-controle-"));
  const fond = { create: { width: 1242, height: 2688, channels: 3, background: "#1e1208" } };
  await sharp(fond).png().toFile(f("bon.png"));
  await sharp({ create: { ...fond.create, width: 1000 } }).png().toFile(f("petit.png"));
  await sharp({ create: { ...fond.create, channels: 4, background: "#1e120880" } })
    .png().toFile(f("alpha.png"));
  await sharp(fond).toColorspace("b-w").png().toFile(f("non-srgb.png"));
});

afterAll(async () => { await fs.rm(dossier, { recursive: true, force: true }); });

const ATTENDU = { width: 1242, height: 2688 };

describe("contrôle des visuels produits", () => {
  it("accepte un PNG aux bonnes dimensions et sans alpha", async () => {
    const r = await controlerFichier(f("bon.png"), ATTENDU);
    expect(r.ok).toBe(true);
    expect(r.problemes).toEqual([]);
  });

  it("refuse de mauvaises dimensions et le dit", async () => {
    const r = await controlerFichier(f("petit.png"), ATTENDU);
    expect(r.ok).toBe(false);
    expect(r.problemes.join(" ")).toMatch(/1000/);
    expect(r.problemes.join(" ")).toMatch(/1242/);
  });

  it("refuse un canal alpha — Apple rejette la transparence", async () => {
    const r = await controlerFichier(f("alpha.png"), ATTENDU);
    expect(r.ok).toBe(false);
    expect(r.problemes.join(" ")).toMatch(/alpha|transparen/i);
  });

  it("signale un fichier absent au lieu de lever", async () => {
    const r = await controlerFichier(f("fantome.png"), ATTENDU);
    expect(r.ok).toBe(false);
    expect(r.problemes.join(" ")).toMatch(/introuvable/i);
  });

  it("refuse un espace colorimétrique non-sRGB", async () => {
    const r = await controlerFichier(f("non-srgb.png"), ATTENDU);
    expect(r.ok).toBe(false);
    expect(r.problemes.join(" ")).toMatch(/srgb|espace|colorim/i);
  });

  it("résume en comptant les fichiers en défaut", () => {
    const texte = resumerControles([
      { fichier: "a.png", ok: true, problemes: [] },
      { fichier: "b.png", ok: false, problemes: ["canal alpha présent"] },
    ]);
    expect(texte).toMatch(/1\s*\/\s*2/);
    expect(texte).toContain("b.png");
    expect(texte).toContain("canal alpha");
  });
});
