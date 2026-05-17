import type { CompetenceTreeId } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { Panel } from "@/components/ui/Panel";
import { getTreeMeta } from "@/data/competences";

export interface SummaryItem {
  nom: string;
  categorie: import("@/types/game").CategorieObjet;
  prix: number;
}

interface SessionSummaryProps {
  type: "chinage" | "vente";
  titre: string;
  sousTitre?: string;
  items: SummaryItem[];
  xpGagne: Record<CompetenceTreeId, number>;
  /** Si vente : afficher un grand "Bravo!" quand toute la vitrine est écoulée. */
  bravo?: boolean;
  onRetour: () => void;
}

export function SessionSummary({
  type,
  titre,
  sousTitre,
  items,
  xpGagne,
  bravo = false,
  onRetour,
}: SessionSummaryProps) {
  const total = items.reduce((s, it) => s + it.prix, 0);
  const xpEntries = Object.entries(xpGagne).filter(([, v]) => v > 0);

  return (
    <div
      className="bg-paper-grain"
      style={{
        minHeight: "100dvh",
        padding: "40px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <Panel
          eyebrow={
            bravo
              ? "— bravo ! étal vidé —"
              : type === "chinage"
                ? "— bilan de chinage —"
                : "— bilan de la journée —"
          }
          title={titre}
        >
          {bravo && (
            <p
              style={{
                textAlign: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 17,
                color: "var(--forest-700)",
                margin: "0 0 14px",
              }}
            >
              Vous avez écoulé l'intégralité de votre étal.
            </p>
          )}
          {sousTitre && (
            <p
              style={{
                textAlign: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 15,
                color: "var(--ink-500)",
                margin: "0 0 14px",
              }}
            >
              {sousTitre}
            </p>
          )}

          <DecoDivider />

          {items.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                textAlign: "center",
                padding: "24px 0",
                margin: 0,
              }}
            >
              {type === "chinage"
                ? "Vous êtes rentré les mains vides."
                : "Aucune vente conclue."}
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "16px 0 0",
              }}
            >
              {items.map((it, i, arr) => (
                <li
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom:
                      i < arr.length - 1
                        ? "1px dotted var(--paper-500)"
                        : "none",
                  }}
                >
                  <CategorieIcon
                    categorie={it.categorie}
                    size={16}
                    color="var(--brass-700)"
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: 13,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                    }}
                  >
                    {it.nom}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 16,
                      color:
                        type === "chinage"
                          ? "var(--vermillion-600)"
                          : "var(--forest-700)",
                    }}
                  >
                    {type === "chinage" ? "−" : "+"}
                    {it.prix} €
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid rgba(138,106,38,0.35)",
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-display)",
              fontSize: 14,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            <span>{type === "chinage" ? "Total dépensé" : "Total recette"}</span>
            <span
              style={{
                color:
                  type === "chinage"
                    ? "var(--vermillion-600)"
                    : "var(--forest-700)",
              }}
            >
              {type === "chinage" ? "−" : "+"}
              {total} €
            </span>
          </div>
        </Panel>

        <Panel
          eyebrow="— expérience gagnée —"
          title={`+${xpEntries.reduce((s, [, v]) => s + v, 0)} XP`}
        >
          {xpEntries.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                textAlign: "center",
                margin: 0,
              }}
            >
              Aucune expérience gagnée cette fois-ci.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {xpEntries.map(([treeId, xp], i, arr) => {
                const meta = getTreeMeta(treeId);
                return (
                  <li
                    key={treeId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 0",
                      borderBottom:
                        i < arr.length - 1
                          ? "1px dotted var(--paper-500)"
                          : "none",
                    }}
                  >
                    {meta.categorie ? (
                      <CategorieIcon
                        categorie={meta.categorie}
                        size={16}
                        color="var(--brass-700)"
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 14,
                          color: "var(--brass-700)",
                          width: 16,
                          textAlign: "center",
                        }}
                      >
                        ◆
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: 13,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--forest-800)",
                      }}
                    >
                      {meta.nom}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "var(--forest-700)",
                      }}
                    >
                      +{xp} XP
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Button variant="primary" size="lg" onClick={onRetour}>
            Rentrer au QG
          </Button>
        </div>
      </div>
    </div>
  );
}
