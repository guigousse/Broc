#!/usr/bin/env node
/**
 * Série App Store « triptyque » — 6 visuels par langue et par appareil.
 *
 * Pourquoi : dans les résultats de recherche, l'App Store n'affiche que les
 * TROIS premières captures, côte à côte. Les traiter comme un seul dessin
 * continu (au lieu de trois images indépendantes) est ce qui distingue les
 * fiches soignées — l'œil complète le raccord par-dessus les gouttières.
 *
 * Méthode : on peint UNE scène de six panneaux, puis on la découpe. Le raccord
 * tombe donc juste par construction, on ne l'ajuste pas à la main.
 *
 *   1  titre, accroche, grand-père en grand      ┐
 *   2  éventail d'aperçus                        ├ continus
 *   3  éventail d'aperçus (suite)                ┘
 *   4  votre stand          ┐
 *   5  les musiques         ├ autonomes, même langage visuel
 *   6  les personnages      ┘
 *
 * Toute la géométrie est exprimée en FRACTIONS de la largeur (L) ou de la
 * hauteur (H) d'un panneau : iPhone 6.5" et iPad 13" partagent le même
 * descriptif, seules quelques valeurs sont surchargées par appareil.
 *
 * Contraintes héritées de la chaîne App Store :
 * - sous `setContent`, les `file://` sont bloqués → polices ET images en base64 ;
 * - `document.fonts.check()` ment → on MESURE la largeur du titre ;
 * - l'écran collection est recadré sur son haut, ses objets non découverts
 *   étant des carrés noirs qui passent pour des images cassées.
 *
 * Usage :
 *   node scripts/appstore/generate-triptyque.mjs                  # fr, iphone
 *   node scripts/appstore/generate-triptyque.mjs --tout           # 4 langues × 2 appareils
 *   node scripts/appstore/generate-triptyque.mjs --langue el --appareil ipad
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

import { chargerFontFaceCss } from "./polices.mjs";
import { TITRES, MEDAILLON_PLUS, PORTRAITS_GALERIE } from "./textes.mjs";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CAPTURES = path.join(RACINE, "marketing/appstore/.captures");
const PERSONAS = path.join(RACINE, "public/personas");

// Palette du jeu (src/app/globals.css).
const FOREST_900 = "#0F1F18";
const FOREST_800 = "#163024";
const BRASS_100 = "#F1E3BF";
const BRASS_300 = "#D9C07A";

const PANNEAUX = 6;
const LANGUES = ["fr", "en", "es", "el"];

const APPAREILS = {
  iphone: { id: "iphone-6.5", L: 1242, H: 2688, grille: { colonnes: 4, lignes: 4 } },
  ipad: { id: "ipad-13", L: 2048, H: 2732, grille: { colonnes: 5, lignes: 4 } },
};

/**
 * Textes du panneau 1, sur deux étages.
 *
 * `revendication` vient en premier et en grand : c'est le positionnement du
 * jeu, pas une description de ses mécaniques — la seule phrase qui doive
 * survivre à la lecture en vignette d'un résultat de recherche. Les `verbes`
 * la suivent, plus petits ; ils sont repris tels quels des puces de
 * `docs/appstore/FICHE_APP_STORE.md`, langue par langue, où chacune garde son
 * adresse au joueur (vouvoiement en français, tutoiement en espagnol et en
 * grec). L'ancienne ligne d'appoint « jeu de brocante cosy » est supprimée :
 * la revendication dit déjà de quoi il s'agit, en bien plus lisible.
 *
 * Les retours à la ligne sont ÉCRITS, jamais laissés au navigateur : une
 * coupure automatique tombe où elle veut, et la revendication doit se lire en
 * deux blocs de sens, pas en deux morceaux de phrase.
 */
const ACCROCHES = {
  fr: {
    revendication: ["Le premier jeu", "de brocante !"],
    verbes: ["Chinez, restaurez, revendez…", "et collectionnez !"],
  },
  en: {
    revendication: ["The first", "flea market game!"],
    verbes: ["Hunt, restore, sell…", "and collect!"],
  },
  es: {
    revendication: ["¡El primer juego", "de mercadillo!"],
    verbes: ["Busca, restaura, vende…", "¡y colecciona!"],
  },
  el: {
    revendication: ["Το πρώτο παιχνίδι", "παζαριού!"],
    verbes: ["Ψάξε, αναπαλαίωσε, πούλα…", "και συμπλήρωσε!"],
  },
};

