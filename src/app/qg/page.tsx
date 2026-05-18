"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { InventoryGrid } from "@/components/InventoryGrid";
import { MarketTrendsPanel } from "@/components/MarketTrendsPanel";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { BossUnlockModal } from "@/components/BossUnlockModal";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { getBrocanteById, brocantesParTier } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";
import {
  aConnaisseurTendance,
  aConnaisseurVitrine,
  aGenVeilleActive,
  aGenVeilleDiscrete,
} from "@/lib/competences";
import { progressionGlobale } from "@/lib/collection";
import type { CategorieObjet } from "@/types/game";

export default function QgPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    ajusterBudget,
    acheterGazette,
    marquerBossDebloqueVu,
  } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const categoriesConnuesTendance = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurTendance(state, c)) s.add(c);
    return s;
  }, [state]);

  const categoriesConnuesVitrine = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurVitrine(state, c)) s.add(c);
    return s;
  }, [state]);

  const dejaParTier = useMemo(() => {
    const map = new Map<1 | 2 | 3 | 4, Set<string>>([
      [1, new Set<string>()],
      [2, new Set<string>()],
      [3, new Set<string>()],
      [4, new Set<string>()],
    ]);
    if (!state) return map;
    for (const tier of [1, 2, 3, 4] as const) {
      for (const b of brocantesParTier(tier)) {
        if (estDebloquee(b, state, map)) {
          map.get(tier)!.add(b.id);
        }
      }
    }
    return map;
  }, [state]);

  const totalBrocantesDebloquees =
    dejaParTier.get(1)!.size +
    dejaParTier.get(2)!.size +
    dejaParTier.get(3)!.size +
    dejaParTier.get(4)!.size;

  const bossEstDebloque = dejaParTier.get(4)!.size > 0;
  const montrerModale = bossEstDebloque && state !== null && !state.bossDebloqueSeen;

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
        — ouverture du QG…
      </main>
    );
  }

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      {/* Dev cheat — à retirer avant prod */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 40,
        }}
      >
        <button
          onClick={() => ajusterBudget(100)}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            background: "var(--vermillion-600)",
            color: "var(--paper-100)",
            border: "1px solid var(--velvet-700)",
            padding: "8px 12px",
            cursor: "pointer",
            boxShadow:
              "inset 0 0 0 2px var(--vermillion-600), inset 0 0 0 3px var(--velvet-700)",
          }}
          title="Ajoute 100 € à la caisse"
        >
          dev · +100 €
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) minmax(0, 2.3fr) minmax(300px, 1fr)",
          gap: 20,
          marginTop: 22,
          alignItems: "start",
        }}
      >
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Panel eyebrow="— les terrains de chine —" title="Sortir">
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 14,
                marginTop: 0,
                marginBottom: 14,
                lineHeight: 1.45,
              }}
            >
              Le jour est jeune. Les meilleures pièces partent avant midi.
            </p>
            <Button variant="primary" size="md" onClick={() => router.push("/chiner")}>
              Partir Chiner
            </Button>
          </Panel>

          <Panel eyebrow="— votre vitrine —" title="Tenir l'étal" dark>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--paper-300)",
                fontSize: 14,
                marginTop: 0,
                marginBottom: 14,
                lineHeight: 1.45,
                textAlign: "center",
              }}
            >
              {(() => {
                if (!state.vitrine) return "Choisissez une brocante pour exposer.";
                const b = getBrocanteById(state.vitrine.brocanteId);
                const n = state.vitrine.objets.length;
                return `${b?.nom ?? "Brocante"} · ${n} pièce${n > 1 ? "s" : ""} sur l'étal.`;
              })()}
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => router.push("/vitrine")}
                style={{
                  background: "transparent",
                  color: "var(--brass-300)",
                  borderColor: "var(--brass-500)",
                  boxShadow:
                    "inset 0 0 0 3px transparent, inset 0 0 0 4px var(--brass-500)",
                }}
              >
                {state.vitrine ? "Reprendre la vitrine" : "Préparer la vitrine"}
              </Button>
            </div>
          </Panel>
        </div>

        {/* CENTER */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Panel
            eyebrow="— vitrine du QG —"
            title={`Inventaire · ${state.inventaireJoueur.length} objet${
              state.inventaireJoueur.length > 1 ? "s" : ""
            }`}
          >
            <InventoryGrid
              objets={state.inventaireJoueur}
              categoriesConnues={categoriesConnuesVitrine}
            />
          </Panel>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <MarketTrendsPanel
            tendances={state.tendances}
            prochainesTendances={state.prochainesTendances}
            jourActuel={state.jourActuel}
            prochainRafraichissement={state.prochainRafraichissementTendances}
            categoriesConnues={categoriesConnuesTendance}
            niveauVision={
              aGenVeilleActive(state) ? 2 : aGenVeilleDiscrete(state) ? 1 : 0
            }
            achetee={state.gazetteAchetee}
            budget={state.budget}
            onAcheter={() => acheterGazette()}
          />

          {(() => {
            const totalPoints = Object.values(state.competenceTrees).reduce(
              (s, t) => s + t.pointsDisponibles,
              0,
            );
            return (
              <Panel
                eyebrow="— grimoire du chineur —"
                title={`Compétences · ${totalPoints} pt${totalPoints > 1 ? "s" : ""}`}
                onClick={() => router.push("/competences")}
              >
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--ink-500)",
                    fontSize: 14,
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {state.competencesDebloquees.length === 0
                    ? "Aucune compétence acquise pour l'instant."
                    : `${state.competencesDebloquees.length} compétence${state.competencesDebloquees.length > 1 ? "s" : ""} acquise${state.competencesDebloquees.length > 1 ? "s" : ""}.`}
                </p>
              </Panel>
            );
          })()}

          {(() => {
            const enChantier = state.inventaireJoueur.filter(
              (o) => o.enRestauration,
            );
            const prets = enChantier.filter(
              (o) => (o.enRestauration?.jourFin ?? Infinity) <= state.jourActuel,
            );
            return (
              <Panel
                eyebrow="— atelier —"
                title={`Atelier · ${enChantier.length} en chantier`}
                onClick={() => router.push("/atelier")}
              >
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--ink-500)",
                    fontSize: 14,
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {enChantier.length === 0
                    ? "L'établi est libre. Restaurez un objet pour en améliorer l'état."
                    : prets.length > 0
                      ? `${prets.length} objet${prets.length > 1 ? "s" : ""} prêt${prets.length > 1 ? "s" : ""} à récupérer.`
                      : `${enChantier.length} objet${enChantier.length > 1 ? "s" : ""} en cours de restauration.`}
                </p>
              </Panel>
            );
          })()}

          {(() => {
            const col = progressionGlobale(state.collection);
            return (
              <Panel
                eyebrow="— collection personnelle —"
                title={`Collection · ${col.donnees} / ${col.total}`}
                onClick={() => router.push("/collection")}
              >
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--ink-500)",
                    fontSize: 14,
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {col.donnees === 0
                    ? "Aucun objet dans votre collection. Donnez vos premières pièces depuis l'inventaire."
                    : col.donnees === col.total
                      ? "Collection complète — bravo !"
                      : `${col.donnees} pièce${col.donnees > 1 ? "s" : ""} donnée${col.donnees > 1 ? "s" : ""}, valeur ${col.valeur.toLocaleString("fr-FR")} €.`}
                </p>
              </Panel>
            );
          })()}

          {(() => {
            const aUneTrois = dejaParTier.get(3)!.size > 0;
            return (
              <Panel
                eyebrow="— salle des trophées —"
                title="Trophées"
                onClick={() => router.push("/trophees")}
                disabled={!aUneTrois}
                title2={
                  aUneTrois
                    ? "Voir la salle des trophées"
                    : "Débloquez une brocante 3⭐ pour ouvrir la salle"
                }
              >
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--ink-500)",
                    fontSize: 14,
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {aUneTrois
                    ? "Admirez vos pièces les plus prestigieuses."
                    : "Débloquez une brocante 3⭐ pour ouvrir la salle."}
                </p>
              </Panel>
            );
          })()}

          <Panel
            eyebrow="— carnet de comptes —"
            title={`Historique · ${state.historique.length}`}
            onClick={() => router.push("/historique")}
          >
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 14,
                margin: 0,
                textAlign: "center",
              }}
            >
              {state.historique.length === 0
                ? "Aucune session consignée."
                : `${state.historique.length} session${state.historique.length > 1 ? "s" : ""} dans le registre.`}
            </p>
          </Panel>
        </div>
      </div>
      {montrerModale && (
        <BossUnlockModal onClose={marquerBossDebloqueVu} />
      )}
    </div>
  );
}
