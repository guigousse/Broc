// @vitest-environment jsdom
/**
 * Les deux gestes de l'atelier, côte à côte sur la ligne de l'objet
 * (demande de l'auteur, 2026-08-26) : AMÉLIORER en vert avec son prix en
 * pièces, DÉMANTELER en rouge avec son rendement.
 *
 * Le prix devient ainsi lisible SANS ouvrir quoi que ce soit — c'était le
 * point : il fallait passer par la feuille « choisir un objet à restaurer »
 * pour savoir ce que coûtait une amélioration.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AtelierActions } from "./AtelierActions";

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: {
      inventaire: {
        ameliorerAria: "Améliorer — {cout} pièces {categorie}",
        demantelerAria: "Démanteler — rendement {pieces} pièces {categorie}",
      },
      commun: {},
      categories: { bricolage: "Bricolage" },
    },
    tr: (gabarit: string, params: Record<string, unknown>) =>
      gabarit.replace(/\{(\w+)\}/g, (_, k) => String(params[k])),
    locale: "fr",
  }),
}));

afterEach(cleanup);

const base = {
  categorie: "Bricolage" as const,
  cout: 3,
  rendement: 7,
  ameliorationDisponible: true,
  onAmeliorer: () => {},
  onDemanteler: () => {},
  onRefus: () => {},
};

describe("AtelierActions", () => {
  it("les deux boutons sont côte à côte, améliorer d'abord", () => {
    const { container } = render(<AtelierActions {...base} />);
    const zone = container.firstElementChild as HTMLElement;
    expect(zone.style.display).toBe("flex");
    const boutons = Array.from(zone.querySelectorAll("button"));
    expect(boutons).toHaveLength(2);
    expect(boutons[0].textContent).toContain("−3");
    expect(boutons[1].textContent).toContain("+7");
  });

  it("améliorer est VERT, démanteler est ROUGE", () => {
    const { container } = render(<AtelierActions {...base} />);
    const [ameliorer, demanteler] = Array.from(container.querySelectorAll("button"));
    expect(ameliorer.style.background).toContain("forest");
    expect(demanteler.style.background).toContain("danger");
  });

  it("sans pièces : le bouton améliorer est grisé et ne déclenche rien", () => {
    const onAmeliorer = vi.fn();
    const onRefus = vi.fn();
    render(
      <AtelierActions
        {...base}
        ameliorationDisponible={false}
        raisonRefus="Il te manque 2 pièces Bricolage."
        onAmeliorer={onAmeliorer}
        onRefus={onRefus}
      />,
    );
    const ameliorer = screen.getAllByRole("button")[0];
    expect(ameliorer.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(ameliorer);
    expect(onAmeliorer).not.toHaveBeenCalled();
    // Un bouton gris qui ne dit pas POURQUOI laisse le joueur devant une
    // énigme : le refus part vers le bandeau qui l'explique.
    expect(onRefus).toHaveBeenCalledWith("Il te manque 2 pièces Bricolage.");
  });

  it("démanteler reste actif même quand améliorer est hors de portée", () => {
    const onDemanteler = vi.fn();
    render(
      <AtelierActions {...base} ameliorationDisponible={false} onDemanteler={onDemanteler} />,
    );
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(onDemanteler).toHaveBeenCalledTimes(1);
  });

  it("objet au sommet (rien à améliorer) : seul démanteler subsiste", () => {
    const { container } = render(<AtelierActions {...base} cout={null} />);
    const boutons = Array.from(container.querySelectorAll("button"));
    expect(boutons).toHaveLength(1);
    expect(boutons[0].textContent).toContain("+7");
  });

  it("le geste passe, mais pas le tap de la ligne — sinon la fiche s'ouvre derrière", () => {
    const onAmeliorer = vi.fn();
    const surLigne = vi.fn();
    render(
      <div onClick={surLigne}>
        <AtelierActions {...base} onAmeliorer={onAmeliorer} />
      </div>,
    );
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onAmeliorer).toHaveBeenCalledTimes(1);
    expect(surLigne).not.toHaveBeenCalled();
  });
});
