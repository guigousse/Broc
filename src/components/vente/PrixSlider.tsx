"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { TOLERANCE_PRIX_CONSEILLE } from "@/data/tutorielScenario";

interface PrixSliderProps {
  /** Prix de vente courant (poignée mobile). */
  value: number;
  /** Valeur de marché (pastille fixe, centre de l'échelle = 0 %). */
  marche: number;
  /** Prix d'achat de l'objet (pastille fixe). Masquée si absent. */
  achat?: number | null;
  /** Amplitude en % de part et d'autre du marché (défaut 100 → -100 %…+100 %). */
  ampPct?: number;
  /**
   * Faux si le joueur n'a pas Connaisseur 2 pour cette catégorie : la pastille
   * « valeur » (et tout texte affichant la référence) est masquée. La géométrie
   * de l'échelle reste ancrée sur `marche` en interne — compromis assumé, elle
   * ne fuit pas de valeur lisible. Défaut `true` pour ne pas casser les usages
   * existants.
   */
  marcheConnu?: boolean;
  /**
   * Tutoriel (pricing guidé) : prix conseillé par le grand-père — pastille
   * repère supplémentaire ET aimantation du drag (à ± TOLERANCE_PRIX_
   * CONSEILLE, le prix commité saute exactement sur `cible`).
   */
  cible?: number | null;
  /** Tutoriel : flèches clignotantes sur la poignée tant que `cible` n'est pas posée. */
  tutoFleches?: boolean;
  /** Tutoriel : poignée verrouillée (objet déjà étiqueté par le grand-père) — pas de drag, opacité réduite, étiquette explicative. */
  readOnly?: boolean;
  onChange: (prix: number) => void;
}

/**
 * Étage de chaque étiquette « au-dessus », compté depuis la pastille. Les
 * étages sont attribués par IDENTITÉ et non par ordre d'apparition : « valeur »
 * garde sa hauteur que « achat » soit affiché ou non, sinon les mots
 * sauteraient d'une ligne à l'autre d'un objet à l'autre de la liste.
 */
const ETAGE_ACHAT = 0;
const ETAGE_VALEUR = 1;
const ETAGE_CIBLE = 2;

/** Hauteur d'un étage : la police fait 9 px, plus 4 px de respiration. */
const HAUTEUR_ETAGE = 13;

/** Demi-hauteur de piste sous la ligne — inchangée, la seule étiquette de ce
 *  côté (« vente ») n'a jamais eu de voisine avec qui se cogner. */
const MARGE_SOUS_LIGNE = 32;

/**
 * En deçà de cette fraction de l'échelle, la poignée est trop près du bout
 * pour que sa flèche tienne : elle mordrait sur la borne « ±100 % », posée à
 * 8 px de la piste alors que la flèche va jusqu'à 38 px du centre.
 */
const SEUIL_FLECHE_BORD = 0.12;

const COL_VENTE = "var(--nego-joueur)";
const COL_VALEUR = "var(--brass-700)";
const COL_ACHAT = "var(--ink-500)";
const COL_CIBLE = "var(--brass-500)";

/**
 * Curseur de prix façon « négociation » avec trois pastilles : valeur de marché
 * et prix d'achat (fixes, repères) + prix de vente (poignée glissable). Le prix
 * s'affiche au centre de chaque cercle. Échelle bornée à ±ampPct autour du marché.
 */
