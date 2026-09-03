// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LivretReglesSheet } from "@/components/albums/LivretReglesSheet";

afterEach(cleanup);

describe("LivretReglesSheet", () => {
  it("titre, 5 paragraphes, roue à 7 catégories, 6 mots-clés, fermeture", () => {
    const onClose = vi.fn();
    render(<LivretReglesSheet onClose={onClose} />);
    expect(
      screen.getByRole("heading", { name: "Règles du duel" }),
    ).toBeTruthy();
    expect(screen.getAllByTestId("livret-paragraphe")).toHaveLength(5);
    expect(
      screen.getByTestId("roue-categories").querySelectorAll("text"),
    ).toHaveLength(7);
    expect(screen.getAllByTestId("livret-mot-cle")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalled();
  });
});
