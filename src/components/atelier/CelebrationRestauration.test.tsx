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
import { persisterLocale } from "@/lib/i18n/locales";
import { CelebrationRestauration, SEQUENCE_MS } from "./CelebrationRestauration";
import type { EtatObjet, Objet } from "@/types/game";

const playUpgrade = vi.fn();
const playRarete = vi.fn();
const playPickup = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: {
    playUpgrade: () => playUpgrade(),
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
  const { rerender } = render(
    <LangueProvider>
      <CelebrationRestauration
        objet={objet(etat)}
        etatApres={etatApres}
        onTermine={onTermine}
      />
    </LangueProvider>,
  );
  /** Re-rend avec un `onTermine` d'identité NEUVE, comme le fait l'écran. */
  const rejouerLeParent = () =>
    rerender(
      <LangueProvider>
        <CelebrationRestauration
          objet={objet(etat)}
          etatApres={etatApres}
          onTermine={() => onTermine()}
        />
      </LangueProvider>,
    );
  return { onTermine, rejouerLeParent };
}

function avancer(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  playUpgrade.mockClear();
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
    const { rejouerLeParent } = afficher("Bon", "Très bon");
    avancer(SEQUENCE_MS.etoiles + 10);
    expect(etoilesPleines()).toBe(1); // « Bon »
    avancer(SEQUENCE_MS.gagne - SEQUENCE_MS.etoiles + 10);
    expect(etoilesPleines()).toBe(2); // « Très bon »
    expect(playUpgrade).toHaveBeenCalledTimes(1);
  });

  it("se termine seule : l'objet vole vers le Stockage, onTermine une fois", () => {
    const { onTermine } = afficher("Bon", "Très bon");
    avancer(SEQUENCE_MS.vol - 10);
    expect(onTermine).not.toHaveBeenCalled();
    avancer(SEQUENCE_MS.dureeVol + 100);
    const cible = document.querySelector('[data-fly-target="stockage-onglet"]');
    expect(cible?.classList.contains("broc-pulse-once")).toBe(true);
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("les re-rendus du parent ne replanifient pas la séquence", () => {
    // L'écran Atelier se re-rend chaque seconde pour ses décomptes et
    // recrée son `onTermine` : si la séquence en dépendait, elle repartirait
    // de zéro à chaque tick et repopperait sans fin (bug du 2026-08-28).
    const { onTermine, rejouerLeParent } = afficher("Bon", "Très bon");
    avancer(SEQUENCE_MS.gagne + 10);
    expect(playUpgrade).toHaveBeenCalledTimes(1);
    act(() => rejouerLeParent());
    avancer(SEQUENCE_MS.vol - SEQUENCE_MS.gagne + SEQUENCE_MS.dureeVol + 100);
    expect(playUpgrade).toHaveBeenCalledTimes(1);
    expect(etoilesPleines()).toBe(2);
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("le libellé d'état montre l'ancien état, puis le nouveau", () => {
    // La cérémonie doit RACONTER la montée : d'où l'objet part, où il arrive.
    persisterLocale("fr");
    afficher("Bon", "Très bon");
    avancer(SEQUENCE_MS.etoiles + 10);
    expect(screen.getByTestId("etat-celebration").textContent).toBe("Bon");
    avancer(SEQUENCE_MS.gagne - SEQUENCE_MS.etoiles + 10);
    expect(screen.getByTestId("etat-celebration").textContent).toBe("Très bon");
  });

  it("un tap saute directement au vol", () => {
    const { onTermine } = afficher("Bon", "Très bon");
    avancer(100);
    fireEvent.click(screen.getByTestId("celebration-restauration"));
    avancer(SEQUENCE_MS.dureeVol + 100);
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("le pristin déclenche le son victorieux, les autres états non", () => {
    const c1 = afficher("Très bon", "Pristin état");
    void c1;
    avancer(SEQUENCE_MS.gagne + 10);
    expect(etoilesPleines()).toBe(3);
    expect(playRarete).toHaveBeenCalledTimes(1);
    cleanup();

    const c2 = afficher("Mauvais", "Bon");
    void c2;
    avancer(SEQUENCE_MS.gagne + 10);
    expect(playRarete).toHaveBeenCalledTimes(1); // toujours l'unique appel
  });
});
