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
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { ActionFab } from "@/components/mobile/ActionFab";
import { Button } from "@/components/ui/Button";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { ItemCard } from "@/components/ui/ItemCard";
import { SessionSummary } from "@/components/SessionSummary";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import {
  DEFAULT_MODIFIERS,
  JOURNEE_DUREE_SECONDES,
  ajouterAuPanier,
  bourseDe,
  genererClientEvent,
  personaDepuisClient,
  prochainIntervalleClient,
  proposerOffreVente,
  type ClientEvent,
  type VitrineModifiers,
} from "@/lib/vitrine";
import { ouvrirNegociation } from "@/lib/negociation";
import { activeDebloquee, usagesRestants } from "@/lib/actives";
import { NegociationSheet } from "@/components/mobile/NegociationSheet";
import { NegoItemRow } from "@/components/mobile/NegoItemRow";
import type { NegociationState } from "@/types/game";
import { genererPoolClients, type ClientPersonnage } from "@/data/clients";
import { getBrocanteById, fraisEntree } from "@/data/brocantes";
import { useXpFloats, XpFloatsVue } from "@/components/mobile/XpFloats";
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
  bonusToleranceCategorie,
  bonusToleranceNegoGeneral,
} from "@/lib/competences";
import { CATEGORIES } from "@/data/categories";
import { METEO_INTERVALLE_MULT } from "@/data/meteos";
import { indexJourSemaine, meteoDuJour } from "@/lib/meteo";
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
} from "@/lib/i18n/contenu";
import type { Locale } from "@/lib/i18n/locales";
import type {
  CategorieObjet,
  EtatObjet,
  NiveauCamion,
  ObjetEnVitrine,
  Rarete,
  VenteHistorique,
} from "@/types/game";

