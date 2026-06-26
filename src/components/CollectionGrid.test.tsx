// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionGrid } from "./CollectionGrid";
import type { CollectionSlot } from "@/types/game";

/**
 * ItemSticker repose sur des images/filtres inutiles pour tester la grille. On
 * le remplace par un stub traçable qui expose `variant`/`halo` (assertions) et
 * permet de compter les re-renders des cellules mémoïsées.
 */
const stickerRenders: string[] = [];
vi.mock("@/components/ui/ItemSticker", () => ({
  ItemSticker: ({
    templateId,
    variant,
    halo,
  }: {
    templateId: string;
    variant?: string;
    halo?: string;
  }) => {
    stickerRenders.push(templateId);
    return (
      <span
        data-testid={`sticker-${templateId}`}
        data-variant={variant ?? "normal"}
        data-halo={halo ?? ""}
      />
    );
  },
}));

afterEach(() => {
  cleanup();
  stickerRenders.length = 0;
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

  it("non découvert : silhouette désactivée, variant silhouette, pas de halo", () => {
    render(<CollectionGrid slots={slots} />);
    const silhouette = screen.getByRole("button", { name: "Pièce inconnue" });
    expect((silhouette as HTMLButtonElement).disabled).toBe(true);
    const sticker = screen.getByTestId("sticker-c");
    expect(sticker.getAttribute("data-variant")).toBe("silhouette");
    expect(sticker.getAttribute("data-halo")).toBe(""); // rareté non révélée
  });

  it("vu non possédé : variant grisé + halo de rareté", () => {
    render(
      <CollectionGrid
        slots={[makeSlot({ templateId: "v", nom: "Objet V", donation: null })]}
      />,
    );
    const sticker = screen.getByTestId("sticker-v");
    expect(sticker.getAttribute("data-variant")).toBe("grise");
    expect(sticker.getAttribute("data-halo")).toBe("#C9B98C"); // commun outer
  });

  it("possédé : variant normal + halo de rareté", () => {
    render(
      <CollectionGrid slots={[makeSlot({ templateId: "p", nom: "Objet P" })]} />,
    );
    const sticker = screen.getByTestId("sticker-p");
    expect(sticker.getAttribute("data-variant")).toBe("normal");
    expect(sticker.getAttribute("data-halo")).toBe("#C9B98C");
  });

  it("plus de cadre : la cellule est transparente (pas de fond/cadre)", () => {
    render(<CollectionGrid slots={slots} />);
    const bouton = screen.getByRole("button", { name: "Objet A" });
    expect(bouton.style.background).toBe("transparent");
    expect(bouton.style.boxShadow).toBe(""); // plus de filet interne
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
    const rendersInitiaux = stickerRenders.length;
    expect(rendersInitiaux).toBeGreaterThan(0);

    // Nouveau handler inline (référence différente) mais mêmes slots :
    // grâce au wrapper stable, aucune cellule ne doit re-rendre.
    rerender(<CollectionGrid slots={slots} onTap={() => {}} />);
    expect(stickerRenders.length).toBe(rendersInitiaux);
  });

  it("mémoïsation : seule la cellule dont le slot change re-rend", () => {
    const { rerender } = render(
      <CollectionGrid slots={slots} onTap={() => {}} />,
    );
    stickerRenders.length = 0;

    const slotsModifies = [
      slots[0],
      { ...slots[1], donation: { etat: "Pristin état" as const, valeur: 99 } },
      slots[2],
    ];
    rerender(<CollectionGrid slots={slotsModifies} onTap={() => {}} />);
    // Seul "b" a une nouvelle référence → seule sa cellule re-rend.
    expect(stickerRenders).toEqual(["b"]);
  });

  const slotNouveau = makeSlot({
    templateId: "n",
    nom: "Objet N",
    donation: null,
    vu: true,
    vuDansCollection: false,
  });

  it("badge * : affiché pour une nouveauté non consultée", () => {
    render(<CollectionGrid slots={[slotNouveau]} />);
    expect(screen.getByLabelText("Nouvellement découvert").textContent).toBe("*");
  });

  it("badge + : affiché si le templateId est en stock et le slot non donné", () => {
    render(
      <CollectionGrid
        slots={[makeSlot({ templateId: "s", nom: "Objet S", donation: null })]}
        enStockIds={new Set(["s"])}
      />,
    );
    expect(
      screen.getByLabelText("Exemplaire disponible en stock").textContent,
    ).toBe("+");
  });

  it("badge + : absent si le slot est déjà donné", () => {
    render(
      <CollectionGrid
        slots={[makeSlot({ templateId: "d", nom: "Objet D" })]}
        enStockIds={new Set(["d"])}
      />,
    );
    expect(screen.queryByLabelText("Exemplaire disponible en stock")).toBeNull();
  });

  it("priorité : + masque * quand les deux conditions sont vraies", () => {
    render(
      <CollectionGrid slots={[slotNouveau]} enStockIds={new Set(["n"])} />,
    );
    expect(screen.getByLabelText("Exemplaire disponible en stock")).toBeTruthy();
    expect(screen.queryByLabelText("Nouvellement découvert")).toBeNull();
  });

  it("étagères : une planche par rangée (3 slots, colonnes=3 → 1 planche)", () => {
    render(<CollectionGrid slots={slots} />);
    expect(screen.getAllByTestId("planche")).toHaveLength(1);
  });

  it("étagères : colonnes=1 → une planche par item", () => {
    render(<CollectionGrid slots={slots} colonnes={1} />);
    expect(screen.getAllByTestId("planche")).toHaveLength(3);
  });

  it("étagères : la rangée utilise repeat(colonnes, 1fr)", () => {
    render(<CollectionGrid slots={slots} colonnes={2} />);
    const rangee = screen.getAllByRole("button")[0].parentElement as HTMLElement;
    expect(rangee.style.gridTemplateColumns).toBe("repeat(2, 1fr)");
    expect(screen.getAllByTestId("planche")).toHaveLength(2);
  });

  it("étagères : colonnes=5 → repeat(5, 1fr), une seule planche pour 3 slots", () => {
    render(<CollectionGrid slots={slots} colonnes={5} />);
    const rangee = screen.getAllByRole("button")[0].parentElement as HTMLElement;
    expect(rangee.style.gridTemplateColumns).toBe("repeat(5, 1fr)");
    expect(screen.getAllByTestId("planche")).toHaveLength(1);
  });

  it("étagères : planche et espaces proportionnels au zoom", () => {
    const attendus: Array<[1 | 3 | 5, number, number, number]> = [
      [1, 48, 18, 48],
      [3, 16, 6, 16],
      [5, 10, 4, 10],
    ];
    for (const [colonnes, hauteur, espaceHaut, espaceBas] of attendus) {
      const { unmount } = render(
        <CollectionGrid slots={slots} colonnes={colonnes} />,
      );
      const planche = screen.getAllByTestId("planche")[0];
      expect(planche.style.height).toBe(`${hauteur}px`);
      expect(planche.style.marginTop).toBe(`${espaceHaut}px`);
      expect(planche.style.marginBottom).toBe(`${espaceBas}px`);
      unmount();
    }
  });
});
