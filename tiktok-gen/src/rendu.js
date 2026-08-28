/** Dessin d'une frame de la roulette sur le canvas. Module DOM/canvas, pas de tests unitaires. */
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR, HAUTEUR_OBJET, positionsVisibles, aura } from "./roulette.js";
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
/**
 * L'aura pristine du jeu, en canvas : halo ambré radial derrière la cible
 * (rgba(255,205,110,.55) au centre → rien à 72 %), qui apparaît puis respire.
 * `dt` = secondes écoulées depuis l'arrêt de la cible.
 */
function dessinerAura(ctx, dt) {
  const { opacite, echelle } = aura(dt);
  if (opacite <= 0) return;
  const rayon = HAUTEUR_OBJET * 0.62 * echelle;
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 0, CENTRE_X, CENTRE_Y, rayon);
  g.addColorStop(0, "rgba(255,205,110,0.55)");
  g.addColorStop(0.45, "rgba(255,190,70,0.22)");
  g.addColorStop(0.72, "rgba(255,190,70,0)");
  ctx.save();
  ctx.globalAlpha = opacite;
  ctx.fillStyle = g;
  ctx.fillRect(CENTRE_X - rayon, CENTRE_Y - rayon, rayon * 2, rayon * 2);
  ctx.restore();
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
  // Célébration : la cible est arrêtée au centre → aura derrière elle, éclat doré sur elle.
  const dtCelebration = r.instantCelebration === null || r.instantCelebration === undefined ? -1 : t - r.instantCelebration;
  if (dtCelebration >= 0) dessinerAura(ctx, dtCelebration);
  for (const { index, x } of positionsVisibles(t, r, cfg)) {
    const img = objets[index]; if (!img) continue;
    if (dtCelebration >= 0 && index === cfg.indexCible) {
      ctx.save(); ctx.shadowColor = "rgba(255,205,110,0.9)"; ctx.shadowBlur = 28 * aura(dtCelebration).opacite;
      if ("filter" in ctx) ctx.filter = "brightness(1.07) saturate(1.06)";
      dessinerCentre(ctx, img, x, HAUTEUR_OBJET); ctx.restore();
    } else dessinerCentre(ctx, img, x, HAUTEUR_OBJET);
  }
  if (flashActif) dessinerOverlay(ctx, scene);
}
