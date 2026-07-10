/**
 * Simulateur de la courbe de Niveau de Brocanteur (audit d'équilibrage,
 * cf. docs/equilibrage/refonte-leveling — rapport 2026-07-03).
 *
 * Ce module NE réimplémente AUCUNE formule de jeu : il pilote les vraies
 * fonctions de src/lib/{chine,vitrine,xp,energie,deblocage,actives,collection,
 * meteo,negociation} et src/data/{brocantes,clients,meteos} pour produire des
 * parties simulées jour par jour, sur plusieurs profils de joueurs et seeds.
 *
 * Le hasard des modules réels (Math.random) doit être stubbé par l'appelant
 * (cf. niveauSim.test.ts, vi.spyOn(Math, "random").mockImplementation(rng))
 * avant d'appeler `runSimulation` — ce module reste agnostique de vitest.
 *
 * Limites d'honnêteté assumées (documentées aussi dans le rapport) :
 * - Les actives à usage (Fouille, Lot garni, Boniment, Tchatche, Criée) ne
 *   sont PAS exercées dans la boucle quotidienne (achat/vente) : leur usage
 *   réel dépend de choix tactiques fins hors scope ici. Elles sont exercées
 *   dans des micro-simulations dédiées (Fouille, Lot garni — cf. rapport
 *   §6-7) et leurs jalons de déblocage (NIVEAU_ACTIVES) sont seulement
 *   annotés sur la courbe médiane de niveau, à titre indicatif.
 * - L'énergie n'est pas simulée en temps réel (ms) mais via un budget de
 *   sessions/jour = floor(énergieMax(niveau) × présence) + pubs, où
 *   « présence » modélise le temps d'attention réellement disponible (pas
 *   une limite de régénération : à énergieMax ≤ 7 et RECHARGE_INTERVAL_MS
 *   = 30 min, la jauge se remplit intégralement en ≤ 3h30, largement sous
 *   l'écart entre deux visites, même occasionnelles).
 * - Les célébrités et les tendances de marché ne sont pas modélisées
 *   (tendances = [], célébrité = undefined) : leur effet est ponctuel et
 *   symétrique entre profils, sans impact structurel sur la courbe de
 *   niveau.
 * - Les quêtes (quotidienne / hebdo / chapitres) et la restauration sont
 *   modélisées « au forfait » (probabilités/fréquences), pas via les
 *   véritables générateurs de missions — seul leur gain d'XP (constantes
 *   réelles de lib/xp) est injecté, cf. énoncé de la tâche.
 */

import type {
  Brocante,
  CategorieObjet,
  CollectionSlot,
  ConditionDeblocage,
  GameState,
  Objet,
  ObjetEnVitrine,
} from "@/types/game";
import { INITIAL_BUDGET } from "@/types/game";
import type { ClientPersonnage } from "@/data/clients";
import { genererPoolClients } from "@/data/clients";
import { METEO_INTERVALLE_MULT } from "@/data/meteos";
import { BROCANTES, brocantesParTier, fraisEntree } from "@/data/brocantes";
import {
  genererRemplacement,
  genererSession,
  MIX_RARETE_PAR_TIER,
  uniquesExclusDuChinage,
} from "@/lib/chine";
import {
  calculerFourchettePrixMax,
  ajouterAuPanier,
  calculerPrixMax,
  DEFAULT_MODIFIERS,
  genererClientEvent,
  JOURNEE_DUREE_SECONDES,
  prochainIntervalleClient,
  proposerOffreVente,
} from "@/lib/vitrine";
import {
  appliquerGainXPBrocanteur,
  emptyBrocanteur,
  XP_ACHAT_BROCANTEUR,
  XP_DECOUVERTE_COLLECTION,
  XP_JUSTE_PRIX,
  XP_NEGO_BROCANTEUR,
  XP_QUETE_HEBDO,
  XP_QUETE_PRINCIPALE,
  XP_QUETE_QUOTIDIENNE,
  XP_RESTAURATION_ETAPE,
  XP_VENTE_BROCANTEUR,
} from "@/lib/xp";
import { ENERGIE_MAX, RECHARGE_INTERVAL_MS } from "@/lib/energie";
import { calculerBrocantesDebloqueesParTier, evaluerCondition } from "@/lib/deblocage";
import { NIVEAU_ACTIVES, QUOTA_ACTIVES, type ActiveId } from "@/lib/actives";
import { ouvrirNegociation, proposerOffre } from "@/lib/negociation";
import { donnerObjet, initCollection, valeurTotale } from "@/lib/collection";
import { tirerMeteo } from "@/lib/meteo";

