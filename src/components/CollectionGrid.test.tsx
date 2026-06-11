// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionGrid } from "./CollectionGrid";
import type { CollectionSlot } from "@/types/game";

/**
 * ItemImage repose sur next/image (loader, IntersectionObserver…) — inutile
 * pour tester la grille. On le remplace par un stub traçable qui permet en
 * plus de compter les re-renders des cellules mémoïsées.
 */
const itemImageRenders: string[] = [];
vi.mock("@/components/ui/ItemImage", () => ({
  ItemImage: ({ templateId }: { templateId: string }) => {
    itemImageRenders.push(templateId);
    return <span data-testid={`img-${templateId}`} />;
  },
}));

afterEach(() => {
  cleanup();
  itemImageRenders.length = 0;
});

function makeSlot(overrides: Partial<CollectionSlot> = {}): CollectionSlot {
  return {
    templateId: "mus.vinyle_test",
    nom: "Vinyle de test",
    categorie: "Musique",
    rarete: "commun",
    vu: true,
    dejaPossede: true,
    donation: { etat: "Bon", valeur: 40 },
    ...overrides,
  };
}

const slots: CollectionSlot[] = [
  makeSlot({ templateId: "a", nom: "Objet A" }),
  makeSlot({ templateId: "b", nom: "Objet B", donation: null }),
  // Silhouette : jamais vu, jamais donné.
  makeSlot({ templateId: "c", nom: "Objet C", vu: false, donation: null }),
];

describe("CollectionGrid", () => {
  it("rend un bouton par slot (N slots → N cellules)", () => {
    render(<CollectionGrid slots={slots} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("les slots inconnus sont des silhouettes désactivées avec « ? »", () => {
    render(<CollectionGrid slots={slots} />);
    const silhouette = screen.getByRole("button", { name: "Pièce inconnue" });
    expect((silhouette as HTMLButtonElement).disabled).toBe(true);
    expect(silhouette.textContent).toBe("?");
    // Pas d'image rendue pour la silhouette.
    expect(screen.queryByTestId("img-c")).toBeNull();
  });

  it("onTap remonte le slot exact de la cellule cliquée", async () => {
    const user = userEvent.setup();
    const onTap = vi.fn();
    render(<CollectionGrid slots={slots} onTap={onTap} />);
    await user.click(screen.getByRole("button", { name: "Objet B" }));
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledWith(slots[1]);
  });

  it("ne crashe pas sans onTap (prop optionnelle)", async () => {
    const user = userEvent.setup();
    render(<CollectionGrid slots={slots} />);
    await user.click(screen.getByRole("button", { name: "Objet A" }));
    // Aucun throw : le wrapper latest-ref gère l'absence de handler.
  });

  it("latest-ref : un onTap recréé à chaque render reste fonctionnel", async () => {
    const user = userEvent.setup();
    const premier = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <CollectionGrid slots={slots} onTap={(s) => premier(s)} />,
    );
    rerender(<CollectionGrid slots={slots} onTap={(s) => second(s)} />);
    await user.click(screen.getByRole("button", { name: "Objet A" }));
    // C'est bien le DERNIER handler qui est appelé, pas celui capturé au mount.
    expect(premier).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(slots[0]);
  });

  it("mémoïsation : re-render avec mêmes slots ne re-rend pas les cellules", () => {
    const { rerender } = render(
      <CollectionGrid slots={slots} onTap={() => {}} />,
    );
    const rendersInitiaux = itemImageRenders.length;
    expect(rendersInitiaux).toBeGreaterThan(0);

    // Nouveau handler inline (référence différente) mais mêmes slots :
    // grâce au wrapper stable, aucune cellule ne doit re-rendre.
    rerender(<CollectionGrid slots={slots} onTap={() => {}} />);
    expect(itemImageRenders.length).toBe(rendersInitiaux);
  });

  it("mémoïsation : seule la cellule dont le slot change re-rend", () => {
    const { rerender } = render(
      <CollectionGrid slots={slots} onTap={() => {}} />,
    );
    itemImageRenders.length = 0;

    const slotsModifies = [
      slots[0],
      { ...slots[1], donation: { etat: "Pristin état" as const, valeur: 99 } },
      slots[2],
    ];
    rerender(<CollectionGrid slots={slotsModifies} onTap={() => {}} />);
    // Seul "b" a une nouvelle référence → seule sa cellule re-rend.
    expect(itemImageRenders).toEqual(["b"]);
  });
});
