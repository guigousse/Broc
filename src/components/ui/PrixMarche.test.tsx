// @vitest-environment jsdom
/**
 * La ligne « prix du marché », partagée par le stockage et l'atelier.
 *
 * L'atelier écrivait « valeur ? » en petit mono gris, le stockage « Prix du
 * marché : ? € » en police d'affichage : deux façons de dire la même chose,
 * à deux écrans d'écart. L'auteur a tranché pour celle du stockage
 * (2026-08-26) — d'où ce composant unique, pour qu'elles ne redivergent pas.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PrixMarche } from "./PrixMarche";

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: { inventaire: { prixMarcheInconnu: "Prix du marché : ? €" } },
  }),
}));

afterEach(cleanup);

describe("PrixMarche", () => {
  it("valeur inconnue : le libellé entier, point d'interrogation compris", () => {
    render(<PrixMarche prix={1234} connue={false} />);
    expect(screen.getByText("Prix du marché : ? €")).toBeTruthy();
  });

  it("valeur connue : le montant seul, arrondi", () => {
    render(<PrixMarche prix={1234.6} connue />);
    expect(screen.getByText("1235 €")).toBeTruthy();
  });

  it("police d'affichage, comme la fiche du stockage", () => {
    const { container } = render(<PrixMarche prix={10} connue />);
    const ligne = container.firstElementChild as HTMLElement;
    expect(ligne.style.fontFamily).toContain("--font-display");
    expect(ligne.style.fontSize).toBe("13px");
  });
});