/* === RNG seedé (mulberry32) ============================================ */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Petite aide : durée (heures) pour un plein régénéré depuis 0, à un niveau donné. */
export function heuresPourPlein(niveau: number): number {
  return (ENERGIE_MAX * RECHARGE_INTERVAL_MS) / 3_600_000;
}

/* === Profils de joueurs ================================================= */

export type ProfileId = "casual" | "regulier" | "hardcore";

export interface ProfileConfig {
  id: ProfileId;
  label: string;
  /** Fraction du budget d'énergie (cap = énergieMax(niveau)) réellement dépensée/jour. */
  presenceFactor: number;
  /** Pubs "+1 énergie" vues par jour (borné par PUBS_ENERGIE_MAX_PAR_JOUR = 5). */
  pubsPerDay: number;
  /** Nombre de chapitres d'arc principal sur la fenêtre simulée. */
  totalChapitres: number;
  /** Étapes de restauration à l'atelier par jour (peut être fractionnaire). */
  restaurationParJour: number;
}

export const PROFILES: Record<ProfileId, ProfileConfig> = {
  casual: {
    id: "casual",
    label: "Casual (2 visites/jour)",
    presenceFactor: 0.6,
    pubsPerDay: 0,
    totalChapitres: 2,
    restaurationParJour: 0.5,
  },
  regulier: {
    id: "regulier",
    label: "Régulier (4 visites/jour)",
    presenceFactor: 0.85,
    pubsPerDay: 1,
    totalChapitres: 5,
    restaurationParJour: 1,
  },
  hardcore: {
    id: "hardcore",
    label: "Hardcore (présence quasi continue)",
    presenceFactor: 1.0,
    pubsPerDay: 2,
    totalChapitres: 5,
    restaurationParJour: 2,
  },
};

const QUETE_QUOTIDIENNE_PROBA = 0.1;
const QUETE_HEBDO_INTERVALLE_JOURS = 21;
const SEUIL_STOCK_VENTE = 3;
const JOUR_OUVERTURE_ATELIER = 3;
const RATIO_ACHAT_DECENT = 0.85;
const SURVENTE_ETAT = 1.15;
const TAILLE_SESSION_CHINE = 6;
const TAILLE_POOL_CLIENTS = 20;
const TAILLE_MAX_STAND = 10;
/**
 * Probabilité de donner (plutôt que revendre) un commun jamais donné. Le pool
 * de communs (des dizaines par catégorie) est bien plus grand que ce qu'une
 * partie achète en 120 jours : donner systématiquement le 1er exemplaire
 * assècherait le stock de revente (plus jamais de session de vente déclenchée,
 * plus jamais de rentrée d'argent) — cf. bug détecté en debug local. On donne
 * donc une fraction seulement, le reste alimente la revente (le vrai moteur
 * économique du joueur), la collection progressant plus lentement mais sûrement.
 */
const PROBA_DONATION_COMMUN_NEUF = 0.35;
/**
 * Coussin de trésorerie sous lequel on ne donne plus rien (priorité à la
 * revente pour reconstituer le budget) — un joueur sensé ne sacrifie pas une
 * pièce vendable quand il est presque à sec.
 */
const COUSSIN_DONATION = 40;

/* === XP par source (agrégation) ========================================= */

export interface XpSourceTotals {
  achat: number;
  decouverte: number;
  negoAchat: number;
  vente: number;
  justePrix: number;
  negoVente: number;
  restauration: number;
  queteQuotidienne: number;
  queteHebdo: number;
  questePrincipale: number;
}

function emptyXpTotals(): XpSourceTotals {
  return {
    achat: 0,
    decouverte: 0,
    negoAchat: 0,
    vente: 0,
    justePrix: 0,
    negoVente: 0,
    restauration: 0,
    queteQuotidienne: 0,
    queteHebdo: 0,
    questePrincipale: 0,
  };
}

