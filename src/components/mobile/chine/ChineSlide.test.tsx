// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChineSlideVue, type ChineSlide } from "./ChineSlide";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
import type { NegoPersona, ObjetEnVente } from "@/types/game";

afterEach(cleanup);

const persona: NegoPersona = {
  archetype: "grincheux",
  margePct: 0.1,
  elanPct: 0.25,
  patience: 3,
  tolerancePct: 0.3,
  sangFroid: 0.25,
};

function makeItem(): ObjetEnVente {
  return {
    id: "item-1",
    objet: createMockObjet(),
    prixVendeur: 100,
    prixAffiche: true,
    prixMinAccept: 60,
    negociationsTentees: 0,
    statut: "disponible",
    persona,
    negociation: null,
  };
}

function makeSlide(dejaPossede: boolean, estNouveau = false): ChineSlide {
  return {
    kind: "item",
    item: makeItem(),
    estRareOuPlus: false,
    coteConnue: false,
    dejaPossede,
    estNouveau,
  };
}

describe("ChineSlideVue — badge collection", () => {
  it("affiche le badge ✓ quand le template a déjà été possédé", () => {
    render(<ChineSlideVue slide={makeSlide(true)} />);
    expect(
      screen.getByLabelText("Déjà possédé dans la collection"),
    ).toBeTruthy();
  });

  it("pas de badge pour une découverte jamais possédée", () => {
    render(<ChineSlideVue slide={makeSlide(false)} />);
    expect(
      screen.queryByLabelText("Déjà possédé dans la collection"),
    ).toBeNull();
  });
});

describe("ChineSlideVue — découverte", () => {
  it("affiche la pill « Nouveau » sur un template jamais croisé", () => {
    render(<ChineSlideVue slide={makeSlide(false, true)} />);
    expect(screen.getByText("Nouveau")).toBeTruthy();
  });

  it("pas de pill sur un template déjà croisé", () => {
    render(<ChineSlideVue slide={makeSlide(false, false)} />);
    expect(screen.queryByText("Nouveau")).toBeNull();
  });

  it("la pill porte la classe de pulsation", () => {
    render(<ChineSlideVue slide={makeSlide(false, true)} />);
    expect(
      screen.getByText("Nouveau").classList.contains("broc-pill-nouveau"),
    ).toBe(true);
  });

  it("la pill expose la couleur de halo de la rareté", () => {
    render(<ChineSlideVue slide={makeSlide(false, true)} />);
    const pill = screen.getByText("Nouveau") as HTMLElement;
    expect(pill.style.getPropertyValue("--pill-halo")).not.toBe("");
  });
});

describe("ChineSlideVue — plancher révélé (Le Flair v2)", () => {
  it("affiche le plancher du vendeur quand plancherRevele est fourni", () => {
    const slide: ChineSlide = {
      ...(makeSlide(false) as Extract<ChineSlide, { kind: "item" }>),
      plancherRevele: 55,
    };
    render(<ChineSlideVue slide={slide} />);
    expect(screen.getByText(/plancher 55 €/i)).toBeTruthy();
  });

  it("n'affiche rien sans plancherRevele", () => {
    render(<ChineSlideVue slide={makeSlide(false)} />);
    expect(screen.queryByText(/plancher/i)).toBeNull();
  });
});

describe("ChineSlideVue — tampon de statut", () => {
  function itemAvec(over: Partial<ObjetEnVente>): ChineSlide {
    const base = makeSlide(false) as Extract<ChineSlide, { kind: "item" }>;
    return { ...base, item: { ...base.item, ...over } };
  }

  it("stock plein : l'objet est tamponné, comme un objet vendu", () => {
    // Le texte rouge « Stockage plein » du tiroir passait inaperçu (retour
    // device) : l'information vit désormais sur l'objet lui-même.
    render(<ChineSlideVue slide={makeSlide(false)} plein />);
    expect(screen.getByText("Stock plein")).toBeTruthy();
  });

  it("stock plein grise l'objet, comme les autres états bloqués", () => {
    render(<ChineSlideVue slide={makeSlide(false)} plein />);
    // La variante « grise » se lit à son filtre CSS (ItemSticker n'expose pas
    // d'attribut de variante) : c'est le même désaturé que « Vendu ». Selon
    // que le sticker rende une image ou son icône de repli, le filtre est
    // porté par des éléments différents — on cherche donc n'importe lequel.
    const grise = Array.from(document.querySelectorAll<HTMLElement>("*")).some(
      (n) => n.style.filter.includes("grayscale"),
    );
    expect(grise).toBe(true);
  });

  it("déjà acheté : « Vendu » l'emporte sur « Stock plein »", () => {
    // Acheter REMPLIT le stockage : sans priorité explicite, la carte de
    // l'objet qu'on vient d'acquérir basculerait sur « Stock plein » —
    // elle annoncerait l'empêchement au lieu de la réussite.
    render(<ChineSlideVue slide={itemAvec({ statut: "achete" })} plein />);
    expect(screen.getByText("Vendu")).toBeTruthy();
    expect(screen.queryByText("Stock plein")).toBeNull();
  });

  it("vendeur fâché : son tampon l'emporte aussi", () => {
    render(
      <ChineSlideVue
        slide={itemAvec({ negociation: { statut: "fache" } as ObjetEnVente["negociation"] })}
        plein
      />,
    );
    expect(screen.getByText("Vendeur fâché")).toBeTruthy();
    expect(screen.queryByText("Stock plein")).toBeNull();
  });

  it("stock disponible : aucun tampon", () => {
    render(<ChineSlideVue slide={makeSlide(false)} />);
    expect(screen.queryByText("Stock plein")).toBeNull();
    expect(screen.queryByText("Vendu")).toBeNull();
  });
});
