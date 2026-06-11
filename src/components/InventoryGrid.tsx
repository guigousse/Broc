import type { CSSProperties } from "react";
import type { CategorieObjet, Objet } from "@/types/game";
import { StockageItemRow } from "@/components/mobile/StockageItemRow";
import type { AtelierStatus, CollectionStatus } from "@/lib/atelier";

interface InventoryGridProps {
  objets: Objet[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  onTapObjet: (objet: Objet) => void;
  onEnvoyerAtelier: (objet: Objet) => void;
  onEnvoyerCollection: (objet: Objet) => void;
  atelierStatus: (objet: Objet) => AtelierStatus;
  collectionStatus: (objet: Objet) => CollectionStatus;
}

const card: CSSProperties = {
  position: "relative",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  // Padding interne pour que les rows ne touchent ni les bords ni le filet
  // intérieur dessiné par le boxShadow (3px) — on laisse 6px de marge.
  padding: "6px 6px",
  // Le boxShadow inset reste devant car il appartient à l'élément parent qui
  // empile au-dessus des descendants statiques ; pour garantir la priorité on
  // ne fait pas dépasser les enfants via overflow: hidden.
  overflow: "hidden",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export function InventoryGrid({
  objets,
  categoriesConnues,
  onTapObjet,
  onEnvoyerAtelier,
  onEnvoyerCollection,
  atelierStatus,
  collectionStatus,
}: InventoryGridProps) {
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
          Aucun objet dans cette catégorie.
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
          Partez chiner pour la garnir.
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
            atelier={atelierStatus(o)}
            collection={collectionStatus(o)}
            onTap={onTapObjet}
            onEnvoyerAtelier={onEnvoyerAtelier}
            onEnvoyerCollection={onEnvoyerCollection}
            isLast={i === objets.length - 1}
          />
        );
      })}
    </div>
  );
}
