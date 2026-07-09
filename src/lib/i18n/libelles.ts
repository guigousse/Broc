import type {
  CategorieObjet,
  Courrier,
  EtatObjet,
  LedgerEntry,
  Rarete,
} from "@/types/game";
import type { FamilleDeblocage } from "@/data/deblocagesNiveau";
import type { ActiveId } from "@/lib/actives";
import type { Locale } from "@/lib/i18n/locales";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import { tr } from "@/lib/i18n/ui";
import { getBrocanteById } from "@/data/brocantes";
import { getStockageTierParNiveau } from "@/data/stockage";
import { nomBrocante, nomStockageTier, titreCourrier } from "@/lib/i18n/contenu";

/**
 * Traduction À L'AFFICHAGE des unions internes persistées (EtatObjet,
 * Rarete). Les valeurs de save/logique ne changent JAMAIS (règle d'or de
 * la spec i18n) — seul le libellé rendu passe par le dictionnaire.
 */
export function libelleEtat(etat: EtatObjet, d: DictionnaireUI): string {
  switch (etat) {
    case "Mauvais":
      return d.etats.mauvais;
    case "Bon":
      return d.etats.bon;
    case "Très bon":
      return d.etats.tresBon;
    case "Pristin état":
      return d.etats.pristin;
  }
}

export function libelleRarete(rarete: Rarete, d: DictionnaireUI): string {
  switch (rarete) {
    case "commun":
      return d.raretes.commun;
    case "rare":
      return d.raretes.rare;
    case "legendaire":
      return d.raretes.legendaire;
  }
}

export function libelleCategorie(cat: CategorieObjet, d: DictionnaireUI): string {
  switch (cat) {
    case "Musique":
      return d.categories.musique;
    case "Jeux & Loisirs":
      return d.categories.jeuxLoisirs;
    case "Livres & Papeterie":
      return d.categories.livresPapeterie;
    case "Mode":
      return d.categories.mode;
    case "Maison":
      return d.categories.maison;
    case "Objets d'art":
      return d.categories.objetsArt;
    case "Bricolage":
      return d.categories.bricolage;
  }
}

/** Libellé localisé d'une famille de déblocage (union fermée de 5). */
export function libelleFamille(f: FamilleDeblocage, d: DictionnaireUI): string {
  switch (f) {
    case "jalon":
      return d.familles.jalon;
    case "contenu":
      return d.familles.contenu;
    case "economie":
      return d.familles.economie;
    case "confort":
      return d.familles.confort;
    case "active":
      return d.familles.active;
  }
}

/**
 * Nom localisé d'une active (HUD de chine/vente). Cohérence obligatoire avec
 * les titres de déblocage EN/ES (`contenu/{en,es}/deblocages.ts`) : ce sont
 * les MÊMES noms d'active déjà actés là-bas, réutilisés ici.
 */
export function libelleActive(id: ActiveId, d: DictionnaireUI): string {
  switch (id) {
    case "flair":
      return d.actives.flair;
    case "lotGarni":
      return d.actives.lotGarni;
    case "fouille":
      return d.actives.fouille;
    case "boniment":
      return d.actives.boniment;
    case "tchatche":
      return d.actives.tchatche;
    case "criee":
      return d.actives.criee;
    case "diplomate":
      return d.actives.diplomate;
  }
}

/** Clés du dictionnaire `jours`, indexées comme `JOURS_SEMAINE` de meteo.ts (0 = Lundi). */
const CLES_JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;

/**
 * Abréviation localisée d'un jour de semaine (index 0-6, 0 = Lundi — même
 * convention que `JOURS_SEMAINE` de `@/lib/meteo`, qui reste la valeur
 * canonique côté logique/save ; seul l'affichage passe par le dictionnaire).
 */
export function libelleJourSemaine(index: number, d: DictionnaireUI): string {
  return d.jours[CLES_JOURS[((index % 7) + 7) % 7]];
}

/**
 * Nom de brocante localisé pour le grand livre : lookup par id dans les données,
 * puis overlay de langue. Id introuvable → `null` (le caller retombe alors sur la
 * `designation` FR historisée, seule source restante du nom pour cette brocante).
 */
function nomBrocanteLedger(brocanteId: string | undefined, locale: Locale): string | null {
  if (!brocanteId) return null;
  const brocante = getBrocanteById(brocanteId);
  return brocante ? nomBrocante(brocante, locale) : null;
}

/**
 * Libellé localisé d'une écriture du grand livre, re-rendu à l'affichage depuis
 * `e.params` (SP4 i18n). Une entrée sans `params` (vieilles saves) ou dont un
 * lookup échoue retombe sur `e.designation` (FR historisée) — dégradation assumée.
 * `courriers` sert à résoudre le titre des récompenses (courrier/mission).
 */
export function libelleLedger(
  e: LedgerEntry,
  d: DictionnaireUI,
  locale: Locale,
  courriers: Courrier[],
): string {
  const p = e.params;
  if (!p) return e.designation;

  switch (e.kind) {
    case "loyer": {
      if (p.niveau === undefined) return e.designation;
      const tier = getStockageTierParNiveau(p.niveau as 1 | 2 | 3);
      return tr(d.ledger.loyer, { tier: nomStockageTier(tier, locale) });
    }
    case "upgrade_atelier":
      return p.niveau === undefined
        ? e.designation
        : tr(d.ledger.upgradeAtelier, { niveau: p.niveau });
    case "upgrade_stockage":
      return p.niveau === undefined
        ? e.designation
        : tr(d.ledger.upgradeStockage, { niveau: p.niveau });
    case "upgrade_camion":
      return p.niveau === undefined
        ? e.designation
        : tr(d.ledger.upgradeCamion, { niveau: p.niveau });
    case "session_chinage": {
      const brocante = nomBrocanteLedger(p.brocanteId, locale);
      if (brocante === null || p.nb === undefined) return e.designation;
      return p.nb === 1
        ? tr(d.ledger.sessionChinageUn, { brocante })
        : tr(d.ledger.sessionChinageN, { brocante, nb: p.nb });
    }
    case "session_vente":
      if (p.nb === undefined) return e.designation;
      return p.nb === 1
        ? d.ledger.sessionVenteUne
        : tr(d.ledger.sessionVenteN, { nb: p.nb });
    case "gazette":
      return p.jour === undefined
        ? e.designation
        : tr(d.ledger.gazette, { jour: p.jour });
    case "frais_brocante": {
      const brocante = nomBrocanteLedger(p.brocanteId, locale);
      return brocante === null ? e.designation : tr(d.ledger.fraisBrocante, { brocante });
    }
    case "courrier_recompense": {
      const courrier = courriers.find((c) => c.id === p.courrierId);
      return courrier ? titreCourrier(courrier, locale) : e.designation;
    }
    case "mission_recompense": {
      const courrier = courriers.find((c) => c.id === p.courrierId);
      return courrier
        ? tr(d.ledger.missionRecompense, { titre: titreCourrier(courrier, locale) })
        : e.designation;
    }
  }
}
