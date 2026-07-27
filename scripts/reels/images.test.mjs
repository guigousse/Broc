import { describe, expect, it, vi } from "vitest";
import { extraireImage, genererImage, partsAvecImages, trouverImageReference } from "./images.mjs";

const PNG_B64 = Buffer.from("faux-png").toString("base64");

describe("partsAvecImages", () => {
  it("place l'intro, puis les images dans l'ordre, puis le prompt", () => {
    const contents = partsAvecImages({
      texteIntro: "INTRO",
      images: [
        { mimeType: "image/png", data: "AAA" },
        { mimeType: "image/webp", data: "BBB" },
      ],
      prompt: "PROMPT",
    });
    const parts = contents[0].parts;
    expect(parts[0]).toEqual({ text: "INTRO" });
    expect(parts[1].inlineData.data).toBe("AAA");
    expect(parts[2].inlineData.data).toBe("BBB");
    expect(parts[3]).toEqual({ text: "PROMPT" });
  });
});

describe("extraireImage", () => {
  it("rend le premier inlineData en Buffer", () => {
    const buf = extraireImage({
      candidates: [{ content: { parts: [{ text: "blabla" }, { inlineData: { data: PNG_B64 } }] } }],
    });
    expect(buf.toString()).toBe("faux-png");
  });

  it("jette quand la réponse ne contient aucune image", () => {
    expect(() => extraireImage({ candidates: [{ content: { parts: [{ text: "refus" }] } }] })).toThrow(
      /image/i,
    );
  });
});

describe("trouverImageReference", () => {
  it("préfère le png quand plusieurs extensions sont présentes", () => {
    expect(
      trouverImageReference("_master-etal", ["_master-etal.png", "_master-etal.jpeg"]),
    ).toEqual({ nom: "_master-etal.png", mimeType: "image/png" });
  });

  it("accepte le jpeg exporté depuis Aperçu quand le png est absent", () => {
    expect(trouverImageReference("_master-etal", ["_master-etal.jpeg"])).toEqual({
      nom: "_master-etal.jpeg",
      mimeType: "image/jpeg",
    });
  });

  it("accepte le jpg", () => {
    expect(trouverImageReference("_master-etal", ["_master-etal.jpg"])).toEqual({
      nom: "_master-etal.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("accepte le webp", () => {
    expect(trouverImageReference("_master-etal", ["_master-etal.webp"])).toEqual({
      nom: "_master-etal.webp",
      mimeType: "image/webp",
    });
  });

  it("rend undefined si aucune extension connue n'est présente", () => {
    expect(
      trouverImageReference("_master-etal", ["_master-etal.gif", "autre-chose.png"]),
    ).toBeUndefined();
  });
});

describe("genererImage", () => {
  it("appelle le client avec la config d'aspect et rend le Buffer", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: PNG_B64 } }] } }],
    });
    const buf = await genererImage({
      ai: { models: { generateContent } },
      model: "gemini-3-pro-image",
      contents: "PROMPT",
      aspectRatio: "9:16",
      imageSize: "2K",
    });
    expect(buf.toString()).toBe("faux-png");
    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-3-pro-image",
      contents: "PROMPT",
      config: { imageConfig: { aspectRatio: "9:16", imageSize: "2K" } },
    });
  });
});
