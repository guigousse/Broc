/** Dessin d'une frame de la roulette sur le canvas. Module DOM/canvas, pas de tests unitaires. */
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR, HAUTEUR_OBJET, positionsVisibles, aura } from "./roulette.js";
import { COULEURS } from "./theme.js";
import { dessinerOverlay } from "./overlay.js";
import { etapeA, intro } from "./devine.js";
import { formaterPrix } from "./texte.js";

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
  const rayon = HAUTEUR_OBJET * 0.85 * echelle;
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 0, CENTRE_X, CENTRE_Y, rayon);
  // Plus dense que dans le jeu (0,55) : ici le halo rayonne sur un fond déjà clair sous le flash.
  g.addColorStop(0, "rgba(255,205,110,0.85)");
  g.addColorStop(0.45, "rgba(255,190,70,0.4)");
  g.addColorStop(0.72, "rgba(255,190,70,0)");
  ctx.save();
  ctx.globalAlpha = opacite;
  ctx.globalCompositeOperation = "lighter";   // additif : la lumière s'ajoute, elle ne voile pas
  ctx.fillStyle = g;
  ctx.fillRect(CENTRE_X - rayon, CENTRE_Y - rayon, rayon * 2, rayon * 2);
  ctx.restore();
}

export function dessinerFrame(ctx, t, scene) {
  if (scene.r.type === "devine") return dessinerFrameDevine(ctx, t, scene);
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

// ------------------------------------------------------------ Devine le prix

/** Hauteur de l'objet du jour, plus grand que sur la roulette : il est seul. */
const HAUTEUR_OBJET_DEVINE = 500;
/**
 * Centre vertical de l'objet, remonté pour laisser nom et étiquette sous lui —
 * aux places des calques {nom} (1214) et {prix} (1286) de l'overlay, qui
 * prennent le relais sur l'image finale sans que rien ne saute.
 */
const Y_OBJET = CENTRE_Y - 100;
const Y_CHIFFRE = 330;
const RARETE = {
  commun: { mot: "Commun", couleur: "#F1E3BF" },
  rare: { mot: "Rare", couleur: "#7FC8FF" },
  legendaire: { mot: "Légendaire", couleur: "#FFB347" },
};

const easeOut = (u) => 1 - (1 - u) ** 3;
/** Rebond d'apparition d'une étiquette : 1,35 → 1 en `REBOND_S`, dépasse un peu sous 1 puis se pose. */
function rebond(u) {
  if (u >= 1) return 1;
  const k = easeOut(u);
  return 1.35 - 0.35 * k - 0.06 * Math.sin(Math.PI * k);
}

/** Plaque de laiton arrondie, texte centré ; `echelle` autour de (x, y). */
function dessinerEtiquette(ctx, texte, x, y, { echelle = 1, police = "600 84px 'Cinzel'", couleurFond = COULEURS.laiton, couleurTexte = COULEURS.nuit } = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(echelle, echelle);
  ctx.font = police; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(texte).width + 96, h = 132, r = 26;
  ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = couleurFond;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = couleurTexte;
  ctx.fillText(texte, 0, 6);
  ctx.restore();
}

function dessinerTexteOmbre(ctx, texte, x, y, police, couleur, maxW = LARGEUR - 160) {
  ctx.save();
  ctx.font = police; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 24;
  ctx.fillStyle = couleur;
  ctx.fillText(texte, x, y, maxW);
  ctx.restore();
}

/**
 * Une image de « Devine le prix » : l'objet courant (zoom + fondu à
 * l'apparition), son nom, le gros chiffre du compte à rebours, l'étiquette
 * « ? » qui devient le prix (rebond) et le mot de rareté à la révélation.
 * L'overlay promo se pose pendant la dernière révélation (`flashActif`).
 */
export function dessinerFrameDevine(ctx, t, scene) {
  const { r, fond, objets, serie = [], flashActif } = scene;
  dessinerCover(ctx, fond);
  const e = etapeA(t, r);
  if (e.phase === "intro") {
    // Le titre grossit dans la partie haute puis s'efface : le compte commence après.
    const { opacite, echelle } = intro(t);
    ctx.save(); ctx.globalAlpha = opacite;
    ctx.translate(CENTRE_X, 560); ctx.scale(echelle, echelle);
    dessinerTexteOmbre(ctx, "Devine le prix !", 0, 0, "600 110px 'Cinzel'", COULEURS.laiton, LARGEUR - 120);
    ctx.restore();
    return;
  }
  const img = objets[e.index];
  const entree = serie[e.index] ?? { nom: "", prix: 0, rarete: "commun" };

  // Objet : apparition en zoom + fondu, puis stable ; halo doré à la révélation.
  const uApp = e.phase === "apparition" ? easeOut(e.u) : 1;
  if (img) {
    ctx.save();
    ctx.globalAlpha = uApp;
    const h = HAUTEUR_OBJET_DEVINE * (0.6 + 0.4 * uApp);
    if (e.phase === "revelation" && !e.mystere) {
      ctx.shadowColor = "rgba(255,205,110,0.9)"; ctx.shadowBlur = 40 * Math.min(1, e.u * 3);
    }
    const w = img.width * (h / img.height);
    ctx.drawImage(img, CENTRE_X - w / 2, Y_OBJET - h / 2, w, h);
    ctx.restore();
  }

  // Sous l'overlay promo, les calques {nom} / {prix} disent déjà tout : on ne double pas.
  if (flashActif) { dessinerOverlay(ctx, scene); return; }

  // Nom, sous l'objet.
  ctx.save(); ctx.globalAlpha = uApp;
  dessinerTexteOmbre(ctx, entree.nom, CENTRE_X, 1214, "600 56px 'Cinzel'", COULEURS.laitonClair);
  ctx.restore();

  const yEtiquette = 1330;
  if (e.phase !== "revelation") {
    // Étiquette « ? » qui respire doucement pendant le compte.
    const resp = e.phase === "compte" ? 1 + 0.04 * Math.sin(t * 2 * Math.PI) : uApp;
    dessinerEtiquette(ctx, "? €", CENTRE_X, yEtiquette, { echelle: resp });
    if (e.phase === "compte") {
      // Le chiffre : gros, il tombe en place à chaque seconde (rebond court).
      const uSec = Math.min(1, ((t - r.etapes[e.index].compte) % 1) / 0.25);
      ctx.save();
      ctx.translate(CENTRE_X, Y_CHIFFRE); ctx.scale(rebond(uSec), rebond(uSec));
      dessinerTexteOmbre(ctx, String(e.reste), 0, 0, "300px 'Verve Shadow'", COULEURS.laiton);
      ctx.restore();
    }
  } else if (e.mystere) {
    dessinerEtiquette(ctx, "? €", CENTRE_X, yEtiquette, { echelle: rebond(Math.min(1, e.u * r.dureeRevele / 0.8)) });
    dessinerTexteOmbre(ctx, "Tu paierais quel prix ?", CENTRE_X, Y_CHIFFRE, "600 64px 'Cinzel'", COULEURS.laiton);
  } else {
    const uReb = Math.min(1, (e.u * r.dureeRevele) / 0.8);
    dessinerEtiquette(ctx, formaterPrix(entree.prix), CENTRE_X, yEtiquette, { echelle: rebond(uReb) });
    const rar = RARETE[entree.rarete] ?? RARETE.commun;
    ctx.save(); ctx.globalAlpha = Math.min(1, uReb * 1.5);
    dessinerTexteOmbre(ctx, rar.mot, CENTRE_X, yEtiquette + 120, "600 54px 'Cinzel'", rar.couleur);
    ctx.restore();
  }
}
