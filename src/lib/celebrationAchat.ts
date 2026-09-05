import { audioManager } from "@/lib/audio/audioManager";
import { flyToTab } from "@/lib/flyAnimation";
import {
  TRACE_BAZARCOIN,
  VUE_BAZARCOIN,
  largeurBazarcoin,
} from "@/components/ui/BazarcoinIcon";

/**
 * Nombre maximum de pastilles dans la gerbe. Un flipper à 30 jetons ne doit
 * pas mitrailler l'écran : passé une poignée, l'œil ne compte plus, il ne voit
 * qu'une gerbe. Six suffisent à dire « ça sort de ta caisse ».
 */
export const JETONS_MAX = 6;

/** Durée du jaillissement, en ms — le temps que la dernière pastille s'efface. */
export const DUREE_JAILLISSEMENT_MS = 620;

/**
 * Temps mort entre les deux temps de la célébration, en ms.
 *
 * On PAIE, puis on REÇOIT : les deux joués ensemble ne racontaient qu'une
 * bousculade. 420 ms laissent la gerbe de jetons partir et se lire avant que
 * l'objet ne s'élance — c'est court, mais l'oreille sépare les deux sons, et
 * c'est elle qui compte ici.
 */
export const DELAI_OBJET_MS = 420;

/** Hauteur d'une pastille, en px. */
const TAILLE_JETON_PX = 18;

