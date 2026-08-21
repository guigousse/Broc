/**
 * Façade de mesure d'audience. Le jeu n'appelle JAMAIS le natif directement :
 * il passe par `getAnalytics()`, qui rend le provider Firebase sous Tauri iOS
 * et un stub inerte partout ailleurs (web, simulateur, dev desktop, vitest).
 *
 * Règle absolue : une panne de mesure ne casse pas une partie. Aucun appel
 * d'ici ne peut lever ni rejeter.
 */
import { firebaseDisponible, FirebaseAnalyticsProvider } from "./firebaseProvider";

/** Firebase n'accepte que des scalaires en valeur de paramètre. */
export type ParamsEvenement = Record<string, string | number | boolean>;

export interface AnalyticsProvider {
  logEvent(nom: string, params?: ParamsEvenement): void;
  setUserProperty(nom: string, valeur: string | null): void;
}

/**
 * Catalogue figé des événements. Toute mesure passe par une clé d'ici — jamais
 * par une chaîne écrite sur place, sous peine de rapports illisibles le jour où
 * deux écrans écrivent le même concept différemment.
 *
 * Contraintes Firebase : ≤ 40 caractères, `snake_case`, sans accent, et le
 * préfixe `firebase_`/`google_`/`ga_` est réservé.
 */
export const EVENEMENTS = {
  // Décrochage
  tutoEtape: "tuto_etape",
  tutoTermine: "tuto_termine",
  miniTutoTermine: "mini_tuto_termine",
  // Rétention & progression
  jourAtteint: "jour_atteint",
  niveauAtteint: "niveau_atteint",
  competenceDebloquee: "competence_debloquee",
  // Économie
  sessionChineTerminee: "session_chine_terminee",
  sessionVenteTerminee: "session_vente_terminee",
  ameliorationAchetee: "amelioration_achetee",
  // `acheterAuBazar` n'existe pas encore sur cette branche (le Bazar vit sur
  // feat/jetons-bazar, non fusionnée) : cette entrée est inerte pour le
  // moment, sans appelant, mais correcte dès la fusion — à garder, pas du
  // code mort.
  bazarAchat: "bazar_achat",
  // Monétisation
  energieEpuisee: "energie_epuisee",
  pubDemandee: "pub_demandee",
  pubTerminee: "pub_terminee",
  iapEcranVu: "iap_ecran_vu",
  // Navigation (screen_view est un nom réservé Firebase, on l'écrit tel quel)
  ecranVu: "screen_view",
} as const;

export type Evenement = (typeof EVENEMENTS)[keyof typeof EVENEMENTS];

/**
 * Propriétés utilisateur : ≤ 24 caractères. Servent à découper la population.
 * Aucun appelant pour l'instant (setUserProperty, le pont Rust et le handler
 * Swift existent, mais rien du jeu ne les invoque encore) : décision
 * volontaire actée dans le plan, à rouvrir après la première semaine de
 * vraies données.
 */
export const PROPRIETES = {
  tutoTermine: "tuto_termine",
  acheteurIap: "acheteur_iap",
  langue: "langue",
  niveauTranche: "niveau_tranche",
} as const;

/** Provider factice : n'envoie rien, enregistre tout. C'est lui qui rend les tests possibles. */
export class StubAnalyticsProvider implements AnalyticsProvider {
  readonly appels: { nom: string; params: ParamsEvenement }[] = [];
  readonly proprietes: { nom: string; valeur: string | null }[] = [];

  logEvent(nom: string, params: ParamsEvenement = {}): void {
    this.appels.push({ nom, params });
  }

  setUserProperty(nom: string, valeur: string | null): void {
    this.proprietes.push({ nom, valeur });
  }

  viderAppels(): void {
    this.appels.length = 0;
    this.proprietes.length = 0;
  }
}

let instance: AnalyticsProvider | null = null;

export function getAnalytics(): AnalyticsProvider {
  if (!instance) {
    instance = firebaseDisponible()
      ? new FirebaseAnalyticsProvider()
      : new StubAnalyticsProvider();
  }
  return instance;
}

/** Réservé aux tests : force le provider (ou repart du choix automatique). */
export function reinitialiserAnalyticsPourTest(provider?: AnalyticsProvider): void {
  instance = provider ?? null;
}
