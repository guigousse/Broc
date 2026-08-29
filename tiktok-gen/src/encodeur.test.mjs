import { describe, expect, it } from "vitest";
import { planImages, FPS_VIDEO, audioSpecificConfig, instantsSousImages, SOUS_IMAGES, attendreFileCourte, avecDelai, avecRepli } from "./encodeur.js";

describe("planImages", () => {
  it("60 images par seconde, dernière à duree − 1/fps, sans image de queue", () => {
    const p = planImages(6.7);
    expect(FPS_VIDEO).toBe(60);
    expect(p.nb).toBe(402);
    expect(p.images[0]).toEqual({ i: 0, t: 0, timestampUs: 0, cle: true });
    expect(p.images.at(-1).t).toBeCloseTo(6.7 - 1 / 60, 9);
    expect(p.dureeUs).toBe(6_700_000);
  });
  it("horodatages strictement croissants et régulièrement espacés", () => {
    const { images } = planImages(2);
    for (let i = 1; i < images.length; i++) {
      const d = images[i].timestampUs - images[i - 1].timestampUs;
      expect(d).toBeGreaterThanOrEqual(16_666); expect(d).toBeLessThanOrEqual(16_667);
    }
  });
  it("une image clé toutes les 2 s, la première comprise", () => {
    const { images } = planImages(5);
    expect(images.filter((x) => x.cle).map((x) => x.i)).toEqual([0, 120, 240]);
  });
  it("au moins une image, même pour une durée nulle", () => {
    expect(planImages(0).nb).toBe(1);
  });
});

describe("audioSpecificConfig", () => {
  it("AAC-LC 48 kHz mono = 0x11 0x88, 44,1 kHz stéréo = 0x12 0x10", () => {
    expect([...audioSpecificConfig(48000, 1)]).toEqual([0x11, 0x88]);
    expect([...audioSpecificConfig(44100, 2)]).toEqual([0x12, 0x10]);
  });
  it("refuse une fréquence hors table", () => expect(() => audioSpecificConfig(50000, 1)).toThrow());
});

describe("instantsSousImages", () => {
  it("une seule sous-image = l'instant exact (objets nets, pleine opacité)", () => {
    expect(SOUS_IMAGES).toBe(1);
    expect(instantsSousImages(1 / 60)).toEqual([1 / 60]);
  });
  it("n > 1 : instants centrés dans l'intervalle, tous dans [t, t + 1/fps)", () => {
    const t = 1 / 60;
    const xs = instantsSousImages(t, 60, 4);
    expect(xs).toHaveLength(4);
    expect(xs[0]).toBeCloseTo(t + 1 / 480, 12);
    expect(xs.at(-1)).toBeCloseTo(t + 7 / 480, 12);
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(t); expect(x).toBeLessThan(t + 1 / 60); }
  });
});

describe("attendreFileCourte", () => {
  it("revient tout de suite si la file est déjà courte", async () => {
    const enc = { encodeQueueSize: 1 };
    const debut = Date.now();
    await attendreFileCourte(enc, { max: 2, pasMs: 50 });
    expect(Date.now() - debut).toBeLessThan(40);
  });
  it("sonde la file sans dépendre d'un événement `dequeue`", async () => {
    const enc = { encodeQueueSize: 9 };   // aucun addEventListener : l'événement ne peut pas exister
    setTimeout(() => { enc.encodeQueueSize = 2; }, 30);
    await attendreFileCourte(enc, { max: 2, pasMs: 5 });
    expect(enc.encodeQueueSize).toBe(2);
  });
  it("abandonne après `maxMs` plutôt que d'attendre à jamais", async () => {
    const enc = { encodeQueueSize: 9 };
    const r = await attendreFileCourte(enc, { max: 2, pasMs: 5, maxMs: 30 });
    expect(r).toBe(false);
  });
});

describe("avecDelai", () => {
  it("rend la valeur de la promesse si elle arrive à temps", async () => {
    await expect(avecDelai(Promise.resolve(7), 100, "test")).resolves.toBe(7);
  });
  it("rejette en nommant l'étape quand le délai expire", async () => {
    const jamais = new Promise(() => {});
    await expect(avecDelai(jamais, 20, "finalisation vidéo")).rejects.toThrow(/finalisation vidéo/);
  });
});

describe("avecRepli", () => {
  it("valeur de la promesse à temps, sans repli", async () => {
    expect(await avecRepli(Promise.resolve("son"), 100, () => "silence")).toEqual({ valeur: "son", repli: false });
  });
  it("repli quand la promesse ne revient pas", async () => {
    expect(await avecRepli(new Promise(() => {}), 20, () => "silence")).toEqual({ valeur: "silence", repli: true });
  });
  it("une vraie erreur n'est pas masquée par le repli", async () => {
    await expect(avecRepli(Promise.reject(new Error("boum")), 100, () => "silence")).rejects.toThrow("boum");
  });
});
