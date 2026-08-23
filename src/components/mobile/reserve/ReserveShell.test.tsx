// @vitest-environment jsdom
/**
 * `ReserveShell` — la coquille commune aux deux onglets de la Réserve.
 * Le point testé n'est pas le rendu mais la RÈGLE D'ANIMATION : arriver de
 * l'onglet frère ne doit pas rejouer le glissement de 320 ms (cf. spec).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ReserveShell, __resetMemoireReserve } from "./ReserveShell";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: pushMock }),
}));

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: {
      chrome: {
        onglets: { stockage: "Stockage", atelier: "Atelier" },
        ongletVerrouille: "verrouillé",
      },
    },
  }),
}));

beforeEach(() => __resetMemoireReserve());
afterEach(cleanup);

function poser(onglet: "stockage" | "atelier") {
  render(
    <ReserveShell
      onglet={onglet}
      atelierOuvert
      badgeAtelier={0}
      onVerrou={() => {}}
      bande={<div>bande</div>}
    >
      <div>contenu</div>
    </ReserveShell>,
  );
}

const overlay = () => document.querySelector("[data-floating-room]") as HTMLElement;

describe("ReserveShell — règle d'animation", () => {
  it("première arrivée dans la Réserve : le glissement joue", () => {
    poser("stockage");
    expect(overlay().getAttribute("data-animer")).toBe("1");
  });

  it("arrivée depuis l'onglet frère : pas de glissement", () => {
    poser("stockage");
    cleanup();
    poser("atelier");
    expect(overlay().getAttribute("data-animer")).toBe("0");
  });

  it("retour dans la Réserve après en être sorti : le glissement rejoue", () => {
    poser("stockage");
    cleanup();
    __resetMemoireReserve(); // ce que fait la sortie de la Réserve
    poser("atelier");
    expect(overlay().getAttribute("data-animer")).toBe("1");
  });

  it("rend la bande et le contenu de l'onglet", () => {
    poser("stockage");
    expect(screen.getByText("bande")).toBeTruthy();
    expect(screen.getByText("contenu")).toBeTruthy();
  });
});
