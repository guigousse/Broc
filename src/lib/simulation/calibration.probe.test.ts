import { describe, it } from "vitest";
import {
  PROFILES,
  runSimulation,
  jourAtteinteNiveau,
  median,
} from "./niveauSim";

/**
 * Sonde de calibration de la courbe d'XP (skippée en CI — lancer avec :
 * npx vitest run src/lib/simulation/calibration.probe.test.ts --reporter=verbose --disable-console-intercept
 * après avoir retiré le .skip). A servi au recalibrage 2026-07-10
 * (pente 34 → 1) ; garde-la pour les futures passes d'équilibrage.
 */
describe.skip("PROBE courbe d'XP (calibration manuelle)", () => {
  it("jours médians pour atteindre les jalons", () => {
    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
    const JALONS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    for (const profile of Object.values(PROFILES)) {
      const runs = SEEDS.map((s) => runSimulation(profile, s, 1500));
      const ligne: string[] = [];
      for (const n of JALONS) {
        const jours = runs
          .map((r) => jourAtteinteNiveau(r, n))
          .filter((j): j is number => j !== null)
          .sort((a, b) => a - b);
        ligne.push(
          `N${n}:${jours.length === SEEDS.length ? Math.round(median(jours)) : `>1500(${jours.length}/${SEEDS.length})`}`,
        );
      }
      // Revenu d'XP journalier : moyenne glissante en croisière (j301-1500)
      // et en début de partie (j1-60).
      const xpJTardif = runs.map((r) => {
        const d300 = r.days[299];
        const last = r.days[r.days.length - 1];
        return (last.xp - d300.xp) / (last.jour - d300.jour);
      });
      const xpJTot = runs.map((r) => {
        const d60 = r.days[59];
        return d60.xp / 60;
      });
      console.log(
        `[${profile.id}] ${ligne.join(" ")} | XP/j j1-60≈${Math.round(median(xpJTot.sort((a, b) => a - b)))} · j300+≈${Math.round(median(xpJTardif.sort((a, b) => a - b)))}`,
      );
    }
  }, 120000);
});
