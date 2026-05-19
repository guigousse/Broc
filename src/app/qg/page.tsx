"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Album as IconAlbum,
  Anvil as IconAnvil,
  BookOpen as IconBookOpen,
  History as IconHistory,
  Trophy as IconTrophy,
  Warehouse as IconWarehouse,
  type LucideIcon,
} from "lucide-react";
import { MarketTrendsPanel } from "@/components/MarketTrendsPanel";
import { StatusBar } from "@/components/StatusBar";
import { WeekTimeline } from "@/components/WeekTimeline";
import { Button } from "@/components/ui/Button";
import { BossUnlockModal } from "@/components/BossUnlockModal";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { brocantesParTier, getBrocanteById } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";
import { meteoDuJour } from "@/lib/meteo";
import {
  aConnaisseurTendance,
  aGenBulletinMeteo,
  aGenCarnetMondain,
  aGenInfluence,
} from "@/lib/competences";
import { getStockageTier } from "@/data/stockage";
import { progressionGlobale } from "@/lib/collection";
import type { CategorieObjet, GameState } from "@/types/game";

export default function QgPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    ajusterBudget,
    acheterGazette,
    marquerBossDebloqueVu,
    rerollMeteo,
    rerollCelebrite,
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

      <div style={{ maxWidth: 1280, margin: "12px auto 0" }}>
        <WeekTimeline jourActuel={state.jourActuel} />
      </div>

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
        className="qg-grid"
        style={{
          maxWidth: 1200,
          margin: "22px auto 0",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* COLONNE GAUCHE — actions + gazette */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push("/chiner")}
            >
              Chiner
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push("/vitrine")}
            >
              {state.vitrine ? "Reprendre l'étal" : "Exposer"}
            </Button>
          </div>

          <MarketTrendsPanel
            tendances={state.tendances}
            jourActuel={state.jourActuel}
            prochainRafraichissement={state.prochainRafraichissementTendances}
            categoriesConnues={categoriesConnuesTendance}
            achetee={state.gazetteAchetee}
            budget={state.budget}
            onAcheter={() => acheterGazette()}
            meteo={meteoDuJour(state)}
            revelerMeteo={aGenBulletinMeteo(state)}
            celebrite={state.celebriteActuelle}
            revelerCelebrite={aGenCarnetMondain(state)}
            peutInfluencer={aGenInfluence(state)}
            influenceUtilisee={state.influenceUtilisee}
            onRerollMeteo={() => rerollMeteo()}
            onRerollCelebrite={() => rerollCelebrite()}
          />
        </div>

        {/* COLONNE DROITE — résumé par catégorie */}
        <ResumeQG
          state={state}
          dejaParTier={dejaParTier}
          onNaviguer={(p) => router.push(p)}
        />
      </div>
      {montrerModale && (
        <BossUnlockModal onClose={marquerBossDebloqueVu} />
      )}
    </div>
  );
}

// ============================================================
// Résumé QG (colonne de droite)
// ============================================================

