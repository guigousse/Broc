"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { CategorieAccordion } from "@/components/ui/CategorieAccordion";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { EtatBadge } from "@/components/ui/EtatBadge";
import { CATEGORIES } from "@/data/categories";
import type { CategorieObjet } from "@/types/game";
import { Panel } from "@/components/ui/Panel";
import { useGame } from "@/context/GameContext";
import {
  CAPACITE_MAX_GLOBALE,
  STAND_LEVELS,
  niveauRequis,
} from "@/data/standLevels";
import { aConnaisseurTendance, aConnaisseurVitrine } from "@/lib/competences";
import type { Objet, ObjetEnVitrine } from "@/types/game";

const SUGGESTION_FACTEUR = 1.4;

function suggererPrix(objet: Objet): number {
  return Math.max(1, Math.round(objet.prixReferenceReel * SUGGESTION_FACTEUR));
}

export default function VitrinePage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    mettreEnVitrine,
    retirerDeVitrine,
    ajusterPrixVitrine,
    ajusterBudget,
  } = useGame();

  // Prix saisis pour les objets de l'inventaire pas encore mis en vitrine
  const [prixInput, setPrixInput] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const standActuel = useMemo(
    () => (state ? niveauRequis(state.vitrine.length || 1) : null),
    [state],
  );

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
        — préparation de l'étal…
      </main>
    );
  }

  const surcharge = state.vitrine.length > CAPACITE_MAX_GLOBALE;
  const peutOuvrir =
    state.vitrine.length > 0 &&
    standActuel !== null &&
    state.budget >= standActuel.loyer &&
    !surcharge;

  const handleAjouter = (objet: Objet) => {
    const prix = prixInput[objet.id] ?? suggererPrix(objet);
    mettreEnVitrine(objet.id, prix);
    setPrixInput((prev) => {
      const { [objet.id]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleOuvrir = () => {
    if (!standActuel || !peutOuvrir) return;
    ajusterBudget(-standActuel.loyer);
    router.push("/vitrine/journee");
  };

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1280,
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
            <div className="eyebrow">— mise en place —</div>
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
              Préparer la vitrine
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
              Choisissez les pièces à présenter, fixez leur prix. La taille du
              stand est déterminée par le nombre d'objets exposés.
            </p>
          </div>
          <Link href="/qg">
            <Button variant="ghost" size="sm">
              ← Retour au QG
            </Button>
          </Link>
        </header>

        <DecoDivider />

        <TendancesHint
          tendances={state.tendances.filter((t) =>
            aConnaisseurTendance(state, t.categorie),
          )}
        />

        {/* Récap stand */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          {STAND_LEVELS.map((s) => {
            const actif = standActuel?.niveau === s.niveau;
            return (
              <div
                key={s.niveau}
                style={{
                  position: "relative",
                  padding: "14px 16px",
                  background: actif ? "var(--forest-800)" : "var(--paper-100)",
                  border: `1px solid ${
                    actif ? "var(--brass-500)" : "var(--brass-700)"
                  }`,
                  boxShadow: actif
                    ? "inset 0 0 0 3px var(--forest-800), inset 0 0 0 4px var(--brass-500)"
                    : "0 2px 0 var(--paper-400)",
                  color: actif ? "var(--paper-200)" : "var(--ink-700)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: actif ? "var(--brass-300)" : "var(--brass-700)",
                  }}
                >
                  Niveau {s.niveau}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  {s.nom}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    marginTop: 6,
                    color: actif ? "var(--paper-300)" : "var(--ink-500)",
                  }}
                >
                  {s.capaciteMin}–{s.capaciteMax} obj. · loyer {s.loyer} €
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          {/* Stock disponible */}
          <Panel
            eyebrow="— stock —"
            title={`Inventaire · ${state.inventaireJoueur.length} obj.`}
          >
            {state.inventaireJoueur.filter((o) => !o.enRestauration).length === 0 ? (
              <EmptyState
                title="Plus rien à exposer."
                hint="Partez chiner pour reconstituer votre stock."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groupByCategorie(state.inventaireJoueur.filter((o) => !o.enRestauration), (o) => o.categorie).map(
                  ([cat, list]) => (
                    <CategorieAccordion
                      key={cat}
                      categorie={cat}
                      compte={list.length}
                    >
                      <ul
                        style={{ listStyle: "none", padding: 0, margin: 0 }}
                      >
                        {list.map((o) => {
                          const prixSuggere = suggererPrix(o);
                          const prixCourant = prixInput[o.id] ?? prixSuggere;
                          const voitRef = aConnaisseurVitrine(state, o.categorie);
                          return (
                            <StockRow
                              key={o.id}
                              objet={o}
                              voitRef={voitRef}
                              prixCourant={prixCourant}
                              onChangerPrix={(v) =>
                                setPrixInput((prev) => ({ ...prev, [o.id]: v }))
                              }
                              onExposer={() => handleAjouter(o)}
                            />
                          );
                        })}
                      </ul>
                    </CategorieAccordion>
                  ),
                )}
              </div>
            )}
          </Panel>

          {/* Vitrine en cours */}
          <Panel
            eyebrow="— sur l'étal —"
            title={`Vitrine · ${state.vitrine.length} obj.`}
          >
            {state.vitrine.length === 0 ? (
              <EmptyState
                title="L'étal est nu."
                hint="Ajoutez des objets depuis votre stock."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groupByCategorie(state.vitrine, (e) => e.objet.categorie).map(
                  ([cat, list]) => (
                    <CategorieAccordion
                      key={cat}
                      categorie={cat}
                      compte={list.length}
                    >
                      <ul
                        style={{ listStyle: "none", padding: 0, margin: 0 }}
                      >
                        {list.map((e) => (
                          <VitrineRow
                            key={e.objet.id}
                            entree={e}
                            voitRef={aConnaisseurVitrine(state, e.objet.categorie)}
                            onPrix={(v) => ajusterPrixVitrine(e.objet.id, v)}
                            onRetirer={() => retirerDeVitrine(e.objet.id)}
                          />
                        ))}
                      </ul>
                    </CategorieAccordion>
                  ),
                )}
              </div>
            )}

            {standActuel && (
              <footer
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(138,106,38,0.35)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-500)",
                  }}
                >
                  <span>Stand requis</span>
                  <span style={{ color: "var(--forest-800)" }}>
                    {standActuel.nom} · {standActuel.loyer} € de loyer
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleOuvrir}
                  disabled={!peutOuvrir}
                >
                  Ouvrir la journée · {standActuel.loyer} €
                </Button>
                {state.budget < standActuel.loyer && (
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 13,
                      color: "var(--vermillion-600)",
                      margin: 0,
                    }}
                  >
                    La caisse n'a pas de quoi payer le loyer.
                  </p>
                )}
              </footer>
            )}
            {surcharge && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--vermillion-600)",
                  marginTop: 12,
                }}
              >
                Trop d'objets — aucun stand ne peut tous les contenir.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function groupByCategorie<T>(
  items: T[],
  getCat: (item: T) => CategorieObjet,
): [CategorieObjet, T[]][] {
  const map = new Map<CategorieObjet, T[]>();
  for (const cat of CATEGORIES) map.set(cat, []);
  for (const item of items) map.get(getCat(item))?.push(item);
  return Array.from(map.entries()).filter(([, list]) => list.length > 0);
}

