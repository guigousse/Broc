"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { WeekTimeline } from "@/components/WeekTimeline";
import { GazetteTeaser } from "@/components/mobile/GazetteTeaser";
import { GazetteSheet } from "@/components/mobile/GazetteSheet";
import { QgEtatDesLieux } from "@/components/mobile/QgEtatDesLieux";
import { QgHistorique } from "@/components/mobile/QgHistorique";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { CATEGORIES } from "@/data/categories";
import { meteoDuJour } from "@/lib/meteo";
import { PRIX_GAZETTE } from "@/lib/tendances";
import {
  aConnaisseurTendance,
  aGenBulletinMeteo,
  aGenCarnetMondain,
  aGenInfluence,
} from "@/lib/competences";
import type { CategorieObjet } from "@/types/game";

const stickyEyebrow = {
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center" as const,
  marginBottom: 6,
};

const sectTitle = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: "var(--forest-800)",
  margin: "12px 2px 6px",
};

export default function QgPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    acheterGazette,
    rerollMeteo,
    rerollCelebrite,
    marquerHuissierVu,
    avancerJour,
  } = useGame();
  const { playClick } = useSettings();
  const [gazetteOuverte, setGazetteOuverte] = useState(false);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const categoriesConnuesTendance = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurTendance(state, c)) s.add(c);
    return s;
  }, [state]);

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

  const meteo = meteoDuJour(state);

  return (
    <>
      <MobileLayout
        header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
        stickyTop={
          <StickyTop>
            <div style={stickyEyebrow}>
              — Quartier Général · Semaine {Math.ceil(state.jourActuel / 7)} —
            </div>
            <div style={{ marginBottom: 10 }}>
              <WeekTimeline
                jourActuel={state.jourActuel}
                meteoSemaine={aGenBulletinMeteo(state) ? state.meteoSemaine : undefined}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 0.8fr",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  playClick();
                  router.push("/chiner");
                }}
                style={{
                  padding: "12px 8px",
                  background: "var(--forest-800)",
                  color: "var(--brass-300)",
                  border: "1px solid var(--brass-500)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  boxShadow:
                    "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)",
                  cursor: "pointer",
                }}
              >
                Chiner
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  router.push("/vitrine");
                }}
                style={{
                  padding: "12px 8px",
                  background: "var(--paper-100)",
                  color: "var(--forest-800)",
                  border: "1px solid var(--brass-500)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  boxShadow:
                    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
                  cursor: "pointer",
                }}
              >
                {state.vitrine ? "Reprendre l'étal" : "Exposer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  avancerJour(1);
                }}
                style={{
                  padding: "12px 8px",
                  background: "var(--paper-200)",
                  color: "var(--ink-700)",
                  border: "1px solid var(--brass-500)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  boxShadow:
                    "inset 0 0 0 2px var(--paper-200), inset 0 0 0 3px var(--brass-500)",
                  cursor: "pointer",
                }}
              >
                Passer
              </button>
            </div>
          </StickyTop>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {state.dernierHuissier && (
            <div
              role="status"
              style={{
                padding: "10px 12px",
                background: "var(--vermillion-600)",
                color: "var(--paper-100)",
                border: "1px solid var(--velvet-700)",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 13,
                lineHeight: 1.4,
                marginBottom: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <strong style={{ fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontStyle: "normal" }}>
                — Visite de l&apos;huissier —
              </strong>
              <span>
                Dette de {Math.abs(state.dernierHuissier.detteAvantSaisie)} € après loyer.
                {" "}
                {state.dernierHuissier.saisies.length} bien{state.dernierHuissier.saisies.length > 1 ? "s" : ""} saisi{state.dernierHuissier.saisies.length > 1 ? "s" : ""} pour {state.dernierHuissier.saisies.reduce((s, x) => s + x.montantRecupere, 0)} €.
              </span>
              <details style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                <summary style={{ cursor: "pointer" }}>Voir le détail</summary>
                <ul style={{ margin: "6px 0 0 12px", padding: 0 }}>
                  {state.dernierHuissier.saisies.map((s, i) => (
                    <li key={i}>{s.nom} ({s.type === "inventaire" ? "stock" : "collection"}) — {s.montantRecupere} € (valeur {s.valeur} €)</li>
                  ))}
                </ul>
              </details>
              <button
                type="button"
                onClick={() => marquerHuissierVu()}
                style={{
                  alignSelf: "flex-end",
                  padding: "4px 10px",
                  background: "transparent",
                  border: "1px solid var(--paper-100)",
                  color: "var(--paper-100)",
                  fontFamily: "var(--font-display)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Compris ✕
              </button>
            </div>
          )}
          <h2 style={sectTitle}>— État des lieux —</h2>
          <QgEtatDesLieux state={state} />

          <GazetteTeaser
            achetee={state.gazetteAchetee}
            jourActuel={state.jourActuel}
            tendances={state.tendances}
            categoriesConnues={categoriesConnuesTendance}
            meteo={meteo}
            revelerMeteo={aGenBulletinMeteo(state)}
            celebrite={state.celebriteActuelle}
            revelerCelebrite={aGenCarnetMondain(state)}
            onOuvrir={() => setGazetteOuverte(true)}
            onAcheter={() => acheterGazette()}
            budget={state.budget}
            prixGazette={PRIX_GAZETTE}
          />

          <h2 style={sectTitle}>— Dernières sessions —</h2>
          <QgHistorique state={state} />
        </div>
      </MobileLayout>

      <GazetteSheet
        open={gazetteOuverte}
        onClose={() => setGazetteOuverte(false)}
        jourActuel={state.jourActuel}
        prochainRafraichissement={state.prochainRafraichissementTendances}
        tendances={state.tendances}
        categoriesConnues={categoriesConnuesTendance}
        meteo={meteo}
        revelerMeteo={aGenBulletinMeteo(state)}
        celebrite={state.celebriteActuelle}
        revelerCelebrite={aGenCarnetMondain(state)}
        peutInfluencer={aGenInfluence(state)}
        influenceUtilisee={state.influenceUtilisee}
        onRerollMeteo={() => rerollMeteo()}
        onRerollCelebrite={() => rerollCelebrite()}
      />
    </>
  );
}
