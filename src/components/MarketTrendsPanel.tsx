import type {
  CategorieObjet,
  CelebriteEvenement,
  Meteo,
  Tendance,
} from "@/types/game";
import { PRIX_GAZETTE, numeroEdition } from "@/lib/tendances";
import { Button } from "@/components/ui/Button";
import {
  METEO_ICON,
  METEO_LABEL,
  descriptionEffetMeteo,
} from "@/data/meteos";
import { getBrocanteById } from "@/data/brocantes";
import { JOURS_SEMAINE } from "@/lib/meteo";

interface MarketTrendsPanelProps {
  tendances: readonly Tendance[];
  jourActuel: number;
  prochainRafraichissement: number;
  /** Catégories pour lesquelles le joueur peut lire la tendance (skill Veilleur). */
  categoriesConnues: ReadonlySet<CategorieObjet>;
  /** Édition courante achetée par le joueur ? */
  achetee: boolean;
  /** Budget courant (pour griser le bouton si insuffisant). */
  budget: number;
  /** Tentative d'achat de l'édition courante. */
  onAcheter: () => void;
  /** Météo du jour (toujours stockée — affichée seulement si `revelerMeteo`). */
  meteo: Meteo;
  /** Vrai si le joueur a la compétence Bulletin météo. */
  revelerMeteo: boolean;
  /** Célébrité visitant une brocante cette édition (null si pas encore tirée). */
  celebrite: CelebriteEvenement | null;
  /** Vrai si le joueur a la compétence Carnet mondain. */
  revelerCelebrite: boolean;
  /** Vrai si le joueur a la compétence Influence (affiche les boutons reroll). */
  peutInfluencer: boolean;
  /** Vrai si l'influence a déjà été utilisée cette édition. */
  influenceUtilisee: boolean;
  onRerollMeteo: () => void;
  onRerollCelebrite: () => void;
}

