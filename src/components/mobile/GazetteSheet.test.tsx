// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GazetteSheet } from "./GazetteSheet";
import { CELEBRITES } from "@/data/celebrites";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
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

describe("GazetteSheet — météo", () => {
  it("la rangée des sept jours est suivie de ce que la météo CHANGE", () => {
    // Sept icônes sans légende ne disent pas au joueur à quoi elles servent.
    // Le texte vient du dictionnaire, pas d'un littéral recopié : le reformuler
    // ne doit pas casser ce test, seulement le supprimer.
    const { container } = render(
      <GazetteSheet
        {...base}
        celebrite={null}
        revelerMeteo
        meteoSemaine={["ensoleille", "nuageux", "pluvieux", "orageux", "ensoleille", "nuageux", "ensoleille"]}
      />,
    );
    expect(container.textContent).toContain(DICTIONNAIRES.fr.gazette.meteoLegende);
  });

  it("météo non révélée : pas de légende sans icônes à expliquer", () => {
    const { container } = render(
      <GazetteSheet {...base} celebrite={null} revelerMeteo={false} meteoSemaine={null} />,
    );
    expect(container.textContent).not.toContain(DICTIONNAIRES.fr.gazette.meteoLegende);
  });
});

describe("GazetteSheet — tourner la page", () => {
  /**
   * La pagination se calcule sur des hauteurs MESURÉES, toutes nulles en jsdom :
   * sans ce forçage, tout tient sur une page et l'interface de feuilletage
   * n'existe jamais dans les tests. On fait donc croire à chaque section
   * qu'elle est plus haute que la zone disponible → une section par page.
   */
  function forcerPlusieursPages() {
    const offset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    const client = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 500 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 600 });
    return () => {
      if (offset) Object.defineProperty(HTMLElement.prototype, "offsetHeight", offset);
      if (client) Object.defineProperty(HTMLElement.prototype, "clientHeight", client);
    };
  }

  it("plusieurs pages : coin fléché et indicateur en toutes lettres", () => {
    const restaurer = forcerPlusieursPages();
    try {
      const { container } = render(<GazetteSheet {...base} celebrite={null} />);
      const suivant = screen.getByRole("button", { name: DICTIONNAIRES.fr.gazette.pageSuivanteAria });
      // Le coin corné seul est trop discret : il porte désormais un chevron.
      expect(suivant.querySelector("[data-testid=chevron-page]")).toBeTruthy();
      // « 1/2 » devient « Page 1 / 2 ».
      expect(container.textContent).toContain("Page 1 / ");
    } finally {
      restaurer();
    }
  });

  it("tourner la page joue le bruit du journal, dans les DEUX sens", () => {
    const restaurer = forcerPlusieursPages();
    try {
      const onTournerPage = vi.fn();
      render(<GazetteSheet {...base} celebrite={null} onTournerPage={onTournerPage} />);
      fireEvent.click(screen.getByRole("button", { name: DICTIONNAIRES.fr.gazette.pageSuivanteAria }));
      expect(onTournerPage).toHaveBeenCalledTimes(1);
      // Revenir en arrière est aussi une page qu'on tourne.
      fireEvent.click(screen.getByRole("button", { name: DICTIONNAIRES.fr.gazette.pagePrecedenteAria }));
      expect(onTournerPage).toHaveBeenCalledTimes(2);
    } finally {
      restaurer();
    }
  });
});
