// @vitest-environment jsdom
/**
 * `MobileHeader` — la puce XP ne doit jamais faire sortir d'une session
 * (chinage/vitrine) par mistap, ni deep-linker vers l'écran Compétences
 * avant que celui-ci ne soit ouvert (N0). Mêmes mocks que
 * `LevelUpOverlay.test.tsx` : useGame()/useGameActions() + next/navigation.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MobileHeader } from "./MobileHeader";
import { degelerXpAffichage, gelerXpAffichage } from "@/lib/affichageGele";

afterEach(() => {
  degelerXpAffichage();
  cleanup();
});

let mockState: Record<string, unknown> | null = null;
let mockPathname = "/bureau";

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({ state: mockState }),
  useGameActions: () => ({ tempsConfiance: () => Date.now() }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

function etat(niveau: number, energie = 5) {
  return {
    energie,
    energieDerniereMaj: Date.now(),
    brocanteur: { niveau, xp: 0, pointsDisponibles: 0 },
  };
}

/** Le `<span>` qui porte le numérateur de la jauge (« 3 » dans « 3/5 »). */
function numerateurEnergie() {
  const jauge = document.querySelector("[data-fly-target='energie-header']");
  return jauge!.querySelector("span > span") as HTMLElement;
}

describe("MobileHeader — puce XP", () => {
  it("en session (route /chiner/…) : la puce est un span, pas un lien", () => {
    mockState = etat(3);
    mockPathname = "/chiner/xxx";
    render(<MobileHeader budget={0} />);
    const puce = screen.getByLabelText("Niveau de Brocanteur 3");
    expect(puce.tagName).toBe("SPAN");
    expect(screen.queryByRole("link", { name: "Niveau de Brocanteur 3" })).toBeNull();
  });

  it("hors session, niveau ≥ 1 : la puce est un lien vers /bibliotheque", () => {
    mockState = etat(1);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const lien = screen.getByRole("link", { name: "Niveau de Brocanteur 1" });
    expect(lien.getAttribute("href")).toBe("/bibliotheque");
  });

  it("hors session, niveau 0 : la puce reste un span (écran Compétences masqué)", () => {
    mockState = etat(0);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const puce = screen.getByLabelText("Niveau de Brocanteur 0");
    expect(puce.tagName).toBe("SPAN");
    expect(screen.queryByRole("link", { name: "Niveau de Brocanteur 0" })).toBeNull();
  });
});

describe("MobileHeader — bloc niveau", () => {
  it("le libellé « Niveau » surmonte la barre, le chiffre seul la précède", () => {
    mockState = etat(4);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const bloc = screen.getByLabelText("Niveau de Brocanteur 4");
    expect(bloc.textContent).toBe("Niveau4");
    // Plus de préfixe « N » : le libellé au-dessus dit déjà de quoi il s'agit.
    expect(bloc.textContent).not.toContain("N4");
  });
});

describe("MobileHeader — jauge d'énergie", () => {
  it("aucun bouton « + » : le bloc énergie entier ouvre la recharge, même à plein", () => {
    mockState = etat(3, 5);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const boutons = screen.getAllByRole("button", { name: "Recharger l'énergie" });
    expect(boutons).toHaveLength(1);
    expect(boutons[0].textContent).toContain("5/5");
    expect(boutons[0].textContent).toContain("Énergie");
  });

  it("entamée : le bloc reste cliquable et le numérateur s'assombrit", () => {
    mockState = etat(3, 2);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    expect(screen.getByRole("button", { name: "Recharger l'énergie" })).toBeTruthy();
    expect(numerateurEnergie().style.color).toBe("var(--brass-500)");
  });

  it("pleine : numérateur et dénominateur portent la même couleur", () => {
    mockState = etat(3, 5);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const numerateur = numerateurEnergie();
    expect(numerateur.style.color).toBe("var(--brass-300)");
    expect((numerateur.nextElementSibling as HTMLElement).style.color).toBe(
      "var(--brass-300)",
    );
  });

  it("à sec : « 0/5 » passe entièrement au rouge", () => {
    mockState = etat(3, 0);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const numerateur = numerateurEnergie();
    expect(numerateur.style.color).toBe("var(--red-signal-300)");
    expect((numerateur.nextElementSibling as HTMLElement).style.color).toBe(
      "var(--red-signal-300)",
    );
  });
});

describe("MobileHeader — compteur de jetons du Bazar", () => {
  it("masqué quand le solde vaut 0", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} jetons={0} />);
    expect(screen.queryByText("Jetons")).toBeNull();
  });

  it("masqué quand la prop est absente", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    expect(screen.queryByText("Jetons")).toBeNull();
  });

  it("affiché avec le solde dès qu'il est positif", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} jetons={7} />);
    expect(screen.getByText("Jetons")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
  });
});

describe("MobileHeader — gel de la barre XP", () => {
  it("gelé : le niveau affiché est celui de l'instantané, pas celui de l'état", () => {
    mockState = etat(5);
    mockPathname = "/chiner/xxx";
    gelerXpAffichage({ niveau: 3, xp: 120, pointsDisponibles: 0 });
    render(<MobileHeader budget={0} />);
    expect(screen.getByLabelText("Niveau de Brocanteur 3")).toBeTruthy();
  });

  it("dégelé : le niveau réel est de nouveau affiché", () => {
    mockState = etat(5);
    mockPathname = "/chiner/xxx";
    gelerXpAffichage({ niveau: 3, xp: 120, pointsDisponibles: 0 });
    const { rerender } = render(<MobileHeader budget={0} />);
    act(() => degelerXpAffichage());
    rerender(<MobileHeader budget={0} />);
    expect(screen.getByLabelText("Niveau de Brocanteur 5")).toBeTruthy();
  });
});