/**
 * Géométrie commune, en fractions. `x` est en multiples de L (0 = bord gauche
 * du panneau 1), `y` et `h` en fractions de H.
 */
const BASE = {
  titreLeft: 0.074, titreTop: 0.112, titreSize: 0.2415,
  traitTop: 0.2455, traitW: 0.209, traitH: 0.0026,
  // 0,0773 × 1242 = 96 px : la revendication est le plus gros texte de la
  // série après le logo. Les verbes suivent à 0,058 × 1242 = 72 px.
  revenTop: 0.262, revenSize: 0.0773, revenLh: 1.14, revenW: 0.92,
  accrocheTop: 0.356, accrocheSize: 0.058, accrocheLh: 1.22, accrocheW: 0.87,
  // Le grand-père descend et rétrécit d'autant : la colonne de texte du
  // panneau 1 a gagné un étage, et c'est le français — trois lignes de verbes,
  // sa première faisant 1117 px pour 1081 px de boîte — qui la dimensionne.
  // `gpW` est calé pour que le bas de l'image atteigne encore le bas du
  // panneau : plus petit, le grand-père flotterait au-dessus du vide.
  gpLeft: -0.145, gpTop: 0.466, gpW: 1.17,
  // Les en-têtes des panneaux 2 à 6 passent à la même taille que la
  // revendication : à 0,058 elles se lisaient à peine dans une vignette de
  // résultat de recherche, qui est pourtant leur seul usage réel.
  enteteTop: 0.1116, enteteSize: 0.0773, enteteLh: 1.2, entetePad: 0.062,
  filetTop: 0.9226,
  cadreRayon: 0.0419, cadreBord: 0.004,
  // Panneaux 4 et 5 : un seul écran, presque droit, au centre du panneau.
  solo: { y: 0.605, h: 0.66, rot: -3 },
  medaillon: { top: 0.24, marge: 0.06, gouttiere: 0.028 },
};

/**
 * L'iPad n'est pas un iPhone agrandi : son panneau est bien moins haut à
 * largeur égale (0,75 contre 0,46). Les tailles calées sur la largeur y
 * débordent donc en hauteur — sans ces surcharges, le grand-père traverse
 * l'accroche et le bloc de titre mange la moitié de l'image.
 */
const SURCHARGES = {
  iphone: {},
  ipad: {
    titreTop: 0.1, titreSize: 0.175,
    traitTop: 0.213, traitW: 0.16,
    // Le panneau iPad est bien moins haut à largeur égale : les deux étages
    // du panneau 1 y tiennent, mais seulement en les remontant ET en serrant
    // leurs interlignes — la mesure de fin de rendu le vérifie.
    revenTop: 0.232, revenSize: 0.0562, revenLh: 1.12, revenW: 0.88,
    accrocheTop: 0.3455, accrocheSize: 0.0421, accrocheLh: 1.22, accrocheW: 0.8,
    gpLeft: -0.1, gpTop: 0.44, gpW: 0.82,
    enteteTop: 0.1, enteteSize: 0.056, enteteLh: 1.2, entetePad: 0.08,
    cadreRayon: 0.022, cadreBord: 0.0025,
    solo: { y: 0.6, h: 0.7, rot: -3 },
    medaillon: { top: 0.26, marge: 0.07, gouttiere: 0.026 },
  },
};

/**
 * L'éventail court sur les panneaux 2 et 3. `chiner` est volontairement à
 * cheval sur la coupe : c'est lui qui prouve la continuité. Il est décalé pour
 * rester aux deux tiers dans le panneau 2 — une moitié de chaque côté ne
 * donnerait un écran complet à personne.
 */
