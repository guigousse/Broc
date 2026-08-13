// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CommandeRow } from "./CommandeRow";
import type { Courrier, GameState, ObjectifMission } from "@/types/game";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

function courrierMission(): Courrier {
  return {
    id: "m1", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "principale", expediteurId: "maman",
      titre: "Le coffre rétro", corps: ["Aide-moi."],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      recompense: { argent: 90 },
    },
  };
}

describe("CommandeRow", () => {
  it("affiche le titre et le nom du commanditaire", () => {
    const state = createMockGameState();
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByText("Le coffre rétro")).toBeTruthy();
    expect(screen.getByText(/Maman/)).toBeTruthy();
  });

  it("montre le bouton Livrer actif quand toutes les cibles sont réunies", () => {
    const state: GameState = createMockGameState({
      inventaireJoueur: [createMockObjet({ templateId: "ma.lampe_petrole_ancienne", etat: "Très bon", categorie: "Maison" })],
      missions: [{ courrierId: "m1", statut: "active" }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    const btn = screen.getByRole("button", { name: /Livrer/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("grise Livrer si une cible manque", () => {
    const state = createMockGameState({
      inventaireJoueur: [],
      missions: [{ courrierId: "m1", statut: "active" }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    const btn = screen.getByRole("button", { name: /Livrer/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("affiche la progression d'un objectif ventesCumulees et gate le bouton Livrer", () => {
    const courrier: Courrier = {
      id: "m2", type: "mission", jourRecu: 1, lu: true,
      payload: {
        type: "mission", categorie: "principale", expediteurId: "maman",
        titre: "Un pactole pour la mairie", corps: ["Fais rentrer des sous."],
        cibles: [],
        objectifs: [{ type: "ventesCumulees", montant: 300 }],
        recompense: { argent: 50 },
      },
    };
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    render(<CommandeRow courrier={courrier} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    // Présent deux fois : aperçu sur la carte fermée + ligne du détail déplié.
    expect(screen.getAllByText(/0\/300/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Prêt ✓")).toBeNull();
  });

  it("carte fermée : une vignette d'aperçu par cible, avec plafond 4 + jeton +n", () => {
    const courrier: Courrier = {
      id: "m4", type: "mission", jourRecu: 1, lu: true,
      payload: {
        type: "mission", categorie: "principale", expediteurId: "maman",
        titre: "La grande rafle", corps: ["Tout me trouver."],
        cibles: [
          { templateId: "a" }, { templateId: "b" }, { templateId: "c" },
          { templateId: "d" }, { templateId: "e" }, { templateId: "f" },
        ],
        recompense: { argent: 10 },
      },
    };
    const state = createMockGameState({ missions: [{ courrierId: "m4", statut: "active" }] });
    render(<CommandeRow courrier={courrier} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getAllByTestId("apercu-cible").length).toBe(4);
    expect(screen.getByTestId("apercu-plus").textContent).toBe("+2");
  });

  it("carte fermée sans cible objet : l'aperçu affiche l'objectif à la place des vignettes", () => {
    const courrier: Courrier = {
      id: "m5", type: "mission", jourRecu: 1, lu: true,
      payload: {
        type: "mission", categorie: "principale", expediteurId: "maman",
        titre: "Pactole", corps: ["Des sous."],
        cibles: [], objectifs: [{ type: "ventesCumulees", montant: 300 }],
        recompense: { argent: 10 },
      },
    };
    const state = createMockGameState({ missions: [{ courrierId: "m5", statut: "active" }] });
    render(<CommandeRow courrier={courrier} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.queryAllByTestId("apercu-cible").length).toBe(0);
    expect(screen.getByText(/Ventes cumulées/)).toBeTruthy();
  });

  it("en-tête replié : progression agrégée via data-testid, sans 0/0 ni NaN", () => {
    const courrier: Courrier = {
      id: "m3", type: "mission", jourRecu: 1, lu: true,
      payload: {
        type: "mission", categorie: "principale", expediteurId: "maman",
        titre: "Vendre, c'est vivre", corps: ["Cumuler des ventes."],
        cibles: [],
        objectifs: [{ type: "ventesCumulees", montant: 300 }],
        recompense: { argent: 80 },
      },
    };
    const state = createMockGameState({ missions: [{ courrierId: "m3", statut: "active" }] });
    render(<CommandeRow courrier={courrier} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByTestId("progression-compteur").textContent).toBe("0 / 300 €");
    expect((screen.getByTestId("progression-barre") as HTMLElement).style.width).not.toContain("NaN");
  });

  it("bandeau récompense : jetons argent + xp (défaut de catégorie) sur carte fermée", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m1", statut: "active" }] });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByTestId("jeton-argent").textContent).toContain("+90 €");
    expect(screen.getByTestId("jeton-xp").textContent).toContain("+100 XP"); // principale
    expect(screen.queryByTestId("jeton-energie")).toBeNull();
    // Agrégat remplies/total avec une CIBLE objet unique (pas d'objectif chiffré) :
    // aucun objet en inventaire, donc "0/1".
    expect(screen.getByTestId("progression-compteur").textContent).toBe("0/1");
  });

  it("commande livrable : le bandeau passe en PRÊT ✓ (plus de badge isolé)", () => {
    const state: GameState = createMockGameState({
      inventaireJoueur: [createMockObjet({ templateId: "ma.lampe_petrole_ancienne", etat: "Très bon", categorie: "Maison" })],
      missions: [{ courrierId: "m1", statut: "active" }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByText("Prêt ✓")).toBeTruthy();
    expect(screen.getByTestId("jeton-argent")).toBeTruthy();
  });

  it("échéance : pastille J−n", () => {
    const c = courrierMission();
    (c.payload as Extract<Courrier["payload"], { type: "mission" }>).jourLimite = 5;
    const state = createMockGameState({ jourActuel: 1, missions: [{ courrierId: "m1", statut: "active" }] });
    render(<CommandeRow courrier={c} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByText("J−4")).toBeTruthy();
  });
});

function courrierChiffre(objectif: ObjectifMission): Courrier {
  return {
    id: "m2", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "hebdomadaire", expediteurId: "mode",
      titre: "Quête chiffrée", corps: ["Vas-y."],
      cibles: [], objectifs: [objectif], recompense: { argent: 210 },
    },
  };
}

describe("objectifs chiffrés", () => {
  it("un objectif qui compte des objets n'a PAS de suffixe €", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    render(
      <CommandeRow
        courrier={courrierChiffre({ type: "ventesCategorie", categorie: "Mode", nombre: 5 })}
        state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}}
      />,
    );
    const compteur = screen.getByTestId("progression-compteur").textContent ?? "";
    expect(compteur).toContain("5");
    expect(compteur).not.toContain("€");
  });

  it("un objectif en argent garde son suffixe €", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    render(
      <CommandeRow
        courrier={courrierChiffre({ type: "beneficeCumule", montant: 850 })}
        state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}}
      />,
    );
    expect(screen.getByTestId("progression-compteur").textContent ?? "").toContain("€");
  });

  it("objets rares : compteur sans € et libellé sans marque non remplacée", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    const { container } = render(
      <CommandeRow
        courrier={courrierChiffre({ type: "objetsRares", nombre: 3 })}
        state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}}
      />,
    );
    expect(screen.getByTestId("progression-compteur").textContent ?? "").not.toContain("€");
    expect(container.textContent ?? "").not.toMatch(/\{[a-z]+\}/);
  });

  it("valeurCollection garde son suffixe € (régression : un montant, pas un compte d'objets)", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    render(
      <CommandeRow
        courrier={courrierChiffre({ type: "valeurCollection", montant: 1500 })}
        state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}}
      />,
    );
    expect(screen.getByTestId("progression-compteur").textContent ?? "").toContain("€");
  });
});

// La carte fermée (progression-compteur) et la liste dépliée des objectifs
// (objectif-detail-compteur) sont DEUX sites de rendu distincts qui décident
// chacun du suffixe € indépendamment — voir CommandeRow.tsx lignes ~181 et
// ~299. Les tests ci-dessus, qui ne lisent que progression-compteur,
// n'auraient rien détecté si seul le second site avait régressé : les deux
// échecs RED du step 2 portaient sur progression-compteur, jamais sur la
// liste dépliée. Ce describe couvre spécifiquement le second site.
describe("objectifs chiffrés — liste dépliée (site 2)", () => {
  it("liste dépliée : un objectif qui compte des objets n'a PAS de suffixe €", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    render(
      <CommandeRow
        courrier={courrierChiffre({ type: "objetsRares", nombre: 3 })}
        state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}}
      />,
    );
    expect(screen.getByTestId("objectif-detail-compteur").textContent ?? "").not.toContain("€");
  });

  it("liste dépliée : un objectif en argent garde son suffixe €", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    render(
      <CommandeRow
        courrier={courrierChiffre({ type: "valeurCollection", montant: 1500 })}
        state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}}
      />,
    );
    expect(screen.getByTestId("objectif-detail-compteur").textContent ?? "").toContain("€");
  });
});
