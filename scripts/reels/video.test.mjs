import { describe, expect, it, vi } from "vitest";
import { attendreOperation, genererVideo, nomPrise, prochainTake } from "./video.mjs";

describe("prochainTake", () => {
  it("part de 1 quand rien n'existe", () => {
    expect(prochainTake([], "ep01-p1")).toBe(1);
  });

  it("suit la plus haute prise existante", () => {
    const fichiers = ["ep01-p1-take1.mp4", "ep01-p1-take3.mp4", "ep01-p2-take9.mp4", "autre.txt"];
    expect(prochainTake(fichiers, "ep01-p1")).toBe(4);
  });

  it("ne confond pas deux épisodes de préfixe voisin", () => {
    expect(prochainTake(["ep01-bis-p1-take7.mp4"], "ep01-p1")).toBe(1);
  });
});

describe("nomPrise", () => {
  it("compose le nom de fichier d'une prise", () => {
    expect(nomPrise("ep01", 2, 3)).toBe("ep01-p2-take3.mp4");
  });
});

describe("attendreOperation", () => {
  it("sonde jusqu'à ce que l'opération soit terminée", async () => {
    const getVideosOperation = vi
      .fn()
      .mockResolvedValueOnce({ done: false })
      .mockResolvedValueOnce({ done: true, response: { generatedVideos: [{ video: { uri: "u" } }] } });
    const dormir = vi.fn().mockResolvedValue(undefined);

    const finale = await attendreOperation({
      ai: { operations: { getVideosOperation } },
      operation: { done: false },
      dormir,
      journaliser: () => {},
    });

    expect(getVideosOperation).toHaveBeenCalledTimes(2);
    expect(dormir).toHaveBeenCalledTimes(2);
    expect(finale.response.generatedVideos[0].video.uri).toBe("u");
  });

  it("jette quand l'opération finit en erreur", async () => {
    await expect(
      attendreOperation({
        ai: { operations: { getVideosOperation: vi.fn() } },
        operation: { done: true, error: { message: "quota dépassé" } },
        dormir: vi.fn(),
        journaliser: () => {},
      }),
    ).rejects.toThrow(/quota dépassé/);
  });
});

describe("genererVideo", () => {
  it("passe l'image de départ, l'aspect vertical et l'audio", async () => {
    const generateVideos = vi.fn().mockResolvedValue({
      done: true,
      response: { generatedVideos: [{ video: { uri: "u" } }] },
    });
    const video = await genererVideo({
      ai: { models: { generateVideos }, operations: { getVideosOperation: vi.fn() } },
      model: "veo-3.1-lite-generate-preview",
      prompt: "PROMPT",
      image: { imageBytes: "AAA", mimeType: "image/png" },
      definition: "720p",
      dormir: vi.fn(),
      journaliser: () => {},
    });

    expect(video.uri).toBe("u");
    expect(generateVideos).toHaveBeenCalledWith({
      model: "veo-3.1-lite-generate-preview",
      prompt: "PROMPT",
      image: { imageBytes: "AAA", mimeType: "image/png" },
      config: {
        aspectRatio: "9:16",
        resolution: "720p",
        numberOfVideos: 1,
        durationSeconds: 8,
        generateAudio: true,
        personGeneration: "allow_all",
      },
    });
  });

  it("jette quand aucune vidéo n'est rendue", async () => {
    await expect(
      genererVideo({
        ai: {
          models: { generateVideos: vi.fn().mockResolvedValue({ done: true, response: { generatedVideos: [] } }) },
          operations: { getVideosOperation: vi.fn() },
        },
        model: "m",
        prompt: "p",
        image: { imageBytes: "A", mimeType: "image/png" },
        definition: "720p",
        dormir: vi.fn(),
        journaliser: () => {},
      }),
    ).rejects.toThrow(/aucune vidéo/i);
  });
});