/* === Snapshots / résultats ============================================== */

export interface DaySnapshot {
  jour: number;
  niveau: number;
  xp: number;
  tierMax: 1 | 2 | 3 | 4;
  sessionsChine: number;
  sessionsVente: number;
  sessionsTotal: number;
  budget: number;
  collectionValeur: number;
}

export interface GateEvent {
  tier: 2 | 3 | 4;
  brocanteId: string;
  jour: number;
  blocking: "niveau" | "eco" | "both";
}

export interface RunResult {
  profileId: ProfileId;
  seed: number;
  days: DaySnapshot[];
  gateEvents: GateEvent[];
  xpTotals: XpSourceTotals;
}

/* === État interne de la simulation ====================================== */

type StateLike = Pick<
  GameState,
  "jourActuel" | "budget" | "historique" | "collection" | "brocanteur"
>;

interface SimState {
  jour: number;
  budget: number;
  brocanteur: GameState["brocanteur"];
  collection: Record<CategorieObjet, CollectionSlot[]>;
  stockAVendre: Objet[];
  templatesVusGlobal: Set<string>;
}

function stateLike(sim: SimState): StateLike {
  return {
    jourActuel: sim.jour,
    budget: sim.budget,
    historique: [] as GameState["historique"],
    collection: sim.collection,
    brocanteur: sim.brocanteur,
  };
}

function atomicConditions(c: ConditionDeblocage): ConditionDeblocage[] {
  return c.type === "ET" ? c.conditions : [c];
}

/** Choisit la brocante "courante" pour le chinage/la vente : la plus prestigieuse
 *  débloquée, en préférant une brocante générale (non spécialisée) pour ne pas
 *  biaiser les achats vers une seule catégorie. */
function brocanteCourante(
  debloqueesParTier: Map<1 | 2 | 3 | 4, Set<string>>,
): Brocante {
  for (const tier of [4, 3, 2, 1] as const) {
    const ids = debloqueesParTier.get(tier);
    if (!ids || ids.size === 0) continue;
    const candidats = brocantesParTier(tier).filter((b) => ids.has(b.id));
    const generale = candidats.find((b) => !b.specialisation);
    if (generale) return generale;
    if (candidats.length > 0) return candidats[0];
  }
  // Filet : la première brocante du catalogue (toujours débloquée dès le départ).
  return BROCANTES[0];
}

/* === Négociation d'achat (chinage) ====================================== */

interface ResultatAchat {
  achete: boolean;
  prixPaye: number;
  negoReussie: boolean;
}

function tenterAchat(
  item: ReturnType<typeof genererSession>[number],
  budgetDispo: number,
): ResultatAchat {
  const echec: ResultatAchat = { achete: false, prixPaye: 0, negoReussie: false };
  const ratio = item.objet.prixReferenceReel / item.prixVendeur;
  if (ratio < RATIO_ACHAT_DECENT) return echec;
  if (item.prixVendeur > budgetDispo) {
    // Peut-être encore abordable après négociation à la baisse : on tente.
    if (item.prixMinAccept > budgetDispo) return echec;
  }

  const offre1 = Math.round(item.prixVendeur * 0.8);
  let nego = ouvrirNegociation("achat", item.prixVendeur, item.prixMinAccept);
  nego = proposerOffre(nego, item.persona, offre1);

  if (nego.statut === "conclu") {
    const prix = nego.prixAdverseCourant;
    if (prix > budgetDispo) return echec;
    return { achete: true, prixPaye: prix, negoReussie: true };
  }
  if (nego.statut === "en_cours") {
    const offre2 = Math.round((offre1 + nego.prixAdverseCourant) / 2);
    nego = proposerOffre(nego, item.persona, offre2);
    if (nego.statut === "conclu") {
      const prix = nego.prixAdverseCourant;
      if (prix > budgetDispo) return echec;
      return { achete: true, prixPaye: prix, negoReussie: true };
    }
  }
  // Négo qui traîne, fâcherie ou refus poli : on n'insiste pas, prix trop juste.
  return echec;
}

/* === Négociation de vente (stand) ======================================= */

interface ResultatVente {
  vendu: boolean;
  prixObtenu: number;
  negoReussie: boolean;
  achatDirect: boolean;
}

