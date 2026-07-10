import { NIVEAU_BROCANTES_T2, NIVEAU_BROCANTES_T3, NIVEAU_BROCANTES_T4 } from "@/data/brocantes";
import {
  NIVEAU_BROCANTEUR_PALIER_2,
  NIVEAU_BROCANTEUR_PALIER_3,
} from "@/data/competences";
import { NIVEAU_QUETES_PERIODIQUES } from "@/lib/quetes/settlePeriodiques";
import { NIVEAU_ACTIVES, NIVEAU_USAGE_2, NIVEAU_USAGE_3 } from "@/lib/actives";

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
/** Libellés FR canoniques des 6 atouts (clés des overlays en/es). */
const ATOUTS: ReadonlyArray<{ id: keyof typeof NIVEAU_ACTIVES; titre: string }> = [
  { id: "flair", titre: "Atout 🔍 Le Flair" },
  { id: "lotGarni", titre: "Atout 🧺 Le Lot garni" },
  { id: "fouille", titre: "Atout 🧹 La Fouille" },
  { id: "boniment", titre: "Atout 🎩 Le Boniment" },
  { id: "tchatche", titre: "Atout 💬 La Tchatche" },
  { id: "criee", titre: "Atout 📣 La Criée" },
];

const ENTREES: readonly DeblocageNiveau[] = [
  { niveau: 1, titre: "Ouverture de l'écran Compétences (+1 point)", famille: "jalon", effectif: true },
  { niveau: NIVEAU_QUETES_PERIODIQUES, titre: "Quêtes quotidiennes et hebdomadaires", famille: "contenu", effectif: true },
  { niveau: NIVEAU_BROCANTES_T2, titre: "Accès aux brocantes de quartier (T2)", famille: "economie", effectif: true },
  { niveau: NIVEAU_BROCANTES_T3, titre: "Accès aux belles foires (T3)", famille: "jalon", effectif: true },
  { niveau: NIVEAU_BROCANTEUR_PALIER_2, titre: "Paliers 2 des compétences", famille: "jalon", effectif: true },
  { niveau: NIVEAU_BROCANTES_T4, titre: "Accès au Grand Salon (T4)", famille: "jalon", effectif: true },
  { niveau: NIVEAU_BROCANTEUR_PALIER_3, titre: "Paliers 3 des compétences", famille: "jalon", effectif: true },
  // Échelle des atouts : déblocage N5→30, 2ᵉ usage N35→60, 3ᵉ N65→90.
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_ACTIVES[a.id], titre: a.titre, famille: "active" as const, effectif: true,
  })),
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_USAGE_2[a.id], titre: `${a.titre} — 2ᵉ usage par jour`, famille: "active" as const, effectif: true,
  })),
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_USAGE_3[a.id], titre: `${a.titre} — 3ᵉ usage par jour`, famille: "active" as const, effectif: true,
  })),
];

/** Table triée par niveau (contrat de `prochainDeblocage` : find() en ordre). */
export const DEBLOCAGES_PAR_NIVEAU: readonly DeblocageNiveau[] = [...ENTREES].sort(
  (a, b) => a.niveau - b.niveau,
);

export function deblocagesPourNiveau(niveau: number): DeblocageNiveau[] {
  return DEBLOCAGES_PAR_NIVEAU.filter((d) => d.niveau === niveau);
}

export function prochainDeblocage(niveau: number): DeblocageNiveau | null {
  return DEBLOCAGES_PAR_NIVEAU.find((d) => d.niveau > niveau) ?? null;
}
