"use client";

import { useEffect, type CSSProperties } from "react";
import { Play, Pause, SkipForward, ExternalLink } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import { vinylSunoPageUrl } from "@/data/vinylesAudio";
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
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const stage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 51,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  padding:
    "max(40px, env(safe-area-inset-top)) 0 calc(20px + env(safe-area-inset-bottom))",
  pointerEvents: "none",
};

const gramoBlock: CSSProperties = {
  position: "relative",
  width: "min(80vw, 320px)",
  aspectRatio: "310 / 400",
  pointerEvents: "auto",
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

const panel: CSSProperties = {
  marginTop: 16,
  width: "min(92vw, 420px)",
  background: "rgba(20,32,26,0.92)",
  border: "1px solid var(--brass-700)",
  borderRadius: 6,
  padding: "10px 14px 12px",
  pointerEvents: "auto",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
};

const titreVinyle: CSSProperties = {
  textAlign: "center",
  fontSize: 14,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 4,
  minHeight: 18,
};

const sunoLink: CSSProperties = {
  display: "flex",
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
  marginBottom: 8,
};

const controls: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 22,
  paddingBottom: 8,
  borderBottom: "1px dotted var(--brass-700)",
  marginBottom: 8,
};

const ctrlBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: "1px solid var(--brass-500)",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  cursor: "pointer",
  padding: 0,
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
  border: "1px solid var(--brass-700)",
  background: "var(--paper-100)",
  borderRadius: 4,
  overflow: "hidden",
  cursor: "pointer",
  padding: 0,
};

const tileActif: CSSProperties = {
  ...tileBase,
  borderColor: "var(--brass-300)",
  boxShadow: "0 0 0 2px var(--brass-300)",
};

const emptyMsg: CSSProperties = {
  textAlign: "center",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 12,
  color: "var(--brass-300)",
  opacity: 0.7,
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

        <div style={gramoBlock}>
          <img
            src="/qg/gramophoeface.png"
            alt=""
            style={gramoImg}
            draggable={false}
          />
        </div>

        <div style={panel}>
          <div style={titreVinyle}>
            {vinyleCourant ? vinyleCourant.nom : "—"}
          </div>
          {vinyleCourant && (() => {
            const sunoUrl = vinylSunoPageUrl(vinyleCourant.templateId);
            if (!sunoUrl) return null;
            return (
              <a
                href={sunoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={sunoLink}
              >
                <ExternalLink size={11} strokeWidth={1.8} />
                Ajouter sur Suno
              </a>
            );
          })()}

          <div style={controls}>
            <button
              type="button"
              aria-label={enLecture ? "Pause" : "Lecture"}
              onClick={onPlayPause}
              disabled={vinyles.length === 0}
              style={{
                ...ctrlBtn,
                opacity: vinyles.length === 0 ? 0.4 : 1,
                cursor: vinyles.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {enLecture ? (
                <Pause size={20} strokeWidth={1.8} />
              ) : (
                <Play size={20} strokeWidth={1.8} />
              )}
            </button>
            <button
              type="button"
              aria-label="Suivant"
              onClick={onNext}
              disabled={vinyles.length === 0}
              style={{
                ...ctrlBtn,
                opacity: vinyles.length === 0 ? 0.4 : 1,
                cursor: vinyles.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              <SkipForward size={20} strokeWidth={1.8} />
            </button>
          </div>

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
                    style={actif ? tileActif : tileBase}
                  >
                    <ItemImage
                      templateId={v.templateId}
                      categorie="Musique"
                      fit="cover"
                      fallbackIconSize={28}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
