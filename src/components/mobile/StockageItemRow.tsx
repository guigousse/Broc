"use client";

import {
  memo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { Album, Anvil, ArrowRight } from "lucide-react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { StarRow } from "@/components/ui/StarRow";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { getTemplate } from "@/data/objetTemplates";
import { getItemImageUrl } from "@/lib/itemImages";
import { flyToTab } from "@/lib/flyAnimation";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie, libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import type { Objet } from "@/types/game";

interface StockageItemRowProps {
  objet: Objet;
  valeurConnue: boolean;
  atelier: { disponible: boolean; raison?: string };
  collection: { disponible: boolean; necessiteConfirmation: boolean };
  onTap: (objet: Objet) => void;
  onEnvoyerAtelier: (objet: Objet) => void;
  onEnvoyerCollection: (objet: Objet) => void;
  isLast: boolean;
}

const ACTIONS_WIDTH = 112;
const SNAP_THRESHOLD = 60;
const TAP_THRESHOLD = 8;

const wrap: CSSProperties = {
  position: "relative",
  overflow: "hidden",
};

const actions: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  justifyContent: "flex-end",
};

const actionBtn = (
  bg: string,
  enabled: boolean,
): CSSProperties => ({
  width: 56,
  height: "100%",
  border: "none",
  background: enabled ? bg : "var(--paper-500)",
  color: enabled ? "var(--paper-100)" : "var(--ink-500)",
  display: "grid",
  placeItems: "center",
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.55,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
});

const item: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "67px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "12px 12px",
  background: "var(--paper-100)",
  touchAction: "pan-y",
};

// 67 = ancien 56 agrandi de 20 % (retour visuel fenêtre flottante).
const thumbBase: CSSProperties = {
  width: 67,
  height: 67,
  display: "grid",
  placeItems: "center",
};

const iconWithPlus: CSSProperties = {
  position: "relative",
  display: "inline-grid",
  placeItems: "center",
  width: 28,
  height: 28,
};

const arrowBadge: CSSProperties = {
  position: "absolute",
  right: -8,
  bottom: -4,
  display: "grid",
  placeItems: "center",
  color: "inherit",
  filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))",
};

