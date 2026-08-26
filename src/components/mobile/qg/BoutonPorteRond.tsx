"use client";

import { useId, type CSSProperties } from "react";
import { Lock } from "lucide-react";

interface BoutonPorteRondProps {
  libelle: string;
  /** Illustration carrée, rognée en cercle par le médaillon. */
  image: string;
  onClick: () => void;
  disabled?: boolean;
  /** Le lieu n'a pas encore ouvert : médaillon éteint et cadenas posé dessus. */
  cadenasse?: boolean;
  /** « J-15 », affiché sous le cadenas. Ignoré hors `cadenasse`. */
  compteARebours?: string;
  /** Diamètre en px. Deux médaillons côte à côte tiennent sur un téléphone. */
  diametre?: number;
  /**
   * Classe du tutoriel (halo pulsant, main pointeuse). Elle est posée sur une
   * ENVELOPPE et non sur le bouton : la main est un `::after` situé au-dessus
   * de sa cible, hors de sa boîte, et le bouton rogne.
   */
  className?: string;
}

/**
 * Le médaillon d'une porte : un rond de laiton, une illustration dedans, et le
 * mot posé sur la courbe intérieure basse.
 *
 * GÉOMÉTRIE — tout est dessiné dans un repère de 100 × 100 et mis à l'échelle
 * par le `viewBox`, pour que le médaillon change de taille sans qu'aucun
 * nombre ne se recalcule : l'arc, le ruban et le corps du mot gardent leurs
 * proportions à 100 px comme à 200.
 *
 * L'ARC va de 145° à 35° en passant par le bas (90°, l'angle croissant dans le
 * sens horaire puisque l'axe des y descend). Il est donc parcouru de la
 * gauche vers la droite, ce qui pose les lettres debout et lisibles : la
 * normale gauche du chemin pointe vers le haut de l'écran. Parcouru dans
 * l'autre sens, le mot s'écrirait la tête en bas.
 *
 * LE RUBAN est le MÊME chemin, tracé en épais sous le texte. Un seul `d` pour
 * les deux : deux chemins jumeaux finiraient par se désaligner, et le mot
 * sortirait de son fond. Il existe parce que le contraste ne peut pas dépendre
 * de ce que l'illustration a mis sous le mot — le médaillon du Bazar est un
 * fouillis d'objets clairs et sombres, et un mot en laiton posé dessus s'y
 * perdrait par endroits.
 */

/** Rayon de l'arc du mot, dans le repère de 100. */
const RAYON_ARC = 37;
/** Demi-ouverture de l'arc, en degrés de part et d'autre du bas. */
const OUVERTURE = 55;

function pointArc(angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [50 + RAYON_ARC * Math.cos(a), 50 + RAYON_ARC * Math.sin(a)];
}

const [DEBUT_X, DEBUT_Y] = pointArc(90 + OUVERTURE);
const [FIN_X, FIN_Y] = pointArc(90 - OUVERTURE);
/** `sweep-flag` à 0 : l'angle décroît, donc on passe par le bas et non par le haut. */
const ARC = `M ${DEBUT_X.toFixed(2)} ${DEBUT_Y.toFixed(2)} A ${RAYON_ARC} ${RAYON_ARC} 0 0 0 ${FIN_X.toFixed(2)} ${FIN_Y.toFixed(2)}`;

/** Longueur du chemin du mot, dans le repère de 100. */
export const LONGUEUR_ARC = (RAYON_ARC * 2 * OUVERTURE * Math.PI) / 180;

/** Corps du mot quand il tient sans effort — la valeur d'origine du dessin. */
const CORPS_MAX = 9.5;
/**
 * Interlettre, en fraction du corps. Les deux maigrissent ensemble : réduire
 * le corps seul laisserait un mot menu aux lettres écartées, qui déborderait
 * encore.
 */
const INTERLETTRE = 1.1 / CORPS_MAX;
/** Chasse d'une monospace, en fraction du corps (DM Mono, Courier Prime). */
const CHASSE = 0.6;
/**
 * Part de l'arc où le mot a le droit de s'étendre. La marge existe parce que
 * la chasse ci-dessus est une valeur de fonte nominale : si la fonte de repli
 * est un peu plus large, il reste de quoi encaisser.
 */
const PART_UTILE = 0.94;

/** Largeur qu'occupe un mot de `signes` caractères, au corps de référence. */
export function largeurDuMot(signes: number): number {
  return signes * corpsDuMot(signes) * (CHASSE + INTERLETTRE);
}

