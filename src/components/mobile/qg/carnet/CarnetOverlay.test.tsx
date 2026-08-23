// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CarnetOverlay } from "./CarnetOverlay";
import { CLE_STOCKAGE_CARNET } from "./useCarnetSections";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";
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

  it("le voile s'arrête au sommet de la barre du bas, et la feuille reste au-dessus de lui", () => {
    // Le carnet est devenu un ONGLET (route /quetes) : on doit pouvoir en
    // sortir par la barre du bas. Un voile plein écran en z-index 50 la
    // recouvrait — même cadrage que FloatingRoomOverlay désormais.
    const { container } = render(<CarnetOverlay {...base} state={etat([])} />);
    const voile = container.querySelector("[aria-hidden]") as HTMLElement;
    expect(voile.style.bottom).toBe(
      "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
    );
    expect(voile.style.zIndex).toBe("35");
    const feuille = screen.getByRole("dialog") as HTMLElement;
    expect(Number(feuille.style.zIndex)).toBeGreaterThan(Number(voile.style.zIndex));
    expect(feuille.style.zIndex).toBe("36");
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
    fireEvent.click(screen.getByRole("button", { name: /Quotidien/i }));
    const entete = screen.getByRole("button", { name: /Quotidien/i });
    expect(entete.textContent ?? "").toMatch(/\(0\/1\)/);
    expect(entete.textContent ?? "").not.toMatch(/prête/i);
  });

  it("compteur d'en-tête HISTOIRE : un chapitre livrable est signalé section repliée", () => {
    // `trame_ch5` (« Atteindre le niveau 30 ») : `cibles: []`, un seul objectif
    // chiffré, donc livrable au niveau 30. Sans compteur sur l'en-tête
    // HISTOIRE, replier la section cacherait ce chapitre prêt à livrer sans
    // que rien ne le signale — exactement ce que le compteur des deux autres
    // sections évite déjà.
    const ch5 = QUETES_PRINCIPALES.find((c) => c.id === "trame_ch5")!;
    const courrier = courrierDeChapitre(ch5, 1);
    const state = etatResolu([courrier], [{ courrierId: courrier.id, statut: "active" }], 30);
    render(<CarnetOverlay {...base} state={state} />);
    fireEvent.click(screen.getByRole("button", { name: /^Histoire/i }));
    const entete = screen.getByRole("button", { name: /^Histoire/i });
    expect(entete.textContent ?? "").toMatch(/\(1\/1\)/);
    expect(entete.textContent ?? "").toMatch(/1 prête|1 ready/i);
  });

  it("après l'ouverture ciblée, la section redevient repliable au tap", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify({ quotidiennes: true }));
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} missionInitialeId="q1" />);
    expect(screen.getByText("La bonne pioche")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Quotidien/i }));
    // Un masquage au rendu (`cle === cibleSection ? false : estRepliee(cle)`)
    // resterait actif tant que `missionInitialeId` vaut "q1" : le tap sur
    // l'en-tête n'aurait aucun effet visible, la section serait bloquée
    // ouverte jusqu'à la fermeture du carnet.
    expect(screen.queryByText("La bonne pioche")).toBeNull();
  });

  it("carnet fermé : le minuteur de renouvellement ne tourne pas", () => {
    // `CarnetOverlay` est monté en permanence par le layout du QG : un
    // minuteur non gardé battrait la seconde pour toute la session, au bureau
    // comme en stockage, pour un compte à rebours que personne ne regarde.
    const vraiSetInterval = window.setInterval;
    let poses = 0;
    window.setInterval = ((...args: Parameters<typeof vraiSetInterval>) => {
      poses += 1;
      return vraiSetInterval(...args);
    }) as typeof window.setInterval;
    try {
      const { rerender } = render(<CarnetOverlay {...base} open={false} state={etat([])} />);
      expect(poses).toBe(0);
      rerender(<CarnetOverlay {...base} open state={etat([])} />);
      expect(poses).toBeGreaterThan(0); // à l'ouverture, il repart
    } finally {
      window.setInterval = vraiSetInterval;
    }
  });

  /* ─── tri et compteur des sections (trierActives / compteurSection) ─── */

  /** Quête à cible objet, avec le `jourRecu` comme seul départage possible
   *  (aucune quête du jeu ne fixe `jourLimite`, cf. T7). */
  function queteCible(id: string, titre: string, templateId: string, jourRecu: number): Courrier {
    return {
      id, type: "mission", jourRecu, lu: true,
      payload: {
        type: "mission", categorie: "quotidienne", expediteurId: "mode", titre, corps: ["c"],
        cibles: [{ templateId }], recompense: { argent: 60 },
      },
    };
  }

  const LAMPE = "ma.lampe_petrole_ancienne";
  const PICHET = "ma.pichet_faience_emaillee";

  /** État à inventaire : seule la quête qui vise LAMPE est livrable. */
  function etatAvecLampe(courriers: Courrier[], missions?: MissionResolution[]): GameState {
    const s = createMockGameState({
      courriers,
      missions: missions ?? courriers.map((c) => ({ courrierId: c.id, statut: "active" as const })),
      inventaireJoueur: [createMockObjet({ templateId: LAMPE, categorie: "Maison" })],
    });
    return { ...s, brocanteur: { ...s.brocanteur, niveau: 5 } };
  }

  function ordreAffiche(): string[] {
    return Array.from(document.querySelectorAll<HTMLElement>("[data-commande-id]")).map(
      (n) => n.dataset.commandeId ?? "",
    );
  }

  it("tri : les livrables d'abord, puis la plus anciennement reçue", () => {
    const prete = queteCible("q_prete", "Prête à rendre", LAMPE, 5);
    const recente = queteCible("q_recente", "Reçue hier", PICHET, 3);
    const ancienne = queteCible("q_ancienne", "Reçue il y a longtemps", PICHET, 1);
    // Ordre d'entrée délibérément défavorable : la livrable est la plus
    // récemment reçue, donc le tri doit la remonter CONTRE l'ordre du jour.
    render(<CarnetOverlay {...base} state={etatAvecLampe([recente, ancienne, prete])} />);
    expect(ordreAffiche()).toEqual(["q_prete", "q_ancienne", "q_recente"]);
  });

  it("la quête en cérémonie garde son rang et cesse d'être comptée « prête »", () => {
    // Pendant l'envol des jetons, le state est DÉJÀ post-livraison (mission
    // « livree », objet consommé). Sans le garde `ceremonieId`, la carte
    // dégringolerait en bas de la liste sous les yeux du joueur et le
    // compteur d'en-tête l'annoncerait encore « prête » alors qu'elle est en
    // cours de livraison.
    const prete = queteCible("q_prete", "Prête à rendre", LAMPE, 5);
    const autre = queteCible("q_autre", "Pas encore", PICHET, 1);
    const avant = etatAvecLampe([prete, autre]);
    const { rerender } = render(<CarnetOverlay {...base} state={avant} />);
    expect(ordreAffiche()).toEqual(["q_prete", "q_autre"]);

    fireEvent.click(screen.getByRole("button", { name: /^Livrer/i }));

    // Le state d'après : mission livrée, objet consommé — plus rien ne la
    // rend livrable, et `actives` ne la retiendrait pas sans le garde.
    const apres: GameState = {
      ...avant,
      inventaireJoueur: [],
      missions: [
        { courrierId: "q_prete", statut: "livree", jourResolution: 1 },
        { courrierId: "q_autre", statut: "active" },
      ],
    };
    rerender(<CarnetOverlay {...base} state={apres} />);
    expect(ordreAffiche()).toEqual(["q_prete", "q_autre"]);

    fireEvent.click(screen.getByRole("button", { name: /Quotidien/i }));
    const entete = screen.getByRole("button", { name: /Quotidien/i });
    expect(entete.textContent ?? "").toMatch(/\(1\/2\)/); // comptée faite…
    expect(entete.textContent ?? "").not.toMatch(/prête/i); // …mais plus « prête »
  });

  it("l'en-tête n'affiche que le minuteur, mais l'annonce en toutes lettres", () => {
    // Le libellé « Renouvellement dans » mangeait la largeur et faisait
    // tronquer le titre de section en français (« COMMANDES QUOTI… »).
    // À l'écran il ne reste que la durée ; un nombre nu ne voulant rien dire
    // sans la mise en page, la phrase complète survit en étiquette
    // d'accessibilité — c'est elle que lit un lecteur d'écran.
    render(<CarnetOverlay {...base} state={etat([])} />);
    const entete = screen.getByRole("button", { name: /Quotidien/i });
    const visible = entete.textContent ?? "";
    expect(visible).not.toMatch(/renouvellement/i);
    expect(visible).toMatch(/\d+\s*(h|min)/); // la durée, elle, est bien là
    // Le nom accessible du bouton, lui, porte la phrase entière.
    expect(entete.getAttribute("aria-label") ?? entete.querySelector("[aria-label]")?.getAttribute("aria-label") ?? "")
      .toMatch(/renouvellement/i);
  });
});
