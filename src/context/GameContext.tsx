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
  type CompetenceTreeId,
  type EtatObjet,
  type GameState,
  type Objet,
  type ObjetEnVitrine,
  type Session,
} from "@/types/game";
import { createStarterInventory } from "@/data/starterInventory";
import { localGameRepository } from "@/lib/storage/localGameRepository";
import { PERIODE_TENDANCES_JOURS, genererTendances } from "@/lib/tendances";
import {
  COMPETENCES,
  catTreeId,
  emptyAllTrees,
  emptyTreeState,
  getCompetence,
} from "@/data/competences";
import { CATEGORIES, migrerCategorie } from "@/data/categories";
import { recalculerPrixReference } from "@/lib/etat";

const ETATS_VALIDES = new Set<EtatObjet>([
  "Mauvais",
  "Bon",
  "Très bon",
  "Pristin état",
]);
function migrerEtat(etat: string): EtatObjet {
  if (ETATS_VALIDES.has(etat as EtatObjet)) return etat as EtatObjet;
  // Ancienne valeur "Comme neuf" → "Très bon".
  if (etat === "Comme neuf") return "Très bon";
  return "Bon";
}
import { appliquerGainXP } from "@/lib/xp";
import { aGenDevin, peutRestaurerCategorie } from "@/lib/competences";
import {
  initCatalogue,
  marquerPossedeTemplate as marquerPossedeFn,
  marquerVuTemplate as marquerVuFn,
} from "@/lib/catalogue";

interface GameContextValue {
  state: GameState | null;
  isHydrated: boolean;
  nouvellePartie: () => void;
  ajouterObjet: (objet: Objet) => void;
  retirerObjet: (id: string) => void;
  ajusterBudget: (delta: number) => void;
  avancerJour: (nbJours?: number) => void;
  reset: () => void;
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
  gagnerXP: (treeId: CompetenceTreeId, montant: number) => void;
  marquerVuTemplate: (templateId: string) => void;
  marquerPossedeTemplate: (templateId: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Migration des sauvegardes : remappe les anciennes catégories vers les nouvelles
 * et reset les arbres de compétences (les IDs `cat.<ancienne>` sont obsolètes).
 */
function migrerSauvegarde(loaded: GameState): GameState {
  const VALID_CATS = new Set<string>(CATEGORIES);
  const categoriesObsolètes =
    loaded.inventaireJoueur?.some((o) => !VALID_CATS.has(o.categorie)) ||
    loaded.vitrine?.some((v) => !VALID_CATS.has(v.objet.categorie)) ||
    loaded.tendances?.some((t) => !VALID_CATS.has(t.categorie));

  const inventaire = (loaded.inventaireJoueur ?? []).map((o) => ({
    ...o,
    categorie: migrerCategorie(o.categorie),
    etat: migrerEtat(o.etat),
    templateId: o.templateId ?? `legacy.${(o.nom ?? "objet").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    rarete: o.rarete ?? "commun",
  }));

  const vitrine = (loaded.vitrine ?? []).map((v) => ({
    ...v,
    objet: {
      ...v.objet,
      categorie: migrerCategorie(v.objet.categorie),
      etat: migrerEtat(v.objet.etat),
      templateId:
        v.objet.templateId ??
        `legacy.${(v.objet.nom ?? "objet").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      rarete: v.objet.rarete ?? "commun",
    },
  }));

  const historique = (loaded.historique ?? []).map((s) => {
    if (s.type === "chinage") {
      return {
        ...s,
        achats: s.achats.map((a) => ({
          ...a,
          categorie: migrerCategorie(a.categorie),
          etat: migrerEtat(a.etat),
        })),
      };
    }
    return {
      ...s,
      ventes: s.ventes.map((v) => ({
        ...v,
        categorie: migrerCategorie(v.categorie),
        etat: migrerEtat(v.etat),
      })),
    };
  });

  // Purge les compétences débloquées dont l'ID n'existe plus dans le catalogue.
  const validIds = new Set(COMPETENCES.map((c) => c.id));
  const competencesValides = (loaded.competencesDebloquees ?? []).filter((id) =>
    validIds.has(id),
  );
  const idsObsoletes =
    (loaded.competencesDebloquees ?? []).length !== competencesValides.length;

  // Si schéma cat obsolète OU IDs de comp obsolètes, on reset les arbres (XP, points perdus).
  const resetTrees = categoriesObsolètes || idsObsoletes;
  const trees = resetTrees
    ? emptyAllTrees()
    : loaded.competenceTrees && Object.keys(loaded.competenceTrees).length > 0
    ? loaded.competenceTrees
    : emptyAllTrees();

  const competencesDebloquees = resetTrees ? [] : competencesValides;

  // Catalogue : initialise + reconstitue les possessions à partir de l'inventaire migré
  let catalogue =
    loaded.catalogue && Object.keys(loaded.catalogue).length > 0
      ? loaded.catalogue
      : initCatalogue();
  if (!loaded.catalogue) {
    for (const o of inventaire) {
      catalogue = marquerPossedeFn(catalogue, o.templateId);
    }
    for (const v of vitrine) {
      catalogue = marquerPossedeFn(catalogue, v.objet.templateId);
    }
  }

  return {
    ...loaded,
    inventaireJoueur: inventaire,
    vitrine,
    historique,
    tendances:
      loaded.tendances && loaded.tendances.length > 0 && !categoriesObsolètes
        ? loaded.tendances
        : genererTendances(),
    prochainesTendances:
      loaded.prochainesTendances &&
      loaded.prochainesTendances.length > 0 &&
      !categoriesObsolètes
        ? loaded.prochainesTendances
        : genererTendances(),
    prochainRafraichissementTendances:
      loaded.prochainRafraichissementTendances ??
      (loaded.jourActuel ?? INITIAL_JOUR) + PERIODE_TENDANCES_JOURS,
    competenceTrees: trees,
    competencesDebloquees,
    catalogue,
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const stateRef = useRef<GameState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    localGameRepository.load().then((loaded) => {
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
    localGameRepository.save(state);
  }, [state, isHydrated]);

  const nouvellePartie = useCallback(() => {
    setState({
      budget: INITIAL_BUDGET,
      jourActuel: INITIAL_JOUR,
      inventaireJoueur: createStarterInventory(),
      vitrine: [],
      historique: [],
      tendances: genererTendances(),
      prochainesTendances: genererTendances(),
      prochainRafraichissementTendances: INITIAL_JOUR + PERIODE_TENDANCES_JOURS,
      competenceTrees: emptyAllTrees(),
      competencesDebloquees: [],
      catalogue: initCatalogue(),
    });
    router.push("/qg");
  }, [router]);

  const ajouterObjet = useCallback((objet: Objet) => {
    setState((prev) =>
      prev ? { ...prev, inventaireJoueur: [...prev.inventaireJoueur, objet] } : prev,
    );
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

  const avancerJour = useCallback((nbJours: number = 1) => {
    setState((prev) => {
      if (!prev) return prev;
      const nouveauJour = prev.jourActuel + Math.max(1, nbJours);
      const refresh = nouveauJour >= prev.prochainRafraichissementTendances;
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
      const devin = aGenDevin(prev);
      // Au refresh, les prochaines deviennent les courantes et on régénère un nouveau futur.
      const tendances = refresh
        ? (prev.prochainesTendances && prev.prochainesTendances.length > 0
            ? prev.prochainesTendances
            : genererTendances({ garantirPositifFort: devin }))
        : prev.tendances;
      const prochainesTendances = refresh
        ? genererTendances({ garantirPositifFort: devin })
        : prev.prochainesTendances;
      return {
        ...prev,
        jourActuel: nouveauJour,
        inventaireJoueur: inv,
        tendances,
        prochainesTendances,
        prochainRafraichissementTendances: refresh
          ? nouveauJour + PERIODE_TENDANCES_JOURS
          : prev.prochainRafraichissementTendances,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(null);
    localGameRepository.clear();
  }, []);

  const mettreEnVitrine = useCallback((objetId: string, prixVente: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const objet = prev.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet) return prev;
      const nouvelEntree: ObjetEnVitrine = { objet, prixVente };
      return {
        ...prev,
        inventaireJoueur: prev.inventaireJoueur.filter((o) => o.id !== objetId),
        vitrine: [...prev.vitrine, nouvelEntree],
      };
    });
  }, []);

  const retirerDeVitrine = useCallback((objetId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const entree = prev.vitrine.find((e) => e.objet.id === objetId);
      if (!entree) return prev;
      return {
        ...prev,
        vitrine: prev.vitrine.filter((e) => e.objet.id !== objetId),
        inventaireJoueur: [...prev.inventaireJoueur, entree.objet],
      };
    });
  }, []);

  const ajusterPrixVitrine = useCallback(
    (objetId: string, prixVente: number) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              vitrine: prev.vitrine.map((e) =>
                e.objet.id === objetId ? { ...e, prixVente } : e,
              ),
            }
          : prev,
      );
    },
    [],
  );

