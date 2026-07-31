// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { GramophoneSheet } from "./GramophoneSheet";
import { nombreVinylesEcoutables } from "@/data/vinylesAudio";
import type { CollectionSlot } from "@/types/game";

vi.mock("@/components/ui/ItemImage", () => ({
  ItemImage: () => <div data-testid="item-image" />,
}));

afterEach(cleanup);

const vinyle = {
  templateId: "mus.33tours_jazz_1",
  rarete: "commun",
  etat: "Très bon",
} as unknown as CollectionSlot;

function renderSheet(guide: boolean) {
  return render(
    <GramophoneSheet
      open
      onClose={vi.fn()}
      vinyles={[vinyle]}
      vinyleCourantIdx={null}
      enLecture={false}
      onSelect={vi.fn()}
      onPlayPause={vi.fn()}
      onNext={vi.fn()}
      guide={guide}
    />,
  );
}

describe("GramophoneSheet — guidage mini-tuto", () => {
  it("guide : la 1ʳᵉ vignette porte la main pointeuse", () => {
    renderSheet(true);
    const tuile = document.querySelector(".tuto-main.tuto-main-haut");
    expect(tuile).not.toBeNull();
    expect(tuile?.tagName).toBe("BUTTON");
  });

  it("guide : la vignette guidée ne rogne pas la main ::after (pas d'overflow hidden)", () => {
    renderSheet(true);
    const tuile = document.querySelector<HTMLButtonElement>(".tuto-main.tuto-main-haut");
    expect(tuile?.style.overflow).not.toBe("hidden");
  });

  it("sans guide : aucune main", () => {
    renderSheet(false);
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});

describe("GramophoneSheet — compteur et cadre", () => {
  it("affiche le compteur débloqués / écoutables", () => {
    const { getByText } = renderSheet(false);
    expect(getByText(`1 / ${nombreVinylesEcoutables()}`)).toBeTruthy();
  });

  it("la vignette est carrée (pas de rognage rond de la pochette)", () => {
    renderSheet(false);
    // Seules les tuiles de la bande portent un attribut `title`.
    const tuile = document.querySelector<HTMLButtonElement>("button[title]");
    expect(tuile?.style.borderRadius).not.toBe("50%");
  });

  it("la vignette sélectionnée est ~30 % plus grande que les autres", () => {
    const autre = {
      templateId: "mus.33tours_jazz_2",
      rarete: "commun",
      etat: "Très bon",
    } as unknown as CollectionSlot;
    render(
      <GramophoneSheet
        open
        onClose={vi.fn()}
        vinyles={[vinyle, autre]}
        vinyleCourantIdx={0}
        enLecture={false}
        onSelect={vi.fn()}
        onPlayPause={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    const tuiles = document.querySelectorAll<HTMLButtonElement>("button[title]");
    expect(tuiles).toHaveLength(2);
    const [active, inactive] = [tuiles[0], tuiles[1]];
    expect(parseInt(active.style.height, 10)).toBe(125);
    expect(parseInt(inactive.style.height, 10)).toBe(96);
    expect(active.style.flexBasis).toBe("125px");
  });

  it("en lecture : le centre de la pochette sélectionnée tourne", () => {
    render(
      <GramophoneSheet
        open
        onClose={vi.fn()}
        vinyles={[vinyle]}
        vinyleCourantIdx={0}
        enLecture
        onSelect={vi.fn()}
        onPlayPause={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    const disque = document.querySelector<HTMLElement>(
      "button[title] [data-disque-spin]",
    );
    expect(disque).not.toBeNull();
    expect(disque?.style.animation).toContain("broc-vinyle-spin");
  });

  it("en pause : pas de disque en rotation", () => {
    render(
      <GramophoneSheet
        open
        onClose={vi.fn()}
        vinyles={[vinyle]}
        vinyleCourantIdx={0}
        enLecture={false}
        onSelect={vi.fn()}
        onPlayPause={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-disque-spin]")).toBeNull();
  });

  it("la bande réserve une hauteur constante (celle de la grande tuile)", () => {
    renderSheet(false);
    const tuile = document.querySelector<HTMLButtonElement>("button[title]");
    // Sans hauteur réservée, la bande rebondit pendant la transition de
    // taille entre deux vignettes.
    expect(tuile?.parentElement?.style.minHeight).toBe("125px");
  });
});
