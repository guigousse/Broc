import type { GameState } from "@/types/game";
import type { GameRepository, ResultatSave } from "./gameRepository";
import { chargerSlot, enregistrerSlot, localGameRepository } from "./localGameRepository";
import { migrerVersFichiers } from "./migrationFichiers";
import { ecrireSave, lireSave, quoiDuSlot } from "./pontNatif";
import type { ErreurStockage } from "./pontNatif";
import {
  changerSlotActif,
  indexMiroirExiste,
  revisionDe,
  slotActif,
  supprimerSlot,
  toucherDerniereSession,
  viderSlot,
  type NumeroSlot,
} from "./slots";

/** Index côté fichier. Volontairement plus maigre que `IndexSlots` : les noms
 *  d'emplacements restent l'affaire du miroir, seul l'arbitrage voyage ici. */
export interface IndexFichier {
  actif: NumeroSlot;
  revisions: Record<NumeroSlot, number>;
}

function parse<T>(brut: string | null): T | null {
  if (!brut) return null;
  try {
    return JSON.parse(brut) as T;
  } catch {
    return null;
  }
}

/**
 * Distingue « aucun fichier d'index » (`lireSave` rend `null` : le fichier
 * n'existe simplement pas encore) de « fichier présent mais illisible »
 * (JSON invalide, ou lecture qui échoue) — Ruling R8(i). C'est cette
 * distinction, et non le `IndexFichier | null` conflaté qu'utilisaient
 * `save()`/`clear()` avant elle, qui doit gouverner le déclenchement de la
 * migration (tâche 6) dans `load()` : migrer sur un index illisible
 * risquerait d'écraser des fichiers de slots sains et plus récents que le
 * miroir derrière un index simplement corrompu.
 */
type EtatIndexFichier =
  | { genre: "absent" }
  | { genre: "illisible" }
  | { genre: "ok"; index: IndexFichier };

/**
 * Ruling R10 — un JSON syntaxiquement valide peut quand même être de la
 * MAUVAISE forme (`"{}"`, `"5"`, `"[]"` : tout ce qui n'est pas un objet
 * `{ actif, revisions }`). Sans cette garde, `index.revisions[n]` plante hors
 * de la promesse dans `chargerAvecIndex`/`save()` — `load()` rejette sans
 * jamais atteindre le repli miroir : le jeu ne s'affiche pas. Traiter un tel
 * contenu comme "illisible" le fait retomber sur une branche déjà sûre.
 */
function estIndexFichierValide(x: unknown): x is IndexFichier {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const candidat = x as Partial<IndexFichier>;
  if (candidat.actif !== 1 && candidat.actif !== 2 && candidat.actif !== 3) {
    return false;
  }
  const { revisions } = candidat;
  if (typeof revisions !== "object" || revisions === null || Array.isArray(revisions)) {
    return false;
  }
  // Revue finale (composition) : les VALEURS comptent autant que la forme.
  // Une révision non numérique donne `revision: NaN` un peu plus loin, que
  // `JSON.stringify` écrit `"revision":null` dans l'index MIROIR — forme que
  // `estMetaSlotValide` rejette, et `chargerIndex()` jette alors TOUT l'index
  // miroir : noms d'emplacements perdus, `actif` remis à 1, sauvegardes
  // suivantes dans le mauvais emplacement. Un index dont une révision n'est
  // pas un nombre fini est donc traité comme illisible — branche déjà sûre,
  // qui ne contamine rien.
  return Object.values(revisions).every((v) => Number.isFinite(v));
}

async function lireEtatIndexFichier(): Promise<EtatIndexFichier> {
  let brut: string | null;
  try {
    brut = await lireSave("index");
  } catch {
    // Échec de lecture (io/indisponible) : on ne peut pas conclure à une
    // absence. Même traitement qu'un index présent mais illisible — dans
    // le doute, pas de migration.
    return { genre: "illisible" };
  }
  if (brut === null) return { genre: "absent" };
  const index = parse<IndexFichier>(brut);
  if (index === null || !estIndexFichierValide(index)) return { genre: "illisible" };
  return { genre: "ok", index };
}

