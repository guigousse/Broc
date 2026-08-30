"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  decalageDansParentDefilant,
  trouverParentDefilant,
} from "@/lib/parentDefilant";
import { PELUCHE_TEMPLATE_ID } from "@/data/tutorielScenario";
import { ItemSticker, type StickerVariant } from "@/components/ui/ItemSticker";
import { prefetchThumbs, thumbUrlsForSlots } from "@/lib/prefetchThumbs";
import { StarRow } from "@/components/ui/StarRow";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { CATEGORIES } from "@/data/categories";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import type { CategorieObjet, CollectionSlot } from "@/types/game";

/**
 * Case injectée en tête d'une catégorie (tuiles Classeur/Album, Tâche 13) :
 * pas un `CollectionSlot`, rendue telle quelle par `Rangee`.
 */
export interface CaseSpeciale {
  key: string;
  categorie: CategorieObjet;
  element: ReactNode;
}

/** Cellule interne de la grille : un slot de collection ou une case spéciale. */
type Cellule =
  | { kind: "slot"; slot: CollectionSlot }
  | { kind: "special"; key: string; element: ReactNode };

function celluleKey(c: Cellule): string {
  return c.kind === "slot" ? c.slot.templateId : c.key;
}

/** Items par ligne. La page Collection s'en tient au défaut (5). */
export type Colonnes = 1 | 2 | 3 | 4 | 5;

const COLONNES_PAR_DEFAUT: Colonnes = 5;

interface CollectionGridProps {
  slots: CollectionSlot[];
  onTap?: (slot: CollectionSlot) => void;
  /** TemplateIds présents dans l'inventaire du joueur (badge "+"). */
  enStockIds?: ReadonlySet<string>;
  colonnes?: Colonnes;
  /**
   * Optionnel (tutoriel) : au montage / changement, défile jusqu'à la
   * rangée contenant ce templateId et la centre. `null`/absent hors leçon.
   */
  scrollVersTemplateId?: string | null;
  /**
   * Optionnel (tutoriel) : la case dont le templateId correspond porte la
   * main pointeuse (au-dessus, `tuto-main tuto-main-haut`).
   */
  mainTemplateId?: string | null;
  /**
   * Optionnel (Tâche 13) : cases injectées en tête de leur catégorie (tuiles
   * Classeur de cartes / Album de timbres). Catégorie absente de `slots` ET
   * de `casesSpeciales` = ignorée ; l'ordre suit `CATEGORIES`.
   */
  casesSpeciales?: CaseSpeciale[];
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
  /** Tutoriel : ce templateId porte la main pointeuse au-dessus de sa case. */
  mainTemplateId?: string | null;
}

/**
 * Cellule mémoïsée : ne re-rend que si son slot (référence), `enStock` ou
 * `onTap` change — la grille passe un wrapper stable (latest-ref), donc en
 * pratique seuls le slot et le booléen enStock comptent.
 *
 * Rendu « sticker » sans cadre : silhouette noire (non découvert), sticker
 * grisé (vu non possédé) ou normal (possédé). La rareté n'est plus signalée
 * par un halo dans la grille (coûteux au scroll) ; elle reste lisible dans
 * l'overlay détail et via les étoiles d'état.
 */