function ResumeQG({
  state,
  dejaParTier,
  onNaviguer,
}: {
  state: GameState;
  dejaParTier: Map<1 | 2 | 3 | 4, Set<string>>;
  onNaviguer: (path: string) => void;
}) {
  const stockTier = getStockageTier(state.inventaireJoueur.length);
  const totalPoints = Object.values(state.competenceTrees).reduce(
    (s, t) => s + t.pointsDisponibles,
    0,
  );
  const enChantier = state.inventaireJoueur.filter((o) => o.enRestauration);
  const prets = enChantier.filter(
    (o) => (o.enRestauration?.jourFin ?? Infinity) <= state.jourActuel,
  );
  const col = progressionGlobale(state.collection);
  const aUneTrois = dejaParTier.get(3)!.size > 0;
  const aQuatre = dejaParTier.get(4)!.size > 0;

  const brocanteVitrine = state.vitrine
    ? getBrocanteById(state.vitrine.brocanteId)
    : null;

  const blocs: Array<{
    icon: LucideIcon;
    titre: string;
    chiffres: string;
    activite?: string;
    path: string;
  }> = [
    {
      icon: IconWarehouse,
      titre: "Stockage",
      chiffres: `${stockTier.nom} · ${state.inventaireJoueur.length} obj.`,
      activite:
        brocanteVitrine && state.vitrine
          ? `${state.vitrine.objets.length} sur l'étal · ${brocanteVitrine.nom}`
          : `Loyer hebdo ${stockTier.loyerHebdo} €`,
      path: "/stockage",
    },
    {
      icon: IconBookOpen,
      titre: "Grimoire des compétences",
      chiffres: `${state.competencesDebloquees.length} acquise${state.competencesDebloquees.length > 1 ? "s" : ""}`,
      activite:
        totalPoints > 0
          ? `${totalPoints} pt${totalPoints > 1 ? "s" : ""} à dépenser`
          : "Aucun point en attente",
      path: "/competences",
    },
    {
      icon: IconAnvil,
      titre: "Atelier",
      chiffres:
        enChantier.length === 0
          ? "Établi libre"
          : `${enChantier.length} en chantier`,
      activite:
        prets.length > 0
          ? `${prets.length} prêt${prets.length > 1 ? "s" : ""} à récupérer`
          : enChantier.length > 0
            ? "Restauration en cours"
            : undefined,
      path: "/atelier",
    },
    {
      icon: IconAlbum,
      titre: "Collection",
      chiffres: `${col.donnees} / ${col.total} piece${col.total > 1 ? "s" : ""}`,
      activite:
        col.donnees === col.total && col.total > 0
          ? "Complète"
          : `Valeur ${col.valeur.toLocaleString("fr-FR")} €`,
      path: "/collection",
    },
    {
      icon: IconTrophy,
      titre: "Trophées",
      chiffres: aQuatre
        ? "Boss vaincu"
        : aUneTrois
          ? "Salle ouverte"
          : "Verrouillée (3⭐)",
      activite: aUneTrois
        ? `${dejaParTier.get(3)!.size} brocante 3⭐${dejaParTier.get(3)!.size > 1 ? "s" : ""} ouverte${dejaParTier.get(3)!.size > 1 ? "s" : ""}`
        : undefined,
      path: "/trophees",
    },
    {
      icon: IconHistory,
      titre: "Historique",
      chiffres: `${state.historique.length} session${state.historique.length > 1 ? "s" : ""}`,
      activite:
        state.historique[0]
          ? `Dernière : jour ${state.historique[0].jour}`
          : "Aucune trace au registre",
      path: "/historique",
    },
  ];

  return (
    <aside
      style={{
        position: "relative",
        background: "var(--paper-100)",
        backgroundImage: "url(/assets/paper-grain.svg)",
        backgroundSize: "320px 320px",
        border: "1px solid var(--brass-500)",
        boxShadow:
          "inset 0 0 0 4px var(--paper-100), inset 0 0 0 5px var(--brass-500), 0 2px 0 var(--paper-400), 0 6px 14px rgba(40,25,5,0.10)",
        padding: 18,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 10,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        — état des lieux —
      </div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          fontWeight: 700,
          textAlign: "center",
          margin: "0 0 14px",
        }}
      >
        Résumé
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {blocs.map((b) => {
          const Icon = b.icon;
          return (
            <button
              key={b.path}
              type="button"
              onClick={() => onNaviguer(b.path)}
              title={b.titre}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "transparent",
                border: "1px dotted var(--paper-500)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "background 140ms ease, border-color 140ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--paper-300)";
                e.currentTarget.style.borderColor = "var(--brass-700)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "var(--paper-500)";
              }}
            >
              <Icon
                size={22}
                strokeWidth={1.4}
                color="var(--brass-700)"
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--forest-800)",
                    lineHeight: 1.2,
                  }}
                >
                  {b.titre}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.05em",
                    color: "var(--ink-500)",
                    marginTop: 2,
                  }}
                >
                  {b.chiffres}
                </div>
                {b.activite && (
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 11.5,
                      color: "var(--brass-700)",
                      marginTop: 2,
                      lineHeight: 1.3,
                    }}
                  >
                    {b.activite}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
