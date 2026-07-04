import type {
  CategorieObjet,
  CompetenceDef,
  CompetenceId,
  CompetenceTreeDef,
  CompetenceTreeId,
  CompetenceTreeState,
  PalierDef,
} from "@/types/game";
import { CATEGORIES } from "@/data/categories";

export const TREE_GENERAL: CompetenceTreeId = "general";

export function catTreeId(categorie: CategorieObjet): CompetenceTreeId {
  return `cat.${categorie}`;
}

export const CATEGORIES_THEMATIQUES: CategorieObjet[] = CATEGORIES;

export function emptyTreeState(): CompetenceTreeState {
  return { xp: 0, niveau: 0, pointsDisponibles: 0 };
}

export function emptyAllTrees(): Record<CompetenceTreeId, CompetenceTreeState> {
  const trees: Record<CompetenceTreeId, CompetenceTreeState> = {
    [TREE_GENERAL]: emptyTreeState(),
  };
  for (const c of CATEGORIES_THEMATIQUES) trees[catTreeId(c)] = emptyTreeState();
  return trees;
}

// =====================================================================
// PATTERNS DE PALIERS — modèles réutilisés pour générer les branches
// =====================================================================

export const AFFINITE_PALIER_2 = 20;
export const AFFINITE_PALIER_3 = 50;
export const NIVEAU_BROCANTEUR_PALIER_2_GENERAL = 5;
export const NIVEAU_BROCANTEUR_PALIER_3 = 12;

/** Coût, niveau de Brocanteur et affinité par défaut pour les paliers 1/2/3 (arbres thématiques). */
const PALIER_DEFAULTS = [
  { coutPoints: 1, niveauBrocanteurRequis: 0, affiniteRequise: 0 },
  { coutPoints: 2, niveauBrocanteurRequis: 0, affiniteRequise: AFFINITE_PALIER_2 },
  { coutPoints: 3, niveauBrocanteurRequis: NIVEAU_BROCANTEUR_PALIER_3, affiniteRequise: AFFINITE_PALIER_3 },
] as const;

function definirPaliers(
  paliers: Array<Pick<PalierDef, "nom" | "description"> & Partial<PalierDef>>,
): PalierDef[] {
  return paliers.map((p, i) => ({
    numero: i + 1,
    nom: p.nom,
    description: p.description,
    coutPoints: p.coutPoints ?? PALIER_DEFAULTS[i]?.coutPoints ?? 1,
    niveauBrocanteurRequis:
      p.niveauBrocanteurRequis ?? PALIER_DEFAULTS[i]?.niveauBrocanteurRequis ?? 0,
    affiniteRequise: p.affiniteRequise ?? PALIER_DEFAULTS[i]?.affiniteRequise ?? 0,
    placeholder: p.placeholder,
  }));
}

// =====================================================================
// ARBRE GÉNÉRAL
// =====================================================================

