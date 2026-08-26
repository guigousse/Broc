// @vitest-environment jsdom
/**
 * Cibles du coach portées par la première ligne du stockage (étoiles, thème,
 * bouton collection). Elles doivent toutes avoir une BOÎTE : une cible en
 * `display: contents` renvoie un rect 0×0 à l'origine, et TutorielCoach la
 * traite alors — à raison — comme introuvable, ce qui fait retomber la leçon
 * sur un voile plein sans halo (recette device 2026-08-19).
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { StockageItemRow } from "./StockageItemRow";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

function renderRow(cibleCoach: boolean) {
  return render(
    <StockageItemRow
      objet={createMockObjet()}
      valeurConnue
      collection={{ disponible: true, necessiteConfirmation: false }}
      onTap={() => {}}
      onEnvoyerCollection={() => {}}
      cibleCoach={cibleCoach}
      isLast
    />,
  );
}

describe("StockageItemRow — cibles du coach", () => {
  it("pose les trois cibles quand la ligne est celle de la visite guidée", () => {
    const { container } = renderRow(true);
    for (const cible of ["stockage-etat", "stockage-theme", "stockage-bouton"]) {
      expect(container.querySelector(`[data-tuto-coach="${cible}"]`), cible).toBeTruthy();
    }
  });

  it("aucune cible n'est en `display: contents` (rect 0×0 = cible perdue)", () => {
    const { container } = renderRow(true);
    for (const el of container.querySelectorAll<HTMLElement>("[data-tuto-coach]")) {
      expect(el.style.display, el.dataset.tutoCoach).not.toBe("contents");
    }
  });

  it("ne pose aucune cible sur les autres lignes", () => {
    const { container } = renderRow(false);
    expect(container.querySelector("[data-tuto-coach]")).toBeNull();
  });
});

/**
 * LES TROIS CAS DU BOUTON COLLECTION (demande de l'auteur, 2026-08-26).
 *
 * Le bouton disait seulement « j'envoie » ou « je remplace ». Il dit
 * maintenant ce que l'envoi FERA à la collection, avant le tap :
 *
 * 1. case vide      → une flèche qui entre ;
 * 2. exemplaire moindre → une flèche de tendance qui monte ;
 * 3. exemplaire meilleur → la même, qui descend.
 */
describe("StockageItemRow — le bouton d'envoi dit lequel des trois cas s'applique", () => {
  const rendre = (collection: Parameters<typeof StockageItemRow>[0]["collection"]) =>
    render(
      <StockageItemRow
        objet={createMockObjet()}
        valeurConnue
        collection={collection}
        onTap={() => {}}
        onEnvoyerCollection={() => {}}
        cibleCoach={false}
        isLast
      />,
    );

  it("case vide : la flèche ENTRE dans la collection", () => {
    const { container } = rendre({ disponible: true, necessiteConfirmation: false });
    expect(container.querySelector(".lucide-arrow-down-to-line")).toBeTruthy();
    expect(container.querySelector(".lucide-trending-up")).toBeNull();
    expect(container.querySelector(".lucide-trending-down")).toBeNull();
  });

  it("exemplaire MOINDRE déjà donné : la tendance MONTE", () => {
    const { container } = rendre({
      disponible: true,
      necessiteConfirmation: true,
      ancienneDonation: { etat: "Mauvais", valeur: 10 },
      tendance: "hausse",
    });
    expect(container.querySelector(".lucide-trending-up")).toBeTruthy();
    expect(container.querySelector(".lucide-arrow-down-to-line")).toBeNull();
  });

  it("exemplaire MEILLEUR déjà donné : la tendance DESCEND", () => {
    const { container } = rendre({
      disponible: true,
      necessiteConfirmation: true,
      ancienneDonation: { etat: "Pristin état", valeur: 500 },
      tendance: "baisse",
    });
    expect(container.querySelector(".lucide-trending-down")).toBeTruthy();
    expect(container.querySelector(".lucide-arrow-down-to-line")).toBeNull();
  });

  it("la flèche suit un changement de TENDANCE — le memo ne doit pas l'avaler", () => {
    // `collection` est recréé à chaque render du parent, donc comparé par
    // VALEUR dans le comparateur du memo. Un champ oublié dans cette liste et
    // la ligne garde éternellement sa première flèche : c'est arrivé au
    // moment même où `tendance` est née.
    const objet = createMockObjet();
    const props = {
      objet,
      valeurConnue: true,
      onTap: () => {},
      onEnvoyerCollection: () => {},
      cibleCoach: false,
      isLast: true,
    };
    const { container, rerender } = render(
      <StockageItemRow
        {...props}
        collection={{
          disponible: true, necessiteConfirmation: true, tendance: "hausse",
          ancienneDonation: { etat: "Mauvais", valeur: 10 },
        }}
      />,
    );
    expect(container.querySelector(".lucide-trending-up")).toBeTruthy();

    // Le joueur restaure l'objet : le MÊME objet, la MÊME case, mais l'envoi
    // ferait maintenant baisser la valeur.
    rerender(
      <StockageItemRow
        {...props}
        collection={{
          disponible: true, necessiteConfirmation: true, tendance: "baisse",
          ancienneDonation: { etat: "Pristin état", valeur: 500 },
        }}
      />,
    );
    expect(container.querySelector(".lucide-trending-down")).toBeTruthy();
    expect(container.querySelector(".lucide-trending-up")).toBeNull();
  });

  it("chaque cas porte son propre nom accessible — trois flèches, trois phrases", () => {
    const libelle = (c: Parameters<typeof StockageItemRow>[0]["collection"]) => {
      const { container } = rendre(c);
      const l = container.querySelector("button[aria-label]")?.getAttribute("aria-label");
      cleanup();
      return l;
    };
    const entrant = libelle({ disponible: true, necessiteConfirmation: false });
    const monte = libelle({
      disponible: true, necessiteConfirmation: true, tendance: "hausse",
      ancienneDonation: { etat: "Mauvais", valeur: 10 },
    });
    const descend = libelle({
      disponible: true, necessiteConfirmation: true, tendance: "baisse",
      ancienneDonation: { etat: "Pristin état", valeur: 500 },
    });
    expect(new Set([entrant, monte, descend]).size).toBe(3);
  });
});
