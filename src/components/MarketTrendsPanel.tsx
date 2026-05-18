import type { CategorieObjet, Tendance } from "@/types/game";
import { PRIX_GAZETTE, numeroEdition } from "@/lib/tendances";
import { Button } from "@/components/ui/Button";

interface MarketTrendsPanelProps {
  tendances: readonly Tendance[];
  /** Tendances pré-générées de la prochaine édition. */
  prochainesTendances?: readonly Tendance[];
  jourActuel: number;
  prochainRafraichissement: number;
  /** Catégories pour lesquelles le joueur peut lire la tendance (skill Veilleur). */
  categoriesConnues: ReadonlySet<CategorieObjet>;
  /** Niveau Vision général : 0 rien, 1 = voir 1 cat de la prochaine, 2 = voir toutes. */
  niveauVision?: 0 | 1 | 2;
  /** Édition courante achetée par le joueur ? */
  achetee: boolean;
  /** Budget courant (pour griser le bouton si insuffisant). */
  budget: number;
  /** Tentative d'achat de l'édition courante. */
  onAcheter: () => void;
}

export function MarketTrendsPanel({
  tendances,
  prochainesTendances = [],
  jourActuel,
  prochainRafraichissement,
  categoriesConnues,
  niveauVision = 0,
  achetee,
  budget,
  onAcheter,
}: MarketTrendsPanelProps) {
  const safe = tendances ?? [];
  const visibles = safe.filter((t) => categoriesConnues.has(t.categorie));
  const tries = [...visibles].sort((a, b) => b.delta - a.delta);
  const masquees = safe.length - visibles.length;
  const joursAvantRefresh = Math.max(0, prochainRafraichissement - jourActuel);

  // Prévisualisation de la prochaine édition selon le niveau de Vision
  let apercu: Tendance[] = [];
  if (niveauVision >= 2) {
    apercu = [...prochainesTendances].sort(
      (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
    );
  } else if (niveauVision === 1 && prochainesTendances.length > 0) {
    const sorted = [...prochainesTendances].sort(
      (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
    );
    apercu = sorted.slice(0, 1);
  }

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

      {achetee && apercu.length > 0 && (
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
            — aperçu prochaine édition —
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {apercu.map((t, i) => (
              <li
                key={t.categorie}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "3px 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  color: "var(--ink-500)",
                  borderBottom:
                    i < apercu.length - 1
                      ? "1px dotted var(--paper-500)"
                      : "none",
                }}
              >
                <span style={{ flex: 1, paddingRight: 8, fontStyle: "italic" }}>
                  {t.categorie}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 10,
                    fontWeight: 600,
                    color:
                      t.delta >= 0 ? "var(--forest-700)" : "var(--vermillion-600)",
                  }}
                >
                  {t.delta >= 0 ? "↑" : "↓"} {t.delta > 0 ? "+" : ""}
                  {t.delta}%
                </span>
              </li>
            ))}
          </ul>
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
