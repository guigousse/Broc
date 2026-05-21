"use client";

import type { CSSProperties } from "react";
import { numeroEdition } from "@/lib/tendances";
import { METEO_ICON, METEO_LABEL } from "@/data/meteos";
import { JOURS_SEMAINE } from "@/lib/meteo";
import type {
  CategorieObjet,
  CelebriteEvenement,
  Meteo,
  Tendance,
} from "@/types/game";

interface GazetteTeaserProps {
  achetee: boolean;
  jourActuel: number;
  tendances: readonly Tendance[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  meteo: Meteo;
  revelerMeteo: boolean;
  celebrite: CelebriteEvenement | null;
  revelerCelebrite: boolean;
  onOuvrir: () => void;
  onAcheter: () => void;
  budget: number;
  prixGazette: number;
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--forest-800)",
  background: "var(--paper-100)",
  padding: "10px 12px",
  boxShadow:
    "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px rgba(26,51,38,0.35)",
  backgroundImage:
    "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.025) 2px 3px)",
};

export function GazetteTeaser(props: GazetteTeaserProps) {
  const {
    achetee,
    jourActuel,
    tendances,
    categoriesConnues,
    meteo,
    revelerMeteo,
    celebrite,
    revelerCelebrite,
    onOuvrir,
    onAcheter,
    budget,
    prixGazette,
  } = props;

  const visibles = (tendances ?? []).filter((t) =>
    categoriesConnues.has(t.categorie),
  );
  const dominante = [...visibles].sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
  )[0];

  return (
    <article style={{ ...cardStyle, position: "relative" }}>
      {achetee && (
        <button
          type="button"
          onClick={onOuvrir}
          aria-label="Lire la Gazette"
          style={{
            position: "absolute",
            inset: 0,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            zIndex: 1,
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 2, pointerEvents: achetee ? "none" : "auto" }}>
        {/* header : titre + N° édition */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: "1px solid var(--forest-800)",
            paddingBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
            }}
          >
            La Gazette des Chineurs
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--ink-500)",
              letterSpacing: "0.1em",
            }}
          >
            N°{numeroEdition(jourActuel)}
          </span>
        </div>

        {!achetee ? (
          <div style={{ marginTop: 10 }}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 12.5,
                color: "var(--ink-500)",
                margin: "0 0 8px",
              }}
            >
              Édition non acquise.
            </p>
            <button
              type="button"
              onClick={onAcheter}
              disabled={budget < prixGazette}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "var(--forest-800)",
                color: "var(--brass-300)",
                border: "1px solid var(--brass-500)",
                fontFamily: "var(--font-display)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: budget < prixGazette ? "not-allowed" : "pointer",
                opacity: budget < prixGazette ? 0.45 : 1,
              }}
            >
              Acheter · {prixGazette} €
            </button>
          </div>
        ) : (
          <>
            {dominante && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink-700)",
                  }}
                >
                  {dominante.categorie}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    color:
                      dominante.delta >= 0
                        ? "var(--forest-700)"
                        : "var(--vermillion-600)",
                  }}
                >
                  {dominante.delta >= 0 ? "↑" : "↓"} {dominante.delta > 0 ? "+" : ""}
                  {dominante.delta}%
                </span>
              </div>
            )}
            {revelerMeteo && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "var(--ink-500)",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                {(() => {
                  const Icon = METEO_ICON[meteo];
                  return (
                    <Icon size={14} color="var(--forest-800)" strokeWidth={1.5} />
                  );
                })()}
                {METEO_LABEL[meteo]}
              </div>
            )}
            {revelerCelebrite && celebrite && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "var(--ink-500)",
                }}
              >
                ✦ {celebrite.nom} · {JOURS_SEMAINE[celebrite.jourSemaine]}
              </div>
            )}
            <div
              style={{
                textAlign: "right",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
                marginTop: 6,
              }}
            >
              Lire la Gazette ›
            </div>
          </>
        )}
      </div>
    </article>
  );
}
