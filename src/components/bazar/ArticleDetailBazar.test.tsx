// @vitest-environment jsdom
/**
 * La fiche d'un article du Bazar. Demandée à la recette du 2026-08-20 : taper
 * un article sur l'étagère l'achetait sur-le-champ, un doigt mal posé coûtait
 * une semaine de jetons sans rien demander.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ArticleDetailBazar, type ArticleDetail } from "./ArticleDetailBazar";
import { ETAT_ARTICLE_BAZAR } from "@/lib/bazar/achat";
import { getRarityColors } from "@/lib/rarityColors";
import { ECLAT_PRISTIN } from "@/components/ui/ItemSticker";
import { etoileCount } from "@/lib/etat";
import { audioManager } from "@/lib/audio/audioManager";
import { DELAI_OBJET_MS, JETONS_MAX } from "@/lib/celebrationAchat";

afterEach(cleanup);

const VITRINE: ArticleDetail = {
  genre: "objet",
  templateId: "jx.jeu_magnatimmo_annees_80",
  categorie: "Jeux & Loisirs",
  libelle: "Jeu Magnatimmo années 80",
  rarete: "rare",
  prix: 8,
};

const LOT: ArticleDetail = {
  genre: "pieces",
  categorie: "Musique",
  quantite: 5,
  libelle: "5 pièces · Musique",
  prix: 3,
};

const PAQUET: ArticleDetail = {
  genre: "paquet",
  album: "classeur",
  libelle: "Paquet de 3 cartes",
  prix: 5,
};

function monter(
  article: ArticleDetail | null = VITRINE,
  jetons = 25,
  open = true,
  resultat: { ok: boolean; raison?: string } = { ok: true },
) {
  const onAcheter = vi.fn().mockReturnValue(resultat);
  const onClose = vi.fn();
  const utils = render(
    <ArticleDetailBazar
      article={article}
      open={open}
      jetons={jetons}
      onAcheter={onAcheter}
      onClose={onClose}
    />,
  );
  return { onAcheter, onClose, ...utils };
}

describe("ArticleDetailBazar", () => {
  it("fermée, elle ne rend rien", () => {
    const { container } = monter(VITRINE, 25, false);
    expect(container.firstChild).toBeNull();
  });

  it("sans article, elle ne rend rien même ouverte", () => {
    const { container } = monter(null);
    expect(container.firstChild).toBeNull();
  });

  it("l'objet de la vitrine : sa vignette EN GRAND, son nom, son prix", () => {
    monter();
    expect(screen.getByText("Jeu Magnatimmo années 80")).toBeTruthy();
    // Le prix ne s'écrit plus sur une ligne à part : il est DANS le bouton.
    expect(screen.getByRole("button", { name: "Acheter pour 8 Bazarcoins" })).toBeTruthy();
    const img = screen.getByRole("dialog").querySelector("img") as HTMLImageElement;
    // Plein format, PAS la vignette 384 px : ici l'objet occupe 75 vw.
    expect(img.getAttribute("src")).toBe(
      "/items/jx.jeu_magnatimmo_annees_80.webp",
    );
    // La découpe die-cut, comme sur l'étagère et dans le reste du jeu.
    expect(img.style.filter).toContain("#fdfaf2");
  });

  it("un lot de pièces : son engrenage EN GRAND, son libellé, son prix", () => {
    monter(LOT);
    expect(screen.getByText("5 pièces · Musique")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Acheter pour 3 Bazarcoins" })).toBeTruthy();
    // Aucun visuel d'objet : un lot n'est pas une pièce du catalogue.
    expect(screen.getByRole("dialog").querySelector("img")).toBeNull();
    // Le badge de quantité de l'engrenage.
    expect(screen.getByText("5")).toBeTruthy();
  });

  // ── Le classeur/album et leurs paquets/pochettes (2026-08-30) ───────────
  it("une fiche de paquet affiche sa description et son bouton d'achat", () => {
    monter(PAQUET);
    expect(screen.getByText("Paquet de 3 cartes")).toBeTruthy();
    expect(
      screen.getByText(
        "3 pièces au hasard. Les doublons se recyclent en pièces de réparation.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Acheter pour 5 Bazarcoins" })).toBeTruthy();
    // Le paquet de cartes a son visuel Brocomon (2026-09-04), pas d'étoiles.
    expect(screen.getByRole("dialog").querySelector("img")?.getAttribute("src")).toBe("/cartes/paquet.webp");
    expect(screen.queryByTestId("etoiles-fiche")).toBeNull();
  });

  // « Lorsque l'on clique sur le paquet, il doit s'afficher plus gros »
  // (2026-09-05) : le booster prend une boîte plus haute que celle des
  // objets, et la remplit.
  it("le paquet de cartes s'affiche en grand dans la fiche", () => {
    monter(PAQUET);
    const img = screen.getByRole("dialog").querySelector("img") as HTMLImageElement;
    expect(img.style.height).toBe("100%");
    const boite = img.parentElement as HTMLElement;
    expect(boite.style.height).toBe("42vh");
    expect(boite.style.maxHeight).toBe("330px");
  });

  it("une fiche de pochette de timbres montre l'enveloppe, en grand aussi", () => {
    monter({ genre: "paquet", album: "timbres", libelle: "Pochette de 3 timbres", prix: 5 });
    const img = screen.getByRole("dialog").querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/timbres/pochette.webp");
    expect(img.style.height).toBe("100%");
    expect((img.parentElement as HTMLElement).style.maxHeight).toBe("330px");
  });

  // ── LA FICHE FLOTTE (refonte du 2026-08-26) ─────────────────────────────
  // Le nom, le prix et le bouton vivaient dans un cartouche de papier crème
  // posé en bas de l'écran — un formulaire devant une vitrine. Les trois
  // éléments sont maintenant autonomes, empilés sous l'objet sur le voile
  // sombre. jsdom n'a pas de moteur de rendu : ce qui s'atteste ici, c'est
  // l'ORDRE dans le document et les styles en ligne.
  describe("les éléments flottent sous l'objet", () => {
    function suit(avant: Element, apres: Element): boolean {
      return Boolean(
        avant.compareDocumentPosition(apres) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }

    it("l'ordre est objet, étoiles, plaque du nom, bouton", () => {
      monter();
      const visuel = screen.getByTestId("fiche-visuel");
      const etoiles = screen.getByTestId("etoiles-fiche");
      const plaque = screen.getByTestId("fiche-plaque");
      const bouton = screen.getByRole("button", { name: /^Acheter pour/ });
      expect(suit(visuel, etoiles)).toBe(true);
      expect(suit(etoiles, plaque)).toBe(true);
      expect(suit(plaque, bouton)).toBe(true);
    });

    it("le cartouche de papier a disparu", () => {
      monter();
      const papier = [...screen.getByRole("dialog").querySelectorAll("div")].find(
        (e) => (e as HTMLElement).style.background === "var(--paper-100)",
      );
      expect(papier).toBeUndefined();
    });

    // La plaque du Bazar : laiton en dégradé et PANS COUPÉS — les quatre coins
    // biseautés, signature art déco, obtenus au `clip-path` pour que le biseau
    // tienne quelle que soit la hauteur (un nom de catalogue peut passer à la
    // ligne).
    it("le nom est porté par une plaque de laiton à pans coupés", () => {
      monter();
      const plaque = screen.getByTestId("fiche-plaque");
      expect(plaque.textContent).toContain("Jeu Magnatimmo années 80");
      expect(plaque.style.clipPath).toContain("polygon");
      expect(plaque.style.background).toContain("brass");
    });

    // Le refus du jeu (stockage plein, article déjà parti) survit, lui : sans
    // lui un vrai refus serait muet. Mais il quitte le papier crème pour le
    // fond sombre, et sa teinte doit suivre.
    it("le refus se lit sur le fond sombre", () => {
      monter(VITRINE, 99, true, { ok: false, raison: "Stockage plein" });
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      const message = screen.getByRole("status") as HTMLElement;
      expect(message.textContent).toBe("Stockage plein");
      expect(message.style.color).toBe("var(--brass-300)");
    });
  });

  // ── LA CÉLÉBRATION DE L'ACHAT (2026-08-26) ──────────────────────────────
  // Payer doit se voir et s'entendre : les jetons quittent la caisse, l'objet
  // file vers la Réserve, une cloche dit que c'est fait. Les trois partent
  // ensemble, et RIEN ne part si le jeu refuse.
  describe("la célébration de l'achat", () => {
    /** Les cibles nommées que la célébration cherche dans la page. */
    function poserCibles() {
      for (const cible of ["jetons-header", "/stockage"]) {
        const el = document.createElement("span");
        el.dataset.flyTarget = cible;
        document.body.appendChild(el);
      }
    }
    const jetonsEnVol = () =>
      document.querySelectorAll('[data-testid="jeton-jailli"]');
    /** Le clone que `flyToTab` lâche par-dessus la page. */
    const objetEnVol = () =>
      [...document.body.querySelectorAll("div")].filter(
        (e) => e.style.position === "fixed" && e.style.zIndex === "9999",
      );

    beforeEach(() => {
      poserCibles();
      vi.useFakeTimers();
      vi.spyOn(audioManager, "playCash").mockResolvedValue(undefined);
      vi.spyOn(audioManager, "playPickup").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      document.body.innerHTML = "";
    });

    it("un achat réussi fait sonner la monnaie", () => {
      monter();
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      expect(audioManager.playCash).toHaveBeenCalledTimes(1);
    });

    it("les jetons payés quittent la caisse, plafonnés à la gerbe", () => {
      monter();
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      // L'article de la vitrine coûte 8 jetons ; la gerbe en montre six.
      expect(jetonsEnVol()).toHaveLength(JETONS_MAX);
    });

    // Second temps : l'objet ne part qu'APRÈS le paiement (cf.
    // `DELAI_OBJET_MS`). Au moment du tap, rien ne vole encore.
    it("l'objet s'envole vers la Réserve, dans un second temps", () => {
      monter();
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      expect(objetEnVol()).toHaveLength(0);
      vi.advanceTimersByTime(DELAI_OBJET_MS + 10);
      expect(objetEnVol()).toHaveLength(1);
    });

    // Un paquet de cartes n'a pas de livraison (2026-09-05) : ses cartes se
    // révèlent dans la cérémonie qui suit et s'envolent au « Ranger ».
    it("un paquet paie, mais rien ne vole vers la Réserve et rien ne sonne l'arrivée", () => {
      monter(PAQUET);
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      expect(audioManager.playCash).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(DELAI_OBJET_MS + 2000);
      expect(objetEnVol()).toHaveLength(0);
      expect(audioManager.playPickup).not.toHaveBeenCalled();
    });

    /**
     * Le refus du jeu arrive APRÈS le tap : stockage plein, article déjà parti.
     * Rien ne doit s'envoler — la caisse n'a rien lâché, et une fête sur un
     * échec est pire qu'un silence.
     */
    it("un achat refusé ne fait ni bruit ni gerbe", () => {
      monter(VITRINE, 99, true, { ok: false, raison: "Stockage plein" });
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      expect(audioManager.playCash).not.toHaveBeenCalled();
      expect(jetonsEnVol()).toHaveLength(0);
      vi.advanceTimersByTime(DELAI_OBJET_MS + 10);
      expect(objetEnVol()).toHaveLength(0);
      expect(audioManager.playPickup).not.toHaveBeenCalled();
    });

    it("un bouton éteint ne célèbre rien non plus", () => {
      monter(VITRINE, 3);
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      expect(audioManager.playCash).not.toHaveBeenCalled();
      expect(jetonsEnVol()).toHaveLength(0);
    });
  });

  it("template disparu du catalogue : la fiche reste, sans visuel, et achète", () => {
    const { onAcheter } = monter({
      genre: "objet",
      templateId: "zz.template_disparu",
      categorie: null,
      rarete: null,
      libelle: "zz.template_disparu",
      prix: 8,
    });
    expect(screen.getByRole("dialog").querySelector("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  // ── L'état suit l'objet jusque dans la fiche (2026-08-26) ───────────────
  // Le prix a quitté l'étagère pour venir ici ; l'état, lui, fait le chemin
  // inverse et doit se retrouver DANS LES DEUX. Sans ça il disparaîtrait au
  // moment précis où le joueur regarde l'objet en grand pour se décider.
  it("la fiche d'un objet montre les étoiles de son état", () => {
    monter();
    const rangee = screen.getByTestId("etoiles-fiche");
    const etoiles = [...rangee.querySelectorAll("svg")];
    expect(etoiles).toHaveLength(3);
    const remplies = etoiles.filter(
      (e) => e.getAttribute("fill") === getRarityColors("rare").outer,
    );
    expect(remplies).toHaveLength(etoileCount(ETAT_ARTICLE_BAZAR));
  });

  it("un lot de pièces n'a pas d'état : pas d'étoiles dans sa fiche", () => {
    monter(LOT);
    expect(screen.queryByTestId("etoiles-fiche")).toBeNull();
  });

  // Même règle que sur l'étagère : sans template, on ne sait plus rien de
  // l'objet — ni sa rareté ni ce qu'on pourrait promettre. Aucune étoile.
  it("template disparu : aucune étoile inventée", () => {
    monter({ ...VITRINE, categorie: null, rarete: null });
    expect(screen.queryByTestId("etoiles-fiche")).toBeNull();
  });

  // ── Le prix passe DANS le bouton (demande du 2026-08-26) ────────────────
  // La carte annonçait « Prix · 12 Bazarcoins » sur une ligne, puis proposait
  // un bouton « Acheter » muet sur le montant. Deux endroits pour une seule
  // idée : le bouton dit maintenant ce qu'il fait ET ce qu'il coûte.
  it("le bouton dit ce qu'il achète et pour combien", () => {
    monter();
    const bouton = screen.getByRole("button", { name: "Acheter pour 8 Bazarcoins" });
    // À l'œil, le chiffre et la pièce — le mot ne tient pas dans un bouton.
    expect(bouton.textContent).toContain("8");
    expect(bouton.querySelector("svg")).toBeTruthy();
  });

  it("le singulier passe dans le bouton", () => {
    monter({ ...VITRINE, prix: 1 });
    expect(screen.getByRole("button", { name: "Acheter pour 1 Bazarcoin" })).toBeTruthy();
  });

  it("la fiche n'écrit plus le prix sur une ligne à part", () => {
    monter();
    expect(screen.queryByText("Prix")).toBeNull();
  });

  // Hors de portée, le bouton garde son libellé : cacher le prix au moment où
  // il manque serait précisément cacher la seule chose utile.
  it("hors de portée : le bouton dit toujours le prix", () => {
    monter(VITRINE, 2);
    expect(screen.getByRole("button", { name: "Acheter pour 8 Bazarcoins" })).toBeTruthy();
  });

  // L'ÉCLAT DU PRISTIN, comme dans la collection : le Bazar ne vend que des
  // pièces impeccables, et elles doivent rayonner ici aussi.
  it("l'objet de la fiche porte le halo du pristin", () => {
    const { container } = monter();
    const img = container.querySelector("img") as HTMLElement;
    expect(img.style.filter).toContain(ECLAT_PRISTIN);
  });

  it("bourse suffisante : le bouton est allumé", () => {
    monter(VITRINE, 25);
    const bouton = screen.getByRole("button", { name: /^Acheter pour/ });
    expect(bouton.style.background).toBe("var(--forest-800)");
    expect(bouton.getAttribute("aria-disabled")).toBe("false");
  });

  it("bourse suffisante : le bouton achète et referme la fiche", () => {
    const { onAcheter, onClose } = monter(VITRINE, 25);
    fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
    expect(onAcheter).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Le bouton n'est JAMAIS `disabled` nativement : un bouton désactivé ne
  // dispatche aucun clic, donc il ne peut rien expliquer — pas même le
  // chiffre que le joueur a besoin de lire. Règle acquise sur l'étagère à la
  // revue du 2026-08-20 (round 1), reprise ici avec l'achat.
  describe("bourse insuffisante", () => {
    it("le bouton n'est pas `disabled`, mais porte aria-disabled", () => {
      monter(VITRINE, 3);
      const bouton = screen.getByRole("button", { name: /^Acheter pour/ });
      expect(bouton.hasAttribute("disabled")).toBe(false);
      expect(bouton.getAttribute("aria-disabled")).toBe("true");
    });

    it("le bouton reste focusable au clavier", () => {
      monter(VITRINE, 3);
      const bouton = screen.getByRole("button", { name: /^Acheter pour/ });
      bouton.focus();
      expect(document.activeElement).toBe(bouton);
    });

    // Le « il vous manque N Bazarcoins » a été retiré le 2026-08-26 à la
    // demande de l'auteur : le bouton ÉTEINT porte seul le refus, et la fiche
    // ne s'encombre plus d'une phrase sous le bouton. Le tap ne fait donc
    // rien — mais il ne doit surtout pas acheter ni refermer.
    it("taper n'achète pas, ne ferme pas, et ne dit rien", () => {
      const { onAcheter, onClose } = monter(VITRINE, 3);
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      expect(onAcheter).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.queryByRole("status")).toBeNull();
    });

    // Même règle que sur l'étiquette de l'étagère, et elle a changé le
    // 2026-08-20 : le prix n'est plus BARRÉ, il s'ÉTEINT. La rature rayait un
    // chiffre qu'on cherche justement à lire.
    // Le prix a rejoint le bouton (2026-08-26) : c'est donc le BOUTON qui
    // s'éteint, d'un bloc, quand la bourse ne suit pas. Éteint, jamais barré —
    // la rature raye un chiffre qu'on cherche justement à lire.
    it("le bouton s'éteint, et le prix qu'il porte n'est pas barré", () => {
      const bouton = (monter(VITRINE, 3),
        screen.getByRole("button", { name: /^Acheter pour/ }) as HTMLElement);
      expect(bouton.style.background).toBe("var(--paper-200)");
      expect(bouton.style.color).toBe("var(--ink-300)");
      expect(bouton.style.textDecoration).not.toBe("line-through");
    });




  });

  // ── Refus venu du JEU (pas de la bourse) ─────────────────────────────────
  // Un refus est précisément le moment où le joueur a besoin de RESTER pour
  // lire pourquoi : refermer la fiche cacherait la réponse et le renverrait
  // taper l'étagère sans rien savoir. Le canal est unique — la fiche —, le
  // toast de la page ayant été retiré : transitoire, il partait tout seul.
  describe("achat refusé par le jeu", () => {
    it("la fiche RESTE ouverte et affiche la raison", () => {
      const { onClose } = monter(VITRINE, 99, true, {
        ok: false,
        raison: "Stockage plein",
      });
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      expect(onClose).not.toHaveBeenCalled();
      // Toujours montée, et la raison est lisible.
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(screen.getByRole("status").textContent).toBe("Stockage plein");
    });

    it("un refus SANS raison n'est jamais muet", () => {
      monter(VITRINE, 99, true, { ok: false });
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      expect(screen.getByRole("status").textContent).toBe("Achat impossible.");
    });


    it("changer d'article efface la raison", () => {
      const { rerender } = monter(VITRINE, 99, true, {
        ok: false,
        raison: "Stockage plein",
      });
      fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
      expect(screen.queryByRole("status")).toBeTruthy();
      rerender(
        <ArticleDetailBazar
          article={LOT}
          open
          jetons={99}
          onAcheter={vi.fn().mockReturnValue({ ok: true })}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  describe("fermeture", () => {
    it("taper le voile referme", () => {
      const { onClose } = monter();
      fireEvent.click(screen.getByRole("dialog"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("taper DANS la carte ne referme pas", () => {
      const { onClose } = monter();
      fireEvent.click(screen.getByText("Jeu Magnatimmo années 80"));
      expect(onClose).not.toHaveBeenCalled();
    });

    // Le voile se tape au doigt ; au clavier, rien ne l'atteint. Même idiome
    // que les sheets du QG.
    it("Échap referme", () => {
      const { onClose } = monter();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Échap ne fait rien quand la fiche est fermée", () => {
      const { onClose } = monter(VITRINE, 25, false);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