const TICK_MS = 100;
// Active de vente 📣 La Criée (N17) : fait défiler 3 clients coup sur coup,
// à intervalle fixe qui ignore l'intervalle normal ET le multiplicateur météo.
const CRIEE_NB_CLIENTS = 3;
const CRIEE_INTERVALLE_SEC = 1;

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
  } = useGame();
  const { d, tr, locale } = useLangue();
  const { startCrowd, stopCrowd } = useSettings();

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
    const bonusToleranceParCategorie = new Map<CategorieObjet, number>();
    for (const c of CATEGORIES) {
      const p = bonusPassionCategorie(state, c);
      if (p > 0) bonusPassionParCategorie.set(c, p);
      const t = bonusToleranceCategorie(state, c);
      if (t > 0) bonusToleranceParCategorie.set(c, t);
    }
    modifiersRef.current = {
      bonusPassionParCategorie,
      bonusToleranceParCategorie,
      bonusToleranceNego: bonusToleranceNegoGeneral(state),
      intervalleMultiplier:
        (aGenPresentationSoignee(state) ? 0.75 : 1) *
        METEO_INTERVALLE_MULT[meteoDuJour(state)],
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
  const [journeeFinie, setJourneeFinie] = useState(false);
  const [ventesEffectuees, setVentesEffectuees] = useState<VenteHistorique[]>([]);
  const [fancyClientApparu, setFancyClientApparu] = useState(false);
  const [revelationFaite, setRevelationFaite] = useState(false);
  /** Le Lot garni (N7) : mini-picker ouvert pour choisir le 2e objet à ajouter au panier. */
  const [lotGarniOuvert, setLotGarniOuvert] = useState(false);
  const [bravoTout, setBravoTout] = useState(false);
  /** XP de Brocanteur gagnée localement durant la session. */
  const [xpBrocanteurSession, setXpBrocanteurSession] = useState(0);

  const { floats, pousserXp } = useXpFloats();

  const gagnerXPLocal = (montant: number) => {
    gagnerXPBrocanteur(montant);
    setXpBrocanteurSession((prev) => prev + montant);
    pousserXp(montant);
  };
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

  // Active de vente 📣 La Criée (N17) : nombre de clients restants à faire
  // défiler « coup sur coup » une fois déclenchée (cf. bloc de spawn du tick).
  const crieeRestantsRef = useRef(0);

  /** Calcule le prochain état de négo pour une contre-offre du joueur, en
   *  passant par `proposerOffreVente` : tolérance boostée (Verbe haut/d'or,
   *  Œil aiguisé) ET sauvetage Diplomate (quota persistant via les actives)
   *  au lieu de l'ancien `proposerOffre` brut appelé par le sheet. */
  const handleOffreVente = useCallback(
    (nego: NegociationState, offre: number): NegociationState => {
      const ev = clientActuelRef.current;
      const mods = modifiersRef.current ?? DEFAULT_MODIFIERS;
      if (!ev) return nego;
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
      // Vitrine vide : si la journée a démarré (standSnapshot posé), c'est que
      // tout a été vendu — on clôture pour afficher le résumé. Sinon (arrivée
      // sur la page sans préparation), on renvoie à la prépa.
      if (standSnapshot.current) {
        terminerJourneeRef.current();
      } else {
        router.replace(`/vitrine/${brocante.id}`);
      }
    }
  }, [isHydrated, state, router, journeeFinie, brocante]);

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
        timestamp: Date.now(),
        niveauCamion: standSnapshot.current.niveau,
        loyer: standSnapshot.current.loyer,
        ventes: ventesEffectuees,
        invendus: tailleInvendus,
        xpGagne: {},
        xpBrocanteur: xpBrocanteurSession,
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
    xpBrocanteurSession,
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
      // En pause si un client est devant nous
      if (clientActuelRef.current) return;

      // Updater pur : ni écriture de ref, ni effet de bord (setTimeout) ici —
      // la synchro de tempsRestantRef et le déclenchement de fin de journée
      // sont délégués à des useEffect dédiés ci-dessous, réagissant au
      // changement de `tempsRestant`.
      setTempsRestant((t) => Math.max(0, t - TICK_MS / 1000));

      // Décrémente le compte à rebours du prochain client en JS pur (ref, pas
      // de useState) : le spawn ci-dessous déclenche des setState externes
      // (marquerVuTemplate sur GameContext) et locaux, qui doivent s'exécuter
      // en code normal dans ce tick — pas imbriqués dans le callback d'un
      // updater React, cf. commentaire sur prochainClientRef plus haut.
      {
        const next = prochainClientRef.current! - TICK_MS / 1000;
        if (next <= 0) {
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
            setClientActuel(ev);
            setRevelationFaite(false);
            if (ev.mode === "negociation") {
              setNegoVente(ouvrirNegociation("vente", ev.offreInitiale, ev.prixMax));
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
    if (tempsRestant !== 0) return;
    if (finDeclencheeRef.current) return;
    finDeclencheeRef.current = true;
    terminerJournee();
  }, [tempsRestant, terminerJournee]);

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
      tempsRestant < JOURNEE_DUREE_SECONDES
    ) {
      setBravoTout(true);
      ajouterJournal({
        heure: heureCourante(),
        texte: d.vente.journalEcoule,
        ton: "vente",
      });
      terminerJournee();
    }
  }, [state, isHydrated, journeeFinie, tempsRestant, terminerJournee, ajouterJournal, heureCourante, d]);

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
    gagnerXPLocal(XP_JUSTE_PRIX);
    ajouterJournal({
      heure: heureCourante(),
      texte: tr(d.vente.journalAchete, {
        nom: nomAfficheClient(ev.persona),
        panier: describePanier(ev, d, tr, locale),
        prix: ev.prixDemande,
      }),
      ton: "vente",
    });
    setClientActuel(null);
    setLotGarniOuvert(false);
  };

  const encaisserVente = (ev: ClientEvent, prixFinal: number) => {
    vendreDeVitrine(
      ev.panier.map((p) => p.objet.id),
      prixFinal,
    );
    enregistrerVentes(ev, prixFinal);
    gagnerXPLocal(XP_NEGO_BROCANTEUR);
    ajouterJournal({
      heure: heureCourante(),
      texte: tr(d.vente.journalAccepte, {
        nom: nomAfficheClient(ev.persona),
        panier: describePanier(ev, d, tr, locale),
        prix: prixFinal,
      }),
      ton: "vente",
    });
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
    setClientActuel(null);
    setNegoVente(null);
    setLotGarniOuvert(false);
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

  if (journeeFinie) {
    return (
      <SessionSummary
        type="vente"
        titre={
          bravoTout
            ? d.vente.bravoEtalVide
            : tr(
                totalVentes > 1
                  ? d.vente.titreJourneeVentes
                  : d.vente.titreJourneeUneVente,
                { n: totalVentes },
              )
        }
        sousTitre={
          bravoTout
            ? undefined
            : totalVentes === 0
              ? d.vente.journeeSansVente
              : undefined
        }
        bravo={bravoTout}
        items={ventesEffectuees.map((v) => ({
          templateId: v.templateId,
          nom: v.nom,
          categorie: v.categorie,
          prix: v.prixVente,
        }))}
        xpGagne={{}}
        xpBrocanteur={xpBrocanteurSession}
        onRetour={handleRetourQg}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper-100)",
      }}
    >
      <MobileHeader budget={state.budget} />
      <XpFloatsVue floats={floats} />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 12px calc(80px + var(--safe-bottom))",
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
          {activeDebloquee(state, "criee") && (
            <div style={{ marginTop: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={jouerCriee}
                disabled={
                  !!clientActuel ||
                  tempsRestant < CRIEE_INTERVALLE_SEC * CRIEE_NB_CLIENTS ||
                  usagesRestants(state.activesUtilisees, "criee", state.jourActuel, state.brocanteur.niveau) === 0
                }
              >
                {`📣 ${libelleActive("criee", d)} (${usagesRestants(
                  state.activesUtilisees,
                  "criee",
                  state.jourActuel,
                  state.brocanteur.niveau,
                )})`}
              </Button>
            </div>
          )}
        </section>

        {/* Articles sur l'étal */}
        {(state.vitrine?.objets.length ?? 0) === 0 ? (
          <p
            style={{
              textAlign: "center",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
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

        {/* Journal */}
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
              fontFamily: "var(--font-display)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              marginBottom: 8,
            }}
          >
            {d.vente.journalDeBord}
          </div>
          {journal.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 13,
                textAlign: "center",
                margin: "10px 0",
              }}
            >
              {d.vente.journalVide}
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[...journal].reverse().map((j, i, arr) => (
                <li
                  key={j.id}
                  style={{
                    padding: "7px 0",
                    borderBottom:
                      i < arr.length - 1
                        ? "1px dotted var(--paper-500)"
                        : "none",
                    display: "flex",
                    gap: 8,
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      color: "var(--brass-700)",
                      textTransform: "uppercase",
                      flexShrink: 0,
                      width: 44,
                    }}
                  >
                    {j.heure}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: j.ton === "info" ? "italic" : "normal",
                      fontSize: 13,
                      lineHeight: 1.4,
                      color:
                        j.ton === "vente"
                          ? "var(--forest-700)"
                          : j.ton === "echec"
                          ? "var(--vermillion-600)"
                          : "var(--ink-700)",
                    }}
                  >
                    {j.texte}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <ActionFab
        buttons={[
          {
            label: d.vente.baisserRideau,
            variant: "secondary",
            onClick: handleFermerEnAvance,
          },
        ]}
      />

      {clientActuel && !journeeFinie && (
        <NegociationSheet
          open={true}
          onClose={() => terminerVisiteClient(clientActuel)}
          mode="vente"
          persona={personaDepuisClient(clientActuel.persona)}
          echelleMax={clientActuel.prixDemande}
          cibleSecrete={clientActuel.prixMax}
          prixDepartAdverse={
            clientActuel.mode === "negociation" && negoVente
              ? negoVente.prixAdverseCourant
              : clientActuel.prixDemande
          }
          nego={clientActuel.mode === "negociation" ? negoVente : null}
          nomAffiche={
            modifiersRef.current?.revelePersona ||
            clientActuel.persona.archetypeId === "celebrite"
              ? nomAfficheClient(clientActuel.persona)
              : d.vente.clientInconnu
          }
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
            bourse: bourseDe(clientActuel.persona),
            // Œil aiguisé ne révèle plus qu'une fourchette ; le prix exact
            // n'apparaît que via la révélation Diplomate.
            fourchettePrixMax: clientActuel.fourchettePrixMax,
            prixMax: revelationFaite ? clientActuel.prixMax : undefined,
            revelePersona:
              (modifiersRef.current?.revelePersona ?? false) ||
              clientActuel.persona.archetypeId === "celebrite",
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
                }
              : undefined
          }
          boniment={
            clientActuel.mode === "negociation" &&
            activeDebloquee(state, "boniment")
              ? {
                  restantes: usagesRestants(
                    state.activesUtilisees,
                    "boniment",
                    state.jourActuel,
                    state.brocanteur.niveau,
                  ),
                  consommer: () => utiliserActive("boniment"),
                }
              : undefined
          }
          lotGarni={
            clientActuel.mode === "negociation" &&
            activeDebloquee(state, "lotGarni") &&
            clientActuel.panier.length < 2 &&
            objetsAjoutablesLotGarni.length > 0
              ? {
                  restantes: usagesRestants(
                    state.activesUtilisees,
                    "lotGarni",
                    state.jourActuel,
                    state.brocanteur.niveau,
                  ),
                  onOuvrir: () => setLotGarniOuvert(true),
                }
              : undefined
          }
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
            width: `${progress}%`,
            background: "var(--forest-700)",
            transition: "width 100ms linear",
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

function FinDeJournee({
  ventes,
  onRetour,
}: {
  ventes: number;
  onRetour: () => void;
}) {
  const { d, tr } = useLangue();
  return (
    <div style={{ marginTop: 24, textAlign: "center" }}>
      <DecoDivider />
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 17,
          color: "var(--ink-700)",
          margin: "18px 0 8px",
        }}
      >
        {ventes === 0
          ? d.vente.journeeSansVente
          : ventes === 1
          ? d.vente.journeeUneVente
          : tr(d.vente.journeeVentesInscrites, { n: ventes })}
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
          marginBottom: 18,
        }}
      >
        {d.vente.invendusRetour}
      </p>
      <Button variant="primary" size="lg" onClick={onRetour}>
        {d.vente.rentrerQg}
      </Button>
    </div>
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
