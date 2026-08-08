/**
 * OUTIL DE TEST LOCAL — NE PAS COMMITTER.
 *
 * Fabrique 3 parties de test pour la recette des événements calendaires, à
 * partir de la save de démo (gen-save-demo.ts), puis écrit une page
 * d'injection `public/dev-save-evenements.html` servie par `next dev` :
 * même origine que l'app → même localStorage.
 *
 *   npx tsx scripts/gen-save-demo.ts > <scratch>/save-base.json
 *   npx tsx scripts/_gen-saves-evenements.ts <scratch>/save-base.json
 *
 * Chaque variante repasse par migrerSauvegarde() : si le jeu ne l'accepte
 * pas, le script échoue ici plutôt que dans le navigateur.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { GameState } from "@/types/game";
import { prochainLundi, formatDateLongue } from "@/lib/calendrier";
import { migrerSauvegarde } from "@/lib/migrations";
import { samediBraderie, estJourBraderie } from "@/lib/evenements";
import { jourAnniversaire, idDeclencheurCadeau, cadeauEnAttente } from "@/lib/anniversaire";

const basePath = process.argv[2];
if (!basePath) throw new Error("usage: tsx scripts/_gen-saves-evenements.ts <save-base.json>");
const base = JSON.parse(readFileSync(basePath, "utf8")) as GameState;

function variante(jour: number, declencheurs: string[]): GameState {
  const v: GameState = {
    ...base,
    jourActuel: jour,
    prochainRafraichissementTendances: prochainLundi(jour + 1),
    declencheursDeclenches: declencheurs,
    miniTutoVinyle: "termine",
    energieDerniereMaj: Date.now(),
  };
  // Filet : la save doit traverser les migrations sans être altérée.
  const migree = migrerSauvegarde(JSON.parse(JSON.stringify(v)) as GameState);
  if (migree.jourActuel !== jour) throw new Error(`migration a altéré jourActuel (${jour})`);
  return migree;
}

const samedi = samediBraderie(1924); // 93
if (!estJourBraderie(samedi)) throw new Error("incohérence samediBraderie");
const anniv2 = jourAnniversaire(2); // 371

const slots: { nom: string; save: GameState; attendu: string }[] = [
  {
    nom: "1er septembre",
    save: variante(samedi - 5, [idDeclencheurCadeau(1)]),
    attendu: `${formatDateLongue(samedi - 5)} — gazette du lundi avec annonce braderie, 5 jours à jouer avant le samedi`,
  },
  {
    nom: "Samedi de braderie",
    save: variante(samedi, [idDeclencheurCadeau(1)]),
    attendu: `${formatDateLongue(samedi)} — braderie OUVERTE (listes chine/vente, badge, gazette « en cours »)`,
  },
  {
    nom: "Anniversaire an 2",
    save: variante(anniv2, [idDeclencheurCadeau(1)]),
    attendu: `${formatDateLongue(anniv2)} — paquet de Maman au QG (whale song, Pristin), dialogue récurrent`,
  },
];

// Sanity : le slot 3 doit bien avoir un cadeau an 2 en attente.
if (cadeauEnAttente(slots[2].save) !== 2) throw new Error("slot 3 : cadeau an 2 non détecté");

const now = Date.now();
const index = {
  actif: 1,
  slots: {
    1: { nom: slots[0].nom, derniereSession: now },
    2: { nom: slots[1].nom, derniereSession: now },
    3: { nom: slots[2].nom, derniereSession: now },
  },
};

const html = `<!DOCTYPE html>
<meta charset="utf-8">
<title>Parties de test — événements calendaires</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 640px; margin: 3rem auto; padding: 0 1rem; background: #1c1917; color: #e7e5e4; }
  h1 { font-size: 1.3rem; } li { margin: .5rem 0; } code { color: #fbbf24; }
  button { font-size: 1.1rem; padding: .7rem 1.4rem; border-radius: 8px; border: none; cursor: pointer; background: #b45309; color: white; margin-right: .8rem; }
  button.danger { background: #7f1d1d; }
  #etat { margin-top: 1rem; font-weight: 600; }
  a { color: #fbbf24; }
</style>
<h1>🧪 Parties de test — événements calendaires</h1>
<ol>
${slots.map((s) => `  <li><b>${s.nom}</b> — ${s.attendu}</li>`).join("\n")}
</ol>
<p>« Installer » écrase les 3 emplacements de sauvegarde de <b>ce navigateur</b> (localhost uniquement — tes parties sur l'iPhone ne risquent rien).</p>
<button id="go">Installer les 3 parties</button>
<button id="wipe" class="danger">Tout effacer</button>
<p id="etat"></p>
<script>
const SLOTS = ${JSON.stringify(slots.map((s) => s.save))};
const INDEX = ${JSON.stringify(index)};
document.getElementById("go").onclick = () => {
  SLOTS.forEach((s, i) => localStorage.setItem("projet-broc:slot:" + (i + 1) + ":v1", JSON.stringify(s)));
  localStorage.setItem("projet-broc:slots:v1", JSON.stringify(INDEX));
  document.getElementById("etat").innerHTML = '✅ Installé — <a href="/">ouvrir le jeu</a> (slot actif : « 1er septembre » ; les deux autres via Charger)';
};
document.getElementById("wipe").onclick = () => {
  [1, 2, 3].forEach((i) => localStorage.removeItem("projet-broc:slot:" + i + ":v1"));
  localStorage.removeItem("projet-broc:slots:v1");
  document.getElementById("etat").textContent = "🗑 Emplacements effacés.";
};
</script>
`;
writeFileSync("public/dev-save-evenements.html", html);
for (const s of slots) console.log(`✔ ${s.nom} → jour ${s.save.jourActuel} (${s.attendu})`);
console.log("→ page écrite : public/dev-save-evenements.html (NON COMMITÉE)");
