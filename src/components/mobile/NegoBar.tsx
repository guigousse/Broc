"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTickSound } from "@/lib/audio/useTickSound";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { CibleOffre } from "@/data/tutorielScenario";
import type { GenrePersona, NegoMode } from "@/types/game";

interface NegoBarProps {
  mode: NegoMode;
  /** Borne haute de l'échelle (prix vendeur initial en achat / prix demandé initial en vente). */
  echelleMax: number;
  /** Prix courant côté adverse (vendeur ou client). */
  prixAdverse: number;
  /** Prix courant côté joueur (offre en cours). */
  prixJoueur: number;
  /** Bornes min/max autorisées pour le drag joueur. */
  minJoueur: number;
  maxJoueur: number;
  /** Callback à chaque changement de valeur (incréments de 1 €). */
  onChangeJoueur: (prix: number) => void;
  /** Désactive le drag (négo terminée). */
  readOnly?: boolean;
  /** Tutoriel : main pointeuse sur le curseur joueur (ignorée si readOnly). */
  tutoMainJoueur?: boolean;
  /**
   * Prix d'achat (somme du panier en vente) : repère fixe non interactif,
   * comme la pastille « achat » du PrixSlider en tarification. Masqué si
   * absent, null ou ≤ 0 (panier dont un objet n'a pas de prix connu).
   */
  achat?: number | null;
  /**
   * Genre du persona en face — accorde la pastille (« Lui » / « Elle » /
   * « Eux »). Absent → masculin, le repli des personas non identifiés.
   */
  genreAdverse?: GenrePersona;
  /**
   * Le vendeur a lâché son dernier prix : la négociation est finie, seul son
   * curseur reste — étiqueté « dernier prix » sous la piste, à la place de
   * l'accord de genre. Le curseur joueur sort du DOM plutôt que d'être
   * masqué : il n'y a plus rien à faire glisser, sa cible tactile de 56 px
   * n'a plus de raison d'intercepter quoi que ce soit.
   */
  dernierPrix?: boolean;
  /**
   * Tutoriel : cible pointillée du grand-père. Anneau fixe posé sur la piste
   * — le joueur doit y amener son curseur pour que « Proposer » s'active. Pur
   * repère : il ne capte aucun geste et reste affiché même en lecture seule.
   */
  cible?: CibleOffre | null;
}

/** Le débordement à combler ne fait que ~6 px sur une piste de ~270 px. */
const SEUIL_FLECHE_BORD_PCT = 3;

const COLOR_JOUEUR = "var(--nego-joueur)";
const COLOR_ADVERSE = "var(--brass-700, #8c6a2b)";
const COLOR_ACHAT = "var(--ink-500)";

