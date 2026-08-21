// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChineNegoDrawer } from "./ChineNegoDrawer";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
import { relancerNegociation } from "@/lib/negociation";
import type { NegociationState, NegoPersona, ObjetEnVente } from "@/types/game";

afterEach(cleanup);

const persona: NegoPersona = {
  archetype: "grincheux",
  margePct: 0.1,
  elanPct: 0.25,
  patience: 3,
  tolerancePct: 0.3,
  sangFroid: 0.25,
};

function makeNego(patch: Partial<NegociationState> = {}): NegociationState {
  return {
    mode: "achat",
    tour: 3,
    humeur: 0.8,
    prixAdverseCourant: 80,
    cibleSecrete: 60,
    derniereOffreJoueur: 50,
    statut: "fache",
    message: { cle: "fache", variante: 0 },
    ...patch,
  };
}

function makeItem(negociation: NegociationState | null): ObjetEnVente {
  return {
    id: "item-1",
    objet: createMockObjet(),
    prixVendeur: 100,
    prixAffiche: true,
    prixMinAccept: 60,
    negociationsTentees: 3,
    statut: "disponible",
    persona,
    negociation,
  };
}

function renderDrawer(
  item: ObjetEnVente,
  plein = false,
  scriptTuto: Parameters<typeof ChineNegoDrawer>[0]["scriptTuto"] = undefined,
) {
  const onUpdateNego = vi.fn();
  const onConclu = vi.fn();
  const onCollapse = vi.fn();
  const vue = render(
    <ChineNegoDrawer
      item={item}
      budget={1000}
      plein={plein}
      expanded={true}
      onExpand={() => {}}
      onCollapse={onCollapse}
      onUpdateNego={onUpdateNego}
      onConclu={onConclu}
      onAcheterDirect={() => {}}
      scriptTuto={scriptTuto}
    />,
  );
  return { onUpdateNego, onConclu, onCollapse, vue };
}

describe("ChineNegoDrawer — Tchatche déplacée dans le dock", () => {
  it("n'affiche plus de bouton Tchatche sur une négo fâchée", () => {
    renderDrawer(makeItem(makeNego({ statut: "fache" })));
    expect(screen.queryByText(/Tchatche/)).toBeNull();
  });

  it("n'affiche plus de bouton Tchatche sur un refus poli", () => {
    renderDrawer(makeItem(makeNego({ statut: "refus_poli" })));
    expect(screen.queryByText(/Tchatche/)).toBeNull();
  });
});

/**
 * Audit 2026-08-03 (H1, volet UI) : stockage plein, la garde n'existait que
 * sur la vue REPLIÉE — le tiroir déplié laissait conclure une négo
 * (Proposer/Accepter, achat après refus poli) vers un achat voué à l'échec.
 */
describe("ChineNegoDrawer — tiroir déplié, stockage plein", () => {
  it("négo en cours : Proposer désactivé, Laisser tomber toujours actif", () => {
    renderDrawer(makeItem(makeNego({ statut: "en_cours" })), true);
    const proposer = screen.getByText(/Proposer/).closest("button") as HTMLButtonElement;
    expect(proposer.disabled).toBe(true);
    const laisser = screen.getByText(/Laisser tomber/).closest("button") as HTMLButtonElement;
    expect(laisser.disabled).toBe(false);
  });

  it("dernier prix : « Accepter » désactivé quand plein, abandon toujours possible", () => {
    renderDrawer(makeItem(makeNego({ statut: "refus_poli" })), true);
    const accepter = screen.getByText(/Accepter/).closest("button") as HTMLButtonElement;
    expect(accepter.disabled).toBe(true);
    const laisser = screen.getByText(/Laisser tomber/).closest("button") as HTMLButtonElement;
    expect(laisser.disabled).toBe(false);
  });

  it("non-régression : stockage non plein, les deux boutons restent actifs", () => {
    renderDrawer(makeItem(makeNego({ statut: "en_cours" })), false);
    const proposer = screen.getByText(/Proposer/).closest("button") as HTMLButtonElement;
    expect(proposer.disabled).toBe(false);
  });
});

describe("ChineNegoDrawer — resynchronisation externe", () => {
  it("reflète une relance venue de l'extérieur (dock) : la négo redevient jouable", () => {
    const fache = makeNego({ statut: "fache" });
    const item = makeItem(fache);
    const { vue } = renderDrawer(item);
    // Fâché : pas de bouton Proposer.
    expect(screen.queryByText(/Proposer/)).toBeNull();

    // Le dock relance : nouvel objet negociation (référence différente).
    const relance = relancerNegociation(fache);
    vue.rerender(
      <ChineNegoDrawer
        item={{ ...item, negociation: relance }}
        budget={1000}
        plein={false}
        expanded={true}
        onExpand={() => {}}
        onCollapse={() => {}}
        onUpdateNego={() => {}}
        onConclu={() => {}}
        onAcheterDirect={() => {}}
      />,
    );
    expect(screen.getByText(/Proposer/)).toBeTruthy();
  });
});

