/**
 * Notifs « Nouvelles quêtes » : régénérées silencieusement à minuit local (côté
 * data), mais notifiées à 8h — minuit a un taux d'ouverture nul, la notif y
 * dormirait dans le tray jusqu'au matin. Complétées par un rappel en soirée
 * (19h) si les quêtes du jour/de la semaine ne sont toujours pas faites.
 * Réutilise le cœur générique 🅰.
 */
import { NOTIF_IDS } from "./ids";
import { type NotifSpec, programmer, annuler, permissionAccordee } from "./index";
import {
  prochainMinuitLocalMs,
  prochainLundiLocalMs,
  plusHeureLocale,
  minuitLocalMs,
  veilleMs,
} from "@/lib/quetes/periode";

const HEURE_NOUVELLES_QUETES = 8; // matin : créneau d'engagement le plus fiable
const HEURE_RAPPEL_QUETES = 19; // soir : dernière fenêtre avant la fin de journée

/** Signale, pour chaque lot, s'il reste au moins une mission non résolue. */
export interface EtatQuetesNotif {
  quotidienNonTerminee: boolean;
  hebdoNonTerminee: boolean;
}

/** Rappel « quêtes non faites » à 19h, uniquement si encore actives et si 19h n'est pas déjà passé. */
function notifRappel(
  id: number,
  title: string,
  body: string,
  now: number,
  minuitDuJour: number,
  nonTerminee: boolean,
): NotifSpec | null {
  if (!nonTerminee) return null;
  const atMs = plusHeureLocale(minuitDuJour, HEURE_RAPPEL_QUETES);
  if (atMs <= now) return null;
  return { id, title, body, sound: "regen.wav", atMs };
}

/** Construit les specs actives : 2 « nouvelles quêtes » + jusqu'à 2 rappels. `now` = epoch ms. */
export function notifsQuetes(now: number, etat: EtatQuetesNotif): NotifSpec[] {
  const specs: NotifSpec[] = [
    {
      id: NOTIF_IDS.QUETES[0],
      title: "Nouvelles commandes",
      body: "De nouvelles commandes du jour t'attendent !",
      sound: "regen.wav",
      atMs: plusHeureLocale(prochainMinuitLocalMs(now), HEURE_NOUVELLES_QUETES),
    },
    {
      id: NOTIF_IDS.QUETES[1],
      title: "Commandes de la semaine",
      body: "De nouvelles commandes hebdomadaires sont disponibles !",
      sound: "regen.wav",
      atMs: plusHeureLocale(prochainLundiLocalMs(now), HEURE_NOUVELLES_QUETES),
    },
  ];

  const rappelQuotidien = notifRappel(
    NOTIF_IDS.RAPPEL_QUETES[0],
    "Commandes du jour en attente",
    "Il te reste des commandes du jour à honorer avant minuit !",
    now,
    minuitLocalMs(now),
    etat.quotidienNonTerminee,
  );
  if (rappelQuotidien) specs.push(rappelQuotidien);

  const rappelHebdo = notifRappel(
    NOTIF_IDS.RAPPEL_QUETES[1],
    "Commandes de la semaine en attente",
    "Il te reste des commandes hebdomadaires avant la remise à zéro !",
    now,
    veilleMs(prochainLundiLocalMs(now)),
    etat.hebdoNonTerminee,
  );
  if (rappelHebdo) specs.push(rappelHebdo);

  return specs;
}

/** (Re)programme les notifs actives. No-op si permission non accordée. */
export async function synchroniserNotifsQuetes(
  now: number,
  etat: EtatQuetesNotif,
): Promise<void> {
  await annuler([...NOTIF_IDS.QUETES, ...NOTIF_IDS.RAPPEL_QUETES]);
  if (!(await permissionAccordee())) return;
  for (const spec of notifsQuetes(now, etat)) {
    await programmer(spec);
  }
}
