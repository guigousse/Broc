// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { IapBootstrap } from "./IapBootstrap";
import { definirEnergieInfinie, energieInfinieActive } from "@/lib/iap/energieInfinie";

vi.mock("@/lib/plateforme", () => ({
  tauriIosDisponible: () => true,
}));

// `vi.mock` est hissé en tête de module : le mock de `getIapProvider` doit
// donc capturer `verifierEntitlement` via `vi.hoisted` pour pouvoir le
// piloter (résolution, compteur d'appels) depuis les tests ci-dessous.
const { verifierEntitlement } = vi.hoisted(() => ({
  verifierEntitlement: vi.fn<() => Promise<boolean>>(),
}));
vi.mock("@/lib/iap/iapProvider", () => ({
  getIapProvider: () => ({ verifierEntitlement }),
}));

/** Simule le retour au premier plan (jsdom n'implémente pas nativement la bascule). */
function stubVisibiliteVisible(): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  verifierEntitlement.mockReset();
});

describe("IapBootstrap", () => {
  it("revalide au montage et pose le drapeau via definirEnergieInfinie (source réelle)", async () => {
    verifierEntitlement.mockResolvedValue(true);
    definirEnergieInfinie(false);

    render(<IapBootstrap />);

    await waitFor(() => expect(energieInfinieActive()).toBe(true));
    expect(verifierEntitlement).toHaveBeenCalledTimes(1);
  });

  it("revalide au retour au premier plan (visibilitychange) et met à jour le drapeau", async () => {
    verifierEntitlement.mockResolvedValue(true);
    definirEnergieInfinie(false);

    render(<IapBootstrap />);
    await waitFor(() => expect(energieInfinieActive()).toBe(true));

    // Un remboursement survient pendant que l'app est en arrière-plan : au
    // retour au premier plan, la revalidation doit faire retomber le drapeau.
    verifierEntitlement.mockResolvedValue(false);
    stubVisibiliteVisible();
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(energieInfinieActive()).toBe(false));
    expect(verifierEntitlement).toHaveBeenCalledTimes(2);
  });

  it("retire l'écouteur au démontage : plus aucun appel après unmount", async () => {
    verifierEntitlement.mockResolvedValue(true);
    definirEnergieInfinie(false);

    const { unmount } = render(<IapBootstrap />);
    await waitFor(() => expect(verifierEntitlement).toHaveBeenCalledTimes(1));

    unmount();

    verifierEntitlement.mockResolvedValue(false);
    stubVisibiliteVisible();
    document.dispatchEvent(new Event("visibilitychange"));
    // Laisse une occasion aux micro/macrotâches de tourner : aucune ne doit
    // relancer verifierEntitlement puisque le listener a été retiré.
    await new Promise((r) => setTimeout(r, 0));

    expect(verifierEntitlement).toHaveBeenCalledTimes(1);
  });
});
