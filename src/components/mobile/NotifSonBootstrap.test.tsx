// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

const { installerSonNotif, arreter } = vi.hoisted(() => {
  const arreter = vi.fn();
  return {
    arreter,
    installerSonNotif: vi.fn<(jouer: () => void) => Promise<() => void>>(
      async () => arreter,
    ),
  };
});
vi.mock("@/lib/notifications/sonNotif", () => ({ installerSonNotif }));

const { NotifSonBootstrap } = await import("./NotifSonBootstrap");

afterEach(() => {
  cleanup();
  installerSonNotif.mockClear();
  arreter.mockClear();
});

describe("NotifSonBootstrap", () => {
  it("branche le carillon au montage", async () => {
    render(<NotifSonBootstrap />);
    await waitFor(() => expect(installerSonNotif).toHaveBeenCalledTimes(1));
  });

  it("coupe l'abonnement au démontage", async () => {
    const vue = render(<NotifSonBootstrap />);
    await waitFor(() => expect(installerSonNotif).toHaveBeenCalled());
    vue.unmount();
    await waitFor(() => expect(arreter).toHaveBeenCalled());
  });

  // L'abonnement est asynchrone : démonté avant qu'il n'atterrisse, il serait
  // perdu — un écouteur vivant que plus personne ne peut couper.
  it("coupe un abonnement qui atterrit après le démontage", async () => {
    let resoudre: ((f: () => void) => void) | undefined;
    installerSonNotif.mockImplementationOnce(
      () => new Promise<() => void>((r) => { resoudre = r; }),
    );
    const vue = render(<NotifSonBootstrap />);
    vue.unmount();
    resoudre?.(arreter);
    await waitFor(() => expect(arreter).toHaveBeenCalled());
  });
});
