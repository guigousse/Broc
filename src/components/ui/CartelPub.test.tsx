// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CartelPub } from "./CartelPub";

afterEach(cleanup);

describe("CartelPub", () => {
  it("le nom accessible vient de ariaLabel, pas du contenu visible", () => {
    render(
      <CartelPub ariaLabel="Regarder une pub pour ouvrir">
        Pour ouvrir la boîte
      </CartelPub>,
    );
    const btn = screen.getByRole("button", { name: "Regarder une pub pour ouvrir" });
    expect(btn.textContent).toContain("Pour ouvrir la boîte");
  });

  it("sans ariaLabel, le nom accessible vient du contenu", () => {
    render(<CartelPub>Plus de pub aujourd&apos;hui</CartelPub>);
    expect(screen.getByRole("button", { name: /plus de pub aujourd'hui/i })).toBeTruthy();
  });

  it("indisponible : le bouton est désactivé et le clic n'appelle pas onClick", () => {
    const onClick = vi.fn();
    render(
      <CartelPub indisponible ariaLabel="Ouvrir" onClick={onClick}>
        Ouvrir
      </CartelPub>,
    );
    const btn = screen.getByRole("button", { name: "Ouvrir" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disponible : le clic appelle onClick", () => {
    const onClick = vi.fn();
    render(
      <CartelPub ariaLabel="Ouvrir" onClick={onClick}>
        Ouvrir
      </CartelPub>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("le style de l'appelant se pose SUR le style de base sans l'effacer", () => {
    render(
      <CartelPub ariaLabel="Ouvrir" style={{ width: "100%", position: "absolute" }}>
        Ouvrir
      </CartelPub>,
    );
    const btn = screen.getByRole("button", { name: "Ouvrir" }) as HTMLButtonElement;
    // Ce que l'appelant impose.
    expect(btn.style.width).toBe("100%");
    expect(btn.style.position).toBe("absolute");
    // Ce que le cartel garde : la couleur brune du texte gravé (#3a2410).
    expect(btn.style.color).toBe("rgb(58, 36, 16)");
  });

  it("les rivets décoratifs sont masqués aux lecteurs d'écran", () => {
    const { container } = render(<CartelPub ariaLabel="Ouvrir">Ouvrir</CartelPub>);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(2);
  });
});
