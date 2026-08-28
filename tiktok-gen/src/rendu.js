/** Dessin d'une frame de la roulette sur le canvas. Module DOM/canvas, pas de tests unitaires. */
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR, HAUTEUR_OBJET, positionsVisibles } from "./roulette.js";
import { COULEURS } from "./theme.js";
import { dessinerOverlay } from "./overlay.js";

export { HAUTEUR_OBJET };

/** `fond` est déjà plein cadre (voir `preparerFond`) ; on n'ajoute que le vignettage. */
function dessinerCover(ctx, fond) {
  ctx.drawImage(fond, 0, 0, LARGEUR, HAUTEUR);
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 300, CENTRE_X, CENTRE_Y, 1100);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
}
function dessinerCentre(ctx, img, x, hauteur) {
  const w = img.width * (hauteur / img.height);
  ctx.drawImage(img, x - w / 2, CENTRE_Y - hauteur / 2, w, hauteur);
}
export function dessinerFrame(ctx, t, scene) {
  // Pas de bandeau de texte : la consigne s'ajoute au montage (CapCut), pas ici.
  const { r, cfg, fond, objets, silhouette, flashActif } = scene;
  dessinerCover(ctx, fond);
  if (silhouette) {
    ctx.save(); ctx.shadowColor = COULEURS.laiton; ctx.shadowBlur = 18;
    // Même centre que l'objet ; la hauteur inclut le liseré, la forme intérieure coïncide avec la cible.
    dessinerCentre(ctx, silhouette, CENTRE_X, HAUTEUR_OBJET * (silhouette.echelleHauteur ?? 1)); ctx.restore();
  }
  // positionsVisibles filtre déjà hors cadre et rend les deux exemplaires d'un
  // objet à cheval sur le pli de la bande (peu d'objets très espacés).
  for (const { index, x } of positionsVisibles(t, r, cfg)) {
    const img = objets[index]; if (img) dessinerCentre(ctx, img, x, HAUTEUR_OBJET);
  }
  if (flashActif) dessinerOverlay(ctx, scene);
}