/**
 * Version conflatée pour `save()`/`clear()`, qui n'ont pas besoin de la
 * distinction absent/illisible : dans les deux cas, ils repartent d'un
 * index par défaut (voir `index?.revisions ?? {…}` plus bas). Seul `load()`
 * a besoin de `lireEtatIndexFichier()` directement.
 */
async function lireIndexFichier(): Promise<IndexFichier | null> {
  const etat = await lireEtatIndexFichier();
  return etat.genre === "ok" ? etat.index : null;
}

/**
 * Écrit le miroir localStorage en best-effort, et n'estampille la révision
 * QUE si le contenu a réellement été écrit.
 *
 * Cette condition n'est pas cosmétique : estampiller une révision que le
 * contenu miroir ne porte pas (setItem refusé pour cause de quota) ferait
 * gagner l'arbitrage à un miroir PÉRIMÉ, qui écraserait alors un fichier plus
 * frais. Une révision ne vaut que pour un contenu effectivement enregistré.
 *
 * `enregistrerSlot(n, …)`, jamais `localGameRepository.save(…)` : ce dernier
 * re-résoudrait son propre `slotActif()` (Ruling R6).
 */
async function ecrireMiroir(
  n: NumeroSlot,
  state: GameState,
  revision: number,
): Promise<void> {
  try {
    const resultat = await enregistrerSlot(n, state);
    if (resultat.ok) toucherDerniereSession(n, revision);
  } catch {
    // Le miroir est consultatif : son échec ne change jamais le verdict.
  }
}

function genreDe(e: unknown): ErreurStockage["genre"] {
  return typeof e === "object" && e !== null && "genre" in e
    ? ((e as ErreurStockage).genre)
    : "io";
}

/**
 * Résout l'emplacement actif UNE SEULE FOIS par appel public (load/save/
 * clear) — Ruling R6. Aucun chemin ne doit ensuite laisser
 * `localGameRepository` (ou `slots.ts`) re-résoudre le sien via
 * `slotActif()` : un second appel indépendant pourrait tomber sur un numéro
 * différent si le miroir a disparu entre-temps, et lire/écrire le mauvais
 * emplacement — exactement la perte de partie que ce chantier corrige.
 *
 * Même règle qu'au `load()` (Ruling R4) : le miroir l'emporte s'il a un
 * index réellement enregistré ET EXPLOITABLE (c'est lui que
 * `changerSlotActif()` écrit ; un index illisible ferait retomber
 * `slotActif()` sur le slot 1 — voir `indexMiroirExiste`, revue finale I2) ;
 * sinon, seul l'actif du fichier a une chance d'être à jour. `index` peut
 * être `null` (aucune save fichier encore écrite) : l'actif retombe alors
 * sur 1, comme le ferait un miroir tout neuf.
 *
 * Ruling R7 — quand le miroir n'a PAS d'index (cas ci-dessus), on le
 * ré-amorce ici même avec l'actif retenu. Sans ce ré-amorçage, le tout
 * prochain écrivain mirroir (`toucherDerniereSession`/`viderSlot`, via
 * `chargerIndex()`) fabriquerait lui-même un index par défaut à `actif: 1`
 * tout en remplissant `slots[n]` — et l'appel SUIVANT, voyant alors un
 * miroir qui existe, retomberait sur ce `1` et écraserait le vrai slot une
 * écriture plus tard. Best-effort et silencieux : le miroir reste
 * consultatif, son échec ne doit jamais changer le verdict.
 */
function resoudreSlotActif(index: IndexFichier | null): NumeroSlot {
  if (indexMiroirExiste()) return slotActif();
  const n = index?.actif ?? 1;
  try {
    changerSlotActif(n);
  } catch {
    // best-effort : le miroir n'est qu'un accélérateur, pas une dépendance.
  }
  return n;
}

