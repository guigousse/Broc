"use client";

import type { CSSProperties } from "react";
import type { CategorieObjet, Objet } from "@/types/game";
import { StockageItemRow } from "@/components/mobile/StockageItemRow";
import { estVinyle } from "@/lib/anniversaire";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { CollectionStatus } from "@/lib/atelier";

interface InventoryGridProps {
  objets: Objet[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  onTapObjet: (objet: Objet) => void;
  onEnvoyerCollection: (objet: Objet) => void;
  /** Mini-tuto vinyles : main pointeuse sur le bouton Collection des vinyles. */
  mainVinyles?: boolean;
  collectionStatus: (objet: Objet) => CollectionStatus;
}

const card: CSSProperties = {
  position: "relative",
  background: "var(--paper-100)",
  // Pas de cadre propre : le panneau de la fenêtre flottante (FloatingRoom-
  // Overlay) fournit déjà la carte — un second liseré ferait une double
  // ligne. Seules les lignes séparatrices entre items (borderBottom des
  // rows) structurent la liste.
  overflow: "hidden",
};

export function InventoryGrid({
  objets,
  categoriesConnues,
  onTapObjet,
  onEnvoyerCollection,
  mainVinyles = false,
  collectionStatus,
}: InventoryGridProps) {
  const { d } = useLangue();
  if (objets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 16,
            color: "var(--ink-500)",
            marginBottom: 12,
          }}
        >
          {d.inventaire.aucunObjetCategorie}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          {d.inventaire.partezChiner}
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      {objets.map((o, i) => {
        const valeurConnue = categoriesConnues.has(o.categorie);
        return (
          <StockageItemRow
            key={o.id}
            objet={o}
            valeurConnue={valeurConnue}
            collection={collectionStatus(o)}
            onTap={onTapObjet}
            onEnvoyerCollection={onEnvoyerCollection}
            guideVinyle={mainVinyles && estVinyle(o.templateId)}
            isLast={i === objets.length - 1}
          />
        );
      })}
    </div>
  );
}
