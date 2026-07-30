// @vitest-environment jsdom
/**
 * Notif « énergie pleine » : elle doit toujours refléter l'état LE PLUS FRAIS.
 * Le moment critique est le passage en arrière-plan : c'est le dernier instant
 * où l'app peut corriger l'échéance avant que iOS ne gèle la webview, et la
 * notif partira pendant cette absence. Sans reprogrammation à ce moment, une
 * dépense d'énergie juste avant la sortie laisse en place une échéance trop
 * précoce → « énergie pleine » alors qu'il reste un cycle de recharge.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { RECHARGE_INTERVAL_MS } from "@/lib/energie";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

const planifier = vi.fn<(atMs: number, locale: string) => Promise<void>>();
const annulerNotif = vi.fn<() => Promise<void>>();

vi.mock("@/lib/notifications/energieNotif", () => ({
  notificationsDisponibles: () => true,
  assurerPermission: async () => true,
  planifierPleinEnergie: (atMs: number, locale: string) =>
    planifier(atMs, locale),
  annulerPleinEnergie: () => annulerNotif(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

async function setupPartie() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

beforeEach(() => {
  planifier.mockReset();
  annulerNotif.mockReset();
  planifier.mockResolvedValue(undefined);
  annulerNotif.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("GameContext — notif énergie et arrière-plan", () => {
  it("programme l'échéance sur l'horloge murale après une dépense", async () => {
    const result = await setupPartie();
    const avant = Date.now();
    act(() => {
      result.current.consommerEnergie(1);
    });
    await waitFor(() => expect(planifier).toHaveBeenCalled());

    const atMs = planifier.mock.calls.at(-1)![0];
    // 4/5 → il reste un seul palier de recharge.
    expect(atMs).toBeGreaterThanOrEqual(avant + RECHARGE_INTERVAL_MS - 2_000);
    expect(atMs).toBeLessThanOrEqual(Date.now() + RECHARGE_INTERVAL_MS);
  });

  it("reprogramme au passage en arrière-plan (pagehide)", async () => {
    const result = await setupPartie();
    act(() => {
      result.current.consommerEnergie(1);
    });
    await waitFor(() => expect(planifier).toHaveBeenCalled());
    planifier.mockClear();

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await waitFor(() => expect(planifier).toHaveBeenCalledTimes(1));
  });

  it("annule au passage en arrière-plan si l'énergie est déjà pleine", async () => {
    await setupPartie();
    await waitFor(() => expect(annulerNotif).toHaveBeenCalled());
    annulerNotif.mockClear();

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await waitFor(() => expect(annulerNotif).toHaveBeenCalledTimes(1));
    expect(planifier).not.toHaveBeenCalled();
  });
});