const CollectionCell = memo(function CollectionCell({
  slot: s,
  onTap,
  enStock,
  mainTemplateId,
}: CollectionCellProps) {
  const { d, tr, locale } = useLangue();
  const isDonne = s.donation !== null;
  const isVu = !isDonne && s.vu;
  const isSilhouette = !isDonne && !isVu;
  const showStockBadge = enStock && !isDonne;
  const showNewBadge =
    !showStockBadge && s.vu && !isDonne && s.vuDansCollection === false;
  const colors = getRarityColors(s.rarete, !!s.unique);
  const filledStars = isDonne ? etoileCount(s.donation?.etat) : 0;
  const estCibleMain = mainTemplateId != null && s.templateId === mainTemplateId;

  const variant: StickerVariant = isSilhouette
    ? "silhouette"
    : isVu
      ? "grise"
      : "normal";

  const cellStyle: CSSProperties = {
    aspectRatio: "1 / 1",
    position: "relative",
    width: "100%",
    // min-width:0 → la cellule (grid item) peut rétrécir sous le min-content de
    // son image. Sans ça, la largeur intrinsèque de la vignette empêche la
    // cellule de passer sous une certaine taille et la 5e colonne déborde, même
    // avec des pistes en minmax(0,1fr).
    minWidth: 0,
    boxSizing: "border-box",
    border: "none",
    background: "transparent",
    padding: "12%",
    cursor: isSilhouette ? "default" : "pointer",
    display: "grid",
    placeItems: "center",
    // Au-dessus des rangées voisines : la main pointeuse (tuto-main-haut)
    // déborde par le haut de la case et doit rester visible par-dessus.
    //
    // `.broc-grid-cell` porte `content-visibility: auto` (perf, cf.
    // globals.css) — qui établit un containment de PEINTURE permanent
    // (pas seulement le "skip" hors-écran) : tout ce qui dépasse la
    // padding-box de la case est rogné, y compris un ::after positionné
    // hors de la boîte (même piège que l'overflow:hidden de
    // StockageItemRow). La main de cette case précise serait donc
    // invisible (prouvé Playwright : pixel [255,255,255] avec la
    // déclaration, [255,0,0] sans). On neutralise le containment sur
    // cette case UNIQUEMENT, en inline (plus spécifique que la classe).
    ...(estCibleMain ? { zIndex: 2, contentVisibility: "visible" } : {}),
  };

  return (
    <button
      type="button"
      className={
        estCibleMain ? "broc-grid-cell tuto-main tuto-main-haut" : "broc-grid-cell"
      }
      onClick={() => onTap(s)}
      disabled={isSilhouette}
      aria-label={isSilhouette ? d.inventaire.pieceInconnue : nomObjet(s, locale)}
      style={cellStyle}
      data-tuto-coach={
        s.templateId === PELUCHE_TEMPLATE_ID ? "collection-case" : undefined
      }
    >
      <ItemSticker
        templateId={s.templateId}
        categorie={s.categorie}
        // L'état vient de la DONATION : c'est l'exemplaire donné qui est
        // exposé sur l'étagère. La variante « grise » (vu, pas possédé)
        // annule l'éclat côté ItemSticker.
        etat={s.donation?.etat}
        fill
        tilt={false}
        variant={variant}
        thumb
        eager
      />

      {/* Badge "+" — exemplaire en stock, pas encore donné (prioritaire sur "*") */}
      {showStockBadge && (
        <span style={newBadge} aria-label={d.inventaire.exemplaireEnStock}>
          +
        </span>
      )}

      {/* Badge "*" — nouveauté pas encore consultée */}
      {showNewBadge && (
        <span style={newBadge} aria-label={d.inventaire.nouvellementDecouvert}>
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
          aria-label={tr(d.chine.etatAriaLabel, {
            etat: s.donation ? libelleEtat(s.donation.etat, d) : "",
          })}
        />
      )}
    </button>
  );
});

interface RangeeProps {
  rangee: Cellule[];
  colonnes: Colonnes;
  planche: CSSProperties;
  onTap: (slot: CollectionSlot) => void;
  enStockIds?: ReadonlySet<string>;
  mainTemplateId?: string | null;
}

