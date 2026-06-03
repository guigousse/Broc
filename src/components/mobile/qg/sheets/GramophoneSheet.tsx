"use client";

import { useEffect, type CSSProperties } from "react";
import { Play, Pause, SkipForward, ExternalLink } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import { vinylSunoPageUrl } from "@/data/vinylesAudio";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import type { CollectionSlot } from "@/types/game";

interface GramophoneSheetProps {
  open: boolean;
  onClose: () => void;
  vinyles: CollectionSlot[];
  vinyleCourantIdx: number | null;
  enLecture: boolean;
  onSelect: (idx: number) => void;
  onPlayPause: () => void;
  onNext: () => void;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const scrim: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  // Laisse la barre de navigation visible et accessible.
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const stage: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  // Le bas du sheet se cale juste au-dessus de la barre de navigation.
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
  zIndex: 51,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: "max(40px, env(safe-area-inset-top)) 0 0",
  pointerEvents: "none",
};

/** Gramophone : largeur calculée pour laisser de la place aux deux boutons. */
const GRAMO_WIDTH = "min(58vw, 240px)";

/** Ligne [bouton gauche · gramophone · bouton droit]. Les boutons sont
 * alignés sur le BAS du gramophone (niveau du socle bois), pas au centre
 * de l'image — visuellement les commandes tombent à hauteur du fauteuil
 * (à gauche) et du manteau de cheminée (à droite). */
const gramoRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: 14,
  pointerEvents: "auto",
  marginBottom: 0,
};

const gramoBlock: CSSProperties = {
  position: "relative",
  width: GRAMO_WIDTH,
  aspectRatio: "303 / 510",
  filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.55))",
};

const gramoImg: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  pointerEvents: "none",
};

const ctrlBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 52,
  height: 52,
  borderRadius: "50%",
  border: "1px solid var(--brass-500)",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  cursor: "pointer",
  padding: 0,
  boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
  flexShrink: 0,
  // Petit relèvement par rapport au socle pour éviter que le bouton
  // ne soit "coupé" par le panneau qui vient juste en dessous.
  marginBottom: 12,
};

/** Lecteur : pleine largeur, deux sections empilées. Pas de
 * paddingBottom safe-area : `stage.bottom` calcule déjà la safe-area
 * (cf. `calc(var(--mobile-tabbar-h) + var(--safe-bottom))`) — un
 * paddingBottom ici doublerait la marge et laisserait un vide entre
 * le panel et la barre de navigation. */
const panel: CSSProperties = {
  width: "100%",
  borderTop: "1px solid var(--brass-700)",
  pointerEvents: "auto",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
};

/** Section haute : titre + lien Suno, fond vert sombre. */
const sectionTitre: CSSProperties = {
  background: "rgba(20,32,26,0.95)",
  padding: "12px 16px 10px",
  textAlign: "center",
  borderBottom: "1px solid rgba(58,36,24,0.85)",
};

const titreVinyle: CSSProperties = {
  fontSize: 14,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 4,
  minHeight: 18,
};

const sunoLink: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  opacity: 0.75,
  textDecoration: "none",
};

/** Section basse : bande de vinyles, fond bois sombre. */
const sectionVinyles: CSSProperties = {
  background:
    "linear-gradient(180deg, #3d2614 0%, #2a1a0e 50%, #1f130a 100%)",
  borderTop: "1px solid rgba(0,0,0,0.4)",
  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55)",
  padding: "10px 12px",
};

const bandeWrap: CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: 4,
  scrollbarWidth: "none",
};

const tileBase: CSSProperties = {
  flex: "0 0 64px",
  height: 64,
  borderRadius: 4,
  overflow: "hidden",
  cursor: "pointer",
  padding: 0,
};

