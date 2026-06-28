"use client";

import type { CSSProperties } from "react";
import type { ObjetEnVitrine } from "@/types/game";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import { etoileCount } from "@/lib/etat";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { StarRow } from "@/components/ui/StarRow";
import { CategorieIcon } from "@/components/ui/CategorieIcon";

interface Props {
  coffre: ObjetEnVitrine[];
  onAjusterPrix: (objetId: string, prix: number) => void;
  onRetour: () => void;
  /** Action de validation (continuer le flow). Anciennement `onOuvrir`. */
  onValider: () => void;
  /** Libellé du bouton de validation. Ex : "Ouvrir l'étal · 5 €" ou "Choisir la brocante →". */
  validerLabel: string;
  /** Override de l'état actif du bouton de validation. Par défaut : coffre non vide. */
  validerActif?: boolean;
}

/** Amplitude du curseur autour du prix du marché : -100 % … +100 % (centré sur la valeur). */
const MARGE_PCT = 100;

const priceInput: CSSProperties = {
  width: 56,
  padding: "2px 4px",
  border: "1px solid var(--brass-700)",
  background: "var(--paper-100)",
  fontFamily: "var(--font-display)",
  fontSize: 15,
  textAlign: "right",
  color: "var(--forest-800)",
};

const margeLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
  marginTop: 2,
};

const boundLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  color: "var(--ink-500)",
  letterSpacing: "0.04em",
};

export function CoffrePricing({
  coffre,
  onAjusterPrix,
  onRetour,
  onValider,
  validerLabel,
  validerActif,
}: Props) {
  const peut = validerActif ?? coffre.length > 0;

  return (
    <>
      <section
        style={{
          margin: "0 12px 12px",
          border: "1px solid var(--brass-500)",
          background: "var(--paper-100)",
          padding: "10px 12px",
        }}
      >
        {coffre.map((ov, i) => {
          const isUnique = !!getTemplate(ov.objet.templateId)?.unique;
          const c = getRarityColors(ov.objet.rarete, isUnique);
          const isLast = i === coffre.length - 1;

          const ref = Math.max(1, Math.round(ov.objet.prixReferenceReel));
          const prix = ov.prixVente;
          const pct = Math.round((prix / ref - 1) * 100);
          const sliderPct = Math.min(MARGE_PCT, Math.max(-MARGE_PCT, pct));
          const pctLabel = `${pct >= 0 ? "+" : "−"}${Math.abs(pct)} %`;
          const pctColor =
            pct > 0 ? "var(--forest-700)" : pct < 0 ? "var(--vermillion-600)" : "var(--ink-500)";

          return (
            <div
              key={ov.objet.id}
              style={{
                padding: "14px 0",
                borderBottom: isLast ? "none" : "1px dotted var(--paper-500)",
              }}
            >
              {/* Ligne 1 : sticker · (nom + état/thème) · prix + marge */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ width: 56, height: 56, display: "grid", placeItems: "center" }}>
                  <ItemSticker
                    templateId={ov.objet.templateId}
                    categorie={ov.objet.categorie}
                    fill
                    tilt={false}
                    variant="normal"
                    halo={c.outer}
                    thumb
                    eager
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 12.5,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                      lineHeight: 1.15,
                    }}
                  >
                    {ov.objet.nom}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}
                    aria-label={`État ${ov.objet.etat}, catégorie ${ov.objet.categorie}`}
                  >
                    <StarRow
                      filled={etoileCount(ov.objet.etat)}
                      color={c.outer}
                      display="flex"
                      aria-label={`État : ${ov.objet.etat}`}
                    />
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                      aria-label={`Catégorie : ${ov.objet.categorie}`}
                    >
                      <CategorieIcon
                        categorie={ov.objet.categorie}
                        size={14}
                        strokeWidth={1.5}
                        color="var(--brass-700)"
                      />
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 2 }}>
                    <input
                      type="number"
                      min={1}
                      value={prix}
                      onChange={(e) =>
                        onAjusterPrix(ov.objet.id, Math.max(1, Number(e.target.value)))
                      }
                      style={priceInput}
                      aria-label={`Prix de ${ov.objet.nom}`}
                    />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--brass-700)" }}>
                      €
                    </span>
                  </div>
                  <div style={{ ...margeLabel, color: pctColor }}>{pctLabel}</div>
                </div>
              </div>

              {/* Ligne 2 : curseur borné autour de la valeur */}
              <div style={{ marginTop: 8 }}>
                <input
                  type="range"
                  min={-MARGE_PCT}
                  max={MARGE_PCT}
                  step={1}
                  value={sliderPct}
                  onChange={(e) =>
                    onAjusterPrix(
                      ov.objet.id,
                      Math.max(1, Math.round(ref * (1 + Number(e.target.value) / 100))),
                    )
                  }
                  aria-label={`Régler le prix de ${ov.objet.nom} (prix du marché ${ref} €)`}
                  style={{ width: "100%", accentColor: "var(--brass-700)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                  <span style={boundLabel}>−100 %</span>
                  <span style={boundLabel}>prix du marché {ref} €</span>
                  <span style={boundLabel}>+100 %</span>
                </div>
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
          onClick={onValider}
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
          {validerLabel}
        </button>
      </div>
    </>
  );
}
