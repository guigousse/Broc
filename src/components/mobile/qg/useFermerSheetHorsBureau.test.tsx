// @vitest-environment jsdom
/**
 * Régression : la GramophoneSheet laisse la TabBar visible et cliquable
 * (scrim arrêté au-dessus de la barre). On peut donc naviguer vers
 * /stockage, /atelier ou /bibliotheque — même groupe de routes (qg), le
 * layout ne se démonte pas — et la sheet restait affichée par-dessus la
 * fenêtre flottante. Le hook doit la fermer dès que la route quitte
 * /bureau, et ne rien faire tant qu'on y est.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useFermerSheetHorsBureau } from "./useFermerSheetHorsBureau";

let pathname = "/bureau";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

afterEach(() => {
  cleanup();
  pathname = "/bureau";
});

describe("useFermerSheetHorsBureau", () => {
  it("ne ferme pas tant qu'on est sur /bureau", () => {
    const fermer = vi.fn();
    const { rerender } = renderHook(() => useFermerSheetHorsBureau(fermer));
    rerender();
    expect(fermer).not.toHaveBeenCalled();
  });

  it("ferme quand la route passe de /bureau à /stockage", () => {
    const fermer = vi.fn();
    const { rerender } = renderHook(() => useFermerSheetHorsBureau(fermer));
    expect(fermer).not.toHaveBeenCalled();
    pathname = "/stockage";
    rerender();
    expect(fermer).toHaveBeenCalledTimes(1);
  });

  it("ferme aussi sur /atelier et /bibliotheque", () => {
    for (const route of ["/atelier", "/bibliotheque"]) {
      const fermer = vi.fn();
      pathname = "/bureau";
      const { rerender } = renderHook(() => useFermerSheetHorsBureau(fermer));
      pathname = route;
      rerender();
      expect(fermer).toHaveBeenCalledTimes(1);
    }
  });

  it("reste inerte si `fermer` change d'identité à chaque rendu (setState inline)", () => {
    // Le layout passe une closure recréée à chaque rendu : le hook ne doit
    // pas re-tirer sur un simple re-rendu à route inchangée.
    const fermer = vi.fn();
    const { rerender } = renderHook(() => useFermerSheetHorsBureau(() => fermer()));
    rerender();
    rerender();
    expect(fermer).not.toHaveBeenCalled();
  });
});