function StockageItemRowBase({
  objet,
  valeurConnue,
  atelier,
  collection,
  onTap,
  onEnvoyerAtelier,
  onEnvoyerCollection,
  isLast,
}: StockageItemRowProps) {
  const { d, tr, locale } = useLangue();
  const [dragX, setDragX] = useState(0);
  const [snapped, setSnapped] = useState<"open" | "closed">("closed");
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const axisLockedRef = useRef<"h" | "v" | null>(null);

  const baseX = snapped === "open" ? -ACTIONS_WIDTH : 0;
  const translateX = baseX + dragX;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    axisLockedRef.current = null;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!axisLockedRef.current) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        axisLockedRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
    }
    if (axisLockedRef.current !== "h") return;
    movedRef.current = true;
    const clamped = Math.max(-ACTIONS_WIDTH - baseX, Math.min(-baseX, dx));
    setDragX(clamped);
  };

  const onPointerUp = (_e: PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) {
      setDragging(false);
      return;
    }
    const finalDelta = dragX;
    const wasVerticalScroll = axisLockedRef.current === "v";
    setDragging(false);
    setDragX(0);
    startRef.current = null;
    // Si l'utilisateur a scrollé verticalement, ne pas déclencher le tap
    if (wasVerticalScroll) {
      axisLockedRef.current = null;
      return;
    }
    if (!movedRef.current || axisLockedRef.current !== "h") {
      if (Math.abs(finalDelta) < TAP_THRESHOLD) {
        onTap(objet);
      }
      return;
    }
    const totalX = baseX + finalDelta;
    if (totalX < -SNAP_THRESHOLD) setSnapped("open");
    else setSnapped("closed");
  };

  const isUnique = !!getTemplate(objet.templateId)?.unique;
  const rarityColors = getRarityColors(objet.rarete, isUnique);
  const thumbRef = useRef<HTMLDivElement>(null);

  const animateToTab = (tabPath: string) => {
    const el = thumbRef.current;
    if (!el) return;
    flyToTab({
      fromRect: el.getBoundingClientRect(),
      imageUrl: getItemImageUrl(objet.templateId),
      fallbackBg: rarityColors.thumbBg,
      borderColor: rarityColors.outer,
      targetSelector: `[data-fly-target="${tabPath}"]`,
    });
  };

  const handleAtelier = () => {
    if (!atelier.disponible) return;
    animateToTab("/atelier");
    onEnvoyerAtelier(objet);
    setSnapped("closed");
  };

  const handleCollection = () => {
    if (!collection.disponible) return;
    animateToTab("/collection");
    onEnvoyerCollection(objet);
    setSnapped("closed");
  };

  return (
    <div
      data-pager-swipe-ignore="1"
      className="broc-list-row"
      style={{
        ...wrap,
        borderBottom: isLast ? "none" : "1px dotted var(--paper-500)",
      }}
    >
      <div style={actions} aria-hidden>
        <button
          type="button"
          style={actionBtn("var(--brass-600)", atelier.disponible)}
          onClick={handleAtelier}
          disabled={!atelier.disponible}
          aria-label={d.inventaire.envoyerAtelier}
        >
          <span style={iconWithPlus}>
            <Anvil size={22} strokeWidth={1.5} />
            <span style={arrowBadge}>
              <ArrowRight size={12} strokeWidth={2.4} />
            </span>
          </span>
        </button>
        <button
          type="button"
          style={actionBtn("var(--forest-700)", collection.disponible)}
          onClick={handleCollection}
          disabled={!collection.disponible}
          aria-label={d.inventaire.envoyerCollection}
        >
          <span style={iconWithPlus}>
            <Album size={22} strokeWidth={1.5} />
            <span style={arrowBadge}>
              <ArrowRight size={12} strokeWidth={2.4} />
            </span>
          </span>
        </button>
      </div>
      <div
        style={{
          ...item,
          transform: `translateX(${translateX}px)`,
          transition: dragging ? "none" : "transform 180ms ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={thumbRef} style={thumbBase}>
          <ItemSticker
            templateId={objet.templateId}
            categorie={objet.categorie}
            fill
            tilt={false}
            variant="normal"
            thumb
            eager
          />
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              fontWeight: 700,
            }}
          >
            {nomObjet(objet, locale)}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
            aria-label={tr(d.inventaire.etatCategorieAria, {
              etat: libelleEtat(objet.etat, d),
              categorie: libelleCategorie(objet.categorie, d),
            })}
          >
            <StarRow
              filled={etoileCount(objet.etat)}
              color={rarityColors.outer}
              display="flex"
              aria-label={tr(d.chine.etatAriaLabel, {
                etat: libelleEtat(objet.etat, d),
              })}
            />
            <span
              style={{ display: "inline-flex", alignItems: "center" }}
              aria-label={tr(d.inventaire.categorieAria, {
                categorie: libelleCategorie(objet.categorie, d),
              })}
            >
              <CategorieIcon
                categorie={objet.categorie}
                size={14}
                strokeWidth={1.5}
                color="var(--brass-700)"
              />
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              color: "var(--forest-800)",
            }}
          >
            {valeurConnue ? `${Math.round(objet.prixReferenceReel)} €` : "?"}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--brass-700)",
              letterSpacing: "0.06em",
            }}
          >
            {d.inventaire.valeurMot}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mémoïsé avec un comparateur custom : `atelier` et `collection` sont des
 * objets recréés à chaque render du parent (résultats de `atelierStatus(o)` /
 * `collectionStatus(o)`) — on les compare donc par valeur. Les callbacks sont
 * comparés par référence : pour que le memo soit effectif, le parent doit les
 * stabiliser (useCallback), cf. app/(qg)/stockage/page.tsx.
 */
export const StockageItemRow = memo(
  StockageItemRowBase,
  (prev, next) =>
    prev.objet === next.objet &&
    prev.valeurConnue === next.valeurConnue &&
    prev.isLast === next.isLast &&
    prev.onTap === next.onTap &&
    prev.onEnvoyerAtelier === next.onEnvoyerAtelier &&
    prev.onEnvoyerCollection === next.onEnvoyerCollection &&
    prev.atelier.disponible === next.atelier.disponible &&
    prev.atelier.raison === next.atelier.raison &&
    prev.collection.disponible === next.collection.disponible &&
    prev.collection.necessiteConfirmation ===
      next.collection.necessiteConfirmation,
);