const TREE_GENERAL_DEF: CompetenceTreeDef = {
  id: TREE_GENERAL,
  nom: "Général",
  baseline: "Le métier de marchand, dans ses fondations.",
  emoji: "◆",
  type: "general",
  branches: [
    {
      id: "negociation",
      nom: "Négociation",
      description: "Vos contre-offres tiennent plus longtemps.",
      paliers: definirPaliers([
        {
          nom: "Verbe haut",
          description:
            "Les clients tolèrent des contre-offres 20 % plus gourmandes avant de s'agacer.",
        },
        {
          nom: "Verbe d'or",
          description:
            "Les clients tolèrent des contre-offres 40 % plus gourmandes avant de s'agacer.",
        },
        {
          nom: "Diplomate",
          description:
            "Au lieu de partir fâché, le client vous lâche son prix max exact et vous laisse une dernière contre-offre (1 fois par journée).",
        },
      ]),
    },
    {
      id: "charisme",
      nom: "Charisme",
      description: "Votre étal attire la foule.",
      paliers: definirPaliers([
        {
          nom: "Présentation soignée",
          description: "Les passants visitent 25 % plus souvent (intervalle ×0,75).",
        },
        {
          nom: "Bonne réputation",
          description: "L'appétit moyen de tous vos clients est rehaussé de +10 %.",
        },
        {
          nom: "Stand renommé",
          description:
            "Au moins une fois par journée, un client à grosse bourse (appétit ×1,3) vient vous voir.",
        },
      ]),
    },
    {
      id: "presentation",
      nom: "Présentation",
      description: "Vous lisez vos clients à livre ouvert.",
      paliers: definirPaliers([
        {
          nom: "Lecteur d'âmes",
          description:
            "Vous reconnaissez vos clients : leur nom et leur ambiance s'affichent dans la fiche de négociation.",
        },
        {
          nom: "Estimateur de bourse",
          description:
            "La classe de richesse du client (petite, moyenne ou grosse bourse) s'affiche.",
        },
        {
          nom: "Œil aiguisé",
          description: "La fiche de négociation affiche le prix max exact du client.",
        },
      ]),
    },
    {
      id: "vision",
      nom: "Vision du marché",
      description: "Vous lisez la météo des affaires et les bruits de salon.",
      paliers: definirPaliers([
        {
          nom: "Bulletin météo",
          description:
            "La météo du jour s'affiche dans la Gazette, avec son effet sur l'affluence du stand.",
        },
        {
          nom: "Carnet mondain",
          description:
            "Le nom de la célébrité annoncée cette édition et la brocante qui l'accueille vous sont révélés (grand boost rares & légendaires en chinage).",
        },
        {
          nom: "Influence",
          description:
            "Une fois par édition de la Gazette, vous pouvez retirer (reroll) la météo du jour ou la brocante mondaine.",
        },
      ]),
    },
  ],
};

// =====================================================================
// ARBRES THÉMATIQUES — 1 par catégorie, structure identique
// =====================================================================

function brancheReparer(cat: CategorieObjet): PalierDef[] {
  return definirPaliers([
    {
      nom: `Apprenti — ${cat}`,
      description: `Vous restaurez les pièces « ${cat} » en mauvais état (Mauvais → Bon, quelques heures).`,
    },
    {
      nom: `Artisan — ${cat}`,
      description: `Vous parachevez les pièces déjà décentes (Bon → Très bon, quelques heures).`,
    },
    {
      nom: `Maître — ${cat}`,
      description: `Vous parvenez à élever les pièces au pristin état et réduisez toutes les durées de restauration « ${cat} » de 40 %.`,
    },
  ]);
}

function brancheConnaisseur(cat: CategorieObjet): PalierDef[] {
  return definirPaliers([
    {
      nom: `Veilleur — ${cat}`,
      description: `La Gazette des Chineurs vous révèle le taux de tendance de la catégorie « ${cat} ».`,
    },
    {
      nom: `Marchand averti — ${cat}`,
      description: `Sur votre étal (préparation et vente), la valeur de référence des pièces « ${cat} » s'affiche.`,
    },
    {
      nom: `Œil exercé — ${cat}`,
      description: `En chinant, vous lisez la vraie valeur de référence des objets « ${cat} ».`,
    },
  ]);
}

function branchePassion(cat: CategorieObjet): PalierDef[] {
  return definirPaliers([
    {
      nom: `Amateur — ${cat}`,
      description: `Les clients paient +10 % pour les objets « ${cat} ».`,
    },
    {
      nom: `Passionné — ${cat}`,
      description: `Les clients paient +20 % pour les objets « ${cat} » (remplace Amateur).`,
    },
    {
      nom: `Mordu — ${cat}`,
      description: `Les clients paient +30 % pour les objets « ${cat} » (remplace Passionné).`,
    },
  ]);
}

function brancheOeilAiguise(cat: CategorieObjet): PalierDef[] {
  return definirPaliers([
    {
      nom: `Verbe agile — ${cat}`,
      description: `Quand un client négocie un objet « ${cat} », il tolère des contre-offres +10 % plus gourmandes.`,
    },
    {
      nom: `Verbe haut — ${cat}`,
      description: `Quand un client négocie un objet « ${cat} », il tolère des contre-offres +20 % plus gourmandes (remplace Verbe agile).`,
    },
    {
      nom: `Verbe d'or — ${cat}`,
      description: `Quand un client négocie un objet « ${cat} », il tolère des contre-offres +30 % plus gourmandes (remplace Verbe haut).`,
    },
  ]);
}