/**
 * Corps de `load()` une fois un `IndexFichier` VALIDE en main — qu'il vienne
 * de `lireEtatIndexFichier()` (genre "ok") ou de `migrerVersFichiers()`
 * (déjà vérifié par relecture stricte, voir migrationFichiers.ts). Extrait
 * en fonction dédiée exprès : `load()` ne doit JAMAIS avoir besoin de relire
 * l'index une seconde fois après une migration pour poursuivre — c'est cette
 * relecture évitée qui rend la non-récursion structurelle plutôt que
 * simplement observée (revue de tâche 6, voir `load()` ci-dessous).
 */
async function chargerAvecIndex(index: IndexFichier): Promise<GameState | null> {
  // Quel emplacement charger ? Résolu une seule fois (Ruling R6) et
  // transmis explicitement à tout ce qui suit, y compris le repli miroir.
  const n = resoudreSlotActif(index);

  let duFichier: GameState | null = null;
  try {
    duFichier = parse<GameState>(await lireSave(quoiDuSlot(n)));
  } catch {
    duFichier = null;
  }

  const revFichier = index.revisions[n] ?? 0;
  const revMiroir = revisionDe(n);

  // Le fichier ne l'emporte QUE s'il est lisible ET au moins aussi frais.
  // Un fichier corrompu, ou distancé parce qu'il avait décroché pendant que
  // le miroir continuait, laisse la main au miroir.
  if (duFichier && revFichier >= revMiroir) return duFichier;

  // `chargerSlot(n)`, pas `localGameRepository.load()` : ce dernier
  // re-résoudrait son propre `slotActif()`, qui peut différer de `n` quand
  // le miroir n'a pas d'index (Ruling R6) — et lirait alors le mauvais
  // emplacement.
  const duMiroir = await chargerSlot(n);
  if (duMiroir) {
    console.warn(
      `[fichierGameRepository] Slot ${n} servi depuis le miroir ` +
        `(fichier ${duFichier ? "distancé" : "illisible"}, ` +
        `révisions fichier=${revFichier} miroir=${revMiroir}).`,
    );
    return duMiroir;
  }
  return duFichier;
}

/**
 * F-04 — jeton de génération. Incrémenté par `clear()`, `clearSlot()` et
 * `invaliderEcrituresEnVol()` (appelé par `detacherPartie`). Une écriture
 * capture la génération au moment où `save()` est APPELÉ ; si elle a changé
 * quand vient son tour d'écrire (ou entre deux étapes), elle s'abandonne :
 * plus rien de ce qui a été lancé avant une bascule/suppression ne doit
 * atteindre le stockage.
 */
let generation = 0;

interface EcritureEnAttente {
  state: GameState;
  /** Slot capturé synchronement à l'appel, ou `null` si seul l'index
   *  fichier peut le dire (miroir sans index). */
  slot: NumeroSlot | null;
  generation: number;
  resoudre: Array<(r: ResultatSave) => void>;
}

/** Écriture (save/clear/clearSlot) en cours, ou `null` si la file est vide. */
let ecritureEnCours: Promise<unknown> | null = null;
/** Au plus UNE save en attente : une nouvelle remplace la précédente
 *  (dernier état gagne), dont les appelants reçoivent le verdict de celle
 *  qui l'a supplantée. */
let saveEnAttente: EcritureEnAttente | null = null;

/**
 * Sérialise TOUTES les écritures : une seule à la fois. `pagehide` et
 * `visibilitychange` peuvent lancer deux `save()` d'états différents dans le
 * même tick ; sans file, leurs écritures natives (slot, index, miroir)
 * pouvaient s'entrelacer et laisser un index qui ne décrit pas le slot.
 */
function enchainer<T>(tache: () => Promise<T>): Promise<T> {
  const precedente = ecritureEnCours ?? Promise.resolve();
  const courante = precedente.then(tache, tache);
  ecritureEnCours = courante.then(
    () => {
      if (ecritureEnCours === courante) ecritureEnCours = null;
    },
    () => {
      if (ecritureEnCours === courante) ecritureEnCours = null;
    },
  );
  return courante;
}

