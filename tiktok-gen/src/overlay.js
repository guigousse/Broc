/** Overlay promo flashé au calage exact de la cible (voile + « BROC » + badges). */
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR, HAUTEUR_OBJET } from "./roulette.js";
import { COULEURS } from "./theme.js";
import { formaterPrix, texteAutresObjets } from "./texte.js";

/**
 * Zone sûre commune TikTok / Reels sur 1080×1920 : les boutons de droite
 * (j'aime, commentaires, partage…) mangent ≈ 160 px, la légende et le nom du
 * compte ≈ 400 px en bas, la barre du haut ≈ 250 px. Tout l'overlay tient dans
 * x ∈ [80, 920], y ∈ [250, 1520].
 */
export const ZONE_SURE = Object.freeze({ gauche: 80, droite: LARGEUR - 160, haut: 250, bas: HAUTEUR - 400 });
/** Largeur de la ligne nom / prix sous l'objet ; le nom se tasse si le prix la déborde. */
const LARGEUR_LEGENDE = ZONE_SURE.droite - ZONE_SURE.gauche - 80;   // 760, centrée : bord droit à 920
const ECART_NOM_PRIX = 30;
/** Bloc du bas : « Disponible… » puis les badges, le bas des badges au ras de la zone sûre. */
const H_APPLE = 96, H_GOOGLE = 108;
const Y_BADGES = ZONE_SURE.bas - H_GOOGLE / 2;          // centre des badges : 1466 → bas à 1520
const Y_DISPO = Y_BADGES - H_GOOGLE / 2 - 54;           // 1358

export function dessinerOverlay(ctx, { badges, cible, nbAutres, textes = {} }) {
  ctx.save();
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 300, CENTRE_X, CENTRE_Y, 420);
  g.addColorStop(0, "rgba(20,24,28,0)"); g.addColorStop(1, "rgba(20,24,28,0.6)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 24;
  // Titre dans le tiers haut, bien au-dessus de la roulette (haut des objets ≈ 750).
  ctx.font = "220px 'Verve Shadow'"; ctx.fillStyle = COULEURS.laiton; ctx.fillText("BROC", CENTRE_X, 400);
  ctx.font = "600 64px Cinzel"; ctx.fillStyle = COULEURS.laitonClair;
  if (textes.sousTitre) ctx.fillText(textes.sousTitre, CENTRE_X, 520, LARGEUR - 80);
  // Légende sous l'objet : nom à gauche, prix à droite, puis le rappel du catalogue.
  if (cible) {
    const yLegende = CENTRE_Y + HAUTEUR_OBJET / 2 + 56;   // 1226 ; 2ᵉ ligne à 1284
    const gauche = CENTRE_X - LARGEUR_LEGENDE / 2, droite = CENTRE_X + LARGEUR_LEGENDE / 2;
    ctx.font = "700 58px Cinzel"; ctx.fillStyle = COULEURS.laiton;
    const prix = formaterPrix(cible.prix);
    const wPrix = ctx.measureText(prix).width;
    ctx.textAlign = "right"; ctx.fillText(prix, droite, yLegende);
    ctx.font = "600 58px Cinzel"; ctx.fillStyle = COULEURS.laitonClair;
    ctx.textAlign = "left"; ctx.fillText(cible.nom, gauche, yLegende, LARGEUR_LEGENDE - wPrix - ECART_NOM_PRIX);
    ctx.font = "500 40px Cinzel"; ctx.textAlign = "center";
    const autres = texteAutresObjets(nbAutres, textes.autres ?? "");
    if (autres) ctx.fillText(autres, CENTRE_X, yLegende + 58, LARGEUR_LEGENDE);
  }
  ctx.font = "500 46px Cinzel"; ctx.textAlign = "center"; ctx.fillStyle = COULEURS.laitonClair;
  if (textes.dispo) ctx.fillText(textes.dispo, CENTRE_X, Y_DISPO, LARGEUR_LEGENDE);
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  // Badges officiels, chacun à son ratio natif, à la même hauteur (le badge
  // Google Play embarque sa propre marge transparente : on le sert un peu plus haut).
  const ecart = 40, hApple = H_APPLE, hGoogle = H_GOOGLE;
  const a = badges?.appStore, gp = badges?.googlePlay;
  const wApple = a ? hApple * (a.naturalWidth / a.naturalHeight) : 0;
  const wGoogle = gp ? hGoogle * (gp.naturalWidth / gp.naturalHeight) : 0;
  const total = wApple + (a && gp ? ecart : 0) + wGoogle;
  let x = CENTRE_X - total / 2;
  if (a) { ctx.drawImage(a, x, Y_BADGES - hApple / 2, wApple, hApple); x += wApple + ecart; }
  if (gp) ctx.drawImage(gp, x, Y_BADGES - hGoogle / 2, wGoogle, hGoogle);
  ctx.restore();
}
