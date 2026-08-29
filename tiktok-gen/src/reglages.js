/** Réglages persistés du générateur TikTok (localStorage). Aucune dépendance au DOM. */
export const CLE_STOCKAGE = "broc-tiktok-gen";

/** Taille max (en caractères) d'un fond personnalisé (data-URL) avant qu'on refuse de le persister. */
export const TAILLE_MAX_FOND_PERSO = 2_000_000;

/** Identifiant du fond « photo importée » : source unique, l'interface et l'aperçu s'y réfèrent. */
export const FOND_PERSO = "perso";

/** Les trois calques d'origine, aux positions de l'overlay historique. `{n}` = nombre d'autres objets. */
export const TEXTES_DEFAUT = Object.freeze([
  { id: "sous-titre", texte: "Le jeu de brocante", x: 540, y: 520, police: "Cinzel", taille: 64, couleur: "ivoire", gras: true },
  { id: "nom", texte: "{nom}", x: 540, y: 1214, police: "Cinzel", taille: 56, couleur: "ivoire", gras: true },
  { id: "prix", texte: "{prix}", x: 540, y: 1286, police: "Cinzel", taille: 68, couleur: "laiton", gras: true },
  { id: "autres", texte: "+ {n} autres objets à collectionner dans le jeu", x: 540, y: 1346, police: "Cinzel", taille: 36, couleur: "ivoire", gras: false },
  { id: "dispo", texte: "Disponible gratuitement sur", x: 540, y: 1396, police: "Cinzel", taille: 38, couleur: "ivoire", gras: false },
]);

export const REGLAGES_DEFAUT = Object.freeze({
  fond: "foire-chatou", fondPerso: null, objets: [], cible: null,
  type: "pause",
  vitesse: 2.5, espacement: 520, nbPassages: 3, largeurFlash: 4,
  // Roulette qui ralentit.
  nbTours: 3, dureeDefilement: 8, arretFinal: 2,
  // Devine le prix.
  dureeCompte: 3, dureeRevele: 2, dernierMystere: false,
  flou: 0,
  // Saturation du fond, en % (100 = tel quel, 0 = noir et blanc).
  saturation: 100,
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

/**
 * Déplace le calque `id` d'un cran dans la pile : +1 vers la fin du tableau
 * (= dessiné plus tard = plus en avant), −1 vers l'arrière. En place.
 * → true si quelque chose a bougé, false en bout de pile ou id inconnu.
 */
export function deplacerTexte(textes, id, sens) {
  const i = textes.findIndex((c) => c.id === id);
  const j = i + Math.sign(sens);
  if (i < 0 || j < 0 || j >= textes.length) return false;
  [textes[i], textes[j]] = [textes[j], textes[i]];
  return true;
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
    let out = brut.textes.map(normaliserTexte).filter(Boolean);
    const defaut = (id) => ({ ...TEXTES_DEFAUT.find((d) => d.id === id) });
    // Sauvegarde d'un état intermédiaire : « {nom} · {prix} » sur une ligne → nom puis prix dessous.
    const i = out.findIndex((c) => c.id === "objet" && c.texte === "{nom} · {prix}");
    if (i >= 0) {
      out.splice(i, 1, defaut("nom"), defaut("prix"));
      // Les calques suivants jamais déplacés depuis leurs anciennes places descendent avec la pile.
      for (const c of out) {
        if (c.id === "autres" && c.y === 1284) Object.assign(c, { y: 1346, taille: 36 });
        if (c.id === "dispo" && c.y === 1358) Object.assign(c, { y: 1396, taille: 38 });
      }
    }
    // Sauvegarde d'avant les calques nom / prix : on les lui donne, sinon plus de nom ni de prix.
    if (!out.some((c) => c.texte.includes("{nom}") || c.texte.includes("{prix}"))) {
      out.splice(Math.min(1, out.length), 0, defaut("nom"), defaut("prix"));
    }
    return out.slice(0, TEXTES_MAX);
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
    type: ["ralentie", "devine"].includes(brut.type) ? brut.type : "pause",
    dureeCompte: borne(brut.dureeCompte, 2, 5, REGLAGES_DEFAUT.dureeCompte),
    dureeRevele: borne(brut.dureeRevele, 1, 4, REGLAGES_DEFAUT.dureeRevele),
    dernierMystere: brut.dernierMystere === true,
    vitesse: borne(brut.vitesse, 1.5, 4, REGLAGES_DEFAUT.vitesse),
    nbTours: Math.round(borne(brut.nbTours, 1, 6, REGLAGES_DEFAUT.nbTours)),
    dureeDefilement: borne(brut.dureeDefilement, 3, 15, REGLAGES_DEFAUT.dureeDefilement),
    arretFinal: borne(brut.arretFinal, 0.5, 5, REGLAGES_DEFAUT.arretFinal),
    espacement: borne(brut.espacement, 400, 700, REGLAGES_DEFAUT.espacement),
    nbPassages: Math.round(borne(brut.nbPassages, 2, 4, REGLAGES_DEFAUT.nbPassages)),
    largeurFlash: Math.round(borne(brut.largeurFlash, 2, 8, REGLAGES_DEFAUT.largeurFlash)),
    flou: Math.round(borne(brut.flou, 0, 40, REGLAGES_DEFAUT.flou)),
    saturation: Math.round(borne(brut.saturation, 0, 200, REGLAGES_DEFAUT.saturation)),
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
