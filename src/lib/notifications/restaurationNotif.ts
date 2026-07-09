/**
 * Notifs « Objet restauré » : une par objet en restauration (max 3, = slots
 * d'atelier), programmée à l'échéance `finMs`. Réutilise le cœur générique 🅰.
 */
import { NOTIF_IDS } from "./ids";
import { type NotifSpec, programmer, annuler, permissionAccordee } from "./index";
import type { Locale } from "@/lib/i18n/locales";
import { DICTIONNAIRES, tr } from "@/lib/i18n/ui";
import { nomObjet } from "@/lib/i18n/contenu";

/**
 * Objet en cours, vu par les notifs. `templateId` est requis pour résoudre le
 * nom localisé (`nomObjet`) ; `nom` reste le snapshot FR legacy, utilisé
 * uniquement en repli si le template est introuvable (cf. `nomObjet`).
 */
export interface ObjetEnRestau {
  templateId: string;
  nom: string;
  finMs: number;
}

/**
 * Construit les specs (objets non terminés, plafonnés au nombre d'IDs). Pur.
 * Le nom de l'objet est résolu dans `locale` AU SCHEDULING (jamais relu plus
 * tard) via `nomObjet` — aucune chaîne localisée n'est jamais persistée.
 */
export function notifsRestauration(
  objets: ObjetEnRestau[],
  now: number,
  locale: Locale,
): NotifSpec[] {
  const d = DICTIONNAIRES[locale].notifs.restauration;
  return objets
    .filter((o) => o.finMs > now)
    .slice(0, NOTIF_IDS.RESTAURATION.length)
    .map((o, i) => ({
      id: NOTIF_IDS.RESTAURATION[i],
      title: d.titre,
      body: tr(d.corps, { nom: nomObjet(o, locale) }),
      sound: "marteau.wav",
      atMs: o.finMs,
    }));
}

/** Annule la plage puis (re)programme. No-op si permission non accordée. */
export async function synchroniserNotifsRestauration(
  objets: ObjetEnRestau[],
  now: number,
  locale: Locale,
): Promise<void> {
  await annuler([...NOTIF_IDS.RESTAURATION]);
  if (!(await permissionAccordee())) return;
  for (const spec of notifsRestauration(objets, now, locale)) {
    await programmer(spec);
  }
}
