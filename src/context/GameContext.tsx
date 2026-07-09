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
} from "@/types/game";
import { getCamion } from "@/data/camion";
import { createStarterInventory } from "@/data/starterInventory";
import { createGameRepository } from "@/lib/storage/createGameRepository";
import { migrerSauvegarde, SAVE_VERSION } from "@/lib/migrations";
import { useToastSafe } from "@/components/ui/Toast";
import { appendLedger } from "@/lib/grandLivre";
import { indicesAConsommerPourLivraison } from "@/lib/missions";
import { PERIODE_TENDANCES_JOURS, PRIX_GAZETTE, genererTendances } from "@/lib/tendances";
import { getCompetence } from "@/data/competences";
import { CATEGORIES, emptyPiecesAmelioration } from "@/data/categories";
import {
  ID_LETTRE_MAMAN_DEBUT,
  creerLettreMamanDebut,
  expireMissions,
} from "@/lib/courrier";
import { prochainLundi } from "@/lib/calendrier";
import {
  appliquerGainXPBrocanteur,
  emptyBrocanteur,
  POINTS_BONUS_CHAPITRE,
  XP_DECOUVERTE_COLLECTION,
  XP_QUETE_HEBDO,
  XP_QUETE_PRINCIPALE,
  XP_QUETE_QUOTIDIENNE,
  XP_RESTAURATION_ETAPE,
} from "@/lib/xp";
import {
  aGenInfluence,
  contexteDepuisState,
  etatCompetence,
  peutRestaurerCategorie,
} from "@/lib/competences";
import { tirerMeteo, tirerMeteoSemaine, indexJourSemaine } from "@/lib/meteo";
import { tirerCelebrite } from "@/lib/celebrite";
import {
  getProchaineUpgradeStockage,
  getStockageTier,
  getStockageTierParNiveau,
} from "@/data/stockage";
import { stockageEstPlein } from "@/lib/stockage";
import { tickQuetes } from "@/lib/quetes/tick";
import { settleQuetesPeriodiques } from "@/lib/quetes/settlePeriodiques";
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
  energieMaxPourNiveau,
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
import { useLangue } from "@/lib/i18n/LangueContext";

const gameRepository = createGameRepository();

interface GameStateValue {
  state: GameState | null;
  isHydrated: boolean;
}

interface GameActionsValue {
  nouvellePartie: () => void;
  ajouterObjet: (objet: Objet) => void;
  retirerObjet: (id: string) => void;
  ajusterBudget: (delta: number) => void;
  avancerJour: (nbJours?: number, volontaire?: boolean) => void;
  reset: () => void;
  /**
   * Détache l'état en mémoire sans toucher au storage — utilisé avant une
   * bascule de slot pour que l'effet d'auto-save (gardé sur state null) ne
   * puisse plus écrire. ⚠ NE PAS confondre avec `reset()` : `reset()` efface
   * aussi la clé de save active (`gameRepository.clear()`), ce qui
   * supprimerait la partie qu'on est justement en train de quitter.
   */
  detacherPartie: () => void;
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
  acheterGazette: () => { ok: boolean; raison?: string };
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
}

type GameContextValue = GameStateValue & GameActionsValue;

