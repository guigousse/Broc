// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { AtelierSlots } from "./AtelierSlots";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import type { Objet } from "@/types/game";

const H = 60 * 60 * 1000;

/** Objet en restauration : début à 0, fin à 4 h. */
function objetEnRestauration(): Objet {
  return {
    id: "o1",
    templateId: "lampe-tiffany",
    categorie: "Maison",
    etat: "Bon",
    rarete: "commun",
    enRestauration: { debutMs: 0, finMs: 4 * H, etatCible: "Très bon" },
  } as unknown as Objet;
}

afterEach(cleanup);

function renderSlots(p: Partial<Parameters<typeof AtelierSlots>[0]> = {}) {
  const props = {
    slotsDebloques: 0 as const,
    enCours: [],
    now: 1_000_000,
    prochaineUpgrade: { cout: 100 },
    onAcheterSlot: vi.fn(),
    onSlotVide: vi.fn(),
    onEnCours: vi.fn(),
    onRecuperer: vi.fn(),
    ...p,
  };
  render(
    <LangueProvider>
      <AtelierSlots {...props} />
    </LangueProvider>,
  );
  return props;
}

describe("AtelierSlots", () => {
  it("rend toujours 3 carrés ; tous verrouillés à 0 slot", () => {
    const p = renderSlots();
    const carres = screen.getAllByRole("button");
    expect(carres.length).toBe(3);
    fireEvent.click(carres[0]);
    expect(p.onAcheterSlot).toHaveBeenCalledTimes(1);
  });

  it("slot vide débloqué → onSlotVide ; verrouillé au-delà", () => {
    const p = renderSlots({ slotsDebloques: 1 });
    const carres = screen.getAllByRole("button");
    fireEvent.click(carres[0]);
    expect(p.onSlotVide).toHaveBeenCalledTimes(1);
    fireEvent.click(carres[1]);
    expect(p.onAcheterSlot).toHaveBeenCalledTimes(1);
  });

  it("établi en cours : le voile couvre le temps restant, décompte au centre", () => {
    renderSlots({
      slotsDebloques: 1,
      enCours: [objetEnRestauration()],
      now: 2 * H,
    });
    const voile = screen.getByTestId("voile-restauration");
    expect(voile.style.getPropertyValue("--voile-angle")).toBe("180deg");
    expect(screen.getByText("2 h")).toBeTruthy();
  });

  it("établi prêt : plus de voile, un bouton Récupérer qui rend l'objet", () => {
    const p = renderSlots({
      slotsDebloques: 1,
      enCours: [objetEnRestauration()],
      now: 4 * H,
    });
    expect(screen.queryByTestId("voile-restauration")).toBeNull();
    // Le libellé suit la locale détectée (jsdom n'est pas forcément en FR) :
    // ce qui compte est qu'une pastille porte le mot du dictionnaire actif.
    expect(screen.getByTestId("pastille-recuperer").textContent).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(p.onRecuperer).toHaveBeenCalledTimes(1);
  });

  it("affiche le prix sur le premier carré verrouillé seulement", () => {
    renderSlots({ slotsDebloques: 1, prochaineUpgrade: { cout: 200 } });
    expect(screen.getAllByText(/200/).length).toBe(1);
  });
});
