// @vitest-environment jsdom
/**
 * L'ÉTAGÈRE NE DIT PLUS LE PRIX — elle dit l'ÉTAT.
 *
 * Demande de l'auteur, 2026-08-26 : au pied de chaque objet en vente, les
 * étoiles de son état ; le prix, lui, n'apparaît qu'au tap, dans la fiche.
 * Une boutique montre sa marchandise, elle ne crie pas ses tarifs.
 *
 * Ce que ce fichier a PERDU au passage, et volontairement : la plaque de prix,
 * son extinction quand la bourse ne suffisait pas, et le rouge du montant. Ces
 * trois signaux décrivaient un comportement retiré, pas un comportement cassé.
 * Le « il vous manque N jetons » vit dans `ArticleDetailBazar`, qui le disait
 * déjà.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ArticleBazar, CHEVAUCHEMENT_PIED_PX } from "./ArticleBazar";
import { BAZAR_LAYOUT } from "./bazarLayout";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { qgPct } from "@/components/mobile/qg/layout";
import {
  QgEditProvider,
  useQgEditContext,
} from "@/components/mobile/qg/dev/QgEditContext";

afterEach(cleanup);

/** Un objet en vente : le cas qui montre des étoiles. */
const OBJET_PRISTIN = { etat: "Pristin état", rarete: "rare" } as const;

function monter(props: Partial<React.ComponentProps<typeof ArticleBazar>> = {}) {
  const onOuvrir = vi.fn();
  const utils = render(
    <ArticleBazar
      cle="case1"
      visuel={<span data-testid="visuel" />}
      libelle="Harmonica chromatique"
      objet={OBJET_PRISTIN}
      onOuvrir={onOuvrir}
      {...props}
    />,
  );
  return { onOuvrir, ...utils };
}

function etoiles(): SVGSVGElement[] {
  return Array.from(
    screen.getByTestId("etoiles-case1").querySelectorAll("svg"),
  );
}