function planifierSave(
  state: GameState,
  slot: NumeroSlot | null,
): Promise<ResultatSave> {
  return new Promise<ResultatSave>((resoudre) => {
    if (saveEnAttente) {
      // Coalescence : l'état précédent, jamais écrit, est obsolète.
      saveEnAttente.state = state;
      saveEnAttente.slot = slot;
      saveEnAttente.generation = generation;
      saveEnAttente.resoudre.push(resoudre);
      return;
    }
    const tache: EcritureEnAttente = {
      state,
      slot,
      generation,
      resoudre: [resoudre],
    };
    saveEnAttente = tache;
    void enchainer(async () => {
      // Lue au moment de PARTIR, pas de planifier : c'est le dernier état
      // coalescé qui s'écrit.
      saveEnAttente = null;
      let r: ResultatSave;
      try {
        r = await executerSave(tache);
      } catch (e) {
        r = { ok: false, genre: genreDe(e) };
      }
      for (const f of tache.resoudre) f(r);
    });
  });
}

/** Résolution SYNCHRONE du slot cible (F-04) : le miroir, s'il a un index
 *  exploitable, répond sans await. Sinon `null` : seul l'index fichier peut
 *  trancher, et `executerSave` le fera — mais la génération capturée ici
 *  protège quand même l'écriture d'une bascule survenue pendant l'await. */
function resoudreSlotSynchrone(slot: NumeroSlot | undefined): NumeroSlot | null {
  if (slot !== undefined) return slot;
  return indexMiroirExiste() ? slotActif() : null;
}

