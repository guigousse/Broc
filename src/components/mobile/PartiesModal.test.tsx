// @vitest-environment jsdom
/**
 * `PartiesModal` — écran de gestion des 3 emplacements de sauvegarde.
 * Seed via les VRAIES fonctions de `slots.ts` (pas de localStorage brut pour
 * l'index) ; seule la save elle-même (GameState sérialisé) est écrite à la
 * main, faute de helper d'écriture dans `slots.ts`.
 *
 * Mock de navigation : `window.location` est remplacé (pas d'accesseurs
 * jsdom réels) par un objet simple `{ href, reload }` via
 * `Object.defineProperty`, réinitialisé à chaque test — voir `mockLocation()`.
 * C'est la même clé (`href`/`reload`) que le code de prod assigne
 * (`src/app/page.tsx`, `ErrorScreen.tsx`), donc aucune indirection dans le
 * composant : le test observe directement les effets réels.
 *
 * La modal ne navigue plus elle-même pour lancer une partie : « Lancer la
 * partie » délègue au parent via `onLancer(slot)`. L'iris de transition et
 * l'ordre détacher/bascule/navigation sont testés dans `page.test.tsx`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { PartiesModal } from "./PartiesModal";
import {
  CLE_INDEX,
  changerSlotActif,
  chargerIndex,
  cleSlot,
  renommerSlot,
  toucherDerniereSession,
  type NumeroSlot,
} from "@/lib/storage/slots";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  localStorage.clear();
});

function ecrireSave(n: NumeroSlot, jour: number, niveau: number, budget: number) {
  localStorage.setItem(
    cleSlot(n),
    JSON.stringify({ jourActuel: jour, budget, brocanteur: { niveau, xp: 0 } }),
  );
}

function seedOccupe(
  n: NumeroSlot,
  opts: { nom?: string; jour: number; niveau: number; budget: number },
) {
  ecrireSave(n, opts.jour, opts.niveau, opts.budget);
  toucherDerniereSession(n);
  if (opts.nom) renommerSlot(n, opts.nom);
}

function mockLocation() {
  const location = { href: "", reload: vi.fn() };
  Object.defineProperty(window, "location", {
    configurable: true,
    value: location,
  });
  return location;
}

function ligne(numero: number) {
  return screen.getByRole("group", { name: `Emplacement ${numero}` });
}

describe("PartiesModal — fermée", () => {
  it("open=false : ne rend rien", () => {
    const { container } = render(
      <PartiesModal open={false} onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("PartiesModal — mode gestion, liste", () => {
  it("liste les 3 slots : occupés avec résumé + nom, vide avec message dédié", () => {
    seedOccupe(1, { nom: "Ma brocante", jour: 5, niveau: 3, budget: 1234 });
    seedOccupe(2, { jour: 2, niveau: 1, budget: 500 });
    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);

    const l1 = ligne(1);
    expect(within(l1).getByText("Ma brocante")).toBeTruthy();
    expect(within(l1).getByText(/Jour 5/)).toBeTruthy();
    expect(within(l1).getByText(/Niveau 3/)).toBeTruthy();
    expect(within(l1).getByText(/Valeur de la collection/)).toBeTruthy();

    const l2 = ligne(2);
    expect(within(l2).getByText("Partie 2")).toBeTruthy();

    const l3 = ligne(3);
    expect(within(l3).getByText("Emplacement vide")).toBeTruthy();
    // Un emplacement vide n'offre que le « + » de création.
    expect(
      within(l3).getByRole("button", { name: /Nouvelle partie dans l'emplacement 3/ }),
    ).toBeTruthy();
  });

  it("badge Active uniquement sur le slot actif", () => {
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    seedOccupe(2, { jour: 1, niveau: 1, budget: 0 });
    changerSlotActif(2);
    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);

    expect(within(ligne(2)).getByText("Active")).toBeTruthy();
    expect(within(ligne(1)).queryByText("Active")).toBeNull();
  });

  it("affiche « il y a X min » à partir de derniereSession", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    vi.setSystemTime(new Date(2026, 0, 1, 10, 5, 0));

    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);

    expect(within(ligne(1)).getByText(/il y a 5 min/)).toBeTruthy();
  });
});

describe("PartiesModal — sélection + Lancer la partie", () => {
  it("« Lancer la partie » est grisé sans sélection, puis appelle onLancer(slot choisi)", () => {
    const location = mockLocation();
    const onLancer = vi.fn();
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    seedOccupe(2, { jour: 1, niveau: 1, budget: 0 });
    changerSlotActif(1);

    render(
      <PartiesModal
        open
        onClose={vi.fn()}
        mode="gestion"
        onNouvellePartie={vi.fn()}
        onLancer={onLancer}
      />,
    );

    const lancer = screen.getByRole("button", { name: "Lancer la partie" });
    expect(lancer).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: "Choisir l'emplacement 2" }));
    expect(lancer).toHaveProperty("disabled", false);

    fireEvent.click(lancer);
    expect(onLancer).toHaveBeenCalledWith(2);
    // La modal ne bascule NI ne navigue elle-même : tout est délégué au
    // parent, qui orchestre l'iris (voir page.test.tsx).
    expect(chargerIndex().actif).toBe(1);
    expect(location.href).toBe("");
  });

  it("la surbrillance suit le slot cliqué (aria-pressed)", () => {
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    seedOccupe(2, { jour: 1, niveau: 1, budget: 0 });
    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);

    const carte1 = screen.getByRole("button", { name: "Choisir l'emplacement 1" });
    const carte2 = screen.getByRole("button", { name: "Choisir l'emplacement 2" });
    expect(carte1.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(carte1);
    expect(carte1.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(carte2);
    expect(carte1.getAttribute("aria-pressed")).toBe("false");
    expect(carte2.getAttribute("aria-pressed")).toBe("true");
  });

});

describe("PartiesModal — Renommer", () => {
  it("Enter dans le champ inline persiste via renommerSlot et rafraîchit la ligne", () => {
    seedOccupe(1, { nom: "Ancien nom", jour: 1, niveau: 1, budget: 0 });
    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);

    fireEvent.click(within(ligne(1)).getByRole("button", { name: "Renommer" }));
    const input = within(ligne(1)).getByRole("textbox");
    expect(input.getAttribute("maxLength")).toBe("24");
    fireEvent.change(input, { target: { value: "Nouveau nom" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(within(ligne(1)).getByText("Nouveau nom")).toBeTruthy();
    expect(chargerIndex().slots[1]?.nom).toBe("Nouveau nom");
  });

  it("le blur du champ commit aussi le renommage", () => {
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);

    fireEvent.click(within(ligne(1)).getByRole("button", { name: "Renommer" }));
    const input = within(ligne(1)).getByRole("textbox");
    fireEvent.change(input, { target: { value: "Via blur" } });
    fireEvent.blur(input);

    expect(within(ligne(1)).getByText("Via blur")).toBeTruthy();
    expect(chargerIndex().slots[1]?.nom).toBe("Via blur");
  });
});

describe("PartiesModal — Supprimer", () => {
  it("exige une confirmation : Annuler ne supprime rien", () => {
    seedOccupe(2, { jour: 1, niveau: 1, budget: 0 });
    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);

    fireEvent.click(within(ligne(2)).getByRole("button", { name: "Supprimer" }));
    const dialogue = screen.getByRole("dialog", { name: /Supprimer/ });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Annuler" }));

    expect(chargerIndex().slots[2]).not.toBeNull();
    expect(within(ligne(2)).getByText("Partie 2")).toBeTruthy();
  });

  it("confirmer sur un slot NON actif : supprime et rafraîchit la liste sans reload", () => {
    const location = mockLocation();
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    seedOccupe(2, { jour: 1, niveau: 1, budget: 0 });
    changerSlotActif(1);

    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);
    fireEvent.click(within(ligne(2)).getByRole("button", { name: "Supprimer" }));
    const dialogue = screen.getByRole("dialog", { name: /Supprimer/ });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Supprimer" }));

    expect(chargerIndex().slots[2]).toBeNull();
    expect(within(ligne(2)).getByText("Emplacement vide")).toBeTruthy();
    expect(location.reload).not.toHaveBeenCalled();
  });

  it("confirmer sur le slot ACTIF : supprime puis recharge la page", () => {
    const location = mockLocation();
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    changerSlotActif(1);

    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);
    fireEvent.click(within(ligne(1)).getByRole("button", { name: "Supprimer" }));
    const dialogue = screen.getByRole("dialog", { name: /Supprimer/ });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Supprimer" }));

    expect(chargerIndex().slots[1]).toBeNull();
    expect(location.reload).toHaveBeenCalledTimes(1);
  });

  it("confirmer sur le slot ACTIF : onAvantSuppressionActive est appelé AVANT supprimerSlot", () => {
    mockLocation();
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    changerSlotActif(1);
    const appels: string[] = [];
    const onAvantSuppressionActive = vi.fn(() => {
      appels.push(`avant:${chargerIndex().slots[1] !== null}`);
    });

    render(
      <PartiesModal
        open
        onClose={vi.fn()}
        mode="gestion"
        onNouvellePartie={vi.fn()} onLancer={vi.fn()}
        onAvantSuppressionActive={onAvantSuppressionActive}
      />,
    );
    fireEvent.click(within(ligne(1)).getByRole("button", { name: "Supprimer" }));
    const dialogue = screen.getByRole("dialog", { name: /Supprimer/ });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Supprimer" }));

    expect(onAvantSuppressionActive).toHaveBeenCalledTimes(1);
    // Le slot était encore occupé au moment de l'appel : la callback a bien
    // couru AVANT `supprimerSlot`, pas après.
    expect(appels).toEqual(["avant:true"]);
    expect(chargerIndex().slots[1]).toBeNull();
  });

  it("confirmer sur un slot NON actif : onAvantSuppressionActive n'est PAS appelé", () => {
    mockLocation();
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    seedOccupe(2, { jour: 1, niveau: 1, budget: 0 });
    changerSlotActif(1);
    const onAvantSuppressionActive = vi.fn();

    render(
      <PartiesModal
        open
        onClose={vi.fn()}
        mode="gestion"
        onNouvellePartie={vi.fn()} onLancer={vi.fn()}
        onAvantSuppressionActive={onAvantSuppressionActive}
      />,
    );
    fireEvent.click(within(ligne(2)).getByRole("button", { name: "Supprimer" }));
    const dialogue = screen.getByRole("dialog", { name: /Supprimer/ });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Supprimer" }));

    expect(onAvantSuppressionActive).not.toHaveBeenCalled();
    expect(chargerIndex().slots[2]).toBeNull();
  });

  it("etaitActif est lu depuis le storage, pas depuis le state React périmé", () => {
    const location = mockLocation();
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    changerSlotActif(1);
    const onAvantSuppressionActive = vi.fn();

    render(
      <PartiesModal
        open
        onClose={vi.fn()}
        mode="gestion"
        onNouvellePartie={vi.fn()} onLancer={vi.fn()}
        onAvantSuppressionActive={onAvantSuppressionActive}
      />,
    );
    // Bascule l'actif en storage vers 2 SANS repasser par la modal (simule
    // un autre onglet/écran) : le state React `index` de la modal reste
    // périmé sur actif=1.
    changerSlotActif(2);

    fireEvent.click(within(ligne(1)).getByRole("button", { name: "Supprimer" }));
    const dialogue = screen.getByRole("dialog", { name: /Supprimer/ });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Supprimer" }));

    // Le slot 1 n'est plus l'actif storage : ni la callback ni le reload.
    expect(onAvantSuppressionActive).not.toHaveBeenCalled();
    expect(location.reload).not.toHaveBeenCalled();
    expect(chargerIndex().slots[1]).toBeNull();
  });

  it("double clic sur Confirmer Supprimer : la garde one-shot évite un double déclenchement", () => {
    const location = mockLocation();
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    changerSlotActif(1);
    const onAvantSuppressionActive = vi.fn();

    render(
      <PartiesModal
        open
        onClose={vi.fn()}
        mode="gestion"
        onNouvellePartie={vi.fn()} onLancer={vi.fn()}
        onAvantSuppressionActive={onAvantSuppressionActive}
      />,
    );
    fireEvent.click(within(ligne(1)).getByRole("button", { name: "Supprimer" }));
    const dialogue = screen.getByRole("dialog", { name: /Supprimer/ });
    const boutonConfirmer = within(dialogue).getByRole("button", { name: "Supprimer" });
    fireEvent.click(boutonConfirmer);
    fireEvent.click(boutonConfirmer);

    expect(onAvantSuppressionActive).toHaveBeenCalledTimes(1);
    expect(location.reload).toHaveBeenCalledTimes(1);
  });

  it("onAvantSuppressionActive absent (prop optionnelle) : la suppression du slot actif reste sans erreur", () => {
    mockLocation();
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    changerSlotActif(1);

    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);
    fireEvent.click(within(ligne(1)).getByRole("button", { name: "Supprimer" }));
    const dialogue = screen.getByRole("dialog", { name: /Supprimer/ });
    expect(() =>
      fireEvent.click(within(dialogue).getByRole("button", { name: "Supprimer" })),
    ).not.toThrow();
    expect(chargerIndex().slots[1]).toBeNull();
  });
});

describe("PartiesModal — slot vide", () => {
  it("le « + » appelle onNouvellePartie(n) directement, sans confirmation", () => {
    const onNouvellePartie = vi.fn();
    render(
      <PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={onNouvellePartie} onLancer={vi.fn()} />,
    );

    fireEvent.click(
      within(ligne(1)).getByRole("button", {
        name: /Nouvelle partie dans l'emplacement 1/,
      }),
    );

    expect(onNouvellePartie).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("dialog", { name: /Supprimer|Écraser/ })).toBeNull();
  });
});

describe("PartiesModal — mode choisir-ecrasement", () => {
  it("slot occupé : propose Écraser, masque Jouer/Renommer/Supprimer", () => {
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    render(
      <PartiesModal
        open
        onClose={vi.fn()}
        mode="choisir-ecrasement"
        onNouvellePartie={vi.fn()} onLancer={vi.fn()}
      />,
    );

    const l1 = ligne(1);
    expect(within(l1).getByRole("button", { name: "Écraser" })).toBeTruthy();
    expect(within(l1).queryByRole("button", { name: "Jouer" })).toBeNull();
    expect(within(l1).queryByRole("button", { name: "Reprendre" })).toBeNull();
    expect(within(l1).queryByRole("button", { name: "Renommer" })).toBeNull();
    expect(within(l1).queryByRole("button", { name: "Supprimer" })).toBeNull();
  });

  it("Écraser demande confirmation ; Annuler n'appelle pas onNouvellePartie", () => {
    const onNouvellePartie = vi.fn();
    seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
    render(
      <PartiesModal
        open
        onClose={vi.fn()}
        mode="choisir-ecrasement"
        onNouvellePartie={onNouvellePartie} onLancer={vi.fn()}
      />,
    );

    fireEvent.click(within(ligne(1)).getByRole("button", { name: "Écraser" }));
    const dialogue = screen.getByRole("dialog", { name: /Écraser/ });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Annuler" }));

    expect(onNouvellePartie).not.toHaveBeenCalled();
  });

  it("confirmer Écraser appelle onNouvellePartie(n) (la modal ne supprime pas elle-même)", () => {
    const onNouvellePartie = vi.fn();
    seedOccupe(2, { jour: 1, niveau: 1, budget: 0 });
    render(
      <PartiesModal
        open
        onClose={vi.fn()}
        mode="choisir-ecrasement"
        onNouvellePartie={onNouvellePartie} onLancer={vi.fn()}
      />,
    );

    fireEvent.click(within(ligne(2)).getByRole("button", { name: "Écraser" }));
    const dialogue = screen.getByRole("dialog", { name: /Écraser/ });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Écraser" }));

    expect(onNouvellePartie).toHaveBeenCalledWith(2);
    expect(chargerIndex().slots[2]).not.toBeNull();
  });

  it("slot vide : le « + » crée directement (pas de confirmation)", () => {
    const onNouvellePartie = vi.fn();
    render(
      <PartiesModal
        open
        onClose={vi.fn()}
        mode="choisir-ecrasement"
        onNouvellePartie={onNouvellePartie} onLancer={vi.fn()}
      />,
    );

    fireEvent.click(
      within(ligne(3)).getByRole("button", {
        name: /Nouvelle partie dans l'emplacement 3/,
      }),
    );
    expect(onNouvellePartie).toHaveBeenCalledWith(3);
  });
});

describe("PartiesModal — occupation dérivée de l'index OU de la clé", () => {
  it("index corrompu mais clés de save intactes : les slots apparaissent occupés (résumé + nom fallback)", () => {
    localStorage.setItem(
      cleSlot(1),
      JSON.stringify({ jourActuel: 3, budget: 700, brocanteur: { niveau: 2, xp: 0 } }),
    );
    localStorage.setItem(CLE_INDEX, "not-valid-json{");

    render(<PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);

    const l1 = ligne(1);
    // Nom fallback « Partie N » : l'index corrompu n'a pas de MetaSlot à lire.
    expect(within(l1).getByText("Partie 1")).toBeTruthy();
    expect(within(l1).getByText(/Jour 3/)).toBeTruthy();
    expect(within(l1).queryByText("Emplacement vide")).toBeNull();

    const l2 = ligne(2);
    expect(within(l2).getByText("Emplacement vide")).toBeTruthy();
  });
});

describe("PartiesModal — rechargement à l'ouverture", () => {
  it("l'état local est rechargé quand open passe de false à true", () => {
    const { rerender } = render(
      <PartiesModal open={false} onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />,
    );

    seedOccupe(1, { nom: "Apparue après coup", jour: 1, niveau: 1, budget: 0 });

    rerender(
      <PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />,
    );

    expect(within(ligne(1)).getByText("Apparue après coup")).toBeTruthy();
  });
});

describe("PartiesModal — fermeture", () => {
  it("le bouton Fermer appelle onClose", () => {
    const onClose = vi.fn();
    render(<PartiesModal open onClose={onClose} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
