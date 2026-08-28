// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ObjetsTrouvablesSheet } from "./ObjetsTrouvablesSheet";
import { objetsTrouvables } from "@/lib/chine";
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

  it("en vrac : chaque sticker a sa propre inclinaison et son propre décalage", () => {
    render(
      <ObjetsTrouvablesSheet open onClose={() => {}} brocante={brocante} collection={initCollection()} />,
    );
    const transforms = new Set(
      screen.getAllByTestId("trouvable").map((el) => (el as HTMLElement).style.transform),
    );
    expect(transforms.size).toBeGreaterThan(3);
  });

  it("Fermer appelle onClose", () => {
    const onClose = vi.fn();
    render(<ObjetsTrouvablesSheet open onClose={onClose} brocante={brocante} collection={initCollection()} />);
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