const EVENTAIL = {
  iphone: [
    { cle: "musiques", x: 1.264, y: 0.6324, h: 0.5134, rot: -11, z: 1 },
    { cle: "collection", x: 2.609, y: 0.6324, h: 0.5134, rot: 11, z: 2, zoom: 1.55 },
    { cle: "negocier", x: 1.59, y: 0.6138, h: 0.5804, rot: -6, z: 3 },
    { cle: "vendre", x: 2.279, y: 0.6138, h: 0.5804, rot: 6, z: 4 },
    { cle: "chiner", x: 1.92, y: 0.6008, h: 0.6548, rot: 0, z: 5 },
  ],
  // Les captures iPad sont bien plus larges (ratio 0,75 contre 0,46) : à
  // hauteur égale l'éventail déborderait. On l'étale et on l'aplatit.
  ipad: [
    { cle: "musiques", x: 1.24, y: 0.615, h: 0.46, rot: -10, z: 1 },
    { cle: "collection", x: 2.74, y: 0.615, h: 0.46, rot: 10, z: 2, zoom: 1.45 },
    { cle: "negocier", x: 1.6, y: 0.605, h: 0.52, rot: -6, z: 3 },
    { cle: "vendre", x: 2.34, y: 0.605, h: 0.52, rot: 6, z: 4 },
    { cle: "chiner", x: 1.95, y: 0.6, h: 0.585, rot: 0, z: 5 },
  ],
};

/** Panneaux autonomes 4 et 5. */
const SOLOS = [
  { panneau: 3, cle: "vendre", rot: -3 },
  { panneau: 4, cle: "musiques", rot: 3 },
];

