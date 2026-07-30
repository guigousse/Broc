// @vitest-environment jsdom
/**
 * Ordre de commit de la notif « énergie pleine ». Le cœur (`./index`) est
 * asynchrone (imports dynamiques + IPC) : deux exécutions lancées coup sur coup
 * peuvent se croiser, et une échéance PÉRIMÉE ne doit jamais s'écrire par-dessus
 * la plus récente — sinon la notif part trop tôt (« énergie pleine » alors qu'il
 * reste du temps de recharge).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NotifSpec } from "./index";

const programmerMock = vi.fn<(spec: NotifSpec) => Promise<void>>();
const annulerMock = vi.fn<(ids: number[]) => Promise<void>>();

vi.mock("./index", () => ({
  notificationsDisponibles: () => true,
  demanderPermission: async () => true,
  programmer: (spec: NotifSpec) => programmerMock(spec),
  annuler: (ids: number[]) => annulerMock(ids),
}));

const { planifierPleinEnergie, annulerPleinEnergie } = await import(
  "./energieNotif"
);

beforeEach(() => {
  programmerMock.mockReset();
  annulerMock.mockReset();
  annulerMock.mockResolvedValue(undefined);
});

describe("energieNotif — ordre de commit", () => {
  it("une planification dépassée par une plus récente se déclare obsolète", async () => {
    const specs: NotifSpec[] = [];
    programmerMock.mockImplementation(async (spec) => {
      specs.push(spec);
    });

    // Deux échéances lancées en parallèle (état changé deux fois de suite).
    await Promise.all([
      planifierPleinEnergie(1_000, "fr"),
      planifierPleinEnergie(2_000, "fr"),
    ]);

    expect(specs).toHaveLength(2);
    expect(specs[0].atMs).toBe(1_000);
    expect(specs[1].atMs).toBe(2_000);
    // La 1ʳᵉ ne doit plus rien poser, la 2ᵈᵉ (la vraie) si.
    expect(specs[0].estObsolete?.()).toBe(true);
    expect(specs[1].estObsolete?.()).toBe(false);
  });

  it("une annulation rend obsolète une planification encore en vol", async () => {
    let spec: NotifSpec | undefined;
    programmerMock.mockImplementation(async (s) => {
      spec = s;
    });

    const enVol = planifierPleinEnergie(1_000, "fr");
    await annulerPleinEnergie();
    await enVol;

    expect(annulerMock).toHaveBeenCalledTimes(1);
    expect(spec?.estObsolete?.()).toBe(true);
  });
});
