/** Capture des écrans réels du jeu avec Playwright. */
import path from "node:path";
import { scriptAmorce, scriptGraine } from "./amorce.mjs";
import { BROCANTE_DEMO } from "./config.mjs";
import { LIBELLE_NEGOCIER } from "./textes.mjs";

/** Laisse retomber les animations d'entrée avant de déclencher. */
const REPOS_MS = 1200;

/**
 * Le vendeur mystère apparaît en tête de pile selon un tirage aléatoire
 * (probabilité décroissante, cf. `lib/boiteMystere`) : sa carte n'a pas de
 * bouton Négocier. Depuis la graine fixe (scriptGraine), une nouvelle
 * navigation ne relance PLUS un tirage indépendant : le RNG est réinitialisé
 * à l'identique à chaque page, donc le résultat est déterministe pour une
 * graine donnée — soit toutes les tentatives réussissent (celle-ci ne
 * boucle jamais), soit elles échouent toutes de la même façon. La boucle
 * reste utile : elle fait échouer vite et clairement, avec un message qui
 * dit quoi faire (changer de graine via --seed), plutôt que de laisser
 * passer une capture sans bouton Négocier.
 */
const ESSAIS_NEGO_MAX = 6;

/**
 * Zones de sécurité (`env(safe-area-inset-*)`) d'un vrai appareil. Chromium
 * headless ne les simule jamais (toujours 0) : sans ce correctif, l'en-tête
 * du jeu se colle en haut de l'écran, exactement là où le gabarit dessine
 * l'île dynamique du châssis — qui vient alors recouvrir le niveau affiché.
 * iPhone : 59 pt est la valeur réelle de `safe-area-inset-top` sur les
 * appareils à Dynamic Island (mesurée sur iPhone 15 Pro) — un peu plus que
 * l'île elle-même, pour qu'elle flotte avec de la marge au-dessus de
 * l'en-tête plutôt qu'au ras de son bord.
 */
function zoneSecurite(appareil) {
  return appareil.chassis.island
    ? { top: 59, bottom: 34 } // iPhone à île dynamique
    : { top: 24, bottom: 20 }; // iPad, pas d'île mais coins arrondis + geste
}

export async function capturerEcrans({
  navigateur, baseUrl, langue, appareil, visuels, saveJson, dossier, graine, log = () => {},
}) {
  const contexte = await navigateur.newContext({
    viewport: appareil.viewport,
    deviceScaleFactor: appareil.densite,
    isMobile: true,
    hasTouch: true,
    locale: langue,
    reducedMotion: "reduce",
  });
  // Avant toute autre chose : fige Math.random pour que le contenu tiré
  // (objet, vendeur, humeur…) soit reproductible et identique entre langues.
  await contexte.addInitScript(scriptGraine(graine));
  await contexte.addInitScript(scriptAmorce(saveJson, langue));
  // En style inline sur <html> : prime sur toute règle de feuille de style,
  // quel que soit l'ordre de chargement (contrairement à une règle :root
  // injectée, qu'une feuille chargée plus tard écraserait silencieusement).
  // `document.documentElement` n'existe pas encore à l'exécution du script
  // (il tourne avant même la création du DOM) : on passe par l'écouteur, et
  // on retente immédiatement au cas où il existerait déjà.
  await contexte.addInitScript((zone) => {
    const appliquer = () => {
      document.documentElement.style.setProperty("--safe-top", `${zone.top}px`);
      document.documentElement.style.setProperty("--safe-bottom", `${zone.bottom}px`);
    };
    document.addEventListener("DOMContentLoaded", appliquer);
    if (document.documentElement) appliquer();
  }, zoneSecurite(appareil));
  const faites = new Map();
  try {
    for (const visuel of visuels) {
      if (!visuel.route) continue; // visuel 5 : pas d'écran de jeu
      const essaisMax = visuel.ouvrirNego ? ESSAIS_NEGO_MAX : 1;
      let ouvert = false;

      for (let tentative = 1; tentative <= essaisMax && !ouvert; tentative++) {
        const page = await contexte.newPage();
        const url = baseUrl + visuel.route(BROCANTE_DEMO);
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForSelector(visuel.ancre, { timeout: 20000 });

        if (visuel.ouvrirNego) {
          const bouton = page.getByRole("button", {
            name: new RegExp(LIBELLE_NEGOCIER[langue], "i"),
          });
          if ((await bouton.count()) === 0) {
            // Vendeur mystère tiré en tête : pas de carte à négocier ici.
            await page.close();
            continue;
          }
          // NB : `visuel.ancre` (img[src*="/personas/vendeur-"]) est déjà
          // présente avant même ce clic — ChineNegoDrawer.tsx la rend hors
          // du ternaire `expanded` — donc la réattendre ne prouve rien sur
          // l'ouverture du tiroir. Le bouton cliqué, lui, ne survit qu'au
          // repli (peekBtnRow bascule sur la bulle de dialogue une fois
          // `expanded` vrai) : sa disparition est la preuve que l'accordéon
          // s'est bien ouvert, contrairement au délai fixe qui suit.
          await bouton.first().click();
          await bouton.first().waitFor({ state: "detached", timeout: 20000 });
        }

        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(REPOS_MS);

        const fichier = path.join(dossier, `${langue}-${appareil.id}-${visuel.cle}.png`);
        await page.screenshot({ path: fichier, type: "png" });
        faites.set(visuel.cle, fichier);
        log(`  ✓ capture ${langue}/${appareil.id}/${visuel.cle}`);
        await page.close();
        ouvert = true;
      }

      if (!ouvert) {
        throw new Error(
          `${visuel.cle} : le vendeur mystère est tombé en tête ${essaisMax} fois de suite, ` +
            "aucune carte à négocier n'a pu être capturée — essaie une autre graine (--seed=...)",
        );
      }
    }
  } finally {
    await contexte.close();
  }
  return faites;
}
