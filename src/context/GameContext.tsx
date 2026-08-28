"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  INITIAL_BUDGET,
  INITIAL_JOUR,
  type CompetenceId,
  type EtatObjet,
  type GameState,
  type NiveauCamion,
  type Objet,
  type ObjetEnVitrine,
  type Session,
  type TutorielEtape,
} from "@/types/game";
import { getCamion } from "@/data/camion";
import {
  COLIS_TUTORIEL_TAILLE,
  objetColisTutoriel,
} from "@/data/starterInventory";
import {
  cadeauAnniversaireVisible,
  cadeauEnAttente,
  estVinyle,
  idDeclencheurCadeau,
  objetCadeauAnniversaire,
} from "@/lib/anniversaire";
import { obtenirGameRepository } from "@/lib/storage/createGameRepository";
import { migrerSauvegarde, SAVE_VERSION } from "@/lib/migrations";
import { useToastSafe } from "@/components/ui/Toast";
import { appendLedger } from "@/lib/grandLivre";
import { appliquerRecompense, recompenseEffective } from "@/lib/recompenses";
import { ajouterSession } from "@/lib/sessions";
import { indicesAConsommerPourLivraison } from "@/lib/missions";
import { missionLivrable } from "@/lib/quetes/objectifs";
import { PERIODE_TENDANCES_JOURS, PRIX_GAZETTE, genererTendances } from "@/lib/tendances";
import {
  getCompetence,
  pointsDepensesCompetences,
} from "@/data/competences";
import { CATEGORIES, emptyPiecesAmelioration } from "@/data/categories";
import { expireMissions, injecterLettreInvitationSiDue } from "@/lib/courrier";
import { chapitreParId } from "@/data/quetesPrincipales";
import { accepterChapitre } from "@/lib/quetes/principales";
import { prochainLundi } from "@/lib/calendrier";
import {
  crediterXPBrocanteur,
  emptyBrocanteur,
  XP_DECOUVERTE_COLLECTION,
  XP_RESTAURATION_ETAPE,
  multiplicateurXPRarete,
} from "@/lib/xp";
import {
  aCompetenceReparation,
  aGenInfluence,
  contexteDepuisState,
  etatCompetence,
  peutRestaurerCategorie,
} from "@/lib/competences";
import { tirerMeteo, tirerMeteoSemaine, indexJourSemaine } from "@/lib/meteo";
import { tirerCelebrite } from "@/lib/celebrite";
import { getProchaineUpgradeStockage, getStockageTier } from "@/data/stockage";
import { stockageEstPlein } from "@/lib/stockage";
import { estVendable } from "@/lib/vitrine";
import { tickQuetes } from "@/lib/quetes/tick";
import { settleQuetesPeriodiques } from "@/lib/quetes/settlePeriodiques";
import { settleBazar } from "@/lib/bazar/settleBazar";
import {
  acheterArticle,
  acheterLotPieces,
  type AchatBazar,
  type RaisonRefus,
} from "@/lib/bazar/achat";
import { appliquerFinTutoriel, ETAPES_TUTORIEL } from "@/lib/tutoriel";
import { logEvenement } from "@/lib/analytics/contexte";
import { EVENEMENTS } from "@/lib/analytics/analytics";
import { synchroniserNotifsQuetes } from "@/lib/notifications/quetesNotif";
import {
  initCollection,
  marquerDejaPossede as marquerDejaPossedeFn,
  marquerVu as marquerVuFn,
  marquerVuDansCollection as marquerVuDansCollectionFn,
  donnerObjet as donnerObjetFn,
  retirerDonation as retirerDonationFn,
} from "@/lib/collection";
import { getTemplate } from "@/data/objetTemplates";
import { ATELIER_SLOTS, getProchaineUpgrade } from "@/data/atelier";
import {
  appliquerAccelerationRestauration,
  appliquerRecuperation,
  coutAmelioration,
  rendementDemantelement,
} from "@/lib/atelier";
import { dureeRestaurationMs, peutTerminerImmediat } from "@/lib/restauration";
import {
  activeDebloquee,
  consommerActive,
  usagesRestants,
  type ActiveId,
} from "@/lib/actives";
import { audioManager } from "@/lib/audio/audioManager";
import {
  ENERGIE_MAX,
  ENERGIE_PAR_PUB,
  enregistrerPubEnergie,
  pubsEnergieRestantes,
  secondesAvantPlein,
  settleEnergie,
} from "@/lib/energie";
import {
  notificationsDisponibles,
  assurerPermission,
  planifierPleinEnergie,
  annulerPleinEnergie,
} from "@/lib/notifications/energieNotif";
import {
  programmerRappelRetour,
  annulerRappelRetour,
} from "@/lib/notifications/rappelRetour";
import { synchroniserNotifsRestauration } from "@/lib/notifications/restaurationNotif";
import {
  poserAncre,
  tempsConfianceCourant,
  type AncreTemps,
} from "@/lib/temps/horloge";
import { getTimeSource } from "@/lib/temps/timeSource";
import { appliquerReclamation } from "@/lib/boiteMystere";
import {
  EVENEMENT_ENERGIE_INFINIE,
  energieInfinieActive,
} from "@/lib/iap/energieInfinie";
import { useLangue } from "@/lib/i18n/LangueContext";
import { DICTIONNAIRES, tr } from "@/lib/i18n/ui";
import { localeCourante } from "@/lib/i18n/locales";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { slotActif, type NumeroSlot } from "@/lib/storage/slots";
import type { GenreErreur } from "@/lib/storage/pontNatif";

/**
 * Raison d'échec localisée (SP4 i18n). GameContext exécute ses raisons dans des
 * callbacks mémoïsés, hors cycle de rendu — on lit donc la locale via
 * `localeCourante()` (SSR-safe, hors React), JAMAIS un hook dans un callback.
 * Les raisons sont des toasts transitoires, jamais persistés.
 */
function raisonLocalisee(
  cle: keyof (typeof DICTIONNAIRES)["fr"]["raisons"],
  params?: Record<string, string | number>,
): string {
  return tr(DICTIONNAIRES[localeCourante()].raisons[cle], params);
}

/** Nom de catégorie localisé dans la locale courante (pour interpolation dans les raisons). */
function categorieLocalisee(cat: Parameters<typeof libelleCategorie>[0]): string {
  return libelleCategorie(cat, DICTIONNAIRES[localeCourante()]);
}

/** Traduit le `RaisonRefus` brut d'`achat.ts` en message localisé. */
function raisonLocaliseeBazar(raison: RaisonRefus): string {
  if (raison === "jetons") return raisonLocalisee("bazarPasAssezDeJetons");
  if (raison === "stockagePlein") return raisonLocalisee("stockagePlein");
  return raisonLocalisee("bazarArticleIndisponible");
}

/**
 * État de la sauvegarde automatique. `depuis` est posé au PREMIER échec et
 * ne bouge plus tant que l'échec persiste (même si le genre change) : c'est
 * lui qui mesure le temps de jeu réellement en danger (Tâche 8, remplace le
 * toast unique `saveEnEchecRef` qui ne redonnait aucun signal après 2,5 s).
 */
export type EtatSauvegarde =
  | { enEchec: false }
  | { enEchec: true; genre: GenreErreur; depuis: number };

interface GameStateValue {
  state: GameState | null;
  isHydrated: boolean;
  etatSauvegarde: EtatSauvegarde;
}

interface GameActionsValue {
  nouvellePartie: () => void;
  ajouterObjet: (objet: Objet) => void;
  /**
   * Achat atomique : budget ET place de stockage vérifiés dans le MÊME
   * updater. Remplace le couple `ajusterBudget(-prix)` + `ajouterObjet`,
   * qui pouvait débiter sans livrer quand le stockage était plein
   * (audit 2026-08-03, H1).
   */
  acheterObjet: (objet: Objet, prix: number) => { ok: boolean; raison?: string };
  retirerObjet: (id: string) => void;
  ajusterBudget: (delta: number) => void;
  avancerJour: (nbJours?: number, volontaire?: boolean) => void;
  reset: () => void;
  /**
   * Détache l'état en mémoire sans toucher au storage — utilisé avant une
   * bascule de slot pour que l'effet d'auto-save (gardé sur state null) ne
   * puisse plus écrire. ⚠ NE PAS confondre avec `reset()` : `reset()` efface
   * aussi la clé de save active (`obtenirGameRepository().clear()`), ce qui
   * supprimerait la partie qu'on est justement en train de quitter.
   */
  detacherPartie: () => void;
  /** Fait avancer le tutoriel vers une étape donnée (idempotent si déjà atteinte/dépassée). */
  avancerTutoriel: (vers: TutorielEtape) => void;
  /** Tire et livre l'objet suivant du colis du tutoriel (null si épuisé). */
  ouvrirObjetColis: () => Objet | null;
  /** Ouvre le cadeau d'anniversaire en attente (année la plus ancienne) ; null si rien en attente. */
  ouvrirCadeauAnniversaire: () => { objet: Objet; annee: number } | null;
  /** Clôt le mini-tuto des vinyles (musique lancée). */
  terminerMiniTutoVinyle: () => void;
  terminerMiniTutoCarnet: () => void;
  terminerMiniTutoAtelier: () => void;
  /** Clôt le tutoriel (fin normale ou « Passer ») : lettre de Maman + chapitre 1. */
  terminerTutoriel: () => void;
  ouvrirVitrine: (brocanteId: string) => void;
  /** Ré-attribue le coffre courant (mode prep) à une vraie brocante, sans perdre les objets/prix/positions. */
  attribuerVitrineABrocante: (brocanteId: string) => void;
  mettreEnVitrine: (
    objetId: string,
    prixVente: number,
    posX?: number,
    posY?: number,
    rotation?: number,
  ) => void;
  retirerDeVitrine: (objetId: string) => void;
  ajusterPrixVitrine: (objetId: string, prixVente: number) => void;
  ajusterPositionVitrine: (
    objetId: string,
    posX: number,
    posY: number,
    rotation: number,
  ) => void;
  acheterCamion: (niveau: NiveauCamion) => void;
  /** Dev only — force le niveau sans coût ni adjacence. */
  setNiveauCamionDev: (niveau: NiveauCamion) => void;
  viderVitrine: () => void;
  vendreDeVitrine: (objetIds: string[], prixTotal: number) => void;
  /** Persiste le temps restant de la journée de vente (reprise après mise en arrière-plan). */
  sauverTempsVitrine: (tempsRestantSec: number) => void;
  enregistrerSession: (session: Session) => void;
  debloquerCompetence: (id: CompetenceId) => { ok: boolean; raison?: string };
  /** Consomme un usage journalier d'une compétence active. `false` si verrouillée ou quota épuisé. */
  utiliserActive: (id: ActiveId) => boolean;
  restaurerObjet: (
    objetId: string,
    etatCible: EtatObjet,
  ) => { ok: boolean; raison?: string };
  terminerRestaurationImmediate: (
    objetId: string,
  ) => { ok: boolean; raison?: string };
  demantelerObjet: (objetId: string) => {
    ok: boolean;
    raison?: string;
    pieces?: number;
  };
  /** Récupère un objet dont la restauration est terminée : applique la mutation d'état + libère le slot. */
  recupererObjetRestaure: (objetId: string) => { ok: boolean; raison?: string };
  ameliorerAtelier: () => { ok: boolean; raison?: string };
  ameliorerStockage: () => { ok: boolean; raison?: string };
  definirPrixVenteSouhaite: (objetId: string, prix: number) => void;
  gagnerXPBrocanteur: (montant: number) => void;
  marquerVuTemplate: (templateId: string) => void;
  marquerVuDansCollection: (templateId: string) => void;
  marquerDejaPossedeTemplate: (templateId: string) => void;
  donnerACollection: (objetId: string) => { ok: boolean; raison?: string };
  retirerDeCollection: (templateId: string) => { ok: boolean; raison?: string };
  /** Livre une mission : retire l'objet ciblé de l'inventaire et crédite la récompense. */
  livrerMission: (courrierId: string) => { ok: boolean; raison?: string };
  /** Accepte un chapitre de la trame principale (dialogue de délivrance du grand-père, pastille QG). */
  accepterChapitrePrincipal: (chapitreId: string) => void;
  acheterGazette: () => { ok: boolean; raison?: string };
  /** Gazette offerte par le grand-père (tuto) : marque l'édition achetée sans débit. */
  ouvrirGazetteOfferte: () => void;
  /** Fin du mini-tuto gazette (fermeture de la sheet guidée). */
  terminerTutoGazette: () => void;
  /** Refus explicite de l'édition du lundi. */
  refuserGazette: () => void;
  marquerBossDebloqueVu: () => void;
  /** Avance `niveauVu` d'UN niveau (clampé à `brocanteur.niveau`) — célébration séquentielle des level-up. */
  marquerNiveauVu: () => void;
  /** Influence (compétence Vision 3) : retire la météo du jour. */
  rerollMeteo: () => { ok: boolean; raison?: string };
  /** Influence (compétence Vision 3) : retire la brocante de la célébrité courante. */
  rerollCelebrite: () => { ok: boolean; raison?: string };
  /** Paie le droit d'entrée d'une brocante (log ledger entry + déduit budget). */
  payerFraisBrocante: (brocanteId: string, brocanteNom: string, montant: number) => void;
  /** Marque un courrier comme lu (utilisé par le QG). */
  marquerCourrierLu: (id: string) => void;
  /** Temps de confiance courant (epoch ms) ou null si pas encore synchronisé. */
  tempsConfiance: () => number | null;
  /** Retire `n` énergie (settle d'abord ; jamais < 0). */
  consommerEnergie: (n: number) => void;
  /** Crédite +ENERGIE_PAR_PUB et incrémente le compteur de pubs du jour.
   *  No-op au plafond d'énergie comme au plafond quotidien de pubs. */
  crediterEnergiePub: () => void;
  /** Réclame une boîte mystère : ajoute l'objet (si place), marque la collection et incrémente le compteur du jour. Renvoie false si le stockage est plein. */
  reclamerBoiteMystere: (objet: Objet) => boolean;
  /** Settle l'énergie contre le temps de confiance et persiste. No-op si pas de temps de confiance. */
  rafraichirEnergie: () => void;
  /**
   * Settle les quêtes périodiques ET le Bazar contre le temps de confiance.
   * Tourne déjà sur le tick 60 s / focus / visibilitychange / pageshow ; les
   * écrans qui dépendent d'un de ces deux settle pour ne pas s'ouvrir sur un
   * état vide (le Bazar à sa première visite du jour 20) l'appellent aussi
   * à leur montage plutôt que d'attendre le prochain tick.
   */
  rafraichirPeriodiques: () => void;
  /** Achète à l'étal du Bazar (lot de pièces ou objet de vitrine). */
  acheterAuBazar: (achat: AchatBazar) => { ok: boolean; raison?: string };
}

