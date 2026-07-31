"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Play, Pause, SkipForward, ExternalLink } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import { nombreVinylesEcoutables, vinylSunoPageUrl } from "@/data/vinylesAudio";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import { getItemThumbUrl } from "@/lib/itemImages";
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
  /** Mini-tuto vinyles : main pointeuse sur la première vignette. */
  guide?: boolean;
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

/** Ligne sous le titre : lien Suno (si présent) + compteur x/y. */
const sousTitreLigne: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
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

/** Compteur vinyles débloqués / écoutables. */
const compteurVinyles: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  color: "var(--brass-300)",
  opacity: 0.75,
};

/** Section basse : bande de vinyles, fond bois sombre. */
const sectionVinyles: CSSProperties = {
  background:
    "var(--gradient-cargo-wood)",
  borderTop: "1px solid rgba(0,0,0,0.4)",
  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55)",
  padding: "10px 12px",
};

/** Taille des tuiles ; la sélectionnée est ~30 % plus grande. */
const TILE = 96;
const TILE_ACTIVE = 125;

const bandeWrap: CSSProperties = {
  display: "flex",
  // La tuile sélectionnée est plus grande : les autres se centrent dessus.
  alignItems: "center",
  // Hauteur réservée sur la grande tuile : pendant la transition de
  // sélection, l'ancienne rétrécit pendant que la nouvelle grandit et le
  // max passe sous TILE_ACTIVE — sans réserve, la bande rebondit.
  minHeight: TILE_ACTIVE,
  gap: 8,
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  scrollbarWidth: "none",
};

const tileBase: CSSProperties = {
  position: "relative",
  // Pochette nue, sans cadre de rareté : les visuels des vinyles sont des
  // pochettes carrées, l'anneau de sélection épouse donc leurs bords.
  borderRadius: 10,
  overflow: "hidden",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  transition: "flex-basis 160ms ease, height 160ms ease",
};

/** Disque central en rotation pendant la lecture : recadrage circulaire du
 * centre de la pochette (80 % de la tuile). L'image intérieure fait
 * 100/80 = 125 % du cercle, soit exactement la taille de la tuile : le
 * recadrage est donc parfaitement aligné sur la pochette en dessous, et
 * seule sa rotation le rend visible. */
const disqueSpin: CSSProperties = {
  position: "absolute",
  left: "10%",
  top: "10%",
  width: "80%",
  height: "80%",
  borderRadius: "50%",
  overflow: "hidden",
  boxShadow: "0 0 0 2px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.4)",
  // Rotation lente et paisible (un vrai 33 tours serait ~1,8 s/tour).
  animation: "broc-vinyle-spin 4s linear infinite",
  pointerEvents: "none",
};

const disqueImg: CSSProperties = {
  position: "absolute",
  width: "125%",
  height: "125%",
  left: "-12.5%",
  top: "-12.5%",
  // Le preflight Tailwind clampe `img { max-width: 100%; height: auto }` :
  // sans ce déblocage, l'image interne est écrasée à la taille du cercle.
  maxWidth: "none",
};

