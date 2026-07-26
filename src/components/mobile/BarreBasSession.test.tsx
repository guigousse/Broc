// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BarreBasSession } from "./BarreBasSession";

afterEach(cleanup);

describe("BarreBasSession", () => {
  it("rend le contenu gauche et le contenu droit", () => {
    render(
      <BarreBasSession
        gauche={<button type="button">Sortir</button>}
        droite={<span>8/12</span>}
      />,
    );
    expect(screen.getByRole("button", { name: "Sortir" })).toBeTruthy();
    expect(screen.getByText("8/12")).toBeTruthy();
  });

  it("réserve la zone sûre du bas (padding safe-bottom)", () => {
    const { container } = render(<BarreBasSession gauche={<i />} droite={<i />} />);
    const barre = container.firstElementChild as HTMLElement;
    expect(barre.style.padding).toContain("var(--safe-bottom)");
  });
});
