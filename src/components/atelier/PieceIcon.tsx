"use client";

import { useId } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { cheminEngrenage } from "@/lib/engrenage";
import type { CategorieObjet } from "@/types/game";

interface PieceIconProps {
  categorie: CategorieObjet;
  /**
   * Diamètre extérieur. Défaut 36.
   *
   * C'est une taille SOUHAITÉE, pas une promesse : la pièce ne dépasse jamais
   * la boîte qui la reçoit (cf. le plafond `max-width/height: 100%`
   * ci-dessous). Un nombre de pixels ne peut pas tenir dans une case dont la
   * largeur suit l'écran — celle de l'étal du Bazar, par exemple.
   */
  size?: number;
  /** Si fourni, badge quantité positionné en bas (chevauche le rebord). */
  count?: number;
}

/** Denture de la pièce. Dix dents : lisibles jusqu'à 18 px, sans peigne. */
const DENTS = 10;

/**
 * Épaisseur du trait de l'emblème, dans le repère de 24 des icônes lucide.
 * C'est d'elle que se déduit le relief — cf. `relief` plus bas.
 */
const TRAIT_EMBLEME = 2;

/**
 * Calculé UNE fois, au chargement du module. La géométrie ne dépend pas de la
 * taille à l'écran — le `viewBox` s'en charge — donc la recalculer à chaque
 * rendu ferait le même travail pour le même résultat, dix fois par écran dans
 * la barre de pièces de l'atelier.
 */
const CHEMIN = cheminEngrenage(DENTS);

/**
 * En dessous de cette taille, la pièce est frappée LISSE : sillon, stries et
 * champ creusé disparaissent. À 18 px (les boutons de l'atelier), un sillon
 * d'un demi-pixel et des stries de métal filé ne sont plus du détail mais du
 * bruit — ils salissent le dessin au lieu de le creuser.
 */
const SEUIL_DETAIL_PX = 24;

/**
 * UNE PIÈCE DE RÉPARATION, frappée comme une médaille.
 *
 * Elle a longtemps été un engrenage crème posé à plat, avec le logo du thème
 * imprimé au milieu — deux matières, deux couleurs, aucune épaisseur. C'est
 * maintenant une pièce de laiton en relief (demande de l'auteur, 2026-08-26,
 * référence à l'appui) : rebord biseauté, sillon gravé, champ creusé au métal
 * filé, emblème en haut relief.
 *
 * LE PRINCIPE, et il vaut pour toute la suite : UN SEUL MÉTAL. Rien n'est
 * distingué par sa couleur — ni le dessin, ni le fond, ni le rebord. C'est la
 * LUMIÈRE qui sépare, toujours venue d'en haut à gauche : ce qui monte prend
 * le clair sur sa crête et pose son ombre en bas à droite ; ce qui s'enfonce
 * fait l'inverse. Les sept teintes de laiton de la palette suffisent — aucune
 * couleur nouvelle n'a été inventée pour cette pièce.
 *
 * Tout est en FRACTION du diamètre. La pièce vit de 18 px dans un bouton de
 * l'atelier à 150 px dans la fiche du Bazar : un décalage d'un pixel qui
 * creuse à 36 px disparaît à 150 et hurle à 18.
 */
