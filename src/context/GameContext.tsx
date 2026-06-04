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
  type CategorieObjet,
  type CompetenceId,
  type CompetenceTreeId,
  type EtatObjet,
  type GameState,
  type Objet,
  type ObjetEnVitrine,
  type Session,
} from "@/types/game";
import { createStarterInventory } from "@/data/starterInventory";
import { createGameRepository } from "@/lib/storage/createGameRepository";
import { migrerSauvegarde } from "@/lib/migrations";
import { PERIODE_TENDANCES_JOURS, PRIX_GAZETTE, genererTendances } from "@/lib/tendances";
import {
  catTreeId,
  emptyAllTrees,
  emptyTreeState,
  getCompetence,
} from "@/data/competences";
import { CATEGORIES, emptyPiecesAmelioration } from "@/data/categories";
import { recalculerPrixReference } from "@/lib/etat";
import {
  ID_LETTRE_MAMAN_DEBUT,
  creerLettreMamanDebut,
} from "@/lib/courrier";
import { prochainLundi } from "@/lib/calendrier";
import { appliquerGainXP } from "@/lib/xp";
import { aGenInfluence, peutRestaurerCategorie } from "@/lib/competences";
import { tirerMeteo, tirerMeteoSemaine, indexJourSemaine } from "@/lib/meteo";
import { tirerCelebrite } from "@/lib/celebrite";
import {
  getProchaineUpgradeStockage,
  getStockageTier,
  getStockageTierParNiveau,
} from "@/data/stockage";
import { stockageEstPlein } from "@/lib/stockage";
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
import { coutAmelioration, rendementDemantelement } from "@/lib/atelier";
import { audioManager } from "@/lib/audio/audioManager";

const gameRepository = createGameRepository();

