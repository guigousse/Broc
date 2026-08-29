// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ObjetsTrouvablesSheet } from "./ObjetsTrouvablesSheet";
import { objetsDesTiersPrecedents, objetsTrouvables } from "@/lib/chine";
import { initCollection, marquerVu, marquerDejaPossede, donnerObjet } from "@/lib/collection";
import { createMockBrocante } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

const brocante = createMockBrocante({
  id: "disquaire",
  nom: "Le Disquaire",
  tier: 1,
  etoiles: 1,
  specialisation: "Musique",
});

describe("ObjetsTrouvablesSheet — la collection, en vrac", () => {
  it("fermée : rien", () => {
    render(
      <ObjetsTrouvablesSheet open={false} onClose={() => {}} brocante={brocante} collection={initCollection()} />,
    );
    expect(screen.queryByTestId("trouvables-liste")).toBeNull();
  });

  it("ouverte : un sticker par objet trouvable, titre = nom de la brocante", () => {
    render(
      <ObjetsTrouvablesSheet open onClose={() => {}} brocante={brocante} collection={initCollection()} />,
    );
    const attendus = objetsTrouvables(brocante);
    expect(screen.getAllByTestId("trouvable")).toHaveLength(attendus.length);
    expect(screen.getByText("Le Disquaire")).toBeTruthy();
  });

  it("variantes comme la collection : silhouette (inconnu), grise (vu), normale (donné)", () => {
    const [a, b, c] = objetsTrouvables(brocante);
    let col = initCollection();
    col = marquerVu(col, b.templateId);
    col = marquerDejaPossede(col, c.templateId);
    col = donnerObjet(col, c.templateId, "Bon", c.prixRefBase).collection;
    render(<ObjetsTrouvablesSheet open onClose={() => {}} brocante={brocante} collection={col} />);
    const parId = (id: string) =>
      screen.getAllByTestId("trouvable").find((el) => el.getAttribute("data-template") === id)!;
    expect(parId(a.templateId).getAttribute("data-variant")).toBe("silhouette");
    expect(parId(b.templateId).getAttribute("data-variant")).toBe("grise");
    expect(parId(c.templateId).getAttribute("data-variant")).toBe("normal");
    // Un inconnu ne livre pas son nom.
    expect(parId(a.templateId).textContent).not.toContain(a.nom);
    expect(parId(c.templateId).textContent).toContain(c.nom);
  });

  it("droits, sur une grille de 4 colonnes", () => {
    render(
      <ObjetsTrouvablesSheet open onClose={() => {}} brocante={brocante} collection={initCollection()} />,
    );
    const liste = screen.getByTestId("trouvables-liste") as HTMLElement;
    expect(liste.style.display).toBe("grid");
    expect(liste.style.gridTemplateColumns).toBe("repeat(4, 1fr)");
    for (const el of screen.getAllByTestId("trouvable")) {
      expect((el as HTMLElement).style.transform).toBe("");
    }
  });

  it("brocante ★ : pas de mention des tiers précédents", () => {
    render(
      <ObjetsTrouvablesSheet open onClose={() => {}} brocante={brocante} collection={initCollection()} />,
    );
    expect(screen.queryByTestId("trouvables-tiers-precedents")).toBeNull();
  });

  it("brocante ★★★ : « + xx objets issus des brocantes ★ et ★★ » sous le sous-titre", () => {
    const b3 = createMockBrocante({ id: "b3", nom: "Grande", tier: 3, etoiles: 3 });
    render(<ObjetsTrouvablesSheet open onClose={() => {}} brocante={b3} collection={initCollection()} />);
    const n = objetsDesTiersPrecedents(b3);
    const ligne = screen.getByTestId("trouvables-tiers-precedents");
    expect(ligne.textContent).toBe(`+ ${n} objets issus des brocantes ★ et ★★`);
    const sousTitre = screen.getByText(/objets à dénicher ici/);
    expect(sousTitre.nextElementSibling).toBe(ligne);
  });

  it("s'arrête sous la barre des plaques ★ quand elle est à l'écran", () => {
    const barre = document.createElement("div");
    barre.setAttribute("data-scene-plaques-bar", "");
    barre.getBoundingClientRect = () => ({ bottom: 60 }) as DOMRect;
    document.body.appendChild(barre);
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    try {
      render(
        <ObjetsTrouvablesSheet open onClose={() => {}} brocante={brocante} collection={initCollection()} />,
      );
      expect((screen.getByRole("dialog") as HTMLElement).style.maxHeight).toBe("728px");
    } finally {
      barre.remove();
    }
  });

  it("sans barre de plaques : plafond par défaut en pourcentage", () => {
    render(
      <ObjetsTrouvablesSheet open onClose={() => {}} brocante={brocante} collection={initCollection()} />,
    );
    expect((screen.getByRole("dialog") as HTMLElement).style.maxHeight).toBe("88%");
  });

  it("Fermer appelle onClose", () => {
    const onClose = vi.fn();
    render(<ObjetsTrouvablesSheet open onClose={onClose} brocante={brocante} collection={initCollection()} />);
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
