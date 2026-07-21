import {
  INITIAL_JOUR,
  type BrocanteurState,
  type Courrier,
  type EtatObjet,
  type GameState,
  type ObjetEnVitrine,
  type TutorielEtape,
  type VitrineActive,
} from "@/types/game";
import {
  CATEGORIES,
  emptyPiecesAmelioration,
  migrerCategorie,
} from "@/data/categories";
import {
  COMPETENCES,
  COUT_TOTAL_COMPETENCES,
  getCompetence,
  pointsDepensesCompetences,
} from "@/data/competences";
import { prochainLundi } from "@/lib/calendrier";
import { tirerCelebrite } from "@/lib/celebrite";
import { ETAPES_TUTORIEL } from "@/lib/tutoriel";
import { COLIS_TUTORIEL_TAILLE } from "@/data/starterInventory";
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
import { ALL_TEMPLATES } from "@/data/objetTemplates";
import { OLD_TO_NEW_TEMPLATE_ID } from "@/data/templateIdRenames";
import { reconstruireGrandLivre } from "./grandLivre";
import { ENERGIE_MAX } from "@/lib/energie";
import { ACTIVE_IDS, type ActiveId, type ActivesUtilisees } from "@/lib/actives";
import {
  appliquerGainXPBrocanteur,
  emptyBrocanteur,
  POINTS_BONUS_CHAPITRE,
} from "@/lib/xp";
import {
  NIVEAU_BROCANTES_T2,
  NIVEAU_BROCANTES_T3,
  NIVEAU_BROCANTES_T4,
} from "@/data/brocantes";
import { chapitreParOrdre } from "@/data/quetesPrincipales";
import { courrierDeChapitre } from "@/lib/quetes/principales";

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
export const SAVE_VERSION = 15;

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
    return assurerFiletSecuriteMinimal(remapped);
  }
}

/**
 * Filet de sécurité de dernier recours : appliqué uniquement quand
 * `appliquerMigrations` a levé une exception (save inattendu). Ne rejoue
 * AUCUNE migration — garantit juste que les champs lus sans garde ailleurs
 * (ex. `state.brocanteur.niveau` dans `evaluerCondition`/`GameContext`)
 * existent sous une forme minimale valide, pour qu'une sauvegarde cassée sur
 * un point précis n'empêche pas de rouvrir la partie.
 */
