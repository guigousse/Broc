#!/usr/bin/env node
/**
 * Audit des résidus français dans l'UI (chantier i18n, SP2+).
 *
 * Parcourt les .tsx de src/app et src/components (hors tests, hors outillage
 * dev) et signale les littéraux utilisateur qui ressemblent à du français en
 * dur : texte JSX, aria-label, title, placeholder, alt, toast(...).
 *
 * Sortie : une ligne `fichier:ligne  extrait` par suspect, code retour 1 si
 * au moins un suspect hors liste d'exclusions. Zéro dépendance.
 *
 * Usage : node scripts/audit-i18n-residuel.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RACINES = ["src/app", "src/components"];

/**
 * Exclusions assumées (fichier entier) — outillage dev jamais vu par le
 * joueur, ou UI d'édition interne. Chaque entrée doit avoir sa justification.
 */
const FICHIERS_EXCLUS = [
  // Éditeurs de layout dev (drag & drop interne, gated hors prod)
  "src/components/mobile/qg/dev/",
  "src/components/mobile/brocante-pano/BrocanteFramesEditContext.tsx",
  "src/components/mobile/brocante-pano/BrocanteFramesEditOverlay.tsx",
  "src/components/mobile/brocante-pano/ScenesEditPanel.tsx",
  "src/components/mobile/brocante-pano/cadreedit/",
  // Panneau dev du coffre (gated DEV_PANEL)
  "src/components/vente/DevPanel.tsx",
  // Documents juridiques : rédigés en français (droit français), leur
  // traduction relève d'une passe légale dédiée, pas des dictionnaires UI.
  "src/app/mentions-legales/",
  "src/app/privacy/",
];

/**
 * Lignes tolérées ponctuellement (contenu data/SP3-SP4 transitant par l'UI,
 * ou faux positifs structurels). Format : [suffixe de chemin, motif inclus
 * dans la ligne, justification courte].
 */
const LIGNES_TOLEREES = [
  // Libellés de catégories (CategorieObjet) : data, traduits en SP3.
  ["stockageBoxesLayout.ts", "categorie:", "CategorieObjet = data (SP3)"],
  // Fallback FR canonique d'un nom de compétence dans un const de résolution
  // (résolu à l'affichage via `nomCompetence`, cf. PALIERS_PRESENTATION).
  ["PersonaInfoOverlay.tsx", "Œil aiguisé", "fallback FR de nomCompetence"],
];

/**
 * Cibles d'appel dont les chaînes sont techniques (messages de dev, invariants)
 * et jamais de l'UI joueur : exclues du motif « littéral en argument ». `confirm`
 * / `alert` / `prompt` restent captés (vraies boîtes de dialogue utilisateur).
 */
const APPELS_NON_UI = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "warn",
  "error",
  "log",
  "info",
  "debug",
  "assert",
  "require",
]);

const MOTIF_FR =
  /[éèêëàâçîïôûùœÉÈÀÇŒ]|\b(le|la|les|des|une|votre|vos|avec|pour|dans|chez|sur)\b/;

const MOTIF_BRUIT =
  /var\(--|https?:\/\/|^[\s{}()<>/*,;.]*$|className|font-|data-|#[0-9a-f]{3}|\.(webp|png|svg|mp3)/i;

function* fichiersTsx(dossier) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    const st = statSync(chemin);
    if (st.isDirectory()) yield* fichiersTsx(chemin);
    else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) yield chemin;
  }
}

function estExclu(chemin) {
  const rel = relative(process.cwd(), chemin).replaceAll("\\", "/");
  return FICHIERS_EXCLUS.some((e) => rel.includes(e));
}

function estTolere(chemin, ligne) {
  const rel = relative(process.cwd(), chemin).replaceAll("\\", "/");
  return LIGNES_TOLEREES.some(
    ([suffixe, motif]) => rel.endsWith(suffixe) && ligne.includes(motif),
  );
}

/** Extrait les candidats « texte utilisateur » d'une ligne de source. */
function candidats(ligne) {
  const resultats = [];
  // Texte JSX entre balises : >Texte<
  for (const m of ligne.matchAll(/>([^<>{}]*[A-Za-zé][^<>{}]*)</g)) {
    resultats.push(m[1]);
  }
  // Attributs utilisateur et toasts avec littéral direct
  for (const m of ligne.matchAll(
    /(?:aria-label|title|placeholder|alt|ariaLabel)\s*[=:]\s*["'`]([^"'`]{3,})["'`]|toast\(\s*["'`]([^"'`]{3,})["'`]/g,
  )) {
    resultats.push(m[1] ?? m[2]);
  }
  // Littéral passé en argument d'appel de fonction : renderSection("Texte", …).
  // Capté au-delà des attributs/toasts pour ne pas manquer les libellés poussés
  // via un helper de rendu. On ignore les cibles techniques (Error/console/…)
  // dont les chaînes sont des messages de dev, jamais de l'UI joueur.
  for (const m of ligne.matchAll(/\b([A-Za-z_$][\w$]*)\(\s*["'`]([^"'`]{3,})["'`]/g)) {
    if (!APPELS_NON_UI.has(m[1])) resultats.push(m[2]);
  }
  return resultats.filter(
    (t) => t && t.trim().length >= 3 && MOTIF_FR.test(t) && !MOTIF_BRUIT.test(t),
  );
}

let suspects = 0;
for (const racine of RACINES) {
  for (const chemin of fichiersTsx(racine)) {
    if (estExclu(chemin)) continue;
    const lignes = readFileSync(chemin, "utf8").split("\n");
    lignes.forEach((ligne, i) => {
      // Le filtre de bruit s'applique au CANDIDAT extrait (dans `candidats`),
      // JAMAIS à la ligne entière : une ligne contenant une couleur hex ou un
      // nom de classe pouvait masquer un vrai résidu à côté (« Prêt ✓ » dans un
      // <span style={{ background: "#2c5e3f" }}>).
      if (estTolere(chemin, ligne)) return;
      for (const c of candidats(ligne)) {
        console.log(
          `${relative(process.cwd(), chemin)}:${i + 1}  ${c.trim().slice(0, 70)}`,
        );
        suspects++;
      }
    });
  }
}

if (suspects > 0) {
  console.error(`\n✗ ${suspects} résidu(s) français suspect(s).`);
  process.exit(1);
}
console.log("✓ Aucun résidu français suspect dans l'UI.");