  const viderVitrine = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        inventaireJoueur: [
          ...prev.inventaireJoueur,
          ...prev.vitrine.map((e) => e.objet),
        ],
        vitrine: [],
      };
    });
  }, []);

  const vendreDeVitrine = useCallback(
    (objetIds: string[], prixTotal: number) => {
      setState((prev) => {
        if (!prev) return prev;
        const ids = new Set(objetIds);
        return {
          ...prev,
          vitrine: prev.vitrine.filter((e) => !ids.has(e.objet.id)),
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
      if (!peutRestaurerCategorie(current, objet.categorie))
        return {
          ok: false,
          raison: `Vous n'avez pas la compétence Réparer — ${objet.categorie}.`,
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
        return { ...prev, inventaireJoueur: inv };
      });
      return { ok: true };
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
        ? { ...prev, catalogue: marquerVuFn(prev.catalogue, templateId) }
        : prev,
    );
  }, []);

  const marquerPossedeTemplate = useCallback((templateId: string) => {
    setState((prev) =>
      prev
        ? { ...prev, catalogue: marquerPossedeFn(prev.catalogue, templateId) }
        : prev,
    );
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
      mettreEnVitrine,
      retirerDeVitrine,
      ajusterPrixVitrine,
      viderVitrine,
      vendreDeVitrine,
      enregistrerSession,
      debloquerCompetence,
      restaurerObjet,
      gagnerXP,
      marquerVuTemplate,
      marquerPossedeTemplate,
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
      mettreEnVitrine,
      retirerDeVitrine,
      ajusterPrixVitrine,
      viderVitrine,
      vendreDeVitrine,
      enregistrerSession,
      debloquerCompetence,
      restaurerObjet,
      gagnerXP,
      marquerVuTemplate,
      marquerPossedeTemplate,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame doit être utilisé dans un <GameProvider>");
  return ctx;
}
