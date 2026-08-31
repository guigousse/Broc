// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { AtelierSlots } from "./AtelierSlots";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import type { Objet } from "@/types/game";

const H = 60 * 60 * 1000;

/** Objet en restauration : début à 0, fin à 4 h (échéance réglable). */
function objetEnRestauration(finMs = 4 * H): Objet {
  return {
    id: "o1",
    templateId: "lampe-tiffany",
    categorie: "Maison",
    etat: "Bon",
    rarete: "commun",
    enRestauration: { debutMs: 0, finMs, etatCible: "Très bon" },
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
    onAccelerer: vi.fn(),
    pubEnCours: false,
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

  it("dans les 30 dernières minutes : une pastille pub sous le décompte", () => {
    const p = renderSlots({
      slotsDebloques: 1,
      enCours: [objetEnRestauration(4 * H)],
      now: 4 * H - 10 * 60 * 1000, // 10 min restantes
    });
    fireEvent.click(screen.getByTestId("pastille-pub"));
    expect(p.onAccelerer).toHaveBeenCalledTimes(1);
    expect(p.onAccelerer).toHaveBeenCalledWith(p.enCours[0]);
    // Le tap sur la pastille ne doit pas ouvrir le détail de l'établi.
    expect(p.onEnCours).not.toHaveBeenCalled();
  });

  it("pas de pastille pub à plus de 30 min, ni quand c'est prêt", () => {
    renderSlots({
      slotsDebloques: 1,
      enCours: [objetEnRestauration(4 * H)],
      now: 2 * H,
    });
    expect(screen.queryByTestId("pastille-pub")).toBeNull();
    cleanup();
    renderSlots({
      slotsDebloques: 1,
      enCours: [objetEnRestauration(4 * H)],
      now: 4 * H,
    });
    expect(screen.queryByTestId("pastille-pub")).toBeNull();
  });

  it("pendant la pub, la pastille est désactivée", () => {
    const p = renderSlots({
      slotsDebloques: 1,
      enCours: [objetEnRestauration(4 * H)],
      now: 4 * H - 60_000,
      pubEnCours: true,
    });
    fireEvent.click(screen.getByTestId("pastille-pub"));
    expect(p.onAccelerer).not.toHaveBeenCalled();
  });

  it("affiche le prix sur le premier carré verrouillé seulement", () => {
    renderSlots({ slotsDebloques: 1, prochaineUpgrade: { cout: 200 } });
    expect(screen.getAllByText(/200/).length).toBe(1);
  });
});
