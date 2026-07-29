/** Construction du document HTML d'un visuel. Module pur. */
import { BULLE, MEDAILLON_PLUS, TITRES } from "./textes.mjs";

const BLOC_FONT_FACE = /@font-face\s*\{[^}]*\}/g;

/**
 * Extrait de `globals.css` les blocs @font-face des familles demandées et
 * réécrit leurs URL en absolu. Les replis grecs sont déclarés SOUS le nom de
 * la famille latine (Cinzel → GFS Didot, Caveat → EB Garamond italique) : les
 * garder suffit à couvrir le grec, sans cas particulier ailleurs.
 */
export function extraireFontFace(css, familles, baseUrl) {
  const blocs = css.match(BLOC_FONT_FACE) ?? [];
  const gardes = blocs.filter((b) => {
    const m = b.match(/font-family:\s*['"]([^'"]+)['"]/);
    return m ? familles.includes(m[1]) : false;
  });
  if (gardes.length === 0) {
    throw new Error(`aucun @font-face trouvé pour ${familles.join(", ")}`);
  }
  return gardes
    .map((b) => b.replace(/url\((['"]?)\/fonts\//g, `url($1${baseUrl}/fonts/`))
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
  const galerie = visuel.cle === "personnages";
  const cases = grille.colonnes * grille.lignes;
  const portraits = portraitsDataUri.slice(0, cases - 1);

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
      <div class="bouton mute"></div><div class="bouton up"></div>
      <div class="bouton dn"></div><div class="bouton pwr"></div>
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
.titre { position: absolute; top: ${px(appareil.titreHaut, H)}px; left: 6%; right: 6%;
  text-align: center; font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: ${px(appareil.titreRatio)}px; line-height: 1.08; color: #f8ead0;
  text-shadow: 0 ${px(0.002)}px ${px(0.01)}px rgba(0,0,0,.55); }
.filet { position: absolute; top: ${px(appareil.filetHaut, H)}px; left: 33%; right: 33%;
  height: 2px; background: linear-gradient(90deg, transparent, #cfa863, transparent); }
.chassis { position: absolute; left: 50%; transform: translateX(-50%);
  top: ${px(appareil.chassis.haut, H)}px;
  width: ${geo.largeur}px; height: ${geo.hauteur}px;
  padding: ${px(0.0035)}px; border-radius: ${px(0.022)}px;
  background: linear-gradient(150deg,#e8e3da 0%,#8d867c 22%,#4c4841 46%,#b8b1a6 64%,#5a564f 82%,#ddd7cd 100%);
  box-shadow: 0 ${px(0.018)}px ${px(0.03)}px rgba(0,0,0,.65); }
.coque { width: 100%; height: 100%; background: #0a0a0a;
  border-radius: ${px(0.019)}px; padding: ${px(0.0016)}px; }
.ecran { position: relative; width: 100%; height: 100%; overflow: hidden;
  border-radius: ${px(0.017)}px; background: #1d1206; }
.capture { width: 100%; height: 100%; object-fit: cover; display: block; }
.island { position: absolute; top: 1.9%; left: 50%; transform: translateX(-50%);
  width: 30%; height: 2.1%; background: #000; border-radius: 999px; z-index: 3; }
.barre-accueil { position: absolute; bottom: .9%; left: 50%; transform: translateX(-50%);
  width: 32%; height: ${px(0.0025)}px; background: rgba(251,247,238,.85);
  border-radius: 999px; z-index: 3; }
.bouton { position: absolute; width: ${px(0.002)}px; border-radius: 2px;
  background: linear-gradient(180deg,#b4ada2,#5d5952); }
.mute { left: -${px(0.0015)}px; top: 15%; height: 4%; }
.up   { left: -${px(0.0015)}px; top: 23%; height: 7%; }
.dn   { left: -${px(0.0015)}px; top: 32%; height: 7%; }
.pwr  { right: -${px(0.0015)}px; top: 26%; height: 10%; }
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
  font-size: ${px(0.05)}px; color: #f0d9a8; }
.bulle { position: absolute; right: 4%; bottom: 13%; width: 56%;
  background: #FBF7EE; border: ${px(0.004)}px solid #C5A059; border-radius: ${px(0.011)}px;
  padding: ${px(0.026)}px ${px(0.03)}px; text-align: center;
  font-family: 'Caveat', cursive; font-size: ${px(appareil.bulleRatio)}px;
  line-height: 1.15; color: #3b2a16;
  box-shadow: 0 ${px(0.008)}px ${px(0.018)}px rgba(0,0,0,.55); }
.bulle::before { content: ''; position: absolute; left: -${px(0.013)}px; bottom: ${px(0.03)}px;
  border-top: ${px(0.008)}px solid transparent; border-bottom: ${px(0.008)}px solid transparent;
  border-right: ${px(0.013)}px solid #C5A059; }
.bulle::after { content: ''; position: absolute; left: -${px(0.0095)}px; bottom: ${px(0.032)}px;
  border-top: ${px(0.006)}px solid transparent; border-bottom: ${px(0.006)}px solid transparent;
  border-right: ${px(0.0105)}px solid #FBF7EE; }
</style></head>
<body>
  <div class="halo"></div>
  <div class="titre">${esc(TITRES[visuel.cle][langue])}</div>
  <div class="filet"></div>
  ${galerie ? corpsGalerie : corpsChassis}
  <img class="grand-pere" src="${grandPereDataUri}" alt="">
</body></html>`;
}
