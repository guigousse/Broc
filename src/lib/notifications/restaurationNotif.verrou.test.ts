// @vitest-environment jsdom
/**
 * Verrou de séquence de `synchroniserNotifsRestauration` : une exécution
 * partie d'un état PÉRIMÉ (préemptée pendant ses `await`) ne doit jamais
 * commiter ses échéances après une exécution plus récente — sinon la notif
 * « objet restauré » repart au mauvais moment (cf. le même verrou côté
 * énergie, `energieNotif.ts`).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotifSpec } from "./index";

const programmer = vi.fn<(spec: NotifSpec) => Promise<void>>();
const annuler = vi.fn<(ids: number[]) => Promise<void>>();

vi.mock("./index", () => ({
  programmer: (spec: NotifSpec) => programmer(spec),
  annuler: (ids: number[]) => annuler(ids),
  permissionAccordee: async () => true,
}));

import { synchroniserNotifsRestauration } from "./restaurationNotif";

/** Promesse déférée pour contrôler l'entrelacement des exécutions. */
function deferrer() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  programmer.mockReset();
  annuler.mockReset();
  programmer.mockResolvedValue(undefined);
});

describe("synchroniserNotifsRestauration — verrou de séquence", () => {
  it("une exécution périmée ne programme rien après une plus récente", async () => {
    const d1 = deferrer();
    const d2 = deferrer();
    annuler.mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise);

    // Exécution 1 (échéance périmée : 5000), suspendue sur son annulation.
    const run1 = synchroniserNotifsRestauration(
      [{ templateId: "test.vase", nom: "Vase", finMs: 5000 }],
      0,
      "fr",
    );
    // Exécution 2 (échéance fraîche : 9000), lancée avant la fin de la 1.
    const run2 = synchroniserNotifsRestauration(
      [{ templateId: "test.vase", nom: "Vase", finMs: 9000 }],
      0,
      "fr",
    );

    d2.resolve();
    await run2;
    d1.resolve();
    await run1;

    const atMs = programmer.mock.calls.map(([spec]) => spec.atMs);
    expect(atMs).toContain(9000);
    expect(atMs).not.toContain(5000);
  });

  it("chaque spec porte un estObsolete qui bascule quand une exécution plus récente démarre", async () => {
    annuler.mockResolvedValue(undefined);
    await synchroniserNotifsRestauration(
      [{ templateId: "test.vase", nom: "Vase", finMs: 5000 }],
      0,
      "fr",
    );
    const spec = programmer.mock.calls.at(-1)![0];
    expect(spec.estObsolete?.()).toBe(false);

    await synchroniserNotifsRestauration([], 0, "fr");
    expect(spec.estObsolete?.()).toBe(true);
  });
});