function buildCategoryTree(cat: CategorieObjet): CompetenceTreeDef {
  return {
    id: catTreeId(cat),
    nom: cat,
    baseline: `Spécialisez-vous dans « ${cat} ».`,
    emoji: "✦",
    type: "thematique",
    categorie: cat,
    branches: [
      { id: "reparer", nom: "Réparer", paliers: brancheReparer(cat) },
      { id: "connaisseur", nom: "Connaisseur", paliers: brancheConnaisseur(cat) },
      { id: "passion", nom: "Passion", paliers: branchePassion(cat) },
      { id: "oeil_aiguise", nom: "Œil aiguisé", paliers: brancheOeilAiguise(cat) },
    ],
  };
}

// =====================================================================
// REGISTRE & EXPANSION VERS LE CATALOGUE PLAT
// =====================================================================

export const TREES: CompetenceTreeDef[] = [
  TREE_GENERAL_DEF,
  ...CATEGORIES_THEMATIQUES.map(buildCategoryTree),
];

export const ALL_TREE_IDS: CompetenceTreeId[] = TREES.map((t) => t.id);

function expandTree(tree: CompetenceTreeDef): CompetenceDef[] {
  const estGeneral = tree.type === "general";
  return tree.branches.flatMap((b) =>
    b.paliers.map((p) => ({
      id: `${tree.id}.${b.id}.${p.numero}`,
      treeId: tree.id,
      brancheId: b.id,
      palierNumero: p.numero,
      nom: p.nom,
      description: p.description,
      coutPoints: p.coutPoints,
      niveauBrocanteurRequis: estGeneral
        ? [0, NIVEAU_BROCANTEUR_PALIER_2_GENERAL, NIVEAU_BROCANTEUR_PALIER_3][p.numero - 1] ?? 0
        : p.niveauBrocanteurRequis,
      affiniteRequise: estGeneral ? 0 : p.affiniteRequise,
      prerequis:
        p.numero === 1 ? [] : [`${tree.id}.${b.id}.${p.numero - 1}`],
      placeholder: p.placeholder,
    })),
  );
}

export const COMPETENCES: CompetenceDef[] = TREES.flatMap(expandTree);

export function getCompetence(id: CompetenceId): CompetenceDef | undefined {
  return COMPETENCES.find((c) => c.id === id);
}

export function getTreeDef(treeId: CompetenceTreeId): CompetenceTreeDef | undefined {
  return TREES.find((t) => t.id === treeId);
}

export function competencesParTree(treeId: CompetenceTreeId): CompetenceDef[] {
  return COMPETENCES.filter((c) => c.treeId === treeId);
}

export function competencesParBranche(
  treeId: CompetenceTreeId,
  brancheId: string,
): CompetenceDef[] {
  return COMPETENCES.filter(
    (c) => c.treeId === treeId && c.brancheId === brancheId,
  );
}

// =====================================================================
// MÉTADONNÉES (pour l'UI)
// =====================================================================

export interface TreeMeta {
  id: CompetenceTreeId;
  nom: string;
  baseline: string;
  emoji: string;
  type: "general" | "thematique";
  categorie?: CategorieObjet;
}

export function getTreeMeta(treeId: CompetenceTreeId): TreeMeta {
  const def = getTreeDef(treeId);
  if (!def) {
    return {
      id: treeId,
      nom: treeId,
      baseline: "",
      emoji: "◇",
      type: "general",
    };
  }
  return {
    id: def.id,
    nom: def.nom,
    baseline: def.baseline,
    emoji: def.emoji,
    type: def.type,
    categorie: def.categorie,
  };
}

// =====================================================================
// GAINS D'XP PAR ACTION
// =====================================================================
export const XP_ACHAT_OBJET = 10;
export const XP_VENTE_OBJET = 20;
export const XP_NEGOCIATION_REUSSIE_GENERAL = 5;