function tenterVente(ev: ReturnType<typeof genererClientEvent>): ResultatVente {
  const echec: ResultatVente = {
    vendu: false,
    prixObtenu: 0,
    negoReussie: false,
    achatDirect: false,
  };
  if (!ev) return echec;
  if (ev.mode === "achat-direct") {
    return { vendu: true, prixObtenu: ev.prixDemande, negoReussie: false, achatDirect: true };
  }
  // Le joueur ne connaît pas `ev.prixMax` (sauf Œil aiguisé, non modélisé) :
  // une politique réaliste contre-propose une hausse modeste depuis l'offre
  // initiale du client plutôt que de camper près du prix demandé — sans quoi
  // l'offre est presque toujours jugée insultante par le moteur de négo réel
  // (offre > prixAdverseCourant × (1+tolérance)) et la vente échoue quasi
  // systématiquement.
  const nego = ouvrirNegociation("vente", ev.offreInitiale, ev.prixMax);
  const offre1 = Math.round(ev.offreInitiale * 1.15);
  let res = proposerOffreVente(nego, ev.persona, offre1, DEFAULT_MODIFIERS);
  if (res.statut === "conclu") {
    return { vendu: true, prixObtenu: res.prixAdverseCourant, negoReussie: true, achatDirect: false };
  }
  if (res.statut === "en_cours") {
    const offre2 = Math.round(res.prixAdverseCourant * 1.08);
    res = proposerOffreVente(res, ev.persona, offre2, DEFAULT_MODIFIERS);
    if (res.statut === "conclu") {
      return { vendu: true, prixObtenu: res.prixAdverseCourant, negoReussie: true, achatDirect: false };
    }
  }
  return echec;
}

/* === Boucle principale : une journée ==================================== */

function joueJourChine(
  sim: SimState,
  brocante: Brocante,
  xp: XpSourceTotals,
): number {
  const frais = fraisEntree(brocante);
  if (sim.budget < frais) return 0; // pas de session "gratuite" : on rentre bredouille.
  sim.budget -= frais;

  const exclus = uniquesExclusDuChinage({
    collection: sim.collection,
    inventaireJoueur: sim.stockAVendre,
    vitrine: null,
    courriers: [] as GameState["courriers"],
    missions: [] as GameState["missions"],
  });
  const session = genererSession(TAILLE_SESSION_CHINE, [], brocante, undefined, exclus);

  let gainXP = 0;
  for (const item of session) {
    const res = tenterAchat(item, sim.budget);
    if (!res.achete) continue;
    sim.budget -= res.prixPaye;
    xp.achat += XP_ACHAT_BROCANTEUR;
    gainXP += XP_ACHAT_BROCANTEUR;
    if (res.negoReussie) {
      xp.negoAchat += XP_NEGO_BROCANTEUR;
      gainXP += XP_NEGO_BROCANTEUR;
    }
    if (!sim.templatesVusGlobal.has(item.objet.templateId)) {
      sim.templatesVusGlobal.add(item.objet.templateId);
      xp.decouverte += XP_DECOUVERTE_COLLECTION;
      gainXP += XP_DECOUVERTE_COLLECTION;
    }

    const cat = item.objet.categorie;
    const slot = sim.collection[cat]?.find((s) => s.templateId === item.objet.templateId);
    const slotVide = !!slot && slot.donation === null;
    const donne =
      item.objet.rarete === "commun" &&
      slotVide &&
      sim.budget >= COUSSIN_DONATION &&
      Math.random() < PROBA_DONATION_COMMUN_NEUF;
    if (donne) {
      const { collection } = donnerObjet(
        sim.collection,
        item.objet.templateId,
        item.objet.etat,
        item.objet.prixReferenceReel,
      );
      sim.collection = collection;
    } else {
      sim.stockAVendre.push(item.objet);
    }
  }
  return gainXP;
}