// Deux contextes séparés : l'état (change à chaque mutation) et les actions
// (objet mémoïsé une seule fois — les consommateurs d'actions seules ne
// re-rendent jamais sur mutation d'état).
const GameStateContext = createContext<GameStateValue | null>(null);
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
  // Évite de spammer le toast : on n'alerte qu'à la bascule succès→échec.
  const saveEnEchecRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    gameRepository.load().then((loaded) => {
      if (cancelled) return;
      // Migration : ajoute les champs manquants + remap les anciennes catégories.
      const migrated: GameState | null = loaded
        ? migrerSauvegarde(loaded)
        : null;
      setState(migrated);
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !state) return;
    gameRepository.save(state).then((ok) => {
      if (!ok && !saveEnEchecRef.current) {
        saveEnEchecRef.current = true;
        toast(
          "Sauvegarde impossible — stockage plein ou indisponible. Ta progression risque d'être perdue.",
          { type: "erreur" },
        );
      } else if (ok && saveEnEchecRef.current) {
        saveEnEchecRef.current = false;
        toast("Sauvegarde rétablie.", { type: "succes" });
      }
    });
  }, [state, isHydrated, toast]);

  const ancreRef = useRef<AncreTemps | null>(null);

  // Temps effectif courant (ancre device/réseau + horloge monotone). null
  // uniquement avant la pose de l'ancre (tout premier rendu) ; les sites d'appel
  // retombent alors sur Date.now() comme base gracieuse.
  const tempsConfiance = useCallback((): number | null => {
    if (!ancreRef.current) return null;
    return tempsConfianceCourant(ancreRef.current, performance.now());
  }, []);

  const rafraichirEnergie = useCallback(() => {
    const now = tempsConfiance();
    if (now === null) return; // ancre pas encore posée — settle au prochain tick/sync
    setState((prev) => {
      if (!prev) return prev;
      const s = settleEnergie(prev, now, energieMaxPourNiveau(prev.brocanteur.niveau));
      if (
        s.energie === prev.energie &&
        s.energieDerniereMaj === prev.energieDerniereMaj
      ) {
        return prev;
      }
      return { ...prev, ...s };
    });
  }, [tempsConfiance]);

  const rafraichirQuetes = useCallback(() => {
    const now = tempsConfiance() ?? Date.now();
    setState((prev) => (prev ? settleQuetesPeriodiques(prev, now) : prev));
  }, [tempsConfiance]);

  const consommerEnergie = useCallback(
    (n: number) => {
      setState((prev) => {
        if (!prev) return prev;
        const now = tempsConfiance() ?? Date.now();
        const base = {
          ...prev,
          ...settleEnergie(prev, now, energieMaxPourNiveau(prev.brocanteur.niveau)),
        };
        return { ...base, energie: Math.max(0, base.energie - n) };
      });
    },
    [tempsConfiance],
  );

  const crediterEnergiePub = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const now = tempsConfiance() ?? Date.now();
      // Plafond quotidien : l'UI bloque avant la pub, ceci couvre la course.
      if (pubsEnergieRestantes(prev.pubsEnergie, now) <= 0) return prev;
      const max = energieMaxPourNiveau(prev.brocanteur.niveau);
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
  // 1) Base immédiate sur l'horloge du device, ancrée à `performance.now()`
  //    (monotone) → l'énergie se recharge TOUJOURS, même hors-ligne, et changer
  //    l'heure système en cours de session n'a aucun effet (anti-recul via settle).
  // 2) Quand le temps de confiance réseau répond, on REPOSE l'ancre dessus →
  //    corrige le décalage et neutralise une avance d'horloge faite avant le lancement.
  useEffect(() => {
    if (!isHydrated) return;
    let actif = true;
    if (!ancreRef.current) {
      ancreRef.current = poserAncre(Date.now(), performance.now());
    }
    const sync = async () => {
      const t = await getTimeSource().maintenant();
      if (!actif) return;
      if (t !== null) {
        // Temps de confiance obtenu : corrige l'ancre (mono inchangée → pas de saut).
        ancreRef.current = poserAncre(t, performance.now());
      }
      rafraichirEnergie();
      rafraichirQuetes();
    };
    sync();
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const syncTimer = window.setInterval(sync, 10 * 60 * 1000); // re-sync /10 min
    const tickTimer = window.setInterval(() => {
      rafraichirEnergie();
      rafraichirQuetes();
    }, 60 * 1000); // settle /60 s
    return () => {
      actif = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(syncTimer);
      window.clearInterval(tickTimer);
    };
  }, [isHydrated, rafraichirEnergie, rafraichirQuetes]);

  // Notification « énergie pleine » : (re)planifie une notif système à l'instant
  // où l'énergie atteindra 5/5, et l'annule quand elle est pleine. La permission
  // est demandée la 1ʳᵉ fois que l'énergie passe sous le max (= 1ʳᵉ consommation).
  // Tout est no-op hors Tauri.
  const energie = state?.energie;
  const energieDerniereMaj = state?.energieDerniereMaj;
  const niveauBrocanteur = state?.brocanteur.niveau;
  useEffect(() => {
    if (
      !isHydrated ||
      energie === undefined ||
      energieDerniereMaj === undefined ||
      niveauBrocanteur === undefined ||
      !notificationsDisponibles()
    ) {
      return;
    }
    const snap = { energie, energieDerniereMaj };
    const max = energieMaxPourNiveau(niveauBrocanteur);
    let annule = false;
    (async () => {
      if (energie >= max) {
        await annulerPleinEnergie();
        return;
      }
      const ok = await assurerPermission();
      if (annule || !ok) return;
      const reste = secondesAvantPlein(snap, tempsConfiance() ?? Date.now(), max);
      if (reste === null) return;
      await planifierPleinEnergie(Date.now() + reste * 1000, locale);
    })();
    return () => {
      annule = true;
    };
  }, [isHydrated, energie, energieDerniereMaj, niveauBrocanteur, tempsConfiance, locale]);

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

  // Notif « Objet restauré » : (re)programme une notif par objet en restauration
  // à son échéance, à chaque changement de l'ensemble. No-op hors Tauri / sans
  // permission. Clé de dépendance = ids+finMs sérialisés (relance sur changement).
  const restauKey = (state?.inventaireJoueur ?? [])
    .filter((o) => o.enRestauration)
    .map((o) => `${o.id}:${o.enRestauration!.finMs}`)
    .join("|");
  useEffect(() => {
    if (!isHydrated) return;
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
    void synchroniserNotifsRestauration(objets, Date.now(), locale);
  }, [isHydrated, restauKey, tempsConfiance, locale]);

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

  const nouvellePartie = useCallback(() => {
    const initial: GameState = {
      version: SAVE_VERSION,
      budget: INITIAL_BUDGET,
      jourActuel: INITIAL_JOUR,
      inventaireJoueur: createStarterInventory(),
      vitrine: null,
      historique: [],
      tendances: genererTendances(),
      prochainesTendances: genererTendances(),
      prochainRafraichissementTendances: prochainLundi(INITIAL_JOUR + 1),
      competencesDebloquees: [],
      brocanteur: emptyBrocanteur(),
      collection: initCollection(),
      gazetteAchetee: false,
      bossDebloqueSeen: false,
      niveauVu: 0,
      meteoSemaine: tirerMeteoSemaine(),
      celebriteActuelle: tirerCelebrite(),
      influenceUtilisee: false,
      dernierLoyer: null,
      courriers: [creerLettreMamanDebut(INITIAL_JOUR)],
      niveauAtelier: 1,
      niveauStockage: 1,
      niveauCamion: 1,
      piecesAmelioration: emptyPiecesAmelioration(),
      chatSurFauteuil: false,
      passagesSansChat: 0,
      declencheursDeclenches: [ID_LETTRE_MAMAN_DEBUT],
      grandLivre: [],
      missions: [],
      quetesPeriodiques: {
        quotidien: { cle: "", courrierIds: [] },
        hebdo: { cle: "", courrierIds: [] },
      },
      energie: ENERGIE_MAX,
      energieDerniereMaj: Date.now(),
    };
    // Amorce de l'arc principal (chapitre 1) à la création.
    const tick = tickQuetes(initial, initial.jourActuel);
    setState({ ...initial, courriers: tick.courriers, missions: tick.missions });
    router.push("/bureau");
  }, [router]);

  const ajouterObjet = useCallback((objet: Objet) => {
    setState((prev) => {
      if (!prev) return prev;
      if (stockageEstPlein(prev)) return prev;
      return { ...prev, inventaireJoueur: [...prev.inventaireJoueur, objet] };
    });
  }, []);

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
      // (slot panorama ou page /atelier/gerer). cf. lib/atelier.appliquerRecuperation.
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
      // Loyer hebdomadaire : prélevé à la fin de chaque semaine (refresh Gazette).
      const tierStockage = refresh ? getStockageTierParNiveau(prev.niveauStockage) : null;
      const dernierLoyer = tierStockage
        ? {
            jour: nouveauJour,
            montant: tierStockage.loyerHebdo,
            tierNom: tierStockage.nom,
          }
        : prev.dernierLoyer;

      // Base state (sans encore appliquer le loyer)
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
        meteoSemaine: refresh ? tirerMeteoSemaine() : prev.meteoSemaine,
        celebriteActuelle: refresh ? tirerCelebrite() : prev.celebriteActuelle,
        influenceUtilisee: refresh ? false : prev.influenceUtilisee,
        dernierLoyer,
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

      // Tick des quêtes : déblocage de l'arc principal uniquement (les commandes
      // quotidiennes/hebdomadaires sont gérées en temps réel via le settle).
      const tick = tickQuetes(baseAvecMissions, nouveauJour);
      const baseAvecQuetes: GameState = {
        ...baseAvecMissions,
        courriers: tick.courriers,
        missions: tick.missions,
      };

      // Loyer (si refresh hebdo)
      if (tierStockage) {
        return appendLedger(baseAvecQuetes, {
          jour: nouveauJour,
          kind: "loyer",
          designation: `Loyer · ${tierStockage.nom}`,
          recette: 0,
          depense: tierStockage.loyerHebdo,
          params: { niveau: tierStockage.niveau },
        });
      }
      return baseAvecQuetes;
    });
  }, []);

  const rerollMeteo = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: "Pas de partie." };
    if (!aGenInfluence(current))
      return { ok: false, raison: "Compétence Influence requise." };
    if (current.influenceUtilisee)
      return { ok: false, raison: "Influence déjà utilisée cette édition." };
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
    if (!current) return { ok: false, raison: "Pas de partie." };
    if (!aGenInfluence(current))
      return { ok: false, raison: "Compétence Influence requise." };
    if (current.influenceUtilisee)
      return { ok: false, raison: "Influence déjà utilisée cette édition." };
    setState((prev) =>
      prev
        ? { ...prev, celebriteActuelle: tirerCelebrite(), influenceUtilisee: true }
        : prev,
    );
    return { ok: true };
  }, []);

  const ameliorerAtelier = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: "Pas de partie." };
    const upgrade = getProchaineUpgrade(current.niveauAtelier);
    if (!upgrade) return { ok: false, raison: "Atelier déjà au maximum." };
    if (current.budget < upgrade.cout)
      return {
        ok: false,
        raison: `Il manque ${upgrade.cout - current.budget} €.`,
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
    return { ok: true };
  }, []);

  const ameliorerStockage = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: "Pas de partie." };
    const upgrade = getProchaineUpgradeStockage(current.niveauStockage);
    if (!upgrade) return { ok: false, raison: "Stockage déjà au maximum." };
    if (current.budget < upgrade.cout)
      return {
        ok: false,
        raison: `Il manque ${upgrade.cout - current.budget} €.`,
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
    return { ok: true };
  }, []);

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
    setState(null);
    gameRepository.clear();
  }, []);

  // Détache l'état en mémoire sans toucher au storage — utilisé avant une
  // bascule de slot pour que l'effet d'auto-save (gardé sur state null) ne
  // puisse plus écrire.
  const detacherPartie = useCallback(() => setState(null), []);

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
    setState((prev) => {
      if (!prev) return prev;
      if (niveau !== prev.niveauCamion + 1) return prev;
      const camion = getCamion(niveau);
      const prix = camion.prixUpgradeVersCeNiveau ?? 0;
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
  }, []);

  // Dev-only : set direct du niveau sans coût ni vérification d'adjacence.
  // Utilisé par le bouton de switch dans ChargementHeader pour tester les visuels.
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
    const prev = stateRef.current;
    if (!prev?.vitrine) return;
    if (prev.vitrine.tempsRestantSec === tempsRestantSec) return;
    const next: GameState = {
      ...prev,
      vitrine: { ...prev.vitrine, tempsRestantSec },
    };
    stateRef.current = next;
    setState(next);
    void gameRepository.save(next);
  }, []);

  const enregistrerSession = useCallback((session: Session) => {
    setState((prev) => {
      if (!prev) return prev;
      const withSession = {
        ...prev,
        historique: [session, ...prev.historique],
      };
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
  }, []);

  const debloquerCompetence = useCallback(
    (id: CompetenceId): { ok: boolean; raison?: string } => {
      const comp = getCompetence(id);
      if (!comp) return { ok: false, raison: "Compétence introuvable." };
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie en cours." };
      const etat = etatCompetence(comp, current.competencesDebloquees, contexteDepuisState(current));
      if (etat === "debloquee") return { ok: false, raison: "Déjà débloquée." };
      if (etat === "verrouillee") {
        if (!comp.prerequis.every((p) => current.competencesDebloquees.includes(p)))
          return { ok: false, raison: "Prérequis non remplis." };
        if (current.brocanteur.niveau < comp.niveauBrocanteurRequis)
          return { ok: false, raison: `Niveau de Brocanteur ${comp.niveauBrocanteurRequis} requis.` };
        if (current.brocanteur.pointsDisponibles < comp.coutPoints)
          return { ok: false, raison: "Pas assez de points." };
        return { ok: false, raison: "Conditions non remplies." };
      }
      setState((prev) => {
        if (!prev) return prev;
        if (prev.competencesDebloquees.includes(id)) return prev;
        if (prev.brocanteur.pointsDisponibles < comp.coutPoints) return prev;
        return {
          ...prev,
          brocanteur: {
            ...prev.brocanteur,
            pointsDisponibles: prev.brocanteur.pointsDisponibles - comp.coutPoints,
          },
          competencesDebloquees: [...prev.competencesDebloquees, id],
        };
      });
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
    if (usagesRestants(current.activesUtilisees, id, current.jourActuel) <= 0) return false;
    setState((prev) => {
      if (!prev) return prev;
      const next = consommerActive(prev.activesUtilisees, id, prev.jourActuel);
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
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet)
        return { ok: false, raison: "Objet introuvable dans l'inventaire." };
      if (objet.enRestauration)
        return { ok: false, raison: "Cet objet est déjà en restauration." };
      const nbEnCours = current.inventaireJoueur.filter((o) => o.enRestauration).length;
      const capacite = ATELIER_SLOTS[current.niveauAtelier];
      if (nbEnCours >= capacite)
        return {
          ok: false,
          raison: `Atelier plein (${nbEnCours}/${capacite} slot${capacite > 1 ? "s" : ""}).`,
        };
      if (!peutRestaurerCategorie(current, objet.categorie))
        return {
          ok: false,
          raison: `Vous n'avez pas la compétence Réparer — ${objet.categorie}.`,
        };

      const cout = coutAmelioration(objet, etatCible);
      const dispo = current.piecesAmelioration[objet.categorie] ?? 0;
      if (dispo < cout)
        return {
          ok: false,
          raison: `Manque ${cout - dispo} pièce${cout - dispo > 1 ? "s" : ""} ${objet.categorie}.`,
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
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet)
        return { ok: false, raison: "Objet introuvable dans l'inventaire." };
      if (objet.enRestauration)
        return { ok: false, raison: "Objet en restauration." };

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
      return {
        ...prev,
        brocanteur: appliquerGainXPBrocanteur(prev.brocanteur, montant),
      };
    });
  }, []);

  const recupererObjetRestaure = useCallback(
    (objetId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet) return { ok: false, raison: "Objet introuvable." };
      if (!objet.enRestauration)
        return { ok: false, raison: "Objet pas en restauration." };
      const now = tempsConfiance() ?? Date.now();
      if (now < objet.enRestauration.finMs)
        return { ok: false, raison: "Restauration pas terminée." };

      setState((prev) => {
        if (!prev) return prev;
        const next = appliquerRecuperation(prev, objetId, now);
        if (!next) return prev;
        return {
          ...next,
          brocanteur: appliquerGainXPBrocanteur(
            next.brocanteur,
            XP_RESTAURATION_ETAPE,
          ),
        };
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
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet?.enRestauration)
        return { ok: false, raison: "Objet pas en restauration." };
      const now = tempsConfiance() ?? Date.now();
      if (!peutTerminerImmediat(objet.enRestauration, now))
        return { ok: false, raison: "Hors fenêtre (≤ 30 min)." };
      const fin = objet.enRestauration.finMs;
      setState((prev) => {
        if (!prev) return prev;
        // Forcer la complétion : on applique avec now = finMs (>= finMs).
        const next = appliquerRecuperation(prev, objetId, fin);
        if (!next) return prev;
        return {
          ...next,
          brocanteur: appliquerGainXPBrocanteur(
            next.brocanteur,
            XP_RESTAURATION_ETAPE,
          ),
        };
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
      return {
        ...next,
        brocanteur: appliquerGainXPBrocanteur(next.brocanteur, XP_DECOUVERTE_COLLECTION),
      };
    });
  }, []);

  const donnerACollection = useCallback(
    (objetId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet)
        return { ok: false, raison: "Objet introuvable dans l'inventaire." };
      if (objet.enRestauration)
        return { ok: false, raison: "Objet en cours de restauration." };

      setState((prev) => {
        if (!prev) return prev;
        const objetCourant = prev.inventaireJoueur.find((o) => o.id === objetId);
        if (!objetCourant) return prev;
        const { collection: nouvelleCollection, ancienne } = donnerObjetFn(
          prev.collection,
          objetCourant.templateId,
          objetCourant.etat,
          objetCourant.prixReferenceReel,
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
            });
          }
        }
        return {
          ...prev,
          inventaireJoueur: nouvelInventaire,
          collection: nouvelleCollection,
        };
      });
      return { ok: true };
    },
    [],
  );

  const retirerDeCollection = useCallback(
    (templateId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const tpl = getTemplate(templateId);
      if (!tpl) return { ok: false, raison: "Template inconnu." };
      if (stockageEstPlein(current))
        return { ok: false, raison: "Stockage plein." };

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
      if (!current) return { ok: false, raison: "Pas de partie." };
      const courrier = current.courriers.find((c) => c.id === courrierId);
      if (!courrier || courrier.payload.type !== "mission") {
        return { ok: false, raison: "Mission introuvable." };
      }
      const reso = current.missions.find((m) => m.courrierId === courrierId);
      if (!reso || reso.statut !== "active") {
        return { ok: false, raison: "Mission non active." };
      }
      const { recompense } = courrier.payload;
      const aRetirer = indicesAConsommerPourLivraison(
        courrier.payload,
        current.inventaireJoueur,
      );
      if (!aRetirer) {
        return { ok: false, raison: "Objets requis manquants dans l'inventaire." };
      }
      const titreMission = courrier.payload.titre;
      // Certaines missions (finale de l'arc principal) valident à la possession
      // sans consommer l'objet : le joueur garde la pièce.
      const conserver = courrier.payload.conserverCibles === true;
      const aRetirerSet = new Set(conserver ? [] : aRetirer);
      const categorieMission = courrier.payload.categorie;
      const xpMission =
        categorieMission === "principale"
          ? XP_QUETE_PRINCIPALE
          : categorieMission === "hebdomadaire"
            ? XP_QUETE_HEBDO
            : XP_QUETE_QUOTIDIENNE;
      setState((prev) => {
        if (!prev) return prev;
        const resoPrev = prev.missions.find((m) => m.courrierId === courrierId);
        if (!resoPrev || resoPrev.statut !== "active") return prev;
        const invMaj = conserver
          ? prev.inventaireJoueur
          : prev.inventaireJoueur.filter((_, i) => !aRetirerSet.has(i));
        const missionsMaj = prev.missions.map((m) =>
          m.courrierId === courrierId
            ? { ...m, statut: "livree" as const, jourResolution: prev.jourActuel }
            : m,
        );
        const credited = appendLedger(prev, {
          jour: prev.jourActuel,
          kind: "mission_recompense",
          designation: `Mission · ${titreMission}`,
          recette: recompense.argent,
          depense: 0,
          courrierId,
          params: { courrierId },
        });
        const avecXP = appliquerGainXPBrocanteur(credited.brocanteur, xpMission);
        // Bonus de points de compétence par chapitre livré (décision D4),
        // appliqué APRÈS le gain d'XP pour ne pas écraser les points de level-up.
        const brocanteur =
          categorieMission === "principale"
            ? {
                ...avecXP,
                pointsDisponibles:
                  avecXP.pointsDisponibles + POINTS_BONUS_CHAPITRE,
              }
            : avecXP;
        return {
          ...credited,
          inventaireJoueur: invMaj,
          missions: missionsMaj,
          brocanteur,
        };
      });
      return { ok: true };
    },
    [],
  );

  const acheterGazette = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: "Pas de partie." };
    if (current.gazetteAchetee)
      return { ok: false, raison: "Édition déjà achetée." };
    if (current.budget < PRIX_GAZETTE)
      return {
        ok: false,
        raison: `Budget insuffisant (${PRIX_GAZETTE} € requis).`,
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
    () => ({ state, isHydrated }),
    [state, isHydrated],
  );

  // Toutes les actions sont des useCallback stables → cet objet n'est créé
  // qu'une seule fois en pratique (deps stables).
  const actionsValue = useMemo<GameActionsValue>(
    () => ({
      nouvellePartie,
      ajouterObjet,
      retirerObjet,
      ajusterBudget,
      avancerJour,
      reset,
      detacherPartie,
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
      payerFraisBrocante,
      livrerMission,
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
    }),
    [
      nouvellePartie,
      ajouterObjet,
      retirerObjet,
      ajusterBudget,
      avancerJour,
      reset,
      detacherPartie,
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
      payerFraisBrocante,
      livrerMission,
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
