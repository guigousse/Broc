import { describe, expect, it } from "vitest";
import { acheterAlbum, acheterPaquet, appliquerPaquet, PRIX_ALBUM, PRIX_PAQUET } from "@/lib/bazar/albums";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { initAlbums } from "@/lib/albums";

describe("Bazar — albums", () => {
  it("acheterAlbum débite 10 Ƶ et marque l'album acheté ; refuse sans jetons ; refuse un second achat", () => {
    expect(acheterAlbum(createMockGameState({ jetons: 9 }), "classeur")).toEqual({ ok: false, raison: "jetons" });
    const r = acheterAlbum(createMockGameState({ jetons: 12 }), "classeur");
    expect(r.ok && r.state.jetons).toBe(12 - PRIX_ALBUM);
    expect(r.ok && r.state.albums!.classeur.achete).toBe(true);
    expect(r.ok && acheterAlbum(r.state, "classeur")).toEqual({ ok: false, raison: "indisponible" });
  });

  it("acheterPaquet exige l'album, débite 5 Ƶ, range 3 pièces et les renvoie", () => {
    expect(acheterPaquet(createMockGameState({ jetons: 20 }), "timbres")).toEqual({ ok: false, raison: "indisponible" });
    const a = { ...initAlbums(), timbres: { ...initAlbums().timbres, achete: true } };
    const r = acheterPaquet(createMockGameState({ jetons: 20, albums: a }), "timbres", () => 0.2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.jetons).toBe(20 - PRIX_PAQUET);
    expect(r.pieces).toHaveLength(3);
    const total = Object.values(r.state.albums!.timbres.pieces).reduce((s, q) => s + q, 0);
    expect(total).toBe(3);
  });

  it("acheterPaquet refuse sans jetons", () => {
    const a = { ...initAlbums(), timbres: { ...initAlbums().timbres, achete: true } };
    expect(acheterPaquet(createMockGameState({ jetons: 4, albums: a }), "timbres")).toEqual({
      ok: false,
      raison: "jetons",
    });
  });

  it("appliquerPaquet rejoue exactement les ids donnés, mêmes contrôles que acheterPaquet", () => {
    expect(
      appliquerPaquet(createMockGameState({ jetons: 20 }), "timbres", ["timbre.faux"]),
    ).toEqual({ ok: false, raison: "indisponible" });

    const a = { ...initAlbums(), timbres: { ...initAlbums().timbres, achete: true } };
    expect(
      appliquerPaquet(createMockGameState({ jetons: 4, albums: a }), "timbres", ["timbre.faux"]),
    ).toEqual({ ok: false, raison: "jetons" });

    const r1 = acheterPaquet(createMockGameState({ jetons: 20, albums: a }), "timbres", () => 0.2);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = appliquerPaquet(createMockGameState({ jetons: 20, albums: a }), "timbres", r1.pieces!);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.state.jetons).toBe(20 - PRIX_PAQUET);
    expect(r2.pieces).toEqual(r1.pieces);
    expect(r2.state.albums!.timbres.pieces).toEqual(r1.state.albums!.timbres.pieces);
  });
});
