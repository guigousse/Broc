"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ItemSticker, type StickerVariant } from "@/components/ui/ItemSticker";
import { prefetchThumbs, thumbUrlsForSlots } from "@/lib/prefetchThumbs";
import { StarRow } from "@/components/ui/StarRow";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import type { Colonnes } from "@/lib/useColonnesCollection";
import type { CollectionSlot } from "@/types/game";

interface CollectionGridProps {
  slots: CollectionSlot[];
  onTap?: (slot: CollectionSlot) => void;
  /** TemplateIds présents dans l'inventaire du joueur (badge "+"). */
  enStockIds?: ReadonlySet<string>;
  /** Items par ligne (réglé par le slider de zoom). */
  colonnes?: Colonnes;
}

const starsRow: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 2,
  display: "flex",
  justifyContent: "center",
  gap: 2,
  pointerEvents: "none",
};

const newBadge: CSSProperties = {
  position: "absolute",
  top: 2,
  right: 4,
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--vermillion-600)",
  textShadow:
    "0 0 2px var(--paper-100), 0 0 4px var(--paper-100), 0 1px 2px rgba(0,0,0,0.45)",
  pointerEvents: "none",
};

/**
 * Planche proportionnelle à la taille des items : la base (16px de bois,
 * 6px d'air au-dessus, 16px entre étagères) est celle du zoom à 3 colonnes.
 */
function plancheStyle(colonnes: Colonnes): CSSProperties {
  return {
    height: Math.round(48 / colonnes),
    marginTop: Math.round(18 / colonnes),
    marginBottom: Math.round(48 / colonnes),
    background: "var(--gradient-shelf)",
    borderTop: "2px solid var(--shelf-edge)",
    boxShadow: "0 3px 5px rgba(0, 0, 0, 0.28)",
  };
}

interface CollectionCellProps {
  slot: CollectionSlot;
  onTap: (slot: CollectionSlot) => void;
  enStock: boolean;
}

/**
 * Cellule mémoïsée : ne re-rend que si son slot (référence), `enStock` ou
 * `onTap` change — la grille passe un wrapper stable (latest-ref), donc en
 * pratique seuls le slot et le booléen enStock comptent.
 *
 * Rendu « sticker » sans cadre : silhouette noire (non découvert), sticker
 * grisé (vu non possédé) ou normal (possédé). La rareté est portée par un halo
 * dégradé derrière le sticker (sauf silhouette : rareté non révélée).
 */
const CollectionCell = memo(function CollectionCell({
  slot: s,
  onTap,
  enStock,
}: CollectionCellProps) {
  const isDonne = s.donation !== null;
  const isVu = !isDonne && s.vu;
  const isSilhouette = !isDonne && !isVu;
  const showStockBadge = enStock && !isDonne;
  const showNewBadge =
    !showStockBadge && s.vu && !isDonne && s.vuDansCollection === false;
  const colors = getRarityColors(s.rarete, !!s.unique);
  const filledStars = isDonne ? etoileCount(s.donation?.etat) : 0;

  const variant: StickerVariant = isSilhouette
    ? "silhouette"
    : isVu
      ? "grise"
      : "normal";
  // Silhouette : pas de halo (rareté révélée seulement une fois découvert).
  const halo = isSilhouette ? undefined : colors.outer;

  const cellStyle: CSSProperties = {
    aspectRatio: "1 / 1",
    position: "relative",
    width: "100%",
    boxSizing: "border-box",
    border: "none",
    background: "transparent",
    padding: "12%",
    cursor: isSilhouette ? "default" : "pointer",
    display: "grid",
    placeItems: "center",
  };

  return (
    <button
      type="button"
      className="broc-grid-cell"
      onClick={() => onTap(s)}
      disabled={isSilhouette}
      aria-label={isSilhouette ? "Pièce inconnue" : s.nom}
      style={cellStyle}
    >
      <ItemSticker
        templateId={s.templateId}
        categorie={s.categorie}
        fill
        tilt={false}
        variant={variant}
        halo={halo}
        thumb
        eager
      />

      {/* Badge "+" — exemplaire en stock, pas encore donné (prioritaire sur "*") */}
      {showStockBadge && (
        <span style={newBadge} aria-label="Exemplaire disponible en stock">
          +
        </span>
      )}

      {/* Badge "*" — nouveauté pas encore consultée */}
      {showNewBadge && (
        <span style={newBadge} aria-label="Nouvellement découvert">
          *
        </span>
      )}

      {/* Étoiles d'état — uniquement si donné */}
      {isDonne && (
        <StarRow
          filled={filledStars}
          color={colors.outer}
          size={11}
          gap={2}
          emptyFill="var(--paper-100)"
          dropShadow
          display="flex"
          style={starsRow}
          aria-label={`État : ${s.donation?.etat}`}
        />
      )}
    </button>
  );
});

