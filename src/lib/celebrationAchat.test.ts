// @vitest-environment jsdom
/**
 * LE JAILLISSEMENT DES JETONS — ce qu'on voit quand la caisse paie.
 *
 * jsdom n'a ni moteur de rendu ni horloge : ce qui s'atteste ici, c'est le
 * nombre de pastilles créées, leur innocuité (elles ne doivent voler aucun
 * tap), et surtout leur DISPARITION — une célébration qui laisse ses éléments
 * derrière elle finit par tapisser le document.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELAI_OBJET_MS,
  DUREE_JAILLISSEMENT_MS,
  JETONS_MAX,
  celebrerAchat,
  jaillirJetons,
} from "./celebrationAchat";
import { audioManager } from "@/lib/audio/audioManager";

const pastilles = () => document.querySelectorAll('[data-testid="jeton-jailli"]');

beforeEach(() => {
  document.body.innerHTML = '<span data-fly-target="jetons-header"></span>';
});

afterEach(() => {
  // Les espions sont posés sur le singleton `audioManager` : sans remise à
  // zéro, `vi.spyOn` rend le MÊME espion au test suivant et ses appels
  // s'additionnent d'un test à l'autre.
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
  Reflect.deleteProperty(window, "matchMedia");
});

/** Le réglage système « mouvement réduit », que jsdom ne simule pas seul. */
function mouvementReduit(reduit: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: reduit, addEventListener() {}, removeEventListener() {} }),
  });
}

describe("jaillirJetons", () => {
  it("jaillit une pastille par jeton payé", () => {
    jaillirJetons(3);
    expect(pastilles()).toHaveLength(3);
  });

  // Un flipper à 30 jetons ne doit pas mitrailler l'écran : passé une poignée,
  // l'œil ne compte plus, il ne voit qu'une gerbe.
  it("plafonne la gerbe, si cher que soit l'article", () => {
    jaillirJetons(30);
    expect(pastilles()).toHaveLength(JETONS_MAX);
  });

  it("ne jaillit rien pour un achat gratuit", () => {
    jaillirJetons(0);
    expect(pastilles()).toHaveLength(0);
  });

  // Le compteur n'est pas à l'écran partout (un plein écran le masque) : sans
  // point de départ, il n'y a rien à faire sortir — mais surtout, pas de quoi
  // planter l'achat qui vient de réussir.
  it("ne jaillit rien, et ne casse rien, quand le compteur est absent", () => {
    document.body.innerHTML = "";
    expect(() => jaillirJetons(3)).not.toThrow();
    expect(pastilles()).toHaveLength(0);
  });

  /**
   * Les pastilles passent PAR-DESSUS l'écran pendant une demi-seconde. Si
   * elles attrapaient les taps, elles voleraient le premier geste du joueur
   * juste après son achat — celui qui referme la fiche.
   */
  it("les pastilles n'attrapent aucun tap", () => {
    jaillirJetons(2);
    for (const p of pastilles()) {
      const style = (p as HTMLElement).style;
      expect(style.pointerEvents).toBe("none");
      expect(style.position).toBe("fixed");
    }
  });

  it("ne laisse rien derrière elle", () => {
    vi.useFakeTimers();
    jaillirJetons(4);
    expect(pastilles()).toHaveLength(4);
    vi.advanceTimersByTime(DUREE_JAILLISSEMENT_MS + 100);
    expect(pastilles()).toHaveLength(0);
  });

  /**
   * Mouvement réduit : le réglage système vaut aussi pour ce qui est animé en
   * JavaScript. Les feuilles de style du jeu le respectent déjà ; une
   * animation pilotée à la main y échapperait sans ce garde.
   */
  it("mouvement réduit : rien ne jaillit", () => {
    mouvementReduit(true);
    jaillirJetons(4);
    expect(pastilles()).toHaveLength(0);
  });

  it("mouvement normal : la gerbe part", () => {
    mouvementReduit(false);
    jaillirJetons(4);
    expect(pastilles()).toHaveLength(4);
  });
});

/**
 * DEUX TEMPS, et c'est tout le sujet (demande de l'auteur, 2026-08-26).
 *
 * D'abord on PAIE : les jetons quittent la caisse sur un bruit de monnaie.
 * Ensuite seulement on REÇOIT : l'objet part vers la Réserve, et son arrivée
 * sonne la fanfare. Les deux temps joués ensemble ne racontaient qu'une chose
 * confuse ; séparés, ils racontent un échange.
 */
