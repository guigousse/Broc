// @vitest-environment jsdom
/**
 * LA CÉRÉMONIE DE RÉCUPÉRATION.
 *
 * L'objet sort de l'établi en grand, sous les étoiles de son ANCIEN état ;
 * puis l'étoile gagnée apparaît, et s'il touche le pristin, l'éclat et le son
 * victorieux avec elle. La séquence se joue seule et repose l'objet dans le
 * stockage — un tap saute à la fin.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, act } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { CelebrationRestauration, SEQUENCE_MS } from "./CelebrationRestauration";
import type { EtatObjet, Objet } from "@/types/game";

const playPop = vi.fn();
const playRarete = vi.fn();
const playPickup = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: {
    playPop: () => playPop(),
    playRarete: () => playRarete(),
    playPickup: () => playPickup(),
  },
}));

function objet(etat: EtatObjet): Objet {
  return {
    id: "o1",
    templateId: "lampe-tiffany",
    categorie: "Maison",
    etat,
    rarete: "commun",
  } as unknown as Objet;
}

/** Étoiles pleines actuellement affichées sous l'objet. */
function etoilesPleines(): number {
  const rangee = screen.getByTestId("etoiles-celebration");
  return Array.from(rangee.querySelectorAll("svg")).filter(
    (s) => s.getAttribute("fill") !== "transparent",
  ).length;
}

function afficher(etat: EtatObjet, etatApres: EtatObjet) {
  const onTermine = vi.fn();
  render(
    <LangueProvider>
      <CelebrationRestauration
        objet={objet(etat)}
        etatApres={etatApres}
        onTermine={onTermine}
      />
    </LangueProvider>,
  );
  return onTermine;
}

function avancer(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  playPop.mockClear();
  playRarete.mockClear();
  playPickup.mockClear();
  const cible = document.createElement("div");
  cible.setAttribute("data-fly-target", "stockage-onglet");
  document.body.appendChild(cible);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.querySelectorAll("[data-fly-target]").forEach((e) => e.remove());
});

describe("CelebrationRestauration", () => {
  it("montre les étoiles de l'ancien état avant d'ajouter la nouvelle", () => {
    afficher("Bon", "Très bon");
    avancer(SEQUENCE_MS.etoiles + 10);
    expect(etoilesPleines()).toBe(1); // « Bon »
    avancer(SEQUENCE_MS.gagne - SEQUENCE_MS.etoiles + 10);
    expect(etoilesPleines()).toBe(2); // « Très bon »
    expect(playPop).toHaveBeenCalledTimes(1);
  });

  it("se termine seule : l'objet vole vers le Stockage, onTermine une fois", () => {
    const onTermine = afficher("Bon", "Très bon");
    avancer(SEQUENCE_MS.vol - 10);
    expect(onTermine).not.toHaveBeenCalled();
    avancer(SEQUENCE_MS.dureeVol + 100);
    const cible = document.querySelector('[data-fly-target="stockage-onglet"]');
    expect(cible?.classList.contains("broc-pulse-once")).toBe(true);
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("un tap saute directement au vol", () => {
    const onTermine = afficher("Bon", "Très bon");
    avancer(100);
    fireEvent.click(screen.getByTestId("celebration-restauration"));
    avancer(SEQUENCE_MS.dureeVol + 100);
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("le pristin déclenche le son victorieux, les autres états non", () => {
    afficher("Très bon", "Pristin état");
    avancer(SEQUENCE_MS.gagne + 10);
    expect(etoilesPleines()).toBe(3);
    expect(playRarete).toHaveBeenCalledTimes(1);
    cleanup();

    afficher("Mauvais", "Bon");
    avancer(SEQUENCE_MS.gagne + 10);
    expect(playRarete).toHaveBeenCalledTimes(1); // toujours l'unique appel
  });
});