/** Une rangée d'items posée sur sa planche d'étagère. */
function Rangee({
  rangee,
  colonnes,
  planche,
  onTap,
  enStockIds,
  mainTemplateId,
}: RangeeProps) {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))`,
          gap: "var(--gutter)",
          padding: "0 var(--gutter)",
          boxSizing: "border-box",
        }}
      >
        {rangee.map((c) =>
          c.kind === "slot" ? (
            <CollectionCell
              key={c.slot.templateId}
              slot={c.slot}
              onTap={onTap}
              enStock={enStockIds?.has(c.slot.templateId) ?? false}
              mainTemplateId={mainTemplateId}
            />
          ) : (
            <Fragment key={c.key}>{c.element}</Fragment>
          ),
        )}
      </div>
      {/* Planche d'étagère sous la rangée */}
      <div aria-hidden data-testid="planche" style={planche} />
    </>
  );
}

export function CollectionGrid({
  slots,
  onTap,
  enStockIds,
  colonnes = COLONNES_PAR_DEFAUT,
  scrollVersTemplateId,
  mainTemplateId,
  casesSpeciales,
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

  // Liste aplatie : chaque case spéciale est insérée en tête de sa catégorie
  // (ordre `CATEGORIES`), avant les slots de cette même catégorie. Sans case
  // spéciale, identique à `slots` (référence stable si `slots` ne change pas).
  const cellules: Cellule[] = useMemo(() => {
    if (!casesSpeciales || casesSpeciales.length === 0) {
      return slots.map((slot): Cellule => ({ kind: "slot", slot }));
    }
    const categoriesEnJeu = CATEGORIES.filter(
      (cat) =>
        slots.some((s) => s.categorie === cat) ||
        casesSpeciales.some((cs) => cs.categorie === cat),
    );
    const acc: Cellule[] = [];
    for (const cat of categoriesEnJeu) {
      for (const cs of casesSpeciales.filter((c) => c.categorie === cat)) {
        acc.push({ kind: "special", key: cs.key, element: cs.element });
      }
      for (const s of slots.filter((s) => s.categorie === cat)) {
        acc.push({ kind: "slot", slot: s });
      }
    }
    return acc;
  }, [slots, casesSpeciales]);

  const rangees: Cellule[][] = useMemo(() => {
    const acc: Cellule[][] = [];
    for (let i = 0; i < cellules.length; i += colonnes) {
      acc.push(cellules.slice(i, i + colonnes));
    }
    return acc;
  }, [cellules, colonnes]);

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
  // monte donc que les rangées visibles.
  //
  // Le fenêtrage suit le CONTENEUR défilant (le <main> du MobileLayout), pas
  // `window` : le body du jeu est verrouillé (position: fixed, cf. globals.css)
  // et la fenêtre ne défile jamais. Branché sur window, le virtualiseur restait
  // à l'offset 0 et la collection s'arrêtait après quelques rangées.
  const parentRef = useRef<HTMLDivElement>(null);
  // `undefined` = pas encore résolu (avant le premier layout effect),
  // `null` = aucun ancêtre défilant → rien à fenêtrer, on rend tout.
  const [scrollEl, setScrollEl] = useState<HTMLElement | null | undefined>(
    undefined,
  );
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (parentRef.current) setScrollEl(trouverParentDefilant(parentRef.current));
  }, []);

  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el || !scrollEl) return;
    const top = decalageDansParentDefilant(el, scrollEl);
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

  const virtualizer = useVirtualizer({
    count: rangees.length,
    getScrollElement: () => scrollEl ?? null,
    estimateSize: estimateRow,
    overscan: 8,
    scrollMargin,
    getItemKey: (i) => celluleKey(rangees[i][0]),
  });

  // Le zoom change la hauteur des rangées → recalcule les positions.
  useLayoutEffect(() => {
    virtualizer.measure();
  }, [colonnes, virtualizer]);

  // ─── Scroll auto (tutoriel) ───────────────────────────────────────────────
  // Le virtualiseur est local à ce composant : c'est le bon endroit pour
  // résoudre l'index de rangée d'un templateId ciblé et y défiler.
  const indexRangeeCible = useMemo(() => {
    if (!scrollVersTemplateId) return null;
    for (let i = 0; i < rangees.length; i++) {
      if (
        rangees[i].some(
          (c) => c.kind === "slot" && c.slot.templateId === scrollVersTemplateId,
        )
      ) {
        return i;
      }
    }
    return null;
  }, [rangees, scrollVersTemplateId]);

  useEffect(() => {
    if (indexRangeeCible === null || !scrollEl) return;
    virtualizer.scrollToIndex(indexRangeeCible, { align: "center" });
  }, [indexRangeeCible, scrollEl, virtualizer]);

  // Aucun conteneur défilant (hors MobileLayout, tests) : pas de repère pour
  // fenêtrer — on rend la grille entière plutôt que de la tronquer.
  if (scrollEl === null) {
    return (
      <div ref={parentRef}>
        {rangees.map((rangee) => (
          <Rangee
            key={celluleKey(rangee[0])}
            rangee={rangee}
            colonnes={colonnes}
            planche={planche}
            onTap={stableOnTap}
            enStockIds={enStockIds}
            mainTemplateId={mainTemplateId}
          />
        ))}
      </div>
    );
  }

  return (
    <div ref={parentRef}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: virtualizer.getTotalSize(),
        }}
      >
        {virtualizer.getVirtualItems().map((item) => (
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
            <Rangee
              rangee={rangees[item.index]}
              colonnes={colonnes}
              planche={planche}
              onTap={stableOnTap}
              enStockIds={enStockIds}
              mainTemplateId={mainTemplateId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