function vinylTileStyle(
  vinyl: CollectionSlot,
  actif: boolean,
): CSSProperties {
  const tpl = getTemplate(vinyl.templateId);
  const colors = getRarityColors(vinyl.rarete, !!tpl?.unique);
  return {
    ...tileBase,
    border: `1px solid ${colors.outer}`,
    background: colors.thumbBg,
    ...(actif
      ? { boxShadow: "0 0 0 2px var(--brass-300)" }
      : null),
  };
}

const emptyMsg: CSSProperties = {
  textAlign: "center",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 12,
  color: "var(--brass-300)",
  opacity: 0.85,
  padding: "10px 4px",
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "1px solid var(--brass-500)",
  background: "rgba(20,32,26,0.85)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 16,
  cursor: "pointer",
  pointerEvents: "auto",
  zIndex: 52,
};

/** Retire le préfixe "Vinyle " du nom de l'objet pour l'affichage. */
function affichageTitreVinyle(nom: string): string {
  return nom.replace(/^vinyle\s+/i, "");
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function GramophoneSheet(props: GramophoneSheetProps) {
  const {
    open,
    onClose,
    vinyles,
    vinyleCourantIdx,
    enLecture,
    onSelect,
    onPlayPause,
    onNext,
  } = props;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const vinyleCourant =
    vinyleCourantIdx !== null ? vinyles[vinyleCourantIdx] : null;
  const sunoUrl = vinyleCourant
    ? vinylSunoPageUrl(vinyleCourant.templateId)
    : null;
  const ctrlDisabled = vinyles.length === 0;

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          style={closeBtn}
        >
          ×
        </button>

        {/* Ligne avec boutons de part et d'autre de l'image */}
        <div style={gramoRow}>
          <button
            type="button"
            aria-label={enLecture ? "Pause" : "Lecture"}
            onClick={onPlayPause}
            disabled={ctrlDisabled}
            style={{
              ...ctrlBtn,
              opacity: ctrlDisabled ? 0.4 : 1,
              cursor: ctrlDisabled ? "not-allowed" : "pointer",
            }}
          >
            {enLecture ? (
              <Pause size={22} strokeWidth={1.8} />
            ) : (
              <Play size={22} strokeWidth={1.8} />
            )}
          </button>

          <div style={gramoBlock}>
            <img
              src="/qg/gramophoeface.png"
              alt=""
              style={gramoImg}
              draggable={false}
            />
          </div>

          <button
            type="button"
            aria-label="Suivant"
            onClick={onNext}
            disabled={ctrlDisabled}
            style={{
              ...ctrlBtn,
              opacity: ctrlDisabled ? 0.4 : 1,
              cursor: ctrlDisabled ? "not-allowed" : "pointer",
            }}
          >
            <SkipForward size={22} strokeWidth={1.8} />
          </button>
        </div>

        {/* Lecteur pleine largeur, deux sections empilées */}
        <div style={panel}>
          <div style={sectionTitre}>
            <div style={titreVinyle}>
              {vinyleCourant ? affichageTitreVinyle(vinyleCourant.nom) : "—"}
            </div>
            {sunoUrl && (
              <a
                href={sunoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={sunoLink}
              >
                <ExternalLink size={11} strokeWidth={1.8} />
                Ajouter sur Suno
              </a>
            )}
          </div>

          <div style={sectionVinyles}>
            {vinyles.length === 0 ? (
              <div style={emptyMsg}>
                Aucun vinyle dans votre collection.
                <br />
                Trouvez-en chez vos vendeurs.
              </div>
            ) : (
              <div style={bandeWrap}>
                {vinyles.map((v, idx) => {
                  const actif = idx === vinyleCourantIdx;
                  return (
                    <button
                      key={v.templateId}
                      type="button"
                      onClick={() => onSelect(idx)}
                      title={v.nom}
                      aria-label={v.nom}
                      style={vinylTileStyle(v, actif)}
                    >
                      <ItemImage
                        templateId={v.templateId}
                        categorie="Musique"
                        fit="contain"
                        fallbackIconSize={28}
                        padded
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
