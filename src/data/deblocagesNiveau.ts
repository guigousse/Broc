import { NIVEAU_BROCANTES_T2, NIVEAU_BROCANTES_T3, NIVEAU_BROCANTES_T4 } from "@/data/brocantes";
import {
  NIVEAU_BROCANTEUR_PALIER_2,
  NIVEAU_BROCANTEUR_PALIER_3,
} from "@/data/competences";
import { NIVEAU_QUETES_PERIODIQUES } from "@/lib/quetes/settlePeriodiques";

export type FamilleDeblocage = "jalon" | "contenu" | "economie" | "confort" | "active";

/** Libellé humain de chaque famille de déblocage (donnée pure, UI-agnostique). */
export const LIBELLE_FAMILLE: Record<FamilleDeblocage, string> = {
  jalon: "Jalon",
  contenu: "Contenu",
  economie: "Économie",
  confort: "Confort",
  active: "Active",
};

export interface DeblocageNiveau {
  niveau: number;
  titre: string;
  famille: FamilleDeblocage;
  /** true si le gate est réellement appliqué par le code (sinon ligne informative pour l'UI du plan 4). */
  effectif: boolean;
}

/** Source de vérité du plan de déblocage (rapport §08). Seuls les jalons validés (D1/D3/actives) sont effectifs. */
export const DEBLOCAGES_PAR_NIVEAU: readonly DeblocageNiveau[] = [
  { niveau: 1, titre: "Ouverture de l'écran Compétences (+1 point)", famille: "jalon", effectif: true },
  { niveau: NIVEAU_QUETES_PERIODIQUES, titre: "Quêtes quotidiennes et hebdomadaires", famille: "contenu", effectif: true },
  { niveau: NIVEAU_BROCANTES_T2, titre: "Accès aux brocantes de quartier (T2)", famille: "economie", effectif: true },
  { niveau: 5, titre: "Atout 🔍 Le Flair", famille: "active", effectif: true },
  { niveau: 7, titre: "Atout 🧺 Le Lot garni", famille: "active", effectif: true },
  { niveau: 9, titre: "Atout 🧹 La Fouille", famille: "active", effectif: true },
  { niveau: NIVEAU_BROCANTES_T3, titre: "Accès aux belles foires (T3)", famille: "jalon", effectif: true },
  { niveau: NIVEAU_BROCANTEUR_PALIER_2, titre: "Paliers 2 des compétences", famille: "jalon", effectif: true },
  { niveau: 13, titre: "Atout 🎩 Le Boniment", famille: "active", effectif: true },
  { niveau: 15, titre: "Atout 💬 La Tchatche", famille: "active", effectif: true },
  { niveau: 17, titre: "Atout 📣 La Criée", famille: "active", effectif: true },
  { niveau: NIVEAU_BROCANTES_T4, titre: "Accès au Grand Salon (T4)", famille: "jalon", effectif: true },
  // Le tableau doit rester trié par niveau : prochainDeblocage fait un find().
  { niveau: NIVEAU_BROCANTEUR_PALIER_3, titre: "Paliers 3 des compétences", famille: "jalon", effectif: true },
];

export function deblocagesPourNiveau(niveau: number): DeblocageNiveau[] {
  return DEBLOCAGES_PAR_NIVEAU.filter((d) => d.niveau === niveau);
}

export function prochainDeblocage(niveau: number): DeblocageNiveau | null {
  return DEBLOCAGES_PAR_NIVEAU.find((d) => d.niveau > niveau) ?? null;
}