function joueJourVente(
  sim: SimState,
  brocante: Brocante,
  xp: XpSourceTotals,
): number {
  if (sim.stockAVendre.length === 0) return 0;
  const frais = fraisEntree(brocante);
  if (sim.budget < frais) return 0;
  sim.budget -= frais;

  const stand: ObjetEnVitrine[] = sim.stockAVendre
    .slice(0, TAILLE_MAX_STAND)
    .map((obj) => ({ objet: obj, prixVente: Math.max(1, Math.round(obj.prixReferenceReel * SURVENTE_ETAT)) }));

  const meteo = tirerMeteo();
  const intervalleMultiplier = METEO_INTERVALLE_MULT[meteo];
  const pool = genererPoolClients(TAILLE_POOL_CLIENTS, brocante.tier);

  let t = 0;
  let idx = 0;
  let gainXP = 0;
  const vendusIds = new Set<string>();
  let iterations = 0;
  // Garde-fou : au pire un événement toutes les CLIENT_INTERVALLE_MIN_SEC,
  // borne le nombre d'itérations pour éviter toute boucle infinie théorique.
  const maxIterations = Math.ceil(JOURNEE_DUREE_SECONDES / 4) + 5;
  while (t < JOURNEE_DUREE_SECONDES && iterations < maxIterations) {
    iterations += 1;
    t += prochainIntervalleClient(intervalleMultiplier);
    if (t >= JOURNEE_DUREE_SECONDES) break;
    const persona: ClientPersonnage = pool[idx % pool.length];
    idx += 1;
    const disponibles = stand.filter((it) => !vendusIds.has(it.objet.id));
    if (disponibles.length === 0) continue;
    const ev = genererClientEvent(persona, disponibles, [], DEFAULT_MODIFIERS, { brocante });
    const res = tenterVente(ev);
    if (!res.vendu || !ev) continue;
    for (const it of ev.panier) vendusIds.add(it.objet.id);
    sim.budget += res.prixObtenu;
    xp.vente += XP_VENTE_BROCANTEUR;
    gainXP += XP_VENTE_BROCANTEUR;
    if (res.achatDirect) {
      xp.justePrix += XP_JUSTE_PRIX;
      gainXP += XP_JUSTE_PRIX;
    } else if (res.negoReussie) {
      xp.negoVente += XP_NEGO_BROCANTEUR;
      gainXP += XP_NEGO_BROCANTEUR;
    }
  }
  sim.stockAVendre = sim.stockAVendre.filter((o) => !vendusIds.has(o.id));
  return gainXP;
}

function joueJourMissions(
  sim: SimState,
  profile: ProfileConfig,
  xp: XpSourceTotals,
): number {
  let gainXP = 0;
  if (sim.jour >= JOUR_OUVERTURE_ATELIER) {
    const rate = profile.restaurationParJour;
    const whole = Math.floor(rate);
    const frac = rate - whole;
    const evenements = whole + (Math.random() < frac ? 1 : 0);
    for (let i = 0; i < evenements; i++) {
      xp.restauration += XP_RESTAURATION_ETAPE;
      gainXP += XP_RESTAURATION_ETAPE;
    }
  }
  if (Math.random() < QUETE_QUOTIDIENNE_PROBA) {
    xp.queteQuotidienne += XP_QUETE_QUOTIDIENNE;
    gainXP += XP_QUETE_QUOTIDIENNE;
  }
  if (sim.jour % QUETE_HEBDO_INTERVALLE_JOURS === 0) {
    xp.queteHebdo += XP_QUETE_HEBDO;
    gainXP += XP_QUETE_HEBDO;
  }
  return gainXP;
}

function joursChapitres(profile: ProfileConfig, totalDays: number): Set<number> {
  const jours = new Set<number>();
  for (let i = 1; i <= profile.totalChapitres; i++) {
    jours.add(Math.round((i * totalDays) / (profile.totalChapitres + 1)));
  }
  return jours;
}

/* === Boucle principale : la partie complète ============================= */

