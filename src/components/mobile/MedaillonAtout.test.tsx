// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MedaillonAtout } from "./MedaillonAtout";

afterEach(cleanup);

describe("MedaillonAtout", () => {
  it("rend l'image du médaillon de l'atout", () => {
    const { container } = render(
      <MedaillonAtout activeId="flair" taille={32} emojiFallback="🔍" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/competences/atout.flair.webp");
    expect(screen.queryByText("+1")).toBeNull();
  });

  it("bonusUsage : badge +1 superposé", () => {
    render(<MedaillonAtout activeId="criee" taille={32} bonusUsage emojiFallback="📣" />);
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("grise : filtre du dock verrouillé sur l'image", () => {
    const { container } = render(
      <MedaillonAtout activeId="fouille" taille={32} grise emojiFallback="🧹" />,
    );
    expect(container.querySelector("img")!.style.filter).toBe("grayscale(1) brightness(0.55)");
  });

  it("webp manquant : bascule sur l'emoji de secours", () => {
    const { container } = render(
      <MedaillonAtout activeId="tchatche" taille={32} emojiFallback="💬" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("💬")).toBeTruthy();
  });
});
