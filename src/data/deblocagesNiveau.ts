import {
  NIVEAU_BROCANTEUR_PALIER_2,
  NIVEAU_BROCANTEUR_PALIER_3,
} from "@/data/competences";
import { NIVEAU_QUETES_PERIODIQUES } from "@/lib/quetes/settlePeriodiques";
import { NIVEAU_ACTIVES, NIVEAU_USAGE_2, NIVEAU_USAGE_3 } from "@/lib/actives";

export type FamilleDeblocage = "jalon" | "contenu" | "economie" | "confort" | "active";

export interface DeblocageNiveau {
  niveau: number;
  titre: string;
  description: string;
  famille: FamilleDeblocage;
  /** true si le gate est réellement appliqué par le code (sinon ligne informative pour l'UI du plan 4). */
  effectif: boolean;
}

/** Source de vérité du plan de déblocage (rapport §08). Seuls les jalons validés (D1/D3/actives) sont effectifs. */
/** Libellés FR canoniques des 6 atouts (clés des overlays en/es). */
const ATOUTS: ReadonlyArray<{ id: keyof typeof NIVEAU_ACTIVES; titre: string; desc: string }> = [
  { id: "flair", titre: "Atout 🔍 Le Flair",
    desc: "En chine : révèle la cote de l'objet affiché. Un usage par jour." },
  { id: "lotGarni", titre: "Atout 🧺 Le Lot garni",
    desc: "En pleine négociation à l'étal : ajoute un second objet au panier du client, le prix du lot est renégocié d'un bloc. Un usage par jour." },
  { id: "fouille", titre: "Atout 🧹 La Fouille",
    desc: "En chine : le vendeur remplace l'objet visé par un nouveau tirage. Un usage par jour." },
  { id: "boniment", titre: "Atout 🎩 Le Boniment",
    desc: "En vente : force la conclusion — si votre prix reste raisonnable le client l'accepte aussitôt, sinon il révèle son budget exact sans se fâcher. Un usage par jour." },
  { id: "tchatche", titre: "Atout 💬 La Tchatche",
    desc: "En chine : rouvre une négociation qui vient d'échouer, le vendeur retrouve son calme. Un usage par jour." },
  { id: "criee", titre: "Atout 📣 La Criée",
    desc: "À l'étal : ameute le passage — trois clients se présentent coup sur coup. Un usage par jour." },
];

const DESC_USAGE_2 = "L'atout peut désormais être utilisé deux fois par jour.";
const DESC_USAGE_3 = "L'atout peut désormais être utilisé trois fois par jour.";

const ENTREES: readonly DeblocageNiveau[] = [
  { niveau: 1, titre: "Ouverture de l'écran Compétences (+1 point)", famille: "jalon", effectif: true,
    description: "La bibliothèque ouvre l'écran Compétences : dépensez vos points (1 par palier) pour renforcer votre métier." },
  { niveau: NIVEAU_QUETES_PERIODIQUES, titre: "Quêtes quotidiennes et hebdomadaires", famille: "contenu", effectif: true,
    description: "Le courrier apporte des commandes : une quotidienne, et une hebdomadaire plus ambitieuse, récompensées en argent." },
  { niveau: NIVEAU_BROCANTEUR_PALIER_2, titre: "Paliers 2 des compétences", famille: "jalon", effectif: true,
    description: "Les paliers 2 de toutes les branches de compétences deviennent achetables." },
  { niveau: NIVEAU_BROCANTEUR_PALIER_3, titre: "Paliers 3 des compétences", famille: "jalon", effectif: true,
    description: "Les paliers 3 — le sommet de chaque branche — deviennent achetables." },
  // Échelle des atouts : déblocage N5→30, 2ᵉ usage N35→60, 3ᵉ N65→90.
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_ACTIVES[a.id], titre: a.titre, famille: "active" as const, effectif: true,
    description: a.desc,
  })),
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_USAGE_2[a.id], titre: `${a.titre} — 2ᵉ usage par jour`, famille: "active" as const, effectif: true,
    description: DESC_USAGE_2,
  })),
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_USAGE_3[a.id], titre: `${a.titre} — 3ᵉ usage par jour`, famille: "active" as const, effectif: true,
    description: DESC_USAGE_3,
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
