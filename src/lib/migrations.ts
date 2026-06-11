import {
  INITIAL_JOUR,
  type EtatObjet,
  type GameState,
  type ObjetEnVitrine,
  type VitrineActive,
} from "@/types/game";
import {
  CATEGORIES,
  emptyPiecesAmelioration,
  migrerCategorie,
} from "@/data/categories";
import { COMPETENCES, emptyAllTrees } from "@/data/competences";
import { prochainLundi } from "@/lib/calendrier";
import { tirerCelebrite } from "@/lib/celebrite";
import {
  donnerObjet as donnerObjetFn,
  initCollection,
  marquerDejaPossede as marquerDejaPossedeFn,
  marquerVu as marquerVuFn,
} from "@/lib/collection";
import {
  injecterLettreMamanSiAbsente,
  migrerCourriers,
} from "@/lib/courrier";
import { tirerMeteoSemaine } from "@/lib/meteo";
import { genererTendances } from "@/lib/tendances";

// `donnerObjetFn` n'est pas utilisé dans la migration actuelle mais ré-exporté
// pour faciliter d'éventuelles évolutions de migration ; supprimer cet alias
// après audit s'il reste inutile.
void donnerObjetFn;

/**
 * Version courante du schéma de sauvegarde. Posée sur tout état retourné par
 * `migrerSauvegarde` ; à incrémenter à chaque changement de schéma nécessitant
 * une migration.
 */
export const SAVE_VERSION = 2;

const ETATS_VALIDES = new Set<EtatObjet>([
  "Mauvais",
  "Bon",
  "Très bon",
  "Pristin état",
]);

/** Normalise un état persisté (ancien libellé → libellé courant). */
export function migrerEtat(etat: string): EtatObjet {
  if (ETATS_VALIDES.has(etat as EtatObjet)) return etat as EtatObjet;
  // Ancienne valeur "Comme neuf" → "Très bon".
  if (etat === "Comme neuf") return "Très bon";
  return "Bon";
}

/**
 * Migration des sauvegardes : remappe les anciennes catégories vers les nouvelles,
 * reset les arbres de compétences si nécessaire, et complète les champs manquants
 * apparus depuis la dernière version du jeu.
 *
 * Fonction pure : `loaded` n'est pas muté, un nouvel objet est retourné.
 *
 * Filet de sécurité : si la migration lève une exception (save inattendu),
 * l'état chargé est retourné tel quel plutôt que de casser la partie.
 */
export function migrerSauvegarde(loaded: GameState): GameState {
  try {
    return { ...appliquerMigrations(loaded), version: SAVE_VERSION };
  } catch (err) {
    console.error(
      "[migrations] Échec de la migration de sauvegarde, état conservé tel quel :",
      err,
    );
    return loaded;
  }
}

function appliquerMigrations(loaded: GameState): GameState {
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
    templateId:
      o.templateId ??
      `legacy.${(o.nom ?? "objet").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
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
  const ancienCatalogue = (
    loaded as unknown as {
      catalogue?: Record<
        string,
        Array<{ templateId: string; vu?: boolean; possede?: number }>
      >;
    }
  ).catalogue;
  if (loadedCollection && typeof loadedCollection === "object") {
    const indexParId = new Map<
      string,
      {
        vu?: boolean;
        dejaPossede?: boolean;
        donation?: { etat: string; valeur: number } | null;
      }
    >();
    for (const cat of Object.keys(loadedCollection as Record<string, unknown>)) {
      const slots = (loadedCollection as Record<string, unknown>)[cat];
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (
          s &&
          typeof s === "object" &&
          typeof (s as { templateId?: unknown }).templateId === "string"
        ) {
          indexParId.set(
            (s as { templateId: string }).templateId,
            s as {
              vu?: boolean;
              dejaPossede?: boolean;
              donation?: { etat: string; valeur: number } | null;
            },
          );
        }
      }
    }
    const fusion: Record<
      string,
      (typeof collection)[keyof typeof collection]
    > = {};
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
                  etat: migrerEtat(persiste.donation.etat) as typeof slot.donation extends {
                    etat: infer T;
                  }
                    ? T
                    : never,
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

  const courriersMigrés = migrerCourriers(loaded.courriers);
  const declencheursLoaded = Array.isArray(
    (loaded as Partial<GameState>).declencheursDeclenches,
  )
    ? (loaded as GameState).declencheursDeclenches.filter(
        (s): s is string => typeof s === "string",
      )
    : [];
  const jourCourant = loaded.jourActuel ?? INITIAL_JOUR;
  const apresInjection = injecterLettreMamanSiAbsente(
    courriersMigrés,
    declencheursLoaded,
    jourCourant,
  );

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
    // Snap sur un lundi calendaire pour aligner le cycle interne.
    prochainRafraichissementTendances: prochainLundi(
      loaded.prochainRafraichissementTendances ??
        (loaded.jourActuel ?? INITIAL_JOUR) + 1,
    ),
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
      typeof (loaded.celebriteActuelle as { jourSemaine?: number }).jourSemaine ===
        "number"
        ? loaded.celebriteActuelle
        : tirerCelebrite(),
    influenceUtilisee: loaded.influenceUtilisee ?? false,
    dernierLoyer: loaded.dernierLoyer ?? null,
    courriers: apresInjection.courriers,
    niveauAtelier:
      (loaded as Partial<GameState>).niveauAtelier === 2 ||
      (loaded as Partial<GameState>).niveauAtelier === 3
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
    niveauCamion: (() => {
      const v = (loaded as Partial<GameState>).niveauCamion;
      if (v === 2 || v === 3) return v;
      // Anciennes saves "Fourgon" (4) → ramenées à Utilitaire (3).
      if ((v as number) === 4) return 3;
      return 1;
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
    chatSurFauteuil: (loaded as Partial<GameState>).chatSurFauteuil ?? false,
    passagesSansChat: (() => {
      const v = (loaded as Partial<GameState>).passagesSansChat;
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        return Math.min(3, Math.floor(v));
      }
      return 0;
    })(),
    declencheursDeclenches: Array.from(
      new Set([...declencheursLoaded, ...apresInjection.declencheursAjoutes]),
    ),
  };
}
