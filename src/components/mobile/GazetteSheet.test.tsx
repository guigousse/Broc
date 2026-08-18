// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GazetteSheet } from "./GazetteSheet";
import { CELEBRITES } from "@/data/celebrites";
import type { CelebriteEvenement } from "@/types/game";

afterEach(cleanup);

const base = {
  open: true,
  onClose: () => {},
  jourActuel: 96,
  tendances: [],
  categoriesConnues: new Set<never>(),
  meteoSemaine: null,
  jourDebutSemaine: 92,
  revelerMeteo: false,
  revelerCelebrite: true,
  influenceDisponible: false,
  onRerollMeteo: () => {},
  onRerollCelebrite: () => {},
};

function celeb(nom: string): CelebriteEvenement {
  return { brocanteId: "vide_grenier_quartier", nom, jourSemaine: 3 };
}

describe("GazetteSheet — carnet mondain", () => {
  it("une célébrité du catalogue est IMPRIMÉE, pas remplacée par un « ? »", () => {
    render(<GazetteSheet {...base} celebrite={celeb(CELEBRITES[0])} />);
    // ⚠ La gazette rend ses sections DEUX fois : une couche de mesure (hors
    // écran) sert à paginer, en plus de la page visible. Toute recherche par
    // testid doit donc être au pluriel sur ce composant.
    const portraits = screen.getAllByTestId("gazette-portrait-celebrite");
    expect(portraits.length).toBeGreaterThan(0);
    const portrait = portraits[0] as HTMLImageElement;
    expect(portrait.getAttribute("src")).toContain("client-celebrite-");
    // Traitée à l'encre du journal, pas collée en couleur sur le papier.
    expect(portrait.style.filter).toContain("grayscale");
    // Le nom est déjà écrit dans la phrase à côté : un alt le ferait annoncer
    // deux fois par un lecteur d'écran.
    expect(portrait.getAttribute("alt")).toBe("");
  });

  it("un nom hors catalogue retombe sur la vignette « ? » plutôt qu'une image cassée", () => {
    const { container } = render(<GazetteSheet {...base} celebrite={celeb("quelqu'un d'inconnu")} />);
    expect(screen.queryAllByTestId("gazette-portrait-celebrite")).toHaveLength(0);
    expect(container.textContent).toContain("?");
  });
});
