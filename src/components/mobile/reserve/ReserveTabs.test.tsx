// @vitest-environment jsdom
/**
 * `ReserveTabs` — la bande d'onglets en tête de la Réserve. Elle remplace le
 * titre centré de la carte : l'onglet actif EST le titre. Le cadenas de
 * l'Atelier, qui vivait dans la barre du bas, vit désormais ici.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReserveTabs } from "./ReserveTabs";

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

afterEach(cleanup);

function poser(over: Partial<Parameters<typeof ReserveTabs>[0]> = {}) {
  const props = {
    actif: "stockage" as const,
    atelierOuvert: true,
    badgeAtelier: 0,
    mainSurAtelier: false,
    onChoisir: vi.fn(),
    onVerrou: vi.fn(),
    ...over,
  };
  render(<ReserveTabs {...props} />);
  return props;
}

const bouton = (t: string) =>
  screen.getAllByRole("button").find((b) => b.textContent?.includes(t))!;

describe("ReserveTabs", () => {
  it("marque l'onglet actif pour les lecteurs d'écran", () => {
    poser({ actif: "atelier" });
    expect(bouton("Atelier").getAttribute("aria-current")).toBe("page");
    expect(bouton("Stockage").getAttribute("aria-current")).toBeNull();
  });

  it("choisir l'autre onglet le remonte au parent", () => {
    const { onChoisir } = poser({ actif: "stockage" });
    fireEvent.click(bouton("Atelier"));
    expect(onChoisir).toHaveBeenCalledWith("atelier");
  });

  it("taper l'onglet DÉJÀ actif ne redemande rien", () => {
    const { onChoisir } = poser({ actif: "stockage" });
    fireEvent.click(bouton("Stockage"));
    expect(onChoisir).not.toHaveBeenCalled();
  });

  it("atelier fermé : cadenassé, et le tap appelle le verrou au lieu de naviguer", () => {
    const { onChoisir, onVerrou } = poser({ atelierOuvert: false });
    const atelier = bouton("Atelier");
    expect(atelier.getAttribute("aria-disabled")).toBe("true");
    expect(atelier.getAttribute("aria-label")).toContain("verrouillé");
    fireEvent.click(atelier);
    expect(onVerrou).toHaveBeenCalledTimes(1);
    expect(onChoisir).not.toHaveBeenCalled();
  });

  it("le badge de restaurations prêtes s'affiche sur l'onglet Atelier", () => {
    poser({ badgeAtelier: 3 });
    expect(bouton("Atelier").textContent).toContain("3");
  });

  it("aucun badge sous un cadenas", () => {
    poser({ atelierOuvert: false, badgeAtelier: 3 });
    expect(bouton("Atelier").textContent).not.toContain("3");
  });

  it("porte l'ancre de coach du tutoriel sur l'onglet Atelier", () => {
    poser();
    expect(
      document.querySelector('[data-tuto-coach="reserve-onglet-atelier"]'),
    ).not.toBeNull();
  });
});

describe("ReserveTabs — main de guidage du mini-tuto Atelier", () => {
  it("pose la main sur l'onglet Atelier quand on la demande", () => {
    poser({ mainSurAtelier: true });
    expect(bouton("Atelier").className).toContain("tuto-main");
  });

  it("aucune main par défaut", () => {
    poser();
    expect(document.querySelector(".tuto-main")).toBeNull();
  });

  it("aucune main sur l'onglet Atelier déjà actif", () => {
    poser({ actif: "atelier", mainSurAtelier: true });
    expect(document.querySelector(".tuto-main")).toBeNull();
  });

  it("aucune main sur un onglet CADENASSÉ", () => {
    // Le doigt désignerait un bouton qui ne sait que refuser : le tap
    // déclenche le toast de verrou, jamais la navigation promise.
    poser({ atelierOuvert: false, mainSurAtelier: true });
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});
