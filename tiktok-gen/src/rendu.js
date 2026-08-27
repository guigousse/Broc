/** Dessin d'une frame de la roulette sur le canvas. Module DOM/canvas, pas de tests unitaires. */
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR, positionsA } from "./roulette.js";
import { COULEURS } from "./theme.js";
import { dessinerOverlay } from "./overlay.js";

export const HAUTEUR_OBJET = 420;

function dessinerCover(ctx, img) {
  const k = Math.max(LARGEUR / img.naturalWidth, HAUTEUR / img.naturalHeight);
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  ctx.drawImage(img, (LARGEUR - w) / 2, (HAUTEUR - h) / 2, w, h);
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 300, CENTRE_X, CENTRE_Y, 1100);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
}
function dessinerConsigne(ctx, texte) {
  if (!texte) return;
  ctx.save();
  ctx.fillStyle = "rgba(20,24,28,0.55)"; ctx.fillRect(0, 300, LARGEUR, 150);
  ctx.font = "600 64px Cinzel"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 12;
  ctx.fillStyle = COULEURS.laitonClair; ctx.fillText(texte, CENTRE_X, 375, LARGEUR - 80);
  ctx.restore();
}
function dessinerCentre(ctx, img, x, hauteur) {
  const w = img.width * (hauteur / img.height);
  ctx.drawImage(img, x - w / 2, CENTRE_Y - hauteur / 2, w, hauteur);
}
export function dessinerFrame(ctx, t, scene) {
  const { r, cfg, fond, objets, silhouette, consigne, flashActif } = scene;
  dessinerCover(ctx, fond);
  dessinerConsigne(ctx, consigne);
  if (silhouette) {
    ctx.save(); ctx.shadowColor = COULEURS.laiton; ctx.shadowBlur = 18;
    dessinerCentre(ctx, silhouette, CENTRE_X, HAUTEUR_OBJET * 1.15); ctx.restore();
  }
  for (const { index, x } of positionsA(t, r, cfg)) {
    if (Math.abs(x - CENTRE_X) > LARGEUR / 2 + cfg.espacement) continue;
    const img = objets[index]; if (img) dessinerCentre(ctx, img, x, HAUTEUR_OBJET);
  }
  if (flashActif) dessinerOverlay(ctx, scene);
}
