// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChineSkillDock, type DockSkill } from "./ChineSkillDock";

afterEach(cleanup);

function makeSkill(patch: Partial<DockSkill> = {}): DockSkill {
  return {
    id: "flair",
    nom: "Le Flair",
    imageSrc: "/competences/atout.flair.webp",
    emojiFallback: "🔍",
    verrouille: false,
    niveauRequis: 5,
    restants: 2,
    ariaLabel: "Le Flair — 2 usage(s) restant(s)",
    onActivate: () => {},
    ...patch,
  };
}

describe("ChineSkillDock", () => {
  it("affiche un cercle par atout avec la pastille d'usages restants", () => {
    render(
      <ChineSkillDock
        skills={[
          makeSkill(),
          makeSkill({ id: "fouille", nom: "La Fouille", restants: 1, ariaLabel: "La Fouille — 1 usage(s) restant(s)" }),
        ]}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("verrouillé : pastille de niveau requis et clic transmis (toast côté parent)", () => {
    const onActivate = vi.fn();
    render(
      <ChineSkillDock
        skills={[makeSkill({ id: "tchatche", verrouille: true, niveauRequis: 25, onActivate, ariaLabel: "La Tchatche — verrouillé, se débloque au niveau 25" })]}
      />,
    );
    expect(screen.getByText("N25")).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("épuisé (0 usage restant) : le bouton est désactivé", () => {
    const onActivate = vi.fn();
    render(<ChineSkillDock skills={[makeSkill({ restants: 0, onActivate })]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("désactivé par le contexte (Tchatche hors négo fâchée) : pas d'activation", () => {
    const onActivate = vi.fn();
    render(<ChineSkillDock skills={[makeSkill({ id: "tchatche", desactive: true, onActivate })]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("actif (Flair déjà joué) : plus cliquable", () => {
    const onActivate = vi.fn();
    render(<ChineSkillDock skills={[makeSkill({ actif: true, onActivate })]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).not.toHaveBeenCalled();
  });
});
