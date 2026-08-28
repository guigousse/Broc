/** Overlay promo flashé au calage exact de la cible (voile + « BROC » + badges). */
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR, HAUTEUR_OBJET } from "./roulette.js";
import { COULEURS } from "./theme.js";
import { formaterPrix, texteAutresObjets } from "./texte.js";

/** Largeur de la ligne nom / prix sous l'objet ; le nom se tasse si le prix la déborde. */
const LARGEUR_LEGENDE = 920;
const ECART_NOM_PRIX = 30;

export function dessinerOverlay(ctx, { badges, cible, nbAutres }) {
  ctx.save();
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 300, CENTRE_X, CENTRE_Y, 420);
  g.addColorStop(0, "rgba(20,24,28,0)"); g.addColorStop(1, "rgba(20,24,28,0.6)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 24;
  // Titre dans le tiers haut, bien au-dessus de la roulette (haut des objets ≈ 750).
  ctx.font = "220px 'Verve Shadow'"; ctx.fillStyle = COULEURS.laiton; ctx.fillText("BROC", CENTRE_X, 400);
  ctx.font = "600 64px Cinzel"; ctx.fillStyle = COULEURS.laitonClair; ctx.fillText("Le jeu de brocante", CENTRE_X, 520);
  // Légende sous l'objet : nom à gauche, prix à droite, puis le rappel du catalogue.
  if (cible) {
    const yLegende = CENTRE_Y + HAUTEUR_OBJET / 2 + 80;
    const gauche = CENTRE_X - LARGEUR_LEGENDE / 2, droite = CENTRE_X + LARGEUR_LEGENDE / 2;
    ctx.font = "700 58px Cinzel"; ctx.fillStyle = COULEURS.laiton;
    const prix = formaterPrix(cible.prix);
    const wPrix = ctx.measureText(prix).width;
    ctx.textAlign = "right"; ctx.fillText(prix, droite, yLegende);
    ctx.font = "600 58px Cinzel"; ctx.fillStyle = COULEURS.laitonClair;
    ctx.textAlign = "left"; ctx.fillText(cible.nom, gauche, yLegende, LARGEUR_LEGENDE - wPrix - ECART_NOM_PRIX);
    ctx.font = "500 44px Cinzel"; ctx.textAlign = "center";
    ctx.fillText(texteAutresObjets(nbAutres), CENTRE_X, yLegende + 76, LARGEUR_LEGENDE);
  }
  ctx.font = "500 56px Cinzel"; ctx.textAlign = "center"; ctx.fillStyle = COULEURS.laitonClair;
  ctx.fillText("Disponible gratuitement sur", CENTRE_X, 1560);
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  // Badges officiels, chacun à son ratio natif, à la même hauteur (le badge
  // Google Play embarque sa propre marge transparente : on le sert un peu plus haut).
  const ecart = 40, hApple = 118, hGoogle = 132;
  const a = badges?.appStore, gp = badges?.googlePlay;
  const wApple = a ? hApple * (a.naturalWidth / a.naturalHeight) : 0;
  const wGoogle = gp ? hGoogle * (gp.naturalWidth / gp.naturalHeight) : 0;
  const total = wApple + (a && gp ? ecart : 0) + wGoogle;
  let x = CENTRE_X - total / 2;
  if (a) { ctx.drawImage(a, x, 1680 - hApple / 2, wApple, hApple); x += wApple + ecart; }
  if (gp) ctx.drawImage(gp, x, 1680 - hGoogle / 2, wGoogle, hGoogle);
  ctx.restore();
}