function StockRow({
  objet,
  voitRef,
  prixCourant,
  onChangerPrix,
  onExposer,
}: {
  objet: Objet;
  voitRef: boolean;
  prixCourant: number;
  onChangerPrix: (v: number) => void;
  onExposer: () => void;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px dotted var(--paper-500)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CategorieIcon
            categorie={objet.categorie}
            size={16}
            color="var(--brass-700)"
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              lineHeight: 1.2,
            }}
          >
            {objet.nom}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--ink-500)",
          }}
        >
          <EtatBadge etat={objet.etat} />
          <span>
            {voitRef ? `réf. ${objet.prixReferenceReel} €` : "réf. ?"}
          </span>
        </div>
      </div>
      <PrixInput value={prixCourant} onChange={onChangerPrix} />
      <Button variant="primary" size="sm" onClick={onExposer}>
        Exposer
      </Button>
    </li>
  );
}

function PrixInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "var(--paper-300)",
        border: "1px solid var(--brass-700)",
        padding: "4px 8px",
      }}
    >
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        style={{
          width: 64,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 16,
          color: "var(--forest-800)",
          textAlign: "right",
          padding: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 12,
          color: "var(--brass-700)",
          marginLeft: 4,
        }}
      >
        €
      </span>
    </div>
  );
}

function VitrineRow({
  entree,
  voitRef,
  onPrix,
  onRetirer,
}: {
  entree: ObjetEnVitrine;
  voitRef: boolean;
  onPrix: (v: number) => void;
  onRetirer: () => void;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px dotted var(--paper-500)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CategorieIcon
            categorie={entree.objet.categorie}
            size={16}
            color="var(--brass-700)"
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              lineHeight: 1.2,
            }}
          >
            {entree.objet.nom}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--ink-500)",
          }}
        >
          <EtatBadge etat={entree.objet.etat} />
          <span>
            {voitRef ? `réf. ${entree.objet.prixReferenceReel} €` : "réf. ?"}
          </span>
        </div>
      </div>
      <PrixInput value={entree.prixVente} onChange={onPrix} />
      <Button variant="ghost" size="sm" onClick={onRetirer}>
        Retirer
      </Button>
    </li>
  );
}

function TendancesHint({
  tendances,
}: {
  tendances: import("@/types/game").Tendance[];
}) {
  if (tendances.length === 0) return null;
  const monte = tendances
    .filter((t) => t.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2);
  const sombre = tendances
    .filter((t) => t.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 2);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        padding: "12px 16px",
        background: "var(--paper-100)",
        border: "1px solid var(--brass-700)",
        boxShadow:
          "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-700)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--ink-700)",
        letterSpacing: "0.06em",
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        Marché aujourd'hui
      </span>
      {monte.map((t) => (
        <span key={t.categorie} style={{ color: "var(--forest-800)" }}>
          ↑ {t.categorie} <strong>+{t.delta}%</strong>
        </span>
      ))}
      {sombre.map((t) => (
        <span key={t.categorie} style={{ color: "var(--vermillion-600)" }}>
          ↓ {t.categorie} <strong>{t.delta}%</strong>
        </span>
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 12px" }}>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 16,
          color: "var(--ink-500)",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        {hint}
      </div>
    </div>
  );
}
