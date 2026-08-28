/** Réglages persistés du générateur TikTok (localStorage). Aucune dépendance au DOM. */
export const CLE_STOCKAGE = "broc-tiktok-gen";

/** Taille max (en caractères) d'un fond personnalisé (data-URL) avant qu'on refuse de le persister. */
export const TAILLE_MAX_FOND_PERSO = 2_000_000;

/** Identifiant du fond « photo importée » : source unique, l'interface et l'aperçu s'y réfèrent. */
export const FOND_PERSO = "perso";

/** Les trois calques d'origine, aux positions de l'overlay historique. `{n}` = nombre d'autres objets. */
export const TEXTES_DEFAUT = Object.freeze([
  { id: "sous-titre", texte: "Le jeu de brocante", x: 540, y: 520, police: "Cinzel", taille: 64, couleur: "ivoire", gras: true },
  { id: "objet", texte: "{nom} · {prix}", x: 540, y: 1226, police: "Cinzel", taille: 58, couleur: "ivoire", gras: true },
  { id: "autres", texte: "+ {n} autres objets à collectionner dans le jeu", x: 540, y: 1284, police: "Cinzel", taille: 40, couleur: "ivoire", gras: false },
  { id: "dispo", texte: "Disponible gratuitement sur", x: 540, y: 1358, police: "Cinzel", taille: 46, couleur: "ivoire", gras: false },
]);

export const REGLAGES_DEFAUT = Object.freeze({
  fond: "foire-chatou", fondPerso: null, objets: [], cible: null,
  type: "pause",
  vitesse: 2.5, espacement: 520, nbPassages: 3, largeurFlash: 4,
  // Roulette qui ralentit.
  nbTours: 3, dureeDefilement: 8, arretFinal: 2,
  flou: 0,
  liseret: 17,
  // Calques de texte de l'overlay (BROC, nom/prix et badges restent fixes).
  textes: TEXTES_DEFAUT,
  consigne: "Mets pause sur …", son: true,
});

const borne = (v, min, max, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** Polices proposées pour les calques (les deux premières sont embarquées, la 3ᵉ est celle du téléphone). */
export const POLICES = ["Cinzel", "Verve Shadow", "Système"];
/** Couleurs proposées, par nom : la palette du jeu. */
export const COULEURS_TEXTE = Object.freeze({ laiton: "#C5A059", ivoire: "#F1E3BF", blanc: "#FFFFFF", noir: "#14181C" });
export const TEXTE_MAX = 80;
export const TEXTES_MAX = 12;


let compteur = 0;
/** Un calque neuf, au centre du cadre, prêt à être déplacé. */
export function nouveauTexte(texte = "Nouveau texte") {
  compteur += 1;
  return { id: `t${Date.now().toString(36)}${compteur}`, texte, x: 540, y: 680, police: "Cinzel", taille: 56, couleur: "laiton", gras: true };
}

/** Un calque borné et typé, ou null s'il n'est pas exploitable (pas d'id). */
export function normaliserTexte(brut) {
  if (!brut || typeof brut !== "object" || typeof brut.id !== "string" || !brut.id) return null;
  return {
    id: brut.id,
    texte: typeof brut.texte === "string" ? brut.texte.slice(0, TEXTE_MAX) : "",
    x: Math.round(borne(brut.x, 0, 1080, 540)),
    y: Math.round(borne(brut.y, 0, 1920, 960)),
    police: POLICES.includes(brut.police) ? brut.police : "Cinzel",
    taille: Math.round(borne(brut.taille, 20, 220, 56)),
    couleur: brut.couleur in COULEURS_TEXTE ? brut.couleur : "ivoire",
    gras: brut.gras === undefined ? true : Boolean(brut.gras),
  };
}

/**
 * Les calques d'une sauvegarde : la liste si elle existe, sinon les trois
 * calques d'origine, en reprenant les anciens champs texte (sousTitre,
 * texteAutres, texteDispo) s'ils étaient là — un champ vidé retire son calque.
 */
export function normaliserTextes(brut) {
  if (Array.isArray(brut.textes)) {
    const out = brut.textes.map(normaliserTexte).filter(Boolean).slice(0, TEXTES_MAX);
    // Sauvegarde d'avant le calque « objet » : on le lui donne, sinon plus de nom ni de prix.
    if (!out.some((c) => c.texte.includes("{nom}") || c.texte.includes("{prix}")) && out.length < TEXTES_MAX) {
      out.splice(Math.min(1, out.length), 0, { ...TEXTES_DEFAUT.find((d) => d.id === "objet") });
    }
    return out;
  }
  const anciens = { "sous-titre": brut.sousTitre, autres: brut.texteAutres, dispo: brut.texteDispo };
  const out = [];
  for (const d of TEXTES_DEFAUT) {
    const ancien = anciens[d.id];
    const texte = typeof ancien === "string" ? ancien : d.texte;
    if (texte) out.push({ ...d, texte: texte.slice(0, TEXTE_MAX) });
  }
  return out;
}

export function normaliserReglages(brut = {}) {
  const objets = Array.isArray(brut.objets) ? brut.objets.filter((x) => typeof x === "string") : [];
  return {
    fond: typeof brut.fond === "string" ? brut.fond : REGLAGES_DEFAUT.fond,
    fondPerso: typeof brut.fondPerso === "string" ? brut.fondPerso : null,
    objets,
    cible: objets.includes(brut.cible) ? brut.cible : null,
    type: brut.type === "ralentie" ? "ralentie" : "pause",
    vitesse: borne(brut.vitesse, 1.5, 4, REGLAGES_DEFAUT.vitesse),
    nbTours: Math.round(borne(brut.nbTours, 1, 6, REGLAGES_DEFAUT.nbTours)),
    dureeDefilement: borne(brut.dureeDefilement, 3, 15, REGLAGES_DEFAUT.dureeDefilement),
    arretFinal: borne(brut.arretFinal, 0.5, 5, REGLAGES_DEFAUT.arretFinal),
    espacement: borne(brut.espacement, 400, 700, REGLAGES_DEFAUT.espacement),
    nbPassages: Math.round(borne(brut.nbPassages, 2, 4, REGLAGES_DEFAUT.nbPassages)),
    largeurFlash: Math.round(borne(brut.largeurFlash, 2, 8, REGLAGES_DEFAUT.largeurFlash)),
    flou: Math.round(borne(brut.flou, 0, 40, REGLAGES_DEFAUT.flou)),
    liseret: Math.round(borne(brut.liseret, 0, 30, REGLAGES_DEFAUT.liseret)),
    textes: normaliserTextes(brut),
    consigne: typeof brut.consigne === "string" ? brut.consigne : REGLAGES_DEFAUT.consigne,
    son: brut.son === undefined ? REGLAGES_DEFAUT.son : Boolean(brut.son),
  };
}

export function chargerReglages(storage) {
  try {
    return normaliserReglages(JSON.parse(storage.getItem(CLE_STOCKAGE) ?? "{}"));
  } catch {
    return normaliserReglages({});   // jamais les objets gelés de REGLAGES_DEFAUT : l'interface les modifie.
  }
}

/** Sauvegarde les réglages ; abandonne le fond personnalisé s'il est trop lourd pour le localStorage. */
export function sauverReglages(storage, r) {
  const fondPerso = typeof r.fondPerso === "string" && r.fondPerso.length > TAILLE_MAX_FOND_PERSO ? null : r.fondPerso;
  storage.setItem(CLE_STOCKAGE, JSON.stringify({ ...r, fondPerso }));
}

export const consigneParDefaut = (nomCible) => `Mets pause sur ${nomCible} !`;
