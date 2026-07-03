import type { EtatObjet, GameState, ObjetEnVente, Rarete, Tendance } from "@/types/game";
import {
  getTemplate,
  poolPourTier,
  type ObjetTemplate,
} from "@/data/objetTemplates";
import type { Brocante, CelebriteEvenement } from "@/types/game";
import { UNIQUES } from "@/data/uniques";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";
import { modificateurTendance } from "@/lib/tendances";
import {
  tirerPersonaVendeur,
  calculerPrixMinAcceptDepuisPersona,
  getAffiniteCategorie,
} from "@/lib/personas";

/**
 * Quand une célébrité visite la brocante : multiplicateur appliqué aux poids
 * `rare` et `legendaire` (les bonnes pièces sortent). Multiplicateur sur
 * `taillePool` pour augmenter l'affluence de marchands.
 */
const CELEBRITE_BOOST_RARES = 2.0;
const CELEBRITE_BOOST_TAILLE = 1.5;

// Pristin état est rare en chinage — il faut le créer en atelier.
const ETATS: readonly EtatObjet[] = ["Mauvais", "Bon", "Très bon"];
const FACTEUR_ETAT: Record<EtatObjet, number> = {
  Mauvais: 0.3,
  Bon: 0.6,
  "Très bon": 1,
  "Pristin état": 1.4,
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Plages du prix min accepté par le vendeur, en % de son prix affiché.
 * Plus la brocante est prestigieuse, plus les vendeurs sont rigides.
 */
const TOLERANCE_PAR_TIER: Record<1 | 2 | 3 | 4, { min: number; max: number }> = {
  1: { min: 0.70, max: 0.90 },
  2: { min: 0.78, max: 0.92 },
  3: { min: 0.85, max: 0.95 },
  4: { min: 0.90, max: 0.97 },
};
/** Seuil sous lequel l'offre est jugée insultante (vendeur se fâche). */
export const SEUIL_COLERE_VENDEUR = 0.5;

/**
 * Bonus de prix appliqué aux objets dont la catégorie correspond à la
 * spécialisation de la brocante (le vendeur connaît la valeur de son thème).
 */
export const BONUS_SPECIALISATION = 1.1;

/** Surcote du bonimenteur : son prix affiché est gonflé, sa vraie cote est en dessous. */
export const SURCOTE_BONIMENTEUR = 1.35;

function instancier(
  template: ObjetTemplate,
  tendances: readonly Tendance[],
  tier: 1 | 2 | 3 | 4 = 1,
  brocante?: Brocante,
): ObjetEnVente {
  const etat = pickRandom(ETATS);
  const prixReferenceReel = Math.max(
    1,
    Math.round(template.prixRefBase * FACTEUR_ETAT[etat]),
  );
  const persona = tirerPersonaVendeur(brocante, template.categorie);
  const affinite = getAffiniteCategorie(persona.archetype);
  // Un spécialiste connaît la cote de sa catégorie : il ne brade jamais.
  const facteurCoteMin =
    affinite && affinite.categorie === template.categorie
      ? affinite.facteurCoteMin
      : 0;
  const facteurVendeur = Math.max(facteurCoteMin, 0.6 + Math.random() * 0.8);
  const modTend = modificateurTendance(template.categorie, tendances);
  const modSpec =
    brocante?.specialisation === template.categorie ? BONUS_SPECIALISATION : 1;
  const surcote = persona.archetype === "bonimenteur" ? SURCOTE_BONIMENTEUR : 1;
  const prixVendeur = Math.max(
    1,
    Math.round(prixReferenceReel * facteurVendeur * modTend * modSpec * surcote),
  );
  const prixMinAccept = calculerPrixMinAcceptDepuisPersona(persona, prixVendeur);

  return {
    id: crypto.randomUUID(),
    objet: {
      id: crypto.randomUUID(),
      templateId: template.templateId,
      nom: template.nom,
      categorie: template.categorie,
      etat,
      prixReferenceReel,
      rarete: template.rarete,
    },
    prixVendeur,
    prixAffiche: Math.random() > 0.4,
    prixMinAccept,
    negociationsTentees: 0,
    statut: "disponible",
    persona,
    negociation: null,
  };
}

/**
 * Mix de rareté par tier : part de chaque rareté au tirage d'un emplacement,
 * indépendante de la composition du pool. (L'ancien tirage pondérait chaque
 * TEMPLATE : avec 40 communs pour 12 rares par catégorie, un poids « rare: 10 »
 * donnait ~3 % de rares effectifs — les belles pièces ne sortaient jamais.)
 * Le légendaire générique reste anecdotique : les pièces d'exception passent
 * par le poolExclusif des brocantes tiers 3-4.
 */
export const MIX_RARETE_PAR_TIER: Record<1 | 2 | 3 | 4, Record<Rarete, number>> = {
  1: { commun: 94.9, rare: 5, legendaire: 0.1 },
  2: { commun: 87.8, rare: 12, legendaire: 0.2 },
  3: { commun: 81.6, rare: 18, legendaire: 0.4 },
  4: { commun: 71.2, rare: 28, legendaire: 0.8 },
};

function poidsRarete(rarete: Rarete, boost: boolean, tier: 1 | 2 | 3 | 4): number {
  const base = MIX_RARETE_PAR_TIER[tier][rarete];
  return boost && rarete !== "commun" ? base * CELEBRITE_BOOST_RARES : base;
}

function tirerTemplatePondere(
  pool: readonly ObjetTemplate[],
  boostRares: boolean,
  tier: 1 | 2 | 3 | 4,
): ObjetTemplate {
  // 1ᵉʳ étage : la rareté, selon le mix du tier (boost célébrité compris),
  // renormalisée sur les raretés réellement présentes dans le pool.
  const parRarete = new Map<Rarete, ObjetTemplate[]>();
  for (const t of pool) {
    const liste = parRarete.get(t.rarete);
    if (liste) liste.push(t);
    else parRarete.set(t.rarete, [t]);
  }
  const candidats = [...parRarete.entries()].map(([rarete, templates]) => ({
    templates,
    poids: poidsRarete(rarete, boostRares, tier),
  }));
  const total = candidats.reduce((s, c) => s + c.poids, 0);
  let r = Math.random() * total;
  let choisis = candidats[candidats.length - 1].templates;
  for (const c of candidats) {
    r -= c.poids;
    if (r <= 0) {
      choisis = c.templates;
      break;
    }
  }
  // 2ᵉ étage : uniforme parmi les templates de la rareté choisie.
  return choisis[Math.floor(Math.random() * choisis.length)];
}

/**
 * Probabilité PAR SESSION qu'une (seule) pièce du poolExclusif soit sur les
 * étals. L'ancien tirage par emplacement (25-40 % par objet) posait 2 à 4
 * pièces d'exception par visite en tiers 3-4 : le légendaire était banal.
 * Ici il redevient un événement — fréquent au boss, notable ailleurs.
 */
export const CHANCE_EXCLUSIF_PAR_SESSION: Record<1 | 2 | 3 | 4, number> = {
  1: 0.10,
  2: 0.20,
  3: 0.40,
  4: 0.80,
};

/** Part minimale d'items de la catégorie de spécialisation (brocantes spécialisées). */
const QUOTA_SPECIALISATION = 0.5;

export function genererSession(
  taille: number,
  tendances: readonly Tendance[] = [],
  brocante?: Brocante,
  celebrite?: CelebriteEvenement | null,
  /** Templates à ne jamais proposer (cf. uniquesExclusDuChinage). */
  exclus?: ReadonlySet<string>,
): ObjetEnVente[] {
  const celebritePresente =
    !!brocante && !!celebrite && celebrite.brocanteId === brocante.id;
  const tailleEffective = celebritePresente
    ? Math.round(taille * CELEBRITE_BOOST_TAILLE)
    : taille;
  const items: ObjetEnVente[] = [];
  const dejaTires = new Set<string>();
  let attempts = 0;
  const maxAttempts = tailleEffective * 6;

  // Résout les templates exclusifs de la brocante (en évinçant les ids inconnus
  // et les templates exclus — uniques déjà possédés)
  const exclusifs: ObjetTemplate[] = (brocante?.poolExclusif ?? [])
    .map((id) => getTemplate(id))
    .filter((t): t is ObjetTemplate => t !== undefined && !exclus?.has(t.templateId));

  // Pool générique filtré par tier (1⭐ → 1/3, 2⭐ → 2/3, 3⭐+ → tout).
  const poolGenerique = poolPourTier(brocante?.tier ?? 1);

  // Brocantes spécialisées : force au moins QUOTA_SPECIALISATION d'items du thème.
  const spe = brocante?.specialisation;
  const quotaSpe = spe ? Math.ceil(taille * QUOTA_SPECIALISATION) : 0;
  const poolCommunSpe = spe
    ? poolGenerique.filter((t) => t.categorie === spe)
    : [];
  const poolExclusifSpe = spe
    ? exclusifs.filter((t) => t.categorie === spe)
    : [];

  // Un seul emplacement exclusif par session, tiré une fois pour toutes.
  let exclusifsRestants =
    exclusifs.length > 0 &&
    Math.random() < CHANCE_EXCLUSIF_PAR_SESSION[brocante?.tier ?? 1]
      ? 1
      : 0;

  while (items.length < tailleEffective && attempts < maxAttempts) {
    attempts += 1;

    const compteSpe = spe
      ? items.filter((it) => it.objet.categorie === spe).length
      : 0;
    const restant = tailleEffective - items.length;
    const manqueSpe = Math.max(0, quotaSpe - compteSpe);
    const forcerSpe = spe !== undefined && manqueSpe >= restant;

    // L'emplacement exclusif se place uniformément dans la session :
    // probabilité = restants / emplacements encore à remplir.
    const tenterExclusif =
      exclusifsRestants > 0 && Math.random() < exclusifsRestants / restant;

    let pool: readonly ObjetTemplate[];
    let poolEstExclusif = false;
    if (forcerSpe) {
      poolEstExclusif = tenterExclusif && poolExclusifSpe.length > 0;
      pool = poolEstExclusif ? poolExclusifSpe : poolCommunSpe;
    } else {
      poolEstExclusif = tenterExclusif;
      pool = poolEstExclusif ? exclusifs : poolGenerique;
    }
    if (pool.length === 0) continue;

    const t = tirerTemplatePondere(pool, celebritePresente, brocante?.tier ?? 1);
    // Pas de doublon pour rares et légendaires
    if (t.rarete !== "commun" && dejaTires.has(t.templateId)) continue;
    dejaTires.add(t.templateId);
    if (poolEstExclusif) exclusifsRestants -= 1;
    items.push(instancier(t, tendances, brocante?.tier ?? 1, brocante));
  }
  return items;
}


/* === Unicité effective des objets uniques ============================== */

/** Templates ciblés par l'arc principal (le ch. 5 vise l'unique de la finale). */
const CIBLES_ARC_PRINCIPAL = new Set(
  QUETES_PRINCIPALES.flatMap((ch) => ch.payload.cibles.map((c) => c.templateId)),
);

/**
 * Uniques à ne plus jamais proposer en chinage : un objet `unique` ne peut être
 * possédé qu'une fois par partie (`dejaPossede` dans la collection).
 *
 * Exception anti-softlock : un unique ciblé par un chapitre de l'arc principal
 * NON livré (les bijoux de la reine) redevient disponible si le joueur ne le
 * possède plus nulle part — sinon le revendre avant la livraison bloquerait
 * l'histoire à jamais.
 */
export function uniquesExclusDuChinage(
  state: Pick<
    GameState,
    "collection" | "inventaireJoueur" | "vitrine" | "courriers" | "missions"
  >,
): Set<string> {
  const possedes = new Set<string>(state.inventaireJoueur.map((o) => o.templateId));
  for (const ov of state.vitrine?.objets ?? []) possedes.add(ov.objet.templateId);

  // Cibles des missions principales déjà livrées (via leurs courriers).
  const courriersLivres = new Set(
    state.missions.filter((m) => m.statut === "livree").map((m) => m.courrierId),
  );
  const ciblesLivrees = new Set<string>();
  for (const c of state.courriers) {
    if (c.payload.type !== "mission" || c.payload.categorie !== "principale") continue;
    if (!courriersLivres.has(c.id)) continue;
    for (const cible of c.payload.cibles) ciblesLivrees.add(cible.templateId);
  }

  const exclus = new Set<string>();
  for (const u of UNIQUES) {
    const slot = state.collection[u.categorie]?.find(
      (s) => s.templateId === u.templateId,
    );
    if (!slot?.dejaPossede) continue; // jamais possédé → disponible
    const encorePossede = possedes.has(u.templateId) || slot.donation !== null;
    if (encorePossede) {
      exclus.add(u.templateId);
      continue;
    }
    const cibleArcNonLivree =
      CIBLES_ARC_PRINCIPAL.has(u.templateId) && !ciblesLivrees.has(u.templateId);
    if (!cibleArcNonLivree) exclus.add(u.templateId);
  }
  return exclus;
}