describe("ChineNegoDrawer — statuts portés par le tampon de la carte", () => {
  /** Le tiroir replié : c'est là que vivaient les deux textes retirés. */
  function renderReplie(item: ObjetEnVente, plein = false) {
    return render(
      <ChineNegoDrawer
        item={item}
        budget={1000}
        plein={plein}
        expanded={false}
        onExpand={() => {}}
        onCollapse={() => {}}
        onUpdateNego={vi.fn()}
        onConclu={() => {}}
        onAcheterDirect={() => {}}
      />,
    );
  }

  /** Visible à l'œil = non porté par la classe de masquage `srOnly`. */
  function texteVisible(el: HTMLElement | null): boolean {
    return !!el && el.style.position !== "absolute";
  }

  it("objet acquis : plus de « — Acquis — » à l'écran, l'info reste pour les lecteurs d'écran", () => {
    // Retour device : « Acquis » fait doublon avec le tampon VENDU de la
    // carte. Mais ce tampon est `aria-hidden` — le retirer sans rien laisser
    // priverait complètement un utilisateur de VoiceOver. Même traitement que
    // « Vendeur fâché », dont le texte avait déjà migré vers le tampon.
    const { container } = renderReplie({ ...makeItem(null), statut: "achete" });
    expect(container.textContent).not.toContain("— Acquis —");
    const annonce = screen.getByText("Vendu", { selector: "span" }) as HTMLElement;
    expect(texteVisible(annonce)).toBe(false);
  });

  it("stockage plein : plus de texte rouge, l'info reste pour les lecteurs d'écran", () => {
    const { container } = renderReplie(makeItem(null), true);
    expect(container.textContent).not.toContain("Stockage plein");
    const annonce = screen.getByText("Stock plein", { selector: "span" }) as HTMLElement;
    expect(texteVisible(annonce)).toBe(false);
  });

  it("rien de particulier : les boutons d'action restent, aucune annonce parasite", () => {
    renderReplie(makeItem(null), false);
    expect(screen.getByRole("button", { name: /négocier/i })).toBeTruthy();
    expect(screen.queryByText("Stock plein")).toBeNull();
  });
});

describe("ChineNegoDrawer — accord de la pastille adverse", () => {
  it("« Elle » face à Mamie Odette, « Lui » face au Père Anselme", () => {
    renderDrawer(makeItem(makeNego({ statut: "en_cours" })));
    // persona par défaut = grincheux (Père Anselme).
    expect(screen.getByText("Lui")).toBeTruthy();
    expect(screen.queryByText("Elle")).toBeNull();
    cleanup();

    const item = makeItem(makeNego({ statut: "en_cours" }));
    item.persona = { ...persona, archetype: "mamie" };
    renderDrawer(item);
    expect(screen.getByText("Elle")).toBeTruthy();
    expect(screen.queryByText("Lui")).toBeNull();
  });
});

describe("ChineNegoDrawer — le vendeur a donné son dernier prix", () => {
  const refus = () => makeItem(makeNego({ statut: "refus_poli" }));

  it("propose « Laisser tomber » ET « Accepter » au prix du vendeur", () => {
    renderDrawer(refus());
    expect(screen.getByText("Laisser tomber")).toBeTruthy();
    expect(screen.getByText("Accepter 80 €")).toBeTruthy();
  });

  it("l'ancien bouton pleine largeur a disparu", () => {
    renderDrawer(refus());
    expect(screen.queryByText(/Acheter au prix affich/)).toBeNull();
  });

  it("« Accepter » conclut au prix du vendeur", () => {
    const { onConclu } = renderDrawer(refus());
    fireEvent.click(screen.getByText("Accepter 80 €"));
    expect(onConclu).toHaveBeenCalledWith(80);
  });

  it("« Laisser tomber » referme le tiroir sans rien conclure", () => {
    const { onConclu, onCollapse } = renderDrawer(refus());
    fireEvent.click(screen.getByText("Laisser tomber"));
    expect(onCollapse).toHaveBeenCalled();
    expect(onConclu).not.toHaveBeenCalled();
  });

  it("le curseur du joueur n'est plus dans la barre", () => {
    renderDrawer(refus());
    expect(screen.queryByText("Vous")).toBeNull();
    expect(screen.getByText("prix final")).toBeTruthy();
  });
});

/**
 * Cible pointillée du grand-père (tutoriel) : le curseur n'est plus bridé,
 * c'est « Proposer » qui reste inerte tant que l'offre n'a pas rejoint
 * l'anneau. L'offre initiale du tiroir vaut round(prixVendeur × 0.25) = 25
 * pour un objet à 100 €.
 */
describe("ChineNegoDrawer — cible du grand-père", () => {
  it("Proposer est inerte tant que l'offre est hors de l'anneau", () => {
    renderDrawer(makeItem(makeNego({ statut: "en_cours" })), false, {
      role: "nego-reussie",
      cible: { prix: 60, tolerance: 3 },
    });
    const proposer = screen.getByText(/Proposer/).closest("button") as HTMLButtonElement;
    expect(proposer.disabled).toBe(true);
  });

  it("Proposer s'active quand l'offre initiale tombe déjà dans l'anneau", () => {
    renderDrawer(makeItem(makeNego({ statut: "en_cours" })), false, {
      role: "nego-reussie",
      cible: { prix: 25, tolerance: 2 },
    });
    const proposer = screen.getByText(/Proposer/).closest("button") as HTMLButtonElement;
    expect(proposer.disabled).toBe(false);
  });

  it("hors tutoriel, aucune cible ne bloque quoi que ce soit", () => {
    renderDrawer(makeItem(makeNego({ statut: "en_cours" })));
    const proposer = screen.getByText(/Proposer/).closest("button") as HTMLButtonElement;
    expect(proposer.disabled).toBe(false);
  });

  it("le curseur garde ses bornes naturelles malgré la cible (plus de clamp)", () => {
    const { vue } = renderDrawer(makeItem(makeNego({ statut: "en_cours" })), false, {
      role: "nego-reussie",
      cible: { prix: 60, tolerance: 3 },
    });
    // L'anneau est bien posé, et l'offre affichée (25 €) est HORS de ses
    // bornes (57–63) : le clamp d'autrefois l'aurait remontée à 57.
    expect(vue.container.querySelector("[data-nego-cible]")).toBeTruthy();
    expect(screen.getByText("25€")).toBeTruthy();
  });
});
