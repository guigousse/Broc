"use client";

import type { CSSProperties } from "react";
import { ItemCard } from "@/components/ui/ItemCard";
import { getVendeurIllustration } from "@/lib/personaIllustrations";
import { VENDEUR_MYSTERE_ILLUSTRATION } from "@/lib/boiteMystere";
import type { ObjetEnVente } from "@/types/game";

/** Une carte du carrousel de chinage : un objet à négocier, ou le vendeur mystère. */
export type ChineSlide =
  | { kind: "item"; item: ObjetEnVente; estRareOuPlus: boolean }
  | { kind: "mystere" };

const moitieHaute: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const moitieBasse: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: 16,
  borderTop: "2px solid var(--brass-500)",
  background: "var(--forest-800)",
};

const btnBase: CSSProperties = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "2px solid var(--brass-500)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  cursor: "pointer",
};

function btn(disabled: boolean): CSSProperties {
  return {
    ...btnBase,
    background: disabled ? "var(--forest-700)" : "var(--brass-500)",
    color: disabled ? "var(--brass-700)" : "var(--forest-900)",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function ChineSlideVue({
  slide,
  budget,
  plein,
  boiteReclamee,
  onAcheter,
  onNegocier,
  onOuvrirBoite,
}: {
  slide: ChineSlide;
  budget: number;
  plein: boolean;
  boiteReclamee: boolean;
  onAcheter: (item: ObjetEnVente) => void;
  onNegocier: (item: ObjetEnVente) => void;
  onOuvrirBoite: () => void;
}) {
  if (slide.kind === "mystere") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={moitieHaute}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={VENDEUR_MYSTERE_ILLUSTRATION}
            alt="Vendeur mystère"
            style={{ maxHeight: "100%", maxWidth: "100%", borderRadius: 12 }}
          />
        </div>
        <div style={moitieBasse}>
          <strong style={{ color: "var(--brass-300)", fontFamily: "var(--font-display)" }}>
            Vendeur mystère
          </strong>
          {boiteReclamee ? (
            <span style={{ color: "var(--brass-200)", fontSize: 13 }}>
              Boîte déjà ouverte.
            </span>
          ) : plein ? (
            <span style={{ color: "var(--vermillion-600)", fontSize: 13, fontFamily: "var(--font-display)" }}>
              Stockage plein
            </span>
          ) : (
            <button type="button" style={btn(false)} onClick={onOuvrirBoite}>
              Regarder une pub pour ouvrir
            </button>
          )}
        </div>
      </div>
    );
  }

  const { item } = slide;
  const { objet, prixVendeur, statut } = item;
  const acquis = statut === "achete";
  const fache = item.negociation?.statut === "fache";
  const tropCher = budget < prixVendeur;
  const acheterDisabled = acquis || tropCher || plein;
  const illustrationVendeur = getVendeurIllustration(item.persona.archetype);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={moitieHaute}>
        <div style={{ width: "100%", maxWidth: 240 }}>
          <ItemCard
            templateId={objet.templateId}
            categorie={objet.categorie}
            etat={objet.etat}
            rarete={objet.rarete}
            nom={objet.nom}
            dimmed={acquis}
          />
          <div
            style={{
              textAlign: "center",
              marginTop: 8,
              fontFamily: "var(--font-display)",
              color: "var(--ink-700)",
              fontSize: 15,
            }}
          >
            {prixVendeur} €
          </div>
        </div>
      </div>
      <div style={moitieBasse}>
        {illustrationVendeur && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={illustrationVendeur}
            alt="Vendeur"
            style={{ height: 96, width: "auto", borderRadius: 8 }}
          />
        )}
        {acquis ? (
          <span style={{ color: "var(--brass-200)", fontSize: 14 }}>— Acquis —</span>
        ) : fache ? (
          <span style={{ color: "var(--vermillion-600)", fontSize: 13, fontFamily: "var(--font-display)" }}>
            Vendeur fâché
          </span>
        ) : plein ? (
          <span style={{ color: "var(--vermillion-600)", fontSize: 13, fontFamily: "var(--font-display)" }}>
            Stockage plein
          </span>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={btn(false)} onClick={() => onNegocier(item)}>
              Négocier
            </button>
            <button
              type="button"
              style={btn(acheterDisabled)}
              disabled={acheterDisabled}
              onClick={() => onAcheter(item)}
            >
              Acheter {prixVendeur} €
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