export function MarketTrendsPanel({
  tendances,
  jourActuel,
  prochainRafraichissement,
  categoriesConnues,
  achetee,
  budget,
  onAcheter,
  meteo,
  revelerMeteo,
  celebrite,
  revelerCelebrite,
  peutInfluencer,
  influenceUtilisee,
  onRerollMeteo,
  onRerollCelebrite,
}: MarketTrendsPanelProps) {
  const safe = tendances ?? [];
  const visibles = safe.filter((t) => categoriesConnues.has(t.categorie));
  const tries = [...visibles].sort((a, b) => b.delta - a.delta);
  const masquees = safe.length - visibles.length;
  const joursAvantRefresh = Math.max(0, prochainRafraichissement - jourActuel);

  const brocanteCelebrite =
    celebrite ? getBrocanteById(celebrite.brocanteId) : null;

  return (
    <div
      style={{
        position: "relative",
        background: "var(--paper-100)",
        border: "1px solid var(--ink-700)",
        padding: "16px 20px 14px",
        boxShadow:
          "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px rgba(26,51,38,0.45), 3px 4px 0 rgba(40,25,5,0.10)",
        transform: "rotate(-0.4deg)",
        backgroundImage:
          "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.02) 2px 3px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          borderBottom: "1px solid var(--forest-800)",
          paddingBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 13,
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
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-500)",
          }}
        >
          N°{numeroEdition(jourActuel)}
        </span>
      </div>

      <div style={{ textAlign: "center", margin: "10px 0 4px" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--ink-900)",
            lineHeight: 1.1,
          }}
        >
          Tendances
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "var(--ink-500)",
            fontSize: 12,
            marginTop: 2,
          }}
        >
          — ce qui monte, ce qui sombre —
        </div>
      </div>

      {!achetee ? (
        <div
          style={{
            margin: "10px 0 0",
            padding: "12px 10px",
            background: "var(--paper-300)",
            border: "1px dashed var(--brass-700)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-500)",
              margin: "0 0 10px",
            }}
          >
            Cette édition n'est pas encore acquise. Procurez-vous la Gazette
            pour lire les tendances du marché.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onAcheter}
            disabled={budget < PRIX_GAZETTE}
            title={
              budget < PRIX_GAZETTE
                ? `Budget insuffisant (${PRIX_GAZETTE} € requis)`
                : "Acheter l'édition en cours"
            }
          >
            Acheter la Gazette · {PRIX_GAZETTE} €
          </Button>
        </div>
      ) : tries.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-500)",
            textAlign: "center",
            margin: "12px 0 0",
          }}
        >
          Aucune catégorie n'est encore connue. Apprenez « Veilleur » pour
          déchiffrer la Gazette.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
          {tries.map((t, i) => (
            <li
              key={t.categorie}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "5px 0",
                borderBottom:
                  i < tries.length - 1 ? "1px dotted var(--paper-500)" : "none",
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: "var(--ink-700)",
              }}
            >
              <span style={{ flex: 1, paddingRight: 8 }}>{t.categorie}</span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                  color:
                    t.delta >= 0 ? "var(--forest-800)" : "var(--vermillion-600)",
                }}
              >
                {t.delta >= 0 ? "↑" : "↓"} {t.delta > 0 ? "+" : ""}
                {t.delta}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {achetee && masquees > 0 && (
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 11,
            color: "var(--ink-500)",
            textAlign: "center",
          }}
        >
          {masquees} autre{masquees > 1 ? "s" : ""} catégorie
          {masquees > 1 ? "s" : ""} restent illisibles.
        </div>
      )}

      {revelerMeteo && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px dashed var(--brass-700)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              marginBottom: 6,
            }}
          >
            — bulletin météo —
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-700)",
            }}
          >
            {(() => {
              const Icon = METEO_ICON[meteo];
              return (
                <Icon
                  size={28}
                  strokeWidth={1.5}
                  color="var(--forest-800)"
                  aria-hidden
                />
              );
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
                title={
                  influenceUtilisee
                    ? "Influence déjà utilisée cette édition"
                    : "Reroll météo (consomme l'influence du cycle)"
                }
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "3px 6px",
                  border: "1px solid var(--brass-700)",
                  background: influenceUtilisee
                    ? "var(--paper-300)"
                    : "var(--paper-100)",
                  color: influenceUtilisee
                    ? "var(--ink-300)"
                    : "var(--forest-800)",
                  cursor: influenceUtilisee ? "not-allowed" : "pointer",
                }}
              >
                ↻
              </button>
            )}
          </div>
        </div>
      )}

      {revelerCelebrite && celebrite && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px dashed var(--brass-700)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              marginBottom: 6,
            }}
          >
            — carnet mondain —
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 8,
              fontFamily: "var(--font-serif)",
              fontSize: 12.5,
              color: "var(--ink-700)",
              fontStyle: "italic",
            }}
          >
            <span style={{ flex: 1, lineHeight: 1.35 }}>
              <strong style={{ fontStyle: "normal" }}>{celebrite.nom}</strong>{" "}
              est annoncé(e) à{" "}
              <strong style={{ fontStyle: "normal" }}>
                {brocanteCelebrite?.nom ?? "une brocante"}
              </strong>{" "}
              le{" "}
              <strong style={{ fontStyle: "normal", textTransform: "uppercase" }}>
                {JOURS_SEMAINE[celebrite.jourSemaine]}
              </strong>
              . Ce jour-là, les meilleurs marchands s'y bousculent — un regain
              de rares et de légendaires y est attendu.
            </span>
            {peutInfluencer && (
              <button
                type="button"
                onClick={onRerollCelebrite}
                disabled={influenceUtilisee}
                title={
                  influenceUtilisee
                    ? "Influence déjà utilisée cette édition"
                    : "Faire passer la célébrité dans une autre brocante"
                }
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "3px 6px",
                  border: "1px solid var(--brass-700)",
                  background: influenceUtilisee
                    ? "var(--paper-300)"
                    : "var(--paper-100)",
                  color: influenceUtilisee
                    ? "var(--ink-300)"
                    : "var(--forest-800)",
                  cursor: influenceUtilisee ? "not-allowed" : "pointer",
                }}
              >
                ↻
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 10,
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
          : `Prochaine édition dans ${joursAvantRefresh} jour${
              joursAvantRefresh > 1 ? "s" : ""
            }`}
      </div>
    </div>
  );
}
