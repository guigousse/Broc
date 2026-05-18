"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { Panel } from "@/components/ui/Panel";
import { RareteBadge } from "@/components/ui/RareteBadge";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { BROCANTES, brocantesParTier } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";
import {
  catalogueComplete,
  progressionCategorie,
  progressionGlobale,
} from "@/lib/catalogue";

export default function TropheesPage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — ouverture de la salle des trophées…
      </main>
    );
  }

  // Brocantes débloquées par tier
  const debloqueesParTier = new Map<1 | 2 | 3 | 4, Set<string>>([
    [1, new Set<string>()],
    [2, new Set<string>()],
    [3, new Set<string>()],
    [4, new Set<string>()],
  ]);
  for (const tier of [1, 2, 3, 4] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, debloqueesParTier)) {
        debloqueesParTier.get(tier)!.add(b.id);
      }
    }
  }
  const totalDebloquees =
    debloqueesParTier.get(1)!.size +
    debloqueesParTier.get(2)!.size +
    debloqueesParTier.get(3)!.size +
    debloqueesParTier.get(4)!.size;

  // Légendaires possédés (rarete legendaire avec possede > 0)
  const legendairesPossedees: { templateId: string; nom: string; categorie: typeof CATEGORIES[number] }[] =
    [];
  for (const cat of CATEGORIES) {
    for (const e of state.catalogue[cat] ?? []) {
      if (e.rarete === "legendaire" && e.possede > 0) {
        legendairesPossedees.push({
          templateId: e.templateId,
          nom: e.nom,
          categorie: e.categorie,
        });
      }
    }
  }

  // Progression globale
  const global = progressionGlobale(state.catalogue);
  const complete = catalogueComplete(state.catalogue);

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1100,
          margin: "32px auto 0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow">— salle des trophées —</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                margin: "4px 0 8px",
                lineHeight: 1.1,
              }}
            >
              Vos accomplissements
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
              }}
            >
              Le chemin parcouru et celui qui reste.
            </p>
          </div>
          <Link href="/qg">
            <Button variant="ghost" size="sm">
              ← Retour au QG
            </Button>
          </Link>
        </header>

        <DecoDivider />

        {/* TROPHÉE ULTIME */}
        <Panel
          eyebrow={complete ? "— gloire ! —" : "— quête finale —"}
          title={complete ? "Trophée du Chineur ultime" : "Trophée du Chineur ultime"}
          dark={complete}
        >
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            {complete ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 80,
                    color: "var(--brass-300)",
                    lineHeight: 1,
                    marginBottom: 12,
                  }}
                >
                  ★
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 17,
                    color: "var(--paper-200)",
                    margin: "0 0 8px",
                  }}
                >
                  Toutes les pièces de tous les catalogues sont passées entre vos
                  mains. Le métier n'a plus de secret pour vous.
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--brass-300)",
                    margin: 0,
                  }}
                >
                  {global.possedees} / {global.total} · catalogue complet
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 64,
                    color: "var(--ink-300)",
                    lineHeight: 1,
                    marginBottom: 12,
                  }}
                >
                  ☆
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 17,
                    color: "var(--ink-500)",
                    margin: "0 0 8px",
                  }}
                >
                  À conquérir : compléter les 6 catalogues à 100 %.
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--brass-700)",
                    margin: 0,
                  }}
                >
                  Progression actuelle : {global.possedees} / {global.total}
                </p>
              </>
            )}
          </div>
        </Panel>

        {/* BROCANTES DÉBLOQUÉES */}
        <Panel
          eyebrow="— terrain conquis —"
          title={`Brocantes débloquées · ${totalDebloquees} / ${BROCANTES.length}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {([1, 2, 3, 4] as const).map((tier) => {
              const list = brocantesParTier(tier);
              const dejaSet = debloqueesParTier.get(tier)!;
              return (
                <div key={tier}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      {Array.from({ length: tier }).map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          fill="var(--brass-500)"
                          color="var(--brass-700)"
                          strokeWidth={1}
                        />
                      ))}
                    </span>
                    <span style={{ marginLeft: 4 }}>
                      {tier === 4 ? "Le Salon ultime" : `Tier ${tier}`}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--brass-700)",
                      }}
                    >
                      {dejaSet.size} / {list.length}
                    </span>
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: 6,
                    }}
                  >
                    {list.map((b) => {
                      const debloquee = dejaSet.has(b.id);
                      return (
                        <li
                          key={b.id}
                          style={{
                            padding: "8px 12px",
                            background: debloquee
                              ? "var(--paper-100)"
                              : "var(--paper-300)",
                            border: `1px solid ${
                              debloquee ? "var(--brass-500)" : "var(--paper-500)"
                            }`,
                            fontFamily: "var(--font-display)",
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: debloquee
                              ? "var(--forest-800)"
                              : "var(--ink-300)",
                            opacity: debloquee ? 1 : 0.5,
                          }}
                        >
                          {b.nom}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* LÉGENDAIRES POSSÉDÉS */}
        <Panel
          eyebrow="— vitrine personnelle —"
          title={`Légendaires possédés · ${legendairesPossedees.length}`}
        >
          {legendairesPossedees.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                textAlign: "center",
                padding: "20px 0",
                margin: 0,
              }}
            >
              Aucun légendaire dans votre vitrine, pour l'instant.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 10,
              }}
            >
              {legendairesPossedees.map((l) => (
                <li
                  key={l.templateId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--paper-300)",
                    border: "1px solid var(--brass-500)",
                  }}
                >
                  <CategorieIcon
                    categorie={l.categorie}
                    size={18}
                    color="var(--brass-700)"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--forest-800)",
                        lineHeight: 1.2,
                      }}
                    >
                      {l.nom}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <RareteBadge rarete="legendaire" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* PROGRESSION PAR CATÉGORIE */}
        <Panel
          eyebrow="— catalogue —"
          title={`Progression par catégorie · ${global.possedees} / ${global.total}`}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {CATEGORIES.map((cat, i) => {
              const p = progressionCategorie(state.catalogue, cat);
              const pct = p.total > 0 ? (p.possedees / p.total) * 100 : 0;
              return (
                <li
                  key={cat}
                  style={{
                    padding: "10px 0",
                    borderBottom:
                      i < CATEGORIES.length - 1
                        ? "1px dotted var(--paper-500)"
                        : "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CategorieIcon categorie={cat} size={14} color="var(--brass-700)" />
                    <span
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--forest-800)",
                      }}
                    >
                      {cat}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--brass-700)",
                      }}
                    >
                      {p.possedees} / {p.total}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      background: "var(--paper-300)",
                      border: "1px solid var(--paper-500)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--brass-500)",
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
