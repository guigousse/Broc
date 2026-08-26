"use client";

import { memo, useRef, type CSSProperties } from "react";
import { Album, ArrowDownToLine, TrendingDown, TrendingUp } from "lucide-react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { StarRow } from "@/components/ui/StarRow";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { getTemplate } from "@/data/objetTemplates";
import { getItemThumbUrl } from "@/lib/itemImages";
import { flyToTab } from "@/lib/flyAnimation";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie, libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import type { CollectionStatus } from "@/lib/atelier";
import type { Objet } from "@/types/game";

interface StockageItemRowProps {
  objet: Objet;
  valeurConnue: boolean;
  collection: CollectionStatus;
  onTap: (objet: Objet) => void;
  onEnvoyerCollection: (objet: Objet) => void;
  /** Mini-tuto vinyles : main pointeuse sur le bouton Collection de cette ligne. */
  guideVinyle?: boolean;
  /**
   * Tutoriel (visite du stockage) : main pointeuse depuis le dessus sur le
   * bouton Collection de cette ligne (la peluche désignée). Distincte de
   * `guideVinyle` (main latérale) : le sens diffère car le libellé (prix +
   * état) occupe déjà la gauche du bouton.
   */
  guideCollection?: boolean;
  /**
   * Tutoriel (visite du stockage) : cette ligne est la cible de la visite
   * guidée en 3 temps — étoiles (état), logo (thème), bouton (collection).
   * Vrai uniquement pour la PREMIÈRE ligne pendant `stockage-focus`.
   */
  cibleCoach?: boolean;
  isLast: boolean;
}

const wrap: CSSProperties = {
  position: "relative",
  overflow: "hidden",
};

/* Piège overflow (tutoriel) : la main "tuto-main-haut" déborde au-dessus du
   bouton — si `wrap` reste en overflow:hidden pendant le guidage, la main
   est rognée par sa propre ligne avant même d'atteindre le conteneur de la
   grille. Overflow visible tant que cette ligne porte la main.
   zIndex 37 : au-dessus des lignes sœurs ET de la fenêtre flottante (35) —
   sans lui, la main restait clippée derrière la ligne du dessus (recette
   device 2026-08-09).
   `.broc-list-row` porte `content-visibility: auto` (perf, cf. globals.css)
   — qui établit un containment de PEINTURE permanent : tout ce qui dépasse
   la boîte est rogné, y compris un ::after positionné hors de la boîte,
   MALGRÉ l'overflow:visible et le zIndex ci-dessus (même piège que
   `.broc-grid-cell` dans CollectionGrid, déjà corrigé pareil). On neutralise
   le containment sur cette ligne UNIQUEMENT, en inline (plus spécifique que
   la classe). */
const wrapGuide: CSSProperties = {
  ...wrap,
  overflow: "visible",
  position: "relative",
  zIndex: 37,
  contentVisibility: "visible",
};

const item: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "67px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "12px 12px",
  background: "var(--paper-100)",
  cursor: "pointer",
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

