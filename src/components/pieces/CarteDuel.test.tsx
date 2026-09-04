// @vitest-environment jsdom
/**
 * CarteDuel — la carte composée à l'écran : fond peint par rareté + les
 * textes vivants dans les zones du gabarit. Pas de jest-dom ici (cf.
 * LigneDuel.test) : on lit les styles en ligne et `textContent`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CarteDuel, tailleNom } from "./CarteDuel";
import { GABARITS, RATIO_CARTE } from "@/data/duel/gabaritCarte";
import { getPiece } from "@/data/pieces";
import { statsDuel } from "@/data/duel/cartesDuel";

// Depuis le 2026-09-04 les 50 cartes ont leur art : pour tester le repli
// « objet source toonifié », on retire le marteau de la liste déclarée.
vi.mock("@/lib/pieceImages", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/pieceImages")>();
  const sans = new Set([...mod.PIECES_AVEC_IMAGE].filter((id) => id !== "carte.marteau_menuisier"));
  return { ...mod, pieceImageSrc: (id: string, declarees: ReadonlySet<string> = sans) => mod.pieceImageSrc(id, declarees) };
});


afterEach(cleanup);

describe("CarteDuel", () => {
  it("prend le fond de sa rareté, au format 5:7", () => {
    render(<CarteDuel id="carte.tabouret_bois_patine" />); // commun
    const c = screen.getByTestId("carte-duel");
    expect(c.dataset.rarete).toBe("commun");
    expect(c.style.backgroundImage).toContain("/cartes/fond-commun.webp");
    expect(c.style.aspectRatio).toBe(RATIO_CARTE);
  });

  it("écrit nom, coût, attaque, PV, texte et numéro dans les zones du gabarit", () => {
    const id = "carte.tabouret_bois_patine"; // 3, 2/4, Barrage, n° = ordre+1
    render(<CarteDuel id={id} />);
    const piece = getPiece(id)!;
    const s = statsDuel(id);
    const g = GABARITS[piece.rarete];
    expect(screen.getByTestId("carte-nom").textContent).toBe(piece.nom);
    expect(screen.getByTestId("carte-nom").style.left).toBe(`${g.nom.x}%`);
    expect(screen.getByLabelText("Coût").textContent).toBe(String(s.cout));
    expect(screen.getByLabelText("Coût").style.top).toBe(`${g.cout.y}%`);
    expect(screen.getByLabelText("Attaque").textContent).toBe(String(s.attaque));
    expect(screen.getByLabelText("PV").textContent).toBe(String(s.pv));
    expect(screen.getByTestId("carte-texte").textContent).toBe("Barrage");
    expect(screen.getByTestId("carte-numero").textContent).toBe(`${piece.ordre + 1} / 50`);
  });

  it("légendaire : son propre fond et son propre gabarit", () => {
    const id = "carte.violon_de_maitre_cremonais_1715";
    render(<CarteDuel id={id} />);
    const c = screen.getByTestId("carte-duel");
    expect(c.style.backgroundImage).toContain("fond-legendaire.webp");
    expect(screen.getByLabelText("PV").style.left).toBe(`${GABARITS.legendaire.pv.x}%`);
  });

  it("sans art : l'objet source toonifié dans la fenêtre ; en vignette, sa miniature et pas de texte", () => {
    const { container, unmount } = render(<CarteDuel id="carte.marteau_menuisier" />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toContain("br.marteau_menuisier");
    expect(img.style.filter).toContain("saturate");
    unmount();
    render(<CarteDuel id="carte.marteau_menuisier" thumb />);
    const vignette = document.querySelector("img") as HTMLImageElement;
    expect(vignette.getAttribute("src")).toContain("/thumbs/");
    cleanup();
    render(<CarteDuel id="carte.tabouret_bois_patine" thumb />);
    expect(screen.queryByTestId("carte-texte")).toBeNull();
  });

  it("carte vanille : pas de texte d'effet, le numéro reste", () => {
    render(<CarteDuel id="carte.marteau_menuisier" />);
    expect(screen.queryByTestId("carte-texte")).toBeNull();
    expect(screen.getByTestId("carte-numero")).toBeTruthy();
  });

  it("le nom rétrécit par paliers avec sa longueur", () => {
    expect(tailleNom("Vase Gallé signé")).toBe("3.6cqw");
    expect(tailleNom("Métronome mécanique à pyramide")).toBe("3cqw");
    expect(tailleNom("Stylo plume haut de gamme à l'étoile blanche (doré)")).toBe("2.5cqw");
    // « Petite robe noire enchaînée (1925) » : 34 caractères, palier du milieu.
    render(<CarteDuel id="carte.la_petite_robe_noire_chaine_1925" />);
    expect(screen.getByTestId("carte-nom").style.fontSize).toBe("3cqw");
  });

  it("rend null pour un timbre ou un id inconnu", () => {
    const { container } = render(<CarteDuel id="timbre.renard_roux" />);
    expect(container.innerHTML).toBe("");
  });
});
