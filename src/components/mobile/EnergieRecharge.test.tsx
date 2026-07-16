// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EnergieRecharge, angleAiguille } from "./EnergieRecharge";
import { PUBS_ENERGIE_MAX_PAR_JOUR } from "@/lib/energie";

vi.mock("@/lib/ads/adProvider", () => ({
  getAdProvider: () => ({ showRewardedAd: async () => ({ rewarded: true }) }),
}));
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: { playRecharge: vi.fn().mockResolvedValue(undefined) },
}));

afterEach(cleanup);

/** Clé du jour local courant (même convention que lib/energie). */
function cleAujourdhui(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

let mockState: Record<string, unknown> = {};
const crediterEnergiePub = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({ state: mockState }),
  useGameActions: () => ({
    tempsConfiance: () => null,
    crediterEnergiePub,
  }),
}));

describe("EnergieRecharge — plafond quotidien de pubs", () => {
  it("quota disponible : le bouton est actif, sans compteur affiché", () => {
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    const btn = screen.getByRole("button", { name: /regarder une pub/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    // Le plafond (20/j) agit silencieusement : plus de « x/y » dans le libellé.
    expect(btn.textContent).not.toMatch(/\d+\s*\/\s*\d+/);
  });

  it("quota épuisé : le bouton est désactivé AVANT de lancer la pub", () => {
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      pubsEnergie: { cle: cleAujourdhui(), n: PUBS_ENERGIE_MAX_PAR_JOUR },
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    const btn = screen.getByRole("button", { name: /plus de pub aujourd'hui/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("angleAiguille", () => {
  it("course -60° (0 ⚡) → +60° (max), linéaire et clampée", () => {
    expect(angleAiguille(0, 5)).toBe(-60);
    expect(angleAiguille(5, 5)).toBe(60);
    expect(angleAiguille(2.5, 5)).toBe(0);
    expect(angleAiguille(7, 5)).toBe(60); // clamp haut
    expect(angleAiguille(-1, 5)).toBe(-60); // clamp bas
    expect(angleAiguille(3, 0)).toBe(-60); // max invalide → repos
  });
});

describe("EnergieRecharge — galvanomètre", () => {
  it("l'aiguille est rendue, tournée selon l'énergie courante", () => {
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    const aiguille = screen.getByTestId("aiguille-energie");
    expect(aiguille.getAttribute("transform")).toBe(
      `rotate(${angleAiguille(2, 5)})`,
    );
  });

  it("énergie pleine : affiche « au maximum » (pas de minuteur)", () => {
    mockState = {
      energie: 5,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    // « au maximum » apparaît dans la pastille ET sur le cartel désactivé.
    expect(screen.getAllByText(/au maximum/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/dans \d{2}:\d{2}/i)).toBeNull();
  });
});

describe("EnergieRecharge — salve finale après la pub", () => {
  it("le crédit +1 ⚡ part à la FIN de la salve de tremblement (~600 ms), pas avant", async () => {
    vi.useFakeTimers();
    crediterEnergiePub.mockClear();
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /regarder une pub/i }));
    // La pub (stub mocké) se résout tout de suite : salve en cours, pas encore de crédit.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(crediterEnergiePub).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(crediterEnergiePub).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("modale fermée pendant la salve : la récompense est créditée quand même", async () => {
    vi.useFakeTimers();
    crediterEnergiePub.mockClear();
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    const { unmount } = render(<EnergieRecharge onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /regarder une pub/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(crediterEnergiePub).not.toHaveBeenCalled();
    unmount(); // fermeture pendant la salve
    expect(crediterEnergiePub).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

describe("EnergieRecharge — énergie pleine", () => {
  it("à 5/5 le bouton pub est désactivé (pub jamais gaspillée)", () => {
    mockState = {
      energie: 5,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    const btn = screen.getByRole("button", { name: /au maximum/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("EnergieRecharge — bandeau d'alerte", () => {
  it("affiche le message d'alerte quand la prop `alerte` est fournie", () => {
    mockState = {
      energie: 0,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(
      <EnergieRecharge onClose={() => {}} alerte="Pas assez d'énergie pour cette sortie !" />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Pas assez d'énergie",
    );
  });

  it("sans la prop : aucun bandeau", () => {
    mockState = {
      energie: 0,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("EnergieRecharge — alerte réactive à l'énergie", () => {
  it("alerte + énergie 0 : le cartel pulse (halo) pour attirer l'attention", () => {
    mockState = {
      energie: 0,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} alerte="Pas assez d'énergie !" />);
    const btn = screen.getByRole("button", { name: /regarder une pub/i });
    expect(btn.style.animation).toContain("broc-cartel-pulse");
  });

  it("alerte + énergie > 0 : le bandeau disparaît et le cartel ne pulse plus", () => {
    mockState = {
      energie: 1,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} alerte="Pas assez d'énergie !" />);
    expect(screen.queryByRole("alert")).toBeNull();
    const btn = screen.getByRole("button", { name: /regarder une pub/i });
    expect(btn.style.animation).not.toContain("broc-cartel-pulse");
  });
});
