// npx tsx scripts/duel-campagne.ts --graine 1 --parties 20000
import { campagne, formaterRapport, horsCible } from "@/lib/duel/campagne";

const arg = (nom: string, defaut: number) => {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 ? Number(process.argv[i + 1]) : defaut;
};
const graine = arg("graine", 1);
const parties = arg("parties", 20000);
const debut = Date.now();
const m = campagne({ graine, nParties: parties });
console.log(formaterRapport(m, graine));
console.log(`\n${((Date.now() - debut) / 1000).toFixed(1)} s · ${horsCible(m).length} mesure(s) hors cible`);
