/**
 * Notifs « Objet restauré » : une par objet en restauration (max 3, = slots
 * d'atelier), programmée à l'échéance `finMs`. Réutilise le cœur générique 🅰.
 */
import { NOTIF_IDS } from "./ids";
import { type NotifSpec, programmer, annuler, permissionAccordee } from "./index";

/** Objet en cours, vu par les notifs. */
export interface ObjetEnRestau {
  nom: string;
  finMs: number;
}

/** Construit les specs (objets non terminés, plafonnés au nombre d'IDs). Pur. */
export function notifsRestauration(
  objets: ObjetEnRestau[],
  now: number,
): NotifSpec[] {
  return objets
    .filter((o) => o.finMs > now)
    .slice(0, NOTIF_IDS.RESTAURATION.length)
    .map((o, i) => ({
      id: NOTIF_IDS.RESTAURATION[i],
      title: "Atelier",
      body: `« ${o.nom} » est restauré ✓`,
      sound: "default",
      atMs: o.finMs,
    }));
}

/** Annule la plage puis (re)programme. No-op si permission non accordée. */
export async function synchroniserNotifsRestauration(
  objets: ObjetEnRestau[],
  now: number,
): Promise<void> {
  await annuler([...NOTIF_IDS.RESTAURATION]);
  if (!(await permissionAccordee())) return;
  for (const spec of notifsRestauration(objets, now)) {
    await programmer(spec);
  }
}
