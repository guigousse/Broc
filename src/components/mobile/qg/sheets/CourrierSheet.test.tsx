// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CourrierSheet } from "./CourrierSheet";
import { creerCartePostale, creerLettreMamanDebut } from "@/lib/courrier";
import type { Courrier } from "@/types/game";

function creerCourrierMissionAvecGains(): Courrier {
  return {
    id: "mission-1",
    type: "mission",
    jourRecu: 1,
    lu: false,
    payload: {
      type: "mission",
      categorie: "principale",
      expediteurId: "maman",
      titre: "Le coffre rétro",
      corps: ["Un petit mot."],
      cibles: [{ templateId: "coffre" }],
      recompense: { argent: 90, energie: 1 },
    },
  };
}

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ playClick: vi.fn(), playCash: vi.fn() }),
}));

afterEach(cleanup);

// Petit wrapper qui rejoue le vrai contrat onMarquerLu (retire le courrier de
// la pile des non-lus), pour vérifier que le passage d'une carte postale à la
// suivante ne conserve pas l'état verso/imgKo de la précédente.
function CarnetDeuxCartes() {
  const [courriers, setCourriers] = useState<Courrier[]>([
    creerCartePostale(1, 20),
    creerCartePostale(2, 25),
  ]);
  return (
    <CourrierSheet
      open
      onClose={vi.fn()}
      courriers={courriers}
      onMarquerLu={(id) =>
        setCourriers((cs) =>
          cs.map((c) => (c.id === id ? { ...c, lu: true } : c)),
        )
      }
    />
  );
}

describe("CourrierSheet — cartes postales", () => {
  it("rend une carte postale (recto + bouton Compris) au lieu de la lettre", () => {
    render(
      <CourrierSheet
        open
        onClose={vi.fn()}
        courriers={[creerCartePostale(1, 20)]}
        onMarquerLu={vi.fn()}
      />,
    );
    expect(screen.getByTestId("carte-postale")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compris" })).toBeTruthy();
  });

  it("une lettre ordinaire garde son rendu papier classique", () => {
    render(
      <CourrierSheet
        open
        onClose={vi.fn()}
        courriers={[creerLettreMamanDebut(1)]}
        onMarquerLu={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("carte-postale")).toBeNull();
    expect(screen.getByText("Pour bien démarrer")).toBeTruthy();
  });

  it("passe à la carte postale suivante sans hériter de l'état verso (key={courant.id})", async () => {
    const user = userEvent.setup();
    render(<CarnetDeuxCartes />);
    // La plus récente (jour 25) s'affiche en premier ; on la retourne.
    await user.click(screen.getByTestId("carte-postale"));
    expect(
      screen.getByTestId("carte-postale").getAttribute("aria-pressed"),
    ).toBe("true");
    await user.click(screen.getByRole("button", { name: "Compris" }));
    // La carte suivante doit repartir côté recto, pas hériter du verso.
    expect(
      screen.getByTestId("carte-postale").getAttribute("aria-pressed"),
    ).toBe("false");
    expect(screen.getByText("Touchez pour retourner")).toBeTruthy();
  });

  it("mission : la ligne récompense affiche les jetons xp/énergie", () => {
    render(
      <CourrierSheet
        open
        onClose={vi.fn()}
        courriers={[creerCourrierMissionAvecGains()]}
        onMarquerLu={vi.fn()}
      />,
    );
    expect(screen.getByTestId("jeton-argent").textContent).toContain("+90 €");
    expect(screen.getByTestId("jeton-xp").textContent).toContain("+100 XP");
    expect(screen.getByTestId("jeton-energie").textContent).toContain("+1 ⚡");
  });
});
