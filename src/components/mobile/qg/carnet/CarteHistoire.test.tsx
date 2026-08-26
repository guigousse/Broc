// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CarteHistoire } from "./CarteHistoire";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";
import { courrierDeChapitre } from "@/lib/quetes/principales";
import type { Courrier } from "@/types/game";

afterEach(cleanup);

function chapitre(id: string, titre: string, avecCible = true): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "principale", expediteurId: "grand-pere",
      titre, corps: ["Retrouver une lampe."],
      cibles: avecCible ? [{ templateId: "ma.lampe_petrole_ancienne" }] : [],
      ...(avecCible ? {} : { objectifs: [{ type: "ventesCumulees" as const, montant: 300 }] }),
      recompense: { argent: 60 },
    },
  };
}

describe("CarteHistoire", () => {
  it("porte data-commande-id (ancre de la cérémonie)", () => {
    const c = chapitre("trame_ch3", "La lampe de mon atelier");
    render(<CarteHistoire courrier={c} state={createMockGameState({ courriers: [c] })} onLivrer={() => {}} />);
    expect(document.querySelector('[data-commande-id="trame_ch3"]')).toBeTruthy();
  });

  it("le fil montre les deux derniers livrés, le courant, puis ???", () => {
    const encours = chapitre("trame_ch3", "La lampe de mon atelier");
    const livre1 = chapitre("trame_ch1", "Vendre, c'est vivre");
    const livre2 = chapitre("trame_ch2", "Le miroir de l'entrée");
    const state = createMockGameState({
      courriers: [livre1, livre2, encours],
      missions: [
        { courrierId: "trame_ch1", statut: "livree", jourResolution: 5 },
        { courrierId: "trame_ch2", statut: "livree", jourResolution: 9 },
        { courrierId: "trame_ch3", statut: "active" },
      ],
    });
    render(<CarteHistoire courrier={encours} state={state} onLivrer={() => {}} />);
    expect(screen.getByText("Vendre, c'est vivre")).toBeTruthy();
    expect(screen.getByText("Le miroir de l'entrée")).toBeTruthy();
    expect(screen.getAllByText("La lampe de mon atelier").length).toBeGreaterThan(0);
    expect(screen.getByText("???")).toBeTruthy();
  });

  it("trois chapitres livrés ou plus : le fil ne garde que les deux plus récents", () => {
    const encours = chapitre("trame_ch4", "Le chargement final");
    const livre1 = chapitre("trame_ch1", "Le premier arrivage");
    const livre2 = chapitre("trame_ch2", "Le second arrivage");
    const livre3 = chapitre("trame_ch3", "Le troisième arrivage");
    const state = createMockGameState({
      courriers: [livre1, livre2, livre3, encours],
      missions: [
        { courrierId: "trame_ch1", statut: "livree", jourResolution: 5 },
        { courrierId: "trame_ch2", statut: "livree", jourResolution: 9 },
        { courrierId: "trame_ch3", statut: "livree", jourResolution: 14 },
        { courrierId: "trame_ch4", statut: "active" },
      ],
    });
    const { container } = render(<CarteHistoire courrier={encours} state={state} onLivrer={() => {}} />);
    expect(screen.queryByText("Le premier arrivage")).toBeNull();
    expect(screen.getByText("Le second arrivage")).toBeTruthy();
    expect(screen.getByText("Le troisième arrivage")).toBeTruthy();
    expect(screen.getAllByText("Le chargement final").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-etape-fil]").length).toBe(4); // 2 livrés + courant + ???
  });

  it("au premier chapitre, le fil commence par le courant sans ligne vide", () => {
    const c = chapitre("trame_ch1", "La lampe de mon atelier");
    const state = createMockGameState({ courriers: [c], missions: [{ courrierId: "trame_ch1", statut: "active" }] });
    const { container } = render(<CarteHistoire courrier={c} state={state} onLivrer={() => {}} />);
    expect(container.querySelectorAll("[data-etape-fil]").length).toBe(2); // le courant + ???
  });

  it("chapitre sans objet : le polaroïd porte une icône", () => {
    const c = chapitre("trame_ch2", "Vendre, c'est vivre", false);
    render(<CarteHistoire courrier={c} state={createMockGameState({ courriers: [c] })} onLivrer={() => {}} />);
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeTruthy();
  });

  it("chapitre avec objet : le polaroïd porte la photo", () => {
    const c = chapitre("trame_ch3", "La lampe de mon atelier");
    render(<CarteHistoire courrier={c} state={createMockGameState({ courriers: [c] })} onLivrer={() => {}} />);
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeTruthy();
  });

  it("aucune accolade non remplacée", () => {
    const c = chapitre("trame_ch3", "La lampe de mon atelier");
    const { container } = render(<CarteHistoire courrier={c} state={createMockGameState({ courriers: [c] })} onLivrer={() => {}} />);
    expect(container.textContent ?? "").not.toMatch(/\{[a-z]+\}/);
  });

  // Régression : `ICONE_FORME` ne couvrait que les six formes des quêtes
  // PÉRIODIQUES (chantier antérieur) — jamais un mapping complet sur
  // `ObjectifMission`. Sept des seize chapitres de la trame (restauration,
  // niveau, valeurCollection, ou aucun objectif du tout) en portent un type
  // hors de ce mapping et affichaient un polaroïd vide (mode "vide"). Itérer
  // sur TOUS les chapitres, pas seulement les quatre déjà repérés, pour que
  // le test continue de protéger un futur chapitre à un type non couvert.
  it("chaque chapitre de la trame affiche quelque chose dans son polaroïd (jamais 'vide')", () => {
    for (const ch of QUETES_PRINCIPALES) {
      const courrier = courrierDeChapitre(ch, 1);
      const { container, unmount } = render(
        <CarteHistoire courrier={courrier} state={createMockGameState({ courriers: [courrier] })} onLivrer={() => {}} />,
      );
      expect(
        container.querySelector("[data-photo-scotchee='vide']"),
        `${ch.id} affiche un polaroïd vide`,
      ).toBeNull();
      unmount();
    }
  });
});