export function NegoBar({
  mode: _mode,
  echelleMax,
  prixAdverse,
  prixJoueur,
  minJoueur,
  maxJoueur,
  onChangeJoueur,
  readOnly = false,
  tutoMainJoueur = false,
  achat,
  genreAdverse = "m",
  dernierPrix = false,
  cible = null,
}: NegoBarProps) {
  const { d } = useLangue();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const tick = useTickSound();
  const lastValRef = useRef(prixJoueur);

  useEffect(() => {
    lastValRef.current = prixJoueur;
  }, [prixJoueur]);

  const pctJoueur = Math.min(100, Math.max(0, (prixJoueur / echelleMax) * 100));
  const pctAdverse = Math.min(100, Math.max(0, (prixAdverse / echelleMax) * 100));

  /* Flèches d'invite : le curseur se glisse, rien d'autre ne le dit. Le
     tutoriel garde sa version animée ; en lecture seule (fâché, conclu) il n'y
     a plus de geste à suggérer. Au ras d'un bord, la flèche de ce côté est
     coupée : elle réclame 46 px là où la barre n'en dégage que 40. */
  const flechesJoueur = readOnly
    ? undefined
    : [
        tutoMainJoueur ? "tuto-fleches" : "nego-fleches",
        pctJoueur < SEUIL_FLECHE_BORD_PCT ? "fleches-sans-gauche" : "",
        pctJoueur > 100 - SEUIL_FLECHE_BORD_PCT ? "fleches-sans-droite" : "",
      ]
        .filter(Boolean)
        .join(" ");

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = Math.round(ratio * echelleMax);
      const clamped = Math.min(maxJoueur, Math.max(minJoueur, raw));
      if (clamped !== lastValRef.current) {
        lastValRef.current = clamped;
        tick();
        onChangeJoueur(clamped);
      }
    };
    const onPointerMove = (e: PointerEvent) => handleMove(e.clientX);
    const onPointerUp = () => setDragging(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [dragging, echelleMax, minJoueur, maxJoueur, onChangeJoueur, tick]);

  const startDrag = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setDragging(true);
  };

  /* Anneau de cible : centré sur le prix visé, large de la tolérance de part
     et d'autre. `minWidth` en pixels plutôt qu'un plancher sur le pourcentage
     — sur une échelle large (tourne-disque à 90 €), ±4 € ne font que 9 % de la
     piste, mais sur une échelle serrée le cercle doit rester saisissable. */
  const cibleGeo = cible
    ? {
        pct: Math.min(100, Math.max(0, (cible.prix / echelleMax) * 100)),
        largeurPct: Math.min(100, ((2 * cible.tolerance) / echelleMax) * 100),
      }
    : null;

  const pctAchat =
    typeof achat === "number" && achat > 0
      ? Math.min(100, Math.max(0, (achat / echelleMax) * 100))
      : null;

  return (
    <div style={dernierPrix ? wrapStyleDeuxLignes : wrapStyle}>
      <div ref={trackRef} style={trackStyle}>
        {/* Cible du grand-père : tout premier dans le DOM — c'est un décor de
            piste, il doit passer SOUS les trois pastilles sans exception. */}
        {cibleGeo && (
          <div
            data-nego-cible=""
            aria-hidden
            style={{
              ...cibleStyle,
              left: `${cibleGeo.pct}%`,
              width: `${cibleGeo.largeurPct}%`,
            }}
          >
            <span style={cibleLabelStyle}>{cible!.prix}€</span>
          </div>
        )}
        {/* Repère fixe du prix d'achat : premier dans le DOM pour rester
            SOUS les deux curseurs mobiles quand ils le croisent. */}
        {pctAchat !== null && (
          <div
            style={{
              ...cursorStyle,
              width: 28,
              height: 28,
              top: 16,
              left: `${pctAchat}%`,
              fontSize: 10,
              background: COLOR_ACHAT,
              color: "white",
              pointerEvents: "none",
            }}
          >
            {achat}€
            <span style={{ ...labelStyle, top: 32 }}>
              {d.vente.pastilleAchat}
            </span>
          </div>
        )}
        <div
          style={{
            ...cursorStyle,
            left: `${pctAdverse}%`,
            background: COLOR_ADVERSE,
            color: "white",
            transition: "left 300ms ease-out",
          }}
        >
          {prixAdverse}€
          {dernierPrix ? (
            <span style={labelDernierPrix}>{d.chine.dernierPrix}</span>
          ) : (
            <span style={{ ...labelStyle, top: -14, bottom: "auto" }}>
              {d.vente.labelAdverse[genreAdverse]}
            </span>
          )}
        </div>
        {/* Enveloppe de drag 56 px (cible tactile) autour du curseur visuel
            de 36 px : centres alignés (30 px sous le haut de la piste). */}
        {!dernierPrix && (
        <div
          onPointerDown={startDrag}
          className={flechesJoueur}
          style={{
            position: "absolute",
            top: 2,
            left: `${pctJoueur}%`,
            width: 56,
            height: 56,
            transform: "translateX(-50%)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: readOnly ? "default" : "grab",
            touchAction: "none",
            zIndex: 2,
          }}
        >
          <div
            style={{
              ...cursorStyle,
              position: "relative",
              top: 0,
              transform: "none",
              background: COLOR_JOUEUR,
              color: "white",
            }}
          >
            {prixJoueur}€
            <span style={labelStyle}>{d.vente.labelJoueur}</span>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  position: "relative",
  padding: "0 24px",
  margin: "28px 0 4px",
};

/** La 2e ligne de « prix final » dépasse la piste : sans cette marge elle
 *  viendrait mordre sur la rangée de boutons, collée 2 px plus bas. */
const wrapStyleDeuxLignes: CSSProperties = {
  ...wrapStyle,
  margin: "28px 0 18px",
};

const trackStyle: CSSProperties = {
  position: "relative",
  height: 60,
  borderRadius: 2,
  background:
    "linear-gradient(to bottom, transparent 28px, rgba(0,0,0,0.12) 28px, rgba(0,0,0,0.12) 32px, transparent 32px)",
};

/** Anneau pointillé de la cible : haut de 44 px pour envelopper les 36 px du
 *  curseur joueur quand il tombe dedans, centré sur la même ligne (y = 30). */
const cibleStyle: CSSProperties = {
  position: "absolute",
  top: 8,
  height: 44,
  minWidth: 44,
  transform: "translateX(-50%)",
  border: "2px dashed var(--brass-700, #8c6a2b)",
  borderRadius: 22,
  background: "rgba(184, 156, 94, 0.12)",
  pointerEvents: "none",
  zIndex: 0,
};

const cibleLabelStyle: CSSProperties = {
  position: "absolute",
  top: -15,
  left: "50%",
  transform: "translateX(-50%)",
  fontFamily: "var(--font-display)",
  fontSize: 10,
  fontWeight: 700,
  color: "var(--brass-700, #8c6a2b)",
  whiteSpace: "nowrap",
};

const cursorStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  width: 36,
  height: 36,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  fontWeight: 700,
  transform: "translateX(-50%)",
  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  userSelect: "none",
};

/**
 * Étiquette du curseur restant, en DEUX LIGNES — c'est ce qui règle le
 * problème de largeur plutôt qu'un calage savant : « PRIX » et « FINAL »
 * font chacun ~40 px, là où le libellé d'une seule traite en faisait ~80
 * pour un curseur de 36. Or le vendeur qui refuse sans avoir bougé laisse son
 * curseur PILE au bout de l'échelle : à 48 px de large, la moitié qui
 * dépasse (24 px) tombe exactement dans le `padding: 0 24px` de la barre.
 * Rien ne sort, l'étiquette reste centrée sous son curseur.
 *
 * Les quatre langues sont en deux mots, dont le plus long (ΤΕΛΙΚΉ, ~48 px)
 * tient encore dans cette largeur — le repli se fait donc à l'espace.
 */
const labelDernierPrix: CSSProperties = {
  position: "absolute",
  top: 40,
  left: "50%",
  transform: "translateX(-50%)",
  width: 48,
  textAlign: "center",
  lineHeight: 1.1,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  opacity: 0.7,
};

const labelStyle: CSSProperties = {
  position: "absolute",
  top: 40,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  opacity: 0.7,
};
