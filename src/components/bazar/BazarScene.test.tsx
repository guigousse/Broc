// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { BazarScene, ZONES_BAZAR } from "./BazarScene";
import { BAZAR_LAYOUT } from "./bazarLayout";
import { qgPct } from "@/components/mobile/qg/layout";
import type { EtalBazar } from "@/types/game";

afterEach(cleanup);

const ETAL: EtalBazar = {
  cleSemaine: "2026-W34",
  lotsPieces: [
    { categorie: "Musique", quantite: 5, prix: 1 },
    { categorie: "Mode", quantite: 5, prix: 1 },
    { categorie: "Maison", quantite: 5, prix: 1 },
  ],
  vitrine: { templateId: "jx.jeu_magnatimmo_annees_80", valeurBase: 200, prix: 8 },
};

function monter(
  etal: EtalBazar = ETAL,
  jetons = 25,
  resultat: { ok: boolean; raison?: string } = { ok: true },
) {
  // Le retour n'est pas décoratif : la fiche de l'article ne se referme que
  // s'il est `ok`, et affiche sinon la raison.
  const onAcheter = vi.fn().mockReturnValue(resultat);
  const onSortir = vi.fn();
  render(<BazarScene etal={etal} jetons={jetons} onAcheter={onAcheter} onSortir={onSortir} />);
  return { onAcheter, onSortir };
}

