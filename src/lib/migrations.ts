import {
  INITIAL_JOUR,
  type Courrier,
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
import { COMPETENCES, emptyAllTrees, getCompetence } from "@/data/competences";
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
import { debloquerQuetesPrincipales } from "@/lib/quetes/principales";
import { tirerMeteoSemaine } from "@/lib/meteo";
import { genererTendances } from "@/lib/tendances";
import { ALL_TEMPLATES } from "@/data/objetTemplates";
import { OLD_TO_NEW_TEMPLATE_ID } from "@/data/templateIdRenames";
import { reconstruireGrandLivre } from "./grandLivre";
import { ENERGIE_MAX } from "@/lib/energie";
import {
  appliquerGainXPBrocanteur,
  emptyAffinites,
  emptyBrocanteur,
  POINTS_BONUS_CHAPITRE,
} from "@/lib/xp";

/**
 * Remappe en profondeur tout ancien templateId (avant l'harmonisation des noms
 * du 2026-06-22) vers son nouvel identifiant, partout dans la sauvegarde
 * (inventaire, vitrine, collection, missions, grand livre…). Indispensable pour
 * ne pas perdre les objets des parties créées avant le renommage. Idempotent :
 * un id déjà à jour n'est pas dans la table et reste inchangé.
 */
function remapTemplateIds<T>(value: T): T {
  if (typeof value === "string") {
    return (OLD_TO_NEW_TEMPLATE_ID[value] ?? value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => remapTemplateIds(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = remapTemplateIds(v);
    return out as unknown as T;
  }
  return value;
}

/** Index nom → templateId pour résoudre les anciens objets persistés sans
 *  templateId (saves v ≤ 3). Utilisé par `resoudreTemplateId`. */
const TEMPLATE_ID_PAR_NOM = new Map<string, string>(
  ALL_TEMPLATES.map((t) => [t.nom, t.templateId]),
);

/** Résout le templateId d'un objet persisté. Si le templateId existant est
 *  un faux "legacy.xxx" (ancien backfill) ou absent, tente d'abord un match
 *  par nom exact dans le registre des templates. Sinon, tombe sur le slug. */
function resoudreTemplateId(o: { templateId?: unknown; nom?: unknown }): string {
  const tid = typeof o.templateId === "string" ? o.templateId : "";
  if (tid && !tid.startsWith("legacy") && tid !== "legacy") return tid;
  const nom = typeof o.nom === "string" ? o.nom : "";
  const match = TEMPLATE_ID_PAR_NOM.get(nom);
  if (match) return match;
  if (tid) return tid;
  return `legacy.${nom.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "objet"}`;
}

// `donnerObjetFn` n'est pas utilisé dans la migration actuelle mais ré-exporté
// pour faciliter d'éventuelles évolutions de migration ; supprimer cet alias
// après audit s'il reste inutile.
void donnerObjetFn;

/**
 * Version courante du schéma de sauvegarde. Posée sur tout état retourné par
 * `migrerSauvegarde` ; à incrémenter à chaque changement de schéma nécessitant
 * une migration.
 */
export const SAVE_VERSION = 9;

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

/** Convertit un `enRestauration` legacy ({jourFin}) en temps réel. Prêt immédiatement. */
export function migrerEnRestauration(
  enRest: unknown,
): { etatCible: string; debutMs: number; finMs: number } | undefined {
  if (!enRest || typeof enRest !== "object") return undefined;
  const e = enRest as Record<string, unknown>;
  if (typeof e.finMs === "number" && typeof e.debutMs === "number") {
    return e as { etatCible: string; debutMs: number; finMs: number };
  }
  // Ancien format (jourFin) ou incomplet → prêt immédiatement.
  return { etatCible: String(e.etatCible), debutMs: 0, finMs: 0 };
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
  // Garde anti-régression : une sauvegarde issue d'une version FUTURE du jeu
  // (ex. retour à une build plus ancienne via TestFlight) ne doit pas être
  // « migrée » vers le bas — on la conserve telle quelle.
  if (typeof loaded.version === "number" && loaded.version > SAVE_VERSION) {
    console.warn(
      `[migrations] Sauvegarde version ${loaded.version} > ${SAVE_VERSION} (build plus ancienne) : conservée telle quelle.`,
    );
    return loaded;
  }
  // 1) Remap des templateId historiques (harmonisation des noms) AVANT toute
  //    autre migration, pour que la collection/inventaire se reconcilient sur
  //    les nouveaux ids. Appliqué hors du try : même si une migration ultérieure
  //    échoue, les ids restent à jour (objets non perdus).
  const remapped = remapTemplateIds(loaded);
  try {
    return { ...appliquerMigrations(remapped), version: SAVE_VERSION };
  } catch (err) {
    console.error(
      "[migrations] Échec de la migration de sauvegarde, état conservé (ids remappés) :",
      err,
    );
    return remapped;
  }
}

/**
 * Normalise un payload mission de l'ancien format (cible unique) vers le
 * nouveau (cibles[] + categorie). Idempotent : un payload déjà au nouveau
 * format est retourné inchangé.
 */
function normaliserMissionPayload(c: Courrier): Courrier {
  if (c.payload.type !== "mission") return c;
  const p = c.payload as unknown as Record<string, unknown>;
  if (Array.isArray(p.cibles) && typeof p.categorie === "string") return c;
  const cibles = Array.isArray(p.cibles)
    ? (p.cibles as unknown[])
    : p.cible
      ? [p.cible]
      : [];
  const next = { ...p, categorie: (p.categorie as string) ?? "quotidienne", cibles };
  delete (next as { cible?: unknown }).cible;
  return { ...c, payload: next as Courrier["payload"] };
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
    templateId: resoudreTemplateId(o),
    rarete: o.rarete ?? "commun",
    enRestauration: o.enRestauration
      ? migrerEnRestauration(o.enRestauration)
      : undefined,
  })) as GameState["inventaireJoueur"];

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
          templateId: resoudreTemplateId(a),
          categorie: migrerCategorie(a.categorie),
          etat: migrerEtat(a.etat),
        })),
        xpGagne: (s as { xpGagne?: Record<string, number> }).xpGagne ?? {},
      };
    }
    return {
      ...s,
      ventes: s.ventes.map((v) => ({
        ...v,
        templateId: resoudreTemplateId(v),
        categorie: migrerCategorie(v.categorie),
        etat: migrerEtat(v.etat),
      })),
      xpGagne: (s as { xpGagne?: Record<string, number> }).xpGagne ?? {},
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

  // Catégorie "secondaire" supprimée du modèle (v7) : on retire les courriers
  // mission « secondaire » et leurs missions associées. Accès souple car la
  // valeur n'existe plus dans le type `MissionCategorie`.
  const estSecondaire = (c: { payload?: { type?: string; categorie?: string } }) =>
    c.payload?.type === "mission" &&
    (c.payload as { categorie?: string }).categorie === "secondaire";

  const courriersNormalises = migrerCourriers(loaded.courriers).map(
    normaliserMissionPayload,
  );
  const idsSecondairesSupprimes = new Set(
    courriersNormalises.filter((c) => estSecondaire(c)).map((c) => c.id),
  );
  const courriersMigrés = courriersNormalises.filter((c) => !estSecondaire(c));
  const declencheursLoaded = Array.isArray(
    (loaded as Partial<GameState>).declencheursDeclenches,
  )
    ? (loaded as GameState).declencheursDeclenches.filter(
        (s): s is string => typeof s === "string",
      )
    : [];
  const jourCourant = loaded.jourActuel ?? INITIAL_JOUR;
  const apresMaman = injecterLettreMamanSiAbsente(
    courriersMigrés,
    declencheursLoaded,
    jourCourant,
  );
  const apresInjection = {
    courriers: apresMaman.courriers,
    declencheursAjoutes: [...apresMaman.declencheursAjoutes],
  };

  // Amorce de l'arc principal au chargement : on injecte le prochain chapitre
  // dû (chapitre 1 pour une partie naissante) ainsi que sa résolution active.
  const missionsExistantes: GameState["missions"] = (
    Array.isArray(loaded.missions) ? loaded.missions : []
  ).filter((m) => !idsSecondairesSupprimes.has(m.courrierId));
  const amorce = debloquerQuetesPrincipales(
    {
      ...(loaded as GameState),
      // Les conditions de déblocage lisent collection/historique/budget/jour :
      // on s'appuie sur les valeurs migrées, pas sur le brut `loaded`.
      jourActuel: jourCourant,
      budget: loaded.budget ?? 0,
      historique,
      collection,
      courriers: apresInjection.courriers,
      missions: missionsExistantes,
    },
    jourCourant,
  );
  const courriersFinaux = [...apresInjection.courriers, ...amorce];
  const missionsFinales: GameState["missions"] = [
    ...missionsExistantes,
    ...amorce.map((c) => ({ courrierId: c.id, statut: "active" as const })),
  ];

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
    courriers: courriersFinaux,
    niveauAtelier:
      (loaded as Partial<GameState>).niveauAtelier === 2 ||
      (loaded as Partial<GameState>).niveauAtelier === 3
        ? (loaded as Partial<GameState>).niveauAtelier!
        : 1,
    niveauStockage: (() => {
      // `v` peut venir d'une vieille sauvegarde et valoir 4 (Entrepôt supprimé).
      const v = (loaded as { niveauStockage?: number }).niveauStockage;
      if (v === 4) return 3; // migration : Entrepôt → Hangar.
      if (v === 2 || v === 3) return v;
      const inv = loaded.inventaireJoueur ?? [];
      const vit = loaded.vitrine?.objets ?? [];
      const total = inv.length + vit.length;
      const fallbackTier: 1 | 2 | 3 =
        total <= 10 ? 1 : total <= 25 ? 2 : 3;
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
    grandLivre: (() => {
      const existing = (loaded as Partial<GameState>).grandLivre;
      if (Array.isArray(existing) && existing.length > 0) return existing;
      return reconstruireGrandLivre(historique, loaded.budget ?? 0);
    })(),
    missions: missionsFinales,
    quetesPeriodiques: loaded.quetesPeriodiques ?? {
      quotidien: { cle: "", courrierIds: [] },
      hebdo: { cle: "", courrierIds: [] },
    },
    energie: (() => {
      const v = (loaded as Partial<GameState>).energie;
      if (typeof v === "number" && Number.isFinite(v)) {
        return Math.max(0, Math.min(ENERGIE_MAX, Math.floor(v)));
      }
      return ENERGIE_MAX;
    })(),
    energieDerniereMaj:
      typeof (loaded as Partial<GameState>).energieDerniereMaj === "number"
        ? (loaded as GameState).energieDerniereMaj
        : Date.now(),
    brocanteur: (() => {
      const dejaV9 = typeof loaded.version === "number" && loaded.version >= 9;
      const b = (loaded as Partial<GameState>).brocanteur;
      const bienForme =
        b && Number.isFinite(b.xp) && b.xp >= 0 &&
        Number.isFinite(b.niveau) && b.niveau >= 0 &&
        Number.isFinite(b.pointsDisponibles) && b.pointsDisponibles >= 0;
      if (dejaV9 && bienForme) {
        return { xp: Math.max(0, b!.xp), niveau: Math.max(0, Math.floor(b!.niveau)), pointsDisponibles: Math.max(0, Math.floor(b!.pointsDisponibles)) };
      }
      // < v9 : (re)calcul du niveau depuis l'XP (somme des arbres si absent),
      // puis refund du pool : niveaux + bonus chapitres − points déjà dépensés.
      const totalXP = bienForme
        ? b!.xp
        : Object.values(loaded.competenceTrees ?? {}).reduce(
            (acc, t) => acc + (Number.isFinite(t?.xp) && t!.xp > 0 ? t!.xp : 0),
            0,
          );
      const converti = appliquerGainXPBrocanteur(emptyBrocanteur(), totalXP);
      const chapitresLivres = missionsFinales.filter((m) => {
        if (m.statut !== "livree") return false;
        const c = courriersFinaux.find((cc) => cc.id === m.courrierId);
        return c?.payload.type === "mission" && c.payload.categorie === "principale";
      }).length;
      const pointsDepenses = competencesDebloquees.reduce(
        (acc, id) => acc + (getCompetence(id)?.coutPoints ?? 0),
        0,
      );
      return {
        ...converti,
        pointsDisponibles: Math.max(
          0,
          converti.niveau + POINTS_BONUS_CHAPITRE * chapitresLivres - pointsDepenses,
        ),
      };
    })(),
    affinites: (() => {
      const a = (loaded as Partial<GameState>).affinites;
      if (a && typeof a === "object") {
        const base = emptyAffinites();
        for (const cat of CATEGORIES) {
          const v = (a as Record<string, unknown>)[cat];
          if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
            base[cat] = Math.floor(v);
          }
        }
        return base;
      }
      // Backfill depuis l'historique migré : 1 par achat + 1 par vente.
      const base = emptyAffinites();
      for (const s of historique) {
        if (s.type === "chinage") {
          for (const ach of s.achats) base[ach.categorie] += 1;
        } else {
          for (const v of s.ventes) base[v.categorie] += 1;
        }
      }
      return base;
    })(),
  };
}