interface GameContextValue {
  state: GameState | null;
  isHydrated: boolean;
  nouvellePartie: () => void;
  ajouterObjet: (objet: Objet) => void;
  retirerObjet: (id: string) => void;
  ajusterBudget: (delta: number) => void;
  avancerJour: (nbJours?: number, volontaire?: boolean) => void;
  reset: () => void;
  ouvrirVitrine: (brocanteId: string) => void;
  mettreEnVitrine: (objetId: string, prixVente: number) => void;
  retirerDeVitrine: (objetId: string) => void;
  ajusterPrixVitrine: (objetId: string, prixVente: number) => void;
  viderVitrine: () => void;
  vendreDeVitrine: (objetIds: string[], prixTotal: number) => void;
  enregistrerSession: (session: Session) => void;
  debloquerCompetence: (id: CompetenceId) => { ok: boolean; raison?: string };
  restaurerObjet: (
    objetId: string,
    etatCible: EtatObjet,
    options?: { dureeJours?: number },
  ) => { ok: boolean; raison?: string };
  demantelerObjet: (objetId: string) => {
    ok: boolean;
    raison?: string;
    pieces?: number;
  };
  ameliorerAtelier: () => { ok: boolean; raison?: string };
  ameliorerStockage: () => { ok: boolean; raison?: string };
  definirPrixVenteSouhaite: (objetId: string, prix: number) => void;
  gagnerXP: (treeId: CompetenceTreeId, montant: number) => void;
  marquerVuTemplate: (templateId: string) => void;
  marquerVuDansCollection: (templateId: string) => void;
  marquerDejaPossedeTemplate: (templateId: string) => void;
  donnerACollection: (objetId: string) => { ok: boolean; raison?: string };
  retirerDeCollection: (templateId: string) => { ok: boolean; raison?: string };
  acheterGazette: () => { ok: boolean; raison?: string };
  marquerBossDebloqueVu: () => void;
  /** Influence (compétence Vision 3) : retire la météo du jour. */
  rerollMeteo: () => { ok: boolean; raison?: string };
  /** Influence (compétence Vision 3) : retire la brocante de la célébrité courante. */
  rerollCelebrite: () => { ok: boolean; raison?: string };
  /** Marque un courrier comme lu (utilisé par le QG). */
  marquerCourrierLu: (id: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const stateRef = useRef<GameState | null>(null);
  stateRef.current = state;

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
    gameRepository.save(state);
  }, [state, isHydrated]);

  const nouvellePartie = useCallback(() => {
    setState({
      budget: INITIAL_BUDGET,
      jourActuel: INITIAL_JOUR,
      inventaireJoueur: createStarterInventory(),
      vitrine: null,
      historique: [],
      tendances: genererTendances(),
      prochainesTendances: genererTendances(),
      prochainRafraichissementTendances: prochainLundi(INITIAL_JOUR + 1),
      competenceTrees: emptyAllTrees(),
      competencesDebloquees: [],
      collection: initCollection(),
      gazetteAchetee: false,
      bossDebloqueSeen: false,
      meteoSemaine: tirerMeteoSemaine(),
      celebriteActuelle: tirerCelebrite(),
      influenceUtilisee: false,
      dernierLoyer: null,
      courriers: [creerLettreMamanDebut(INITIAL_JOUR)],
      niveauAtelier: 1,
      niveauStockage: 1,
      piecesAmelioration: emptyPiecesAmelioration(),
      chatSurFauteuil: false,
      passagesSansChat: 0,
      declencheursDeclenches: [ID_LETTRE_MAMAN_DEBUT],
    });
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
      const inv = prev.inventaireJoueur.map((o) => {
        if (o.enRestauration && nouveauJour >= o.enRestauration.jourFin) {
          const cible = o.enRestauration.etatCible;
          return {
            ...o,
            etat: cible,
            prixReferenceReel: recalculerPrixReference(
              o.prixReferenceReel,
              o.etat,
              cible,
            ),
            enRestauration: undefined,
          };
        }
        return o;
      });
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
      const budgetApresLoyer = tierStockage
        ? prev.budget - tierStockage.loyerHebdo
        : prev.budget;
      const dernierLoyer = tierStockage
        ? {
            jour: nouveauJour,
            montant: tierStockage.loyerHebdo,
            tierNom: tierStockage.nom,
          }
        : prev.dernierLoyer;

      return {
        ...prev,
        jourActuel: nouveauJour,
        inventaireJoueur: inv,
        budget: budgetApresLoyer,
        tendances,
        prochainesTendances,
        prochainRafraichissementTendances: refresh
          ? prochainLundi(nouveauJour + 1)
          : prev.prochainRafraichissementTendances,
        // Reset l'achat de la Gazette à chaque nouvelle édition.
        gazetteAchetee: refresh ? false : prev.gazetteAchetee,
        // Météo : la semaine entière est pré-tirée à chaque refresh hebdo.
        meteoSemaine: refresh ? tirerMeteoSemaine() : prev.meteoSemaine,
        // Célébrité : nouvelle à chaque édition de la Gazette.
        celebriteActuelle: refresh ? tirerCelebrite() : prev.celebriteActuelle,
        // Reset le jeton d'influence à chaque édition.
        influenceUtilisee: refresh ? false : prev.influenceUtilisee,
        dernierLoyer,
        chatSurFauteuil,
        passagesSansChat,
      };
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
    setState((prev) =>
      prev
        ? {
            ...prev,
            budget: prev.budget - upgrade.cout,
            niveauAtelier: upgrade.niveauCible,
          }
        : prev,
    );
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
    setState((prev) =>
      prev
        ? {
            ...prev,
            budget: prev.budget - upgrade.cout,
            niveauStockage: upgrade.niveauCible,
          }
        : prev,
    );
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

  const mettreEnVitrine = useCallback((objetId: string, prixVente: number) => {
    setState((prev) => {
      if (!prev || !prev.vitrine) return prev;
      const objet = prev.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet) return prev;
      const nouvelEntree: ObjetEnVitrine = { objet, prixVente };
      return {
        ...prev,
        inventaireJoueur: prev.inventaireJoueur.filter((o) => o.id !== objetId),
        vitrine: {
          ...prev.vitrine,
          objets: [...prev.vitrine.objets, nouvelEntree],
        },
      };
    });
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

  const enregistrerSession = useCallback((session: Session) => {
    setState((prev) =>
      prev ? { ...prev, historique: [session, ...prev.historique] } : prev,
    );
  }, []);

  const debloquerCompetence = useCallback(
    (id: CompetenceId): { ok: boolean; raison?: string } => {
      const comp = getCompetence(id);
      if (!comp) return { ok: false, raison: "Compétence introuvable." };

      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie en cours." };
      if (current.competencesDebloquees.includes(id))
        return { ok: false, raison: "Déjà débloquée." };

      const tree = current.competenceTrees[comp.treeId] ?? emptyTreeState();
      if (tree.niveau < comp.niveauRequis)
        return {
          ok: false,
          raison: `Niveau ${comp.niveauRequis} requis dans cet arbre.`,
        };
      if (tree.pointsDisponibles < comp.coutPoints)
        return { ok: false, raison: "Pas assez de points." };
      const prereqOk = comp.prerequis.every((p) =>
        current.competencesDebloquees.includes(p),
      );
      if (!prereqOk) return { ok: false, raison: "Prérequis non remplis." };

      setState((prev) => {
        if (!prev) return prev;
        const treePrev = prev.competenceTrees[comp.treeId] ?? emptyTreeState();
        return {
          ...prev,
          competenceTrees: {
            ...prev.competenceTrees,
            [comp.treeId]: {
              ...treePrev,
              pointsDisponibles: treePrev.pointsDisponibles - comp.coutPoints,
            },
          },
          competencesDebloquees: [...prev.competencesDebloquees, id],
        };
      });
      return { ok: true };
    },
    [],
  );

  const restaurerObjet = useCallback(
    (
      objetId: string,
      etatCible: EtatObjet,
      options: { dureeJours?: number } = {},
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

      const duree = Math.max(1, options.dureeJours ?? 7);
      const jourFin = current.jourActuel + duree;

      setState((prev) => {
        if (!prev) return prev;
        const inv = prev.inventaireJoueur.map((o) =>
          o.id === objetId
            ? { ...o, enRestauration: { etatCible, jourFin } }
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
    [],
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

  const gagnerXP = useCallback(
    (treeId: CompetenceTreeId, montant: number) => {
      if (montant <= 0) return;
      setState((prev) => {
        if (!prev) return prev;
        const tree = prev.competenceTrees[treeId] ?? emptyTreeState();
        return {
          ...prev,
          competenceTrees: {
            ...prev.competenceTrees,
            [treeId]: appliquerGainXP(tree, montant),
          },
        };
      });
    },
    [],
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
    setState((prev) =>
      prev
        ? { ...prev, collection: marquerDejaPossedeFn(prev.collection, templateId) }
        : prev,
    );
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
              prixReferenceReel: ancienne.valeur,
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
              prixReferenceReel: ancienne.valeur,
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

  const marquerCourrierLu = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const cible = prev.courriers.find((c) => c.id === id);
      if (!cible || cible.lu) return prev;
      // Récompense (argent) appliquée à la lecture si la lettre en porte une.
      let nouveauBudget = prev.budget;
      if (cible.payload.type === "lettre" && cible.payload.recompense) {
        if (typeof cible.payload.recompense.argent === "number") {
          nouveauBudget += cible.payload.recompense.argent;
        }
      }
      const next = prev.courriers.map((c) =>
        c.id === id ? { ...c, lu: true } : c,
      );
      return { ...prev, courriers: next, budget: nouveauBudget };
    });
  }, []);

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
    setState((prev) =>
      prev
        ? {
            ...prev,
            budget: prev.budget - PRIX_GAZETTE,
            gazetteAchetee: true,
          }
        : prev,
    );
    return { ok: true };
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      isHydrated,
      nouvellePartie,
      ajouterObjet,
      retirerObjet,
      ajusterBudget,
      avancerJour,
      reset,
      ouvrirVitrine,
      mettreEnVitrine,
      retirerDeVitrine,
      ajusterPrixVitrine,
      viderVitrine,
      vendreDeVitrine,
      enregistrerSession,
      debloquerCompetence,
      restaurerObjet,
      demantelerObjet,
      ameliorerAtelier,
      ameliorerStockage,
      definirPrixVenteSouhaite,
      gagnerXP,
      marquerVuTemplate,
      marquerVuDansCollection,
      marquerDejaPossedeTemplate,
      donnerACollection,
      retirerDeCollection,
      acheterGazette,
      marquerBossDebloqueVu,
      rerollMeteo,
      rerollCelebrite,
      marquerCourrierLu,
    }),
    [
      state,
      isHydrated,
      nouvellePartie,
      ajouterObjet,
      retirerObjet,
      ajusterBudget,
      avancerJour,
      reset,
      ouvrirVitrine,
      mettreEnVitrine,
      retirerDeVitrine,
      ajusterPrixVitrine,
      viderVitrine,
      vendreDeVitrine,
      enregistrerSession,
      debloquerCompetence,
      restaurerObjet,
      demantelerObjet,
      ameliorerAtelier,
      ameliorerStockage,
      definirPrixVenteSouhaite,
      gagnerXP,
      marquerVuTemplate,
      marquerVuDansCollection,
      marquerDejaPossedeTemplate,
      donnerACollection,
      retirerDeCollection,
      acheterGazette,
      marquerBossDebloqueVu,
      rerollMeteo,
      rerollCelebrite,
      marquerCourrierLu,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame doit être utilisé dans un <GameProvider>");
  return ctx;
}
