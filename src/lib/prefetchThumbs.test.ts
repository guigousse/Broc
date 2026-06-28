import { afterEach, describe, expect, it, vi } from "vitest";
import { thumbUrlsForSlots, prefetchThumbs } from "./prefetchThumbs";
import type { CollectionSlot } from "@/types/game";

function slot(templateId: string): CollectionSlot {
  return {
    templateId,
    nom: templateId,
    categorie: "Bricolage",
    rarete: "commun",
    vu: true,
    dejaPossede: true,
    donation: null,
  } as CollectionSlot;
}

afterEach(() => vi.restoreAllMocks());

describe("thumbUrlsForSlots", () => {
  it("ne garde que les items avec image, mappe vers /items/thumbs et déduplique", () => {
    const urls = thumbUrlsForSlots([
      slot("br.scie_egoine_de_charpentier"), // a une image
      slot("legacy-sans-image"), // pas d'image → ignoré
      slot("br.scie_egoine_de_charpentier"), // doublon → ignoré
      slot("br.marteau_menuisier"), // a une image
    ]);
    expect(urls).toEqual([
      "/items/thumbs/br.scie_egoine_de_charpentier.webp",
      "/items/thumbs/br.marteau_menuisier.webp",
    ]);
  });

  it("renvoie [] pour une liste vide", () => {
    expect(thumbUrlsForSlots([])).toEqual([]);
  });
});

describe("prefetchThumbs", () => {
  it("lance un fetch par URL (best-effort)", () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null));
    prefetchThumbs(["/items/thumbs/a.webp", "/items/thumbs/b.webp"]);
    // concurrence par défaut (6) ≥ 2 URLs → les 2 fetch partent immédiatement.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith("/items/thumbs/a.webp", {
      cache: "force-cache",
    });
  });

  it("ne fait rien pour une liste vide", () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null));
    prefetchThumbs([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
