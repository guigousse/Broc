// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChineMystereDrawer } from "./ChineMystereDrawer";

afterEach(cleanup);

describe("ChineMystereDrawer", () => {
  it("ouvrable : le cartel annonce la pub et le clic remonte l'action", () => {
    const onOuvrirBoite = vi.fn();
    render(
      <ChineMystereDrawer plein={false} boiteReclamee={false} onOuvrirBoite={onOuvrirBoite} />,
    );
    const btn = screen.getByRole("button", { name: /regarder une pub/i });
    // Le libellé VISIBLE est court ; le nom accessible dit qu'il s'agit d'une pub.
    expect(btn.textContent).toContain("Pour ouvrir la boîte");
    fireEvent.click(btn);
    expect(onOuvrirBoite).toHaveBeenCalledTimes(1);
  });

  it("déjà réclamée : plus de bouton, un statut à la place", () => {
    render(
      <ChineMystereDrawer plein={false} boiteReclamee onOuvrirBoite={vi.fn()} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/boîte déjà ouverte/i)).toBeTruthy();
  });

  it("stockage plein : plus de bouton, jamais de pub gâchée", () => {
    render(
      <ChineMystereDrawer plein boiteReclamee={false} onOuvrirBoite={vi.fn()} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/stockage plein/i)).toBeTruthy();
  });

  it("déjà réclamée ET stockage plein : le statut « déjà ouverte » prime", () => {
    render(<ChineMystereDrawer plein boiteReclamee onOuvrirBoite={vi.fn()} />);
    expect(screen.getByText(/boîte déjà ouverte/i)).toBeTruthy();
    expect(screen.queryByText(/stockage plein/i)).toBeNull();
  });

  it("le bandeau porte le nom du vendeur", () => {
    render(
      <ChineMystereDrawer plein={false} boiteReclamee={false} onOuvrirBoite={vi.fn()} />,
    );
    expect(screen.getByText("Vendeur mystère")).toBeTruthy();
  });
});