async function executerSave(tache: EcritureEnAttente): Promise<ResultatSave> {
  const { state } = tache;
  if (tache.generation !== generation) return { ok: true, annulee: true };
  const etat = await lireEtatIndexFichier();
  if (tache.generation !== generation) return { ok: true, annulee: true };
  const index = etat.genre === "ok" ? etat.index : null;
  // Résolu une seule fois (Ruling R6) : ni l'écriture du fichier, ni celle
  // du miroir, ni `toucherDerniereSession` ne doivent re-résoudre le leur.
  // Le slot capturé synchronement à l'appel prime (F-04) ; le repli par
  // l'index fichier ne sert que sans miroir exploitable.
  const n = tache.slot ?? resoudreSlotActif(index);
  const serialise = JSON.stringify(state);
  const revision = Math.max(index?.revisions[n] ?? 0, revisionDe(n)) + 1;

  // 1. Le slot d'abord : c'est lui qui rend le verdict.
  //
  // ⚠ ASYMÉTRIE VOULUE, ne pas la « simplifier » (revue finale I1). Sur
  // échec ICI — l'étape 1 —, on écrit quand même le miroir, AVEC la
  // révision, avant de rendre le verdict d'échec :
  //  - c'est la forme exacte de l'incident du 2026-08-23 (disque plein
  //    pendant une heure). Le fichier n'a rien pris ; si WebKit parvient à
  //    persister le `setItem`, l'arbitrage par révision récupère cette
  //    heure au prochain lancement. S'il n'y parvient pas, rien n'est
  //    perdu — on ne fait qu'essayer ;
  //  - c'est le SEUL chemin par lequel `revMiroir > revFichier` peut
  //    naître en production. Sans lui, tout l'arbitrage par révision
  //    traiterait un état inatteignable.
  //
  // Sur échec de l'étape 2 (l'index, plus bas), au contraire, on NE
  // touche PAS au miroir : le fichier du slot vient d'être écrit, il est
  // donc PLUS FRAIS que le miroir. Lui donner une révision plus haute
  // ferait gagner l'arbitrage à un miroir périmé et détruirait ce contenu
  // plus frais — c'est ce que préserve le cas 3b de la migration (voir
  // migrationFichiers.ts).
  //
  // Dans les deux cas le verdict reste celui du FICHIER : le miroir ne le
  // change jamais.
  try {
    await ecrireSave(quoiDuSlot(n), serialise);
  } catch (e) {
    if (tache.generation !== generation) return { ok: true, annulee: true };
    await ecrireMiroir(n, state, revision);
    return { ok: false, genre: genreDe(e) };
  }
  // Une bascule/suppression est survenue pendant l'écriture native : le
  // fichier a pu être écrit (impossible à annuler), mais `clear`/`clearSlot`
  // attendent la fin de cette écriture avant d'effacer — on ne doit surtout
  // pas réécrire index ni miroir par-dessus.
  if (tache.generation !== generation) return { ok: true, annulee: true };

  // 2. L'index ensuite. Une save sans entrée d'index est récupérable ;
  //    l'inverse serait un emplacement fantôme.
  //
  // Ruling R9 : sur un index ABSENT, aucun fichier de slot n'a jamais
  // existé — `{1:0,2:0,3:0}` est la vérité. Sur un index PRÉSENT MAIS
  // ILLISIBLE, en revanche, des fichiers de slots AUTRES que `n` peuvent
  // très bien exister avec une révision réelle non nulle : leur attribuer
  // 0 leur ferait perdre l'arbitrage `revFichier >= revMiroir` de
  // `chargerAvecIndex` face à leur propre miroir, même s'ils sont plus
  // frais — le même dégât que R8(i) corrige pour `load()`, non corrigé
  // ici. La meilleure estimation disponible sans lire ces fichiers est la
  // révision du MIROIR pour chaque slot (`revisionDe`, la même
  // contrepartie que R8(iii) utilise déjà côté migration).
  const basesRevisions: Record<NumeroSlot, number> =
    etat.genre === "illisible"
      ? { 1: revisionDe(1), 2: revisionDe(2), 3: revisionDe(3) }
      : (index?.revisions ?? { 1: 0, 2: 0, 3: 0 });
  const suivant: IndexFichier = {
    actif: n,
    revisions: { ...basesRevisions, [n]: revision },
  };
  try {
    await ecrireSave("index", JSON.stringify(suivant));
  } catch (e) {
    return { ok: false, genre: genreDe(e) };
  }
  if (tache.generation !== generation) return { ok: true, annulee: true };

  // 3. Le miroir en best-effort : son échec ne change pas le verdict.
  await ecrireMiroir(n, state, revision);

  return { ok: true };
}

/**
 * Efface le fichier du slot `n` ET remet son entrée d'index fichier à 0
 * (F-01). Sans la seconde étape, l'index garderait une révision haute pour
 * un fichier vide — inoffensif pour `load()` (un fichier vide ne parse pas),
 * mais trompeur pour toute migration/arbitrage ultérieur. Best-effort : le
 * miroir est déjà vidé par l'appelant, les échecs sont tracés.
 */
async function effacerFichierDuSlot(n: NumeroSlot): Promise<void> {
  try {
    await ecrireSave(quoiDuSlot(n), "");
  } catch (e) {
    // Le miroir est déjà vidé (revision retombée à 0), mais le fichier —
    // et son entrée d'index, restés inchangés — gardent l'ancienne save à
    // une révision plus haute : le prochain load() la ressuscitera via
    // l'arbitrage (revFichier >= revMiroir). Une suppression n'est donc
    // PAS garantie de tenir si le disque est plein au moment même de
    // l'effacer ; c'est un compromis assumé (voir Ruling R5), pas un filet.
    console.warn(
      "[fichierGameRepository] Échec de l'effacement du fichier du slot — " +
        "la partie peut réapparaître au prochain chargement :",
      e,
    );
    return;
  }
  const index = await lireIndexFichier();
  if (!index) return;
  const suivant: IndexFichier = {
    // L'actif du miroir vient d'être (re)calculé par l'appelant ; on l'aligne
    // pour qu'un miroir perdu ne renvoie pas vers un emplacement vidé.
    actif: indexMiroirExiste() ? slotActif() : index.actif,
    revisions: { ...index.revisions, [n]: 0 },
  };
  try {
    await ecrireSave("index", JSON.stringify(suivant));
  } catch (e) {
    console.warn(
      "[fichierGameRepository] Échec de la mise à jour de l'index fichier après effacement :",
      e,
    );
  }
}

