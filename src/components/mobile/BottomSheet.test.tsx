// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BottomSheet } from "./BottomSheet";

afterEach(cleanup);

// Régression : une sheet peut s'ouvrir par-dessus un parent qui écoute lui
// aussi `Escape` sur `window` (ex. la borne d'arcade autour de
// la borne d'arcade). Sans consommation de l'événement, Échap fermait la sheet
// ET ce parent d'un seul coup — le joueur retombait au panorama alors qu'il
// voulait juste fermer le pop-up. C'est à la sheet, la plus intérieure, de
// céder l'événement et de l'empêcher d'atteindre le parent.
describe("BottomSheet — Échap ne referme pas un parent", () => {
  it("stoppe la propagation, un listener `window` posé par un parent ne voit pas Échap", () => {
    const onCloseParent = vi.fn();
    const onParentKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseParent();
    };
    // En phase de bulles, comme le fait réellement `BorneArcadeEcran`.
    window.addEventListener("keydown", onParentKey);

    const onCloseSheet = vi.fn();
    render(
      <BottomSheet open onClose={onCloseSheet}>
        contenu
      </BottomSheet>,
    );

    try {
      fireEvent.keyDown(window, { key: "Escape" });

      expect(onCloseSheet).toHaveBeenCalledTimes(1);
      expect(onCloseParent).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("keydown", onParentKey);
    }
  });
});

describe("BottomSheet — bottomOffset", () => {
  it("sans offset : collée en bas (comportement historique)", () => {
    render(
      <BottomSheet open onClose={() => {}}>
        contenu
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog").style.bottom).toBe("0px");
  });

  it("avec offset : la sheet s'arrête au-dessus du dock", () => {
    render(
      <BottomSheet open onClose={() => {}} bottomOffset="calc(71px + var(--safe-bottom))">
        contenu
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog").style.bottom).toBe(
      "calc(71px + var(--safe-bottom))",
    );
  });
});
