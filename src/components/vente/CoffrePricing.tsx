"use client";

import type { Brocante, ObjetEnVitrine } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import { ItemImage } from "@/components/ui/ItemImage";

interface Props {
  brocante: Brocante;
  budget: number;
  coffre: ObjetEnVitrine[];
  onAjusterPrix: (objetId: string, prix: number) => void;
  onRetour: () => void;
  onOuvrir: () => void;
}

export function CoffrePricing({
  brocante,
  budget,
  coffre,
  onAjusterPrix,
  onRetour,
  onOuvrir,
}: Props) {
  const frais = fraisEntree(brocante);
  const peut = budget >= frais && coffre.length > 0;

  return (
    <>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          margin: "10px 14px 6px",
        }}
      >
        — Tarification —
      </h2>
      <section
        style={{
          margin: "0 12px 12px",
          border: "1px solid var(--brass-500)",
          background: "var(--paper-100)",
          padding: "10px 12px",
        }}
      >
        {coffre.map((ov, i) => {
          const c = getRarityColors(
            ov.objet.rarete,
            !!getTemplate(ov.objet.templateId)?.unique,
          );
          return (
            <div
              key={ov.objet.id}
              style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr auto",
                gap: 8,
                alignItems: "center",
                padding: "8px 0",
                borderBottom: i === coffre.length - 1 ? "none" : "1px dotted var(--paper-500)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: c.thumbBg,
                  border: `1px solid ${c.outer}`,
                  overflow: "hidden",
                }}
              >
                <ItemImage
                  templateId={ov.objet.templateId}
                  categorie={ov.objet.categorie}
                  fit="cover"
                  alt={ov.objet.nom}
                />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 10.5, color: "var(--forest-800)" }}>
                  {ov.objet.nom}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-500)" }}>
                  {ov.objet.etat} · {ov.objet.rarete}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  min={1}
                  value={ov.prixVente}
                  onChange={(e) => onAjusterPrix(ov.objet.id, Number(e.target.value))}
                  style={{
                    width: 56,
                    padding: "4px 6px",
                    border: "1px solid var(--brass-700)",
                    background: "var(--paper-100)",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    textAlign: "right",
                  }}
                />
                <span style={{ fontFamily: "var(--font-display)", color: "var(--brass-700)" }}>€</span>
              </div>
            </div>
          );
        })}
      </section>
      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "10px 14px calc(10px + var(--safe-bottom))",
          background: "var(--paper-100)",
          borderTop: "1px solid var(--brass-500)",
          display: "flex",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={onRetour}
          style={{
            flex: 1,
            padding: 10,
            border: "1px solid var(--brass-500)",
            background: "var(--paper-100)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          ← Coffre
        </button>
        <button
          type="button"
          disabled={!peut}
          onClick={onOuvrir}
          style={{
            flex: 2,
            padding: 10,
            border: "1px solid var(--brass-500)",
            background: peut ? "var(--forest-800)" : "var(--paper-300)",
            color: peut ? "var(--brass-300)" : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Ouvrir l&apos;étal · {frais} €
        </button>
      </div>
    </>
  );
}
