/** Construction du document HTML d'un visuel. Module pur. */
import { BULLE, MEDAILLON_PLUS, TITRES } from "./textes.mjs";

const BLOC_FONT_FACE = /@font-face\s*\{[^}]*\}/g;
const URL_POLICE = /url\((['"]?)(\/fonts\/[^'")]+)\1\)/g;
const PLAGE_POIDS = /font-weight:\s*(\d+)\s+(\d+)\s*;/;
// Poids réellement utilisés par le gabarit (titre et « et + » en 700, bulle
// en 400) — dupliquer sur ces quatre valeurs couvre tout, y compris si un
// futur réglage change de poids.
const POIDS_DISCRETS = [400, 500, 600, 700];

/**
 * Les replis grecs (GFS Didot, EB Garamond italique) déclarent un seul bloc
 * couvrant `font-weight: 100 900`, quand les blocs latins en déclarent un
 * par poids discret (400/500/600/700). Chromium (constaté en 149 headless)
 * choisit le meilleur poids **avant** de regarder `unicode-range` : face à
 * un texte grec en 700, il élit le bloc latin 700 — qui ne couvre pourtant
 * pas le grec — plutôt que le bloc grec à plage large, et le grec retombe
 * en silence sur le serif système. Dupliquer chaque bloc à plage de poids
 * en un bloc par poids discret élimine l'écart de spécificité : à poids
 * égal, la comparaison se fait enfin sur `unicode-range`, et le bon bloc
 * gagne.
 */
function eclaterPlagesDePoids(blocs) {
  return blocs.flatMap((b) => {
    const m = b.match(PLAGE_POIDS);
    if (!m) return [b];
    return POIDS_DISCRETS.map((p) => b.replace(PLAGE_POIDS, `font-weight: ${p};`));
  });
}

/**
 * Filtre les blocs `@font-face` de `globals.css` sur les familles demandées.
 * Les replis grecs sont déclarés SOUS le nom de la famille latine
 * (Cinzel → GFS Didot, Caveat → EB Garamond italique) : les garder suffit à
 * couvrir le grec, sans cas particulier ailleurs.
 */
function blocsGardes(css, familles) {
  const blocs = css.match(BLOC_FONT_FACE) ?? [];
  const gardes = blocs.filter((b) => {
    const m = b.match(/font-family:\s*['"]([^'"]+)['"]/);
    return m ? familles.includes(m[1]) : false;
  });
  if (gardes.length === 0) {
    throw new Error(`aucun @font-face trouvé pour ${familles.join(", ")}`);
  }
  return eclaterPlagesDePoids(gardes);
}

/**
 * Chemins `/fonts/…` référencés par les blocs `@font-face` des familles
 * demandées, dédupliqués. Sert à savoir quels fichiers charger avant
 * d'appeler `extraireFontFace`.
 */
export function cheminsPolices(css, familles) {
  const chemins = new Set();
  for (const b of blocsGardes(css, familles)) {
    for (const m of b.matchAll(URL_POLICE)) chemins.add(m[2]);
  }
  return [...chemins];
}

/**
 * Extrait de `globals.css` les blocs @font-face des familles demandées et
 * réécrit leurs URL via `resoudre` (chemin `/fonts/…` → URL finale — une URI
 * `data:` en base64 en pratique). Embarquer les octets évite toute requête
 * réseau : `rendu.mjs` compose la page avec `page.setContent()`, qui place le
 * document sur l'origine `about:blank`, où Chromium refuse les sous-
 * ressources `file://` — une police demandée puis refusée retombe sur le
 * repli serif du navigateur, en silence.
 */
export function extraireFontFace(css, familles, resoudre) {
  return blocsGardes(css, familles)
    .map((b) => b.replace(URL_POLICE, (_, q, chemin) => `url(${q}${resoudre(chemin)}${q})`))
    .join("\n");
}

const ECHAPPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ECHAPPE[c]);

/** Géométrie du châssis, en pixels de sortie. */
function geometrieChassis(appareil) {
  const { sortie, chassis } = appareil;
  if (chassis.mode === "largeur") {
    const largeur = Math.round(sortie.width * chassis.valeur);
    return { largeur, hauteur: Math.round(largeur / chassis.ratioEcran) };
  }
  const hauteur = Math.round(sortie.height * chassis.valeur);
  return { largeur: Math.round(hauteur * chassis.ratioEcran), hauteur };
}

export function construireHtml({
  visuel, langue, appareil, fontFaceCss,
  captureDataUri, grandPereDataUri, portraitsDataUri,
}) {
  const { sortie, grille } = appareil;
  const L = sortie.width;
  const H = sortie.height;
  const px = (frac, base = L) => Math.round(base * frac);
  const geo = geometrieChassis(appareil);
  // Rayons imbriqués (cadre métallique puis lunette noire) : chaque couche
  // interne perd l'épaisseur de la couche qui la contient, comme sur un
  // vrai boîtier — sinon les coins de l'écran ne suivent pas ceux du
  // châssis et l'effet « rectangle générique » revient par un autre biais.
  const rayonChassis = Math.round(geo.largeur * appareil.chassis.rayon);
  const cadre = Math.round(geo.largeur * appareil.chassis.cadre);
  const lunette = Math.round(geo.largeur * appareil.chassis.lunette);
  const rayonCoque = Math.max(0, rayonChassis - cadre);
  const rayonEcran = Math.max(0, rayonCoque - lunette);
  const galerie = visuel.cle === "personnages";
  // Pointe de la bulle (visuel 5) : un triangle large et bas, pas la petite
  // pointe symétrique d'origine — il doit désigner la tête du grand-père,
  // qui est nettement plus bas et à gauche, pas juste « à côté ».
  const bulleFont = px(appareil.bulleRatio);
  const pointeHauteur = Math.round(bulleFont * 0.65);
  const pointePortee = Math.round(bulleFont * 1.15);
  const pointeBord = Math.round(bulleFont * 0.14);
  const cases = grille.colonnes * grille.lignes;
  const portraits = portraitsDataUri.slice(0, cases - 1);
  // Fonte du médaillon « et + » : dérivée de la largeur de CELLULE, pas de
  // la largeur du visuel (L). La grille occupe 90 % de L (left/right: 5%)
  // avec un espacement entre cases ; sur iPad (5 colonnes) une cellule est
  // bien plus étroite, en proportion de L, que sur iPhone (4 colonnes) — une
  // fonte en fraction de L y débordait donc du cercle (« AND + » rogné).
  const gouttiere = px(0.032);
  const celluleLargeur = (0.9 * L - (grille.colonnes - 1) * gouttiere) / grille.colonnes;
  const plusFont = Math.round(celluleLargeur * 0.25);
  const plusPad = Math.round(plusFont * 0.15);

  const corpsGalerie = `
    <div class="grille">
      ${portraits.map((p) => `<div class="case"><img class="portrait" src="${p}" alt=""></div>`).join("\n      ")}
      <div class="case plus"><span>${esc(MEDAILLON_PLUS[langue])}</span></div>
    </div>
    <div class="bulle">${esc(BULLE[langue])}</div>`;

  const corpsChassis = `
    <div class="chassis">
      <div class="coque">
        <div class="ecran">
          ${appareil.chassis.island ? '<div class="island"></div>' : ""}
          <img class="capture" src="${captureDataUri}" alt="">
          <div class="barre-accueil"></div>
        </div>
      </div>
      ${appareil.chassis.volumeSepare
        ? '<div class="bouton mute"></div><div class="bouton up"></div><div class="bouton dn"></div><div class="bouton pwr"></div>'
        : '<div class="bouton volume"></div><div class="bouton pwr"></div>'}
    </div>`;

  return `<!doctype html>
<html lang="${esc(langue)}"><head><meta charset="utf-8">
<style>
${fontFaceCss}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${L}px; height: ${H}px; overflow: hidden; }
body {
  position: relative;
  background: linear-gradient(172deg, #1e1208 0%, #3a2310 44%, #6b4720 82%, #8a5c2a 100%);
}
.halo { position: absolute; inset: 0;
  background: radial-gradient(75% 55% at 50% 40%, rgba(255,210,140,.17), transparent 70%); }
.titre-bloc { position: absolute; top: ${px(appareil.titreHaut, H)}px; left: 6%; right: 6%;
  text-align: center; }
.titre { font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: ${px(appareil.titreRatio)}px; line-height: 1.08; color: #f8ead0;
  text-shadow: 0 ${px(0.002)}px ${px(0.01)}px rgba(0,0,0,.55); }
.filet { margin: ${px(appareil.filetEcart, H)}px auto 0; width: ${px(0.34)}px;
  height: 2px; background: linear-gradient(90deg, transparent, #cfa863, transparent); }
.chassis { position: absolute; left: 50%; transform: translateX(-50%);
  top: ${px(appareil.chassis.haut, H)}px;
  width: ${geo.largeur}px; height: ${geo.hauteur}px;
  padding: ${cadre}px; border-radius: ${rayonChassis}px;
  background: linear-gradient(150deg,#e8e3da 0%,#8d867c 22%,#4c4841 46%,#b8b1a6 64%,#5a564f 82%,#ddd7cd 100%);
  box-shadow: 0 ${px(0.018)}px ${px(0.03)}px rgba(0,0,0,.65); }
.coque { width: 100%; height: 100%; background: #0a0a0a;
  border-radius: ${rayonCoque}px; padding: ${lunette}px; }
.ecran { position: relative; width: 100%; height: 100%; overflow: hidden;
  border-radius: ${rayonEcran}px; background: #1d1206; }
.capture { width: 100%; height: 100%; object-fit: cover; display: block; }
.island { position: absolute; top: 1.6%; left: 50%; transform: translateX(-50%);
  width: 28%; height: 1.7%; background: #000; border-radius: 999px; z-index: 3; }
.barre-accueil { position: absolute; bottom: .9%; left: 50%; transform: translateX(-50%);
  width: 32%; height: ${px(0.0025)}px; background: rgba(251,247,238,.85);
  border-radius: 999px; z-index: 3; }
.bouton { position: absolute; width: ${px(0.002)}px; border-radius: 2px;
  background: linear-gradient(180deg,#b4ada2,#5d5952); }
.mute   { left: -${px(0.0015)}px; top: 15%; height: 4%; }
.up     { left: -${px(0.0015)}px; top: 23%; height: 7%; }
.dn     { left: -${px(0.0015)}px; top: 32%; height: 7%; }
.volume { left: -${px(0.0015)}px; top: 23%; height: 16%; }
.pwr    { right: -${px(0.0015)}px; top: 26%; height: 10%; }
.grand-pere { position: absolute; bottom: -3%; left: -10%;
  width: ${px(appareil.gpLargeur)}px;
  filter: drop-shadow(0 ${px(0.011)}px ${px(0.018)}px rgba(0,0,0,.75)); }
.grille { position: absolute; left: 5%; right: 5%; top: 20%;
  display: grid; grid-template-columns: repeat(${grille.colonnes}, 1fr); gap: ${px(0.032)}px; }
.case { position: relative; aspect-ratio: 1; border-radius: 50%; overflow: hidden;
  border: ${px(0.005)}px solid #cfa863; background: #2a1a0c;
  box-shadow: 0 ${px(0.004)}px ${px(0.01)}px rgba(0,0,0,.6); }
.portrait { width: 134%; margin-left: -17%; margin-top: -10%; display: block; }
.plus { display: flex; align-items: center; justify-content: center; border-style: dashed;
  background: radial-gradient(circle at 50% 40%, #4a3116, #241505); }
.plus span { font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: ${plusFont}px; color: #f0d9a8; white-space: nowrap; padding: 0 ${plusPad}px; }
.bulle { position: absolute; right: 8%; bottom: 11%; width: 50%;
  background: #FBF7EE; border: ${px(0.004)}px solid #C5A059; border-radius: ${px(0.011)}px;
  padding: ${px(0.026)}px ${px(0.03)}px; text-align: center;
  font-family: 'Caveat', cursive; font-size: ${bulleFont}px;
  line-height: 1.15; color: #3b2a16;
  box-shadow: 0 ${px(0.008)}px ${px(0.018)}px rgba(0,0,0,.55); }
.bulle::before, .bulle::after { content: ''; position: absolute; right: 84%;
  clip-path: polygon(55% 0, 100% 0, 0 100%); }
.bulle::before { bottom: -${pointeHauteur - pointeBord}px;
  width: ${pointePortee}px; height: ${pointeHauteur}px; background: #C5A059; }
.bulle::after { right: calc(84% - ${pointeBord}px); bottom: -${pointeHauteur - 3 * pointeBord}px;
  width: ${pointePortee - 2 * pointeBord}px; height: ${pointeHauteur - 2 * pointeBord}px;
  background: #FBF7EE; }
</style></head>
<body>
  <div class="halo"></div>
  <div class="titre-bloc">
    <div class="titre">${esc(TITRES[visuel.cle][langue])}</div>
    <div class="filet"></div>
  </div>
  ${galerie ? corpsGalerie : corpsChassis}
  <img class="grand-pere" src="${grandPereDataUri}" alt="">
</body></html>`;
}
