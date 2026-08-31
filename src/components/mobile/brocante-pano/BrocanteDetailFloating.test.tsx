// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { initCollection } from "@/lib/collection";
import { BrocanteDetailFloating } from "./BrocanteDetailFloating";
import { bourseMoyenne } from "@/lib/vitrine";
import type { Brocante } from "@/types/game";

afterEach(cleanup);

const brocante: Brocante = {
  id: "vide-grenier-quartier",
  nom: "Vide-grenier du quartier",
  description: "Quelques tables dépliées sur la place.",
  ambiance: "Familial",
  tier: 1,
  etoiles: 1,
  taillePool: 6,
  poolExclusif: [],
  facteurBourse: 1,
  conditionDeblocage: { type: "depart" },
};

describe("BrocanteDetailFloating — méta selon la destination", () => {
  it("mode chiner : plaque de laiton, Taille / Entrée / Thème / loupe — sans description", () => {
    render(
      <BrocanteDetailFloating
        brocante={{ ...brocante, specialisation: "Musique" }}
        debloquee
        peutEntrer
        conditions={[]}
        destination="chiner"
        collection={initCollection()}
      />,
    );
    expect(screen.getByTestId("brocante-plaque").textContent).toBe("Vide-grenier du quartier");
    expect(screen.queryByText(/Quelques tables/)).toBeNull();
    expect(screen.getByText(/^Taille$/i)).toBeTruthy();
    expect(screen.getByTestId("brocante-taille").textContent).toContain("6");
    expect(screen.getByText(/^Entrée$/i)).toBeTruthy();
    expect(screen.getByTestId("brocante-entree").textContent).toContain("0 €");
    expect(screen.getByText(/^Thème$/i)).toBeTruthy();
    expect(screen.getByLabelText(/Thème : Musique/)).toBeTruthy();
    expect(screen.queryByText(/bourse/i)).toBeNull();
  });

  it("mode chiner, brocante générale : la cellule Thème reste, vide", () => {
    render(
      <BrocanteDetailFloating brocante={brocante} debloquee peutEntrer conditions={[]} destination="chiner" collection={initCollection()} />,
    );
    expect(screen.getByText(/^Thème$/i)).toBeTruthy();
    expect(screen.getByTestId("brocante-theme").textContent).toBe("—");
  });

  it("la loupe ouvre la sheet des objets trouvables", () => {
    render(
      <BrocanteDetailFloating brocante={brocante} debloquee peutEntrer conditions={[]} destination="chiner" collection={initCollection()} />,
    );
    expect(screen.queryByTestId("trouvables-liste")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /objets/i }));
    expect(screen.getByTestId("trouvables-liste")).toBeTruthy();
  });

  it("mode vitrine : plaque de laiton, Budgets moyens / Entrée / Thème — sans loupe ni description", () => {
    render(
      <BrocanteDetailFloating brocante={brocante} debloquee peutEntrer conditions={[]} destination="vitrine" />,
    );
    expect(screen.getByTestId("brocante-plaque").textContent).toBe("Vide-grenier du quartier");
    expect(screen.queryByText(/Quelques tables/)).toBeNull();
    expect(screen.getByText(/^Budgets moyens$/i)).toBeTruthy();
    expect(screen.getByTestId("brocante-budget").textContent).toContain(`${bourseMoyenne(brocante)} €`);
    expect(screen.queryByText(/^Taille$/i)).toBeNull();
    expect(screen.getByText(/^Entrée$/i)).toBeTruthy();
    expect(screen.getByTestId("brocante-theme").textContent).toBe("—");
    expect(screen.queryByRole("button", { name: /objets/i })).toBeNull();
    expect(screen.queryByTestId("brocante-appetit")).toBeNull();
  });

  it("mode vitrine, spécialisée : ligne « Appétit +10 % sur Musique »", () => {
    render(
      <BrocanteDetailFloating brocante={{ ...brocante, specialisation: "Musique" }} debloquee peutEntrer conditions={[]} destination="vitrine" />,
    );
    expect(screen.getByLabelText(/Thème : Musique/)).toBeTruthy();
    expect(screen.getByTestId("brocante-appetit").textContent).toBe("Appétit +10 % sur Musique");
  });

  it("mode vitrine, coffre hors thème : cadenas + « Musique uniquement », cellules masquées", () => {
    render(
      <BrocanteDetailFloating brocante={{ ...brocante, specialisation: "Musique" }} debloquee peutEntrer conditions={[]} destination="vitrine" coffreHorsTheme />,
    );
    expect(screen.getByTestId("brocante-cadenas")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Musique uniquement");
    expect(screen.queryByText(/^Budgets moyens$/i)).toBeNull();
    expect(screen.queryByTestId("brocante-appetit")).toBeNull();
  });
});
