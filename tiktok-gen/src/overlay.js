/** Overlay promo flashé au calage exact de la cible (voile + « BROC » + badges). */
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR } from "./roulette.js";
import { COULEURS } from "./theme.js";

export function dessinerOverlay(ctx, { badges }) {
  ctx.save();
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 300, CENTRE_X, CENTRE_Y, 420);
  g.addColorStop(0, "rgba(20,24,28,0)"); g.addColorStop(1, "rgba(20,24,28,0.6)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 24;
  ctx.font = "260px 'Verve Shadow'"; ctx.fillStyle = COULEURS.laiton; ctx.fillText("BROC", CENTRE_X, 620);
  ctx.font = "600 72px Cinzel"; ctx.fillStyle = COULEURS.laitonClair; ctx.fillText("Le jeu de brocante", CENTRE_X, 790);
  ctx.font = "500 56px Cinzel"; ctx.fillText("Disponible gratuitement sur", CENTRE_X, 1560);
  const w = 400, h = 118, ecart = 40;
  if (badges?.appStore) ctx.drawImage(badges.appStore, CENTRE_X - w - ecart / 2, 1680 - h / 2, w, h);
  if (badges?.googlePlay) ctx.drawImage(badges.googlePlay, CENTRE_X + ecart / 2, 1680 - h / 2, w, h);
  ctx.restore();
}
