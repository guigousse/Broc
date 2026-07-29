/** Capture des écrans réels du jeu avec Playwright. */
import path from "node:path";
import { scriptAmorce } from "./amorce.mjs";
import { BROCANTE_DEMO } from "./config.mjs";
import { LIBELLE_NEGOCIER } from "./textes.mjs";

/** Laisse retomber les animations d'entrée avant de déclencher. */
const REPOS_MS = 1200;

/**
 * Le vendeur mystère apparaît en tête de pile selon un tirage aléatoire
 * (probabilité décroissante, cf. `lib/boiteMystere`) : sa carte n'a pas de
 * bouton Négocier. Une nouvelle navigation relance un tirage indépendant —
 * quelques tentatives suffisent donc à retomber sur une carte d'objet.
 */
const ESSAIS_NEGO_MAX = 6;

/**
 * Zones de sécurité (`env(safe-area-inset-*)`) d'un vrai appareil. Chromium
 * headless ne les simule jamais (toujours 0) : sans ce correctif, l'en-tête
 * du jeu se colle en haut de l'écran, exactement là où le gabarit dessine
 * l'île dynamique du châssis — qui vient alors recouvrir le niveau affiché.
 */
function zoneSecurite(appareil) {
  return appareil.chassis.island
    ? { top: 54, bottom: 34 } // iPhone à île dynamique
    : { top: 24, bottom: 20 }; // iPad, pas d'île mais coins arrondis + geste
}

export async function capturerEcrans({
  navigateur, baseUrl, langue, appareil, visuels, saveJson, dossier, log = () => {},
}) {
  const contexte = await navigateur.newContext({
    viewport: appareil.viewport,
    deviceScaleFactor: appareil.densite,
    isMobile: true,
    hasTouch: true,
    locale: langue,
    reducedMotion: "reduce",
  });
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
          await bouton.first().click();
          await page.waitForSelector(visuel.ancre, { timeout: 20000 });
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
            "aucune carte à négocier n'a pu être capturée",
        );
      }
    }
  } finally {
    await contexte.close();
  }
  return faites;
}