/** Le joueur a demandé au système de calmer les animations. */
function mouvementReduit(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * LES JETONS QUITTENT LA CAISSE.
 *
 * Au moment où le Bazar est payé, une gerbe de Bazarcoins s'échappe du
 * compteur de la caisse, retombe en éventail et s'estompe. Elle ne va nulle
 * part : ce qui doit se lire, c'est que l'argent SORT — l'objet, lui, a son
 * propre vol vers la Réserve (`flyToTab`).
 *
 * Du DOM pur, hors de React : les pastilles vivent moins d'une seconde, ne
 * portent aucun état, et doivent survivre à la fermeture de la fiche qui les a
 * déclenchées — un composant démonté emporterait ses nœuds avec lui.
 *
 * Silencieuse, et c'est voulu : la cloche de l'achat porte tout le son. Deux
 * voix pour un seul geste s'écrasent l'une l'autre.
 */
export function jaillirJetons(nombre: number): void {
  if (typeof document === "undefined") return;
  if (nombre <= 0 || mouvementReduit()) return;

  // Le compteur n'est pas à l'écran partout — un plein écran le masque. Sans
  // point de départ il n'y a rien à faire sortir, et surtout pas de quoi
  // casser l'achat qui vient de réussir.
  const compteur = document.querySelector(
    '[data-fly-target="jetons-header"]',
  ) as HTMLElement | null;
  if (!compteur) return;

  const depart = compteur.getBoundingClientRect();
  const combien = Math.min(nombre, JETONS_MAX);
  const largeur = largeurBazarcoin(TAILLE_JETON_PX);

  for (let i = 0; i < combien; i++) {
    const jeton = document.createElement("span");
    jeton.dataset.testid = "jeton-jailli";
    jeton.setAttribute("aria-hidden", "true");
    jeton.innerHTML =
      `<svg width="${largeur}" height="${TAILLE_JETON_PX}" viewBox="${VUE_BAZARCOIN}">` +
      `<path d="${TRACE_BAZARCOIN}" fill="none" stroke="var(--azur-400)" ` +
      `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

    Object.assign(jeton.style, {
      position: "fixed",
      left: `${depart.left + depart.width / 2 - largeur / 2}px`,
      top: `${depart.top + depart.height / 2 - TAILLE_JETON_PX / 2}px`,
      zIndex: "9998",
      // Elles passent PAR-DESSUS l'écran pendant une demi-seconde : si elles
      // attrapaient les taps, elles voleraient le premier geste du joueur
      // après son achat — celui qui referme la fiche.
      pointerEvents: "none",
      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))",
      transition:
        `transform ${DUREE_JAILLISSEMENT_MS}ms cubic-bezier(0.25, 0.7, 0.4, 1),` +
        ` opacity ${DUREE_JAILLISSEMENT_MS}ms ease-in`,
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(jeton);

    // L'éventail est DÉTERMINISTE : les pastilles se répartissent en arc, de
    // gauche à droite, plutôt que de tomber au hasard. Un tirage aléatoire
    // rendrait deux achats identiques visuellement différents, et surtout le
    // même achat impossible à revoir deux fois pareil au moment de le régler.
    const part = combien === 1 ? 0.5 : i / (combien - 1);
    const angle = -60 + part * 120;
    const distance = 46 + (i % 2) * 14;
    const dx = Math.sin((angle * Math.PI) / 180) * distance;
    // Une gerbe MONTE d'abord puis retombe : l'écart vertical est plus court
    // au centre de l'arc qu'à ses bords, comme un jet.
    const dy = 34 + Math.abs(Math.cos((angle * Math.PI) / 180)) * 26;

    // Deux images successives : sans ce report, le navigateur peint la
    // position d'arrivée du premier coup et la transition n'a rien à jouer.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        jeton.style.transform = `translate(${dx}px, ${dy}px) rotate(${angle * 0.6}deg) scale(0.75)`;
        jeton.style.opacity = "0";
      });
    });

    window.setTimeout(() => jeton.remove(), DUREE_JAILLISSEMENT_MS + 40);
  }
}

interface CelebrationAchat {
  /** Prix payé, en jetons : autant de pastilles dans la gerbe. */
  prix: number;
  /** Rect de la vignette au moment du tap — la fiche se referme aussitôt. */
  rectObjet: DOMRect | null;
  /** Image de l'objet acheté, ou `null` pour un lot de pièces. */
  imageUrl: string | null;
  /**
   * Second temps ou pas. Un paquet de cartes se paie mais ne se LIVRE pas
   * ici : ses cartes se révèlent dans la cérémonie qui suit et s'envolent
   * d'elles-mêmes au « Ranger » (2026-09-05). Défaut : `true`.
   */
  livraison?: boolean;
}

/**
 * LA CÉLÉBRATION D'UN ACHAT AU BAZAR, EN DEUX TEMPS.
 *
 * ① On PAIE : les jetons quittent la caisse sur un bruit de monnaie.
 * ② On REÇOIT : l'objet file vers la Réserve, et son arrivée sonne comme un
 *   ajout à la collection — le même petit arpège, à l'identique. Une version
 *   « épique » a été essayée puis écartée par l'auteur : le Bazar n'est pas
 *   un moment plus grand que les autres, c'est le même geste.
 *
 * Les deux temps joués ensemble ne racontaient qu'une bousculade ; séparés,
 * ils racontent un échange. C'est aussi l'ordre des choses : on ne reçoit pas
 * avant d'avoir payé.
 *
 * Tout est programmé ICI, en dehors de React : la fiche qui déclenche la
 * célébration se referme dans la foulée, et un composant démonté emporterait
 * ses minuteries avec lui.
 */
export function celebrerAchat({ prix, rectObjet, imageUrl, livraison = true }: CelebrationAchat): void {
  if (typeof window === "undefined") return;

  // ① Le paiement.
  void audioManager.playCash();
  jaillirJetons(prix);
  if (!livraison) return;

  // ② La livraison. En mouvement réduit, elle n'a rien à faire voler — mais
  // elle garde sa voix et sa place dans le temps : le joueur a demandé moins
  // d'animation, pas moins de jeu.
  if (mouvementReduit() || !rectObjet) {
    window.setTimeout(() => audioManager.playPickup(), DELAI_OBJET_MS);
    return;
  }

  window.setTimeout(() => {
    flyToTab({
      fromRect: rectObjet,
      imageUrl,
      // NU dès qu'il y a une image : les objets du catalogue sont détourés, et
      // le cadre du vol leur dessinait un grand carré de laiton autour
      // (refusé à la recette du 2026-08-26). Un lot de pièces, lui, n'a pas
      // d'image : sans cadre il ne resterait rien à voir, il garde donc son
      // jeton de laiton.
      sansCadre: imageUrl !== null,
      fallbackBg: "var(--brass-500)",
      borderColor: "var(--brass-700)",
      targetSelector: '[data-fly-target="/stockage"]',
    });
  }, DELAI_OBJET_MS);
}
