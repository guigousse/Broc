import type { CompetenceTreeId } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { Panel } from "@/components/ui/Panel";
import { getTreeMeta } from "@/data/competences";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";

export interface SummaryItem {
  templateId: string;
  nom: string;
  categorie: import("@/types/game").CategorieObjet;
  prix: number;
}

interface SessionSummaryProps {
  type: "chinage" | "vente";
  titre: string;
  sousTitre?: string;
  items: SummaryItem[];
  /** XP par arbre — non vide uniquement pour un replay de vieille session (pré pool global). */
  xpGagne: Record<CompetenceTreeId, number>;
  /** XP de Brocanteur gagnée pendant la session (sessions courantes, pool global). */
  xpBrocanteur?: number;
  /** Si vente : afficher un grand "Bravo!" quand toute la vitrine est écoulée. */
  bravo?: boolean;
  /** Libellé du bouton de retour. Défaut : "Rentrer au QG". */
  retourLabel?: string;
  /** Si vrai, le panel XP affiche "Aucune expérience enregistrée pour cette
   *  session" au lieu de "Aucune expérience gagnée cette fois-ci". Utile
   *  pour les replays de sessions migrées (xpGagne vide ≠ session sans XP). */
  xpReplayMode?: boolean;
  onRetour: () => void;
}

export function SessionSummary({
  type,
  titre,
  sousTitre,
  items,
  xpGagne,
  xpBrocanteur,
  bravo = false,
  retourLabel,
  xpReplayMode = false,
  onRetour,
}: SessionSummaryProps) {
  const { d, locale } = useLangue();
  const total = items.reduce((s, it) => s + it.prix, 0);
  const xpEntries = Object.entries(xpGagne).filter(([, v]) => v > 0);
  const totalXp = xpBrocanteur ?? xpEntries.reduce((s, [, v]) => s + v, 0);

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
              ? d.vente.bilanEyebrowBravo
              : type === "chinage"
                ? d.vente.bilanEyebrowChinage
                : d.vente.bilanEyebrowVente
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
              {d.vente.bilanBravoTexte}
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
                ? d.vente.bilanChinageVide
                : d.vente.bilanVenteVide}
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
                  <ItemSticker templateId={it.templateId} categorie={it.categorie} />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                    }}
                  >
                    {nomObjet(it, locale)}
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
            <span>
              {type === "chinage" ? d.vente.bilanTotalDepense : d.vente.bilanTotalRecette}
            </span>
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

        <Panel eyebrow={d.vente.bilanEyebrowXp} title={`+${totalXp} XP`}>
          {xpEntries.length === 0 ? (
            totalXp === 0 ? (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  color: "var(--ink-500)",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                {xpReplayMode ? d.vente.bilanXpReplayVide : d.vente.bilanXpVide}
              </p>
            ) : null
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
            {retourLabel ?? d.vente.rentrerQg}
          </Button>
        </div>
      </div>
    </div>
  );
}
