#!/usr/bin/env -S npx tsx
/**
 * Fabrique la partie de test « borne d'arcade » et l'installateur qui la pose
 * dans le navigateur : `public/dev-save-borne.html`.
 *
 * Pourquoi un script et pas un JSON écrit à la main : l'état est construit par
 * les fonctions du jeu (`createMockGameState`, `getTemplate`, `SAVE_VERSION`),
 * donc il ne peut pas dériver du modèle. Le jour où un champ obligatoire
 * apparaît, ce script casse à la compilation au lieu de produire une save que
 * le jeu refusera en silence.
 *
 * Ce que la partie garantit :
 *  - jour 30 → le Bazar est OUVERT (il ouvre au jour 20, `JOUR_OUVERTURE_BAZAR`) ;
 *  - trois cartouches DONNÉES à la collection → trois jeux « trouvés » sur la
 *    borne, seuls à répondre au tap (les autres gardent leur neige) ;
 *  - le tutoriel est terminé, l'énergie pleine, la bourse garnie.
 *
 * Usage : npx tsx scripts/dev-save-borne.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMockGameState } from "../src/lib/__test-fixtures__/gameState.ts";
import { getTemplate } from "../src/data/objetTemplates.ts";
import { SAVE_VERSION } from "../src/lib/migrations.ts";
import { JOUR_OUVERTURE_BAZAR } from "../src/lib/bazar/ouverture.ts";
import { JEUX_ARCADE } from "../src/lib/bazar/arcade.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Les trois premiers jeux de la borne : la série se remplit par le début. */
const TROUVES = JEUX_ARCADE.slice(0, 3);

const state = createMockGameState({
  budget: 5000,
  jetons: 40,
  jourActuel: JOUR_OUVERTURE_BAZAR + 10,
  niveauAtelier: 3,
  niveauStockage: 3,
  niveauCamion: 3,
  tutorielEtape: "termine",
});

// Les cartouches DONNÉES : `templateDonne()` ne regarde que `donation !== null`.
for (const templateId of TROUVES) {
  const t = getTemplate(templateId);
  if (!t) throw new Error(`template introuvable : ${templateId}`);
  state.collection[t.categorie].push({
    templateId,
    nom: t.nom,
    categorie: t.categorie,
    rarete: t.rarete,
    vu: true,
    dejaPossede: true,
    donation: {
      etat: "Bon",
      valeur: t.prixReference,
      valeurBase: t.prixReference,
      prixAchat: Math.round(t.prixReference * 0.4),
    },
  });
}

const save = {
  ...state,
  version: SAVE_VERSION,
  energie: 5,
  energieDerniereMaj: 0,
};

const html = `<!DOCTYPE html>
<meta charset="utf-8">
<title>Partie de test — borne d'arcade</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 640px; margin: 3rem auto; padding: 0 1rem; background: #1c1917; color: #e7e5e4; }
  h1 { font-size: 1.3rem; } li { margin: .5rem 0; } code { color: #fbbf24; }
  button { font-size: 1.05rem; padding: .7rem 1.2rem; border-radius: 8px; border: none; cursor: pointer; background: #b45309; color: white; margin: 0 .6rem .6rem 0; }
  button.secondaire { background: #3f3f46; }
  button.danger { background: #7f1d1d; }
  #etat { margin-top: 1rem; font-weight: 600; }
  a { color: #fbbf24; }
</style>
<h1>🕹 Partie de test — la feuille de soutien de la borne</h1>
<ol>
  <li>« Installer » écrit la partie dans <b>l'emplacement 3</b> et le rend actif. Les emplacements 1 et 2 ne sont pas touchés.</li>
  <li>Ouvre le jeu → <b>Continuer</b> → porte du <b>Bazar</b> (ouvert : on est au jour ${save.jourActuel}).</li>
  <li>Tape la <b>borne d'arcade</b>, puis tape l'un des <b>trois premiers jeux</b> (les seuls trouvés, sans neige).</li>
  <li>Le <b>premier</b> tap ouvre la feuille de soutien ; les suivants affichent le toast « mode démonstration ».</li>
</ol>
<p>Pour revoir la feuille autant de fois qu'il faut : « Rejouer la première fois » efface le drapeau <code>${"projet-broc:soutien:borne:v1"}</code>, puis recharge le jeu.</p>
<button id="go">Installer la partie de test</button>
<button id="rejouer" class="secondaire">Rejouer la première fois</button>
<button id="wipe" class="danger">Effacer l'emplacement 3</button>
<p id="etat"></p>
<script>
const SAVE = ${JSON.stringify(save)};
const CLE_SLOT = "projet-broc:slot:3:v1";
const CLE_INDEX = "projet-broc:slots:v1";
const CLE_VU = "projet-broc:soutien:borne:v1";
const etat = document.getElementById("etat");

function lireIndex() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_INDEX) || "null");
    if (brut && brut.slots) return brut;
  } catch {}
  return { actif: 3, slots: { 1: null, 2: null, 3: null } };
}

document.getElementById("go").onclick = () => {
  localStorage.setItem(CLE_SLOT, JSON.stringify(SAVE));
  const index = lireIndex();
  index.slots[3] = { nom: "Test borne", derniereSession: Date.now(), revision: 1 };
  index.actif = 3;
  localStorage.setItem(CLE_INDEX, JSON.stringify(index));
  localStorage.removeItem(CLE_VU);
  etat.innerHTML = '✅ Installée dans l\\'emplacement 3 — <a href="/">ouvrir le jeu</a>';
};

document.getElementById("rejouer").onclick = () => {
  localStorage.removeItem(CLE_VU);
  etat.innerHTML = '🔁 Drapeau effacé — <a href="/">recharge le jeu</a>, la feuille se rouvrira au prochain tap.';
};

document.getElementById("wipe").onclick = () => {
  localStorage.removeItem(CLE_SLOT);
  const index = lireIndex();
  index.slots[3] = null;
  if (index.actif === 3) index.actif = 1;
  localStorage.setItem(CLE_INDEX, JSON.stringify(index));
  etat.textContent = "🗑 Emplacement 3 effacé.";
};
</script>
`;

const dst = path.join(ROOT, "public", "dev-save-borne.html");
await fs.writeFile(dst, html, "utf8");
console.log(
  `écrit ${path.relative(ROOT, dst)} — save v${SAVE_VERSION}, jour ${save.jourActuel}, ` +
    `${TROUVES.length} jeux trouvés (${Math.round(html.length / 1024)} Ko)`,
);
