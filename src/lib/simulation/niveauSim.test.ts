import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  jourAtteinteNiveau,
  ecartMaxAvantNiveau,
  joursMediansActives,
  median,
  mulberry32,
  percentile,
  PROFILES,
  runFouilleMicroSim,
  runLotGarniMicroSim,
  runSimulation,
  sessionsMoyennesAutourJalon,
  type ProfileId,
  type RunResult,
  type XpSourceTotals,
} from "./niveauSim";

/**
 * Simulateur de la courbe de Niveau de Brocanteur (audit d'équilibrage).
 * Gardé HORS de la suite normale (coûte ~10-60s et n'a rien d'un test de
 * régression) : ne tourne que sous `SIMULATION=1`.
 *
 *   SIMULATION=1 npx vitest run src/lib/simulation/niveauSim.test.ts
 */
const SIM = !!process.env.SIMULATION;

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const TOTAL_DAYS = 120;
const CHECKPOINTS = [7, 14, 30, 60, 90, 120];
const MILESTONES = [4, 5, 8, 10, 14, 20];
const XP_SOURCE_LABELS: Record<keyof XpSourceTotals, string> = {
  achat: "Achat (chinage)",
  decouverte: "Découverte collection",
  negoAchat: "Négo réussie (achat)",
  vente: "Vente",
  justePrix: "Juste prix (achat direct)",
  negoVente: "Négo réussie (vente)",
  restauration: "Restauration (atelier)",
  queteQuotidienne: "Quête quotidienne",
  queteHebdo: "Quête hebdo",
  questePrincipale: "Quête principale (chapitres)",
};