function vinylTileStyle(actif: boolean): CSSProperties {
  const taille = actif ? TILE_ACTIVE : TILE;
  return {
    ...tileBase,
    flex: `0 0 ${taille}px`,
    height: taille,
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
  // Sous le header haut du QG (le sheet couvre tout l'écran, header compris).
  top: "calc(var(--safe-top) + var(--mobile-header-h) + 12px)",
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
    guide = false,
  } = props;
  const { d, locale } = useLangue();

  /* Fermeture au tap sur les zones transparentes de l'image gramophone :
   * on échantillonne le canal alpha du webp via un canvas hors écran
   * (construit paresseusement au premier tap, une seule fois). Fail-open :
   * si l'échantillonnage est impossible (canvas indisponible, image pas
   * chargée…), le tap ferme — comportement du scrim qui entoure l'image. */
  const gramoImgRef = useRef<HTMLImageElement | null>(null);
  const alphaCtxRef = useRef<CanvasRenderingContext2D | null | undefined>(
    undefined,
  );

  function tapGramo(e: ReactMouseEvent<HTMLDivElement>) {
    let alpha = 0;
    const img = gramoImgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      if (alphaCtxRef.current === undefined) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        try {
          ctx?.drawImage(img, 0, 0);
          alphaCtxRef.current = ctx;
        } catch {
          alphaCtxRef.current = null;
        }
      }
      const ctx = alphaCtxRef.current;
      if (ctx) {
        const rect = e.currentTarget.getBoundingClientRect();
        // L'img remplit exactement le bloc (même ratio 303/510) : simple
        // mise à l'échelle des coordonnées vers les pixels naturels.
        const x = Math.floor(
          ((e.clientX - rect.left) / rect.width) * img.naturalWidth,
        );
        const y = Math.floor(
          ((e.clientY - rect.top) / rect.height) * img.naturalHeight,
        );
        try {
          alpha = ctx.getImageData(x, y, 1, 1).data[3];
        } catch {
          alpha = 0;
        }
      }
    }
    // Seuil bas : les pixels du liseré adouci restent "pleins".
    if (alpha < 32) onClose();
  }

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
          aria-label={d.commun.fermer}
          onClick={onClose}
          style={closeBtn}
        >
          ×
        </button>

        {/* Ligne avec boutons de part et d'autre de l'image */}
        <div style={gramoRow}>
          <button
            type="button"
            aria-label={enLecture ? d.sheets.pause : d.sheets.lecture}
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

          <div style={gramoBlock} data-gramo-block onClick={tapGramo}>
            <img
              ref={gramoImgRef}
              src="/qg/gramophoeface.webp"
              alt=""
              style={gramoImg}
              draggable={false}
            />
          </div>

          <button
            type="button"
            aria-label={d.sheets.suivant}
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
              {vinyleCourant
                ? affichageTitreVinyle(nomObjet(vinyleCourant, locale))
                : "—"}
            </div>
            <div style={sousTitreLigne}>
              {sunoUrl && (
                <a
                  href={sunoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={sunoLink}
                >
                  <ExternalLink size={11} strokeWidth={1.8} />
                  {d.sheets.ajouterSurSuno}
                </a>
              )}
              <span style={compteurVinyles}>
                {vinyles.length} / {nombreVinylesEcoutables()}
              </span>
            </div>
          </div>

          <div style={sectionVinyles}>
            {vinyles.length === 0 ? (
              <div style={emptyMsg}>
                {d.sheets.aucunVinyle}
                <br />
                {d.sheets.trouvezVendeurs}
              </div>
            ) : (
              // Pendant le guidage : overflow visible pour ne pas rogner la
              // main (un seul vinyle à ce stade, aucun scroll nécessaire).
              <div style={guide ? { ...bandeWrap, overflowX: "visible" } : bandeWrap}>
                {vinyles.map((v, idx) => {
                  const actif = idx === vinyleCourantIdx;
                  const nomVinyle = nomObjet(v, locale);
                  const disqueUrl =
                    actif && enLecture ? getItemThumbUrl(v.templateId) : null;
                  return (
                    <button
                      key={v.templateId}
                      type="button"
                      className={guide && idx === 0 ? "tuto-main tuto-main-haut" : undefined}
                      onClick={() => onSelect(idx)}
                      title={nomVinyle}
                      aria-label={nomVinyle}
                      // Pendant le guidage : overflow visible sur la tuile,
                      // sinon son ::after (la main) est rogné.
                      style={
                        guide && idx === 0
                          ? { ...vinylTileStyle(actif), overflow: "visible" }
                          : vinylTileStyle(actif)
                      }
                    >
                      <ItemImage
                        templateId={v.templateId}
                        categorie="Musique"
                        fit="contain"
                        fallbackIconSize={28}
                      />
                      {disqueUrl && (
                        <span aria-hidden data-disque-spin style={disqueSpin}>
                          <img
                            src={disqueUrl}
                            alt=""
                            style={disqueImg}
                            draggable={false}
                          />
                        </span>
                      )}
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
