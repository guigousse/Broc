/** Réglages persistés du générateur TikTok (localStorage). Aucune dépendance au DOM. */
export const CLE_STOCKAGE = "broc-tiktok-gen";

/** Taille max (en caractères) d'un fond personnalisé (data-URL) avant qu'on refuse de le persister. */
export const TAILLE_MAX_FOND_PERSO = 2_000_000;

/** Identifiant du fond « photo importée » : source unique, l'interface et l'aperçu s'y réfèrent. */
export const FOND_PERSO = "perso";

export const REGLAGES_DEFAUT = Object.freeze({
  fond: "foire-chatou", fondPerso: null, objets: [], cible: null,
  vitesse: 2.5, espacement: 520, nbPassages: 3, largeurFlash: 4,
  flou: 0,
  liseret: 17,
  // Textes du flash (BROC reste le logo). Vide = ligne masquée.
  sousTitre: "Le jeu de brocante",
  texteAutres: "+ {n} autres objets à collectionner dans le jeu",
  texteDispo: "Disponible gratuitement sur",
  consigne: "Mets pause sur …", son: true,
});

/** Un texte du flash : chaîne (même vide, qui masque la ligne) ou le défaut si absent. */
const texte = (v, def) => (typeof v === "string" ? v.slice(0, 80) : def);

const borne = (v, min, max, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

export function normaliserReglages(brut = {}) {
  const objets = Array.isArray(brut.objets) ? brut.objets.filter((x) => typeof x === "string") : [];
  return {
    fond: typeof brut.fond === "string" ? brut.fond : REGLAGES_DEFAUT.fond,
    fondPerso: typeof brut.fondPerso === "string" ? brut.fondPerso : null,
    objets,
    cible: objets.includes(brut.cible) ? brut.cible : null,
    vitesse: borne(brut.vitesse, 1.5, 4, REGLAGES_DEFAUT.vitesse),
    espacement: borne(brut.espacement, 400, 700, REGLAGES_DEFAUT.espacement),
    nbPassages: Math.round(borne(brut.nbPassages, 2, 4, REGLAGES_DEFAUT.nbPassages)),
    largeurFlash: Math.round(borne(brut.largeurFlash, 2, 8, REGLAGES_DEFAUT.largeurFlash)),
    flou: Math.round(borne(brut.flou, 0, 40, REGLAGES_DEFAUT.flou)),
    liseret: Math.round(borne(brut.liseret, 0, 30, REGLAGES_DEFAUT.liseret)),
    sousTitre: texte(brut.sousTitre, REGLAGES_DEFAUT.sousTitre),
    texteAutres: texte(brut.texteAutres, REGLAGES_DEFAUT.texteAutres),
    texteDispo: texte(brut.texteDispo, REGLAGES_DEFAUT.texteDispo),
    consigne: typeof brut.consigne === "string" ? brut.consigne : REGLAGES_DEFAUT.consigne,
    son: brut.son === undefined ? REGLAGES_DEFAUT.son : Boolean(brut.son),
  };
}

export function chargerReglages(storage) {
  try {
    return normaliserReglages(JSON.parse(storage.getItem(CLE_STOCKAGE) ?? "{}"));
  } catch {
    return { ...REGLAGES_DEFAUT };
  }
}

/** Sauvegarde les réglages ; abandonne le fond personnalisé s'il est trop lourd pour le localStorage. */
export function sauverReglages(storage, r) {
  const fondPerso = typeof r.fondPerso === "string" && r.fondPerso.length > TAILLE_MAX_FOND_PERSO ? null : r.fondPerso;
  storage.setItem(CLE_STOCKAGE, JSON.stringify({ ...r, fondPerso }));
}

export const consigneParDefaut = (nomCible) => `Mets pause sur ${nomCible} !`;