describe("ArticleBazar — l'état au pied de la case", () => {
  it("un objet en vente montre ses trois étoiles, remplies de sa teinte de rareté", () => {
    monter();
    const rendues = etoiles();
    expect(rendues).toHaveLength(3);
    const teinte = getRarityColors("rare").outer;
    for (const e of rendues) {
      expect(e.getAttribute("fill")).toBe(teinte);
    }
  });

  it("un état intermédiaire ne remplit que ses étoiles", () => {
    monter({ objet: { etat: "Bon", rarete: "rare" } });
    const remplies = etoiles().filter(
      (e) => e.getAttribute("fill") === getRarityColors("rare").outer,
    );
    expect(remplies).toHaveLength(etoileCount("Bon"));
    expect(etoiles()).toHaveLength(3);
  });

  /**
   * Les étoiles sont posées sur une illustration peinte — un mur de sauge, une
   * planche de bois clair — et non sur le fond d'écran uni des autres écrans.
   * Sans ombre portée, un liseré de rareté clair s'y dissout.
   */
  it("les étoiles portent l'ombre qui les détache de l'illustration", () => {
    monter();
    expect(etoiles()[0].style.filter).toContain("rgba(0,0,0,0.5)");
  });

  // Un lot de pièces de restauration n'a pas d'état : rien à dire au pied.
  // C'est l'ABSENCE de la prop qui le décide, pas une exception dans le code
  // appelant — la scène passe ce qu'elle a, le composant montre ce qu'il sait.
  it("le pied d'un lot de pièces reste nu", () => {
    monter({ objet: undefined, libelle: "5 pièces · Musique" });
    expect(screen.queryByTestId("etoiles-case1")).toBeNull();
  });

  it("l'étagère ne dit plus le prix — aucun chiffre, aucune pièce", () => {
    const { container } = monter();
    expect(container.textContent).toBe("");
    expect(screen.queryByRole("img", { name: /Bazarcoin/ })).toBeNull();
  });

  /**
   * Ce que voit l'œil, dit à l'oreille. Le prix quittait aussi le nom
   * accessible : un joueur non-voyant n'a pas d'étoiles à regarder, et la
   * rangée ne lui rendrait rien si elle restait muette. L'état passe donc dans
   * le nom du BOUTON — l'élément qui s'annonce vraiment à la prise de focus.
   */
  it("le nom accessible du bouton dit l'état de l'objet", () => {
    monter();
    expect(
      screen.getByRole("button", { name: /Harmonica chromatique.*Pristin/ }),
    ).toBeTruthy();
  });

  it("un lot n'annonce que son libellé : il n'a pas d'état à dire", () => {
    monter({ objet: undefined, libelle: "5 pièces · Musique" });
    const bouton = screen.getByRole("button");
    expect(bouton.getAttribute("aria-label")).toBe("5 pièces · Musique");
  });

  // ── L'ARTICLE VENDU (2026-08-26) ────────────────────────────────────────
  // Il ne quitte plus l'étagère : il y reste en noir et blanc sous son cachet,
  // jusqu'au renouvellement du lundi. La case ne promet plus rien — donc elle
  // n'est plus une commande.
  describe("un article vendu", () => {
    const vendu = { objet: OBJET_PRISTIN, vendu: true } as const;

    it("n'est plus un bouton : il n'y a plus rien à ouvrir", () => {
      monter(vendu);
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.getByTestId("visuel")).toBeTruthy();
    });

    it("porte le cachet en diagonale de la chine", () => {
      monter(vendu);
      const cachet = screen.getByTestId("tampon");
      expect(cachet.textContent).toBe("Vendu");
      const encre = cachet.firstElementChild as HTMLElement;
      expect(encre.style.transform).toBe("rotate(-18deg)");
    });

    // Son état ne renseigne plus personne — l'objet n'est plus à vendre — et
    // une rangée colorée sous une vignette grise se contredirait.
    it("perd ses étoiles d'état", () => {
      monter(vendu);
      expect(screen.queryByTestId("etoiles-case1")).toBeNull();
    });

    it("se dit vendu à qui ne le voit pas", () => {
      monter(vendu);
      const cadre = screen.getByRole("img", { name: /Harmonica chromatique.*Vendu/ });
      expect(cadre).toBeTruthy();
    });

    it("un tap ne déclenche rien", () => {
      const { onOuvrir } = monter(vendu);
      fireEvent.click(screen.getByTestId("visuel"));
      expect(onOuvrir).not.toHaveBeenCalled();
    });
  });

  // ── Le tap OUVRE, il n'achète pas ────────────────────────────────────────
  // Recette du 2026-08-20 : un doigt mal posé sur l'étagère coûtait une
  // semaine de jetons sans rien demander. L'achat vit dans la fiche.
  it("le tap ouvre la fiche", () => {
    const { onOuvrir } = monter();
    fireEvent.click(screen.getByRole("button"));
    expect(onOuvrir).toHaveBeenCalledTimes(1);
  });

  /**
   * Le composant ne connaît PLUS la bourse du joueur — c'était la seule raison
   * pour laquelle il la recevait. Il ne peut donc plus rien refuser, ni le
   * laisser croire : pas d'`aria-disabled`, pas de `disabled`.
   */
  it("le bouton n'est jamais annoncé désactivé — il ouvre toujours", () => {
    monter();
    const bouton = screen.getByRole("button");
    const valeur = bouton.getAttribute("aria-disabled");
    expect(valeur === null || valeur === "false").toBe(true);
    expect(bouton.hasAttribute("disabled")).toBe(false);
  });

  it("le bouton reste focusable au clavier", () => {
    monter();
    const bouton = screen.getByRole("button");
    bouton.focus();
    expect(document.activeElement).toBe(bouton);
  });

  // Recette du 2026-08-20 sur téléphone : l'auteur a refusé la désaturation
  // des articles trop chers. La marchandise reste en couleur, toujours.
  it("l'article reste en COULEUR (aucun filtre sur la case)", () => {
    monter();
    expect(screen.getByTestId("article-case1").style.filter).toBe("");
  });

  // ── Revue du 2026-08-20, constat I1 ──────────────────────────────────────
  // jsdom n'a pas de moteur de layout : la seule trace observable de ces deux
  // défauts est le style en ligne. Le dépôt n'installe pas jest-dom, on lit
  // donc `element.style.*` directement.
  describe("le pied ne pousse pas l'article hors de l'étagère", () => {
    it("le conteneur ne porte que le visuel : c'est LUI qui est ancré à la planche", () => {
      monter();
      const article = screen.getByTestId("article-case1");
      // Deux enfants seulement : le bouton (dans le flux, donc ancré par
      // `bottom`) et la colonne du pied, hors flux.
      expect(article.children.length).toBe(2);
      const [bouton, pied] = [...article.children] as HTMLElement[];
      expect(bouton.tagName).toBe("BUTTON");
      expect(pied.style.position).toBe("absolute");
    });

    it("la colonne du pied est À CHEVAL sur l'arête basse de la case, hors du flux", () => {
      monter();
      const pied = screen.getByTestId("etoiles-case1");
      expect(pied.style.position).toBe("absolute");
      // Recette du 2026-08-20 : suspendu sous le carré (`calc(100% + 2px)`),
      // le pied semblait flotter entre deux rangées. Il remonte PAR-DESSUS
      // l'arête basse pour se lire comme posé sur la planche.
      expect(pied.style.top).toBe(`calc(100% - ${CHEVAUCHEMENT_PIED_PX}px)`);
      expect(CHEVAUCHEMENT_PIED_PX).toBeGreaterThan(0);
      expect(pied.style.left).toBe("50%");
      expect(pied.style.transform).toBe("translateX(-50%)");
    });
  });

  // ── Case carrée, visuel centré-bas : demande du 2026-08-20, round 2 ──────
  describe("la case est carrée, centre le visuel horizontalement et le justifie en bas", () => {
    it("le conteneur porte aspectRatio 1/1", () => {
      monter();
      expect(screen.getByTestId("article-case1").style.aspectRatio).toBe("1 / 1");
    });

    it("le conteneur centre horizontalement et justifie en bas (pas placeItems: center)", () => {
      monter();
      const article = screen.getByTestId("article-case1");
      expect(article.style.justifyItems).toBe("center");
      expect(article.style.alignItems).toBe("end");
    });

    it("le bouton occupe toute la case et place son visuel comme le conteneur", () => {
      monter();
      const bouton = screen.getByRole("button");
      expect(bouton.style.width).toBe("100%");
      expect(bouton.style.height).toBe("100%");
      expect(bouton.style.justifyItems).toBe("center");
      expect(bouton.style.alignItems).toBe("end");
    });

    // « L'objet doit toujours être visible en entier » (recette du
    // 2026-08-20) : plus rien ne peut déborder, le filet de rognage est parti.
    it("la case ne rogne rien : pas d'overflow: hidden", () => {
      monter();
      expect(screen.getByRole("button").style.overflow).toBe("");
    });
  });
});