export const fichierGameRepository: GameRepository = {
  async load() {
    const etat = await lireEtatIndexFichier();

    // Index présent mais illisible (Ruling R8(i)) : JAMAIS de migration ici.
    // Des fichiers de slots pourraient déjà exister et être plus récents que
    // le miroir (cas 3b, voir migrationFichiers.ts) — migrer par-dessus les
    // écraserait. On sert le miroir pour CETTE session seulement (rien n'est
    // réparé, rien n'est perdu) et on trace pour le diagnostic device, comme
    // `slots.ts:chargerIndex()` le fait pour son propre index illisible.
    if (etat.genre === "illisible") {
      console.warn(
        "[fichierGameRepository] Index fichier présent mais illisible — " +
          "migration non tentée, partie servie depuis le miroir pour cette session.",
      );
      return localGameRepository.load();
    }

    // Index réellement absent : première ouverture après mise à jour. On
    // migre, et si ça échoue on continue sur le miroir — jamais de perte.
    // Pas de rappel à `load()` ici : `migrerVersFichiers()` rend l'index
    // qu'elle vient d'écrire ET de vérifier par relecture stricte (jamais un
    // simple booléen), donc on poursuit DIRECTEMENT avec cet index via
    // `chargerAvecIndex`. Structurellement, il ne peut donc plus y avoir de
    // second passage par `lireEtatIndexFichier()` après une migration — pas
    // seulement « la migration n'a rendu vrai qu'après avoir écrit l'index »
    // (l'hypothèse qui a permis la boucle non bornée corrigée en revue de
    // tâche 6 : un `ecrireSave` qui résout sans être relisible aurait fait
    // boucler `absent → migre → absent → …` indéfiniment, le jeu ne
    // s'affichant jamais).
    if (etat.genre === "absent") {
      const indexMigre = await migrerVersFichiers();
      if (!indexMigre) return localGameRepository.load();
      return chargerAvecIndex(indexMigre);
    }

    return chargerAvecIndex(etat.index);
  },

  save(state, slot): Promise<ResultatSave> {
    // Le slot cible est capturé ICI, synchronement, avant tout await (F-04) :
    // une bascule de slot survenue pendant l'attente ne peut plus détourner
    // l'écriture vers le nouvel emplacement.
    return planifierSave(state, resoudreSlotSynchrone(slot));
  },

  clear() {
    // Invalide d'abord (rien de lancé avant ne doit plus écrire), puis
    // attend son tour dans la file : une écriture native déjà partie ne
    // peut pas être annulée, mais elle sera terminée AVANT l'effacement.
    generation += 1;
    saveEnAttente = null;
    return enchainer(async () => {
      const index = await lireIndexFichier();
      // Résolu une seule fois (Ruling R6) : `viderSlot(n)` vide exactement cet
      // emplacement, sans jamais faire dévier `index.actif` du miroir (à la
      // différence de `supprimerSlot`) et sans `removeItem` supplémentaire au
      // delà de ce que `viderSlot`/`viderSlotActif` font déjà en interne.
      const n = resoudreSlotActif(index);
      viderSlot(n);
      await effacerFichierDuSlot(n);
    });
  },

  clearSlot(n) {
    generation += 1;
    saveEnAttente = null;
    return enchainer(async () => {
      // Miroir d'abord (synchrone, sémantique « Supprimer » : rebascule
      // l'actif si `n` l'était), puis fichier + index fichier.
      supprimerSlot(n);
      await effacerFichierDuSlot(n);
    });
  },

  invaliderEcrituresEnVol() {
    generation += 1;
    saveEnAttente = null;
  },
};
