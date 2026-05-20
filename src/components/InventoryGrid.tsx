import type { CSSProperties } from "react";
import type { CategorieObjet, Objet } from "@/types/game";
import { CategorieIcon } from "@/components/ui/CategorieIcon";

interface InventoryGridProps {
  objets: Objet[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  onAjouterVitrine?: (objet: Objet) => void;
}

const item: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px dotted var(--paper-500)",
};

const thumb: CSSProperties = {
  width: 44,
  height: 44,
  background:
    "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
  color: "var(--brass-100)",
};

const card: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "6px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export function InventoryGrid({
  objets,
  categoriesConnues,
  onAjouterVitrine,
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
          <div
            key={o.id}
            style={{
              ...item,
              borderBottom:
                i === objets.length - 1
                  ? "none"
                  : "1px dotted var(--paper-500)",
            }}
          >
            <div style={thumb}>
              <CategorieIcon
                categorie={o.categorie}
                size={20}
                strokeWidth={1.5}
                color="var(--brass-100)"
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
                {o.nom}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--ink-500)",
                  marginTop: 2,
                }}
              >
                {o.etat} · {o.rarete} · {o.categorie}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 4,
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    color: "var(--forest-800)",
                  }}
                >
                  {valeurConnue ? `${Math.round(o.prixReferenceReel)} €` : "?"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "var(--brass-700)",
                    letterSpacing: "0.06em",
                  }}
                >
                  ref.
                </div>
              </div>
              {onAjouterVitrine && !o.enRestauration && (
                <button
                  type="button"
                  onClick={() => onAjouterVitrine(o)}
                  style={{
                    padding: "4px 8px",
                    fontFamily: "var(--font-display)",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: "var(--forest-800)",
                    color: "var(--brass-300)",
                    cursor: "pointer",
                  }}
                >
                  → Étal
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