/** Bouton collection permanent, à droite de la fiche (hors swipe-reveal). */
const collectionInlineBtn = (enabled: boolean): CSSProperties => ({
  width: 44,
  height: 44,
  border: "1px solid var(--brass-500)",
  background: enabled ? "var(--forest-700)" : "var(--paper-500)",
  color: enabled ? "var(--paper-100)" : "var(--ink-500)",
  display: "grid",
  placeItems: "center",
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.55,
  alignSelf: "center",
});

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
  collection,
  onTap,
  onEnvoyerCollection,
  guideVinyle = false,
  guideCollection = false,
  cibleCoach = false,
  isLast,
}: StockageItemRowProps) {
  const { d, tr, locale } = useLangue();

  const isUnique = !!getTemplate(objet.templateId)?.unique;
  const rarityColors = getRarityColors(objet.rarete, isUnique);
  const thumbRef = useRef<HTMLDivElement>(null);

  const animateToTab = (tabPath: string) => {
    const el = thumbRef.current;
    if (!el) return;
    flyToTab({
      fromRect: el.getBoundingClientRect(),
      imageUrl: getItemThumbUrl(objet.templateId),
      fallbackBg: rarityColors.thumbBg,
      borderColor: rarityColors.outer,
      targetSelector: `[data-fly-target="${tabPath}"]`,
    });
  };

  const handleCollection = () => {
    if (!collection.disponible) return;
    // Remplacement (confirmation à venir) : pas d'animation de vol tant que
    // le joueur n'a pas confirmé — seul le don direct fait voler l'objet.
    if (!collection.necessiteConfirmation) animateToTab("/collection");
    onEnvoyerCollection(objet);
  };

  return (
    <div
      className="broc-list-row"
      style={{
        // Même élévation/déconteneurisation pour la main du guidage
        // (guideCollection) et pour la découpe du coach (cibleCoach) : les
        // trois cibles (étoiles/thème/bouton) subissent le même piège
        // content-visibility que la main (cf. commentaire de `wrapGuide`).
        ...(guideCollection || cibleCoach ? wrapGuide : wrap),
        borderBottom: isLast ? "none" : "1px dotted var(--paper-500)",
      }}
    >
      <div style={item} onClick={() => onTap(objet)}>
        <div ref={thumbRef} style={thumbBase}>
          <ItemSticker
            templateId={objet.templateId}
            categorie={objet.categorie}
            etat={objet.etat}
            fill
            tilt={false}
            variant="normal"
            thumb
            eager
          />
        </div>
        {/* alignSelf start : le titre s'aligne sur le HAUT de la vignette. */}
        <div style={{ alignSelf: "start" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
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
              marginTop: 6,
            }}
            aria-label={tr(d.inventaire.etatCategorieAria, {
              etat: libelleEtat(objet.etat, d),
              categorie: libelleCategorie(objet.categorie, d),
            })}
          >
            {/* Wrapper porteur de l'attribut data (StarRow n'accepte pas
                d'attribut arbitraire). Surtout PAS `display: contents` :
                un élément sans boîte propre renvoie un rect 0×0 à l'origine
                et le coach plantait sa bulle dans le coin de l'écran
                (recette device 2026-08-19). En `inline-flex` autour de son
                unique enfant, le rendu est le même et la boîte existe. */}
            <span
              style={{ display: "inline-flex", alignItems: "center" }}
              data-tuto-coach={cibleCoach ? "stockage-etat" : undefined}
            >
              <StarRow
                filled={etoileCount(objet.etat)}
                color={rarityColors.outer}
                size={15}
                display="flex"
                aria-label={tr(d.chine.etatAriaLabel, {
                  etat: libelleEtat(objet.etat, d),
                })}
              />
            </span>
            <span
              data-tuto-coach={cibleCoach ? "stockage-theme" : undefined}
              style={{ display: "inline-flex", alignItems: "center" }}
              aria-label={tr(d.inventaire.categorieAria, {
                categorie: libelleCategorie(objet.categorie, d),
              })}
            >
              <CategorieIcon
                categorie={objet.categorie}
                size={17}
                strokeWidth={1.5}
                color="var(--brass-700)"
              />
            </span>
          </div>
          {/* Prix du marché sous la ligne état + thème ; libellé complet
              « Prix du marché : ? € » tant que la compétence connaisseur
              n'est pas débloquée. */}
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              color: "var(--forest-800)",
              marginTop: 4,
            }}
          >
            {valeurConnue
              ? `${Math.round(objet.prixReferenceReel)} €`
              : d.inventaire.prixMarcheInconnu}
          </div>
        </div>
        {/* Déjà donné à l'identique (même état) : pas de bouton. Sinon la
            flèche dit ce que l'envoi FERA à la collection, avant le tap :
            elle ENTRE quand la case est vide, elle MONTE quand l'exemplaire
            en place vaut moins, elle DESCEND quand il vaut plus.
            stopPropagation : ne déclenche pas le tap de la fiche (détail). */}
        {collection.dejaIdentique ? (
          <span aria-hidden style={{ width: 44 }} />
        ) : (
          <button
            type="button"
            data-tuto-coach={cibleCoach ? "stockage-bouton" : undefined}
            className={
              guideCollection
                ? "tuto-main tuto-main-haut"
                : guideVinyle
                  ? "tuto-main"
                  : undefined
            }
            style={
              guideCollection
                ? // La fenêtre flottante du stockage est à zIndex 35 : sans
                  // élévation, la main pourrait se retrouver masquée par un
                  // élément voisin porté au même niveau. On la pose au-dessus.
                  { ...collectionInlineBtn(collection.disponible), position: "relative", zIndex: 36 }
                : collectionInlineBtn(collection.disponible)
            }
            onClick={(e) => {
              e.stopPropagation();
              handleCollection();
            }}
            disabled={!collection.disponible}
            aria-label={
              !collection.necessiteConfirmation
                ? d.inventaire.envoyerCollection
                : collection.tendance === "hausse"
                  ? d.inventaire.remplacerCollectionHausse
                  : collection.tendance === "baisse"
                    ? d.inventaire.remplacerCollectionBaisse
                    : d.inventaire.remplacerCollection
            }
          >
            <span style={iconWithPlus}>
              <Album size={22} strokeWidth={1.5} />
              <span style={arrowBadge}>
                {!collection.necessiteConfirmation ? (
                  <ArrowDownToLine size={12} strokeWidth={2.4} />
                ) : collection.tendance === "baisse" ? (
                  <TrendingDown size={12} strokeWidth={2.4} />
                ) : (
                  <TrendingUp size={12} strokeWidth={2.4} />
                )}
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Mémoïsé avec un comparateur custom : `atelier` et `collection` sont des
 * objets recréés à chaque render du parent (résultats de `atelierStatus(o)` /
 * `collectionStatus(o)`) — on les compare donc par valeur. Les callbacks sont
 * comparés par référence : pour que le memo soit effectif, le parent doit les
 * stabiliser (useCallback), cf. components/mobile/reserve/StockageContenu.tsx.
 */
export const StockageItemRow = memo(
  StockageItemRowBase,
  (prev, next) =>
    prev.objet === next.objet &&
    prev.valeurConnue === next.valeurConnue &&
    prev.isLast === next.isLast &&
    prev.onTap === next.onTap &&
    prev.onEnvoyerCollection === next.onEnvoyerCollection &&
    prev.guideVinyle === next.guideVinyle &&
    prev.guideCollection === next.guideCollection &&
    prev.cibleCoach === next.cibleCoach &&
    prev.collection.disponible === next.collection.disponible &&
    prev.collection.dejaIdentique === next.collection.dejaIdentique &&
    prev.collection.necessiteConfirmation ===
      next.collection.necessiteConfirmation &&
    // La tendance décide de la FLÈCHE : l'oublier ici fige la ligne sur sa
    // première (une restauration change la tendance sans rien changer
    // d'autre dans le statut).
    prev.collection.tendance === next.collection.tendance,
);
