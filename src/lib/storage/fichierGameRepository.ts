import type { GameState } from "@/types/game";
import type { GameRepository, ResultatSave } from "./gameRepository";
import { localGameRepository } from "./localGameRepository";
import { ecrireSave, lireSave, quoiDuSlot } from "./pontNatif";
import type { ErreurStockage } from "./pontNatif";
import {
  revisionDe,
  slotActif,
  toucherDerniereSession,
  viderSlotActif,
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

export const fichierGameRepository: GameRepository = {
  async load() {
    const n = slotActif();
    const index = await lireIndexFichier();

    // Pas d'index fichier : rien n'a encore été migré (tâche 6 branchera ici).
    if (!index) return localGameRepository.load();

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

    const duMiroir = await localGameRepository.load();
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
    const n = slotActif();
    const serialise = JSON.stringify(state);
    const index = await lireIndexFichier();
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
    await localGameRepository.save(state);
    toucherDerniereSession(n, revision);

    return { ok: true };
  },

  async clear() {
    viderSlotActif();
    try {
      await ecrireSave(quoiDuSlot(slotActif()), "");
    } catch {
      // Le fichier restera, mais l'index du miroir dit déjà l'emplacement vide.
    }
  },
};
