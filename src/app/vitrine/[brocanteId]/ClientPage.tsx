"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { ActionFab } from "@/components/mobile/ActionFab";
import { ItemImage } from "@/components/ui/ItemImage";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import { useGame } from "@/context/GameContext";
import { getBrocanteById } from "@/data/brocantes";
import {
  CAPACITE_MAX_GLOBALE,
  coutStand,
  niveauRequis,
} from "@/data/standLevels";
import { estDebloquee } from "@/lib/deblocage";
import { aConnaisseurVitrine } from "@/lib/competences";
import { brocantesParTier } from "@/data/brocantes";
import type { ObjetEnVitrine } from "@/types/game";

const SUGGESTION_FACTEUR = 1.4;

function suggererPrix(prixRef: number): number {
  return Math.max(1, Math.round(prixRef * SUGGESTION_FACTEUR));
}

export default function VitrineBrocantePage() {
  const router = useRouter();
  const params = useParams<{ brocanteId: string }>();
  const {
    state,
    isHydrated,
    ouvrirVitrine,
    mettreEnVitrine,
    retirerDeVitrine,
    ajusterPrixVitrine,
    viderVitrine,
    ajusterBudget,
  } = useGame();

  const brocante = useMemo(
    () => getBrocanteById(params.brocanteId),
    [params.brocanteId],
  );

  const [prixInput, setPrixInput] = useState<Record<string, number>>({});

  // Redirige si état invalide
  useEffect(() => {
    if (!isHydrated) return;
    if (!state) return router.replace("/");
    if (!brocante) return router.replace("/vitrine");
    // Calcule la liste des débloquées par tier pour vérifier l'accès
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
    if (!debloqueesParTier.get(brocante.tier)!.has(brocante.id)) {
      router.replace("/vitrine");
      return;
    }
    // Ouvre la vitrine pour cette brocante (no-op si déjà ouverte)
    if (!state.vitrine || state.vitrine.brocanteId !== brocante.id) {
      ouvrirVitrine(brocante.id);
    }
  }, [isHydrated, state, brocante, router, ouvrirVitrine]);

  const vitrineActive = state?.vitrine;
  const objetsEnVitrine: ObjetEnVitrine[] = vitrineActive?.objets ?? [];

  const stockDisponible = useMemo(() => {
    if (!state) return [];
    const enVitrineIds = new Set(objetsEnVitrine.map((ov) => ov.objet.id));
    return state.inventaireJoueur.filter(
      (o) => !enVitrineIds.has(o.id) && !o.enRestauration,
    );
  }, [state, objetsEnVitrine]);

  const standActuel = useMemo(
    () => niveauRequis(Math.max(1, objetsEnVitrine.length)),
    [objetsEnVitrine.length],
  );
  const coutActuel = useMemo(
    () => (standActuel && brocante ? coutStand(brocante.tier, standActuel.niveau) : 0),
    [standActuel, brocante],
  );

  if (!isHydrated || !state || !brocante) {
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

  const surcharge = objetsEnVitrine.length > CAPACITE_MAX_GLOBALE;
  const peutOuvrir =
    objetsEnVitrine.length > 0 &&
    standActuel !== null &&
    state.budget >= coutActuel &&
    !surcharge;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper-100)",
      }}
    >
      <ContextualHeader
        titre="Vitrine"
        sousTitre={`${brocante.nom} · ${"★".repeat(brocante.tier)}`}
        budget={state.budget}
        onBack={() => router.push("/vitrine")}
      />
      <main
        style={{
          flex: 1,
          padding: "12px 12px calc(80px + var(--safe-bottom))",
          overflowY: "auto",
        }}
      >
        <section style={cardStyle}>
          <div style={rowStyle}>
            <span style={lblStyle}>Stand niveau</span>
            <span style={valStyle}>
              {standActuel ? `${standActuel.niveau} — ${standActuel.nom}` : "—"}
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: "var(--paper-300)",
              border: "1px solid var(--brass-500)",
              margin: "6px 0",
            }}
          >
            <div
              style={{
                height: "100%",
                background: surcharge
                  ? "var(--vermillion-600)"
                  : "var(--forest-800)",
                width: `${Math.min(100, (objetsEnVitrine.length / (standActuel?.capaciteMax ?? CAPACITE_MAX_GLOBALE)) * 100)}%`,
              }}
            />
          </div>
          <div style={rowStyle}>
            <span style={lblStyle}>Capacité</span>
            <span style={{ ...valStyle, fontSize: 11 }}>
              {objetsEnVitrine.length} / {standActuel?.capaciteMax ?? CAPACITE_MAX_GLOBALE} · loc. {coutActuel} €
            </span>
          </div>
        </section>

        <h2 style={sectTitle}>— Objets exposés —</h2>
        {objetsEnVitrine.length === 0 ? (
          <section style={cardStyle}>
            <p style={emptyStyle}>Aucun objet exposé. Ajoutez-en depuis le stock.</p>
          </section>
        ) : (
          <section style={cardStyle}>
            {objetsEnVitrine.map((ov, i) => (
              <div
                key={ov.objet.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto auto",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom:
                    i === objetsEnVitrine.length - 1
                      ? "none"
                      : "1px dotted var(--paper-500)",
                }}
              >
                {(() => {
                  const c = getRarityColors(
                    ov.objet.rarete,
                    !!getTemplate(ov.objet.templateId)?.unique,
                  );
                  return (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        background: c.thumbBg,
                        border: `1px solid ${c.outer}`,
                        overflow: "hidden",
                      }}
                    >
                      <ItemImage
                        templateId={ov.objet.templateId}
                        categorie={ov.objet.categorie}
                        fit="cover"
                        fallbackIconSize={18}
                        fallbackIconColor={c.thumbIcon}
                        alt={ov.objet.nom}
                      />
                    </div>
                  );
                })()}
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 10.5,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {ov.objet.nom}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: "var(--ink-500)",
                    }}
                  >
                    {ov.objet.etat} · {ov.objet.rarete}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="number"
                    min={1}
                    value={prixInput[ov.objet.id] ?? ov.prixVente}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPrixInput({ ...prixInput, [ov.objet.id]: v });
                      ajusterPrixVitrine(ov.objet.id, v);
                    }}
                    style={{
                      width: 56,
                      padding: "4px 6px",
                      border: "1px solid var(--brass-700)",
                      background: "var(--paper-100)",
                      color: "var(--forest-800)",
                      fontFamily: "var(--font-display)",
                      fontSize: 12,
                      textAlign: "right",
                    }}
                  />
                  <span style={{ fontFamily: "var(--font-display)", color: "var(--brass-700)" }}>€</span>
                </div>
                <button
                  type="button"
                  onClick={() => retirerDeVitrine(ov.objet.id)}
                  aria-label="Retirer"
                  style={{
                    padding: "4px 6px",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    color: "var(--vermillion-600)",
                    background: "transparent",
                    border: "1px solid var(--brass-500)",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </section>
        )}

        <h2 style={sectTitle}>— Disponibles dans le stock —</h2>
        {stockDisponible.length === 0 ? (
          <section style={cardStyle}>
            <p style={emptyStyle}>Aucun objet disponible. Allez chiner !</p>
          </section>
        ) : (
          <section style={cardStyle}>
            {stockDisponible.map((o, i) => (
              <div
                key={o.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom:
                    i === stockDisponible.length - 1
                      ? "none"
                      : "1px dotted var(--paper-500)",
                }}
              >
                {(() => {
                  const c = getRarityColors(
                    o.rarete,
                    !!getTemplate(o.templateId)?.unique,
                  );
                  return (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        background: c.thumbBg,
                        border: `1px solid ${c.outer}`,
                        overflow: "hidden",
                      }}
                    >
                      <ItemImage
                        templateId={o.templateId}
                        categorie={o.categorie}
                        fit="cover"
                        fallbackIconSize={18}
                        fallbackIconColor={c.thumbIcon}
                        alt={o.nom}
                      />
                    </div>
                  );
                })()}
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 10.5,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {o.nom}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: "var(--ink-500)",
                    }}
                  >
                    {o.etat} · {o.rarete}
                    {aConnaisseurVitrine(state, o.categorie)
                      ? ` · valeur ${Math.round(o.prixReferenceReel)} €`
                      : o.prixAchat != null
                        ? ` · achat ${o.prixAchat} €`
                        : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const prix =
                      o.prixVenteSouhaite ?? suggererPrix(o.prixReferenceReel);
                    mettreEnVitrine(o.id, prix);
                  }}
                  style={{
                    padding: "6px 10px",
                    fontFamily: "var(--font-display)",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: "var(--forest-800)",
                    color: "var(--brass-300)",
                    cursor: "pointer",
                  }}
                >
                  Ajouter
                </button>
              </div>
            ))}
          </section>
        )}

        {surcharge && (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 12.5,
              color: "var(--vermillion-600)",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            Trop d'objets — aucun stand ne peut tous les contenir.
          </p>
        )}
        {!surcharge && state.budget < coutActuel && objetsEnVitrine.length > 0 && (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 12.5,
              color: "var(--vermillion-600)",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            La caisse n'a pas de quoi payer le loyer.
          </p>
        )}
      </main>

      <ActionFab
        buttons={[
          {
            label: "Annuler",
            variant: "secondary",
            onClick: () => {
              viderVitrine();
              router.push("/bureau");
            },
          },
          {
            label: `Ouvrir l'étal · ${coutActuel} €`,
            onClick: () => {
              if (peutOuvrir) {
                ajusterBudget(-coutActuel);
                router.push(`/vitrine/${brocante.id}/journee`);
              }
            },
            disabled: !peutOuvrir,
          },
        ]}
      />
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "10px 12px",
  marginBottom: 10,
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 6,
};
const lblStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};
const valStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  color: "var(--forest-800)",
  letterSpacing: "0.08em",
};
const sectTitle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  margin: "10px 2px 6px",
};
const emptyStyle: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 12.5,
  color: "var(--ink-500)",
  textAlign: "center",
  padding: "12px 0",
};