export function PieceIcon({ categorie, size = 36, count }: PieceIconProps) {
  const showCount = typeof count === "number";
  const detaille = size >= SEUIL_DETAIL_PX;
  const innerSize = Math.max(9, Math.round(size * (detaille ? 0.4 : 0.46)));
  const countSize = Math.max(10, Math.round(size * 0.38));
  // Le relief de l'emblème se mesure à l'ÉPAISSEUR DU TRAIT, pas au diamètre
  // de la pièce. Un emblème est un dessin au trait : décaler ses copies de plus
  // que la moitié du trait ne creuse rien, ça double la ligne — à 150 px, la
  // copie claire se lisait comme un contour blanc collé sur le laiton. Un quart
  // du trait suffit à faire une crête ; en deçà de 0,4 px les copies se
  // confondent et ne font plus que du flou.
  const epaisseurTrait = (innerSize * TRAIT_EMBLEME) / 24;
  const relief = Math.max(0.4, Math.round(epaisseurTrait * 0.3 * 10) / 10);

  // `useId` : deux pièces sur le même écran (la barre de l'atelier en montre
  // dix) ne peuvent pas partager les identifiants de leurs dégradés, sinon la
  // dernière montée les redéfinit pour toutes.
  const id = useId();
  const idCorps = `${id}-corps`;
  const idChanfrein = `${id}-chanfrein`;
  const idChamp = `${id}-champ`;
  const idCreux = `${id}-creux`;

  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        // « L'objet doit toujours être visible en entier » (recette du
        // 2026-08-20) : dans une case dont la largeur suit l'écran, une pièce
        // de 48 px déborderait sur un petit téléphone et se ferait rogner. Le
        // plafond la ramène à la taille de sa boîte au lieu de la laisser
        // sortir.
        maxWidth: "100%",
        maxHeight: "100%",
        // L'ombre de contact : la pièce repose sur quelque chose. Elle suit le
        // diamètre, comme le reste.
        filter: `drop-shadow(0 ${Math.max(1, size * 0.03)}px ${Math.max(1, size * 0.045)}px rgba(40,25,5,0.38))`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        // La taille en style l'emporte sur les attributs : le dessin suit donc
        // la boîte quand celle-ci a été rabotée par le plafond, au lieu d'en
        // sortir. Le `viewBox` préserve les proportions.
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          {/* Le corps, éclairé en haut à gauche : la crête du rebord prend le
              laiton le plus clair, le flanc opposé le plus sombre. */}
          <linearGradient id={idCorps} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brass-100)" />
            <stop offset="38%" stopColor="var(--brass-500)" />
            <stop offset="100%" stopColor="var(--brass-800)" />
          </linearGradient>
          {/* Le chanfrein : la MÊME denture réduite, en dégradé INVERSÉ. Deux
              pentes opposées qui se rencontrent, c'est une arête — et c'est
              tout ce qu'est un biseau. */}
          <linearGradient id={idChanfrein} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brass-700)" />
            <stop offset="55%" stopColor="var(--brass-500)" />
            <stop offset="100%" stopColor="var(--brass-300)" />
          </linearGradient>
          {/* Le champ, bombé vers la même lumière. */}
          <radialGradient id={idChamp} cx="34%" cy="28%" r="82%">
            <stop offset="0%" stopColor="var(--brass-300)" />
            <stop offset="52%" stopColor="var(--brass-600)" />
            <stop offset="100%" stopColor="var(--brass-800)" />
          </radialGradient>
          {/* Le creux : une ombre qui ne mord que le bord du champ. Elle le
              fait rentrer sous le rebord au lieu d'affleurer. */}
          <radialGradient id={idCreux} cx="50%" cy="50%" r="50%">
            <stop offset="62%" stopColor="rgba(79,61,20,0)" />
            <stop offset="100%" stopColor="rgba(79,61,20,0.55)" />
          </radialGradient>
        </defs>

        <path d={CHEMIN} fill={`url(#${idCorps})`} data-testid="piece-corps" />
        <path
          d={CHEMIN}
          fill={`url(#${idChanfrein})`}
          transform="translate(50 50) scale(0.88) translate(-50 -50)"
        />

        {detaille && (
          <>
            {/* Le sillon gravé : un trait sombre DOUBLÉ d'un trait clair juste
                en dessous. Une gravure, c'est une ombre et une lumière côte à
                côte — un trait seul ne serait qu'un cercle dessiné. */}
            <circle
              cx="50"
              cy="50"
              r="33.5"
              fill="none"
              stroke="var(--brass-900)"
              strokeWidth="2"
              opacity="0.5"
              data-testid="piece-sillon"
            />
            <circle
              cx="50"
              cy="50"
              r="31.6"
              fill="none"
              stroke="var(--brass-100)"
              strokeWidth="1.2"
              opacity="0.45"
            />
          </>
        )}

        <circle
          cx="50"
          cy="50"
          r={detaille ? 30 : 34}
          fill={`url(#${idChamp})`}
          data-testid="piece-champ"
        />
        <circle cx="50" cy="50" r={detaille ? 30 : 34} fill={`url(#${idCreux})`} />
      </svg>

      {detaille && (
        // LE MÉTAL FILÉ du champ : les stries concentriques d'une pièce tournée
        // au tour. Un dégradé conique répété coûte une passe de peinture et
        // rien de plus — pas de texture à charger, pas de filtre à calculer.
        // `overlay` pour qu'elles modulent le laiton en place plutôt que d'y
        // poser un voile gris.
        <span
          data-testid="piece-stries"
          style={{
            position: "absolute",
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background:
              "repeating-conic-gradient(from 0deg, rgba(255,243,213,0.18) 0deg 0.8deg, rgba(79,61,20,0.14) 0.8deg 1.6deg)",
            opacity: 0.22,
            mixBlendMode: "overlay",
            pointerEvents: "none",
          }}
        />
      )}

      {/* L'EMBLÈME EN HAUT RELIEF. Le même trait, frappé trois fois : son ombre
          portée en bas à droite, sa crête éclairée en haut à gauche, et le
          trait lui-même par-dessus. Le dessin n'est plus posé SUR la pièce, il
          SORT de la matière — ce que ne peut faire aucune couleur. */}
      <span
        data-testid="piece-embleme"
        style={{
          position: "absolute",
          display: "grid",
          placeItems: "center",
          lineHeight: 0,
        }}
      >
        <span
          data-testid="piece-embleme-ombre"
          style={{
            position: "absolute",
            transform: `translate(${relief * 0.7}px, ${relief}px)`,
            lineHeight: 0,
          }}
        >
          <CategorieIcon
            categorie={categorie}
            size={innerSize}
            strokeWidth={TRAIT_EMBLEME}
            color="var(--brass-900)"
          />
        </span>
        <span
          style={{
            position: "absolute",
            transform: `translate(${-relief * 0.6}px, ${-relief}px)`,
            lineHeight: 0,
          }}
        >
          <CategorieIcon
            categorie={categorie}
            size={innerSize}
            strokeWidth={TRAIT_EMBLEME}
            color="var(--brass-100)"
          />
        </span>
        <CategorieIcon
          categorie={categorie}
          size={innerSize}
          strokeWidth={TRAIT_EMBLEME}
          // Le laiton CLAIR, et non le médian : le champ est frappé dans les
          // teintes sombres de la palette (600 → 800), et un emblème à
          // `brass-500` s'y noyait — il fallait le lire d'un coup d'œil dans un
          // bouton de 18 px. Il reste du même métal ; c'est la face polie d'une
          // frappe, celle qui a pris la lumière.
          color="var(--brass-300)"
        />
      </span>

      {showCount && (
        <span
          style={{
            // DANS L'AXE, et posé plus bas que la frappe (réglages de
            // l'auteur, 2026-08-26). Il a fait un détour par la droite : au
            // centre il mangeait le pied de l'emblème, mais décalé il
            // déséquilibrait la pièce. La réponse n'était pas de le pousser de
            // côté, c'était de le faire DESCENDRE — il chevauche maintenant le
            // rebord bas, là où une étiquette se pose vraiment.
            //
            // Le décalage suit le DIAMÈTRE : calé à 3 px, il remonterait sur le
            // champ d'une pièce de 150 px et pendrait sous une de 18.
            position: "absolute",
            left: "50%",
            bottom: -Math.max(3, Math.round(size * 0.1)),
            transform: "translateX(-50%)",
            fontFamily: "var(--font-display)",
            fontSize: countSize,
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--forest-800)",
            background: "var(--paper-100)",
            padding: "0 4px",
            borderRadius: 3,
            border: "1px solid var(--brass-700)",
            whiteSpace: "nowrap",
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
