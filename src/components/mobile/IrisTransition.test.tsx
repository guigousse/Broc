// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { IrisArrivee, IrisFermeture } from "./IrisTransition";
import {
  DUREE_FERMETURE_MS,
  DUREE_OUVERTURE_MS,
  NOIR_MIN_MS,
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
    expect(lireFlagIris()).toBe(false);
  });

  it("retire le voile preboot posé par le script du layout racine", () => {
    const preboot = document.createElement("div");
    preboot.id = "broc-iris-preboot";
    document.body.appendChild(preboot);
    poserFlagIris();
    render(<IrisArrivee imageSrc="/qg/fond-cabinet.webp" />);
    expect(document.getElementById("broc-iris-preboot")).toBeNull();
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