describe("celebrerAchat", () => {
  const rect = { left: 40, top: 120, width: 200, height: 200 } as DOMRect;

  function cibles() {
    for (const nom of ["jetons-header", "/stockage"]) {
      const el = document.createElement("span");
      el.dataset.flyTarget = nom;
      document.body.appendChild(el);
    }
  }
  const objetEnVol = () =>
    [...document.body.querySelectorAll("div")].filter(
      (e) => e.style.position === "fixed" && e.style.zIndex === "9999",
    );

  beforeEach(() => {
    document.body.innerHTML = "";
    cibles();
    vi.useFakeTimers();
    vi.spyOn(audioManager, "playCash").mockResolvedValue(undefined);
    vi.spyOn(audioManager, "playPickup").mockImplementation(() => {});
  });

  it("premier temps : la monnaie sort, et rien d'autre ne bouge encore", () => {
    celebrerAchat({ prix: 8, rectObjet: rect, imageUrl: null });
    expect(audioManager.playCash).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('[data-testid="jeton-jailli"]')).toHaveLength(JETONS_MAX);
    expect(objetEnVol()).toHaveLength(0);
    expect(audioManager.playPickup).not.toHaveBeenCalled();
  });

  it("second temps : l'objet part, et sa fanfare attend son arrivée", () => {
    celebrerAchat({ prix: 8, rectObjet: rect, imageUrl: null });
    vi.advanceTimersByTime(DELAI_OBJET_MS + 10);
    expect(objetEnVol()).toHaveLength(1);
    // Il vole encore : le son accompagne l'ARRIVÉE — c'est celui de l'ajout à
    // la collection, à l'identique, qui sonne quand l'objet touche l'onglet.
    expect(audioManager.playPickup).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DUREE_JAILLISSEMENT_MS + 200);
    expect(audioManager.playPickup).toHaveBeenCalledTimes(1);
  });

  /**
   * L'OBJET VOLE NU. Le clone porte d'ordinaire un fond, un filet et une ombre
   * — c'est ce qui fait exister un vol de VIGNETTE. Mais les objets du
   * catalogue sont détourés : le cadre dessinait un grand carré de laiton
   * autour d'eux, que l'auteur a refusé à la recette du 2026-08-26. Ce qui
   * doit voler, c'est l'objet, pas sa boîte.
   */
  it("l'objet vole sans cadre : ni fond, ni filet, ni ombre", () => {
    celebrerAchat({ prix: 8, rectObjet: rect, imageUrl: "/items/truc.webp" });
    vi.advanceTimersByTime(DELAI_OBJET_MS + 10);
    const clone = objetEnVol()[0];
    expect(clone.style.background).toBe("");
    expect(clone.style.border).toBe("");
    expect(clone.style.boxShadow).toBe("");
    // `contain` et non `cover` : sans cadre à remplir, une image rognée
    // perdrait les bords de l'objet.
    expect(clone.style.backgroundSize).toBe("contain");
  });

  /**
   * Un PAQUET de cartes n'a pas de livraison : ses cartes se révèlent dans
   * la cérémonie qui suit et s'envolent d'elles-mêmes au « Ranger » — le
   * carré qui volait vers la Réserve dès l'achat racontait une arrivée qui
   * n'avait pas encore eu lieu (retour 2026-09-05).
   */
  it("sans livraison : la monnaie sort, mais rien ne vole et rien ne sonne l'arrivée", () => {
    celebrerAchat({ prix: 5, rectObjet: rect, imageUrl: null, livraison: false });
    expect(audioManager.playCash).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(DELAI_OBJET_MS + DUREE_JAILLISSEMENT_MS + 500);
    expect(objetEnVol()).toHaveLength(0);
    expect(audioManager.playPickup).not.toHaveBeenCalled();
  });

  it("sans objet à faire voler, le paiement se joue quand même", () => {
    celebrerAchat({ prix: 3, rectObjet: null, imageUrl: null });
    vi.advanceTimersByTime(2000);
    expect(audioManager.playCash).toHaveBeenCalledTimes(1);
    expect(objetEnVol()).toHaveLength(0);
  });

  /**
   * Mouvement réduit : le joueur a demandé moins d'animation, pas moins de
   * jeu. Les deux temps restent AUDIBLES et gardent leur ordre — c'est le
   * mouvement qui disparaît, pas le récit.
   */
  it("mouvement réduit : plus rien ne vole, les deux temps s'entendent encore", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    });
    celebrerAchat({ prix: 8, rectObjet: rect, imageUrl: null });
    expect(audioManager.playCash).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('[data-testid="jeton-jailli"]')).toHaveLength(0);
    vi.advanceTimersByTime(DELAI_OBJET_MS + 10);
    expect(objetEnVol()).toHaveLength(0);
    expect(audioManager.playPickup).toHaveBeenCalledTimes(1);
  });
});