export function runSimulation(
  profile: ProfileConfig,
  seed: number,
  totalDays = 120,
): RunResult {
  const sim: SimState = {
    jour: 0,
    budget: INITIAL_BUDGET,
    brocanteur: emptyBrocanteur(),
    collection: initCollection(),
    stockAVendre: [],
    templatesVusGlobal: new Set(),
  };
  const xpTotals = emptyXpTotals();
  const days: DaySnapshot[] = [];
  const gateEvents: GateEvent[] = [];
  const joursChap = joursChapitres(profile, totalDays);

  let debloqueesAvant = calculerBrocantesDebloqueesParTier(stateLike(sim));

  for (let jour = 1; jour <= totalDays; jour++) {
    sim.jour = jour;
    const avantJourStateLike = stateLike(sim); // fin de la veille = début du jour
    const debloqueesDebutJour = debloqueesAvant;

    const brocante = brocanteCourante(debloqueesDebutJour);
    const energyMax = ENERGIE_MAX;
    const pubs = Math.min(profile.pubsPerDay, 5);
    const sessionsDispo = Math.max(
      1,
      Math.floor(energyMax * profile.presenceFactor) + pubs,
    );

    const stockSeuil = sim.stockAVendre.length >= SEUIL_STOCK_VENTE;
    const sessionsVente = stockSeuil ? 1 : 0;
    const sessionsChine = Math.max(0, sessionsDispo - sessionsVente);

    let gainXPJour = 0;
    for (let s = 0; s < sessionsChine; s++) {
      gainXPJour += joueJourChine(sim, brocante, xpTotals);
    }
    if (sessionsVente > 0) {
      gainXPJour += joueJourVente(sim, brocante, xpTotals);
    }
    gainXPJour += joueJourMissions(sim, profile, xpTotals);
    if (joursChap.has(jour)) {
      xpTotals.questePrincipale += XP_QUETE_PRINCIPALE;
      gainXPJour += XP_QUETE_PRINCIPALE;
    }

    sim.brocanteur = appliquerGainXPBrocanteur(sim.brocanteur, gainXPJour);

    const finJourStateLike = stateLike(sim);
    const debloqueesFinJour = calculerBrocantesDebloqueesParTier(finJourStateLike);

    // Détection des déblocages du jour + facteur bloquant (niveau vs éco),
    // évalué sur l'état de DÉBUT de journée (juste avant que la condition
    // ne bascule).
    for (const tier of [2, 3, 4] as const) {
      const idsAvant = debloqueesDebutJour.get(tier) ?? new Set<string>();
      const idsApres = debloqueesFinJour.get(tier) ?? new Set<string>();
      if (idsApres.size <= idsAvant.size) continue;
      for (const b of brocantesParTier(tier)) {
        if (idsAvant.has(b.id) || !idsApres.has(b.id)) continue;
        const atoms = atomicConditions(b.conditionDeblocage);
        const niveauAtoms = atoms.filter((a) => a.type === "niveau");
        const ecoAtoms = atoms.filter((a) => a.type !== "niveau");
        const niveauOK = niveauAtoms.every((a) =>
          evaluerCondition(a, avantJourStateLike, debloqueesDebutJour),
        );
        const ecoOK = ecoAtoms.every((a) =>
          evaluerCondition(a, avantJourStateLike, debloqueesDebutJour),
        );
        let blocking: GateEvent["blocking"];
        if (!niveauOK && ecoOK) blocking = "niveau";
        else if (niveauOK && !ecoOK) blocking = "eco";
        else blocking = "both";
        gateEvents.push({ tier, brocanteId: b.id, jour, blocking });
      }
    }
    debloqueesAvant = debloqueesFinJour;

    const tierMax = ([4, 3, 2, 1] as const).find(
      (t) => (debloqueesFinJour.get(t)?.size ?? 0) > 0,
    ) as 1 | 2 | 3 | 4;

    days.push({
      jour,
      niveau: sim.brocanteur.niveau,
      xp: sim.brocanteur.xp,
      tierMax,
      sessionsChine,
      sessionsVente,
      sessionsTotal: sessionsChine + sessionsVente,
      budget: sim.budget,
      collectionValeur: valeurTotale(sim.collection),
    });
  }

  return { profileId: profile.id, seed, days, gateEvents, xpTotals };
}

/* === Agrégation / statistiques =========================================== */

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return percentile(s, 0.5);
}

/** Premier jour où `niveau` atteint `cible`, ou null si jamais atteint. */
export function jourAtteinteNiveau(run: RunResult, cible: number): number | null {
  const d = run.days.find((x) => x.niveau >= cible);
  return d ? d.jour : null;
}

/** Jours de passage de palier de niveau (jour, niveau) sur toute la partie. */
export function joursDeLevelUp(run: RunResult): number[] {
  const jours: number[] = [];
  let dernierNiveau = 0;
  for (const d of run.days) {
    if (d.niveau > dernierNiveau) {
      jours.push(d.jour);
      dernierNiveau = d.niveau;
    }
  }
  return jours;
}