describe("BazarScene", () => {
  it("a trois zones, en tiers, et s'ouvre sur le comptoir", () => {
    expect(ZONES_BAZAR.map((z) => z.key)).toEqual(["arcade", "comptoir", "antiquites"]);
    expect(ZONES_BAZAR.map((z) => z.center)).toEqual([1 / 6, 1 / 2, 5 / 6]);
    // La zone du milieu est celle que `UnifiedPanorama` centre au montage
    // quand `initialZone` n'est pas passé (cf. Task 1).
    expect(ZONES_BAZAR[Math.floor(ZONES_BAZAR.length / 2)].key).toBe("comptoir");
  });

  it("pose les trois lots sur la planche du bas", () => {
    monter();
    expect(screen.getByTestId("article-case4")).toBeTruthy();
    expect(screen.getByTestId("article-case5")).toBeTruthy();
    expect(screen.getByTestId("article-case6")).toBeTruthy();
  });

  it("pose l'objet de la semaine au milieu de la planche du haut", () => {
    monter();
    expect(screen.getByTestId("article-case2")).toBeTruthy();
  });

  // Depuis la recette du 2026-08-20, le tap OUVRE la fiche de l'article ;
  // l'achat se confirme sur son bouton. Deux gestes, donc, dans tous les tests
  // d'achat de cet écran.
  function acheterDansLaFiche() {
    fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
  }

  it("taper un lot ouvre SA fiche, et l'achat y porte son index", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getAllByRole("button", { name: /Mode/ })[0]);
    expect(onAcheter).not.toHaveBeenCalled();
    // La fiche montre bien le lot touché, pas un autre.
    expect(screen.getByRole("dialog").textContent).toContain("Mode");
    acheterDansLaFiche();
    expect(onAcheter).toHaveBeenCalledWith({ type: "pieces", index: 1 });
  });

  it("taper la vitrine ouvre sa fiche, et l'achat s'y confirme", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    expect(onAcheter).not.toHaveBeenCalled();
    acheterDansLaFiche();
    expect(onAcheter).toHaveBeenCalledWith({ type: "vitrine" });
  });

  it("la fiche se referme après l'achat", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    acheterDansLaFiche();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("achat refusé par le jeu : la fiche reste ouverte et porte la raison", () => {
    monter(ETAL, 25, { ok: false, raison: "Stockage plein" });
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    acheterDansLaFiche();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Stockage plein");
  });

  it("aucune fiche n'est ouverte tant que rien n'est tapé", () => {
    monter();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // La fiche est posée HORS du panorama : son conteneur scrolle
  // horizontalement, une fiche placée dedans voyagerait avec la scène — et la
  // couche d'objets du panorama est en `pointer-events: none`, ce qui rendrait
  // le voile insensible au tap.
  it("la fiche n'est pas un enfant du panorama", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    const fiche = screen.getByRole("dialog");
    const panorama = screen.getByRole("button", { name: /Sortir/ }).closest("div");
    expect(panorama?.contains(fiche)).toBe(false);
  });

  // L'objet de la semaine est rendu comme partout ailleurs dans le jeu : une
  // vignette découpée (contour blanc die-cut + inclinaison déterministe), pas
  // un PNG nu. Posé sur une illustration peinte, le PNG se confondait avec le
  // mur (recette du 2026-08-20).
  it("l'objet de la semaine est une vignette découpée, en vignette légère", () => {
    monter();
    const img = screen
      .getByTestId("article-case2")
      .querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    // Le contour die-cut : quatre drop-shadow blanches autour de l'alpha.
    expect(img.style.filter).toContain("#fdfaf2");
    // `thumb` : la vignette 384 px, pas le plein format — la case fait ~22
    // unités de large, décoder un 1600 px pour ça coûte de la mémoire.
    expect(img.getAttribute("src")).toBe(
      "/items/thumbs/jx.jeu_magnatimmo_annees_80.webp",
    );
    // `fill` : le sticker remplit la case carrée au lieu d'imposer sa taille.
    expect(img.style.position).toBe("absolute");
  });

  // « Les objets sont dessinés DROITS » (recette du 2026-08-20) : le sticker
  // incline chaque objet de quelques degrés par défaut, l'auteur n'en veut pas
  // dans sa boutique. Accessoire utile : une vignette droite tient exactement
  // dans son carré, là où une vignette tournée en déborde par les coins.
  it("l'objet de la semaine est posé d'aplomb, sans inclinaison", () => {
    monter();
    const vignette = screen
      .getByTestId("article-case2")
      .querySelector("img")?.parentElement as HTMLElement;
    expect(vignette.style.transform).toBe("rotate(0deg)");
  });

  // « L'objet doit toujours être visible en entier » : le bouton rognait ce
  // qui dépassait (`overflow: hidden`), et l'auteur a vu ses articles coupés.
  // Plus rien ne peut déborder, le filet n'a plus lieu d'être.
  it("la case ne rogne rien", () => {
    monter();
    const bouton = screen.getByRole("button", { name: /Magnatimmo/ });
    expect(bouton.style.overflow).toBe("");
  });

  // Exigence de l'auteur, acquise le matin même sur `ItemImage` (commit
  // 60d94db5) et reperdue au passage à la vignette : un objet posé sur une
  // étagère touche la planche par sa base. `contain` letterboxe les objets
  // larges et bas, et le vide laissé sous eux les fait flotter.
  it("l'objet de la semaine repose sur l'arête basse de sa case, il ne flotte pas", () => {
    monter();
    const img = screen
      .getByTestId("article-case2")
      .querySelector("img") as HTMLImageElement;
    expect(img.style.objectPosition).toBe("center bottom");
  });

  // ... mais dans la fiche, il ne repose sur rien : il est présenté seul dans
  // une carte au large, et l'ancrer en bas le collerait à son titre.
  it("dans la fiche, en revanche, l'objet est centré", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    const img = screen.getByRole("dialog").querySelector("img") as HTMLImageElement;
    expect(img.style.objectPosition).toBe("center");
  });

  it("vitrine vendue : la place est vide et le dit", () => {
    monter({ ...ETAL, vitrine: null });
    expect(screen.queryByTestId("article-case2")).toBeNull();
    expect(screen.getByText(/Vendu/)).toBeTruthy();
  });

  it("vitrine vendue : l'étiquette déborde sur toute la rangée, pas juste une case", () => {
    monter({ ...ETAL, vitrine: null });
    // La géométrie est portée par le cadre ; la plaque, à l'intérieur, se
    // serre autour du texte.
    const cadre = screen.getByTestId("etiquette-vendu");
    const largeurUneCase = qgPct(BAZAR_LAYOUT.objets.case2.width);
    const largeurEtiquette = parseFloat(cadre.style.width);
    expect(largeurEtiquette).toBeGreaterThan(largeurUneCase);
  });

  it("vitrine vendue : l'étiquette est posée sur une plaque, pas à même le mur", () => {
    monter({ ...ETAL, vitrine: null });
    const plaque = screen.getByText(/Vendu/);
    expect(plaque.style.backgroundColor).toBe("var(--forest-800)");
    expect(plaque.style.color).toBe("var(--brass-300)");
  });

  it("la porte fait sortir", () => {
    const { onSortir } = monter();
    fireEvent.click(screen.getByRole("button", { name: /Sortir/ }));
    expect(onSortir).toHaveBeenCalledTimes(1);
  });

  it("la borne et la table ne répondent pas", () => {
    monter();
    expect(screen.queryByTestId("article-borne")).toBeNull();
    expect(screen.queryByTestId("article-table")).toBeNull();
  });

  // La spec (§4.4) demandait la désaturation des articles hors de portée ;
  // l'auteur l'a REFUSÉE à la recette du 2026-08-20 (vue sur téléphone) : la
  // marchandise reste en couleur, quoi qu'il arrive, et c'est le prix barré
  // qui dit l'inaccessibilité. Le test garde le cas « bourse à 0 » — il
  // atteste maintenant ce que la conception dit, pas son contraire.
  it("bourse à 0 : les quatre articles restent en couleur, prix barré", () => {
    const { onAcheter } = monter(ETAL, 0);
    for (const cle of ["case4", "case5", "case6", "case2"]) {
      const article = screen.getByTestId(`article-${cle}`);
      expect(article.style.filter).toBe("");
    }
    expect((screen.getByText("8 jetons") as HTMLElement).style.textDecoration).toBe(
      "line-through",
    );
    // Et taper n'achète toujours rien : ça ouvre la fiche, qui dit le manque.
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
    expect(onAcheter).not.toHaveBeenCalled();
    expect(screen.getByText("Il vous manque 8 jetons")).toBeTruthy();
  });

  // Revue du 2026-08-20 : la scène testait `etal.vitrine && template`. Un
  // templateId retiré du catalogue annonçait « Vendu — de retour lundi » sur
  // un objet pourtant en vente, et le rendait inachetable.
  it("template inconnu : l'article reste en vente, sous son identifiant brut", () => {
    const { onAcheter } = monter({
      ...ETAL,
      vitrine: { templateId: "zz.template_disparu", valeurBase: 200, prix: 8 },
    });
    expect(screen.queryByText(/Vendu/)).toBeNull();
    const bouton = screen.getByRole("button", { name: "zz.template_disparu" });
    fireEvent.click(bouton);
    fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
    expect(onAcheter).toHaveBeenCalledWith({ type: "vitrine" });
  });

  it("la sortie est posée à la coordonnée du layout, via le hook de calage", () => {
    monter();
    const porte = screen.getByRole("button", { name: /Sortir/ }) as HTMLElement;
    expect(porte.style.left).toBe(`${qgPct(BAZAR_LAYOUT.objets.sortie.left)}%`);
    expect(porte.style.width).toBe(`${qgPct(BAZAR_LAYOUT.objets.sortie.width)}%`);
  });
});
