"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { DoorOpen } from "lucide-react";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { SkillDock, type DockSkill } from "@/components/mobile/SkillDock";
import { ItemCard } from "@/components/ui/ItemCard";
import { BilanSession, type LigneXp } from "@/components/mobile/bilan/BilanSession";
import { useGame, useGameActions } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import {
  DEFAULT_MODIFIERS,
  JOURNEE_DUREE_SECONDES,
  BRADERIE_INTERVALLE_MULT,
  ajouterAuPanier,
  appliquerBoniment,
  margeBoniment,
  bourseDe,
  genererClientEvent,
  genererClientEventScripte,
  personaDepuisClient,
  prochainIntervalleClient,
  proposerOffreVente,
  sommePrixAchatPanier,
  type ClientEvent,
  type VitrineModifiers,
} from "@/lib/vitrine";
import { ALEA_NEGO_SCRIPTEE, ouvrirNegociation, proposerOffre } from "@/lib/negociation";
import { temperamentDe } from "@/data/temperaments";
import { acheteurDeLEtape, type AcheteurScenario } from "@/data/tutorielScenario";
import { etapeSuivante, tutorielActif } from "@/lib/tutoriel";
import {
  CLIENT_SILHOUETTE,
  getClientIllustration,
  getClientIllustrationFache,
} from "@/lib/personaIllustrations";
import { activeDebloquee, usagesRestants, NIVEAU_ACTIVES, type ActiveId } from "@/lib/actives";
import { audioManager } from "@/lib/audio/audioManager";
import { vibrerApparition } from "@/lib/haptique";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import { useToast } from "@/components/ui/Toast";
import { NegociationSheet } from "@/components/mobile/NegociationSheet";
import { NegoItemRow } from "@/components/mobile/NegoItemRow";
import { DialogueOverlay } from "@/components/mobile/dialogue/DialogueOverlay";
import { TutorielCoach } from "@/components/mobile/tutoriel/TutorielCoach";
import {
  GRAND_PERE_PORTRAITS,
  SEQUENCES_TUTORIEL,
  type DialogueSequence,
} from "@/data/dialogues";
import type { NegociationState } from "@/types/game";
import { genererPoolClients, type ClientPersonnage } from "@/data/clients";
import { getBrocanteById, fraisEntree } from "@/data/brocantes";
import {
  degelerBudgetAffichage,
  degelerXpAffichage,
  gelerBudgetAffichage,
  gelerXpAffichage,
} from "@/lib/affichageGele";
import { getTemplate } from "@/data/objetTemplates";
import {
  XP_JUSTE_PRIX,
  XP_NEGO_BROCANTEUR,
  XP_VENTE_BROCANTEUR,
  multiplicateurXPRarete,
} from "@/lib/xp";
import {
  aGenBonneReputation,
  aGenDiplomate,
  aGenEstimateurBourse,
  aGenLecteurAmes,
  aGenOeilAiguise,
  aGenPresentationSoignee,
  aGenStandRenomme,
  bonusPassionCategorie,
  bonusToleranceNegoGeneral,
} from "@/lib/competences";
import { CATEGORIES } from "@/data/categories";
import { METEO_INTERVALLE_MULT } from "@/data/meteos";
import { indexJourSemaine, meteoDuJour } from "@/lib/meteo";
import { estGrandeBraderie } from "@/lib/evenements";
import { buildCelebritePersonnage } from "@/lib/celebrite";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { DictionnaireUI, tr } from "@/lib/i18n/ui";
import { libelleActive } from "@/lib/i18n/libelles";
import {
  nomObjet,
  nomClient,
  ambianceClient,
  nomArchetypeClient,
  nomCelebrite,
  nomExpediteur,
  nomBrocante,
} from "@/lib/i18n/contenu";
import type { Locale } from "@/lib/i18n/locales";
import type {
  BrocanteurState,
  CategorieObjet,
  EtatObjet,
  NiveauCamion,
  ObjetEnVitrine,
  Rarete,
  TutorielEtape,
  VenteHistorique,
} from "@/types/game";

/** Leçon d'humeur : le temps de lire la réplique du client avant le voile. */
const DELAI_LECON_HUMEUR_MS = 1100;

const TICK_MS = 100;
// Active de vente 📣 La Criée (N30) : fait défiler 3 clients coup sur coup,
// à intervalle fixe qui ignore l'intervalle normal ET le multiplicateur météo.
const CRIEE_NB_CLIENTS = 3;
const CRIEE_INTERVALLE_SEC = 1;

/** Journée de vente scriptée (tutoriel) : dialogue « avant » joué une fois
 *  par étape, dès qu'aucun client n'est présent — mirroir du pattern de la
 *  chine (`src/app/chiner/[brocanteId]/ClientPage.tsx`). */
const AVANT_VENTE: Partial<Record<TutorielEtape, DialogueSequence>> = {
  "vente-refus": SEQUENCES_TUTORIEL.tuto_vente_refus_avant,
  "vente-directe": SEQUENCES_TUTORIEL.tuto_vente_directe_avant,
  "vente-nego": SEQUENCES_TUTORIEL.tuto_vente_nego_avant,
};
/** Ids des séquences « avant » ci-dessus : sert à détecter, à la fermeture
 *  du dialogue (`onFini`), qu'il s'agissait d'un « avant » et non d'un
 *  débrief — dans ce cas le client scripté doit surgir tout de suite. */
const AVANT_VENTE_IDS: ReadonlySet<string> = new Set(
  Object.values(AVANT_VENTE).map((s) => s.id),
);

interface EntreeJournal {
  id: string;
  heure: string;
  texte: string;
  ton: "vente" | "echec" | "info";
}