export function PrixSlider({
  value,
  marche,
  achat,
  ampPct = 100,
  marcheConnu = true,
  cible = null,
  tutoFleches = false,
  readOnly = false,
  onChange,
}: PrixSliderProps) {
  const { d } = useLangue();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const lastRef = useRef(value);
  useEffect(() => {
    lastRef.current = value;
  }, [value]);

  const ref = Math.max(1, Math.round(marche));
  const min = Math.max(1, Math.round(ref * (1 - ampPct / 100)));
  const max = Math.max(min + 1, Math.round(ref * (1 + ampPct / 100)));
  const ratioOf = (p: number) => Math.min(1, Math.max(0, (p - min) / (max - min)));

  // La piste ne grandit que des étages réellement occupés : 64 px comme avant
  // quand « achat » est seul, 77 avec « valeur », 90 pendant le tutoriel.
  const etagesOccupes =
    cible != null ? ETAGE_CIBLE + 1 : marcheConnu ? ETAGE_VALEUR + 1 : 1;
  const centreY = MARGE_SOUS_LIGNE + HAUTEUR_ETAGE * (etagesOccupes - 1);

  const ratioVente = ratioOf(value);
  const flechesVente = readOnly
    ? undefined
    : [
        tutoFleches ? "tuto-fleches" : "nego-fleches",
        ratioVente < SEUIL_FLECHE_BORD ? "fleches-sans-gauche" : "",
        ratioVente > 1 - SEUIL_FLECHE_BORD ? "fleches-sans-droite" : "",
      ]
        .filter(Boolean)
        .join(" ");

  useEffect(() => {
    if (!dragging) return;
    const move = (clientX: number) => {
      const t = trackRef.current;
      if (!t) return;
      const rect = t.getBoundingClientRect();
      const r = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      let prix = Math.round(min + r * (max - min));
      // Aimantation (tutoriel) : à ± TOLERANCE_PRIX_CONSEILLE du prix
      // conseillé, on committe la cible exacte plutôt que la valeur brute du
      // pointeur — seul point de commit du curseur, donc suffit à couvrir le
      // drag ET le relâché (pas de commit séparé au pointerup).
      if (cible != null && Math.abs(prix - cible) <= TOLERANCE_PRIX_CONSEILLE) {
        prix = cible;
      }
      if (prix !== lastRef.current) {
        lastRef.current = prix;
        onChange(prix);
      }
    };
    const onMove = (e: globalThis.PointerEvent) => move(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, min, max, onChange, cible]);

  return (
    <div>
      <div style={row}>
        <span style={endLabel}>−{ampPct} %</span>
        <div
          ref={trackRef}
          style={{ ...track, height: centreY + MARGE_SOUS_LIGNE }}
        >
          <div style={{ ...line, top: centreY }} />

          {marcheConnu && (
            <Pastille
              ratio={ratioOf(ref)}
              color={COL_VALEUR}
              size={34}
              label={d.inventaire.valeurMot}
              labelPos="above"
              etage={ETAGE_VALEUR}
              centreY={centreY}
            >
              {ref}€
            </Pastille>
          )}

          {typeof achat === "number" && achat > 0 && (
            <Pastille
              ratio={ratioOf(achat)}
              color={COL_ACHAT}
              size={34}
              label={d.vente.pastilleAchat}
              labelPos="above"
              etage={ETAGE_ACHAT}
              centreY={centreY}
            >
              {achat}€
            </Pastille>
          )}

          {typeof cible === "number" && (
            <Pastille
              ratio={ratioOf(cible)}
              color={COL_CIBLE}
              size={34}
              label={d.vente.prixConseille}
              labelPos="above"
              etage={ETAGE_CIBLE}
              centreY={centreY}
            >
              {cible}€
            </Pastille>
          )}

          <Pastille
            ratio={ratioOf(value)}
            color={dragging ? "var(--forest-700)" : COL_VENTE}
            size={40}
            label={d.vente.pastilleVente}
            labelPos="below"
            centreY={centreY}
            z={3}
            className={flechesVente}
            style={readOnly ? { opacity: 0.7 } : undefined}
            onPointerDown={
              readOnly
                ? undefined
                : (e) => {
                    e.preventDefault();
                    setDragging(true);
                  }
            }
          >
            {value}€
          </Pastille>
        </div>
        <span style={endLabel}>+{ampPct} %</span>
      </div>
      {readOnly && <div style={etiquette}>{d.vente.etiquetteGrandPere}</div>}
    </div>
  );
}

function Pastille({
  ratio,
  color,
  size,
  label,
  labelPos,
  etage = 0,
  centreY,
  z = 1,
  onPointerDown,
  children,
  className,
  style,
}: {
  ratio: number;
  color: string;
  size: number;
  label: string;
  labelPos: "above" | "below";
  /** Étage de l'étiquette au-dessus de la pastille (ignoré si `labelPos` vaut
   *  "below" : personne d'autre n'occupe ce côté). */
  etage?: number;
  /** Ordonnée de la ligne dans la piste — remplace un `top: 50%`, qui aurait
   *  fait grandir la piste des DEUX côtés pour des étages ajoutés d'un seul. */
  centreY: number;
  z?: number;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  children: ReactNode;
  /** Traversée jusqu'au div racine — tutoriel : `.tuto-fleches` (flèches ::before/::after). */
  className?: string;
  /** Overrides ponctuels (ex : opacité en lecture seule). Appliqué en dernier. */
  style?: CSSProperties;
}) {
  const draggable = !!onPointerDown;
  return (
    <div
      className={className}
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        top: centreY,
        left: `${ratio * 100}%`,
        transform: "translate(-50%, -50%)",
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: color,
        color: "var(--paper-100)",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: size >= 40 ? 11 : 10,
        /* L'anneau couleur papier détache les pastilles quand elles se
           recouvrent (achat et valeur peuvent être à quelques euros l'une de
           l'autre). En ombre portée et non en `border` : la boîte n'a pas
           `box-sizing: border-box` ici, un cadre gonflerait le cercle. */
        boxShadow: "0 2px 6px rgba(0,0,0,0.35), 0 0 0 2px var(--paper-100)",
        userSelect: "none",
        zIndex: z,
        ...(draggable
          ? { touchAction: "none", cursor: "grab" }
          : { pointerEvents: "none" }),
        ...style,
      }}
    >
      {children}
      <span
        style={{
          position: "absolute",
          ...(labelPos === "above"
            ? { bottom: `calc(100% + ${3 + etage * HAUTEUR_ETAGE}px)` }
            : { top: "calc(100% + 3px)" }),
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-500)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 4px",
};

const endLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  color: "var(--ink-500)",
  letterSpacing: "0.04em",
  flexShrink: 0,
};

const track: CSSProperties = {
  position: "relative",
  flex: 1,
  // Confine les z-index des pastilles (1..3) à la piste : sans ça, `position:
  // relative` seul ne crée pas de contexte d'empilement et le z:3 de la
  // poignée de vente « fuit » dans le contexte parent, passant DEVANT le footer
  // sticky (z auto) quand on scrolle la liste de tarification.
  isolation: "isolate",
};

const etiquette: CSSProperties = {
  marginTop: 2,
  paddingLeft: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  fontStyle: "italic",
  color: "var(--ink-500)",
};

const line: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 6,
  transform: "translateY(-50%)",
  borderRadius: 3,
  background: "rgba(0, 0, 0, 0.12)",
};
