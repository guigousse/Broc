import type {
  Courrier,
  CourrierPayloadMission,
  MissionCategorie,
  MissionCible,
  MissionResolution,
} from "@/types/game";

/** ID stable du déclencheur « lettre starter de Maman ». */
export const ID_LETTRE_MAMAN_DEBUT = "lettre_maman_debut";

/** Lettre offerte au tout début du jeu : 150 € d'argent de poche. */
export function creerLettreMamanDebut(jour: number): Courrier {
  return {
    id: ID_LETTRE_MAMAN_DEBUT,
    type: "lettre",
    jourRecu: jour,
    lu: false,
    payload: {
      type: "lettre",
      expediteurId: "maman",
      titre: "Pour bien démarrer",
      corps: [
        "Mon cher enfant,",
        "Je sais que tu te lances dans cette nouvelle aventure de chineur, et je suis si fière de toi. Le marché aux puces est un monde merveilleux mais exigeant — sois patient, observe, apprends.",
        "Je glisse dans cette enveloppe **150 €** pour t'aider à démarrer. Achète-toi un bel objet pour ta première vitrine, ou garde-les pour les jours plus difficiles.",
        "Pense à venir me voir quand tu auras un moment.",
      ],
      recompense: { argent: 150 },
    },
  };
}

/**
 * Filtre les anciens courriers d'huissier des sauvegardes existantes
 * (système supprimé), tout en conservant les autres lettres.
 */
export function migrerCourriers(existants: Courrier[] | undefined): Courrier[] {
  if (!Array.isArray(existants)) return [];
  return existants.filter(
    (c) => (c as { type?: string }).type !== "huissier",
  );
}

/**
 * Injecte la lettre starter de Maman dans une sauvegarde existante si elle
 * n'a jamais été distribuée (ni dans les courriers, ni dans les déclencheurs).
 * Retourne `{ courriers, declencheursAjoutes }`.
 */
export function injecterLettreMamanSiAbsente(
  courriers: Courrier[],
  declencheursDeclenches: string[],
  jourCourant: number,
): { courriers: Courrier[]; declencheursAjoutes: string[] } {
  const dejaDeclenchee =
    declencheursDeclenches.includes(ID_LETTRE_MAMAN_DEBUT) ||
    courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT);
  if (dejaDeclenchee) {
    return { courriers, declencheursAjoutes: [] };
  }
  return {
    courriers: [...courriers, creerLettreMamanDebut(jourCourant)],
    declencheursAjoutes: [ID_LETTRE_MAMAN_DEBUT],
  };
}

/** Crée un Courrier de type mission. */
export function creerCourrierMission(args: {
  id: string;
  jour: number;
  expediteurId: string;
  titre: string;
  corps: string[];
  categorie: MissionCategorie;
  cibles: MissionCible[];
  jourLimite?: number;
  recompense: { argent: number };
}): Courrier {
  const payload: CourrierPayloadMission = {
    type: "mission",
    categorie: args.categorie,
    expediteurId: args.expediteurId,
    titre: args.titre,
    corps: args.corps,
    cibles: args.cibles,
    recompense: args.recompense,
    ...(args.jourLimite !== undefined ? { jourLimite: args.jourLimite } : {}),
  };
  return {
    id: args.id,
    type: "mission",
    jourRecu: args.jour,
    lu: false,
    payload,
  };
}

/** ID stable des missions de démo (auto-injectées au démarrage). */
export const ID_MISSIONS_TEST = [
  "demo_maman_vitrine",
  "demo_theo_stand",
  "demo_clara_tournage",
  "demo_arianne_defile",
  "demo_paulhenry_galerie",
] as const;

/** Missions de démonstration injectées au démarrage pour faire vivre le carnet
 *  de commandes. Réparties sur les commanditaires (catégories principale /
 *  secondaire, mono- et multi-cibles) pour exercer l'UI. Marquées `lu: true`
 *  pour apparaître directement dans le carnet. */
