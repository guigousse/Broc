import type { Brocante, NegoPersona, VendeurArchetypeId } from "@/types/game";

/** Médianes des 5 axes par archétype vendeur. */
const PERSONAS_VENDEUR_BASE: Record<
  VendeurArchetypeId,
  Omit<NegoPersona, "archetype">
> = {
  naif:       { margePct: 0.95, elanPct: 0.90, patience: 4, tolerancePct: 0.95, sangFroid: 0.90 },
  bonhomme:   { margePct: 0.40, elanPct: 0.55, patience: 5, tolerancePct: 0.70, sangFroid: 0.85 },
  mamie:      { margePct: 0.45, elanPct: 0.85, patience: 2, tolerancePct: 0.55, sangFroid: 0.50 },
  malin:      { margePct: 0.25, elanPct: 0.20, patience: 5, tolerancePct: 0.50, sangFroid: 0.80 },
  grincheux:  { margePct: 0.10, elanPct: 0.25, patience: 3, tolerancePct: 0.30, sangFroid: 0.25 },
  antiquaire: { margePct: 0.12, elanPct: 0.45, patience: 4, tolerancePct: 0.35, sangFroid: 0.95 },
  pipelette:   { margePct: 0.55, elanPct: 0.30, patience: 6, tolerancePct: 0.85, sangFroid: 0.98 },
  videcave:    { margePct: 0.70, elanPct: 0.80, patience: 2, tolerancePct: 0.85, sangFroid: 0.70 },
  bonimenteur: { margePct: 0.65, elanPct: 0.40, patience: 4, tolerancePct: 0.60, sangFroid: 0.75 },
  disquaire:   { margePct: 0.15, elanPct: 0.35, patience: 5, tolerancePct: 0.40, sangFroid: 0.90 },
};

/** Nom lisible affiché en sheet (titre + sous-titre). */
export const NOM_ARCHETYPE: Record<VendeurArchetypeId, string> = {
  naif: "Le Naïf",
  bonhomme: "Le Bonhomme",
  mamie: "Mamie pressée",
  malin: "Le Malin",
  grincheux: "Le Grincheux",
  antiquaire: "L'Antiquaire",
  pipelette: "La Pipelette",
  videcave: "Le Vide-Cave",
  bonimenteur: "Le Bonimenteur",
  disquaire: "Le Disquaire",
};

/** Nom propre fixe de chaque personnage vendeur (affiché sur la plaque de négo). */
export const NOM_VENDEUR: Record<VendeurArchetypeId, string> = {
  naif: "P'tit Lucien",
  bonhomme: "Dédé la Bretelle",
  mamie: "Mamie Odette",
  malin: "Anatole la Combine",
  grincheux: "Père Anselme",
  antiquaire: "Madame Vasseur",
  pipelette: "Tata Monique",
  videcave: "Jeannot Vide-Cave",
  bonimenteur: "Oscar la Tchatche",
  disquaire: "Barnabé 33-Tours",
};

/** Nom affichable d'un vendeur, avec repli générique si l'archétype est inconnu. */
export function getNomVendeur(archetype: string): string {
  return NOM_VENDEUR[archetype as VendeurArchetypeId] ?? "Un vendeur";
}

/**
 * Pondérations de tirage par tier de brocante. Les biais d'ambiance sont
 * appliqués par-dessus dans `tirerPersonaVendeur()`.
 */
const POIDS_PAR_TIER: Record<1 | 2 | 3 | 4, Record<VendeurArchetypeId, number>> = {
  1: { naif: 4,  bonhomme: 28, mamie: 22, malin: 8,  grincheux: 26, antiquaire: 0,  pipelette: 14, videcave: 10, bonimenteur: 6,  disquaire: 0 },
  2: { naif: 1,  bonhomme: 20, mamie: 12, malin: 30, grincheux: 17, antiquaire: 20, pipelette: 8,  videcave: 8,  bonimenteur: 10, disquaire: 0 },
  3: { naif: 0,  bonhomme: 8,  mamie: 4,  malin: 30, grincheux: 13, antiquaire: 45, pipelette: 3,  videcave: 3,  bonimenteur: 8,  disquaire: 0 },
  4: { naif: 0,  bonhomme: 4,  mamie: 2,  malin: 24, grincheux: 10, antiquaire: 60, pipelette: 1,  videcave: 0,  bonimenteur: 4,  disquaire: 0 },
};

/** Biais additif d'ambiance — pousse certains archétypes au sein d'un tier. */
const BIAIS_AMBIANCE: Partial<Record<string, Partial<Record<VendeurArchetypeId, number>>>> = {
  Familial: { bonhomme: 10, mamie: 8, pipelette: 6 },
  Sélect: { antiquaire: 20 },
  Précieux: { antiquaire: 25 },
  Mondain: { antiquaire: 15, malin: 5 },
  Geek: { malin: 12 },
  Vinyle: { malin: 12, disquaire: 10 },
  Sciure: { grincheux: 6 },
  Dense: { grincheux: 8 },
  Studieux: { antiquaire: 6 },
};

function jitter(v: number, amplitude = 0.1): number {
  const factor = 1 + (Math.random() * 2 - 1) * amplitude;
  return v * factor;
}

function pickPondere<T extends string>(weights: Record<T, number>): T {
  const total = (Object.values(weights) as number[]).reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (const k of Object.keys(weights) as T[]) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0] as T;
}

/** Tire un persona vendeur pour un item d'une brocante donnée. */
export function tirerPersonaVendeur(brocante: Brocante | undefined): NegoPersona {
  const tier = brocante?.tier ?? 1;
  const base = { ...POIDS_PAR_TIER[tier] };
  const biais = brocante ? BIAIS_AMBIANCE[brocante.ambiance] : undefined;
  if (biais) {
    for (const [arch, bonus] of Object.entries(biais) as [VendeurArchetypeId, number][]) {
      base[arch] = (base[arch] ?? 0) + bonus;
    }
  }
  const archetype = pickPondere(base);
  const ref = PERSONAS_VENDEUR_BASE[archetype];
  return {
    archetype,
    margePct: Math.min(1, Math.max(0, jitter(ref.margePct))),
    elanPct: Math.min(1, Math.max(0, jitter(ref.elanPct))),
    patience: Math.max(2, Math.round(ref.patience + (Math.random() * 2 - 1))),
    tolerancePct: Math.min(1, Math.max(0, jitter(ref.tolerancePct))),
    sangFroid: Math.min(1, Math.max(0, jitter(ref.sangFroid))),
  };
}

/** Calcule la cible secrète (prixMinAccept en achat) depuis le persona et le prix initial. */
export function calculerPrixMinAcceptDepuisPersona(
  persona: NegoPersona,
  prixVendeur: number,
): number {
  return Math.max(1, Math.round(prixVendeur * (1 - persona.margePct)));
}