async function dataUri(chemin, mime) {
  const buf = await fs.readFile(chemin);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function construire({ langue, cleAppareil, navigateur, polices, verve, grandPere, portraits }) {
  const appareil = APPAREILS[cleAppareil];
  const { L, H, id, grille } = appareil;
  const TOTAL = L * PANNEAUX;
  // On écrit dans les dossiers canoniques : cette série REMPLACE l'ancienne
  // (un visuel = un téléphone + un titre). Porter les deux dans le dépôt
  // doublerait 136 Mo d'images ; l'ancienne reste dans l'historique git.
  const sortie = path.join(RACINE, "marketing/appstore", langue, id);
  await fs.mkdir(sortie, { recursive: true });
  // Les noms de fichiers changent (01-chiner → 01-titre, 03-vendre → 04-vendre) :
  // sans ce nettoyage, les anciens visuels survivraient à côté des nouveaux.
  for (const f of await fs.readdir(sortie)) {
    if (f.endsWith(".png")) await fs.unlink(path.join(sortie, f));
  }

  const g = { ...BASE, ...SURCHARGES[cleAppareil] };
  const px = (fraction, base) => Math.round(fraction * base);

  // Ratio réel des captures de CET appareil : il commande la largeur des cadres.
  const premiere = await sharp(path.join(CAPTURES, `${langue}-${id}-chiner.png`)).metadata();
  const ratio = premiere.width / premiere.height;

  const fond = await sharp(path.join(RACINE, "public/qg/facade-accueil.webp"))
    .resize(TOTAL, H, { fit: "cover", position: "top" })
    .blur(30)
    .modulate({ brightness: 0.5 })
    .png()
    .toBuffer();

  const cles = [...new Set([...EVENTAIL[cleAppareil].map((e) => e.cle), ...SOLOS.map((s) => s.cle)])];
  const ecrans = {};
  for (const cle of cles) {
    ecrans[cle] = await dataUri(path.join(CAPTURES, `${langue}-${id}-${cle}.png`), "image/png");
  }

  const cadre = (e, xAbs) => {
    const h = px(e.h, H);
    const w = Math.round(h * ratio);
    const style = e.zoom
      ? `width:${e.zoom * 100}%; height:${e.zoom * 100}%; margin-left:${((1 - e.zoom) / 2) * 100}%;`
      : "width:100%; height:100%;";
    return `<div class="cadre" style="
      left:${Math.round(xAbs - w / 2)}px; top:${px(e.y, H) - Math.round(h / 2)}px;
      width:${w}px; height:${h}px;
      transform: rotate(${e.rot}deg); z-index:${e.z ?? 4};">
      <img style="${style}" src="${ecrans[e.cle]}" alt="">
    </div>`;
  };

  const cadresEventail = [...EVENTAIL[cleAppareil]]
    .sort((a, b) => a.z - b.z)
    .map((e) => cadre(e, e.x * L))
    .join("\n    ");

  const cadresSolo = SOLOS.map((s) =>
    cadre({ ...g.solo, cle: s.cle, rot: s.rot, z: 4 }, (s.panneau + 0.5) * L),
  ).join("\n    ");

  // Panneau 6 : la galerie de portraits. La dernière case porte « et + ».
  const cases = grille.colonnes * grille.lignes;
  const galerie = portraits.slice(0, cases - 1);
  const largeurGalerie = L * (1 - 2 * g.medaillon.marge);
  const gouttiere = px(g.medaillon.gouttiere, L);
  const cellule = Math.round((largeurGalerie - (grille.colonnes - 1) * gouttiere) / grille.colonnes);

  const t = ACCROCHES[langue];
  const entete = (panneau, texte) =>
    `<div class="entete" style="left:${panneau * L}px">${texte}</div>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${polices}
@font-face { font-family: 'Verve Shadow'; src: url('${verve}') format('truetype'); }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: ${TOTAL}px; height: ${H}px; overflow: hidden; }
.scene { position: relative; width: ${TOTAL}px; height: ${H}px; background: ${FOREST_900}; }
.fond { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.voile {
  position: absolute; inset: 0;
  background:
    linear-gradient(180deg, ${FOREST_900}E6 0%, ${FOREST_900}99 26%, ${FOREST_900}B3 74%, ${FOREST_900}F2 100%),
    radial-gradient(${70 / PANNEAUX}% 60% at ${16 / PANNEAUX}% 40%, ${FOREST_800}CC 0%, ${FOREST_900}00 100%);
}
/* Halo derrière chaque groupe d'écrans : sans lui les écrans, sombres
   eux-mêmes, se confondent avec le fond au lieu de s'en détacher. */
.halo {
  position: absolute; inset: 0;
  background:
    radial-gradient(15% 42% at ${(2.4 / PANNEAUX) * 100}% 62%, rgba(217,192,122,0.20) 0%, rgba(217,192,122,0) 100%),
    radial-gradient(9% 40% at ${(3.5 / PANNEAUX) * 100}% 62%, rgba(217,192,122,0.16) 0%, rgba(217,192,122,0) 100%),
    radial-gradient(9% 40% at ${(4.5 / PANNEAUX) * 100}% 62%, rgba(217,192,122,0.16) 0%, rgba(217,192,122,0) 100%),
    radial-gradient(9% 40% at ${(5.5 / PANNEAUX) * 100}% 55%, rgba(217,192,122,0.14) 0%, rgba(217,192,122,0) 100%);
}
/* Le filet de laiton court sur les six panneaux à hauteur constante : c'est
   lui qui dit « une seule série » par-dessus les gouttières. */
.filet {
  position: absolute; left: 0; right: 0; top: ${px(g.filetTop, H)}px; height: ${px(g.traitH, H) + 2}px;
  background: linear-gradient(90deg, ${BRASS_300}00 0%, ${BRASS_300}CC 3%, ${BRASS_300}CC 97%, ${BRASS_300}00 100%);
}
.socle {
  position: absolute; left: 0; right: 0; top: ${px(g.filetTop, H) + 5}px; bottom: 0;
  background: linear-gradient(180deg, ${FOREST_900}00 0%, ${FOREST_900}E6 60%);
}

/* ---- panneau 1 ---- */
.bloc1 { position: absolute; left: 0; top: 0; width: ${L}px; height: ${H}px; z-index: 8; }
/* inline-block : la largeur épouse le texte, ce qui rend la police mesurable
   (un bloc prendrait la largeur du parent, quelle que soit la police). */
.titre {
  position: absolute; left: ${px(g.titreLeft, L)}px; top: ${px(g.titreTop, H)}px;
  display: inline-block;
  font-family: 'Verve Shadow', Georgia, serif;
  font-size: ${px(g.titreSize, L)}px; line-height: 0.9; color: ${BRASS_100};
  letter-spacing: 0.02em; text-shadow: 0 ${px(0.007, H)}px ${px(0.022, H)}px rgba(0,0,0,0.7);
}
.trait {
  position: absolute; left: ${px(g.titreLeft + 0.006, L)}px; top: ${px(g.traitTop, H)}px;
  width: ${px(g.traitW, L)}px; height: ${px(g.traitH, H)}px; background: ${BRASS_300};
}
.reven {
  position: absolute; left: ${px(g.titreLeft + 0.003, L)}px; top: ${px(g.revenTop, H)}px;
  width: ${px(g.revenW, L)}px;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: ${px(g.revenSize, L)}px; line-height: ${g.revenLh}; color: ${BRASS_100};
  text-shadow: 0 ${px(0.003, H)}px ${px(0.012, H)}px rgba(0,0,0,0.85);
}
.accroche {
  position: absolute; left: ${px(g.titreLeft + 0.003, L)}px; top: ${px(g.accrocheTop, H)}px;
  width: ${px(g.accrocheW, L)}px;
  font-family: 'Cinzel', Georgia, serif;
  font-size: ${px(g.accrocheSize, L)}px; line-height: ${g.accrocheLh}; color: ${BRASS_300};
  text-shadow: 0 ${px(0.002, H)}px ${px(0.009, H)}px rgba(0,0,0,0.8);
}
/* Le grand-père en grand, assis sur le filet, débordant par le bas et la
   gauche : il doit paraître entrer dans le cadre, pas y flotter. */
.grandpere {
  position: absolute; left: ${px(g.gpLeft, L)}px; top: ${px(g.gpTop, H)}px;
  width: ${px(g.gpW, L)}px; height: ${px(g.gpW, L)}px;
  object-fit: contain; object-position: bottom;
  filter: drop-shadow(0 ${px(0.009, H)}px ${px(0.019, H)}px rgba(0,0,0,0.65));
}

/* ---- panneaux 2 à 6 ---- */
.entete {
  position: absolute; top: ${px(g.enteteTop, H)}px; width: ${L}px; z-index: 8;
  font-family: 'Cinzel', Georgia, serif;
  font-size: ${px(g.enteteSize, L)}px; line-height: ${g.enteteLh}; color: ${BRASS_100};
  text-align: center; padding: 0 ${px(g.entetePad, L)}px;
  text-shadow: 0 ${px(0.002, H)}px ${px(0.01, H)}px rgba(0,0,0,0.85);
}
.cadre {
  position: absolute;
  border-radius: ${px(g.cadreRayon, L)}px; border: ${px(g.cadreBord, L)}px solid rgba(217,192,122,0.6);
  overflow: hidden; background: ${FOREST_900};
  box-shadow: 0 ${px(0.022, H)}px ${px(0.045, H)}px rgba(0,0,0,0.7),
              0 ${px(0.0015, H)}px 0 rgba(241,227,191,0.16) inset;
}
.cadre img { display: block; object-fit: cover; }

/* ---- panneau 6 : la galerie ---- */
.galerie {
  position: absolute; left: ${5 * L + px(g.medaillon.marge, L)}px; top: ${px(g.medaillon.top, H)}px;
  width: ${Math.round(largeurGalerie)}px; z-index: 6;
  display: grid; grid-template-columns: repeat(${grille.colonnes}, 1fr); gap: ${gouttiere}px;
}
.case {
  width: 100%; aspect-ratio: 1; border-radius: 50%;
  border: ${Math.max(2, px(0.0035, L))}px solid ${BRASS_300};
  overflow: hidden; background: ${FOREST_800};
  box-shadow: 0 ${px(0.004, H)}px ${px(0.011, H)}px rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
}
/* Les portraits n'ont pas tous le même format (340x393, 512x512, 320x304…) :
   on cadre sur le haut du buste plutôt que sur le centre géométrique. */
.case img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 8%; }
.plus {
  font-family: 'Cinzel', Georgia, serif; color: ${BRASS_300};
  font-size: ${Math.round(cellule * 0.24)}px; letter-spacing: 0.04em;
}
</style></head><body>
  <div class="scene">
    <img class="fond" src="data:image/png;base64,${fond.toString("base64")}" />
    <div class="voile"></div>
    <div class="halo"></div>
    ${cadresEventail}
    ${cadresSolo}
    <div class="filet"></div>
    <div class="socle"></div>

    <div class="bloc1">
      <div class="titre">BROC</div>
      <div class="trait"></div>
      <div class="reven">${t.revendication.join("<br>")}</div>
      <div class="accroche">${t.verbes.join("<br>")}</div>
      <img class="grandpere" src="${grandPere}" alt="">
    </div>

    ${entete(1, TITRES.negocier[langue])}
    ${entete(2, TITRES.collection[langue])}
    ${entete(3, TITRES.vendre[langue])}
    ${entete(4, TITRES.musiques[langue])}
    ${entete(5, TITRES.personnages[langue])}

    <div class="galerie">
      ${galerie.map((p) => `<div class="case"><img src="${p}" alt=""></div>`).join("\n      ")}
      <div class="case"><span class="plus">${MEDAILLON_PLUS[langue]}</span></div>
    </div>
  </div>
</body></html>`;

  const page = await navigateur.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });
  await page.setViewportSize({ width: TOTAL, height: H });
  // La scène iPad fait 12 288 × 2 732 px et embarque une douzaine d'images en
  // base64 : `load` attend leur décodage, et les 30 s par défaut de Playwright
  // tombent une fois sur deux sur cette machine. Le rendu n'est pas en cause,
  // seul le délai l'était.
  await page.setContent(html, { waitUntil: "load", timeout: 180000 });

  // `document.fonts.check()` ment : on MESURE la largeur du titre avec la
  // police attendue, puis avec un repli. Deux largeurs égales = police absente.
  // Les sondes doivent être EN LIGNE : un bloc garde la largeur de son parent
  // quelle que soit la police, et la mesure ne dirait plus rien.
  const mesure = await page.evaluate((texteLangue) => {
    const lire = (sel) => {
      const el = document.querySelector(sel);
      const avant = el.getBoundingClientRect().width;
      const origine = getComputedStyle(el).fontFamily;
      el.style.fontFamily = "Georgia, serif";
      const apres = el.getBoundingClientRect().width;
      el.style.fontFamily = origine;
      return { avant, apres };
    };
    const sonde = document.createElement("span");
    sonde.id = "sonde";
    sonde.textContent = texteLangue;
    sonde.style.cssText =
      "position:absolute;visibility:hidden;white-space:nowrap;display:inline-block;" +
      "font-family:'Cinzel',Georgia,serif;font-size:120px;";
    document.body.appendChild(sonde);
    return { titre: lire(".titre"), cinzel: lire("#sonde") };
  }, TITRES.negocier[langue]);

  if (Math.abs(mesure.titre.avant - mesure.titre.apres) < 1) {
    throw new Error(
      `${langue}/${id} : Verve Shadow non appliquée au titre (largeur identique au repli : ${mesure.titre.avant}px).`,
    );
  }
  // Cinzel est une fonte latine : sur le grec, le navigateur retombe glyphe par
  // glyphe sur un repli. Ce n'est pas une panne — c'est le comportement déjà
  // accepté par la chaîne App Store — mais il faut le savoir, pas le découvrir.
  if (Math.abs(mesure.cinzel.avant - mesure.cinzel.apres) < 1) {
    console.warn(`   ⚠ ${langue}/${id} : les en-têtes retombent sur la police de repli (Cinzel ne couvre pas ce script).`);
  }

  await page.evaluate(() =>
    Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null)))),
  );
  await page.waitForTimeout(400);

  // Les deux étages du panneau 1 et les en-têtes des cinq autres viennent
  // d'être agrandis : leur place n'est plus acquise, elle est disputée — par
  // le grand-père en dessous, par les écrans et la galerie sur les autres
  // panneaux. Une collision ne fait pas planter le rendu, elle produit une
  // capture illisible qu'on ne remarque qu'à l'œil, langue par langue. On
  // MESURE donc les boîtes rendues, avec la vraie police, et on refuse de
  // livrer si elles se chevauchent.
  const boites = await page.evaluate((largeurPanneau) => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect() : null;
    };
    const panneauDe = (rect) => Math.round(rect.left / largeurPanneau);
    const obstacles = [...document.querySelectorAll(".cadre, .galerie")].map((el) => {
      const b = el.getBoundingClientRect();
      return { gauche: b.left, droite: b.right, haut: b.top };
    });
    const entetes = [...document.querySelectorAll(".entete")].map((el) => {
      const b = el.getBoundingClientRect();
      const panneau = panneauDe(b);
      const bornes = [panneau * largeurPanneau, (panneau + 1) * largeurPanneau];
      // Un écran de l'éventail déborde sur le panneau voisin : on ne retient
      // que les obstacles qui mordent VRAIMENT sur la colonne de l'en-tête.
      const dessous = obstacles.filter((o) => o.droite > bornes[0] && o.gauche < bornes[1]);
      return {
        panneau,
        texte: el.textContent.trim(),
        bas: b.bottom,
        lignes: Math.round(b.height / parseFloat(getComputedStyle(el).lineHeight)),
        obstacleHaut: dessous.length ? Math.min(...dessous.map((o) => o.haut)) : Infinity,
      };
    });
    const reven = r(".reven");
    const accroche = r(".accroche");
    const gp = r(".grandpere");
    return {
      revenBas: reven.bottom,
      accrocheHaut: accroche.top,
      accrocheBas: accroche.bottom,
      grandPereHaut: gp.top,
      entetes,
    };
  }, L);

  // Recaler la colonne du panneau 1 demande de LIRE les boîtes, pas de les
  // deviner : `BROC_DEBUG_BOITES=1` les imprime toutes, y compris celles qui
  // ne sont pas encore en collision mais qui n'ont plus de marge.
  if (process.env.BROC_DEBUG_BOITES) console.log(JSON.stringify(boites, null, 2));

  const collisions = [];
  if (boites.revenBas > boites.accrocheHaut) {
    collisions.push(
      `panneau 1 : la revendication (bas à ${boites.revenBas.toFixed(0)}px) recouvre ` +
        `les verbes (haut à ${boites.accrocheHaut.toFixed(0)}px)`,
    );
  }
  if (boites.accrocheBas > boites.grandPereHaut) {
    collisions.push(
      `panneau 1 : les verbes (bas à ${boites.accrocheBas.toFixed(0)}px) recouvrent ` +
        `le grand-père (haut à ${boites.grandPereHaut.toFixed(0)}px)`,
    );
  }
  for (const e of boites.entetes) {
    if (e.bas > e.obstacleHaut) {
      collisions.push(
        `panneau ${e.panneau + 1} : l'en-tête « ${e.texte} » (${e.lignes} lignes, bas à ` +
          `${e.bas.toFixed(0)}px) recouvre l'image en dessous (haut à ${e.obstacleHaut.toFixed(0)}px)`,
      );
    }
  }
  if (collisions.length) {
    throw new Error(`${langue}/${id} — texte trop grand :\n   ${collisions.join("\n   ")}`);
  }

  const scene = await page.screenshot({ type: "png" });
  await page.close();

  const noms = ["01-titre", "02-negocier", "03-collection", "04-vendre", "05-musiques", "06-personnages"];
  for (let i = 0; i < PANNEAUX; i++) {
    const cible = path.join(sortie, `${noms[i]}.png`);
    await sharp(scene)
      .extract({ left: i * L, top: 0, width: L, height: H })
      .flatten({ background: FOREST_900 })
      .png({ compressionLevel: 9 })
      .toFile(cible);
    const meta = await sharp(cible).metadata();
    if (meta.width !== L || meta.height !== H) {
      throw new Error(`${noms[i]} : ${meta.width}×${meta.height}, attendu ${L}×${H}.`);
    }
    if (meta.hasAlpha) throw new Error(`${noms[i]} a un canal alpha — App Store le refuse.`);
  }
  console.log(
    `✅ ${langue}/${id} — 6 visuels ${L}×${H} (titre ${mesure.titre.avant.toFixed(0)}px ` +
      `vs repli ${mesure.titre.apres.toFixed(0)}px)`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const lire = (nom, defaut) => {
    const i = args.indexOf(`--${nom}`);
    return i > -1 ? args[i + 1] : defaut;
  };
  const tout = args.includes("--tout");
  const langues = tout ? LANGUES : [lire("langue", "fr")];
  const appareils = tout ? Object.keys(APPAREILS) : [lire("appareil", "iphone")];

  for (const l of langues) {
    if (!ACCROCHES[l]) throw new Error(`Langue non gérée : ${l} (disponibles : ${LANGUES})`);
  }
  for (const a of appareils) {
    if (!APPAREILS[a]) throw new Error(`Appareil inconnu : ${a} (disponibles : ${Object.keys(APPAREILS)})`);
  }

  const css = await fs.readFile(path.join(RACINE, "src/app/globals.css"), "utf8");
  const polices = await chargerFontFaceCss(css, ["Cinzel"], path.join(RACINE, "public"));
  const verve = await dataUri(path.join(RACINE, "public/fonts/VerveShadow.ttf"), "font/ttf");
  const grandPere = await dataUri(
    path.join(RACINE, "public/personas/grand-pere/hd/souriant.webp"),
    "image/webp",
  );
  const portraits = await Promise.all(
    PORTRAITS_GALERIE.map((p) => dataUri(path.join(PERSONAS, p), "image/webp")),
  );

  const navigateur = await chromium.launch();
  try {
    for (const langue of langues) {
      for (const cleAppareil of appareils) {
        await construire({ langue, cleAppareil, navigateur, polices, verve, grandPere, portraits });
      }
    }
  } finally {
    await navigateur.close();
  }
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