export function creerMissionsTest(jour: number): Courrier[] {
  return [
    {
      ...creerCourrierMission({
        id: "demo_maman_vitrine",
        jour,
        expediteurId: "maman",
        titre: "La vitrine de Maman",
        corps: [
          "Mon enfant,",
          "Je refais la déco du salon et il me faudrait deux pièces : une **lampe à pétrole ancienne** en laiton et un joli **pichet en faïence émaillée**.",
          "Prends ton temps, mais ne les oublie pas !",
        ],
        categorie: "principale",
        cibles: [
          { templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" },
          { templateId: "ma.pichet_faience_emaillee" },
        ],
        jourLimite: jour + 40,
        recompense: { argent: 130 },
      }),
      lu: true,
    },
    {
      ...creerCourrierMission({
        id: "demo_theo_stand",
        jour,
        expediteurId: "jeux-video",
        titre: "Le stand rétro du Vide-grenier",
        corps: [
          "Salut !",
          "Je monte un stand rétro pour la convention : il me manque une **manette**, un **jeu de cartes de voyage** et un **jeu de culture générale**.",
          "Trois pièces et c'est bon — je te revaudrai ça grassement.",
        ],
        categorie: "principale",
        cibles: [
          { templateId: "jx.manette_vibraduo" },
          { templateId: "jx.jeu_de_cartes_long_trajet_annees_60" },
          { templateId: "jx.jeu_question_pour_un_fromage_culture_generale" },
        ],
        jourLimite: jour + 45,
        recompense: { argent: 200 },
      }),
      lu: true,
    },
    {
      ...creerCourrierMission({
        id: "demo_clara_tournage",
        jour,
        expediteurId: "set-designer",
        titre: "Décor d'un tournage",
        corps: [
          "Bonjour,",
          "Pour un décor d'époque, je cherche une **cafetière émaillée des années 50** en bon état. Le détail qui fera vrai à l'image.",
        ],
        categorie: "secondaire",
        cibles: [{ templateId: "ma.cafetiere_emaillee_50s", etatMin: "Bon" }],
        jourLimite: jour + 30,
        recompense: { argent: 70 },
      }),
      lu: true,
    },
    {
      ...creerCourrierMission({
        id: "demo_arianne_defile",
        jour,
        expediteurId: "mode",
        titre: "Pièces vintage pour le défilé",
        corps: [
          "Cher chineur,",
          "Ma prochaine collection mêle le vintage : il me faut une **veste en jean délavée** et une **casquette gavroche**.",
          "Le bon vêtement raconte une histoire.",
        ],
        categorie: "secondaire",
        cibles: [
          { templateId: "mo.veste_jean_delavee" },
          { templateId: "mo.casquette_gavroche_60s" },
        ],
        jourLimite: jour + 35,
        recompense: { argent: 95 },
      }),
      lu: true,
    },
    {
      ...creerCourrierMission({
        id: "demo_paulhenry_galerie",
        jour,
        expediteurId: "art",
        titre: "Une pièce pour la galerie",
        corps: [
          "Cher ami,",
          "Ma galerie manque d'une **gravure ancienne du XIXe** pour compléter l'accrochage. Une belle pièce, naturellement.",
        ],
        categorie: "secondaire",
        cibles: [{ templateId: "art.gravure_ancienne_xixe" }],
        jourLimite: jour + 50,
        recompense: { argent: 80 },
      }),
      lu: true,
    },
  ];
}

/** Injecte les missions de test dans une sauvegarde si aucune n'est déjà
 *  présente / déclenchée. Idempotent. */
export function injecterMissionsTestSiAbsentes(
  courriers: Courrier[],
  declencheursDeclenches: string[],
  jourCourant: number,
): { courriers: Courrier[]; declencheursAjoutes: string[] } {
  const dejaPresentes = new Set([...courriers.map((c) => c.id), ...declencheursDeclenches]);
  const aInjecter = creerMissionsTest(jourCourant).filter((c) => !dejaPresentes.has(c.id));
  if (aInjecter.length === 0) return { courriers, declencheursAjoutes: [] };
  return {
    courriers: [...courriers, ...aInjecter],
    declencheursAjoutes: aInjecter.map((c) => c.id),
  };
}

/**
 * Marque comme expirées les missions actives dont le courrier porte un
 * `jourLimite` dépassé. Retourne un nouveau tableau.
 */
export function expireMissions(
  missions: MissionResolution[],
  courriers: Courrier[],
  jourActuel: number,
): MissionResolution[] {
  const indexCourrier = new Map(courriers.map((c) => [c.id, c]));
  return missions.map((m) => {
    if (m.statut !== "active") return m;
    const c = indexCourrier.get(m.courrierId);
    if (!c || c.payload.type !== "mission") return m;
    const limite = c.payload.jourLimite;
    if (typeof limite !== "number") return m;
    if (jourActuel <= limite) return m;
    return { ...m, statut: "expiree", jourResolution: jourActuel };
  });
}