export default function VitrineJourneePage() {
  const router = useRouter();
  const params = useParams<{ brocanteId: string }>();
  const brocante = useMemo(
    () => getBrocanteById(params.brocanteId),
    [params.brocanteId],
  );
  const {
    state,
    isHydrated,
    vendreDeVitrine,
    viderVitrine,
    avancerJour,
    enregistrerSession,
    sauverTempsVitrine,
    gagnerXPBrocanteur,
    marquerVuTemplate,
    utiliserActive,
    tempsConfiance,
  } = useGame();
  const { avancerTutoriel } = useGameActions();
  const { d, tr, locale } = useLangue();
  const { startCrowd, stopCrowd } = useSettings();
  const { toast } = useToast();

  /**
   * Nom affiché d'un client. La célébrité (archetypeId "celebrite") persiste son
   * nom en chaîne FR canonique (cf. celebrite.ts) → résolu à l'affichage via
   * l'overlay `divers.celebrites` ; les autres clients passent par `nomClient`.
   */
  const nomAfficheClient = (persona: ClientPersonnage): string =>
    persona.archetypeId === "celebrite"
      ? nomCelebrite(persona.nom, locale)
      : nomClient(persona, locale);
  useEffect(() => {
    startCrowd();
    return () => stopCrowd();
  }, [startCrowd, stopCrowd]);

  // Modifiers issus des compétences (calculés à la première occurrence où state est dispo)
  const modifiersRef = useRef<VitrineModifiers | null>(null);
  if (state && modifiersRef.current === null) {
    const bonusPassionParCategorie = new Map<CategorieObjet, number>();
    for (const c of CATEGORIES) {
      const p = bonusPassionCategorie(state, c);
      if (p > 0) bonusPassionParCategorie.set(c, p);
    }
    modifiersRef.current = {
      bonusPassionParCategorie,
      bonusToleranceNego: bonusToleranceNegoGeneral(state),
      intervalleMultiplier:
        (aGenPresentationSoignee(state) ? 0.75 : 1) *
        METEO_INTERVALLE_MULT[meteoDuJour(state)] *
        (brocante && estGrandeBraderie(brocante) ? BRADERIE_INTERVALLE_MULT : 1),
      revelePersona: aGenLecteurAmes(state),
      releveBourse: aGenEstimateurBourse(state),
      oeilAiguise: aGenOeilAiguise(state),
      diplomate: aGenDiplomate(state),
      clientGarantiFancy: aGenStandRenomme(state),
      bonneReputation: aGenBonneReputation(state),
    };
  }

  const [tempsRestant, setTempsRestant] = useState(JOURNEE_DUREE_SECONDES);
  /** Compte à rebours avant le prochain client. Jamais affiché → simple ref
   *  (pas de useState) : le spawn d'un client déclenche des setState externes
   *  (marquerVuTemplate sur GameContext). Les imbriquer dans le callback
   *  updater d'un setState local faisait rejouer ces appels pendant le
   *  rendu de VitrineJourneePage (React invoque l'updater lors du traitement
   *  du useState propriétaire) → warning « setState pendant le rendu d'un
   *  autre composant ». En ref, ce code s'exécute en JS normal dans le tick
   *  du setInterval, hors de tout rendu React. */
  const prochainClientRef = useRef<number | null>(null);
  if (prochainClientRef.current === null) {
    prochainClientRef.current = prochainIntervalleClient(
      modifiersRef.current?.intervalleMultiplier ?? 1,
    );
  }
  const [clientActuel, setClientActuel] = useState<ClientEvent | null>(null);
  const [journal, setJournal] = useState<EntreeJournal[]>([]);
  const [negoVente, setNegoVente] = useState<NegociationState | null>(null);
  /** Offre courante du joueur dans la négo (liftée : le dock Boniment en dépend). */
  const [offreJoueur, setOffreJoueur] = useState(0);
  const [journeeFinie, setJourneeFinie] = useState(false);
  const [ventesEffectuees, setVentesEffectuees] = useState<VenteHistorique[]>([]);
  const [fancyClientApparu, setFancyClientApparu] = useState(false);
  const [revelationFaite, setRevelationFaite] = useState(false);
  // Miroir pour `handleOffreVente` (useCallback) — même motif que tendancesRef.
  const revelationFaiteRef = useRef(revelationFaite);
  revelationFaiteRef.current = revelationFaite;
  /** Le Lot garni (N10) : mini-picker ouvert pour choisir le 2e objet à ajouter au panier. */
  const [lotGarniOuvert, setLotGarniOuvert] = useState(false);
  const [bravoTout, setBravoTout] = useState(false);
  /** XP de Brocanteur gagnée durant la session, ventilée par source pour le
   *  décompte du bilan. Le total part dans l'historique de session. */
  const [xpSession, setXpSession] = useState({
    ventes: 0,
    justePrix: 0,
    negociations: 0,
  });
  /** Séquence de dialogue tutoriel actuellement affichée (grand-père), ou null. */
  const [dialogueTuto, setDialogueTuto] = useState<DialogueSequence | null>(null);
  const etape = state?.tutorielEtape;

  /* Leçon d'humeur (première vente) : la jauge est le seul signal qui dit
     pourquoi un acheteur finit par partir, et rien ne l'expliquait. On la
     montre au moment où elle DÉMONTRE quelque chose — après la première offre
     refusée du radin, quand elle vient de bouger — et une seule fois.
     "differe" laisse la réplique du client se lire avant de voiler l'écran. */
  const [leconHumeur, setLeconHumeur] = useState<
    "jamais" | "differe" | "visible" | "faite"
  >("jamais");
  useEffect(() => {
    if (leconHumeur !== "differe") return;
    const t = setTimeout(() => setLeconHumeur("visible"), DELAI_LECON_HUMEUR_MS);
    return () => clearTimeout(t);
  }, [leconHumeur]);

  /** Crédite l'XP immédiatement ET la compte pour le bilan. L'affichage de la
   *  barre est gelé : elle ne bougera qu'à la cérémonie. */
  const gagnerXPLocal = (cle: keyof typeof xpSession, montant: number) => {
    gagnerXPBrocanteur(montant);
    setXpSession((prev) => ({ ...prev, [cle]: prev[cle] + montant }));
  };

  /** Garde : la barre est gelée une seule fois, sur l'état d'entrée de session. */
  const barreGeleeRef = useRef(false);
  /** Instantané de la barre XP pris à l'entrée en vente. Conservé en ref : le
   *  double montage StrictMode (create → cleanup → create) dégèle au nettoyage
   *  sans repasser par le bloc de gel ci-dessous (gardé par `barreGeleeRef`) —
   *  c'est l'effet de montage juste après qui réarme le gel à chaque
   *  (re)montage, cf. même remède sur src/app/chiner/[brocanteId]/ClientPage.tsx. */
  const instantaneXpRef = useRef<BrocanteurState | null>(null);
  /** Caisse à l'ouverture de la journée, même traitement que la barre XP. */
  const budgetOuvertureRef = useRef<number | null>(null);

  // Ni la barre XP ni la caisse ne bougent pendant la vente : tout se pose au
  // bilan, chaque prix de vente venant s'ajouter à la caisse en direct.
  useEffect(() => {
    if (!state || barreGeleeRef.current) return;
    barreGeleeRef.current = true;
    instantaneXpRef.current = state.brocanteur;
    budgetOuvertureRef.current = state.budget;
    gelerXpAffichage(state.brocanteur);
    gelerBudgetAffichage(state.budget);
  }, [state]);

  // Filet : réarme le gel à chaque (re)montage (survit au double montage
  // StrictMode) et dégèle systématiquement à la sortie, quel que soit le
  // chemin (retour QG, navigation arrière, démontage).
  useEffect(() => {
    if (instantaneXpRef.current) gelerXpAffichage(instantaneXpRef.current);
    if (budgetOuvertureRef.current !== null) {
      gelerBudgetAffichage(budgetOuvertureRef.current);
    }
    return () => {
      degelerXpAffichage();
      degelerBudgetAffichage();
    };
  }, []);

  const fancyClientApparuRef = useRef(false);
  fancyClientApparuRef.current = fancyClientApparu;
  const celebriteApparueRef = useRef(false);
  // Détecte si la célébrité de la semaine vise cette brocante aujourd'hui.
  const celebriteIciAujourdhui =
    state?.celebriteActuelle &&
    brocante &&
    state.celebriteActuelle.brocanteId === brocante.id &&
    state.celebriteActuelle.jourSemaine === indexJourSemaine(state.jourActuel)
      ? state.celebriteActuelle
      : null;
  const tempsRestantRef = useRef(JOURNEE_DUREE_SECONDES);
  /** Compte à rebours à la précision du tick (100 ms), hors état React : le
   *  `setTempsRestant` n'est déclenché qu'au changement de seconde entière —
   *  1 re-render/s au lieu de 10 pour un composant de cette taille. */
  const tempsPrecisRef = useRef(JOURNEE_DUREE_SECONDES);
  /** Restauration du temps restant persisté : effectuée une seule fois, dès que
   *  l'état est hydraté. Sans ce ref, l'initialiseur `useState` capturerait
   *  `state === null` (avant hydratation) et resterait bloqué à la durée pleine
   *  → le timer repartirait de zéro après réouverture de l'app. */
  const tempsRestaureRef = useRef(false);
  useLayoutEffect(() => {
    if (tempsRestaureRef.current) return;
    if (!isHydrated || !state?.vitrine) return;
    tempsRestaureRef.current = true;
    const saved = state.vitrine.tempsRestantSec;
    if (typeof saved === "number" && saved < JOURNEE_DUREE_SECONDES) {
      setTempsRestant(saved);
      tempsRestantRef.current = saved;
      tempsPrecisRef.current = saved;
    }
  }, [isHydrated, state]);
  /** Garde synchrone — empêche que terminerJournee s'exécute plus d'une fois. */
  const journeeTermineeRef = useRef(false);
  /** Garde synchrone — empêche que la fin de journée déclenchée par le passage
   *  à 0 de `tempsRestant` (cf. effet ci-dessous) ne se déclenche plus d'une fois. */
  const finDeclencheeRef = useRef(false);
  /** Ref vers terminerJournee, affectée plus bas pour casser la dépendance temporelle. */
  const terminerJourneeRef = useRef<() => void>(() => {});
  /** Pool de personnages pré-tirés pour la session, consommé séquentiellement. */
  const poolRef = useRef<ClientPersonnage[]>([]);
  const poolIndexRef = useRef(0);
  if (poolRef.current.length === 0 && brocante) {
    poolRef.current = genererPoolClients(20, brocante.tier);
  }

  // Snapshot du camion au montage (avant que la vitrine soit modifiée par les ventes)
  const standSnapshot = useRef<{ niveau: NiveauCamion; loyer: number; tailleInitiale: number } | null>(null);
  useEffect(() => {
    if (standSnapshot.current !== null) return;
    if (!state || !state.vitrine || state.vitrine.objets.length === 0 || !brocante) return;
    standSnapshot.current = {
      niveau: state.niveauCamion,
      loyer: fraisEntree(brocante),
      tailleInitiale: state.vitrine.objets.length,
    };
  }, [state, brocante]);

  // Refs pour éviter les closures stale dans l'intervalle
  const vitrineRef = useRef(state?.vitrine?.objets ?? []);
  vitrineRef.current = state?.vitrine?.objets ?? [];

  const tendancesRef = useRef(state?.tendances ?? []);
  tendancesRef.current = state?.tendances ?? [];

  const clientActuelRef = useRef<ClientEvent | null>(null);
  clientActuelRef.current = clientActuel;

  // Active de vente 📣 La Criée (N30) : nombre de clients restants à faire
  // défiler « coup sur coup » une fois déclenchée (cf. bloc de spawn du tick).
  const crieeRestantsRef = useRef(0);

  /** Étape courante, à jour même dans les closures figées du tick (setInterval). */
  const etapeRef = useRef<TutorielEtape | undefined>(etape);
  etapeRef.current = etape;
  /** Dialogue tuto affiché, à jour dans le tick (le spawn scripté doit se
   *  taire tant qu'un dialogue est ouvert). */
  const dialogueTutoRef = useRef<DialogueSequence | null>(null);
  dialogueTutoRef.current = dialogueTuto;
  /** Acheteur scénario actif (journée de vente scriptée) : posé au spawn
   *  scripté, consulté pour la négo (persona ET aléa du scénario — PAS le
   *  persona du `ClientPersonnage` réel, qui porte d'autres axes) et pour le
   *  câblage `scriptTuto` de la sheet. Null hors tuto ou entre deux clients. */
  const acheteurScripteRef = useRef<AcheteurScenario | null>(null);
  /** Chaque séquence « avant » du script de vente ne doit être jouée qu'une
   *  fois (StrictMode, retours en arrière de `etape` impossibles mais gardé
   *  par sécurité) — même pattern que la chine. */
  const dialoguesJouesRef = useRef<Set<string>>(new Set());
  /** Étape vers laquelle avancer une fois le débrief « après » refermé (posé
   *  par les débriefs de vente ci-dessous, consommé par `onFini`). */
  const dialogueApresRef = useRef<TutorielEtape | null>(null);

  /** Calcule le prochain état de négo pour une contre-offre du joueur.
   *  Pendant la journée scriptée du tutoriel, le persona ET l'aléa sont ceux
   *  du scénario (`acheteurScripteRef`, prouvés déterministes par
   *  `tutorielScenario.test.ts`) — pas le `ClientPersonnage` réel du
   *  personnage nommé, dont les axes de négo diffèrent. Sinon, passe par
   *  `proposerOffreVente` : tolérance boostée (Verbe haut/d'or, Œil aiguisé)
   *  ET sauvetage Diplomate (quota persistant via les actives). */
  const handleOffreVente = useCallback(
    (nego: NegociationState, offre: number): NegociationState => {
      const ev = clientActuelRef.current;
      if (!ev) return nego;
      const acheteurScripte = acheteurScripteRef.current;
      if (acheteurScripte) {
        if (etapeRef.current === "vente-refus") {
          setLeconHumeur((l) => (l === "jamais" ? "differe" : l));
        }
        return proposerOffre(nego, acheteurScripte.persona, offre, ALEA_NEGO_SCRIPTEE);
      }
      const mods = modifiersRef.current ?? DEFAULT_MODIFIERS;
      const diplomatieDispo =
        mods.diplomate &&
        usagesRestants(
          state?.activesUtilisees,
          "diplomate",
          state?.jourActuel ?? 0,
          state?.brocanteur.niveau ?? 0,
        ) > 0;
      const next = proposerOffreVente(nego, ev.persona, offre, mods, {
        revelationDejaFaite: !diplomatieDispo,
        toleranceBoost: ev.toleranceBoost,
        // Diplomate : le plafond de CE client a été révélé → sa dernière
        // offre est acceptée jusqu'à 110 % du plafond (DIPLOMATE_MARGE).
        plafondRevele: revelationFaiteRef.current,
      });
      if (next.diplomatieDeclenchee) {
        utiliserActive("diplomate");
        setRevelationFaite(true);
      }
      return next;
    },
    [state, utiliserActive],
  );

  /** Le Lot garni : ajoute l'objet choisi au panier du client en cours de négo,
   *  recalcule prixDemande/prixMax et remet la négo à l'échelle. La mutation
   *  touche à la fois `clientActuel` et `negoVente` — le sheet se resynchronise
   *  via ses props `nego`/`cibleSecrete`/`echelleMax` (l'effet d'ouverture
   *  existant réagit à leur changement, cf. NegociationSheet). */
  const handleChoisirLotGarni = (choix: ObjetEnVitrine) => {
    const ev = clientActuelRef.current;
    if (!ev || !negoVente) {
      setLotGarniOuvert(false);
      return;
    }
    if (!utiliserActive("lotGarni")) {
      setLotGarniOuvert(false);
      return;
    }
    const { ev: evNext, nego: negoNext } = ajouterAuPanier(
      ev,
      choix,
      negoVente,
      state?.tendances ?? [],
      modifiersRef.current ?? DEFAULT_MODIFIERS,
      brocante,
    );
    setClientActuel(evNext);
    setNegoVente(negoNext);
    setOffreJoueur(evNext.prixDemande);
    setLotGarniOuvert(false);
  };

  /** La Criée : consomme le quota du jour et programme 3 clients à la suite,
   *  au rythme fixe `CRIEE_INTERVALLE_SEC` (cf. bloc de spawn du tick, qui
   *  décrémente `crieeRestantsRef` à chaque client posé). */
  const jouerCriee = () => {
    if (!utiliserActive("criee")) return;
    crieeRestantsRef.current = CRIEE_NB_CLIENTS;
    prochainClientRef.current = 0.1; // déclenche le spawn au prochain tick, sans attendre l'intervalle
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!state) {
      router.replace("/");
      return;
    }
    if (!brocante) {
      router.replace("/vitrine");
      return;
    }
    // Une fois la journée terminée, on reste sur la page pour afficher le résumé.
    // viderVitrine() a remis state.vitrine à null et ne doit pas déclencher de redirect.
    if (journeeFinie) return;
    if (!state.vitrine || state.vitrine.brocanteId !== brocante.id) {
      router.replace(`/vitrine/${brocante.id}`);
      return;
    }
    if (state.vitrine.objets.length === 0) {
      // Tutoriel (journée de vente scriptée) : si le dernier objet vient
      // d'être vendu, NE PAS clore ici avant que le script ait atteint sa
      // dernière étape (« conclusion ») — le débrief de Bérénice doit se
      // jouer et faire avancer l'étape (défaillance device 2026-07-17 :
      // le gate du seul effet « bravo tout vendu » ne suffisait pas, ce
      // chemin-ci clôturait avant lui). L'effet se re-déclenche à chaque
      // changement d'étape (dep `etape`) et clôture alors normalement.
      if (tutorielActif(state) && etape !== "conclusion") return;
      // Vitrine vide : si la journée a démarré (standSnapshot posé), c'est que
      // tout a été vendu — on clôture pour afficher le résumé. Sinon (arrivée
      // sur la page sans préparation), on renvoie à la prépa.
      if (standSnapshot.current) {
        terminerJourneeRef.current();
      } else {
        router.replace(`/vitrine/${brocante.id}`);
      }
    }
  }, [isHydrated, state, router, journeeFinie, brocante, etape]);

  const ajouterJournal = useCallback((entree: Omit<EntreeJournal, "id">) => {
    setJournal((prev) => [
      ...prev,
      { ...entree, id: crypto.randomUUID() },
    ]);
  }, []);

  const heureCourante = useCallback(() => {
    const ecoule = JOURNEE_DUREE_SECONDES - tempsRestant;
    const heuresJeu = 9 + Math.floor((ecoule / JOURNEE_DUREE_SECONDES) * 8);
    const minutes = Math.floor(((ecoule / JOURNEE_DUREE_SECONDES) * 8 * 60) % 60);
    return `${String(heuresJeu).padStart(2, "0")}h${String(minutes).padStart(2, "0")}`;
  }, [tempsRestant]);

  const terminerJournee = useCallback(() => {
    if (journeeTermineeRef.current) return;
    journeeTermineeRef.current = true;
    setJourneeFinie(true);
    setClientActuel(null);

    // Enregistre la session avant de vider la vitrine
    if (standSnapshot.current) {
      const tailleInvendus = state?.vitrine?.objets.length ?? 0;
      enregistrerSession({
        id: crypto.randomUUID(),
        type: "vente",
        jour: state?.jourActuel ?? 0,
        // Horloge de confiance : les objectifs périodiques comparent ce
        // timestamp à `timestampAcceptation` (posé lui aussi via
        // `tempsConfiance`). Utiliser `Date.now()` ici désynchroniserait les
        // deux bords de la comparaison si l'horloge de l'appareil dérive.
        timestamp: tempsConfiance() ?? Date.now(),
        niveauCamion: standSnapshot.current.niveau,
        loyer: standSnapshot.current.loyer,
        ventes: ventesEffectuees,
        invendus: tailleInvendus,
        xpGagne: {},
        xpBrocanteur: xpSession.ventes + xpSession.justePrix + xpSession.negociations,
      });
    }

    viderVitrine();
    avancerJour();
  }, [
    journeeFinie,
    viderVitrine,
    avancerJour,
    enregistrerSession,
    state,
    ventesEffectuees,
    xpSession,
    tempsConfiance,
  ]);
  terminerJourneeRef.current = terminerJournee;

  // Boucle de tick : décrémente le temps et déclenche les clients
  useEffect(() => {
    if (journeeFinie) return;
    // N'attaque pas le compte à rebours avant que le temps restant persisté
    // ait été restauré (cf. tempsRestaureRef), sinon on décrémenterait depuis
    // la durée pleine.
    if (!isHydrated) return;

    const id = window.setInterval(() => {
      // En pause si un client est devant nous, ou (tutoriel) si un dialogue
      // du grand-père est ouvert — l'horloge ET le spawn attendent qu'il ait
      // fini de parler (hors tuto, dialogueTuto est toujours null : no-op).
      if (clientActuelRef.current) return;
      if (dialogueTutoRef.current) return;

      // Décompte à la précision du tick sur une ref ; l'état React (et donc
      // le re-render) n'est touché qu'au changement de seconde entière. La
      // synchro de tempsRestantRef et le déclenchement de fin de journée
      // restent délégués aux useEffect dédiés ci-dessous, réagissant au
      // changement de `tempsRestant`.
      tempsPrecisRef.current = Math.max(0, tempsPrecisRef.current - TICK_MS / 1000);
      const secondeEntiere = Math.ceil(tempsPrecisRef.current);
      setTempsRestant((t) => (t === secondeEntiere ? t : secondeEntiere));

      // Décrémente le compte à rebours du prochain client en JS pur (ref, pas
      // de useState) : le spawn ci-dessous déclenche des setState externes
      // (marquerVuTemplate sur GameContext) et locaux, qui doivent s'exécuter
      // en code normal dans ce tick — pas imbriqués dans le callback d'un
      // updater React, cf. commentaire sur prochainClientRef plus haut.
      {
        const next = prochainClientRef.current! - TICK_MS / 1000;
        if (next <= 0) {
          const enTuto = tutorielActif({ tutorielEtape: etapeRef.current ?? "termine" });
          if (enTuto) {
            // Journée de vente scriptée : jamais le pool aléatoire — un
            // acheteur nommé par étape, posé seulement une fois son « avant »
            // joué (dialoguesJouesRef, alimenté par l'effet AVANT_VENTE).
            const acheteur = acheteurDeLEtape(etapeRef.current!);
            const avantSeq = AVANT_VENTE[etapeRef.current!];
            const avantDejaJoue = !avantSeq || dialoguesJouesRef.current.has(avantSeq.id);
            if (acheteur && avantDejaJoue) {
              const ev = genererClientEventScripte(acheteur, {
                brocanteId: brocante?.id ?? "",
                objets: vitrineRef.current,
              });
              if (ev === null) {
                // Garde-fou : l'objet ciblé n'est plus en vitrine (ne devrait
                // pas arriver dans le déroulé normal) — on avance l'étape au
                // lieu de rester coincé sans jamais pouvoir spawner.
                avancerTutoriel(etapeSuivante(etapeRef.current!));
              } else {
                for (const p of ev.panier) {
                  marquerVuTemplate(p.objet.templateId);
                }
                acheteurScripteRef.current = acheteur;
                setClientActuel(ev);
                vibrerApparition();
                // Le curseur part TOUJOURS du prix affiché sur l'étal : c'est
                // au joueur de l'amener dans l'anneau du grand-père, pas au
                // jeu de l'y déposer.
                setOffreJoueur(ev.prixDemande);
                setRevelationFaite(false);
                setNegoVente(
                  ev.mode === "negociation"
                    ? ouvrirNegociation(
                        "vente",
                        ev.offreInitiale,
                        ev.prixMax,
                        // Tempérament (couleur des répliques) : l'id RÉEL du
                        // ClientPersonnage (ev.persona.archetypeId), mappé
                        // dans TEMPERAMENT_CLIENTS — PAS acheteur.persona.archetype
                        // ("radin_tuto"/"ami_tuto"/"nego_tuto", des labels
                        // scénario absents des deux tables de tempérament,
                        // qui feraient retomber sur les pools génériques.
                        // acheteur.persona reste la SEULE source pour la
                        // mécanique de négo (proposerOffre), inchangée.
                        temperamentDe(ev.persona.archetypeId),
                      )
                    : null,
                );
              }
            }
            // Retente vite si l'avant n'est pas encore joué (le dialogue va
            // fermer et reprogrammer 1.5s) ; sinon rythme normal — la Criée
            // n'a pas de sens pendant le script (pas de pool à faire défiler).
            prochainClientRef.current = avantDejaJoue
              ? prochainIntervalleClient(modifiersRef.current?.intervalleMultiplier ?? 1)
              : 0.3;
            return;
          }

          const mods = modifiersRef.current ?? undefined;
          const tempsEcoulePct =
            1 - tempsRestantRef.current / JOURNEE_DUREE_SECONDES;
          const forceFancy =
            !!mods?.clientGarantiFancy &&
            !fancyClientApparuRef.current &&
            tempsEcoulePct >= 0.5;
          // Célébrité : apparaît garantie entre 40 et 80 % de la journée
          // si elle vise cette brocante aujourd'hui.
          const forceCelebrite =
            !!celebriteIciAujourdhui &&
            !celebriteApparueRef.current &&
            tempsEcoulePct >= 0.4 &&
            tempsEcoulePct <= 0.8;
          const personnage = forceCelebrite
            ? buildCelebritePersonnage(celebriteIciAujourdhui!)
            : poolRef.current[
                poolIndexRef.current % poolRef.current.length
              ];
          if (!forceCelebrite) poolIndexRef.current += 1;
          const ev = personnage
            ? genererClientEvent(
                personnage,
                vitrineRef.current,
                tendancesRef.current,
                mods,
                { fancy: forceFancy && !forceCelebrite, brocante },
              )
            : null;
          if (ev) {
            for (const p of ev.panier) {
              marquerVuTemplate(p.objet.templateId);
            }
            if (ev.fancy) setFancyClientApparu(true);
            if (forceCelebrite) celebriteApparueRef.current = true;
            acheteurScripteRef.current = null;
            setClientActuel(ev);
            vibrerApparition();
            setOffreJoueur(ev.prixDemande);
            setRevelationFaite(false);
            if (ev.mode === "negociation") {
              setNegoVente(
                ouvrirNegociation(
                  "vente",
                  ev.offreInitiale,
                  ev.prixMax,
                  temperamentDe(ev.persona.archetypeId),
                ),
              );
            } else {
              setNegoVente(null);
            }
          }
          // La Criée : coup sur coup à intervalle fixe, sans attendre le
          // multiplicateur météo/compétences ni le tirage normal — même si
          // aucun client n'a pu être posé (étal trop vide/inaccessible), le
          // quota consommé continue de s'égrener sans planter.
          if (crieeRestantsRef.current > 0) {
            crieeRestantsRef.current -= 1;
            prochainClientRef.current = CRIEE_INTERVALLE_SEC;
          } else {
            prochainClientRef.current = prochainIntervalleClient(
              mods?.intervalleMultiplier ?? 1,
            );
          }
        } else {
          prochainClientRef.current = next;
        }
      }
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [journeeFinie, terminerJournee, isHydrated]);

  // Synchro du ref depuis l'état : tempsRestantRef.current doit toujours
  // refléter le dernier `tempsRestant` rendu (lu par la persistance
  // arrière-plan/pagehide et par le calcul de tempsEcoulePct dans le tick).
  useEffect(() => {
    tempsRestantRef.current = tempsRestant;
  }, [tempsRestant]);

  // Fin de journée déclenchée par l'écoulement du temps : ne se déclenche
  // qu'une fois (finDeclencheeRef), et seulement quand le tick a effectivement
  // pu décrémenter jusqu'à 0 — ce qui n'arrive jamais pendant qu'un client est
  // présent puisque le tick ci-dessus ne touche pas à `tempsRestant` tant que
  // clientActuelRef.current est vrai.
  useEffect(() => {
    if (
      tempsRestant === 0 &&
      !finDeclencheeRef.current &&
      // Tutoriel (vente scriptée, spec §7) : l'horloge ne clôt jamais la
      // journée avant la fin du script, même si le chrono touche 0 (il reste
      // simplement figé à 0) — même garde que pour la vitrine qui se vide
      // ci-dessous. Elle reprend ses droits dès « conclusion ».
      (!state || !tutorielActif(state) || etape === "conclusion")
    ) {
      finDeclencheeRef.current = true;
      terminerJournee();
    }
  }, [tempsRestant, terminerJournee, state, etape]);

  // Persiste le temps restant aux moments charnières : passage en arrière-plan
  // (iOS suspend le JS sans préavis), pagehide, et démontage (navigation vers le
  // QG). À la réouverture de l'app ou au retour dans la vente, le compte à
  // rebours reprend là où il en était au lieu de repartir de la durée pleine.
  useEffect(() => {
    if (!isHydrated) return;
    const persister = () => {
      if (journeeTermineeRef.current) return;
      sauverTempsVitrine(tempsRestantRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persister();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", persister);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", persister);
      // Démontage (ex. retour au QG en cours de journée) : ultime sauvegarde.
      persister();
    };
  }, [isHydrated, sauverTempsVitrine]);

  // Si la vitrine se vide en cours de journée, on marque le "bravo" et on termine.
  useEffect(() => {
    if (
      !journeeFinie &&
      isHydrated &&
      state &&
      (state.vitrine?.objets.length ?? 0) === 0 &&
      tempsRestant < JOURNEE_DUREE_SECONDES &&
      // Tutoriel (journée de vente scriptée) : l'horloge ne clôt jamais la
      // journée avant la fin du script, même si l'étal se vide plus tôt (le
      // débrief de Bérénice doit se jouer et faire avancer l'étape jusqu'à
      // « conclusion » — défaillance device 2026-07-17, généralisée pour les
      // 3 acheteurs scriptés). Elle reprend ses droits dès « conclusion ».
      (!state || !tutorielActif(state) || etape === "conclusion")
    ) {
      setBravoTout(true);
      ajouterJournal({
        heure: heureCourante(),
        texte: d.vente.journalEcoule,
        ton: "vente",
      });
      terminerJournee();
    }
  }, [state, isHydrated, journeeFinie, tempsRestant, terminerJournee, ajouterJournal, heureCourante, d, etape]);

  // Entrée de journée pendant le tutoriel : le grand-père présente la vente.
  useEffect(() => {
    if (etape === "coffre-trace-deux") {
      setDialogueTuto(SEQUENCES_TUTORIEL.tuto_vente_entree);
    }
  }, [etape]);

  // Dialogue « avant » par étape scriptée de vente : le grand-père présente
  // chaque visage avant qu'il ne surgisse (pattern identique à la chine).
  useEffect(() => {
    if (!etape || dialogueTuto || clientActuel) return;
    const seq = AVANT_VENTE[etape];
    if (seq && !dialoguesJouesRef.current.has(seq.id)) {
      dialoguesJouesRef.current.add(seq.id);
      setDialogueTuto(seq);
    }
  }, [etape, dialogueTuto, clientActuel]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        {d.vente.installationStand}
      </main>
    );
  }

  const enregistrerVentes = (ev: ClientEvent, prixTotal: number) => {
    // Répartit prixTotal sur les objets au prorata de leur prixVente affiché.
    const totalDemande = ev.prixDemande;
    const ratio = totalDemande > 0 ? prixTotal / totalDemande : 1;
    const nouvelles: VenteHistorique[] = ev.panier.map((p) => ({
      templateId: p.objet.templateId,
      nom: p.objet.nom,
      categorie: p.objet.categorie,
      etat: p.objet.etat,
      prixReferenceReel: p.objet.prixReferenceReel,
      prixVente: Math.round(p.prixVente * ratio),
      prixAchat: p.objet.prixAchat ?? null,
    }));
    setVentesEffectuees((prev) => [...prev, ...nouvelles]);
    // XP par objet vendu, pondérée par la rareté (unique = ×5).
    for (const p of ev.panier) {
      gagnerXPLocal(
        "ventes",
        XP_VENTE_BROCANTEUR *
          multiplicateurXPRarete(
            p.objet.rarete,
            !!getTemplate(p.objet.templateId)?.unique,
          ),
      );
    }
  };

  const handleAccepterAchatDirect = (ev: ClientEvent) => {
    vendreDeVitrine(
      ev.panier.map((p) => p.objet.id),
      ev.prixDemande,
    );
    enregistrerVentes(ev, ev.prixDemande);
    gagnerXPLocal("justePrix", XP_JUSTE_PRIX);
    ajouterJournal({
      heure: heureCourante(),
      texte: tr(d.vente.journalAchete, {
        nom: nomAfficheClient(ev.persona),
        panier: describePanier(ev, d, tr, locale),
        prix: ev.prixDemande,
      }),
      ton: "vente",
    });
    // Journée scriptée : l'ami Léo achète direct au prix affiché — débrief,
    // puis la troisième et dernière leçon (la négociatrice Bérénice).
    if (etape === "vente-directe") {
      dialogueApresRef.current = "vente-nego";
      setDialogueTuto(SEQUENCES_TUTORIEL.tuto_vente_directe_apres);
    }
    acheteurScripteRef.current = null;
    setClientActuel(null);
    setLotGarniOuvert(false);
  };

  const encaisserVente = (ev: ClientEvent, prixFinal: number) => {
    // Le rideau est tombé pendant le délai d'encaissement (600 ms après un
    // « conclu ») : la journée est déjà enregistrée et la vitrine vidée —
    // encaisser créditerait un bilan fantôme sans toucher au budget. On annule.
    if (journeeTermineeRef.current) return;
    vendreDeVitrine(
      ev.panier.map((p) => p.objet.id),
      prixFinal,
    );
    enregistrerVentes(ev, prixFinal);
    gagnerXPLocal("negociations", XP_NEGO_BROCANTEUR);
    ajouterJournal({
      heure: heureCourante(),
      texte: tr(d.vente.journalAccepte, {
        nom: nomAfficheClient(ev.persona),
        panier: describePanier(ev, d, tr, locale),
        prix: prixFinal,
      }),
      ton: "vente",
    });
    // Journée scriptée : la négociatrice Bérénice conclut — dernière leçon,
    // débrief puis la leçon de montée de niveau (célébration → visite des
    // compétences → achat du premier point), qui se clôt elle-même sur
    // « conclusion » (cf. tuto_niveau_apres dans bibliotheque/page.tsx).
    if (etape === "vente-nego") {
      dialogueApresRef.current = "niveau-celebration";
      setDialogueTuto(SEQUENCES_TUTORIEL.tuto_vente_nego_apres);
    }
    acheteurScripteRef.current = null;
    setClientActuel(null);
    setNegoVente(null);
    setLotGarniOuvert(false);
  };

  const terminerVisiteClient = (ev: ClientEvent) => {
    ajouterJournal({
      heure: heureCourante(),
      texte: tr(d.vente.journalEloigne, { nom: nomAfficheClient(ev.persona) }),
      ton: "info",
    });
    // Journée scriptée : le radin (Maxime) est congédié ou renonce de
    // lui-même (refus_poli à patience) sans jamais conclure ni insulter
    // (garanti par `SESSION_VENTE_TUTORIEL` — cf. tutorielScenario.test.ts) —
    // tous les chemins de fin de visite passent par ici. Débrief, puis Léo.
    if (etape === "vente-refus") {
      dialogueApresRef.current = "vente-directe";
      setDialogueTuto(SEQUENCES_TUTORIEL.tuto_vente_refus_apres);
    }
    acheteurScripteRef.current = null;
    setClientActuel(null);
    setNegoVente(null);
    setLotGarniOuvert(false);
  };

  /** Le Boniment (N20) : tentative de closing sur l'offre courante du joueur,
   *  déclenchée depuis le dock. Le sheet se resynchronise via sa prop `nego`. */
  const jouerBoniment = () => {
    const ev = clientActuelRef.current;
    if (!ev || !negoVente || negoVente.statut !== "en_cours") return;
    if (!utiliserActive("boniment")) return;
    const next = appliquerBoniment(
      negoVente,
      offreJoueur,
      margeBoniment(state?.brocanteur.niveau ?? 0),
    );
    setNegoVente(next);
    if (next.statut === "conclu") {
      audioManager.playCash();
      setTimeout(() => encaisserVente(ev, next.prixAdverseCourant), 600);
    }
  };

  const handleFermerEnAvance = () => {
    ajouterJournal({
      heure: heureCourante(),
      texte: d.vente.journalRideau,
      ton: "info",
    });
    terminerJournee();
  };

  const handleRetourQg = () => {
    router.push("/bureau");
  };

  const progress = (1 - tempsRestant / JOURNEE_DUREE_SECONDES) * 100;
  const totalVentes = journal
    .filter((j) => j.ton === "vente")
    .length;

  /** Le Lot garni : objets du stand pas déjà dans le panier du client en cours. */
  const objetsAjoutablesLotGarni = clientActuel
    ? (state.vitrine?.objets ?? []).filter(
        (o) => !clientActuel.panier.some((p) => p.objet.id === o.objet.id),
      )
    : [];

  /** Les 3 atouts de vente, dans l'ordre de déblocage (cercles du header bas). */
  const dockSkills = (): DockSkill[] => {
    const niveau = state.brocanteur.niveau;
    const commun = (id: Exclude<ActiveId, "diplomate">, emoji: string) => {
      const verrouille = !activeDebloquee(state, id);
      const nom = libelleActive(id, d);
      const restants = usagesRestants(state.activesUtilisees, id, state.jourActuel, niveau);
      return {
        id,
        nom,
        imageSrc: `/competences/atout.${id}.webp`,
        emojiFallback: emoji,
        verrouille,
        niveauRequis: NIVEAU_ACTIVES[id],
        restants,
        ariaLabel: verrouille
          ? tr(d.chine.atoutVerrouilleAria, { nom, niveau: NIVEAU_ACTIVES[id] })
          : tr(d.chine.atoutAria, { nom, restants }),
        onActivate: () => {
          if (verrouille) {
            toast(tr(d.chine.atoutVerrouilleToast, { nom, niveau: NIVEAU_ACTIVES[id] }), { type: "info" });
          }
        },
      };
    };

    const lotGarniSkill = commun("lotGarni", "🧺");
    const bonimentSkill = commun("boniment", "🎩");
    const crieeSkill = commun("criee", "📣");
    const negoEnCours =
      clientActuel?.mode === "negociation" && negoVente?.statut === "en_cours";
    return [
      {
        ...lotGarniSkill,
        desactive:
          !negoEnCours ||
          (clientActuel?.panier.length ?? 0) >= 2 ||
          objetsAjoutablesLotGarni.length === 0,
        onActivate: lotGarniSkill.verrouille
          ? lotGarniSkill.onActivate
          : () => setLotGarniOuvert(true),
      },
      {
        ...bonimentSkill,
        desactive: !negoEnCours,
        onActivate: bonimentSkill.verrouille ? bonimentSkill.onActivate : jouerBoniment,
      },
      {
        ...crieeSkill,
        desactive:
          !!clientActuel ||
          tempsRestant < CRIEE_INTERVALLE_SEC * CRIEE_NB_CLIENTS,
        onActivate: crieeSkill.verrouille ? crieeSkill.onActivate : jouerCriee,
      },
    ];
  };

  const brocanteBg = brocante ? getBrocanteImageUrl(brocante.id) : null;

  /** Décompte d'XP du bilan. Au niveau maximum aussi : l'XP y remplit la
   *  barre bleue de prestige (1 Ƶ tous les 500 XP), la pastille a donc
   *  toujours une cible. */
  const lignesXpBilan: readonly LigneXp[] = [
    { cle: "ventes", montant: xpSession.ventes },
    { cle: "justePrix", montant: xpSession.justePrix },
    { cle: "negociations", montant: xpSession.negociations },
  ];

  /* Persona révélé : compétence Lecteur d'âmes, célébrité (toujours à visage
     découvert), ou journée de vente scriptée du tutoriel (les trois visages
     sont NOMMÉS — Maxime, Léo, Bérénice — jamais anonymes). Sinon le client
     reste anonyme : nom générique et silhouette noire à la place du portrait
     d'archétype. */
  const personaRevele =
    clientActuel !== null &&
    ((modifiersRef.current?.revelePersona ?? false) ||
      clientActuel.persona.archetypeId === "celebrite" ||
      tutorielActif(state));

  return (
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper-100)",
      }}
    >
      <MobileHeader budget={state.budget} jetons={state.jetons} />

      <main
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
          // Réserve la place de la bannière de tutoriel (0 hors tutoriel) : le
          // fond flouté, en `inset: 0`, occupe aussi cette bande.
          paddingTop: "var(--tuto-banniere-h, 0px)",
        }}
      >
        {brocanteBg && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              backgroundImage: `linear-gradient(rgba(15,30,22,0.42), rgba(15,30,22,0.42)), url("${brocanteBg}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(7px)",
              transform: "scale(1.08)",
            }}
          />
        )}
        {journeeFinie ? (
          <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
            <BilanSession
              mode="vente"
              titre={brocante ? nomBrocante(brocante, locale) : ""}
              items={ventesEffectuees.map((v) => ({
                templateId: v.templateId,
                nom: v.nom,
                categorie: v.categorie,
                prix: v.prixVente,
                prixAchat: v.prixAchat,
              }))}
              xpLignes={lignesXpBilan}
              cibleVolItems='[data-fly-target="caisse-header"]'
              compteur={{ kind: "recette" }}
              onTermine={handleRetourQg}
            />
          </div>
        ) : (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            overflowY: "auto",
            padding: "12px 12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
        {/* Horloge */}
        <section
          style={{
            border: "1px solid var(--brass-500)",
            background: "var(--paper-100)",
            padding: "10px 12px",
            boxShadow:
              "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              marginBottom: 4,
            }}
          >
            {tr(d.vente.enTeteVitrine, { heure: heureCourante() })}
          </div>
          <Horloge tempsRestant={tempsRestant} progress={progress} />
        </section>

        {/* Articles sur l'étal */}
        {(state.vitrine?.objets.length ?? 0) === 0 ? (
          <p
            style={{
              textAlign: "center",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--paper-100)",
              textShadow: "0 1px 4px rgba(0,0,0,0.65)",
              padding: "16px 0",
            }}
          >
            {d.vente.etalVide}
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(var(--card-w), 1fr))",
              gap: "var(--gutter)",
            }}
          >
            {(state.vitrine?.objets ?? []).map((e) => (
              <ArticleSurEtal
                key={e.objet.id}
                templateId={e.objet.templateId}
                nom={nomObjet(e.objet, locale)}
                categorie={e.objet.categorie}
                etat={e.objet.etat}
                rarete={e.objet.rarete}
                prix={e.prixVente}
              />
            ))}
          </div>
        )}

        </div>
        )}
      </main>

      {/* Header bas partagé : Sortir + dock d'atouts (zIndex 50 : reste
          visible et actionnable au-dessus de la sheet de négociation).
          Le bilan apporte le sien, avec ses propres commandes. */}
      {!journeeFinie && (
      <div
        style={{
          position: "relative",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--forest-800)",
          borderTop: "3px solid var(--brass-500)",
          padding: "8px 16px calc(8px + var(--safe-bottom))",
        }}
      >
        <button
          type="button"
          aria-label={d.chine.sortir}
          onClick={handleFermerEnAvance}
          // Le débrief de Bérénice (vente-nego) n'avance plus directement à
          // "conclusion" mais à "niveau-celebration" (la leçon de montée de
          // niveau s'intercale, cf. bibliotheque/page.tsx) — la fanfare
          // n'attend que la sortie de cette route de session. Le pulse doit
          // donc guider vers Sortir dès ce palier, pas seulement au dernier.
          className={
            etape === "niveau-celebration" ||
            etape === "competences-visite" ||
            etape === "competences-choix" ||
            etape === "conclusion"
              ? "tuto-pulse tuto-main tuto-main-droite"
              : undefined
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--brass-300)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(10px, 2.6vw, 12px)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: 0,
          }}
        >
          <DoorOpen size={26} strokeWidth={2} />
          {d.chine.sortir}
        </button>

        <SkillDock skills={dockSkills()} />
      </div>
      )}

      {clientActuel && !journeeFinie && (
        <NegociationSheet
          open={true}
          onClose={() => terminerVisiteClient(clientActuel)}
          tutoMainJoueur={etape === "vente-nego"}
          mode="vente"
          persona={personaDepuisClient(clientActuel.persona)}
          celebrite={clientActuel.persona.archetypeId === "celebrite"}
          illustrationSrc={
            personaRevele
              ? getClientIllustration(clientActuel.persona.id)
              : CLIENT_SILHOUETTE
          }
          illustrationFacheSrc={
            personaRevele
              ? getClientIllustrationFache(clientActuel.persona.id)
              : undefined
          }
          echelleMax={clientActuel.prixDemande}
          cibleSecrete={clientActuel.prixMax}
          prixDepartAdverse={
            clientActuel.mode === "negociation" && negoVente
              ? negoVente.prixAdverseCourant
              : clientActuel.prixDemande
          }
          nego={clientActuel.mode === "negociation" ? negoVente : null}
          achat={sommePrixAchatPanier(clientActuel.panier)}
          nomAffiche={
            personaRevele
              ? nomAfficheClient(clientActuel.persona)
              : d.vente.clientInconnu[clientActuel.persona.genre]
          }
          /* Le genre reste visible même persona non révélé : on ne connaît
             pas encore la personne, mais on l'a devant soi. */
          genreAdverse={clientActuel.persona.genre}
          personaInfo={{
            nom: nomAfficheClient(clientActuel.persona),
            archetypeNom:
              clientActuel.persona.archetypeId === "celebrite"
                ? d.vente.celebrite
                : nomArchetypeClient(
                    clientActuel.persona.archetypeId,
                    clientActuel.persona.archetypeNom,
                    locale,
                  ),
            ambiance:
              clientActuel.persona.archetypeId === "celebrite"
                ? d.vente.celebriteAmbiance
                : ambianceClient(clientActuel.persona, locale),
            bourse: bourseDe(clientActuel.persona, brocante?.facteurBourse ?? 1),
            categoriesPreferees: clientActuel.persona.categoriesPreferees,
            categoriesEvitees: clientActuel.persona.categoriesEvitees,
            // Œil aiguisé ne révèle plus qu'une fourchette ; le prix exact
            // n'apparaît que via la révélation Diplomate.
            fourchettePrixMax: clientActuel.fourchettePrixMax,
            prixMax: revelationFaite ? clientActuel.prixMax : undefined,
            revelePersona: personaRevele,
            releveBourse: modifiersRef.current?.releveBourse ?? false,
            oeilAiguise:
              (modifiersRef.current?.oeilAiguise ?? false) || revelationFaite,
          }}
          header={
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {clientActuel.panier.map((p) => (
                <div
                  key={p.objet.id}
                  style={{
                    padding: "8px 10px",
                    background: "var(--paper-100)",
                    border: "1px solid var(--brass-700)",
                  }}
                >
                  <NegoItemRow
                    objet={p.objet}
                    prix={p.prixVente}
                    prixLabel={d.vente.prixDemandeLabel}
                  />
                </div>
              ))}
            </div>
          }
          onUpdateNego={setNegoVente}
          onConclu={(prixFinal) => {
            encaisserVente(clientActuel, prixFinal);
          }}
          onProposerOffre={handleOffreVente}
          venteDirecte={
            clientActuel.mode === "achat-direct"
              ? {
                  prixDirect: clientActuel.prixDemande,
                  onAccepter: () => handleAccepterAchatDirect(clientActuel),
                  onRefuser: () => terminerVisiteClient(clientActuel),
                  tutoMainAccepter: etape === "vente-directe",
                }
              : undefined
          }
          offreJoueur={offreJoueur}
          onChangeOffre={setOffreJoueur}
          bottomOffset="calc(76px + var(--safe-bottom))"
          scriptTuto={
            acheteurScripteRef.current
              ? {
                  cible: acheteurScripteRef.current.cibleOffre,
                  mainLaisserTomber: etape === "vente-refus",
                }
              : null
          }
          cibleCoachHumeur={leconHumeur === "visible"}
        />
      )}

      {leconHumeur === "visible" && (
        <TutorielCoach
          etapes={[{ cible: "vente-humeur", texte: d.tutoriel.coachVenteHumeur }]}
          onFini={() => setLeconHumeur("faite")}
        />
      )}

      {lotGarniOuvert && clientActuel && (
        <div style={lotGarniScrim} onClick={() => setLotGarniOuvert(false)} role="presentation">
          <div
            style={lotGarniCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={lotGarniHeader}>
              <span style={lotGarniTitle}>{d.vente.lotGarniChoisirTitre}</span>
              <button
                type="button"
                onClick={() => setLotGarniOuvert(false)}
                aria-label={d.commun.fermer}
                style={lotGarniCloseBtn}
              >
                ✕
              </button>
            </div>
            {objetsAjoutablesLotGarni.length === 0 ? (
              <p style={lotGarniEmpty}>{d.vente.lotGarniAucunAutre}</p>
            ) : (
              <ul style={lotGarniList}>
                {objetsAjoutablesLotGarni.map((o) => (
                  <li key={o.objet.id} style={lotGarniItemRow}>
                    <span style={lotGarniItemNom}>{nomObjet(o.objet, locale)}</span>
                    <button
                      type="button"
                      style={lotGarniItemBtn}
                      onClick={() => handleChoisirLotGarni(o)}
                    >
                      + {o.prixVente} €
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <DialogueOverlay
        sequence={dialogueTuto}
        nom={nomExpediteur("grand-pere", locale)}
        portraits={GRAND_PERE_PORTRAITS}
        onFini={() => {
          const idFini = dialogueTuto?.id;
          setDialogueTuto(null);
          if (etape === "coffre-trace-deux") {
            // Entrée de journée : le grand-père a présenté la vente.
            avancerTutoriel("vente-refus");
          } else if (dialogueApresRef.current) {
            // Débrief (« après ») d'une visite scriptée : avance vers
            // l'étape posée par le gestionnaire de fin de visite/vente.
            const vers = dialogueApresRef.current;
            dialogueApresRef.current = null;
            avancerTutoriel(vers);
          } else if (idFini && AVANT_VENTE_IDS.has(idFini)) {
            // « Avant » d'une visite scriptée : le client surgit presque
            // tout de suite (précédent La Criée l.409).
            prochainClientRef.current = 1.5;
          }
        }}
      />
    </div>
  );
}

function describePanier(
  ev: ClientEvent,
  d: DictionnaireUI,
  trFn: typeof tr,
  locale: Locale,
): string {
  if (ev.panier.length === 1) {
    return trFn(d.vente.panierUnique, {
      nom: nomObjet(ev.panier[0].objet, locale),
    });
  }
  return trFn(d.vente.panierPluriel, { n: ev.panier.length });
}

function Horloge({
  tempsRestant,
  progress,
}: {
  tempsRestant: number;
  progress: number;
}) {
  const { d } = useLangue();
  const sec = Math.ceil(tempsRestant);
  return (
    <div style={{ marginTop: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        <span>{d.vente.tempsRestantLabel}</span>
        <span>{sec}s</span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--paper-400)",
          marginTop: 6,
          border: "1px solid var(--brass-700)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            // Remplissage par `transform` (compositeur seul) plutôt que par
            // `width` : la barre vit toute la journée de vente, une transition
            // de largeur imposait layout + paint à chaque frame.
            transform: `scaleX(${progress / 100})`,
            transformOrigin: "left",
            background: "var(--forest-700)",
            // Le remplissage ne change qu'au changement de seconde entière (le
            // tick de 100 ms ne re-rend pas la page). La transition doit donc
            // couvrir toute la seconde : la barre glisse alors sans à-coups,
            // au lieu de bondir en 100 ms puis d'attendre 900 ms.
            transition: "transform 1s linear",
          }}
        />
      </div>
    </div>
  );
}

function ArticleSurEtal({
  templateId,
  nom,
  categorie,
  etat,
  rarete,
  prix,
}: {
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  etat: EtatObjet;
  rarete: Rarete;
  prix: number;
}) {
  return (
    <ItemCard
      templateId={templateId}
      categorie={categorie}
      etat={etat}
      rarete={rarete}
      nom={nom}
      footer={
        <div
          style={{
            paddingTop: 4,
            borderTop: "1px dotted var(--paper-500)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--forest-800)",
            textAlign: "right",
            padding: "4px 4px 0",
          }}
        >
          {prix}
          <span style={{ fontSize: 11, color: "var(--brass-700)" }}>€</span>
        </div>
      }
    />
  );
}

/* Mini-picker « Le Lot garni » : choix du 2e objet à ajouter au panier. */

const lotGarniScrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 70,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const lotGarniCard: CSSProperties = {
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow: "0 10px 30px rgba(15,30,22,0.4)",
  padding: 16,
  width: "100%",
  maxWidth: 360,
  maxHeight: "70dvh",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const lotGarniHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: 10,
  borderBottom: "1px solid var(--brass-500)",
  marginBottom: 6,
};

const lotGarniTitle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
};

const lotGarniCloseBtn: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--brass-700)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 4,
};

const lotGarniEmpty: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  color: "var(--ink-500)",
  fontSize: 13,
  textAlign: "center",
  margin: "10px 0",
};

const lotGarniList: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const lotGarniItemRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px dotted var(--paper-500)",
};

const lotGarniItemNom: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 13,
  color: "var(--ink-700)",
};

const lotGarniItemBtn: CSSProperties = {
  padding: "6px 10px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.06em",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  cursor: "pointer",
  flexShrink: 0,
};