/** Plus grand écart (en jours) entre deux level-ups consécutifs avant d'atteindre `plafond`. */
export function ecartMaxAvantNiveau(run: RunResult, plafond: number): number {
  const jourPlafond = jourAtteinteNiveau(run, plafond) ?? run.days[run.days.length - 1]?.jour ?? 0;
  const levelUps = joursDeLevelUp(run).filter((j) => j <= jourPlafond);
  if (levelUps.length === 0) return jourPlafond;
  const bornes = [0, ...levelUps];
  let max = 0;
  for (let i = 1; i < bornes.length; i++) {
    max = Math.max(max, bornes[i] - bornes[i - 1]);
  }
  // Écart final entre le dernier level-up avant plafond et le jour du plafond.
  max = Math.max(max, jourPlafond - bornes[bornes.length - 1]);
  return max;
}

/** Jour médian (au sens simple : moyenne des jours de sessions_total autour du jalon) — utilisé pour metric 5. */
export function sessionsMoyennesAutourJalon(
  runs: RunResult[],
  jalonNiveau: number,
  fenetreJours = 10,
): { avant: number | null; apres: number | null } {
  const avants: number[] = [];
  const apres: number[] = [];
  for (const run of runs) {
    const jourJalon = jourAtteinteNiveau(run, jalonNiveau);
    if (jourJalon === null) continue;
    for (const d of run.days) {
      if (d.jour >= jourJalon - fenetreJours && d.jour < jourJalon) avants.push(d.sessionsTotal);
      if (d.jour >= jourJalon && d.jour < jourJalon + fenetreJours) apres.push(d.sessionsTotal);
    }
  }
  const moy = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  return { avant: moy(avants), apres: moy(apres) };
}

/** Jour médian de déblocage de chaque active (à titre indicatif, cf. NIVEAU_ACTIVES). */
export function joursMediansActives(runs: RunResult[]): Record<ActiveId, number | null> {
  const out = {} as Record<ActiveId, number | null>;
  for (const id of Object.keys(NIVEAU_ACTIVES) as Exclude<ActiveId, "diplomate">[]) {
    const jours = runs
      .map((r) => jourAtteinteNiveau(r, NIVEAU_ACTIVES[id]))
      .filter((j): j is number => j !== null);
    out[id] = jours.length ? median(jours) : null;
  }
  out.diplomate = null; // compétence, pas un jalon de niveau direct.
  return out;
}

export { QUOTA_ACTIVES };

/* === Micro-sim 1 : Fouille (farm check) ================================= */

export interface FouilleMicroSimResult {
  raresBaseParEtal: number;
  raresApres3RemplacementsParEtal: number;
  multiplicateur: number;
  trials: number;
}

/**
 * 1000 étals T3 : compare le nombre de rares+légendaires présents nativement
 * vs après 3 `genererRemplacement` ciblant les items les moins chers (usage
 * réaliste de l'active Fouille, quota 3/jour dès N9).
 */
export function runFouilleMicroSim(trials = 1000): FouilleMicroSimResult {
  const brocanteT3: Brocante = {
    id: "sim-t3",
    nom: "Brocante T3 simulée",
    description: "",
    ambiance: "",
    taillePool: 10,
    tier: 3,
    etoiles: 3,
    poolExclusif: [],
    conditionDeblocage: { type: "depart" },
  };
  let raresBase = 0;
  let raresApres = 0;
  for (let i = 0; i < trials; i++) {
    const session = genererSession(TAILLE_SESSION_CHINE, [], brocanteT3);
    raresBase += session.filter((it) => it.objet.rarete !== "commun").length;

    let stand = [...session];
    for (let f = 0; f < 3; f++) {
      // Cible l'item le moins cher (le plus "sacrifiable") du stand courant.
      let moinsCher = stand[0];
      for (const it of stand) if (it.prixVendeur < moinsCher.prixVendeur) moinsCher = it;
      const remplacement = genererRemplacement(moinsCher, stand, [], brocanteT3);
      stand = stand.map((it) => (it.id === moinsCher.id ? remplacement : it));
    }
    raresApres += stand.filter((it) => it.objet.rarete !== "commun").length;
  }
  const raresBaseParEtal = raresBase / trials;
  const raresApres3RemplacementsParEtal = raresApres / trials;
  return {
    raresBaseParEtal,
    raresApres3RemplacementsParEtal,
    multiplicateur:
      raresBaseParEtal > 0
        ? raresApres3RemplacementsParEtal / raresBaseParEtal
        : raresApres3RemplacementsParEtal > 0
          ? Infinity
          : 1,
    trials,
  };
}

