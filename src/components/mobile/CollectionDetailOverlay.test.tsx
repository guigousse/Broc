// @vitest-environment jsdom
/**
 * Depuis le 2026-08-28, la fiche d'une pièce de la collection est LA MÊME que
 * celle d'un objet du stockage (étoiles, plaque de laiton, valeur à gauche et
 * thème à droite) — à un bouton près : celui qui retire la pièce.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CollectionDetailOverlay } from "./CollectionDetailOverlay";
import { createMockSlot } from "@/lib/__test-fixtures__/gameState";
import { DICTIONNAIRES } from "@/lib/i18n/ui";

afterEach(cleanup);

const slotDonne = () =>
  createMockSlot({
    templateId: "ma.lampe_petrole_ancienne",
    nom: "Lampe à pétrole ancienne",
    categorie: "Maison",
    dejaPossede: true,
    donation: { etat: "Très bon", valeur: 61.6, valeurBase: 45, prixAchat: 20 },
  });

const rendre = (props: Partial<Parameters<typeof CollectionDetailOverlay>[0]> = {}) =>
  render(
    <CollectionDetailOverlay
      open
      onClose={() => {}}
      slot={slotDonne()}
      candidatsCount={0}
      onAjouter={() => {}}
      onRetirer={() => {}}
      {...props}
    />,
  );

describe("CollectionDetailOverlay — mise en page du stockage", () => {
  it("grave le nom sur la plaque, sous les étoiles d'état", () => {
    rendre();
    const etoiles = screen.getByTestId("etoiles-fiche");
    const plaque = screen.getByTestId("fiche-plaque");
    expect(plaque.textContent).toContain("Lampe à pétrole ancienne");
    expect(
      etoiles.compareDocumentPosition(plaque) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("liste la valeur de la donation, le prix payé et le thème", () => {
    rendre();
    const items = screen.getByTestId("fiche-liste").querySelectorAll("li");
    expect(items.length).toBe(3);
    expect(screen.getByTestId("fiche-valeur").textContent).toBe("62 €");
    expect(items[1].textContent).toContain("20 €");
    expect(screen.getByTestId("fiche-theme").textContent).toContain(
      DICTIONNAIRES.fr.categories.maison,
    );
  });

  it("écrit « 0 € (cadeau) » pour une donation sans prix payé", () => {
    const slot = slotDonne();
    slot.donation = { etat: "Bon", valeur: 45 };
    rendre({ slot });
    expect(screen.getByText(DICTIONNAIRES.fr.inventaire.prixAchatCadeau)).toBeTruthy();
  });

  it("se ferme par la croix", () => {
    const onClose = vi.fn();
    rendre({ onClose });
    fireEvent.click(screen.getByRole("button", { name: DICTIONNAIRES.fr.commun.fermer }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("retire la pièce par le bouton dédié", () => {
    const onRetirer = vi.fn();
    rendre({ onRetirer });
    fireEvent.click(
      screen.getByRole("button", { name: DICTIONNAIRES.fr.inventaire.retirerDeCollection }),
    );
    expect(onRetirer).toHaveBeenCalledTimes(1);
  });

  it("reste inerte pendant la leçon guidée", () => {
    const onRetirer = vi.fn();
    rendre({ onRetirer, retirerInerte: true });
    fireEvent.click(
      screen.getByRole("button", { name: DICTIONNAIRES.fr.inventaire.retirerDeCollection }),
    );
    expect(onRetirer).not.toHaveBeenCalled();
  });

  it("propose d'ajouter une pièce à un slot vide, sans étoiles ni valeur", () => {
    rendre({ slot: createMockSlot({ nom: "Objet test" }), candidatsCount: 2 });
    expect(screen.queryByTestId("etoiles-fiche")).toBeNull();
    expect(screen.queryByTestId("fiche-valeur")).toBeNull();
    expect(screen.getByTestId("fiche-plaque").textContent).toContain("Objet test");
    expect(
      screen.getByRole("button", { name: DICTIONNAIRES.fr.inventaire.ajouterALaCollection }),
    ).toBeTruthy();
  });

  it("floute ce qu'il y a derrière le voile", () => {
    rendre();
    const voile = screen.getByRole("dialog");
    expect(voile.style.backdropFilter).toContain("blur");
  });
});