// ── Revue du 2026-08-20, constat C1 ────────────────────────────────────────
// L'article lisait `BAZAR_LAYOUT.objets[cle]` en direct : tirer son cadre en
// mode calage déplaçait le pointillé sans déplacer l'article.
describe("ArticleBazar suit l'outil de calage", () => {
  function Deplacer({ left }: { left: number }) {
    const ctx = useQgEditContext();
    return (
      <button type="button" data-testid="deplacer" onClick={() => ctx?.setOverride("case1", { left })}>
        déplacer
      </button>
    );
  }

  it("sans override, il est posé à sa coordonnée authorée", () => {
    render(
      <QgEditProvider enabled>
        <ArticleBazar cle="case1" visuel={<span />} libelle="lot" onOuvrir={vi.fn()} />
      </QgEditProvider>,
    );
    const article = screen.getByTestId("article-case1");
    expect(article.style.left).toBe(`${qgPct(BAZAR_LAYOUT.objets.case1.left)}%`);
  });

  it("avec un override, l'article se déplace avec son cadre", () => {
    render(
      <QgEditProvider enabled>
        <Deplacer left={120} />
        <ArticleBazar cle="case1" visuel={<span />} libelle="lot" onOuvrir={vi.fn()} />
      </QgEditProvider>,
    );
    fireEvent.click(screen.getByTestId("deplacer"));
    expect(screen.getByTestId("article-case1").style.left).toBe(`${qgPct(120)}%`);
  });
});
