/** Overlay promo flashé au calage exact de la cible (voile + « BROC » + badges). */
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR } from "./roulette.js";
import { COULEURS } from "./theme.js";
import { formaterPrix, texteAutresObjets } from "./texte.js";
import { COULEURS_TEXTE } from "./reglages.js";

/**
 * Zone sûre commune TikTok / Reels sur 1080×1920 : les boutons de droite
 * (j'aime, commentaires, partage…) mangent ≈ 160 px, la légende et le nom du
 * compte ≈ 400 px en bas, la barre du haut ≈ 250 px. Tout l'overlay tient dans
 * x ∈ [80, 920], y ∈ [250, 1520].
 */
export const ZONE_SURE = Object.freeze({ gauche: 80, droite: LARGEUR - 160, haut: 250, bas: HAUTEUR - 400 });
/** Bloc du bas : « Disponible… » puis les badges, le bas des badges au ras de la zone sûre. */
const H_APPLE = 96, H_GOOGLE = 108;
const Y_BADGES = ZONE_SURE.bas - H_GOOGLE / 2;          // centre des badges : 1466 → bas à 1520

/** La déclaration `font` canvas d'un calque. Verve Shadow n'a pas de graisse : le gras y est ignoré. */
export function policeCss(couche) {
  const famille = couche.police === "Système" ? "-apple-system, system-ui, sans-serif" : `'${couche.police}'`;
  const graisse = couche.gras && couche.police !== "Verve Shadow" ? "600 " : "";
  return `${graisse}${couche.taille}px ${famille}`;
}

/**
 * Le texte affiché d'un calque : `{nom}` et `{prix}` = la cible, `{n}` = le
 * nombre d'autres objets. `contexte` = { nbAutres, cible: { nom, prix } }.
 */
export function texteCouche(couche, contexte = {}) {
  const c = typeof contexte === "number" ? { nbAutres: contexte } : contexte;
  const cible = c.cible ?? {};
  return texteAutresObjets(c.nbAutres ?? 0, couche.texte)
    .replaceAll("{nom}", cible.nom ?? "")
    .replaceAll("{prix}", cible.prix === undefined ? "" : formaterPrix(cible.prix));
}

/** Largeur maximale d'un calque centré pour rester dans la zone sûre (760 px) — la ligne se tasse au-delà. */
const LARGEUR_MAX_TEXTE = 2 * (ZONE_SURE.droite - CENTRE_X);

/** Boîte englobante d'un calque sur le canvas, en px du cadre (pour le glisser-déposer). */
export function boiteTexte(ctx, couche, contexte) {
  const t = texteCouche(couche, contexte);
  ctx.save(); ctx.font = policeCss(couche);
  const w = Math.min(ctx.measureText(t).width, LARGEUR_MAX_TEXTE); ctx.restore();
  const h = couche.taille * 1.2;
  return { x0: couche.x - w / 2, y0: couche.y - h / 2, x1: couche.x + w / 2, y1: couche.y + h / 2 };
}

/** Tous les calques, centrés sur (x, y), avec l'ombre portée de l'overlay. */
export function dessinerTextes(ctx, textes, contexte) {
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 24;
  for (const c of textes ?? []) {
    const t = texteCouche(c, contexte);
    if (!t) continue;
    ctx.font = policeCss(c);
    ctx.fillStyle = COULEURS_TEXTE[c.couleur] ?? COULEURS_TEXTE.ivoire;
    ctx.fillText(t, c.x, c.y, LARGEUR_MAX_TEXTE);
  }
  ctx.restore();
}

export function dessinerOverlay(ctx, { badges, cible, nbAutres, textes = [] }) {
  ctx.save();
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 300, CENTRE_X, CENTRE_Y, 420);
  g.addColorStop(0, "rgba(20,24,28,0)"); g.addColorStop(1, "rgba(20,24,28,0.6)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 24;
  // Titre dans le tiers haut, bien au-dessus de la roulette (haut des objets ≈ 750).
  ctx.font = "220px 'Verve Shadow'"; ctx.fillStyle = COULEURS.laiton; ctx.fillText("BROC", CENTRE_X, 400);
  dessinerTextes(ctx, textes, { nbAutres, cible });
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
