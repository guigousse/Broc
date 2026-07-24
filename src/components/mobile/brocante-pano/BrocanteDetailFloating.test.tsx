// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
  it("mode chiner : affiche le nombre d'objets, pas la bourse", () => {
    render(
      <BrocanteDetailFloating
        brocante={brocante}
        debloquee
        peutEntrer
        conditions={[]}
        destination="chiner"
      />,
    );
    expect(screen.getByText(/6 items/i)).toBeTruthy();
    expect(screen.queryByText(/bourse/i)).toBeNull();
  });

  it("mode vitrine : affiche la bourse moyenne des clients, pas le nombre d'objets", () => {
    render(
      <BrocanteDetailFloating
        brocante={brocante}
        debloquee
        peutEntrer
        conditions={[]}
        destination="vitrine"
      />,
    );
    expect(screen.queryByText(/6 items/i)).toBeNull();
    const attendu = bourseMoyenne(brocante);
    expect(screen.getByText(new RegExp(`${attendu}`))).toBeTruthy();
    expect(screen.getByText(/bourse/i)).toBeTruthy();
  });
});
