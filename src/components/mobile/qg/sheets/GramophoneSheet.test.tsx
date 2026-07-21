// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { GramophoneSheet } from "./GramophoneSheet";
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

  it("sans guide : aucune main", () => {
    renderSheet(false);
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});