function assurerFiletSecuriteMinimal(save: GameState): GameState {
  const b = save.brocanteur as unknown;
  const brocanteurValide =
    !!b &&
    typeof b === "object" &&
    typeof (b as { xp?: unknown }).xp === "number" &&
    typeof (b as { niveau?: unknown }).niveau === "number" &&
    typeof (b as { pointsDisponibles?: unknown }).pointsDisponibles === "number";
  const competencesValide = Array.isArray(save.competencesDebloquees);
  const tutorielEtapeValide =
    typeof save.tutorielEtape === "string" &&
    (ETAPES_TUTORIEL as readonly string[]).includes(save.tutorielEtape);

  if (brocanteurValide && competencesValide && tutorielEtapeValide) return save;

  return {
    ...save,
    brocanteur: brocanteurValide ? save.brocanteur : emptyBrocanteur(),
    competencesDebloquees: competencesValide ? save.competencesDebloquees : [],
    tutorielEtape: tutorielEtapeValide ? save.tutorielEtape : "termine",
  };
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

/**
 * v15 — refonte des coûts de compétences : chaque palier coûte désormais
 * 1 pt (ancien barème : coût = numéro du palier, soit 1/2/3). Rembourse
 * l'écart payé sous l'ancien barème (`palierNumero - 1` par compétence
 * débloquée), puis écrête pour que les points « à vie » (disponibles +
 * dépensés au nouveau barème) ne dépassent jamais `COUT_TOTAL_COMPETENCES`.
 *
 * `skipRefund` couvre deux cas où le remboursement ne doit PAS s'appliquer :
 *  - la save est déjà passée par v15 (le remboursement a déjà été versé une
 *    fois — idempotence, cf. `dejaV15` dans `appliquerMigrations`) ;
 *  - la save est antérieure à v9 (`!dejaV9`) : son `pointsDisponibles` n'est
 *    pas un solde accumulé au fil du jeu, il est intégralement RECALCULÉ à
 *    chaque chargement (cf. bloc `< v9` plus bas, `niveau + bonus − dépenses`)
 *    à partir de `getCompetence(id)?.coutPoints`, qui vaut déjà 1 pour tous
 *    les paliers depuis la présente refonte des coûts — ce recalcul reflète
 *    donc déjà le nouveau barème. Un remboursement par-dessus compterait
 *    l'écart une seconde fois (sur-crédit).
 */
function appliquerRefonteCoutsV15(
  brocanteur: BrocanteurState,
  competencesDebloquees: readonly string[],
  skipRefund: boolean,
): BrocanteurState {
  if (skipRefund) return brocanteur;
  const remboursement = competencesDebloquees.reduce((acc, id) => {
    const c = getCompetence(id);
    return acc + (c ? c.palierNumero - 1 : 0);
  }, 0);
  const plafondDisponibles = Math.max(
    0,
    COUT_TOTAL_COMPETENCES - pointsDepensesCompetences(competencesDebloquees),
  );
  return {
    ...brocanteur,
    pointsDisponibles: Math.min(
      brocanteur.pointsDisponibles + remboursement,
      plafondDisponibles,
    ),
  };
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

  // Si schéma cat obsolète OU IDs de comp obsolètes, on reset les compétences débloquées.
  const resetCompetences = categoriesObsolètes || idsObsoletes;
  const competencesDebloquees = resetCompetences ? [] : competencesValides;

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

  // Tutoriel (v12) : les saves antérieures ont déjà joué — "termine".
  // Une valeur inconnue (save corrompue/future) est aussi normalisée.
  const tutorielEtape: TutorielEtape = (() => {
    const v = (loaded as Partial<GameState>).tutorielEtape;
    return typeof v === "string" &&
      (ETAPES_TUTORIEL as readonly string[]).includes(v)
      ? (v as TutorielEtape)
      : "termine";
  })();
  const tutorielFini = tutorielEtape === "termine";

  // v14 : colis du tutoriel. Les saves antérieures ont reçu leur stock
  // initial À LA CRÉATION → le colis est considéré entièrement livré (sinon
  // le joueur recevrait 5 objets en double à l'étape ouvrir-colis ou au
  // « Passer »). Les saves ≥ v14 gardent leur compteur tel quel.
  const dejaV14 = typeof loaded.version === "number" && loaded.version >= 14;
  const colisTutorielLivres = dejaV14
    ? (loaded as Partial<GameState>).colisTutorielLivres ?? 0
    : COLIS_TUTORIEL_TAILLE;

  // Tant qu'un tutoriel est en cours, la migration ne doit ni injecter la
  // lettre de Maman ni amorcer l'arc principal : `appliquerFinTutoriel`
  // (src/lib/tutoriel.ts) s'en charge à la fin du tutoriel.
  const apresMaman = tutorielFini
    ? injecterLettreMamanSiAbsente(courriersMigrés, declencheursLoaded, jourCourant)
    : { courriers: courriersMigrés, declencheursAjoutes: [] as string[] };
  const apresInjection = {
    courriers: apresMaman.courriers,
    declencheursAjoutes: [...apresMaman.declencheursAjoutes],
  };

  // Niveau de Brocanteur : calculé ici, réutilisé par `niveauVu` et par le
  // refund legacy (< v9) plus bas, qui a besoin d'un `brocanteur.niveau` déjà
  // défini — le brut `loaded.brocanteur` peut être absent (vieille save).
  // Seul `pointsDisponibles` (bonus chapitres livrés) est finalisé plus tard,
  // une fois `missionsFinales` connu.
  const dejaV9 = typeof loaded.version === "number" && loaded.version >= 9;
  const brocanteurCharge = (loaded as Partial<GameState>).brocanteur;
  const brocanteurBienForme =
    !!brocanteurCharge &&
    Number.isFinite(brocanteurCharge.xp) && brocanteurCharge.xp >= 0 &&
    Number.isFinite(brocanteurCharge.niveau) && brocanteurCharge.niveau >= 0 &&
    Number.isFinite(brocanteurCharge.pointsDisponibles) && brocanteurCharge.pointsDisponibles >= 0;
  const brocanteurFinalV9 = dejaV9 && brocanteurBienForme
    ? {
        xp: Math.max(0, brocanteurCharge!.xp),
        niveau: Math.max(0, Math.floor(brocanteurCharge!.niveau)),
        pointsDisponibles: Math.max(0, Math.floor(brocanteurCharge!.pointsDisponibles)),
      }
    : null;
  // Le fallback de `totalXP` ne doit dépendre QUE de la validité de `xp`
  // lui-même — pas de `brocanteurBienForme` en entier — sinon un autre champ
  // malformé (ex. `pointsDisponibles` NaN suite à un bug de migration) fait
  // perdre de l'XP pourtant valide.
  const xpValide =
    !!brocanteurCharge && Number.isFinite(brocanteurCharge.xp) && brocanteurCharge.xp >= 0;
  const arbresLegacy = (loaded as { competenceTrees?: Record<string, { xp?: number }> })
    .competenceTrees;
  const totalXP = xpValide
    ? brocanteurCharge!.xp
    : Object.values(arbresLegacy ?? {}).reduce(
        (acc, t) => acc + (Number.isFinite(t?.xp) && (t!.xp as number) > 0 ? (t!.xp as number) : 0),
        0,
      );
  const brocanteurConverti =
    brocanteurFinalV9 ?? appliquerGainXPBrocanteur(emptyBrocanteur(), totalXP);

  const missionsExistantes: GameState["missions"] = (
    Array.isArray(loaded.missions) ? loaded.missions : []
  ).filter((m) => !idsSecondairesSupprimes.has(m.courrierId));
  // Depuis SP2 : plus d'amorce de chapitre au chargement — la trame est
  // délivrée en dialogue (`accepterChapitre`, cf. src/lib/quetes/principales.ts) ;
  // `chapitrePret(state)` (calculé à la volée) désigne le prochain chapitre dû.
  const courriersFinaux = apresInjection.courriers;
  const missionsFinales: GameState["missions"] = missionsExistantes;

  // v13 : trame 12 chapitres. Mapping "jamais re-verrouiller un tier" — pour
  // toute save ≤ v12 (STRICTEMENT antérieure à v13 — cf. `dejaV13` ci-dessous),
  // les chapitres `trame_chN` déjà « acquis » sous les anciennes règles
  // (niveau ou ancien arc `principale_*`) sont injectés livrés (courrier lu +
  // mission `livree`), SANS récompense rétroactive (ni ledger, ni XP, ni
  // points bonus — cf. `courrierDeChapitre`, qui ne passe pas par
  // `accepterChapitre`) :
  //  - niveau (anciens seuils) : ≥T2 ⇒ ch4, ≥T3 ⇒ ch8, ≥T4 ⇒ ch10
  //  - anciens chapitres livrés : ch1⇒1, ch2⇒4, ch3⇒8, ch4⇒10, ch5⇒11
  // On prend le max des deux sources. Les anciens courriers/missions
  // `principale_*` sont conservés tels quels (archive).
  //
  // Gating par version ENTRANTE (`loaded.version`, lu avant migration — cf.
  // `dejaV9` plus haut, même principe) : ce back-fill ne doit tourner qu'une
  // fois, au moment précis où une save franchit le seuil v12→v13. Sans ce
  // garde, `appliquerMigrations` étant une passe monolithique rejouée à CHAQUE
  // chargement, une save déjà en v13 avec une trame en cours (ex. `trame_ch3`
  // active) ou fraîchement créée verrait ses chapitres suivants forcés
  // « livrés » d'après le seul niveau du joueur — sautant l'histoire en cours.
  const dejaV13 = typeof loaded.version === "number" && loaded.version >= 13;
  // v15 — gate par version ENTRANTE (même principe que `dejaV9`/`dejaV13`
  // ci-dessus) : le remboursement de l'ancien barème de compétences
  // (cf. `appliquerRefonteCoutsV15` plus haut) ne doit être versé qu'une
  // seule fois, au passage v14 → v15. Utilisé plus bas, au moment
  // d'assembler le `brocanteur` final.
  const dejaV15 = typeof loaded.version === "number" && loaded.version >= 15;
  const ANCIENS_CHAPITRES_VERS_ORDRE_TRAME: Record<string, number> = {
    principale_ch1: 1,
    principale_ch2: 4,
    principale_ch3: 8,
    principale_ch4: 10,
    principale_ch5: 11,
  };
  let courriersAvecTrame = courriersFinaux;
  let missionsAvecTrame = missionsFinales;
  if (!dejaV13) {
    // Ancien arc `principale_*` : la trame le remplace. Toute mission ACTIVE
    // sous ce nom est close (`expiree`, jourResolution = jour courant de la
    // migration) — pas d'objectif orphelin dans le carnet ; les missions déjà
    // `livree` restent `livree` (elles alimentent le mapping niveau→trame
    // ci-dessous). Le courrier associé n'est pas touché, il reste en archive.
    missionsAvecTrame = missionsAvecTrame.map((m) =>
      m.courrierId.startsWith("principale_") && m.statut === "active"
        ? { ...m, statut: "expiree" as const, jourResolution: jourCourant }
        : m,
    );

    let maxOrdreTrame = 0;
    const niveauFinalTrame = brocanteurConverti.niveau;
    if (niveauFinalTrame >= NIVEAU_BROCANTES_T2) maxOrdreTrame = 4;
    if (niveauFinalTrame >= NIVEAU_BROCANTES_T3) maxOrdreTrame = 8;
    if (niveauFinalTrame >= NIVEAU_BROCANTES_T4) maxOrdreTrame = 10;
    for (const m of missionsExistantes) {
      const ordre = ANCIENS_CHAPITRES_VERS_ORDRE_TRAME[m.courrierId];
      if (m.statut === "livree" && ordre) {
        maxOrdreTrame = Math.max(maxOrdreTrame, ordre);
      }
    }
    const trameDejaPresente = new Set([
      ...courriersFinaux.map((c) => c.id),
      ...missionsFinales.map((m) => m.courrierId),
    ]);
    for (let ordre = 1; ordre <= maxOrdreTrame; ordre++) {
      const ch = chapitreParOrdre(ordre);
      if (!ch || trameDejaPresente.has(ch.id)) continue;
      courriersAvecTrame = [...courriersAvecTrame, courrierDeChapitre(ch, jourCourant)];
      missionsAvecTrame = [
        ...missionsAvecTrame,
        { courrierId: ch.id, statut: "livree", jourResolution: jourCourant },
      ];
    }
  }

  // `competenceTrees` (arbres) n'existe plus dans le schéma (v10) : on l'exclut
  // explicitement du spread pour qu'une vieille save qui le portait encore ne
  // le voie pas traverser tel quel dans l'état migré (cf. fallback `arbresLegacy`
  // plus haut, seul lecteur légitime de ce champ legacy).
  // `affinites` (compteur de transactions par catégorie) n'existe plus dans le
  // schéma (v11, décision 2026-07-06 : paliers gatés par points + niveau
  // seulement) : même traitement, exclu du spread pour qu'une vieille save qui
  // le portait encore ne le voie pas traverser tel quel dans l'état migré.
  const {
    competenceTrees: _competenceTreesLegacy,
    affinites: _affinitesLegacy,
    ...loadedSansChampsSupprimes
  } = loaded as unknown as GameState & {
    competenceTrees?: unknown;
    affinites?: unknown;
  };

  return {
    ...loadedSansChampsSupprimes,
    tutorielEtape,
    colisTutorielLivres,
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
    competencesDebloquees,
    collection,
    gazetteAchetee: loaded.gazetteAchetee ?? false,
    bossDebloqueSeen: loaded.bossDebloqueSeen ?? false,
    niveauVu: (() => {
      // `brocanteurConverti.niveau` (calculé plus haut, avant l'amorce des
      // quêtes principales) est le niveau migré définitif — identique à celui
      // du bloc `brocanteur` final ci-dessous (même variable que le clamp
      // d'énergie, cf. commentaire associé).
      const v = (loaded as Partial<GameState>).niveauVu;
      const niveauFinal = brocanteurConverti.niveau;
      if (Number.isFinite(v) && (v as number) >= 0) {
        return Math.min(Math.floor(v as number), niveauFinal);
      }
      return niveauFinal; // saves d'avant la feature : tout est déjà « vu ».
    })(),
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
    courriers: courriersAvecTrame,
    niveauAtelier: (() => {
      // 0 = nouvelle économie (slots achetés) ; 2/3 = acquis conservés.
      // 1, absent ou invalide → 1 (slot gratuit des sauvegardes historiques).
      const v = (loaded as Partial<GameState>).niveauAtelier;
      return v === 0 || v === 2 || v === 3 ? v : 1;
    })(),
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
    missions: missionsAvecTrame,
    quetesPeriodiques: loaded.quetesPeriodiques ?? {
      quotidien: { cle: "", courrierIds: [] },
      hebdo: { cle: "", courrierIds: [] },
    },
    energie: (() => {
      // Énergie max FIXE à 5 depuis 2026-07-10 : les sauvegardes qui
      // avaient 6-7 (ex-bonus N8/N14) sont plafonnées au chargement.
      const max = ENERGIE_MAX;
      const v = (loaded as Partial<GameState>).energie;
      if (typeof v === "number" && Number.isFinite(v)) {
        return Math.max(0, Math.min(max, Math.floor(v)));
      }
      return max;
    })(),
    energieDerniereMaj:
      typeof (loaded as Partial<GameState>).energieDerniereMaj === "number"
        ? (loaded as GameState).energieDerniereMaj
        : Date.now(),
    brocanteur: appliquerRefonteCoutsV15(
      (() => {
        // `brocanteurFinalV9`/`brocanteurConverti` sont calculés plus haut (avant
        // l'amorce des quêtes principales, cf. commentaire associé).
        if (brocanteurFinalV9) return brocanteurFinalV9;
        // < v9 : refund du pool = niveau + bonus chapitres − points déjà dépensés.
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
          ...brocanteurConverti,
          pointsDisponibles: Math.max(
            0,
            brocanteurConverti.niveau + POINTS_BONUS_CHAPITRE * chapitresLivres - pointsDepenses,
          ),
        };
      })(),
      competencesDebloquees,
      // Skip si déjà remboursée (idempotence) OU si la save est < v9 : son
      // `pointsDisponibles` vient d'être recalculé ci-dessus au NOUVEAU
      // barème (`getCompetence().coutPoints` vaut 1 partout) — cf. le
      // commentaire de `appliquerRefonteCoutsV15` pour le détail du
      // sur-crédit que produirait un remboursement dans ce cas.
      dejaV15 || !dejaV9,
    ),
    activesUtilisees: (() => {
      const a = (loaded as Partial<GameState>).activesUtilisees;
      if (!a || typeof a !== "object") return undefined;
      const propre: ActivesUtilisees = {};
      for (const [k, v] of Object.entries(a)) {
        if (!ACTIVE_IDS.includes(k as ActiveId)) continue;
        if (!v || !Number.isFinite(v.jour) || !Number.isFinite(v.usages) || v.usages < 0 || v.jour < 0) continue;
        propre[k as ActiveId] = { jour: Math.floor(v.jour), usages: Math.floor(v.usages) };
      }
      return Object.keys(propre).length ? propre : undefined;
    })(),
  };
}