export function CollectionGrid({
  slots,
  onTap,
  enStockIds,
  colonnes = 3,
}: CollectionGridProps) {
  // Wrapper stable (pattern latest-ref) : même si le parent passe une arrow
  // function inline recréée à chaque render, les cellules mémoïsées gardent
  // une référence stable et ne re-rendent que quand leur slot change.
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const stableOnTap = useCallback(
    (slot: CollectionSlot) => onTapRef.current?.(slot),
    [],
  );

  const rangees: CollectionSlot[][] = [];
  for (let i = 0; i < slots.length; i += colonnes) {
    rangees.push(slots.slice(i, i + colonnes));
  }

  // Warm-up : réchauffe le cache HTTP des vignettes affichées (octets seulement,
  // pas de décodage → iOS-safe). Suit le filtre catégorie via `slots`.
  useEffect(() => {
    prefetchThumbs(thumbUrlsForSlots(slots));
  }, [slots]);

  const planche = plancheStyle(colonnes);

  // ─── Virtualisation par rangée ───────────────────────────────────────────
  // La grille rend potentiellement tout le catalogue (centaines d'items).
  // Sans fenêtrage, chaque image se décode en mémoire et le coût des filtres
  // CSS s'accumule → saccades et, sous iOS, rechargement du WebView. On ne
  // monte donc que les rangées visibles (le document scrolle au niveau window).
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    const top = parentRef.current?.offsetTop ?? 0;
    setScrollMargin((prev) => (prev !== top ? top : prev));
  });

  const estimateRow = useCallback(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 390;
    const cell = w / colonnes; // cellule ~carrée, grille pleine largeur
    const espacePlanche =
      Math.round(48 / colonnes) +
      Math.round(18 / colonnes) +
      Math.round(48 / colonnes);
    return Math.round(cell + espacePlanche);
  }, [colonnes]);

  const virtualizer = useWindowVirtualizer({
    count: rangees.length,
    estimateSize: estimateRow,
    overscan: 8,
    scrollMargin,
    getItemKey: (i) => rangees[i][0].templateId,
  });

  // Le zoom change la hauteur des rangées → recalcule les positions.
  useLayoutEffect(() => {
    virtualizer.measure();
  }, [colonnes, virtualizer]);

  return (
    <div ref={parentRef}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: virtualizer.getTotalSize(),
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const rangee = rangees[item.index];
          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${item.start - scrollMargin}px)`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${colonnes}, 1fr)`,
                  gap: "var(--gutter)",
                  padding: "0 var(--gutter)",
                }}
              >
                {rangee.map((s) => (
                  <CollectionCell
                    key={s.templateId}
                    slot={s}
                    onTap={stableOnTap}
                    enStock={enStockIds?.has(s.templateId) ?? false}
                  />
                ))}
              </div>
              {/* Planche d'étagère sous la rangée */}
              <div aria-hidden data-testid="planche" style={planche} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
