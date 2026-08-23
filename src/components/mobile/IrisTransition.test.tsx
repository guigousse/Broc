// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { IrisArrivee, IrisFermeture } from "./IrisTransition";
import {
  DUREE_FERMETURE_MS,
  DUREE_OUVERTURE_MS,
  NOIR_MIN_MS,
  dureesIris,
  lireFlagIris,
  poserFlagIris,
} from "@/lib/transitionIris";

// prechargerImage résout immédiatement : les tests pilotent le déroulé via
// les seuls timers (noir minimum, durées d'animation).
vi.mock("@/lib/transitionIris", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/transitionIris")>();
  return { ...orig, prechargerImage: vi.fn(() => Promise.resolve()) };
});

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

describe("IrisFermeture", () => {
  it("appelle onNoir une fois la fermeture jouée, pas avant", async () => {
    const onNoir = vi.fn();
    render(<IrisFermeture cx={100} cy={200} onNoir={onNoir} />);

    await act(() => vi.advanceTimersByTimeAsync(DUREE_FERMETURE_MS));
    expect(onNoir).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(onNoir).toHaveBeenCalledTimes(1);
  });

  // Le passage bureau ↔ Bazar rejoue le même iris, 30 % plus court. La preuve
  // est prise sur le CALLBACK, pas sur la feuille de style : c'est lui qui
  // retient la navigation, et le décalage entre les deux variantes est
  // exactement ce qu'on veut voir raccourcir.
  it("variante courte : onNoir arrive avant la fin de la fermeture longue", async () => {
    const onNoir = vi.fn();
    render(<IrisFermeture cx={100} cy={200} onNoir={onNoir} variante="court" />);

    await act(() => vi.advanceTimersByTimeAsync(dureesIris("court").fermeture));
    expect(onNoir).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(onNoir).toHaveBeenCalledTimes(1);
    // Et c'est bien plus tôt que l'iris de l'écran-titre.
    expect(dureesIris("court").fermeture).toBeLessThan(DUREE_FERMETURE_MS);
  });

  it("variante courte : le trou se referme sur la durée courte, pas la longue", () => {
    const { container } = render(
      <IrisFermeture cx={10} cy={10} onNoir={vi.fn()} variante="court" />,
    );
    const trou = (container.firstChild as HTMLElement).firstChild as HTMLElement;
    expect(trou.style.transition).toContain(`${dureesIris("court").fermeture}ms`);
  });

  it("pointer-events : bloque par défaut, laisse passer avec bloqueInteractions={false}", () => {
    const a = render(<IrisFermeture cx={10} cy={10} onNoir={vi.fn()} />);
    expect((a.container.firstChild as HTMLElement).style.pointerEvents).toBe("auto");
    a.unmount();
    const b = render(
      <IrisFermeture cx={10} cy={10} onNoir={vi.fn()} bloqueInteractions={false} />,
    );
    expect((b.container.firstChild as HTMLElement).style.pointerEvents).toBe("none");
  });
});

describe("IrisArrivee", () => {
  it("sans flag : ne rend rien", () => {
    const { container } = render(<IrisArrivee imageSrc="/qg/fond-cabinet.webp" />);
    expect(container.firstChild).toBeNull();
  });

  it("avec flag : couvre l'écran dès le rendu et consomme le flag", () => {
    poserFlagIris();
    const { container } = render(<IrisArrivee imageSrc="/qg/fond-cabinet.webp" />);
    expect(container.firstChild).not.toBeNull();
    expect(lireFlagIris()).toBe(null);
  });

  it("retire le voile preboot posé par le script du layout racine", () => {
    const preboot = document.createElement("div");
    preboot.id = "broc-iris-preboot";
    document.body.appendChild(preboot);
    poserFlagIris();
    render(<IrisArrivee imageSrc="/qg/fond-cabinet.webp" />);
    expect(document.getElementById("broc-iris-preboot")).toBeNull();
  });

  // L'arrivée ne reçoit pas sa variante en prop : elle la LIT dans le flag,
  // parce que le bureau est atteint aussi bien depuis l'écran-titre (long) que
  // depuis le Bazar (court), et que c'est le même composant qui l'ouvre.
  it("flag court : l'ouverture est finie avant la fin de l'ouverture longue", async () => {
    poserFlagIris("court");
    const { container } = render(<IrisArrivee imageSrc="/bazar/fond-bazar.webp" />);

    await act(() =>
      vi.advanceTimersByTimeAsync(NOIR_MIN_MS + dureesIris("court").ouverture + 200),
    );
    expect(container.firstChild).toBeNull();
    expect(dureesIris("court").ouverture).toBeLessThan(DUREE_OUVERTURE_MS);
  });

  it("s'ouvre après préchargement + noir minimum, puis se démonte", async () => {
    poserFlagIris();
    const { container } = render(<IrisArrivee imageSrc="/qg/fond-cabinet.webp" />);

    await act(() => vi.advanceTimersByTimeAsync(NOIR_MIN_MS));
    expect(container.firstChild).not.toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(DUREE_OUVERTURE_MS + 200));
    expect(container.firstChild).toBeNull();
  });
});
