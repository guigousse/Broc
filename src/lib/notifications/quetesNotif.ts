/**
 * Notifs « Nouvelles quêtes » : une au prochain minuit local (commandes
 * quotidiennes), une au prochain lundi (hebdomadaires). Réutilise le cœur 🅰.
 */
import { NOTIF_IDS } from "./ids";
import { type NotifSpec, programmer, annuler, permissionAccordee } from "./index";
import { prochainMinuitLocalMs, prochainLundiLocalMs } from "@/lib/quetes/periode";

/** Construit les 2 specs aux prochains resets. `now` = epoch ms. */
export function notifsQuetes(now: number): NotifSpec[] {
  return [
    {
      id: NOTIF_IDS.QUETES[0],
      title: "Nouvelles commandes",
      body: "De nouvelles commandes du jour t'attendent !",
      sound: "default",
      atMs: prochainMinuitLocalMs(now),
    },
    {
      id: NOTIF_IDS.QUETES[1],
      title: "Commandes de la semaine",
      body: "De nouvelles commandes hebdomadaires sont disponibles !",
      sound: "default",
      atMs: prochainLundiLocalMs(now),
    },
  ];
}

/** (Re)programme les 2 notifs. No-op si permission non accordée. */
export async function synchroniserNotifsQuetes(now: number): Promise<void> {
  await annuler([...NOTIF_IDS.QUETES]);
  if (!(await permissionAccordee())) return;
  for (const spec of notifsQuetes(now)) {
    await programmer(spec);
  }
}
