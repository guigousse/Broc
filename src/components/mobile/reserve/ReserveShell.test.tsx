// @vitest-environment jsdom
/**
 * `ReserveShell` — la coquille commune aux deux onglets de la Réserve.
 * Le point testé n'est pas le rendu mais la RÈGLE D'ANIMATION : arriver de
 * l'onglet frère ne doit pas rejouer le glissement de 320 ms (cf. spec).
 */
import { StrictMode } from "react";
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

  it("StrictMode : le montage fantôme ne doit pas annuler la mémoire d'une instance toujours montée", async () => {
    // StrictMode (actif par défaut sur cette app en dev) double-invoque les
    // effets au montage : setup → cleanup → setup, le tout synchrone. Une
    // garde qui compare seulement par VALEUR d'onglet ne peut pas distinguer
    // ce cleanup fantôme d'une vraie sortie de la Réserve quand les deux
    // montages portent le même onglet — elle annule la mémoire à tort.
    render(
      <StrictMode>
        <ReserveShell
          onglet="stockage"
          atelierOuvert
          badgeAtelier={0}
          onVerrou={() => {}}
          bande={<div>bande</div>}
        >
          <div>contenu</div>
        </ReserveShell>
      </StrictMode>,
    );
    // Laisse le temps aux microtâches en attente (dont le nettoyage différé
    // du cleanup fantôme) de se résoudre avant l'interaction du joueur —
    // c'est ce qui se passe réellement : un tap est une tâche séparée,
    // toujours postérieure à la file de microtâches déjà en attente.
    await Promise.resolve();
    cleanup();
    poser("atelier");
    expect(overlay().getAttribute("data-animer")).toBe("0");
  });
});

describe("ReserveShell — les onglets sortent de la carte", () => {
  it("monte les languettes dans la zone dédiée, pas dans la carte", () => {
    poser("stockage");
    const wrap = document.querySelector("[data-floating-room]") as HTMLElement;
    const languettes = wrap.children[0] as HTMLElement;
    const carte = wrap.children[1] as HTMLElement;
    // Les onglets vivaient DANS la carte (ils rompaient son cadre) ; ils
    // doivent désormais en être un frère, rendu avant elle.
    expect(languettes.textContent).toContain("Stockage");
    expect(languettes.textContent).toContain("Atelier");
    expect(carte.textContent).not.toContain("Stockage");
    expect(carte.textContent).toContain("bande");
  });
});
