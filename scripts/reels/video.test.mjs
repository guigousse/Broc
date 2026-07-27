import { describe, expect, it, vi } from "vitest";
import {
  attendreOperation,
  extraireSourceRaccord,
  genererVideo,
  nomJournalRaccord,
  nomPrise,
  prochainTake,
  reserverPrise,
} from "./video.mjs";

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

describe("reserverPrise", () => {
  it("prend le premier numéro estimé quand la réservation réussit du premier coup", async () => {
    const tryReserver = vi.fn().mockResolvedValue(true);
    const take = await reserverPrise({ fichiers: [], prefixe: "ep01-p1", tryReserver });
    expect(take).toBe(1);
    expect(tryReserver).toHaveBeenCalledTimes(1);
    expect(tryReserver).toHaveBeenCalledWith(1);
  });

  it("part de la plus haute prise existante, pas de zéro", async () => {
    const fichiers = ["ep01-p1-take1.mp4", "ep01-p1-take3.mp4"];
    const tryReserver = vi.fn().mockResolvedValue(true);
    const take = await reserverPrise({ fichiers, prefixe: "ep01-p1", tryReserver });
    expect(take).toBe(4);
    expect(tryReserver).toHaveBeenCalledWith(4);
  });

  it("passe au numéro suivant si une exécution concurrente a déjà pris le créneau", async () => {
    const tryReserver = vi
      .fn()
      .mockResolvedValueOnce(false) // take 1 déjà réservé par un autre process
      .mockResolvedValueOnce(false) // take 2 aussi
      .mockResolvedValueOnce(true); // take 3 libre
    const take = await reserverPrise({ fichiers: [], prefixe: "ep01-p1", tryReserver });
    expect(take).toBe(3);
    expect(tryReserver).toHaveBeenNthCalledWith(1, 1);
    expect(tryReserver).toHaveBeenNthCalledWith(2, 2);
    expect(tryReserver).toHaveBeenNthCalledWith(3, 3);
  });
});

describe("nomJournalRaccord", () => {
  it("compose le nom du journal de raccord d'un épisode", () => {
    expect(nomJournalRaccord("ep01-aquarelle")).toBe("ep01-aquarelle-raccord.json");
  });
});

describe("extraireSourceRaccord", () => {
  it("rend la prise source quand le journal est valide", () => {
    expect(extraireSourceRaccord({ prise: "ep01-aquarelle-p1-take2.mp4" })).toBe(
      "ep01-aquarelle-p1-take2.mp4",
    );
  });

  it("jette quand le champ prise est absent", () => {
    expect(() => extraireSourceRaccord({})).toThrow(/prise/i);
  });

  it("jette quand le journal lui-même est absent", () => {
    expect(() => extraireSourceRaccord(undefined)).toThrow(/prise/i);
  });

  it("jette quand le champ prise n'est pas une chaîne", () => {
    expect(() => extraireSourceRaccord({ prise: 42 })).toThrow(/prise/i);
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
