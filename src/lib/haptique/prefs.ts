import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

/**
 * Préférence joueur « vibrations » : gate central lu par le pont haptique —
 * couper la préférence suffit à ce qu'aucune vibration ne parte, quel que
 * soit l'appelant. Volontairement HORS sauvegarde (localStorage, comme les
 * préférences audio et notifications) : c'est un réglage d'appareil, il n'a
 * pas à voyager d'un emplacement de partie à l'autre.
 */

const CLE = "projet-broc:haptique:v1";

interface HaptiquePrefs {
  actives: boolean;
}

export function vibrationsActives(): boolean {
  return safeLocalStorageGet<HaptiquePrefs>(CLE, { actives: true }).actives;
}

export function setVibrationsActives(actives: boolean): void {
  safeLocalStorageSet(CLE, { actives } satisfies HaptiquePrefs);
}
