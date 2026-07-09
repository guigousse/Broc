// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  notifsRestauration,
  synchroniserNotifsRestauration,
} from "./restaurationNotif";
import { NOTIF_IDS } from "./ids";

describe("notifsRestauration (pur)", () => {
  it("une notif par objet non terminé, IDs 100..102, à finMs", () => {
    const now = 1000;
    const specs = notifsRestauration(
      [
        { templateId: "test.vase", nom: "Vase", finMs: 5000 },
        { templateId: "test.lampe", nom: "Lampe", finMs: 8000 },
      ],
      now,
      "fr",
    );
    expect(specs.map((s) => s.id)).toEqual([
      NOTIF_IDS.RESTAURATION[0],
      NOTIF_IDS.RESTAURATION[1],
    ]);
    expect(specs.map((s) => s.atMs)).toEqual([5000, 8000]);
    expect(specs[0].body).toContain("Vase");
    expect(specs[0].sound).toBe("marteau.wav");
  });

  it("ignore les objets déjà terminés (finMs <= now)", () => {
    expect(
      notifsRestauration(
        [{ templateId: "test.x", nom: "X", finMs: 500 }],
        1000,
        "fr",
      ),
    ).toHaveLength(0);
  });

  it("plafonne à 3 notifs (nombre d'IDs réservés)", () => {
    const objets = Array.from({ length: 5 }, (_, i) => ({
      templateId: `test.o${i}`,
      nom: `O${i}`,
      finMs: 10000 + i,
    }));
    expect(notifsRestauration(objets, 0, "fr")).toHaveLength(3);
  });
});

describe("synchroniserNotifsRestauration hors Tauri", () => {
  it("est un no-op sans lever", async () => {
    await expect(
      synchroniserNotifsRestauration(
        [{ templateId: "test.x", nom: "X", finMs: 9_999_999_999 }],
        0,
        "fr",
      ),
    ).resolves.toBeUndefined();
  });
});