function withSeededRandom<T>(seed: number, fn: () => T): T {
  const rng = mulberry32(seed);
  vi.spyOn(Math, "random").mockImplementation(rng);
  try {
    return fn();
  } finally {
    vi.restoreAllMocks();
  }
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// Régression (tourne par défaut, PAS gatée SIMULATION=1 — coût ~1 run court) :
// le gate `chapitrePrincipal` (brocantes.ts, tier 2/3/4) dépend de
// `state.missions` contenant un chapitre trame livré. `stateLike()` doit donc
// stubber les missions comme livrées, sinon aucun tier > 1 n'est jamais
// atteignable dans la simulation (cf. bug de la revue finale SP2).
describe("stateLike / gate chapitrePrincipal", () => {
  it("un profil hardcore sur 60 jours débloque un tier > 1 (le gate chapitrePrincipal ne bloque pas indéfiniment)", () => {
    const run = withSeededRandom(777, () => runSimulation(PROFILES.hardcore, 777, 60));
    const tierMaxAtteint = Math.max(...run.days.map((d) => d.tierMax));
    expect(tierMaxAtteint).toBeGreaterThan(1);
  });
});

describe.runIf(SIM)("simulation de la courbe de niveau", () => {
  it(
    "génère les métriques 1-7 et écrit le rapport (JSON + Markdown)",
    () => {
      const runsByProfile: Record<ProfileId, RunResult[]> = {
        casual: [],
        regulier: [],
        hardcore: [],
      };

      for (const profileId of Object.keys(PROFILES) as ProfileId[]) {
        const profile = PROFILES[profileId];
        for (const seed of SEEDS) {
          const run = withSeededRandom(seed * 7919 + profileId.length, () =>
            runSimulation(profile, seed, TOTAL_DAYS),
          );
          runsByProfile[profileId].push(run);

          // Garde-fous structurels (le fichier ne doit pas juste "ne pas planter").
          expect(run.days).toHaveLength(TOTAL_DAYS);
          expect(run.days.every((d) => d.budget >= 0)).toBe(true);
          for (let i = 1; i < run.days.length; i++) {
            expect(run.days[i].niveau).toBeGreaterThanOrEqual(run.days[i - 1].niveau);
            expect(run.days[i].xp).toBeGreaterThanOrEqual(run.days[i - 1].xp);
          }
        }
      }

      const fouille = withSeededRandom(424242, () => runFouilleMicroSim(1000));
      expect(fouille.trials).toBe(1000);

      const lotGarni = withSeededRandom(898989, () => runLotGarniMicroSim(1000));
      expect(lotGarni.trials).toBe(1000);

      /* === Agrégation ==================================================== */

      const rapport: Record<string, unknown> = {};

      for (const profileId of Object.keys(PROFILES) as ProfileId[]) {
        const runs = runsByProfile[profileId];

        // 1. Courbe niveau/jour.
        const courbe = CHECKPOINTS.map((jour) => {
          const niveaux = runs.map((r) => r.days[jour - 1].niveau).sort((a, b) => a - b);
          return {
            jour,
            p10: percentile(niveaux, 0.1),
            median: median(niveaux),
            p90: percentile(niveaux, 0.9),
          };
        });

        const joursMilestones = MILESTONES.map((niveau) => {
          const jours = runs
            .map((r) => jourAtteinteNiveau(r, niveau))
            .filter((j): j is number => j !== null);
          return {
            niveau,
            atteintPar: `${jours.length}/${runs.length}`,
            jourMedian: jours.length ? median(jours) : null,
          };
        });

        // 3. XP/jour par source (moyenne par profil).
        const xpParJour: Record<string, number> = {};
        for (const key of Object.keys(XP_SOURCE_LABELS) as (keyof XpSourceTotals)[]) {
          const totalMoyen = runs.reduce((s, r) => s + r.xpTotals[key], 0) / runs.length;
          xpParJour[key] = totalMoyen / TOTAL_DAYS;
        }
        const xpParJourTotal = Object.values(xpParJour).reduce((a, b) => a + b, 0);

        // 4. Double gate.
        const gateAgg: Record<string, { niveau: number; eco: number; both: number }> = {};
        for (const run of runs) {
          for (const ev of run.gateEvents) {
            const key = `tier${ev.tier}`;
            gateAgg[key] ??= { niveau: 0, eco: 0, both: 0 };
            gateAgg[key][ev.blocking] += 1;
          }
        }
        const gatePct: Record<string, { niveauPct: number; ecoPct: number; bothPct: number; n: number }> = {};
        for (const [tier, counts] of Object.entries(gateAgg)) {
          const total = counts.niveau + counts.eco + counts.both;
          gatePct[tier] = {
            niveauPct: total ? (100 * counts.niveau) / total : 0,
            ecoPct: total ? (100 * counts.eco) / total : 0,
            bothPct: total ? (100 * counts.both) / total : 0,
            n: total,
          };
        }

        // 5. Énergie N8/N14.
        const energieN8 = sessionsMoyennesAutourJalon(runs, 8, 10);
        const energieN14 = sessionsMoyennesAutourJalon(runs, 14, 10);

        // Jalons d'actives (indicatif — NIVEAU_ACTIVES / QUOTA_ACTIVES).
        const activesJours = joursMediansActives(runs);

        // 2. Verdicts.
        const jourN10 = joursMilestones.find((m) => m.niveau === 10)?.jourMedian ?? null;
        const jourN20 = joursMilestones.find((m) => m.niveau === 20)?.jourMedian ?? null;
        const ecartsMax = runs.map((r) => ecartMaxAvantNiveau(r, 20));
        const ecartMaxObserve = Math.max(...ecartsMax);
        const ecartMaxMedian = median(ecartsMax);

        rapport[profileId] = {
          label: PROFILES[profileId].label,
          courbeNiveauParJour: courbe,
          joursMilestones,
          xpParJourMoyenParSource: xpParJour,
          xpParJourTotal,
          doubleGate: gatePct,
          energieSessionsAvantApres: { N8: energieN8, N14: energieN14 },
          joursMediansActives: activesJours,
          verdicts: {
            n10EntreJ10EtJ25: jourN10 !== null ? jourN10 >= 10 && jourN10 <= 25 : false,
            jourMedianN10: jourN10,
            n20SousJ90: jourN20 !== null ? jourN20 <= 90 : false,
            jourMedianN20: jourN20,
            ecartMaxAvantN20Observe: ecartMaxObserve,
            ecartMaxAvantN20Median: ecartMaxMedian,
            ecartMaxAvantN20Sous5j: ecartMaxObserve <= 5,
          },
        };
      }

      rapport["fouille"] = fouille;
      rapport["lotGarni"] = {
        ...lotGarni,
        gains: undefined, // trop volumineux pour le JSON de synthèse
        ratios: undefined,
      };

      /* === Écriture des fichiers ========================================= */

      const outDir = path.resolve(__dirname, "../../../docs/equilibrage");
      fs.mkdirSync(outDir, { recursive: true });
      const jsonPath = path.join(outDir, "simulation-niveau-2026-07-17.json");
      const mdPath = path.join(outDir, "simulation-niveau-2026-07-17.md");

      fs.writeFileSync(jsonPath, JSON.stringify(rapport, null, 2), "utf-8");
      fs.writeFileSync(mdPath, buildMarkdown(rapport, fouille, lotGarni), "utf-8");

      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(fs.existsSync(mdPath)).toBe(true);
    },
    120_000,
  );
});

/* === Génération du Markdown ============================================= */

function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function buildMarkdown(
  rapport: Record<string, unknown>,
  fouille: ReturnType<typeof runFouilleMicroSim>,
  lotGarni: ReturnType<typeof runLotGarniMicroSim>,
): string {
  const lignes: string[] = [];
  lignes.push("# Simulation de la courbe de Niveau de Brocanteur — 2026-07-17");
  lignes.push("");
  lignes.push(
    "Simulateur branché sur les vrais modules du jeu (`src/lib/simulation/niveauSim.ts`), " +
      "3 profils × 12 seeds × 120 jours. Détails de modélisation et limites d'honnêteté : " +
      "voir l'en-tête de `niveauSim.ts` et `.superpowers/sdd/sim-report.md`.",
  );
  lignes.push("");

  for (const profileId of ["casual", "regulier", "hardcore"] as const) {
    const r = rapport[profileId] as any;
    lignes.push(`## Profil ${r.label}`);
    lignes.push("");
    lignes.push("### 1. Courbe niveau/jour (p10 / médiane / p90)");
    lignes.push("");
    lignes.push("| Jour | p10 | Médiane | p90 |");
    lignes.push("|---|---|---|---|");
    for (const c of r.courbeNiveauParJour) {
      lignes.push(`| ${c.jour} | ${fmt(c.p10, 0)} | ${fmt(c.median, 1)} | ${fmt(c.p90, 0)} |`);
    }
    lignes.push("");
    lignes.push("Jour médian d'atteinte de chaque niveau-jalon :");
    lignes.push("");
    lignes.push("| Niveau | Runs l'ayant atteint | Jour médian |");
    lignes.push("|---|---|---|");
    for (const m of r.joursMilestones) {
      lignes.push(`| N${m.niveau} | ${m.atteintPar} | ${m.jourMedian ?? "non atteint"} |`);
    }
    lignes.push("");
    lignes.push("### 2. Verdicts du rapport");
    lignes.push("");
    lignes.push(`- N10 entre J10-J25 : **${r.verdicts.n10EntreJ10EtJ25 ? "OK" : "NON"}** (jour médian N10 = ${r.verdicts.jourMedianN10 ?? "non atteint"})`);
    lignes.push(`- N20 ≤ J90 (aspirationnel) : **${r.verdicts.n20SousJ90 ? "OK" : "NON"}** (jour médian N20 = ${r.verdicts.jourMedianN20 ?? "non atteint"})`);
    lignes.push(
      `- Écart max entre deux niveaux avant N20 ≤ 5j : **${r.verdicts.ecartMaxAvantN20Sous5j ? "OK" : "NON"}** ` +
        `(observé max = ${r.verdicts.ecartMaxAvantN20Observe}j, médiane des runs = ${fmt(r.verdicts.ecartMaxAvantN20Median, 1)}j)`,
    );
    lignes.push("");
    lignes.push("### 3. XP/jour par source (moyenne)");
    lignes.push("");
    lignes.push("| Source | XP/jour |");
    lignes.push("|---|---|");
    for (const [key, label] of Object.entries(XP_SOURCE_LABELS)) {
      lignes.push(`| ${label} | ${fmt((r.xpParJourMoyenParSource as any)[key], 2)} |`);
    }
    lignes.push(`| **Total** | **${fmt(r.xpParJourTotal, 1)}** |`);
    lignes.push("");
    lignes.push("### 4. Double gate (% de déblocages où le niveau était bloquant)");
    lignes.push("");
    lignes.push("| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |");
    lignes.push("|---|---|---|---|---|");
    for (const [tier, v] of Object.entries(r.doubleGate as Record<string, any>)) {
      lignes.push(`| ${tier} | ${fmt(v.niveauPct, 0)}% | ${fmt(v.ecoPct, 0)}% | ${fmt(v.bothPct, 0)}% | ${v.n} |`);
    }
    lignes.push("");
    lignes.push("### 5. Sessions effectives/jour, avant vs après jalon énergie");
    lignes.push("");
    lignes.push(
      `- N8 (+1 énergie) : avant = ${fmt(r.energieSessionsAvantApres.N8.avant, 2)} sessions/j, ` +
        `après = ${fmt(r.energieSessionsAvantApres.N8.apres, 2)} sessions/j`,
    );
    lignes.push(
      `- N14 (+1 énergie) : avant = ${fmt(r.energieSessionsAvantApres.N14.avant, 2)} sessions/j, ` +
        `après = ${fmt(r.energieSessionsAvantApres.N14.apres, 2)} sessions/j`,
    );
    lignes.push("");
    lignes.push("_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ " +
      Object.entries(r.joursMediansActives as Record<string, number | null>)
        .filter(([, v]) => v !== null)
        .map(([id, v]) => `${id}=J${v}`)
        .join(", "));
    lignes.push("");
  }

  lignes.push("## 6. Fouille — farm check (1000 étals T3)");
  lignes.push("");
  lignes.push(`- Rares+légendaires par étal, 0 remplacement : ${fmt(fouille.raresBaseParEtal, 3)}`);
  lignes.push(`- Rares+légendaires par étal, 3 remplacements ciblés (moins chers) : ${fmt(fouille.raresApres3RemplacementsParEtal, 3)}`);
  lignes.push(`- **Multiplicateur : ${fmt(fouille.multiplicateur, 2)}×**`);
  lignes.push("");

  lignes.push("## 7. Lot garni — re-roll check (1000 négos)");
  lignes.push("");
  lignes.push(
    `- Ratio prixMax(bundle) / (prixMax(obj1 seul) + prixMax(obj2 seul)) : p50 = ${fmt(lotGarni.p50Ratio, 3)}, p90 = ${fmt(lotGarni.p90Ratio, 3)}`,
  );
  lignes.push(
    `- Gain au-delà de la valeur ajoutée (€) : p50 = ${fmt(lotGarni.p50Gain, 1)}, p90 = ${fmt(lotGarni.p90Gain, 1)}`,
  );
  lignes.push("");

  return lignes.join("\n") + "\n";
}
