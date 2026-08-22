// @vitest-environment jsdom
/**
 * Le passage bureau ↔ Bazar. Les deux sens font la même chose et se trompent
 * de la même façon s'ils divergent : fermer l'iris, attendre le noir, POSER LE
 * FLAG, puis seulement naviguer. L'ordre n'est pas cosmétique — le flag est ce
 * que l'écran d'arrivée consomme pour rouvrir l'iris ; posé après la
 * navigation, il arriverait trop tard et l'arrivée se ferait à cru.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { usePassageIris } from "./usePassageIris";
import { dureesIris, lireFlagIris } from "@/lib/transitionIris";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function Sonde({ href = "/bazar" }: { href?: string }) {
  const { partirVers, overlay } = usePassageIris();
  return (
    <>
      <button type="button" onClick={() => partirVers(href)}>
        partir
      </button>
      {overlay}
    </>
  );
}

/** Le temps qu'il faut au noir complet, marge de fin du composant comprise. */
const JUSQU_AU_NOIR = dureesIris("court").fermeture + 200;

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("usePassageIris", () => {
  it("ne rend rien et ne navigue pas tant qu'on n'est pas parti", () => {
    const { container } = render(<Sonde />);
    expect(container.querySelector("[aria-hidden]")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("le départ joue la fermeture d'iris AVANT de naviguer", () => {
    render(<Sonde />);
    act(() => screen.getByText("partir").click());
    expect(document.querySelector("[aria-hidden]")).not.toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(lireFlagIris()).toBe(null);
  });

  it("au noir : pose le flag COURT, puis navigue vers la cible", async () => {
    render(<Sonde href="/bazar" />);
    act(() => screen.getByText("partir").click());
    await act(() => vi.advanceTimersByTimeAsync(JUSQU_AU_NOIR));
    expect(lireFlagIris()).toBe("court");
    expect(push).toHaveBeenCalledWith("/bazar");
  });

  it("l'autre sens passe par le même chemin", async () => {
    render(<Sonde href="/bureau" />);
    act(() => screen.getByText("partir").click());
    await act(() => vi.advanceTimersByTimeAsync(JUSQU_AU_NOIR));
    expect(push).toHaveBeenCalledWith("/bureau");
  });

  // L'overlay laisse passer les taps sur un bouton resté sous lui pendant plus
  // d'une seconde. Deux départs, c'est deux `router.push` — et sur le retour,
  // deux entrées dans l'historique pour un seul geste.
  it("un second tap pendant l'iris ne relance pas la navigation", async () => {
    render(<Sonde />);
    act(() => screen.getByText("partir").click());
    act(() => screen.getByText("partir").click());
    await act(() => vi.advanceTimersByTimeAsync(JUSQU_AU_NOIR));
    expect(push).toHaveBeenCalledTimes(1);
  });
});