/* === Micro-sim 2 : Lot garni (re-roll check) ============================= */

export interface LotGarniMicroSimResult {
  gains: number[]; // prixMaxBundle - (prixMax1 + prixMax2Seul), par essai
  ratios: number[]; // prixMaxBundle / (prixMax1 + prixMax2Seul)
  p50Gain: number;
  p90Gain: number;
  p50Ratio: number;
  p90Ratio: number;
  trials: number;
}

/**
 * 1000 négos : prixMax initial (1 objet) vs prixMax après `ajouterAuPanier`
 * d'un 2e objet de valeur similaire — le re-roll d'appétit (facteur tiré à
 * nouveau dans calculerPrixMax) peut-il gonfler le prixMax au-delà de la
 * simple somme des deux objets pris isolément (+ le bonus de lot officiel) ?
 */
export function runLotGarniMicroSim(trials = 1000): LotGarniMicroSimResult {
  const persona: ClientPersonnage = {
    id: "sim-client",
    archetypeId: "sim",
    archetypeNom: "Sim",
    nom: "Client simulé",
    ambiance: "",
    appetitMin: 0.7,
    appetitMax: 1.3,
    durete: 0.5,
    chanceMulti: 0.3,
    categoriesPreferees: [],
    categoriesEvitees: [],
    bonusPreference: 0.2,
    malusEvitement: 0.2,
    tierMin: 1,
    margePct: 0.2,
    elanPct: 0.3,
    patience: 5,
    tolerancePct: 0.2,
    sangFroid: 0.5,
  };
  const objet1: Objet = {
    id: "obj-1",
    templateId: "sim.objet.1",
    nom: "Objet simulé 1",
    categorie: "Maison",
    prixReferenceReel: 100,
    etat: "Bon",
    rarete: "commun",
  };
  const objet2: Objet = { ...objet1, id: "obj-2", templateId: "sim.objet.2", nom: "Objet simulé 2" };
  const ov1: ObjetEnVitrine = { objet: objet1, prixVente: 100 };
  const ov2: ObjetEnVitrine = { objet: objet2, prixVente: 100 };

  const gains: number[] = [];
  const ratios: number[] = [];
  for (let i = 0; i < trials; i++) {
    const prixMax1 = calculerPrixMax([ov1], persona, [], DEFAULT_MODIFIERS);
    const prixMax2Seul = calculerPrixMax([ov2], persona, [], DEFAULT_MODIFIERS);
    const ev = {
      id: "ev-sim",
      persona,
      panier: [ov1],
      prixMax: prixMax1,
      prixDemande: 100,
      offreInitiale: Math.round(prixMax1 * 0.9),
      mode: "negociation" as const,
      toleranceBoost: 0,
      fourchettePrixMax: calculerFourchettePrixMax(prixMax1),
    };
    const nego = ouvrirNegociation("vente", ev.offreInitiale, prixMax1);
    const { ev: evApres } = ajouterAuPanier(ev, ov2, nego, [], DEFAULT_MODIFIERS);
    const prixMaxBundle = evApres.prixMax;
    const attendu = prixMax1 + prixMax2Seul;
    gains.push(prixMaxBundle - attendu);
    ratios.push(attendu > 0 ? prixMaxBundle / attendu : 1);
  }
  const gainsTries = [...gains].sort((a, b) => a - b);
  const ratiosTries = [...ratios].sort((a, b) => a - b);
  return {
    gains,
    ratios,
    p50Gain: percentile(gainsTries, 0.5),
    p90Gain: percentile(gainsTries, 0.9),
    p50Ratio: percentile(ratiosTries, 0.5),
    p90Ratio: percentile(ratiosTries, 0.9),
    trials,
  };
}

export { ENERGIE_MAX, MIX_RARETE_PAR_TIER };
