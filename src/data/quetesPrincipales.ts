import type { ConditionDeblocage, MissionCible, ObjectifMission } from "@/types/game";
import type { DialogueLigne } from "@/data/dialogues";

export interface ChapitrePrincipal {
  id: string;
  ordre: number;
  acte: 1 | 2 | 3;
  /** Condition d'apparition EN PLUS de « chapitre précédent livré ». */
  condition: ConditionDeblocage;
  /** Dialogue de délivrance (grand-père, pastille QG). SP3 : textes définitifs. */
  dialogue: DialogueLigne[];
  /** Si présent : la livraison de ce chapitre injecte la lettre d'invitation du tier. */
  invitationTier?: 2 | 3 | 4;
  payload: {
    titre: string;
    corps: string[];
    cibles: MissionCible[];
    objectifs: ObjectifMission[];
    recompense: { argent: number };
    conserverCibles?: boolean;
  };
}

/**
 * Trame principale (SP2) : le grand-père, vivant, confie 12 chapitres en
 * 3 actes. Fil rouge : les bijoux de la reine. Textes provisoires (SP3).
 * Ids STABLES `trame_chN` (i18n + saves) — préfixe distinct de l'ancien arc
 * `principale_*` pour éviter toute collision en migration.
 */
export const QUETES_PRINCIPALES: ChapitrePrincipal[] = [
  {
    id: "trame_ch1",
    ordre: 1,
    acte: 1,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "songeur", texte: "Quarante ans que ma vieille lampe à pétrole a éclairé l'établi. Je l'ai cassée un soir de maladresse… mes mains, déjà." },
      { humeur: "emu", texte: "Chaque trouvaille passait sous sa lumière avant de rejoindre la vitrine. C'est bête, un vieil homme qui s'attache à une lampe, hein ?" },
      { humeur: "souriant", texte: "On en croise encore dans les vide-greniers, en état correct si on cherche bien. Rapporte-m'en une, tu veux ?" },
      { humeur: "rieur", texte: "Et négocie ! Si tu la paies plein pot, je le saurai. Je sais toujours." },
    ],
    payload: {
      titre: "La lampe de mon atelier",
      corps: [
        "Retrouver une **lampe à pétrole ancienne** en bon état.",
        "« Quarante ans qu'elle a éclairé mes trouvailles. Une boutique sans sa lampe, c'est une histoire sans lumière. »",
      ],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      objectifs: [{ type: "objet", templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      recompense: { argent: 60 },
    },
  },
  {
    id: "trame_ch2",
    ordre: 2,
    acte: 1,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "emu", texte: "Ma première vente, je l'ai ratée. Un miroir piqué, un client pressé… j'ai bafouillé, il est parti. J'ai pleuré derrière le rideau, tu sais." },
      { humeur: "songeur", texte: "Le lendemain, ta grand-mère m'a dit : « Recommence. » J'ai vendu un cadre à deux francs. Le plus beau jour de ma vie de marchand." },
      { humeur: "souriant", texte: "À toi maintenant. Fais chanter le tiroir-caisse : 300 € de ventes, et je te raconte la suite." },
    ],
    payload: {
      titre: "Vendre, c'est vivre",
      corps: [
        "Cumuler **300 €** de ventes depuis l'acceptation.",
        "« Chiner, c'est le plaisir. Vendre, c'est le métier. Et le métier, ça s'apprend en vendant. »",
      ],
      cibles: [],
      objectifs: [{ type: "ventesCumulees", montant: 300 }],
      recompense: { argent: 80 },
    },
  },
  {
    id: "trame_ch3",
    ordre: 3,
    acte: 1,
    condition: { type: "depart" },
    // Décision 2026-07-17 : seuil baissé « Très bon » → « Bon » (Très bon
    // exigeait Réparer 2 ⇒ niveau 10 — mur d'XP en acte I ; « Bon » ne
    // demande que Réparer 1, accessible dès le début).
    dialogue: [
      { humeur: "songeur", texte: "Regarde-les. Elles tremblent, maintenant. Ces mains ont recollé, poncé, verni pendant cinquante ans." },
      { humeur: "emu", texte: "Prends mes outils. Ils sont à toi — le maillet a son histoire, je te la raconterai un jour." },
      { humeur: "souriant", texte: "Trouve une pièce abîmée et rends-lui figure. La première fois qu'un objet revit entre tes doigts… tu verras." },
    ],
    payload: {
      titre: "Les mains d'or",
      corps: [
        "Restaurer un objet jusqu'à l'état **Bon**.",
        "« Un objet abîmé, c'est une histoire qui bégaie. Répare-la. »",
      ],
      cibles: [],
      objectifs: [{ type: "restauration", etatMin: "Bon" }],
      recompense: { argent: 100 },
    },
  },
  {
    id: "trame_ch4",
    ordre: 4,
    acte: 1,
    condition: { type: "depart" },
    invitationTier: 2,
    dialogue: [
      { humeur: "emu", texte: "Ta grand-mère avait un pichet en faïence, bleu, ébréché au bec. Il trônait sur le buffet, toujours plein de fleurs des champs." },
      { humeur: "songeur", texte: "Un hiver difficile, je l'ai vendu. Elle n'a rien dit. C'est ce silence-là que je n'ai jamais su réparer." },
      { humeur: "songeur", texte: "Elle rêvait que je lui offre les bijoux d'une reine, un jour. Moi, je n'ai même pas su lui garder son pichet." },
      { humeur: "souriant", texte: "On en trouve des pareils dans les vide-greniers. Retrouve-le-moi. Enfin… retrouve-le-lui." },
    ],
    payload: {
      titre: "Le pichet de ta grand-mère",
      corps: [
        "Retrouver un **pichet en faïence émaillée**.",
        "« Je l'ai vendu un hiver de dèche. Certains regrets ont la forme d'un pichet bleu. »",
      ],
      cibles: [{ templateId: "ma.pichet_faience_emaillee" }],
      objectifs: [{ type: "objet", templateId: "ma.pichet_faience_emaillee" }],
      recompense: { argent: 120 },
    },
  },
  {
    id: "trame_ch5",
    ordre: 5,
    acte: 2,
    condition: { type: "depart" },
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "souriant", texte: "On commence à parler de toi, dans le milieu. Ça me fait chaud au cœur." },
      { humeur: "songeur", texte: "Continue à apprendre le métier — un bon niveau, et les portes s'ouvriront d'elles-mêmes." },
    ],
    payload: {
      titre: "Un nom qui circule",
      corps: ["Atteindre le niveau 8."], // SP3 : texte provisoire
      cibles: [],
      objectifs: [{ type: "niveau", niveau: 8 }],
      recompense: { argent: 150 },
    },
  },
  {
    id: "trame_ch6",
    ordre: 6,
    acte: 2,
    condition: { type: "depart" },
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "rieur", texte: "Le flair, ça ne s'apprend pas dans les livres. Ça se prouve, sur l'étal." },
      { humeur: "souriant", texte: "Fais-moi 100 € de profit sur une vente, et je saurai que tu l'as, ce flair." },
    ],
    payload: {
      titre: "Le flair",
      corps: ["Réaliser 100 € de profit sur une vente."], // SP3 : texte provisoire
      cibles: [],
      objectifs: [{ type: "profitVente", montant: 100 }],
      recompense: { argent: 170 },
    },
  },
  {
    id: "trame_ch7",
    ordre: 7,
    acte: 2,
    condition: { type: "depart" },
    // Décision 2026-07-17 : « Pièce de maître » (Pristin état ⇒ Réparer 3 ⇒
    // niveau 30) déplacée en late game (ch9) ; la préparation de vitrine
    // redescend ici avec un montant d'acte II (provisoire, équilibrage SP3).
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "emu", texte: "Regarde ce que tu as bâti. Une vraie collection prend forme, tu sais." },
      { humeur: "souriant", texte: "Continue : 1500 € de valeur en vitrine, et les beaux salons te regarderont autrement." },
    ],
    payload: {
      titre: "Une vitrine digne de ce nom",
      corps: ["Atteindre 1500 € de valeur de collection."], // SP3 : texte provisoire
      cibles: [],
      objectifs: [{ type: "valeurCollection", montant: 1500 }],
      recompense: { argent: 190 },
    },
  },
  {
    id: "trame_ch8",
    ordre: 8,
    acte: 2,
    condition: { type: "depart" },
    invitationTier: 3,
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "songeur", texte: "Le beau monde ne s'émeut que devant l'irréprochable. J'ai appris ça à mes dépens." },
      { humeur: "souriant", texte: "Trouve-moi une gravure « Vue de Paris » en très bon état, et tu auras ta place là-haut." },
    ],
    payload: {
      titre: "Le beau monde",
      corps: ["Retrouver une gravure 'Vue de Paris' Jouy en très bon état."], // SP3 : texte provisoire
      cibles: [{ templateId: "art.gravure_jouy_paris", etatMin: "Très bon" }],
      objectifs: [{ type: "objet", templateId: "art.gravure_jouy_paris", etatMin: "Très bon" }],
      recompense: { argent: 220 },
    },
  },
  {
    id: "trame_ch9",
    ordre: 9,
    acte: 3,
    condition: { type: "depart" },
    // Décision 2026-07-17 : mission de maîtrise placée en late game (venue du
    // ch7) — au seuil du Grand Salon, le palier Réparer 3 est atteignable.
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "songeur", texte: "Il y a l'ouvrage propre, et il y a l'ouvrage de maître. J'ai vu peu de gens franchir ce pas." },
      { humeur: "souriant", texte: "Restaure-moi un objet jusqu'au Pristin état. Le Grand Salon ne mérite rien de moins." },
    ],
    payload: {
      titre: "Pièce de maître",
      corps: ["Restaurer un objet jusqu'à l'état Pristin état."], // SP3 : texte provisoire
      cibles: [],
      objectifs: [{ type: "restauration", etatMin: "Pristin état" }],
      recompense: { argent: 260 },
    },
  },
  {
    id: "trame_ch10",
    ordre: 10,
    acte: 3,
    condition: { type: "depart" },
    invitationTier: 4,
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "songeur", texte: "Une lettre est arrivée pour toi. Le Grand Salon des Antiquaires… Ils t'invitent." },
      { humeur: "emu", texte: "J'y ai rêvé toute ma vie sans jamais y entrer. Vas-y, petit. Pour nous deux." },
    ],
    payload: {
      titre: "L'invitation",
      corps: ["Le Grand Salon des Antiquaires t'ouvre ses portes."], // SP3 : texte provisoire
      cibles: [],
      objectifs: [],
      recompense: { argent: 150 },
    },
  },
  {
    id: "trame_ch11",
    ordre: 11,
    acte: 3,
    condition: { type: "depart" },
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "emu", texte: "Les bijoux de la reine. Ta grand-mère en parlait comme d'un conte — je pensais qu'ils n'existaient plus." },
      { humeur: "songeur", texte: "Si tu les trouves un jour, rapporte-les-moi. Rien qu'une fois, avant la fin de l'histoire." },
    ],
    payload: {
      titre: "Les bijoux de la reine",
      corps: ["Retrouver les bijoux de la reine."], // SP3 : texte provisoire
      cibles: [{ templateId: "uniq.mo.bijou_marie_antoinette" }],
      objectifs: [{ type: "objet", templateId: "uniq.mo.bijou_marie_antoinette" }],
      recompense: { argent: 500 },
      conserverCibles: true,
    },
  },
  {
    id: "trame_ch12",
    ordre: 12,
    acte: 3,
    condition: { type: "depart" },
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "emu", texte: "Ces bijoux entre tes mains… c'est comme si ta grand-mère te souriait, elle aussi." },
      { humeur: "souriant", texte: "La boutique est à toi, pour de bon, maintenant. Les clés, le carnet, tout. Je suis fier de toi." },
    ],
    payload: {
      titre: "La remise des clés",
      corps: ["Le grand-père te remet officiellement les clés de la boutique."], // SP3 : texte provisoire
      cibles: [],
      objectifs: [],
      recompense: { argent: 500 },
    },
  },
];

export function chapitreParOrdre(ordre: number): ChapitrePrincipal | undefined {
  return QUETES_PRINCIPALES.find((c) => c.ordre === ordre);
}

export function chapitreParId(id: string): ChapitrePrincipal | undefined {
  return QUETES_PRINCIPALES.find((c) => c.id === id);
}
