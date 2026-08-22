// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ArticleBazar, CHEVAUCHEMENT_ETIQUETTE_PX } from "./ArticleBazar";
import { PLAQUE_ETIQUETTE, PLAQUE_ETIQUETTE_ETEINTE } from "./etiquette";
import { BAZAR_LAYOUT } from "./bazarLayout";
import { qgPct } from "@/components/mobile/qg/layout";
import {
  QgEditProvider,
  useQgEditContext,
} from "@/components/mobile/qg/dev/QgEditContext";

afterEach(cleanup);

function monter(props: Partial<React.ComponentProps<typeof ArticleBazar>> = {}) {
  const onOuvrir = vi.fn();
  const utils = render(
    <ArticleBazar
      cle="case1"
      visuel={<span data-testid="visuel" />}
      libelle="5 pièces · Musique"
      prix={3}
      jetons={10}
      onOuvrir={onOuvrir}
      {...props}
    />,
  );
  return { onOuvrir, ...utils };
}

describe("ArticleBazar", () => {
  // La plaque montre la PIÈCE et le nombre, pas le mot : les cases font 89 px
  // de large et « 3 Bazarcoins » n'y tient dans aucune des quatre langues. Le
  // mot survit dans le nom accessible — un lecteur d'écran doit entendre une
  // monnaie, pas un nombre nu qui se confondrait avec une quantité d'objets.
  it("la plaque de prix montre le nombre et la pièce, sans le mot", () => {
    monter({ prix: 3, jetons: 10 });
    const plaque = screen.getByRole("img", { name: "3 Bazarcoins" });
    expect(plaque.textContent).toBe("3");
    expect(plaque.querySelector("svg")).toBeTruthy();
  });

  it("le singulier passe dans le nom accessible", () => {
    monter({ prix: 1, jetons: 10 });
    const plaque = screen.getByRole("img", { name: "1 Bazarcoin" });
    expect(plaque.textContent).toBe("1");
  });

  it("montre le visuel, le libellé et le prix", () => {
    monter();
    expect(screen.getByTestId("visuel")).toBeTruthy();
    expect(screen.getByRole("button", { name: /5 pièces · Musique/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: "3 Bazarcoins" })).toBeTruthy();
  });

  it("le singulier du prix est respecté", () => {
    monter({ prix: 1, jetons: 10 });
    expect(screen.getByRole("img", { name: "1 Bazarcoin" })).toBeTruthy();
  });

  // ── Le tap OUVRE, il n'achète plus ────────────────────────────────────────
  // Recette du 2026-08-20 : un doigt mal posé sur l'étagère coûtait une
  // semaine de jetons sans rien demander. L'achat a déménagé dans la fiche
  // (`ArticleDetailBazar`), avec le message du manque et son minuteur.
  it("le tap ouvre la fiche, quelle que soit la bourse", () => {
    const { onOuvrir } = monter();
    fireEvent.click(screen.getByRole("button", { name: /5 pièces · Musique/ }));
    expect(onOuvrir).toHaveBeenCalledTimes(1);
  });

  it("hors de portée AUSSI, le tap ouvre la fiche : c'est elle qui dira le manque", () => {
    const { onOuvrir } = monter({ prix: 12, jetons: 5 });
    fireEvent.click(screen.getByRole("button", { name: /5 pièces · Musique/ }));
    expect(onOuvrir).toHaveBeenCalledTimes(1);
    // Plus rien ne s'affiche sur l'étagère : le message vit dans la fiche.
    expect(screen.queryByRole("status")).toBeNull();
  });

  // ── La rature est remplacée par l'extinction (recette du 2026-08-20) ─────
  // Le prix hors de portée était BARRÉ. L'auteur a changé la règle : la rature
  // raye un chiffre qu'on cherche justement à lire, et sur une plaque de
  // 0,7 rem elle se confond avec le trait du filet. C'est la COULEUR qui porte
  // l'état, la plaque entière s'éteignant d'un bloc.
  it("hors de portée : la plaque s'éteint en entier — fond, filet et texte", () => {
    monter({ prix: 12, jetons: 5 });
    // `toHaveStyle` n'existe pas ici : le dépôt n'installe PAS @testing-library/jest-dom.
    // On lit la propriété de style directement.
    const prix = screen.getByRole("img", { name: "12 Bazarcoins" }) as HTMLElement;
    expect(prix.style.backgroundColor).toBe(PLAQUE_ETIQUETTE_ETEINTE.backgroundColor);
    // Le raccourci `border` : jsdom ne le décompose pas quand la valeur passe
    // par un `var()` (piège déjà documenté dans `etiquette.ts`), on lit donc
    // la propriété telle qu'elle a été posée.
    expect(prix.style.border).toBe("1px solid var(--ink-300)");
    expect(prix.style.color).toBe(PLAQUE_ETIQUETTE_ETEINTE.color);
  });

  it("hors de portée : le prix n'est PLUS barré", () => {
    monter({ prix: 12, jetons: 5 });
    const prix = screen.getByRole("img", { name: "12 Bazarcoins" }) as HTMLElement;
    expect(prix.style.textDecoration).not.toBe("line-through");
  });

  it("à portée : la plaque garde le couple de la maison", () => {
    monter({ prix: 3, jetons: 10 });
    const prix = screen.getByRole("img", { name: "3 Bazarcoins" }) as HTMLElement;
    expect(prix.style.backgroundColor).toBe(PLAQUE_ETIQUETTE.backgroundColor);
    expect(prix.style.color).toBe(PLAQUE_ETIQUETTE.color);
  });

  // Éteinte, oui ; fantôme, non. Le fond et le texte doivent RESTER un couple
  // contrasté : `paper-400` sur `ink-500`, 5,6:1, au-dessus du seuil AA.
  it("les deux états ne partagent aucune des trois teintes", () => {
    expect(PLAQUE_ETIQUETTE_ETEINTE.backgroundColor).not.toBe(
      PLAQUE_ETIQUETTE.backgroundColor,
    );
    expect(PLAQUE_ETIQUETTE_ETEINTE.border).not.toBe(PLAQUE_ETIQUETTE.border);
    expect(PLAQUE_ETIQUETTE_ETEINTE.color).not.toBe(PLAQUE_ETIQUETTE.color);
  });

  // Recette du 2026-08-20 sur téléphone : l'auteur a refusé la désaturation
  // des articles trop chers. La marchandise reste en couleur ; seul le prix,
  // barré, dit que la bourse ne suit pas.
  it("hors de portée : l'article reste en COULEUR (aucun filtre)", () => {
    monter({ prix: 12, jetons: 5 });
    const article = screen.getByTestId("article-case1");
    expect(article.style.filter).toBe("");
  });

  // Le bouton FONCTIONNE, quelle que soit la bourse : il ouvre la fiche.
  // L'annoncer désactivé serait faux. `aria-disabled` a suivi l'achat dans la
  // fiche, sur le bouton qui refuse vraiment quelque chose.
  it("le bouton n'est jamais annoncé désactivé — il ouvre toujours", () => {
    for (const jetons of [10, 0]) {
      cleanup();
      monter({ prix: 12, jetons });
      const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
      const valeur = bouton.getAttribute("aria-disabled");
      expect(valeur === null || valeur === "false").toBe(true);
      expect(bouton.hasAttribute("disabled")).toBe(false);
    }
  });

  it("hors de portée : le bouton reste focusable au clavier", () => {
    monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    bouton.focus();
    expect(document.activeElement).toBe(bouton);
  });

  // ── Revue du 2026-08-20, constat I1 ──────────────────────────────────────
  // jsdom n'a pas de moteur de layout : la seule trace observable de ces deux
  // défauts est le style en ligne. Le dépôt n'installe pas jest-dom, on lit
  // donc `element.style.*` directement.
  describe("l'étiquette ne pousse pas l'article hors de l'étagère", () => {
    it("le conteneur ne porte que le visuel : c'est LUI qui est ancré à la planche", () => {
      monter();
      const article = screen.getByTestId("article-case1");
      // Deux enfants seulement : le bouton (dans le flux, donc ancré par
      // `bottom`) et la colonne d'étiquettes, hors flux.
      expect(article.children.length).toBe(2);
      const [bouton, etiquettes] = [...article.children] as HTMLElement[];
      expect(bouton.tagName).toBe("BUTTON");
      expect(etiquettes.style.position).toBe("absolute");
    });

    it("la colonne prix est À CHEVAL sur l'arête basse de la case, hors du flux", () => {
      monter();
      const etiquettes = screen.getByTestId("etiquettes-case1");
      expect(etiquettes.style.position).toBe("absolute");
      // Recette du 2026-08-20 : la plaque pendait sous le carré
      // (`calc(100% + 2px)`) et semblait flotter entre deux rangées. Elle
      // remonte maintenant PAR-DESSUS l'arête basse.
      expect(etiquettes.style.top).toBe(`calc(100% - ${CHEVAUCHEMENT_ETIQUETTE_PX}px)`);
      expect(CHEVAUCHEMENT_ETIQUETTE_PX).toBeGreaterThan(0);
      expect(etiquettes.style.left).toBe("50%");
      expect(etiquettes.style.transform).toBe("translateX(-50%)");
    });

    // Le fond du Bazar est un mur de sauge pâle : une étiquette écrite à même
    // l'illustration ne se lit pas (constat de recette sur capture du décor
    // fini). Le choix des teintes reste un jugement à l'œil, mais l'existence
    // de la plaque, elle, s'atteste.
    it("le prix est posé sur une plaque sombre, pas à même l'illustration", () => {
      monter();
      const prix = screen.getByRole("img", { name: "3 Bazarcoins" });
      expect(prix.style.backgroundColor).toBe("var(--forest-800)");
      expect(prix.style.color).toBe("var(--brass-300)");
      expect(prix.style.borderRadius).toBe("var(--radius-pill)");
    });

    it("hors de portée, c'est encore une plaque — éteinte, pas effacée", () => {
      monter({ prix: 12, jetons: 5 });
      const prix = screen.getByRole("img", { name: "12 Bazarcoins" });
      expect(prix.style.backgroundColor).toBe("var(--ink-500)");
      expect(prix.style.borderRadius).toBe("var(--radius-pill)");
      // La plaque est passée d'`inline-block` à `inline-flex` le jour où la
      // pièce est venue s'asseoir à côté du nombre : c'est la façon la plus
      // sûre de les aligner et de les espacer. Ce qui compte pour ce test n'a
      // pas bougé — la plaque reste une pastille en ligne, éteinte et non
      // effacée.
      expect(prix.style.display).toMatch(/^inline/);
      expect(prix.style.alignItems).toBe("center");
    });
  });

  // ── Case carrée, visuel centré-bas : demande du 2026-08-20, round 2 ──────
  // L'auteur cale le Bazar à la souris (`?qgedit=1`) et tire le cadre
  // pointillé pour que son arête BASSE coïncide avec la planche peinte dans
  // le fond : l'objet doit sembler y reposer, donc centré horizontalement
  // mais justifié en bas, pas au centre des deux axes (round 1, dépassé).
  describe("la case est carrée, centre le visuel horizontalement et le justifie en bas", () => {
    it("le conteneur porte aspectRatio 1/1", () => {
      monter();
      const article = screen.getByTestId("article-case1");
      expect(article.style.aspectRatio).toBe("1 / 1");
    });

    it("le conteneur centre horizontalement et justifie en bas (pas placeItems: center)", () => {
      monter();
      const article = screen.getByTestId("article-case1");
      expect(article.style.justifyItems).toBe("center");
      expect(article.style.alignItems).toBe("end");
    });

    it("le bouton occupe toute la case et place son visuel comme le conteneur", () => {
      monter();
      const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
      expect(bouton.style.width).toBe("100%");
      expect(bouton.style.height).toBe("100%");
      expect(bouton.style.justifyItems).toBe("center");
      expect(bouton.style.alignItems).toBe("end");
    });

    // « L'objet doit toujours être visible en entier » (recette du
    // 2026-08-20). Le bouton portait `overflow: hidden` comme filet contre un
    // visuel trop grand ; rogner était le mauvais marché — l'auteur a vu ses
    // articles coupés sur son téléphone. Plus rien ne peut déborder (vignette
    // en `fill` + `contain` et sans inclinaison, engrenage plafonné à 100 %
    // de sa boîte), donc le filet est parti.
    it("la case ne rogne rien : pas d'overflow: hidden", () => {
      monter();
      const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
      expect(bouton.style.overflow).toBe("");
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
        <ArticleBazar
          cle="case1"
          visuel={<span />}
          libelle="lot"
          prix={1}
          jetons={10}
          onOuvrir={vi.fn()}
        />
      </QgEditProvider>,
    );
    const article = screen.getByTestId("article-case1");
    expect(article.style.left).toBe(`${qgPct(BAZAR_LAYOUT.objets.case1.left)}%`);
  });

  it("avec un override, l'article se déplace avec son cadre", () => {
    render(
      <QgEditProvider enabled>
        <Deplacer left={120} />
        <ArticleBazar
          cle="case1"
          visuel={<span />}
          libelle="lot"
          prix={1}
          jetons={10}
          onOuvrir={vi.fn()}
        />
      </QgEditProvider>,
    );
    fireEvent.click(screen.getByTestId("deplacer"));
    expect(screen.getByTestId("article-case1").style.left).toBe(`${qgPct(120)}%`);
  });
});
