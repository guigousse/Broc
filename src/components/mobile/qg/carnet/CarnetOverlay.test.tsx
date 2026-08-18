// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CarnetOverlay } from "./CarnetOverlay";
import { CLE_STOCKAGE_CARNET } from "./useCarnetSections";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { chapitrePret, courrierDeChapitre } from "@/lib/quetes/principales";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";
import type { Courrier, GameState, MissionResolution } from "@/types/game";

afterEach(() => { cleanup(); window.localStorage.clear(); });

function quete(id: string, categorie: "principale" | "quotidienne" | "hebdomadaire", titre: string): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie, expediteurId: "mode", titre, corps: ["c"],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne" }], recompense: { argent: 60 },
    },
  };
}

/** Quête chiffrée (cinq des six formes périodiques) : `cibles: []`, un seul
 *  objectif non-objet. `estMissionLivrable` seule la trouverait "livrable" à
 *  0 % de progression (`0 === payload.cibles.length` est vacuously vrai). */
function queteChiffree(id: string, categorie: "quotidienne" | "hebdomadaire", titre: string): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie, expediteurId: "mode", titre, corps: ["c"],
      cibles: [], objectifs: [{ type: "beneficeCumule", montant: 850 }], recompense: { argent: 210 },
    },
  };
}

function etat(courriers: Courrier[], niveau = 5): GameState {
  const s = createMockGameState({
    courriers,
    missions: courriers.map((c) => ({ courrierId: c.id, statut: "active" as const })),
  });
  return { ...s, brocanteur: { ...s.brocanteur, niveau } };
}

/** État bâti à partir de missions déjà résolues (livrées), pour les scénarios
 *  de trame où le statut n'est PAS "toutes actives" — `etat()` ne convient
 *  pas ici. */
function etatResolu(courriers: Courrier[], missions: MissionResolution[], niveau = 5): GameState {
  const s = createMockGameState({ courriers, missions });
  return { ...s, brocanteur: { ...s.brocanteur, niveau } };
}

const base = { open: true, onClose: () => {}, onLivrerMission: () => ({ ok: true }) };

describe("CarnetOverlay", () => {
  it("fermé : ne rend rien", () => {
    const { container } = render(<CarnetOverlay {...base} open={false} state={etat([])} />);
    expect(container.firstChild).toBeNull();
  });

  it("les trois sections sont dépliées à la première ouverture", () => {
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    expect(screen.getByText("La bonne pioche")).toBeTruthy();
  });

  it("sous le niveau 3, les sections périodiques annoncent le verrou", () => {
    render(<CarnetOverlay {...base} state={etat([], 2)} />);
    expect(screen.getAllByText(/niveau 3|level 3/i).length).toBeGreaterThan(0);
  });

  it("les seize chapitres livrés : HISTOIRE annonce la fin de la trame", () => {
    const courriers = QUETES_PRINCIPALES.map((ch) => courrierDeChapitre(ch, 1));
    const missions: MissionResolution[] = QUETES_PRINCIPALES.map((ch) => ({
      courrierId: ch.id, statut: "livree", jourResolution: 1,
    }));
    const state = etatResolu(courriers, missions);
    // Sanity du fixture : la trame n'a plus rien à offrir.
    expect(chapitrePret(state)).toBeNull();
    render(<CarnetOverlay {...base} state={state} />);
    expect(screen.getByText(/tout raconté/i)).toBeTruthy();
  });

  it("entre deux chapitres (le suivant n'est pas encore accepté) : pas de ligne de clôture", () => {
    const ch1 = QUETES_PRINCIPALES.find((c) => c.ordre === 1)!;
    const courrier1 = courrierDeChapitre(ch1, 1);
    const state = etatResolu(
      [courrier1],
      [{ courrierId: courrier1.id, statut: "livree", jourResolution: 1 }],
    );
    // Sanity du fixture : contrairement au test précédent, la trame continue
    // — un prochain chapitre est dû (même fonction que celle qui arme la
    // pastille du grand-père). C'est ce qui distingue « entre deux
    // chapitres » de « la trame est finie ».
    expect(chapitrePret(state)).not.toBeNull();
    render(<CarnetOverlay {...base} state={state} />);
    expect(screen.queryByText(/tout raconté/i)).toBeNull();
    // Rien à afficher tant que le joueur n'a pas accepté le chapitre suivant :
    // aucune carte de quête (Histoire ou périodique) n'apparaît nulle part.
    expect(document.querySelector("[data-commande-id]")).toBeNull();
  });

  it("une section mémorisée repliée s'ouvre repliée", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify({ quotidiennes: true }));
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    expect(screen.queryByText("La bonne pioche")).toBeNull();
  });

  it("l'ouverture ciblée déplie la section MÊME si elle était mémorisée repliée", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify({ quotidiennes: true }));
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} missionInitialeId="q1" />);
    expect(screen.getByText("La bonne pioche")).toBeTruthy();
  });

  it("ni onglets, ni section Terminées", () => {
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByText(/terminées|completed/i)).toBeNull();
  });

  it("compteur d'en-tête repliée : une quête chiffrée à 0 % n'est jamais « prête » (piège vacuously livrable)", () => {
    // `beneficeCumule` (comme 4 des 6 formes périodiques) n'a pas de cible
    // objet : sans `missionLivrable` (qui vérifie AUSSI la progression de
    // l'objectif chiffré), le header annoncerait « prête » dès la création
    // de la quête, à 0 % de progression — rien n'est réellement livrable.
    const q = queteChiffree("q1", "quotidienne", "Le nerf de la guerre");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    // Replier la section pour révéler le compteur d'en-tête (masqué dépliée).
    fireEvent.click(screen.getByRole("button", { name: /Commandes quotidiennes/i }));
    const entete = screen.getByRole("button", { name: /Commandes quotidiennes/i });
    expect(entete.textContent ?? "").toMatch(/\(0\/1\)/);
    expect(entete.textContent ?? "").not.toMatch(/prête/i);
  });

  it("après l'ouverture ciblée, la section redevient repliable au tap", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify({ quotidiennes: true }));
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} missionInitialeId="q1" />);
    expect(screen.getByText("La bonne pioche")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Commandes quotidiennes/i }));
    // Un masquage au rendu (`cle === cibleSection ? false : estRepliee(cle)`)
    // resterait actif tant que `missionInitialeId` vaut "q1" : le tap sur
    // l'en-tête n'aurait aucun effet visible, la section serait bloquée
    // ouverte jusqu'à la fermeture du carnet.
    expect(screen.queryByText("La bonne pioche")).toBeNull();
  });
});