type GameContextValue = GameStateValue & GameActionsValue;

// Deux contextes séparés : l'état (change à chaque mutation) et les actions
// (objet mémoïsé une seule fois — les consommateurs d'actions seules ne
// re-rendent jamais sur mutation d'état).
// Exporté pour `BandeauSauvegarde.test.tsx` (Tâche 8), qui monte le composant
// avec un `etatSauvegarde` maîtrisé sans passer par un `GameProvider` complet.
export const GameStateContext = createContext<GameStateValue | null>(null);
const GameActionsContext = createContext<GameActionsValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToastSafe();
  // Locale courante (LangueProvider englobe GameProvider, cf. app/layout.tsx) :
  // dépendance des effets de notifs ci-dessous pour les replanifier au
  // changement de langue (Step 3.4 — pas de mécanisme dédié, on réutilise
  // le pattern d'effet déjà en place pour l'état de jeu).
  const { locale } = useLangue();
  const [state, setState] = useState<GameState | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const stateRef = useRef<GameState | null>(null);
  stateRef.current = state;
  // État partagé de la sauvegarde (Tâche 8) : consommé par `BandeauSauvegarde`
  // pour un bandeau persistant + une modale d'escalade, à la place de l'ancien
  // toast unique de 2,5 s.
  const [etatSauvegarde, setEtatSauvegarde] = useState<EtatSauvegarde>({
    enEchec: false,
  });
  // Ruling R13 : lue dans le `.then()` de `doSave` pour décider du toast de
  // rétablissement HORS de l'updater `setEtatSauvegarde` (un updater React
  // n'est pas garanti de tourner une seule fois — StrictMode le rejoue en
  // dev — donc un effet de bord dedans peut doubler le toast).
  const etatSauvegardeRef = useRef<EtatSauvegarde>({ enEchec: false });
  etatSauvegardeRef.current = etatSauvegarde;
  // Slot auquel appartient l'état en mémoire (posé à l'hydratation et à
  // `nouvellePartie`). Le repository résout le slot cible au moment de
  // l'ÉCRITURE (`slotActif()`) : si l'index a basculé entre-temps (lancement
  // d'une autre partie au titre — `detacherPartie` n'est commité par React
  // qu'après coup, alors que pagehide/le debounce peuvent tirer avant),
  // sauvegarder écraserait la partie du slot fraîchement activé avec
  // l'ancienne. Toute écriture est donc gardée sur cette appartenance.
  const slotEtatRef = useRef<NumeroSlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    obtenirGameRepository().load().then((loaded) => {
      if (cancelled) return;
      // Migration : ajoute les champs manquants + remap les anciennes catégories.
      const migrated: GameState | null = loaded
        ? migrerSauvegarde(loaded)
        : null;
      slotEtatRef.current = slotActif();
      setState(migrated);
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !state) return;
    const doSave = () => {
      // L'état n'appartient plus au slot actif (bascule de partie en cours) :
      // écrire maintenant détruirait la save du nouveau slot. On abandonne —
      // cet état est de toute façon en train d'être détaché.
      if (slotActif() !== slotEtatRef.current) return;
      obtenirGameRepository().save(state).then((res) => {
        // Ruling R13 : l'updater ci-dessous est PUR (aucun effet de bord) —
        // React ne garantit pas qu'un updater fonctionnel ne s'exécute
        // qu'une fois (StrictMode le rejoue en dev). La transition
        // échec→succès est donc lue AVANT l'appel, sur la ref toujours à
        // jour, et le toast est déclenché APRÈS, une seule fois.
        //
        // Revue (finding 2) : deux `doSave()` peuvent être en vol en même
        // temps (`flush` est abonné à la fois à `pagehide` ET à
        // `visibilitychange→hidden`, qu'iOS déclenche tous les deux à la mise
        // en arrière-plan ; une écriture native lente d'une instance d'effet
        // précédente peut aussi traîner). Si la ref n'était mise à jour qu'au
        // rendu, deux succès concurrents pourraient tous deux lire
        // `enEchec: true` avant que React n'ait commité le premier, et
        // doubler le toast. Elle est donc aussi écrite ICI, tout de suite
        // après la lecture — avant même que l'updater (pur) ne tourne.
        const etaitEnEchec = etatSauvegardeRef.current.enEchec;
        if (res.ok && etaitEnEchec) etatSauvegardeRef.current = { enEchec: false };
        setEtatSauvegarde((prec) => {
          if (res.ok) {
            return prec.enEchec ? { enEchec: false } : prec;
          }
          // `depuis` est posé au PREMIER échec et ne bouge plus : c'est lui qui
          // mesure le temps de jeu réellement en danger.
          if (prec.enEchec) {
            return prec.genre === res.genre ? prec : { ...prec, genre: res.genre };
          }
          return { enEchec: true, genre: res.genre, depuis: Date.now() };
        });
        if (res.ok && etaitEnEchec) {
          toast(raisonLocalisee("sauvegardeRetablie"), { type: "succes" });
        }
      });
    };
    // Debounce (trailing edge via cleanup) : évite un JSON.stringify de TOUT
    // l'état à chaque mutation (drag d'objet, ticks…). Le timer en attente est
    // annulé au changement d'état suivant comme à la bascule de slot
    // (detacherPartie → state null → cleanup), donc jamais d'écriture d'un
    // état périmé dans le mauvais slot.
    const timer = window.setTimeout(doSave, 400);
    // Flush immédiat au passage en arrière-plan : sur iOS l'app peut être
    // suspendue (voire tuée) avant l'échéance du debounce.
    const flush = () => {
      window.clearTimeout(timer);
      doSave();
    };
    const onVisibilite = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibilite);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilite);
      window.removeEventListener("pagehide", flush);
    };
  }, [state, isHydrated, toast]);

  const ancreRef = useRef<AncreTemps | null>(null);

  // Temps effectif courant (ancre device/réseau + horloge monotone). null
  // uniquement avant la pose de l'ancre (tout premier rendu) ; les sites d'appel
  // retombent alors sur Date.now() comme base gracieuse.
  const tempsConfiance = useCallback((): number | null => {
    if (!ancreRef.current) return null;
    return tempsConfianceCourant(
      ancreRef.current,
      performance.now(),
      Date.now(),
    );
  }, []);

  const rafraichirEnergie = useCallback(() => {
    const now = tempsConfiance();
    if (now === null) return; // ancre pas encore posée — settle au prochain tick/sync
    setState((prev) => {
      if (!prev) return prev;
      const s = settleEnergie(prev, now, ENERGIE_MAX);
      if (
        s.energie === prev.energie &&
        s.energieDerniereMaj === prev.energieDerniereMaj
      ) {
        return prev;
      }
      return { ...prev, ...s };
    });
  }, [tempsConfiance]);

  // Nommé « périodiques » (pas « quêtes » seul) depuis la tâche 5 : ce
  // callback fait aussi tourner `settleBazar` — même famille de settle en
  // temps de confiance, même absence d'invention au rendu.
  const rafraichirPeriodiques = useCallback(() => {
    const now = tempsConfiance() ?? Date.now();
    setState((prev) => (prev ? settleQuetesPeriodiques(prev, now) : prev));
    setState((prev) => (prev ? settleBazar(prev, now) : prev));
  }, [tempsConfiance]);

  const consommerEnergie = useCallback(
    (n: number) => {
      // Achat « Énergie infinie » : le débit est coupé (drapeau device, hors save).
      if (energieInfinieActive()) return;
      // Énergie AVANT consommation, lue sur stateRef (jamais dans l'updater,
      // même raison que partout ailleurs dans ce provider) : rejoue le même
      // settle que l'updater pour rester fidèle à la valeur réellement
      // débitée, sans dépendre de l'exécution de l'updater (StrictMode).
      const prevState = stateRef.current;
      let transitionVersZero = false;
      if (prevState) {
        const now = tempsConfiance() ?? Date.now();
        const energieAvant = settleEnergie(prevState, now, ENERGIE_MAX).energie;
        const energieApres = Math.max(0, energieAvant - n);
        transitionVersZero = energieAvant > 0 && energieApres === 0;
      }
      setState((prev) => {
        if (!prev) return prev;
        const now = tempsConfiance() ?? Date.now();
        const base = {
          ...prev,
          ...settleEnergie(prev, now, ENERGIE_MAX),
        };
        return { ...base, energie: Math.max(0, base.energie - n) };
      });
      // Le moment qui déclenche à la fois la pub et l'IAP : mesuré une fois,
      // à la transition vers 0, jamais tant que l'énergie y reste.
      if (transitionVersZero) logEvenement(EVENEMENTS.energieEpuisee);
    },
    [tempsConfiance],
  );

  const crediterEnergiePub = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const now = tempsConfiance() ?? Date.now();
      // Plafond quotidien : l'UI bloque avant la pub, ceci couvre la course.
      if (pubsEnergieRestantes(prev.pubsEnergie, now) <= 0) return prev;
      const max = ENERGIE_MAX;
      const settled = settleEnergie(prev, now, max);
      return {
        ...prev,
        ...settled,
        energie: Math.min(max, settled.energie + ENERGIE_PAR_PUB),
        pubsEnergie: enregistrerPubEnergie(prev.pubsEnergie, now),
      };
    });
  }, [tempsConfiance]);

  const reclamerBoiteMystere = useCallback((objet: Objet): boolean => {
    const current = stateRef.current;
    // Filet : ne jamais ajouter en silence si le stockage est plein
    // (l'UI bloque déjà avant la pub ; ceci couvre la course).
    if (!current || stockageEstPlein(current)) return false;
    setState((prev) => {
      if (!prev) return prev;
      if (stockageEstPlein(prev)) return prev;
      const next = appliquerReclamation(prev, objet);
      // Cohérence Collection : marque vu + déjà possédé, comme l'achat normal.
      let collection = marquerVuFn(next.collection, objet.templateId);
      collection = marquerDejaPossedeFn(collection, objet.templateId);
      return { ...next, collection };
    });
    return true;
  }, []);

  // Temps effectif & recharge — dégradation gracieuse :
  // 1) Base immédiate sur l'horloge du device, ancrée à `performance.now()` ET
  //    à `Date.now()` → l'énergie se recharge TOUJOURS, même hors-ligne. Le gel
  //    de `performance.now()` pendant la veille profonde iOS est absorbé par
  //    `tempsConfianceCourant` (max des deux deltas) : plus besoin d'attendre un
  //    événement de reprise pour que l'horloge reparte juste.
  // 2) Quand le temps de confiance réseau répond, on REPOSE l'ancre dessus →
  //    corrige le décalage et neutralise une avance d'horloge faite avant le lancement.
  useEffect(() => {
    if (!isHydrated) return;
    let actif = true;
    if (!ancreRef.current) {
      ancreRef.current = poserAncre(Date.now(), performance.now(), Date.now());
    }
    const sync = async () => {
      const t = await getTimeSource().maintenant();
      if (!actif) return;
      if (t !== null) {
        // Temps de confiance obtenu : corrige l'ancre (deltas remis à zéro).
        ancreRef.current = poserAncre(t, performance.now(), Date.now());
      }
      // Hors-ligne / timeapi muet : rien à faire, l'extrapolation suit déjà
      // l'horloge murale quand le monotone est en retard (veille).
      rafraichirEnergie();
      rafraichirPeriodiques();
    };
    sync();
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    // Filet iOS : au réveil, `visibilitychange → visible` n'est pas garanti
    // (même raison que pour le rappel de retour, plus bas).
    window.addEventListener("pageshow", onFocus);
    const syncTimer = window.setInterval(sync, 10 * 60 * 1000); // re-sync /10 min
    const tickTimer = window.setInterval(() => {
      rafraichirEnergie();
      rafraichirPeriodiques();
    }, 60 * 1000); // settle /60 s
    return () => {
      actif = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("pageshow", onFocus);
      window.clearInterval(syncTimer);
      window.clearInterval(tickTimer);
    };
  }, [isHydrated, rafraichirEnergie, rafraichirPeriodiques]);

  // Achat « Énergie infinie » : toute partie (même une vieille save à jauge
  // basse chargée après l'achat) est calée à ENERGIE_MAX — les portes
  // « energie >= coût » passent immédiatement, et comme le débit est coupé la
  // jauge n'en redescend plus. Déclenché au chargement ET à l'achat (événement).
  const estChargee = state !== null;
  useEffect(() => {
    const remplir = () => {
      if (!energieInfinieActive()) return;
      setState((prev) => {
        if (!prev || prev.energie >= ENERGIE_MAX) return prev;
        const now = tempsConfiance() ?? Date.now();
        return { ...prev, energie: ENERGIE_MAX, energieDerniereMaj: now };
      });
    };
    remplir();
    window.addEventListener(EVENEMENT_ENERGIE_INFINIE, remplir);
    return () => window.removeEventListener(EVENEMENT_ENERGIE_INFINIE, remplir);
  }, [estChargee, tempsConfiance]);

  // Notification « énergie pleine » : (re)planifie une notif système à l'instant
  // où l'énergie atteindra 5/5, et l'annule quand elle est pleine. La permission
  // est demandée la 1ʳᵉ fois que l'énergie passe sous le max (= 1ʳᵉ consommation).
  // Tout est no-op hors Tauri.
  const energie = state?.energie;
  const energieDerniereMaj = state?.energieDerniereMaj;
  const niveauBrocanteur = state?.brocanteur.niveau;
  // `locale` par ref : la langue est capturée À L'ENVOI, sans que changer de
  // langue ait besoin de relancer la synchro.
  const localeRef = useRef(locale);
  localeRef.current = locale;

  // Source unique de vérité pour l'échéance. Repart TOUJOURS de `stateRef`
  // (l'état le plus frais) plutôt que d'un instantané figé dans une closure, et
  // décide « pleine ou pas » APRÈS settle — `state.energie` peut avoir jusqu'à
  // une minute de retard (le settle périodique tourne toutes les 60 s).
  const synchroniserNotifEnergie = useCallback(async () => {
    const courant = stateRef.current;
    if (!courant || !notificationsDisponibles()) return;
    const reste = secondesAvantPlein(
      courant,
      tempsConfiance() ?? Date.now(),
      ENERGIE_MAX,
    );
    if (reste === null) {
      await annulerPleinEnergie();
      return;
    }
    if (!(await assurerPermission())) return;
    // `reste` est un DÉLAI (calculé en temps de confiance) qu'on repose sur
    // l'horloge murale : c'est elle que le planificateur de l'OS utilise.
    await planifierPleinEnergie(Date.now() + reste * 1000, localeRef.current);
  }, [tempsConfiance]);

  // Notif « Objet restauré » : une notif par objet en restauration, à son
  // échéance. Repart TOUJOURS de `stateRef` (l'état le plus frais).
  const synchroniserNotifsRestau = useCallback(() => {
    // `finMs` est en TEMPS DE CONFIANCE, mais le planificateur OS programme sur
    // l'HORLOGE MURALE. On convertit chaque échéance en horloge murale (comme la
    // notif énergie), sinon la notif tomberait au mauvais moment réel si l'horloge
    // de l'appareil dérive du temps réseau (y compris une triche d'horloge).
    const ecart = (tempsConfiance() ?? Date.now()) - Date.now(); // confiance - mural
    const objets = (stateRef.current?.inventaireJoueur ?? [])
      .filter((o) => o.enRestauration)
      .map((o) => ({
        templateId: o.templateId,
        nom: o.nom,
        finMs: o.enRestauration!.finMs - ecart,
      }));
    void synchroniserNotifsRestauration(objets, Date.now(), localeRef.current);
  }, [tempsConfiance]);

  useEffect(() => {
    if (!isHydrated || energie === undefined) return;
    void synchroniserNotifEnergie();
    // energie/energieDerniereMaj/niveauBrocanteur/locale : déclencheurs. La
    // valeur lue est celle de `stateRef` au moment de l'exécution.
  }, [
    isHydrated,
    energie,
    energieDerniereMaj,
    niveauBrocanteur,
    locale,
    synchroniserNotifEnergie,
  ]);

  // Dernière chance avant que l'OS ne gèle la webview : les échéances qui vont
  // réellement sonner sont celles posées ici — énergie ET restauration. Pour
  // l'énergie : une dépense juste avant la sortie laissait en place l'échéance
  // précédente — trop tôt — si sa reprogrammation (asynchrone) n'avait pas eu
  // le temps d'aboutir. Pour la restauration : l'écart confiance/mural capturé
  // à la programmation initiale se périme à chaque repose de l'ancre de temps
  // (sync réseau au lancement/focus/10 min) — sans recalage ici, la notif
  // sonnait avec l'avance de la correction d'horloge alors que l'app affichait
  // encore du temps restant.
  useEffect(() => {
    if (!isHydrated) return;
    const surSortie = () => {
      void synchroniserNotifEnergie();
      synchroniserNotifsRestau();
    };
    const surVisibilite = () => {
      if (document.visibilityState === "hidden") surSortie();
    };
    document.addEventListener("visibilitychange", surVisibilite);
    window.addEventListener("pagehide", surSortie);
    return () => {
      document.removeEventListener("visibilitychange", surVisibilite);
      window.removeEventListener("pagehide", surSortie);
    };
  }, [isHydrated, synchroniserNotifEnergie, synchroniserNotifsRestau]);

  // Rappel de retour : programme la série J+1/J+3/J+7 quand l'app passe en
  // arrière-plan, l'annule à la réouverture. No-op hors Tauri ou si la
  // permission n'est pas déjà accordée (jamais de prompt à la sortie).
  useEffect(() => {
    if (!isHydrated) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void programmerRappelRetour(Date.now(), locale);
      } else {
        void annulerRappelRetour();
      }
    };
    // pagehide/pageshow : filet pour iOS, où `visibilitychange → visible`
    // n'est pas garanti au réveil depuis le bfcache. pageshow ré-annule au
    // retour pour rester symétrique avec pagehide.
    const onPageHide = () => void programmerRappelRetour(Date.now(), locale);
    const onPageShow = () => void annulerRappelRetour();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
    // `locale` en dépendance : recrée les handlers avec la langue courante
    // en closure, pour que la prochaine programmation (au passage en arrière-
    // plan) parte toujours de la langue actuelle. Les rappels déjà programmés
    // dans l'ancienne langue restent inchangés jusqu'à leur annulation
    // naturelle (retour au premier plan) — dégradation douce acceptable.
  }, [isHydrated, locale]);

  // Notif « Objet restauré » : (re)programme à chaque changement de l'ensemble
  // (et de langue — textes localisés au scheduling). No-op hors Tauri / sans
  // permission. Clé de dépendance = ids+finMs sérialisés (relance sur changement).
  const restauKey = (state?.inventaireJoueur ?? [])
    .filter((o) => o.enRestauration)
    .map((o) => `${o.id}:${o.enRestauration!.finMs}`)
    .join("|");
  useEffect(() => {
    if (!isHydrated) return;
    synchroniserNotifsRestau();
  }, [isHydrated, restauKey, locale, synchroniserNotifsRestau]);

  // Notifs « Nouvelles quêtes » (8h, décalées du reset minuit) + rappel du soir
  // (19h) si le lot du jour/de la semaine a encore une mission active. Relancée
  // sur changement de lot (nouveau cycle) ou de statut (livraison → annule le
  // rappel devenu inutile). Échéances en horloge murale (periode.ts).
  const quetesCles = `${state?.quetesPeriodiques.quotidien.cle ?? ""}|${state?.quetesPeriodiques.hebdo.cle ?? ""}`;
  const quotidienIds = new Set(state?.quetesPeriodiques.quotidien.courrierIds ?? []);
  const hebdoIds = new Set(state?.quetesPeriodiques.hebdo.courrierIds ?? []);
  const quotidienNonTerminee = (state?.missions ?? []).some(
    (m) => quotidienIds.has(m.courrierId) && m.statut === "active",
  );
  const hebdoNonTerminee = (state?.missions ?? []).some(
    (m) => hebdoIds.has(m.courrierId) && m.statut === "active",
  );
  useEffect(() => {
    if (!isHydrated) return;
    void synchroniserNotifsQuetes(
      Date.now(),
      { quotidienNonTerminee, hebdoNonTerminee },
      locale,
    );
  }, [isHydrated, quetesCles, quotidienNonTerminee, hebdoNonTerminee, locale]);

  // La montée de niveau se lit sur la transition d'état, pas sur la source
  // d'XP : il y a plusieurs sources (achat, vente, restauration, quêtes,
  // découverte de collection…) et gagnerXPBrocanteur ne doit pas porter seul
  // l'émission — un seul endroit ici, quelle que soit la source.
  const niveauPrecedentRef = useRef<number | null>(null);
  useEffect(() => {
    const niveau = state?.brocanteur?.niveau;
    if (typeof niveau !== "number") return;
    const precedent = niveauPrecedentRef.current;
    niveauPrecedentRef.current = niveau;
    // Premier rendu (ou chargement d'une save) : on mémorise sans émettre —
    // sinon charger une partie au niveau 12 se lirait comme une montée.
    if (precedent === null) return;
    if (niveau > precedent) logEvenement(EVENEMENTS.niveauAtteint, { niveau });
  }, [state?.brocanteur?.niveau]);

  const nouvellePartie = useCallback(() => {
    const initial: GameState = {
      version: SAVE_VERSION,
      budget: INITIAL_BUDGET,
      jourActuel: INITIAL_JOUR,
      // Le stock initial arrive via le colis du tutoriel (étape ouvrir-colis)
      // ou d'un coup au « Passer le tutoriel » — plus à la création (v14).
      inventaireJoueur: [],
      colisTutorielLivres: 0,
      vitrine: null,
      historique: [],
      ventesParCategorie: {},
      tendances: genererTendances(),
      prochainesTendances: genererTendances(),
      prochainRafraichissementTendances: prochainLundi(INITIAL_JOUR + 1),
      competencesDebloquees: [],
      brocanteur: emptyBrocanteur(),
      collection: initCollection(),
      gazetteAchetee: false,
      tutoGazette: "aFaire",
      gazetteRefusee: false,
      bossDebloqueSeen: false,
      niveauVu: 0,
      meteoSemaine: tirerMeteoSemaine(),
      celebriteActuelle: tirerCelebrite(),
      influenceUtilisee: false,
      courriers: [],
      niveauAtelier: 0,
      niveauStockage: 1,
      niveauCamion: 1,
      piecesAmelioration: emptyPiecesAmelioration(),
      jetons: 0,
      chatSurFauteuil: false,
      passagesSansChat: 0,
      declencheursDeclenches: [],
      grandLivre: [],
      missions: [],
      quetesPeriodiques: {
        quotidien: { cle: "", courrierIds: [] },
        hebdo: { cle: "", courrierIds: [] },
      },
      energie: ENERGIE_MAX,
      energieDerniereMaj: Date.now(),
      tutorielEtape: "accueil",
    };
    // La partie fraîche appartient au slot actif du moment (l'écran titre a
    // déjà basculé l'index avant d'appeler `nouvellePartie`).
    slotEtatRef.current = slotActif();
    setState(initial);
    router.push("/bureau");
  }, [router]);

  const ajouterObjet = useCallback((objet: Objet) => {
    setState((prev) => {
      if (!prev) return prev;
      if (stockageEstPlein(prev)) return prev;
      return { ...prev, inventaireJoueur: [...prev.inventaireJoueur, objet] };
    });
  }, []);

  // Pré-check sur stateRef.current puis re-check dans l'updater (même
  // discipline que debloquerCompetence) : le retour ne promet que ce que
  // l'updater re-vérifie — jamais de débit sans ajout, ni l'inverse.
  const acheterObjet = useCallback(
    (objet: Objet, prix: number): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
      if (current.budget < prix)
        return {
          ok: false,
          raison: raisonLocalisee("ilManqueEuros", { n: prix - current.budget }),
        };
      if (stockageEstPlein(current))
        return { ok: false, raison: raisonLocalisee("stockagePlein") };
      setState((prev) => {
        if (!prev) return prev;
        if (prev.budget < prix || stockageEstPlein(prev)) return prev;
        return {
          ...prev,
          budget: prev.budget - prix,
          inventaireJoueur: [...prev.inventaireJoueur, objet],
        };
      });
      return { ok: true };
    },
    [],
  );

  const retirerObjet = useCallback((id: string) => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            inventaireJoueur: prev.inventaireJoueur.filter((o) => o.id !== id),
          }
        : prev,
    );
  }, []);

  const ajusterBudget = useCallback((delta: number) => {
    setState((prev) => (prev ? { ...prev, budget: prev.budget + delta } : prev));
  }, []);

  const avancerJour = useCallback((nbJours: number = 1, volontaire: boolean = false) => {
    // Jour AVANT l'avancement, lu sur stateRef (jamais dans l'updater, même
    // raison que partout ailleurs dans ce provider) : `jourActuel` est
    // strictement croissant en partie, donc "nouveau record" se lit comme une
    // simple comparaison. `avancerJour(3)` est un saut, pas trois journées
    // vécues : un seul événement, sur le jour d'arrivée.
    const jourAvant = stateRef.current?.jourActuel;
    setState((prev) => {
      if (!prev) return prev;
      const pas = Math.max(1, nbJours);
      const nouveauJour = prev.jourActuel + pas;
      const refresh = nouveauJour >= prev.prochainRafraichissementTendances;
      // Chat : 50% de chance de partir par jour si présent.
      let chatSurFauteuil = prev.chatSurFauteuil;
      let passagesSansChat = prev.passagesSansChat;
      for (let i = 0; i < pas; i++) {
        if (chatSurFauteuil && Math.random() < 0.5) chatSurFauteuil = false;
      }
      // Apparition uniquement à la suite d'un passage volontaire.
      // Pity timer : après 3 passages consécutifs sans chat, apparition garantie.
      if (volontaire && !chatSurFauteuil) {
        const proba = passagesSansChat >= 3 ? 1 : 0.5;
        if (Math.random() < proba) {
          chatSurFauteuil = true;
          passagesSansChat = 0;
        } else {
          passagesSansChat = Math.min(3, passagesSansChat + 1);
        }
      }
      // La restauration ne se termine plus automatiquement au passage du jour :
      // l'objet reste `enRestauration` jusqu'au clic explicite "Récupérer"
      // (page /atelier). cf. lib/atelier.appliquerRecuperation.
      const inv = prev.inventaireJoueur;
      // Au refresh, les prochaines deviennent les courantes et on régénère un nouveau futur.
      const tendances = refresh
        ? (prev.prochainesTendances && prev.prochainesTendances.length > 0
            ? prev.prochainesTendances
            : genererTendances())
        : prev.tendances;
      const prochainesTendances = refresh
        ? genererTendances()
        : prev.prochainesTendances;
      const base: GameState = {
        ...prev,
        jourActuel: nouveauJour,
        inventaireJoueur: inv,
        tendances,
        prochainesTendances,
        prochainRafraichissementTendances: refresh
          ? prochainLundi(nouveauJour + 1)
          : prev.prochainRafraichissementTendances,
        gazetteAchetee: refresh ? false : prev.gazetteAchetee,
        gazetteRefusee: refresh ? false : (prev.gazetteRefusee ?? false),
        meteoSemaine: refresh ? tirerMeteoSemaine() : prev.meteoSemaine,
        celebriteActuelle: refresh ? tirerCelebrite() : prev.celebriteActuelle,
        influenceUtilisee: refresh ? false : prev.influenceUtilisee,
        chatSurFauteuil,
        passagesSansChat,
      };

      // Tick d'expiration des missions actives à échéance.
      const missionsApresExpiration = expireMissions(
        prev.missions,
        prev.courriers,
        nouveauJour,
      );
      const baseAvecMissions: GameState = { ...base, missions: missionsApresExpiration };

      // Tick des quêtes : injecte les cartes postales de l'épilogue (une tous
      // les 6 jours après la livraison de trame_ch12). La trame elle-même est
      // délivrée en dialogue via accepterChapitre ; les commandes quotidiennes/
      // hebdomadaires restent gérées en temps réel via le settle.
      const tick = tickQuetes(baseAvecMissions, nouveauJour);
      const baseAvecQuetes: GameState = {
        ...baseAvecMissions,
        courriers: tick.courriers,
        missions: tick.missions,
      };

      return baseAvecQuetes;
    });
    if (typeof jourAvant === "number") {
      const pas = Math.max(1, nbJours);
      const nouveauJour = jourAvant + pas;
      // `pas` vaut au moins 1, donc cette comparaison est TOUJOURS vraie : ce
      // n'est pas elle qui garantit « nouveau record seulement », c'est le
      // garde `typeof jourAvant === "number"` ci-dessus conjugué à la
      // stricte croissance de `jourActuel` en partie (cf. commentaire plus
      // haut). Gardée quand même comme filet d'assertion, pas comme
      // mécanisme.
      if (nouveauJour > jourAvant) logEvenement(EVENEMENTS.jourAtteint, { jour: nouveauJour });
    }
  }, []);

  const rerollMeteo = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
    if (!aGenInfluence(current))
      return { ok: false, raison: raisonLocalisee("influenceRequise") };
    if (current.influenceUtilisee)
      return { ok: false, raison: raisonLocalisee("influenceUtilisee") };
    setState((prev) => {
      if (!prev) return prev;
      const idx = indexJourSemaine(prev.jourActuel);
      const nouvelle = [...prev.meteoSemaine];
      nouvelle[idx] = tirerMeteo();
      return { ...prev, meteoSemaine: nouvelle, influenceUtilisee: true };
    });
    return { ok: true };
  }, []);

  const rerollCelebrite = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
    if (!aGenInfluence(current))
      return { ok: false, raison: raisonLocalisee("influenceRequise") };
    if (current.influenceUtilisee)
      return { ok: false, raison: raisonLocalisee("influenceUtilisee") };
    setState((prev) =>
      prev
        ? { ...prev, celebriteActuelle: tirerCelebrite(), influenceUtilisee: true }
        : prev,
    );
    return { ok: true };
  }, []);

  const ameliorerAtelier = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
    const upgrade = getProchaineUpgrade(current.niveauAtelier);
    if (!upgrade) return { ok: false, raison: raisonLocalisee("atelierMax") };
    if (current.budget < upgrade.cout)
      return {
        ok: false,
        raison: raisonLocalisee("ilManqueEuros", { n: upgrade.cout - current.budget }),
      };
    setState((prev) => {
      if (!prev) return prev;
      const next = appendLedger(prev, {
        jour: prev.jourActuel,
        kind: "upgrade_atelier",
        designation: `Atelier N${upgrade.niveauCible}`,
        recette: 0,
        depense: upgrade.cout,
        params: { niveau: upgrade.niveauCible },
      });
      return { ...next, niveauAtelier: upgrade.niveauCible };
    });
    logEvenement(EVENEMENTS.ameliorationAchetee, {
      quoi: "atelier",
      niveau: upgrade.niveauCible,
    });
    return { ok: true };
  }, []);

  const ameliorerStockage = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
    const upgrade = getProchaineUpgradeStockage(current.niveauStockage);
    if (!upgrade) return { ok: false, raison: raisonLocalisee("stockageMax") };
    if (current.budget < upgrade.cout)
      return {
        ok: false,
        raison: raisonLocalisee("ilManqueEuros", { n: upgrade.cout - current.budget }),
      };
    setState((prev) => {
      if (!prev) return prev;
      const next = appendLedger(prev, {
        jour: prev.jourActuel,
        kind: "upgrade_stockage",
        designation: `Stockage N${upgrade.niveauCible}`,
        recette: 0,
        depense: upgrade.cout,
        params: { niveau: upgrade.niveauCible },
      });
      return { ...next, niveauStockage: upgrade.niveauCible };
    });
    logEvenement(EVENEMENTS.ameliorationAchetee, {
      quoi: "stockage",
      niveau: upgrade.niveauCible,
    });
    return { ok: true };
  }, []);

  const acheterAuBazar = useCallback(
    (achat: AchatBazar): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
      const now = tempsConfiance() ?? Date.now();
      // Pré-check sur stateRef.current pour un refus immédiat, informatif,
      // sans toucher setState — MAIS même discipline que `acheterObjet` juste
      // au-dessus : le retour ne promet que ce que l'updater re-vérifie sur
      // `prev`, pas sur cet instantané potentiellement périmé (le settle
      // d'énergie, celui des quêtes et la rotation du Bazar tournent tous
      // dans ce même contexte toutes les 60 s).
      const precheck =
        achat.type === "pieces"
          ? acheterLotPieces(current, achat.index)
          : acheterArticle(current, achat.index, now);
      if (!precheck.ok) {
        // Localiser comme le font les actions voisines : jamais de clé brute
        // remontée à l'UI.
        return { ok: false, raison: raisonLocaliseeBazar(precheck.raison) };
      }
      setState((prev) => {
        if (!prev) return prev;
        const r =
          achat.type === "pieces"
            ? acheterLotPieces(prev, achat.index)
            : acheterArticle(prev, achat.index, now);
        return r.ok ? r.state : prev;
      });
      return { ok: true };
    },
    [tempsConfiance],
  );

  const definirPrixVenteSouhaite = useCallback(
    (objetId: string, prix: number) => {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          inventaireJoueur: prev.inventaireJoueur.map((o) => {
            if (o.id !== objetId) return o;
            if (prix <= 0) {
              const { prixVenteSouhaite, ...rest } = o;
              void prixVenteSouhaite;
              return rest;
            }
            return { ...o, prixVenteSouhaite: prix };
          }),
        };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    // Appartenance détachée SYNCHRONE : setState(null) n'est que programmé,
    // et le pagehide d'un reload immédiat peut tirer avant le commit — sans
    // ça, le flush réécrirait la save qu'on vient de supprimer (résurrection,
    // slotActif() inchangé donc la garde d'appartenance seule ne voit rien).
    slotEtatRef.current = null;
    setState(null);
    obtenirGameRepository().clear();
    // Ruling R14 : sans ça, une alerte d'échec restait affichée sur une
    // partie tout juste réinitialisée qui n'a encore rien tenté de
    // sauvegarder — une fausse alerte, exactement ce que le bandeau
    // persistant ne doit jamais être. Si le disque est réellement toujours
    // en panne, le prochain échec (dans les 400 ms du debounce) la relève.
    setEtatSauvegarde({ enEchec: false });
  }, []);

  // Détache l'état en mémoire sans toucher au storage — utilisé avant une
  // bascule de slot pour que l'effet d'auto-save (gardé sur state null) ne
  // puisse plus écrire. L'appartenance est coupée synchronement (même raison
  // que dans `reset` : les listeners du flush survivent jusqu'au commit).
  const detacherPartie = useCallback(() => {
    slotEtatRef.current = null;
    setState(null);
  }, []);

  /** Fait avancer le tutoriel vers une étape donnée (idempotent si déjà atteinte/dépassée). */
  const avancerTutoriel = useCallback((vers: TutorielEtape) => {
    // "termine" ne doit jamais être atteint via avancerTutoriel : ça
    // court-circuiterait appliquerFinTutoriel (perte silencieuse de la
    // lettre de Maman + du chapitre 1). Passer par terminerTutoriel().
    if (vers === "termine") return;
    // Décidé AVANT le setState, via stateRef (lu, jamais dans l'updater — cf.
    // ouvrirObjetColis/ouvrirCadeauAnniversaire) : un updater React n'est pas
    // synchrone (il tourne au rendu), donc un drapeau posé dedans et relu
    // juste après le setState mentirait. Sans ce calcul, un double appel
    // (double tap, call site qui ne re-vérifie pas l'état, cf. les pages
    // collection/stockage/bibliothèque) émettrait un `tuto_etape` fantôme
    // sans transition réelle — l'entonnoir n'a de valeur que si chaque
    // événement correspond à un vrai franchissement d'étape.
    const current = stateRef.current;
    const iCourante = current ? ETAPES_TUTORIEL.indexOf(current.tutorielEtape) : -1;
    const iCible = ETAPES_TUTORIEL.indexOf(vers);
    const transitionReelle =
      !!current && current.tutorielEtape !== "termine" && iCible > iCourante;
    setState((prev) => {
      if (!prev || prev.tutorielEtape === "termine") return prev;
      const iC = ETAPES_TUTORIEL.indexOf(prev.tutorielEtape);
      if (iCible <= iC) return prev;
      return { ...prev, tutorielEtape: vers };
    });
    if (transitionReelle) logEvenement(EVENEMENTS.tutoEtape, { etape: vers });
  }, []);

  /** Clôt le tutoriel (fin normale ou « Passer ») : lettre de Maman + chapitre 1. */
  /**
   * Tire l'objet suivant du colis du tutoriel, l'ajoute à l'inventaire et
   * retourne l'objet (pour la cérémonie d'ouverture). null si le colis est
   * vide (5 objets déjà livrés) ou sans partie.
   */
  const ouvrirObjetColis = useCallback((): Objet | null => {
    const current = stateRef.current;
    if (!current) return null;
    const livres = current.colisTutorielLivres ?? 0;
    if (livres >= COLIS_TUTORIEL_TAILLE) return null;
    const objet = objetColisTutoriel(
      livres,
      current.inventaireJoueur.map((o) => o.templateId),
    );
    setState((prev) => {
      if (!prev) return prev;
      const l = prev.colisTutorielLivres ?? 0;
      if (l >= COLIS_TUTORIEL_TAILLE) return prev;
      return {
        ...prev,
        inventaireJoueur: [...prev.inventaireJoueur, objet],
        colisTutorielLivres: l + 1,
      };
    });
    return objet;
  }, []);

  /**
   * Ouvre le cadeau d'anniversaire en attente (le plus ancien) : ajoute le
   * vinyle de l'année au stockage, pose le déclencheur de l'année, et lance
   * le mini-tuto des vinyles UNIQUEMENT l'année 1. Null si rien en attente.
   */
  const ouvrirCadeauAnniversaire = useCallback((): { objet: Objet; annee: number } | null => {
    const current = stateRef.current;
    if (!current) return null;
    const annee = cadeauEnAttente(current);
    if (annee === null) return null;
    const objet = objetCadeauAnniversaire(annee, current);
    setState((prev) => {
      if (!prev || cadeauEnAttente(prev) !== annee) return prev;
      return {
        ...prev,
        inventaireJoueur: [...prev.inventaireJoueur, objet],
        declencheursDeclenches: [
          ...prev.declencheursDeclenches,
          idDeclencheurCadeau(annee),
        ],
        ...(annee === 1 ? { miniTutoVinyle: "ajouter" as const } : {}),
      };
    });
    return { objet, annee };
  }, []);

  /** Clôt le mini-tuto des vinyles (la musique a été lancée). */
  const terminerMiniTutoVinyle = useCallback(() => {
    // Décidé avant le setState (même raison que dans avancerTutoriel juste
    // au-dessus) : sans ça, un rappel de `terminerMiniTutoVinyle` sur un
    // mini-tuto déjà clos émettrait un `mini_tuto_termine` fantôme.
    const transitionReelle = stateRef.current?.miniTutoVinyle === "ecouter";
    setState((prev) =>
      prev && prev.miniTutoVinyle === "ecouter"
        ? { ...prev, miniTutoVinyle: "termine" as const }
        : prev,
    );
    if (transitionReelle) logEvenement(EVENEMENTS.miniTutoTermine, { lequel: "vinyle" });
  }, []);

  /** Clôt la visite guidée de l'Atelier (les trois bulles sont passées). */
  const terminerMiniTutoAtelier = useCallback(() => {
    setState((prev) =>
      prev && prev.miniTutoAtelier === "visite"
        ? { ...prev, miniTutoAtelier: "termine" as const }
        : prev,
    );
  }, []);

  /** Clôt le mini-tuto du carnet de commandes (le registre a été ouvert). */
  const terminerMiniTutoCarnet = useCallback(() => {
    const transitionReelle = stateRef.current?.miniTutoCarnet === "ouvrir";
    setState((prev) =>
      prev && prev.miniTutoCarnet === "ouvrir"
        ? { ...prev, miniTutoCarnet: "termine" as const }
        : prev,
    );
    if (transitionReelle) logEvenement(EVENEMENTS.miniTutoTermine, { lequel: "carnet" });
  }, []);

  const terminerTutoriel = useCallback(() => {
    const transitionReelle = !!stateRef.current && stateRef.current.tutorielEtape !== "termine";
    setState((prev) => (prev ? appliquerFinTutoriel(prev) : prev));
    if (transitionReelle) logEvenement(EVENEMENTS.tutoTermine);
  }, []);

  const attribuerVitrineABrocante = useCallback((brocanteId: string) => {
    setState((prev) => {
      if (!prev || !prev.vitrine) return prev;
      // No-op si déjà sur la bonne brocante.
      if (prev.vitrine.brocanteId === brocanteId) return prev;
      return {
        ...prev,
        vitrine: { ...prev.vitrine, brocanteId },
      };
    });
  }, []);

  const ouvrirVitrine = useCallback((brocanteId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      // Si une autre vitrine est déjà ouverte avec des objets, on remet ses objets en stock.
      if (prev.vitrine && prev.vitrine.brocanteId !== brocanteId) {
        return {
          ...prev,
          inventaireJoueur: [
            ...prev.inventaireJoueur,
            ...prev.vitrine.objets.map((e) => e.objet),
          ],
          vitrine: { brocanteId, objets: [] },
        };
      }
      // Vitrine déjà ouverte sur la bonne brocante : no-op.
      if (prev.vitrine?.brocanteId === brocanteId) return prev;
      // Aucune vitrine : on ouvre.
      return { ...prev, vitrine: { brocanteId, objets: [] } };
    });
  }, []);

  const mettreEnVitrine = useCallback(
    (
      objetId: string,
      prixVente: number,
      posX?: number,
      posY?: number,
      rotation?: number,
    ) => {
      setState((prev) => {
        if (!prev || !prev.vitrine) return prev;
        const objet = prev.inventaireJoueur.find((o) => o.id === objetId);
        if (!objet) return prev;
        // Dernier filet sur les pièces uniques : elles ne réapparaissent
        // jamais en chinage une fois possédées, donc les vendre serait une
        // perte définitive. Les écrans les écartent déjà du coffre
        // (`stockChargeable`) ; ce goulot garantit qu'aucun chemin d'appel
        // non prévu ne peut en faire fuir une.
        if (!estVendable(objet)) return prev;
        const nouvelEntree: ObjetEnVitrine = {
          objet,
          prixVente,
          ...(posX !== undefined ? { posX } : {}),
          ...(posY !== undefined ? { posY } : {}),
          ...(rotation !== undefined ? { rotation } : {}),
        };
        return {
          ...prev,
          inventaireJoueur: prev.inventaireJoueur.filter(
            (o) => o.id !== objetId,
          ),
          vitrine: {
            ...prev.vitrine,
            objets: [...prev.vitrine.objets, nouvelEntree],
          },
        };
      });
    },
    [],
  );

  const ajusterPositionVitrine = useCallback(
    (
      objetId: string,
      posX: number,
      posY: number,
      rotation: number,
    ) => {
      setState((prev) =>
        prev && prev.vitrine
          ? {
              ...prev,
              vitrine: {
                ...prev.vitrine,
                objets: prev.vitrine.objets.map((e) =>
                  e.objet.id === objetId ? { ...e, posX, posY, rotation } : e,
                ),
              },
            }
          : prev,
      );
    },
    [],
  );

  const acheterCamion = useCallback((niveau: NiveauCamion) => {
    // Même discipline que les autres achats : la transition réelle se décide
    // AVANT le setState, sur stateRef (jamais dans l'updater), en rejouant
    // exactement les mêmes gardes (adjacence + budget) que l'updater
    // ci-dessous — sinon un rappel no-op (niveau déjà atteint, fonds
    // insuffisants) émettrait quand même un achat qui n'a pas eu lieu.
    const current = stateRef.current;
    const camion = getCamion(niveau);
    const prix = camion.prixUpgradeVersCeNiveau ?? 0;
    const transitionReelle =
      !!current && niveau === current.niveauCamion + 1 && current.budget >= prix;
    setState((prev) => {
      if (!prev) return prev;
      if (niveau !== prev.niveauCamion + 1) return prev;
      if (prev.budget < prix) return prev;
      const next = appendLedger(prev, {
        jour: prev.jourActuel,
        kind: "upgrade_camion",
        designation: `Camion N${niveau}`,
        recette: 0,
        depense: prix,
        params: { niveau },
      });
      return { ...next, niveauCamion: niveau };
    });
    if (transitionReelle) {
      logEvenement(EVENEMENTS.ameliorationAchetee, { quoi: "camion", niveau });
    }
  }, []);

  // Dev-only : set direct du niveau sans coût ni vérification d'adjacence.
  // Utilisé par le DevPanel du coffre (dev uniquement) pour tester les visuels.
  const setNiveauCamionDev = useCallback((niveau: NiveauCamion) => {
    setState((prev) => (prev ? { ...prev, niveauCamion: niveau } : prev));
  }, []);

  const retirerDeVitrine = useCallback((objetId: string) => {
    setState((prev) => {
      if (!prev || !prev.vitrine) return prev;
      const entree = prev.vitrine.objets.find((e) => e.objet.id === objetId);
      if (!entree) return prev;
      return {
        ...prev,
        vitrine: {
          ...prev.vitrine,
          objets: prev.vitrine.objets.filter((e) => e.objet.id !== objetId),
        },
        inventaireJoueur: [...prev.inventaireJoueur, entree.objet],
      };
    });
  }, []);

  const ajusterPrixVitrine = useCallback(
    (objetId: string, prixVente: number) => {
      setState((prev) =>
        prev && prev.vitrine
          ? {
              ...prev,
              vitrine: {
                ...prev.vitrine,
                objets: prev.vitrine.objets.map((e) =>
                  e.objet.id === objetId ? { ...e, prixVente } : e,
                ),
              },
            }
          : prev,
      );
    },
    [],
  );

  const viderVitrine = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      if (!prev.vitrine) return prev;
      return {
        ...prev,
        inventaireJoueur: [
          ...prev.inventaireJoueur,
          ...prev.vitrine.objets.map((e) => e.objet),
        ],
        vitrine: null,
      };
    });
  }, []);

  const vendreDeVitrine = useCallback(
    (objetIds: string[], prixTotal: number) => {
      void audioManager.playCash();
      setState((prev) => {
        if (!prev || !prev.vitrine) return prev;
        const ids = new Set(objetIds);
        return {
          ...prev,
          vitrine: {
            ...prev.vitrine,
            objets: prev.vitrine.objets.filter((e) => !ids.has(e.objet.id)),
          },
          budget: prev.budget + prixTotal,
        };
      });
    },
    [],
  );

  /**
   * Sauvegarde le temps restant de la journée de vente en cours dans
   * `state.vitrine`. Écrit AUSSI de façon synchrone dans le dépôt : sur iOS,
   * l'app peut être suspendue juste après le passage en arrière-plan, avant que
   * l'effet d'auto-sauvegarde (post-commit) ne s'exécute. localStorage étant
   * synchrone, on persiste immédiatement pour ne pas perdre le compteur.
   */
  const sauverTempsVitrine = useCallback((tempsRestantSec: number) => {
    const current = stateRef.current;
    if (!current?.vitrine) return;
    if (current.vitrine.tempsRestantSec === tempsRestantSec) return;
    // Même garde d'appartenance que l'auto-save : jamais d'écriture d'un
    // état dans un slot qui n'est plus le sien.
    if (slotActif() !== slotEtatRef.current) return;
    // Persistance synchrone immédiate depuis le dernier état COMMITÉ : filet
    // pour la suspension iOS (l'effet d'auto-save post-commit peut ne jamais
    // tourner). Peut manquer une mutation encore en attente dans la même
    // frame — l'auto-save la réécrira au commit suivant.
    void obtenirGameRepository().save({
      ...current,
      vitrine: { ...current.vitrine, tempsRestantSec },
    });
    // Forme updater (PAS valeur) : ne doit jamais écraser une mutation en
    // attente posée dans la même frame (ex. vente conclue juste avant le
    // passage en arrière-plan).
    setState((prev) =>
      prev?.vitrine && prev.vitrine.tempsRestantSec !== tempsRestantSec
        ? { ...prev, vitrine: { ...prev.vitrine, tempsRestantSec } }
        : prev,
    );
  }, []);

  const enregistrerSession = useCallback((session: Session) => {
    // Rien à mesurer sans partie en cours (même garde que partout ailleurs :
    // stateRef.current, jamais un drapeau posé dans l'updater).
    const aUnePartie = !!stateRef.current;
    setState((prev) => {
      if (!prev) return prev;
      // Historique plafonné + compteur cumulatif de ventes (lib/sessions).
      const withSession = ajouterSession(prev, session);
      // Push une entrée ledger informative (le budget a déjà été muté pendant
      // la journée par ajusterBudget / vendreDeVitrine — applyBudget=false).
      if (session.type === "chinage") {
        const depense = session.achats.reduce((s, a) => s + a.prixPaye, 0);
        const n = session.achats.length;
        return appendLedger(
          withSession,
          {
            jour: session.jour,
            kind: "session_chinage",
            designation: `${session.brocanteNom} · ${n} acqui${n > 1 ? "s" : ""}`,
            recette: 0,
            depense,
            sessionId: session.id,
            params: { brocanteId: session.brocanteId, nb: n },
          },
          { applyBudget: false, timestamp: session.timestamp },
        );
      }
      const recette = session.ventes.reduce((s, v) => s + v.prixVente, 0);
      const n = session.ventes.length;
      return appendLedger(
        withSession,
        {
          jour: session.jour,
          kind: "session_vente",
          designation: `Étal · ${n} vente${n > 1 ? "s" : ""}`,
          recette,
          depense: 0,
          sessionId: session.id,
          params: { nb: n },
        },
        { applyBudget: false, timestamp: session.timestamp },
      );
    });
    if (!aUnePartie) return;
    // `depense` et `recette` sont recalculés ici, alors que l'updater
    // ci-dessus vient de calculer la même chose pour l'entrée du ledger :
    // duplication volontaire, pas un oubli de factorisation. Les deux calculs
    // ne dépendent que de `session` — paramètre de `enregistrerSession`, pas
    // dérivé de `prev` — donc ils ne peuvent pas diverger, quel que soit le
    // nombre de fois où StrictMode invoque l'updater. On pourrait les
    // mutualiser en hissant le calcul avant `setState`, mais ce serait
    // toucher au code qui construit l'entrée du ledger pour un chantier de
    // mesure — donc changer du comportement de jeu, ce que ce chantier
    // s'interdit, même pour un remplacement sans risque apparent. En
    // revanche `logEvenement` DOIT rester hors de l'updater : StrictMode le
    // double-invoque, et un effet de bord (l'envoi de l'événement) y
    // partirait deux fois.
    // Discriminé sur session.type : chine et vente partagent ce même hook
    // (cf. `Session` = SessionChinage | SessionVente, types/game.ts), donc les
    // deux événements économiques partent d'ici.
    if (session.type === "chinage") {
      const depense = session.achats.reduce((s, a) => s + a.prixPaye, 0);
      // La conception (spec §3.4) promettait un troisième paramètre,
      // `energie_depensee` : abandonné, aucun champ de `SessionChinage`
      // (types/game.ts) ne porte cette donnée, et la fabriquer aurait été
      // pire qu'un paramètre manquant — un chiffre inventé dans un rapport
      // ne se distingue pas d'un chiffre réel.
      logEvenement(EVENEMENTS.sessionChineTerminee, {
        objets_achetes: session.achats.length,
        depense: Math.round(depense),
      });
      return;
    }
    const recette = session.ventes.reduce((s, v) => s + v.prixVente, 0);
    // Coût d'achat des objets vendus : les objets issus du stock initial
    // n'ont pas de prixAchat connu (null) — comptés à 0, pas exclus, sinon la
    // marge surestimerait ces ventes.
    const coutAchat = session.ventes.reduce((s, v) => s + (v.prixAchat ?? 0), 0);
    logEvenement(EVENEMENTS.sessionVenteTerminee, {
      objets_vendus: session.ventes.length,
      recette: Math.round(recette),
      marge: Math.round(recette - coutAchat),
    });
  }, []);

  const debloquerCompetence = useCallback(
    (id: CompetenceId): { ok: boolean; raison?: string } => {
      const comp = getCompetence(id);
      if (!comp) return { ok: false, raison: raisonLocalisee("competenceIntrouvable") };
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartieEnCours") };
      const etat = etatCompetence(comp, current.competencesDebloquees, contexteDepuisState(current));
      if (etat === "debloquee") return { ok: false, raison: raisonLocalisee("dejaDebloquee") };
      if (etat === "verrouillee") {
        if (!comp.prerequis.every((p) => current.competencesDebloquees.includes(p)))
          return { ok: false, raison: raisonLocalisee("prerequisNonRemplis") };
        if (current.brocanteur.niveau < comp.niveauBrocanteurRequis)
          return { ok: false, raison: raisonLocalisee("niveauBrocanteurRequis", { niveau: comp.niveauBrocanteurRequis }) };
        if (current.brocanteur.pointsDisponibles < comp.coutPoints)
          return { ok: false, raison: raisonLocalisee("pasAssezDePoints") };
        return { ok: false, raison: raisonLocalisee("conditionsNonRemplies") };
      }
      setState((prev) => {
        if (!prev) return prev;
        if (prev.competencesDebloquees.includes(id)) return prev;
        if (prev.brocanteur.pointsDisponibles < comp.coutPoints) return prev;
        const suivant: GameState = {
          ...prev,
          brocanteur: {
            ...prev.brocanteur,
            pointsDisponibles: prev.brocanteur.pointsDisponibles - comp.coutPoints,
          },
          competencesDebloquees: [...prev.competencesDebloquees, id],
        };
        // La toute première compétence Réparer ouvre l'Atelier : son cadenas
        // tombe, un établi est offert avec le savoir-faire (sans quoi la
        // pièce serait vide) et la visite guidée s'arme — la main désignera
        // l'onglet jusqu'à ce que le joueur y aille.
        if (!aCompetenceReparation(prev) && aCompetenceReparation(suivant)) {
          return {
            ...suivant,
            niveauAtelier: Math.max(suivant.niveauAtelier, 1) as GameState["niveauAtelier"],
            miniTutoAtelier: "visite",
          };
        }
        return suivant;
      });
      logEvenement(EVENEMENTS.competenceDebloquee, { competence_id: id });
      return { ok: true };
    },
    [],
  );

  // Atomique : pré-check sur stateRef.current puis re-check dans l'updater
  // (même discipline que debloquerCompetence). Le pré-check et l'updater
  // peuvent diverger au même tick (plusieurs setState en attente) ; le retour
  // `true` garantit seulement l'intention, l'updater garantit l'état réel —
  // comme les quotas ici valent 1 usage la plupart du temps, un double-tap au
  // même tick reste sans effet d'état (le 2ᵉ appel de l'updater ne trouve
  // plus de quota et renvoie `prev` inchangé).
  const utiliserActive = useCallback((id: ActiveId): boolean => {
    const current = stateRef.current;
    if (!current) return false;
    if (!activeDebloquee(current, id)) return false;
    if (usagesRestants(current.activesUtilisees, id, current.jourActuel, current.brocanteur.niveau) <= 0) return false;
    setState((prev) => {
      if (!prev) return prev;
      const next = consommerActive(prev.activesUtilisees, id, prev.jourActuel, prev.brocanteur.niveau);
      if (!next) return prev;
      return { ...prev, activesUtilisees: next };
    });
    return true;
  }, []);

  const restaurerObjet = useCallback(
    (
      objetId: string,
      etatCible: EtatObjet,
    ): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet)
        return { ok: false, raison: raisonLocalisee("objetIntrouvableInventaire") };
      if (objet.enRestauration)
        return { ok: false, raison: raisonLocalisee("objetDejaEnRestauration") };
      const nbEnCours = current.inventaireJoueur.filter((o) => o.enRestauration).length;
      const capacite = ATELIER_SLOTS[current.niveauAtelier];
      if (nbEnCours >= capacite)
        return {
          ok: false,
          raison: raisonLocalisee(capacite > 1 ? "atelierPleinN" : "atelierPleinUn", {
            enCours: nbEnCours,
            capacite,
          }),
        };
      if (!peutRestaurerCategorie(current, objet.categorie))
        return {
          ok: false,
          raison: raisonLocalisee("competenceReparerManquante", {
            categorie: categorieLocalisee(objet.categorie),
          }),
        };

      const cout = coutAmelioration(objet, etatCible);
      const dispo = current.piecesAmelioration[objet.categorie] ?? 0;
      if (dispo < cout)
        return {
          ok: false,
          raison: raisonLocalisee(cout - dispo > 1 ? "manquePiecesN" : "manquePiecesUn", {
            n: cout - dispo,
            categorie: categorieLocalisee(objet.categorie),
          }),
        };

      const now = tempsConfiance() ?? Date.now();
      const debutMs = now;
      const finMs = now + dureeRestaurationMs(current, objet.categorie, objet.etat);

      setState((prev) => {
        if (!prev) return prev;
        const inv = prev.inventaireJoueur.map((o) =>
          o.id === objetId
            ? { ...o, enRestauration: { etatCible, debutMs, finMs } }
            : o,
        );
        const piecesAmelioration = {
          ...prev.piecesAmelioration,
          [objet.categorie]:
            (prev.piecesAmelioration[objet.categorie] ?? 0) - cout,
        };
        return { ...prev, inventaireJoueur: inv, piecesAmelioration };
      });
      return { ok: true };
    },
    [tempsConfiance],
  );

  const demantelerObjet = useCallback(
    (objetId: string): { ok: boolean; raison?: string; pieces?: number } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet)
        return { ok: false, raison: raisonLocalisee("objetIntrouvableInventaire") };
      if (objet.enRestauration)
        return { ok: false, raison: raisonLocalisee("objetEnRestauration") };

      const pieces = rendementDemantelement(objet);

      setState((prev) => {
        if (!prev) return prev;
        const stillThere = prev.inventaireJoueur.find((o) => o.id === objetId);
        if (!stillThere || stillThere.enRestauration) return prev;
        const inv = prev.inventaireJoueur.filter((o) => o.id !== objetId);
        const piecesAmelioration = {
          ...prev.piecesAmelioration,
          [objet.categorie]:
            (prev.piecesAmelioration[objet.categorie] ?? 0) + pieces,
        };
        return { ...prev, inventaireJoueur: inv, piecesAmelioration };
      });
      return { ok: true, pieces };
    },
    [],
  );

  const gagnerXPBrocanteur = useCallback((montant: number) => {
    if (montant <= 0) return;
    setState((prev) => {
      if (!prev) return prev;
      return crediterXPBrocanteur(prev, montant);
    });
  }, []);

  const recupererObjetRestaure = useCallback(
    (objetId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet) return { ok: false, raison: raisonLocalisee("objetIntrouvable") };
      if (!objet.enRestauration)
        return { ok: false, raison: raisonLocalisee("objetPasEnRestauration") };
      const now = tempsConfiance() ?? Date.now();
      if (now < objet.enRestauration.finMs)
        return { ok: false, raison: raisonLocalisee("restaurationPasTerminee") };

      setState((prev) => {
        if (!prev) return prev;
        const next = appliquerRecuperation(prev, objetId, now);
        if (!next) return prev;
        return crediterXPBrocanteur(
          next,
          XP_RESTAURATION_ETAPE *
            multiplicateurXPRarete(
              objet.rarete,
              !!getTemplate(objet.templateId)?.unique,
            ),
        );
      });
      return { ok: true };
    },
    [tempsConfiance],
  );

  // Terminer une restauration via pub récompensée (fenêtre < 30 min). Appelée par
  // le bouton atelier après getAdProvider().showRewardedAd() (comme l'énergie). Le
  // StubAdProvider simule la pub aujourd'hui ; swap vers AdMob à un seul endroit.
  const terminerRestaurationImmediate = useCallback(
    (objetId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet?.enRestauration)
        return { ok: false, raison: raisonLocalisee("objetPasEnRestauration") };
      const now = tempsConfiance() ?? Date.now();
      if (!peutTerminerImmediat(objet.enRestauration, now))
        return { ok: false, raison: raisonLocalisee("horsFenetre30min") };
      // L'échéance tombe à maintenant : l'établi passe en « prêt ». L'objet
      // n'est PAS livré ici — sa récupération (et l'XP qui va avec) reste au
      // tap du joueur, qui déclenche la cérémonie comme pour une restauration
      // arrivée à terme. La notif « objet restauré » encore programmée
      // s'annule d'elle-même : la resync est cadencée sur `finMs`.
      setState((prev) => {
        if (!prev) return prev;
        return appliquerAccelerationRestauration(prev, objetId, now) ?? prev;
      });
      return { ok: true };
    },
    [tempsConfiance],
  );

  const marquerVuTemplate = useCallback((templateId: string) => {
    setState((prev) =>
      prev
        ? { ...prev, collection: marquerVuFn(prev.collection, templateId) }
        : prev,
    );
  }, []);

  const marquerVuDansCollection = useCallback((templateId: string) => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            collection: marquerVuDansCollectionFn(prev.collection, templateId),
          }
        : prev,
    );
  }, []);

  const marquerDejaPossedeTemplate = useCallback((templateId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const dejaConnu = Object.values(prev.collection).some((slots) =>
        slots.some((s) => s.templateId === templateId && s.dejaPossede),
      );
      const next = {
        ...prev,
        collection: marquerDejaPossedeFn(prev.collection, templateId),
      };
      if (dejaConnu) return next;
      return crediterXPBrocanteur(next, XP_DECOUVERTE_COLLECTION);
    });
  }, []);

  const donnerACollection = useCallback(
    (objetId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet)
        return { ok: false, raison: raisonLocalisee("objetIntrouvableInventaire") };
      if (objet.enRestauration)
        return { ok: false, raison: raisonLocalisee("objetEnCoursDeRestauration") };

      setState((prev) => {
        if (!prev) return prev;
        const objetCourant = prev.inventaireJoueur.find((o) => o.id === objetId);
        if (!objetCourant) return prev;
        const { collection: nouvelleCollection, ancienne } = donnerObjetFn(
          prev.collection,
          objetCourant.templateId,
          objetCourant.etat,
          objetCourant.prixReferenceReel,
          objetCourant.prixAchat,
        );
        const nouvelInventaire = prev.inventaireJoueur.filter(
          (o) => o.id !== objetId,
        );
        if (ancienne) {
          const tpl = getTemplate(objetCourant.templateId);
          if (tpl) {
            nouvelInventaire.push({
              id: crypto.randomUUID(),
              templateId: objetCourant.templateId,
              nom: tpl.nom,
              categorie: tpl.categorie,
              etat: ancienne.etat,
              prixReferenceReel: ancienne.valeurBase ?? ancienne.valeur,
              rarete: tpl.rarete,
              ...(ancienne.prixAchat != null
                ? { prixAchat: ancienne.prixAchat }
                : {}),
            });
          }
        }
        return {
          ...prev,
          inventaireJoueur: nouvelInventaire,
          collection: nouvelleCollection,
          // Mini-tuto vinyles : le vinyle rejoint la collection → on guide
          // maintenant vers le gramophone.
          ...(prev.miniTutoVinyle === "ajouter" &&
          estVinyle(objetCourant.templateId)
            ? { miniTutoVinyle: "ecouter" as const }
            : {}),
        };
      });
      return { ok: true };
    },
    [],
  );

  const retirerDeCollection = useCallback(
    (templateId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
      const tpl = getTemplate(templateId);
      if (!tpl) return { ok: false, raison: raisonLocalisee("templateInconnu") };
      if (stockageEstPlein(current))
        return { ok: false, raison: raisonLocalisee("stockagePlein") };

      setState((prev) => {
        if (!prev) return prev;
        const { collection: nouvelleCollection, ancienne } = retirerDonationFn(
          prev.collection,
          templateId,
        );
        if (!ancienne) return prev;
        return {
          ...prev,
          collection: nouvelleCollection,
          inventaireJoueur: [
            ...prev.inventaireJoueur,
            {
              id: crypto.randomUUID(),
              templateId,
              nom: tpl.nom,
              categorie: tpl.categorie,
              etat: ancienne.etat,
              prixReferenceReel: ancienne.valeurBase ?? ancienne.valeur,
              rarete: tpl.rarete,
              ...(ancienne.prixAchat != null
                ? { prixAchat: ancienne.prixAchat }
                : {}),
            },
          ],
        };
      });
      return { ok: true };
    },
    [],
  );

  const marquerBossDebloqueVu = useCallback(() => {
    setState((prev) =>
      prev && !prev.bossDebloqueSeen
        ? { ...prev, bossDebloqueSeen: true }
        : prev,
    );
  }, []);

  const marquerNiveauVu = useCallback(() => {
    setState((prev) =>
      prev && prev.niveauVu < prev.brocanteur.niveau
        ? { ...prev, niveauVu: Math.min(prev.niveauVu + 1, prev.brocanteur.niveau) }
        : prev,
    );
  }, []);

  const marquerCourrierLu = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const cible = prev.courriers.find((c) => c.id === id);
      if (!cible || cible.lu) return prev;
      // Marque lu (immuable).
      const courriersMaj = prev.courriers.map((c) =>
        c.id === id ? { ...c, lu: true } : c,
      );
      let next: GameState = { ...prev, courriers: courriersMaj };
      // Récompense argent (lettre uniquement — les missions sont payées à la livraison).
      if (cible.payload.type === "lettre" && cible.payload.recompense?.argent) {
        next = appendLedger(next, {
          jour: prev.jourActuel,
          kind: "courrier_recompense",
          designation: cible.payload.titre,
          recette: cible.payload.recompense.argent,
          depense: 0,
          courrierId: id,
          params: { courrierId: id },
        });
      }
      // Création de la résolution mission si payload mission.
      if (cible.payload.type === "mission") {
        next = {
          ...next,
          missions: [
            ...next.missions,
            { courrierId: id, statut: "active" },
          ],
        };
      }
      return next;
    });
  }, []);

  const livrerMission = useCallback(
    (courrierId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
      const courrier = current.courriers.find((c) => c.id === courrierId);
      if (!courrier || courrier.payload.type !== "mission") {
        return { ok: false, raison: raisonLocalisee("missionIntrouvable") };
      }
      const reso = current.missions.find((m) => m.courrierId === courrierId);
      if (!reso || reso.statut !== "active") {
        return { ok: false, raison: raisonLocalisee("missionNonActive") };
      }
      if (!missionLivrable(courrier.payload, reso, current, courrier.jourRecu)) {
        return { ok: false, raison: raisonLocalisee("objectifsNonAtteints") };
      }
      const aRetirer = indicesAConsommerPourLivraison(
        courrier.payload,
        current.inventaireJoueur,
      );
      if (!aRetirer) {
        return { ok: false, raison: raisonLocalisee("objetsRequisManquants") };
      }
      // Const nommée APRÈS le guard : capture le narrowing mission de
      // `courrier.payload` pour la closure de setState.
      const payloadMission = courrier.payload;
      const titreMission = payloadMission.titre;
      const gabaritIdMission = payloadMission.gabaritId;
      const etatMinMission = payloadMission.gabaritParams?.etatMin;
      const templateIdsMission = payloadMission.cibles.map((c) => c.templateId);
      // Certaines missions (finale de l'arc principal) valident à la possession
      // sans consommer l'objet : le joueur garde la pièce.
      const conserver = payloadMission.conserverCibles === true;
      const now = tempsConfiance() ?? Date.now();
      const rEff = recompenseEffective(payloadMission, {
        state: current,
        reso,
        jourRecu: courrier.jourRecu,
      });
      setState((prev) => {
        if (!prev) return prev;
        const resoPrev = prev.missions.find((m) => m.courrierId === courrierId);
        if (!resoPrev || resoPrev.statut !== "active") return prev;
        // Recalcule les indices sur PREV : si l'inventaire a bougé entre le
        // pré-check et l'updater, les indices pré-calculés seraient décalés
        // et retireraient les mauvais objets.
        const aRetirerPrev = conserver
          ? []
          : indicesAConsommerPourLivraison(payloadMission, prev.inventaireJoueur);
        if (aRetirerPrev === null) return prev;
        const aRetirerSet = new Set(aRetirerPrev);
        const invMaj = conserver
          ? prev.inventaireJoueur
          : prev.inventaireJoueur.filter((_, i) => !aRetirerSet.has(i));
        const missionsMaj = prev.missions.map((m) =>
          m.courrierId === courrierId
            ? { ...m, statut: "livree" as const, jourResolution: prev.jourActuel }
            : m,
        );
        const credited = appliquerRecompense(
          prev,
          rEff,
          {
            designation: `Mission · ${titreMission}`,
            courrierId,
            gabaritId: gabaritIdMission,
            etatMin: etatMinMission,
            templateIds: templateIdsMission,
          },
          now,
        );
        // Chapitre de la trame portant une invitation (ex. ch4/ch8, à
        // objectifs → livrés ici, contrairement aux chapitres narratifs
        // injectés directement dans `accepterChapitre`) : la lettre des
        // Organisateurs est ajoutée dès la livraison réelle de la mission.
        const courriers = injecterLettreInvitationSiDue(
          credited.courriers,
          chapitreParId(courrierId)?.invitationTier,
          prev.jourActuel,
        );
        // Aucun bonus de points de compétence ici (2026-08-28, fin de
        // l'ancienne décision D4) : les points ne tombent QUE du niveau de
        // Brocanteur, un par niveau. Le brocanteur d'`appliquerRecompense`
        // passe donc tel quel.
        return {
          ...credited,
          courriers,
          inventaireJoueur: invMaj,
          missions: missionsMaj,
        };
      });
      return { ok: true };
    },
    [tempsConfiance],
  );

  /** Accepte un chapitre de la trame principale : crée le courrier + la mission
   *  associée (cf. `accepterChapitre`), déclenché en fin de dialogue avec le
   *  grand-père (pastille QG, Task 9). */
  const accepterChapitrePrincipal = useCallback(
    (chapitreId: string): void => {
      const now = tempsConfiance() ?? Date.now();
      setState((prev) => (prev ? accepterChapitre(prev, chapitreId, now) : prev));
    },
    [tempsConfiance],
  );

  const acheterGazette = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
    if (current.gazetteAchetee)
      return { ok: false, raison: raisonLocalisee("editionDejaAchetee") };
    if (current.budget < PRIX_GAZETTE)
      return {
        ok: false,
        raison: raisonLocalisee("budgetInsuffisantGazette", { prix: PRIX_GAZETTE }),
      };
    setState((prev) => {
      if (!prev) return prev;
      const next = appendLedger(prev, {
        jour: prev.jourActuel,
        kind: "gazette",
        designation: `Gazette du jour ${prev.jourActuel}`,
        recette: 0,
        depense: PRIX_GAZETTE,
        params: { jour: prev.jourActuel },
      });
      return { ...next, gazetteAchetee: true };
    });
    return { ok: true };
  }, []);

  const ouvrirGazetteOfferte = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.gazetteAchetee) return prev;
      return { ...prev, gazetteAchetee: true };
    });
  }, []);

  const terminerTutoGazette = useCallback(() => {
    setState((prev) =>
      prev && prev.tutoGazette !== "faite"
        ? { ...prev, tutoGazette: "faite" }
        : prev,
    );
  }, []);

  const refuserGazette = useCallback(() => {
    setState((prev) =>
      prev && !prev.gazetteRefusee ? { ...prev, gazetteRefusee: true } : prev,
    );
  }, []);

  const payerFraisBrocante = useCallback(
    (brocanteId: string, brocanteNom: string, montant: number) => {
      if (montant <= 0) return;
      setState((prev) => {
        if (!prev) return prev;
        return appendLedger(prev, {
          jour: prev.jourActuel,
          kind: "frais_brocante",
          designation: `Entrée · ${brocanteNom}`,
          recette: 0,
          depense: montant,
          params: { brocanteId },
        });
      });
    },
    [],
  );

  const stateValue = useMemo<GameStateValue>(
    () => ({ state, isHydrated, etatSauvegarde }),
    [state, isHydrated, etatSauvegarde],
  );

  // Toutes les actions sont des useCallback stables → cet objet n'est créé
  // qu'une seule fois en pratique (deps stables).
  const actionsValue = useMemo<GameActionsValue>(
    () => ({
      nouvellePartie,
      ajouterObjet,
      acheterObjet,
      retirerObjet,
      ajusterBudget,
      avancerJour,
      reset,
      detacherPartie,
      avancerTutoriel,
      ouvrirObjetColis,
      ouvrirCadeauAnniversaire,
      terminerMiniTutoVinyle,
      terminerMiniTutoCarnet,
      terminerMiniTutoAtelier,
      terminerTutoriel,
      ouvrirVitrine,
      attribuerVitrineABrocante,
      mettreEnVitrine,
      retirerDeVitrine,
      ajusterPrixVitrine,
      ajusterPositionVitrine,
      acheterCamion,
      setNiveauCamionDev,
      viderVitrine,
      vendreDeVitrine,
      sauverTempsVitrine,
      enregistrerSession,
      debloquerCompetence,
      utiliserActive,
      restaurerObjet,
      terminerRestaurationImmediate,
      demantelerObjet,
      recupererObjetRestaure,
      ameliorerAtelier,
      ameliorerStockage,
      definirPrixVenteSouhaite,
      gagnerXPBrocanteur,
      marquerVuTemplate,
      marquerVuDansCollection,
      marquerDejaPossedeTemplate,
      donnerACollection,
      retirerDeCollection,
      acheterGazette,
      ouvrirGazetteOfferte,
      terminerTutoGazette,
      refuserGazette,
      payerFraisBrocante,
      livrerMission,
      accepterChapitrePrincipal,
      marquerBossDebloqueVu,
      marquerNiveauVu,
      rerollMeteo,
      rerollCelebrite,
      marquerCourrierLu,
      tempsConfiance,
      consommerEnergie,
      crediterEnergiePub,
      reclamerBoiteMystere,
      rafraichirEnergie,
      rafraichirPeriodiques,
      acheterAuBazar,
    }),
    [
      nouvellePartie,
      ajouterObjet,
      acheterObjet,
      retirerObjet,
      ajusterBudget,
      avancerJour,
      reset,
      detacherPartie,
      avancerTutoriel,
      ouvrirObjetColis,
      ouvrirCadeauAnniversaire,
      terminerMiniTutoVinyle,
      terminerMiniTutoCarnet,
      terminerMiniTutoAtelier,
      terminerTutoriel,
      ouvrirVitrine,
      attribuerVitrineABrocante,
      mettreEnVitrine,
      retirerDeVitrine,
      ajusterPrixVitrine,
      ajusterPositionVitrine,
      acheterCamion,
      setNiveauCamionDev,
      viderVitrine,
      vendreDeVitrine,
      sauverTempsVitrine,
      enregistrerSession,
      debloquerCompetence,
      utiliserActive,
      restaurerObjet,
      terminerRestaurationImmediate,
      demantelerObjet,
      recupererObjetRestaure,
      ameliorerAtelier,
      ameliorerStockage,
      definirPrixVenteSouhaite,
      gagnerXPBrocanteur,
      marquerVuTemplate,
      marquerVuDansCollection,
      marquerDejaPossedeTemplate,
      donnerACollection,
      retirerDeCollection,
      acheterGazette,
      ouvrirGazetteOfferte,
      terminerTutoGazette,
      refuserGazette,
      payerFraisBrocante,
      livrerMission,
      accepterChapitrePrincipal,
      marquerBossDebloqueVu,
      marquerNiveauVu,
      rerollMeteo,
      rerollCelebrite,
      marquerCourrierLu,
      tempsConfiance,
      consommerEnergie,
      crediterEnergiePub,
      reclamerBoiteMystere,
      rafraichirEnergie,
      rafraichirPeriodiques,
      acheterAuBazar,
    ],
  );

  return (
    <GameActionsContext.Provider value={actionsValue}>
      <GameStateContext.Provider value={stateValue}>
        {children}
      </GameStateContext.Provider>
    </GameActionsContext.Provider>
  );
}

/**
 * API historique — état + actions combinés. Re-rend à chaque mutation d'état
 * (comme avant la séparation des contextes).
 */
export function useGame(): GameContextValue {
  const stateCtx = useContext(GameStateContext);
  const actionsCtx = useContext(GameActionsContext);
  if (!stateCtx || !actionsCtx)
    throw new Error("useGame doit être utilisé dans un <GameProvider>");
  return useMemo(
    () => ({ ...stateCtx, ...actionsCtx }),
    [stateCtx, actionsCtx],
  );
}

/**
 * Actions seules — l'objet est stable, le composant ne re-rend jamais
 * sur mutation d'état du jeu.
 */
export function useGameActions(): GameActionsValue {
  const ctx = useContext(GameActionsContext);
  if (!ctx)
    throw new Error(
      "useGameActions doit être utilisé dans un <GameProvider>",
    );
  return ctx;
}

/** État seul (state + isHydrated) — sans les actions. */
export function useGameStateOnly(): GameStateValue {
  const ctx = useContext(GameStateContext);
  if (!ctx)
    throw new Error(
      "useGameStateOnly doit être utilisé dans un <GameProvider>",
    );
  return ctx;
}
