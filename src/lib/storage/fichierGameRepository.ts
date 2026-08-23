import type { GameState } from "@/types/game";
import type { GameRepository, ResultatSave } from "./gameRepository";
import { chargerSlot, enregistrerSlot, localGameRepository } from "./localGameRepository";
import { ecrireSave, lireSave, quoiDuSlot } from "./pontNatif";
import type { ErreurStockage } from "./pontNatif";
import {
  indexMiroirExiste,
  revisionDe,
  slotActif,
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

async function lireIndexFichier(): Promise<IndexFichier | null> {
  try {
    return parse<IndexFichier>(await lireSave("index"));
  } catch {
    return null;
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
 * index RÉELLEMENT enregistré (c'est lui que `changerSlotActif()` écrit) ;
 * sinon, seul l'actif du fichier a une chance d'être à jour. `index` peut
 * être `null` (aucune save fichier encore écrite) : l'actif retombe alors
 * sur 1, comme le ferait un miroir tout neuf.
 */
function resoudreSlotActif(index: IndexFichier | null): NumeroSlot {
  return indexMiroirExiste() ? slotActif() : index?.actif ?? 1;
}

export const fichierGameRepository: GameRepository = {
  async load() {
    const index = await lireIndexFichier();

    // Pas d'index fichier : rien n'a encore été migré (tâche 6 branchera ici).
    if (!index) return localGameRepository.load();

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
  },

  async save(state): Promise<ResultatSave> {
    const index = await lireIndexFichier();
    // Résolu une seule fois (Ruling R6) : ni l'écriture du fichier, ni celle
    // du miroir, ni `toucherDerniereSession` ne doivent re-résoudre le leur.
    const n = resoudreSlotActif(index);
    const serialise = JSON.stringify(state);
    const revision = Math.max(index?.revisions[n] ?? 0, revisionDe(n)) + 1;

    // 1. Le slot d'abord : c'est lui qui rend le verdict.
    try {
      await ecrireSave(quoiDuSlot(n), serialise);
    } catch (e) {
      return { ok: false, genre: genreDe(e) };
    }

    // 2. L'index ensuite. Une save sans entrée d'index est récupérable ;
    //    l'inverse serait un emplacement fantôme.
    const suivant: IndexFichier = {
      actif: n,
      revisions: { ...(index?.revisions ?? { 1: 0, 2: 0, 3: 0 }), [n]: revision },
    };
    try {
      await ecrireSave("index", JSON.stringify(suivant));
    } catch (e) {
      return { ok: false, genre: genreDe(e) };
    }

    // 3. Le miroir en best-effort : son échec ne change pas le verdict.
    //    `enregistrerSlot(n, …)`, pas `localGameRepository.save(…)` : ce
    //    dernier re-résoudrait son propre `slotActif()` (Ruling R6).
    await enregistrerSlot(n, state);
    toucherDerniereSession(n, revision);

    return { ok: true };
  },

  async clear() {
    const index = await lireIndexFichier();
    // Résolu une seule fois (Ruling R6) : `viderSlot(n)` vide exactement cet
    // emplacement, sans jamais faire dévier `index.actif` du miroir (à la
    // différence de `supprimerSlot`) et sans `removeItem` supplémentaire au
    // delà de ce que `viderSlot`/`viderSlotActif` font déjà en interne.
    const n = resoudreSlotActif(index);
    viderSlot(n);
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
    }
  },
};
