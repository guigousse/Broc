"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { numeroEdition } from "@/lib/tendances";
import { METEO_ICON, METEO_LABEL, descriptionEffetMeteo } from "@/data/meteos";
import { getBrocanteById } from "@/data/brocantes";
import { JOURS_SEMAINE } from "@/lib/meteo";
import type {
  CategorieObjet,
  CelebriteEvenement,
  Meteo,
  Tendance,
} from "@/types/game";

interface GazetteSheetProps {
  open: boolean;
  onClose: () => void;
  jourActuel: number;
  prochainRafraichissement: number;
  tendances: readonly Tendance[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  meteo: Meteo;
  revelerMeteo: boolean;
  celebrite: CelebriteEvenement | null;
  revelerCelebrite: boolean;
  peutInfluencer: boolean;
  influenceUtilisee: boolean;
  onRerollMeteo: () => void;
  onRerollCelebrite: () => void;
}

const sectionLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
  margin: "12px 0 6px",
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "4px 0",
  borderBottom: "1px dotted var(--paper-500)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-700)",
};

const rollBtn: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "3px 6px",
  border: "1px solid var(--brass-700)",
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  cursor: "pointer",
};

export function GazetteSheet(props: GazetteSheetProps) {
  const {
    open,
    onClose,
    jourActuel,
    prochainRafraichissement,
    tendances,
    categoriesConnues,
    meteo,
    revelerMeteo,
    celebrite,
    revelerCelebrite,
    peutInfluencer,
    influenceUtilisee,
    onRerollMeteo,
    onRerollCelebrite,
  } = props;
  const visibles = (tendances ?? []).filter((t) =>
    categoriesConnues.has(t.categorie),
  );
  const tries = [...visibles].sort((a, b) => b.delta - a.delta);
  const masquees = (tendances?.length ?? 0) - visibles.length;
  const joursAvantRefresh = Math.max(0, prochainRafraichissement - jourActuel);
  const brocanteCeleb = celebrite ? getBrocanteById(celebrite.brocanteId) : null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`La Gazette · N°${numeroEdition(jourActuel)}`}
    >
      <div style={sectionLabel}>— Tendances —</div>
      {tries.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "var(--ink-500)",
            textAlign: "center",
          }}
        >
          Aucune catégorie n'est connue. Apprenez « Veilleur » pour déchiffrer.
        </p>
      ) : (
        tries.map((t) => (
          <div key={t.categorie} style={row}>
            <span>{t.categorie}</span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color:
                  t.delta >= 0 ? "var(--forest-800)" : "var(--vermillion-600)",
              }}
            >
              {t.delta >= 0 ? "↑" : "↓"} {t.delta > 0 ? "+" : ""}
              {t.delta}%
            </span>
          </div>
        ))
      )}
      {masquees > 0 && (
        <p
          style={{
            marginTop: 6,
            textAlign: "center",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 11,
            color: "var(--ink-500)",
          }}
        >
          {masquees} autre{masquees > 1 ? "s" : ""} catégorie{masquees > 1 ? "s" : ""} restent illisibles.
        </p>
      )}

      {revelerMeteo && (
        <>
          <div style={sectionLabel}>— Bulletin météo —</div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-700)",
            }}
          >
            {(() => {
              const Icon = METEO_ICON[meteo];
              return <Icon size={24} color="var(--forest-800)" strokeWidth={1.5} />;
            })()}
            <span style={{ flex: 1 }}>
              <strong>{METEO_LABEL[meteo]}</strong> ·{" "}
              <span style={{ fontStyle: "italic", color: "var(--ink-500)" }}>
                {descriptionEffetMeteo(meteo)}
              </span>
            </span>
            {peutInfluencer && (
              <button
                type="button"
                onClick={onRerollMeteo}
                disabled={influenceUtilisee}
                style={{
                  ...rollBtn,
                  opacity: influenceUtilisee ? 0.4 : 1,
                  cursor: influenceUtilisee ? "not-allowed" : "pointer",
                }}
                title={
                  influenceUtilisee
                    ? "Influence déjà utilisée"
                    : "Reroll météo (consomme l'influence)"
                }
              >
                ↻
              </button>
            )}
          </div>
        </>
      )}

      {revelerCelebrite && celebrite && (
        <>
          <div style={sectionLabel}>— Carnet mondain —</div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 12.5,
              color: "var(--ink-700)",
            }}
          >
            <span style={{ flex: 1, lineHeight: 1.35 }}>
              <strong style={{ fontStyle: "normal" }}>{celebrite.nom}</strong>{" "}
              est annoncé(e) à{" "}
              <strong style={{ fontStyle: "normal" }}>
                {brocanteCeleb?.nom ?? "une brocante"}
              </strong>{" "}
              le{" "}
              <strong
                style={{ fontStyle: "normal", textTransform: "uppercase" }}
              >
                {JOURS_SEMAINE[celebrite.jourSemaine]}
              </strong>
              .
            </span>
            {peutInfluencer && (
              <button
                type="button"
                onClick={onRerollCelebrite}
                disabled={influenceUtilisee}
                style={{
                  ...rollBtn,
                  opacity: influenceUtilisee ? 0.4 : 1,
                  cursor: influenceUtilisee ? "not-allowed" : "pointer",
                }}
              >
                ↻
              </button>
            )}
          </div>
        </>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: "1px dotted var(--paper-500)",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        {joursAvantRefresh === 0
          ? "Prochaine édition demain"
          : `Prochaine édition dans ${joursAvantRefresh} jour${joursAvantRefresh > 1 ? "s" : ""}`}
      </div>
    </BottomSheet>
  );
}