/**
 * Corps du mot posé sur l'arc : le corps de référence tant que le mot tient,
 * réduit juste ce qu'il faut au-delà.
 *
 * `textPath` ROGNE ce qui dépasse du chemin — il ne rétrécit pas, ne renvoie
 * pas à la ligne, il coupe. Sur un arc de 71 unités, « Set up stall » (12
 * signes) en demandait 82 et « Montar puesto » (13) en demandait 88 : leurs
 * première et dernière lettres disparaissaient, l'anglais s'affichait
 * « ET UP STAL » (vu sur émulateur Android le 2026-08-26). Le français
 * (« Étaler ») et le grec (« Πούλημα ») tenaient, d'où un défaut resté
 * invisible pendant tout le développement.
 *
 * Le corps ne bouge pas pour les mots courts : rétrécir un libellé qui tient,
 * pour la seule symétrie, donnerait des médaillons dont le mot change de
 * taille d'une langue à l'autre.
 */
export function corpsDuMot(signes: number): number {
  if (signes <= 0) return CORPS_MAX;
  return Math.min(CORPS_MAX, (LONGUEUR_ARC * PART_UTILE) / (signes * (CHASSE + INTERLETTRE)));
}

const cadreStyle = (d: number, actif: boolean): CSSProperties => ({
  position: "relative",
  width: d,
  height: d,
  flex: "0 0 auto",
  borderRadius: "50%",
  overflow: "hidden",
  padding: 0,
  // `FloatingActionBar` coupe les événements sur toute sa colonne pour ne pas
  // voler les taps du panorama derrière : chaque bouton les rétablit.
  pointerEvents: "auto",
  border: `${Math.max(2, Math.round(d * 0.022))}px solid var(--brass-500)`,
  background: "var(--forest-800)",
  cursor: actif ? "pointer" : "default",
  // La même ombre portée que les plaques de l'étal : le médaillon est posé
  // SUR le panorama, qui peut être clair, et un cercle laiton sans ombre s'y
  // découpe mal.
  boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
  opacity: actif ? 1 : 0.55,
});

export function BoutonPorteRond({
  libelle,
  image,
  onClick,
  disabled = false,
  cadenasse = false,
  compteARebours,
  diametre = 132,
  className,
}: BoutonPorteRondProps) {
  // `useId` rend « :r1: ». Les deux-points font une référence de fragment
  // douteuse et un sélecteur CSS carrément invalide — React le documente. On
  // les retire une bonne fois plutôt que de compter sur l'indulgence du moteur.
  const idArc = `arc-porte-${useId().replace(/:/g, "")}`;
  // Le mot se règle sur sa propre longueur : voir corpsDuMot.
  const corps = corpsDuMot(libelle.length);
  return (
    // L'enveloppe existe pour le tutoriel, et elle porte deux corrections :
    // elle ne rogne pas — sinon la main pointeuse, posée 26 px au-dessus de la
    // cible, serait coupée — et elle remet à 50 % le `border-radius: 12px`
    // qu'impose `.tuto-pulse`, dont le halo est un `box-shadow` qui épouse ce
    // rayon et dessinerait un carré arrondi autour d'un rond.
    <span
      className={className}
      style={{
        display: "inline-flex",
        borderRadius: "50%",
        flex: "0 0 auto",
        pointerEvents: "auto",
      }}
    >
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={libelle}
      style={cadreStyle(diametre, !disabled)}
    >
      <img
        src={image}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // Éteint plutôt que voilé : la désaturation dit « fermé » sans rien
          // cacher du dessin, comme les plaques hors de portée de la bourse.
          filter: cadenasse ? "grayscale(0.85) brightness(0.62)" : "",
        }}
      />

      {cadenasse && (
        <span
          data-cadenas
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: diametre * 0.03,
            color: "var(--brass-300)",
            // Le cadenas est posé sur une illustration : sans ombre, son
            // laiton se noierait dans un fond clair.
            filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))",
          }}
        >
          <Lock size={Math.round(diametre * 0.22)} strokeWidth={2.2} aria-hidden />
          {compteARebours && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: Math.round(diametre * 0.1),
                fontWeight: 700,
                letterSpacing: "0.14em",
              }}
            >
              {compteARebours}
            </span>
          )}
        </span>
      )}

      <svg
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        <path id={idArc} d={ARC} fill="none" />
        <path
          data-ruban
          d={ARC}
          fill="none"
          stroke="var(--forest-800)"
          strokeWidth={15}
          strokeLinecap="round"
          opacity={0.86}
        />
        <text
          fill="var(--brass-300)"
          fontFamily="var(--font-mono)"
          fontSize={corps}
          fontWeight={700}
          letterSpacing={corps * INTERLETTRE}
          dominantBaseline="central"
        >
          <textPath href={`#${idArc}`} startOffset="50%" textAnchor="middle">
            {libelle.toUpperCase()}
          </textPath>
        </text>
      </svg>
    </button>
    </span>
  );
}
