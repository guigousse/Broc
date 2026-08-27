/**
 * Point d'entrée de la page — version provisoire pour voir l'aperçu de la scène
 * (Task 4). Remplacée par l'interface complète en Task 7.
 */
import { calculerRoulette, estFlash, tempsBoucle } from "./roulette.js";
import { chargerCatalogue } from "./catalogue.js";
import { CacheImages, chargerImage } from "./images.js";
import { dessinerFrame } from "./rendu.js";

async function chargerFontes() {
  const fontes = await Promise.all([
    new FontFace("Cinzel", "url(assets/fonts/cinzel.woff2)").load(),
    new FontFace("Verve Shadow", "url(assets/fonts/VerveShadow.ttf)").load(),
  ]);
  fontes.forEach((f) => document.fonts.add(f));
}

async function demarrer() {
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");

  await chargerFontes();

  const catalogue = await chargerCatalogue();
  const entrees = catalogue.slice(0, 8);
  const cfg = {
    nbObjets: 8, indexCible: 2, vitesse: 2.5, espacement: 520,
    nbPassages: 3, largeurFlash: 4,
  };
  const r = calculerRoulette(cfg);

  const cache = new CacheImages();
  const [fond, objets, silhouette, appStore, googlePlay] = await Promise.all([
    cache.fond("foire-chatou"),
    Promise.all(entrees.map((e) => cache.objet(e.id))),
    cache.silhouette(entrees[cfg.indexCible].id),
    chargerImage("assets/badges/app-store.svg"),
    chargerImage("assets/badges/google-play.svg"),
  ]);

  const scene = {
    r, cfg, fond, objets, silhouette,
    consigne: `Mets pause sur ${entrees[cfg.indexCible].nom} !`,
    badges: { appStore, googlePlay },
  };

  const t0 = performance.now();
  function boucle(now) {
    const t = tempsBoucle((now - t0) / 1000, r);
    dessinerFrame(ctx, t, { ...scene, flashActif: estFlash(t, r) });
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);
}

demarrer().catch((e) => console.error(e));
