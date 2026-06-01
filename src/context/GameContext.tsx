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
  type CollectionSlot,
  type CompetenceId,
  type CompetenceTreeId,
  type EtatObjet,
  type GameState,
  type HuissierEvent,
  type Objet,
  type ObjetEnVitrine,
  type SaisieHuissier,
  type Session,
  type VitrineActive,
} from "@/types/game";
import { createStarterInventory } from "@/data/starterInventory";
import { localGameRepository } from "@/lib/storage/localGameRepository";
import { PERIODE_TENDANCES_JOURS, PRIX_GAZETTE, genererTendances } from "@/lib/tendances";
import {
  COMPETENCES,
  catTreeId,
  emptyAllTrees,
  emptyTreeState,
  getCompetence,
} from "@/data/competences";
import { CATEGORIES, migrerCategorie, emptyPiecesAmelioration } from "@/data/categories";
import { recalculerPrixReference } from "@/lib/etat";
import { creerCourrierHuissier, migrerCourriers } from "@/lib/courrier";

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

interface GameContextValue {
  state: GameState | null;
  isHydrated: boolean;
  nouvellePartie: () => void;
  ajouterObjet: (objet: Objet) => void;
  retirerObjet: (id: string) => void;
  ajusterBudget: (delta: number) => void;
  avancerJour: (nbJours?: number) => void;
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
  /** Acquitte l'événement huissier (réinitialise dernierHuissier). */
  marquerHuissierVu: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Migration des sauvegardes : remappe les anciennes catégories vers les nouvelles
 * et reset les arbres de compétences (les IDs `cat.<ancienne>` sont obsolètes).
 */
function migrerSauvegarde(loaded: GameState): GameState {
  const VALID_CATS = new Set<string>(CATEGORIES);
  const vitrineArray = Array.isArray(loaded.vitrine)
    ? (loaded.vitrine as ObjetEnVitrine[])
    : loaded.vitrine?.objets ?? [];
  const categoriesObsolètes =
    loaded.inventaireJoueur?.some((o) => !VALID_CATS.has(o.categorie)) ||
    vitrineArray?.some((v: ObjetEnVitrine) => !VALID_CATS.has(v.objet.categorie)) ||
    loaded.tendances?.some((t) => !VALID_CATS.has(t.categorie));

  const inventaire = (loaded.inventaireJoueur ?? []).map((o) => ({
    ...o,
    categorie: migrerCategorie(o.categorie),
    etat: migrerEtat(o.etat),
    templateId: o.templateId ?? `legacy.${(o.nom ?? "objet").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    rarete: o.rarete ?? "commun",
  }));

  // Détecte le format ancien (tableau) et migre vers le nouveau (VitrineActive | null).
  // Les objets éventuellement présents dans l'ancienne vitrine sont retournés en stock.
  const ancienneVitrine: ObjetEnVitrine[] = Array.isArray(loaded.vitrine)
    ? (loaded.vitrine as ObjetEnVitrine[]).map((v) => ({
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
      }))
    : [];

  // Migration : si l'ancienne vitrine contenait des objets, on les remet dans l'inventaire.
  for (const v of ancienneVitrine) {
    inventaire.push(v.objet);
  }

  // Vitrine au nouveau format : conservée si déjà migrée, sinon null.
  const vitrineActuelle =
    loaded.vitrine &&
    !Array.isArray(loaded.vitrine) &&
    (loaded.vitrine as { brocanteId?: string }).brocanteId
      ? (loaded.vitrine as VitrineActive)
      : null;

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
    : { ...emptyAllTrees(), ...(loaded.competenceTrees ?? {}) };

  const competencesDebloquees = resetTrees ? [] : competencesValides;

  // Collection : on repart de la structure courante (peut contenir de nouveaux
  // templates ajoutés depuis le dernier save), puis on rapatrie l'état persisté
  // (vu, dejaPossede, donation) en faisant un join par templateId.
  let collection = initCollection();
  const loadedCollection = (loaded as { collection?: unknown }).collection;
  const ancienCatalogue = (loaded as unknown as { catalogue?: Record<string, Array<{ templateId: string; vu?: boolean; possede?: number }>> }).catalogue;
  if (loadedCollection && typeof loadedCollection === "object") {
    const indexParId = new Map<
      string,
      { vu?: boolean; dejaPossede?: boolean; donation?: { etat: string; valeur: number } | null }
    >();
    for (const cat of Object.keys(loadedCollection as Record<string, unknown>)) {
      const slots = (loadedCollection as Record<string, unknown>)[cat];
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (s && typeof s === "object" && typeof (s as { templateId?: unknown }).templateId === "string") {
          indexParId.set(
            (s as { templateId: string }).templateId,
            s as { vu?: boolean; dejaPossede?: boolean; donation?: { etat: string; valeur: number } | null },
          );
        }
      }
    }
    const fusion: Record<string, typeof collection[keyof typeof collection]> = {};
    for (const cat of Object.keys(collection) as Array<keyof typeof collection>) {
      fusion[cat] = collection[cat].map((slot) => {
        const persiste = indexParId.get(slot.templateId);
        if (!persiste) return slot;
        return {
          ...slot,
          vu: !!persiste.vu || slot.vu,
          dejaPossede: !!persiste.dejaPossede || slot.dejaPossede,
          donation:
            persiste.donation && persiste.donation.etat
              ? {
                  etat: migrerEtat(persiste.donation.etat) as typeof slot.donation extends { etat: infer T } ? T : never,
                  valeur: persiste.donation.valeur,
                }
              : slot.donation,
        };
      });
    }
    collection = fusion as typeof collection;
  } else if (ancienCatalogue) {
    // Très vieux save (avant la refonte Collection) : on rapatrie ce qu'on peut.
    for (const cat of Object.keys(ancienCatalogue)) {
      const entrees = ancienCatalogue[cat] ?? [];
      for (const e of entrees) {
        if (e.vu) collection = marquerVuFn(collection, e.templateId);
        if ((e.possede ?? 0) > 0)
          collection = marquerDejaPossedeFn(collection, e.templateId);
      }
    }
  }

  // Filet de sécurité : tout objet actuellement en stock ou en vitrine
  // doit apparaître comme `dejaPossede` dans la collection. Couvre le cas
  // où le save d'origine (avant fix de persistance) avait perdu la marque.
  for (const o of inventaire) {
    collection = marquerDejaPossedeFn(collection, o.templateId);
  }
  if (vitrineActuelle) {
    for (const v of vitrineActuelle.objets) {
      collection = marquerDejaPossedeFn(collection, v.objet.templateId);
    }
  }

  return {
    ...loaded,
    inventaireJoueur: inventaire,
    vitrine: vitrineActuelle,
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
    collection,
    gazetteAchetee: loaded.gazetteAchetee ?? false,
    bossDebloqueSeen: loaded.bossDebloqueSeen ?? false,
    meteoSemaine:
      Array.isArray(loaded.meteoSemaine) && loaded.meteoSemaine.length === 7
        ? loaded.meteoSemaine
        : tirerMeteoSemaine(),
    celebriteActuelle:
      loaded.celebriteActuelle &&
      typeof (loaded.celebriteActuelle as { jourSemaine?: number }).jourSemaine === "number"
        ? loaded.celebriteActuelle
        : tirerCelebrite(),
    influenceUtilisee: loaded.influenceUtilisee ?? false,
    dernierLoyer: loaded.dernierLoyer ?? null,
    dernierHuissier: loaded.dernierHuissier ?? null,
    courriers: migrerCourriers(loaded.courriers, loaded.dernierHuissier),
    niveauAtelier:
      (loaded as Partial<GameState>).niveauAtelier === 2 || (loaded as Partial<GameState>).niveauAtelier === 3
        ? (loaded as Partial<GameState>).niveauAtelier!
        : 1,
    niveauStockage: (() => {
      const v = (loaded as Partial<GameState>).niveauStockage;
      if (v === 2 || v === 3 || v === 4) return v;
      const inv = loaded.inventaireJoueur ?? [];
      const vit = loaded.vitrine?.objets ?? [];
      const total = inv.length + vit.length;
      const fallbackTier: 1 | 2 | 3 | 4 =
        total <= 10 ? 1 : total <= 25 ? 2 : total <= 50 ? 3 : 4;
      return fallbackTier;
    })(),
    piecesAmelioration: (() => {
      const loadedPieces = (loaded as Partial<GameState>).piecesAmelioration;
      const base = emptyPiecesAmelioration();
      if (loadedPieces && typeof loadedPieces === "object") {
        for (const cat of CATEGORIES) {
          const v = (loadedPieces as Record<string, unknown>)[cat];
          if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
            base[cat] = Math.floor(v);
          }
        }
      }
      return base;
    })(),
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
      vitrine: null,
      historique: [],
      tendances: genererTendances(),
      prochainesTendances: genererTendances(),
      prochainRafraichissementTendances: INITIAL_JOUR + PERIODE_TENDANCES_JOURS,
      competenceTrees: emptyAllTrees(),
      competencesDebloquees: [],
      collection: initCollection(),
      gazetteAchetee: false,
      bossDebloqueSeen: false,
      meteoSemaine: tirerMeteoSemaine(),
      celebriteActuelle: tirerCelebrite(),
      influenceUtilisee: false,
      dernierLoyer: null,
      dernierHuissier: null,
      courriers: [],
      niveauAtelier: 1,
      niveauStockage: 1,
      piecesAmelioration: emptyPiecesAmelioration(),
    });
    router.push("/qg");
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

      // Huissier : si le budget est négatif après loyer, liquidation forcée.
      let nouveauBudget = budgetApresLoyer;
      let invApresHuissier = inv;
      let collectionApresHuissier = prev.collection;
      let dernierHuissier: HuissierEvent | null = prev.dernierHuissier ?? null;

      if (tierStockage && budgetApresLoyer < 0) {
        const detteInitiale = budgetApresLoyer;
        const saisies: SaisieHuissier[] = [];

        // 1) inventaire (hors restauration), tri par prix réf croissant
        const liquidables = invApresHuissier
          .filter((o) => !o.enRestauration)
          .sort((a, b) => a.prixReferenceReel - b.prixReferenceReel);
        const idsLiquides = new Set<string>();
        for (const o of liquidables) {
          if (nouveauBudget >= 0) break;
          const mt = Math.max(1, Math.round(o.prixReferenceReel / 2));
          nouveauBudget += mt;
          saisies.push({
            type: "inventaire",
            nom: o.nom,
            valeur: o.prixReferenceReel,
            montantRecupere: mt,
          });
          idsLiquides.add(o.id);
        }
        if (idsLiquides.size > 0) {
          invApresHuissier = invApresHuissier.filter((o) => !idsLiquides.has(o.id));
        }

        // 2) si toujours négatif, prendre dans la collection (slots avec donation)
        if (nouveauBudget < 0) {
          const donations: Array<{ cat: CategorieObjet; idx: number; slot: CollectionSlot }> = [];
          for (const cat of Object.keys(collectionApresHuissier) as CategorieObjet[]) {
            const slots = collectionApresHuissier[cat] ?? [];
            for (let i = 0; i < slots.length; i++) {
              if (slots[i].donation !== null) {
                donations.push({ cat, idx: i, slot: slots[i] });
              }
            }
          }
          donations.sort(
            (a, b) => (a.slot.donation!.valeur) - (b.slot.donation!.valeur),
          );

          const newCollection: typeof collectionApresHuissier = { ...collectionApresHuissier };
          const dirtyCats = new Set<CategorieObjet>();

          for (const d of donations) {
            if (nouveauBudget >= 0) break;
            const valeur = d.slot.donation!.valeur;
            const mt = Math.max(1, Math.round(valeur / 2));
            nouveauBudget += mt;
            saisies.push({
              type: "collection",
              nom: d.slot.nom,
              valeur,
              montantRecupere: mt,
            });
            dirtyCats.add(d.cat);
            newCollection[d.cat] = newCollection[d.cat].map((s, i) =>
              i === d.idx ? { ...s, donation: null } : s,
            );
          }
          if (dirtyCats.size > 0) collectionApresHuissier = newCollection;
        }

        if (saisies.length > 0) {
          dernierHuissier = {
            jour: nouveauJour,
            detteAvantSaisie: detteInitiale,
            saisies,
            budgetApres: nouveauBudget,
          };
        }
      }

      const nouveauxCourriers = dernierHuissier && dernierHuissier.jour === nouveauJour
        ? [...prev.courriers, creerCourrierHuissier(dernierHuissier)]
        : prev.courriers;

      return {
        ...prev,
        jourActuel: nouveauJour,
        inventaireJoueur: invApresHuissier,
        collection: collectionApresHuissier,
        budget: nouveauBudget,
        tendances,
        prochainesTendances,
        prochainRafraichissementTendances: refresh
          ? nouveauJour + PERIODE_TENDANCES_JOURS
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
        dernierHuissier,
        courriers: nouveauxCourriers,
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
    localGameRepository.clear();
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

  const marquerHuissierVu = useCallback(() => {
    setState((prev) => (prev ? { ...prev, dernierHuissier: null } : prev));
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
      marquerHuissierVu,
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
      marquerHuissierVu,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame doit être utilisé dans un <GameProvider>");
  return ctx;
}
