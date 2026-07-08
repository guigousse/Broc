import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";
import { NOTIF_IDS } from "./ids";
import { annuler } from "./index";

/**
 * Préférence joueur « notifications actives » (distincte de la permission
 * système iOS) : gate central lu par `programmer()` — couper la préférence
 * suffit à ce qu'aucune notif future ne soit posée, quel que soit l'appelant.
 */

const CLE = "projet-broc:notifs:v1";

interface NotifsPrefs {
  actives: boolean;
}

export function notifsActives(): boolean {
  return safeLocalStorageGet<NotifsPrefs>(CLE, { actives: true }).actives;
}

/** Toutes les notifs connues, pour l'annulation en bloc à la désactivation. */
export function tousLesIdsNotifs(): number[] {
  return [
    NOTIF_IDS.ENERGIE_PLEINE,
    ...NOTIF_IDS.RAPPEL_RETOUR,
    ...NOTIF_IDS.RESTAURATION,
    ...NOTIF_IDS.QUETES,
    ...NOTIF_IDS.RAPPEL_QUETES,
  ];
}

export function setNotifsActives(actives: boolean): void {
  safeLocalStorageSet(CLE, { actives } satisfies NotifsPrefs);
  if (!actives) {
    // Les notifs déjà programmées ne doivent pas partir après coup.
    void annuler(tousLesIdsNotifs());
  }
}
