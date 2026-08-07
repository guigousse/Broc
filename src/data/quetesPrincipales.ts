import type { ConditionDeblocage, MissionCible, ObjectifMission } from "@/types/game";
import type { DialogueLigne } from "@/data/dialogues";

export interface ChapitrePrincipal {
  id: string;
  ordre: number;
  acte: 1 | 2 | 3 | 4;
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
    /** `xp`/`energie` absents ⇒ défauts de catégorie / 0 (cf. lib/recompenses). */
    recompense: { argent: number; xp?: number; energie?: number };
    conserverCibles?: boolean;
  };
}

/**
 * Trame principale (SP2) : le grand-père, vivant, confie 16 chapitres en
 * 4 actes. Fil rouge : les bijoux de la reine. Textes définitifs (SP3).
 * Ids STABLES (i18n + saves) — préfixe distinct de l'ancien arc
 * `principale_*` pour éviter toute collision en migration. Les 12 chapitres
 * d'origine gardent leurs ids `trame_chN` historiques même quand leur `ordre`
 * a changé (extension 2026-08-07 : 4 missions insérées + acte 4) ; les
 * chapitres ajoutés portent des ids descriptifs (`trame_salons`, …) pour ne
 * jamais entrer en collision avec la numérotation d'origine.
 */
export const QUETES_PRINCIPALES: ChapitrePrincipal[] = [
  {
    id: "trame_ch1",
    ordre: 1,
    acte: 1,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "souriant", texte: "Ah, tu l'ouvres… Alors écris, petit. La toute première ligne sera pour moi." },
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
    dialogue: [
      { humeur: "rieur", texte: "On m'a parlé de toi au café, ce matin ! « Le petit de la boutique », qu'ils disent. Ils disaient pareil de moi, en 1975." },
      { humeur: "songeur", texte: "Dans ce métier, ton nom vaut plus que ta caisse. Il se gagne lentement, aux étals, une poignée de main à la fois." },
      { humeur: "souriant", texte: "Continue de chiner, de vendre, d'apprendre. Quand les marchés murmureront ton nom, je le saurai avant toi." },
    ],
    payload: {
      titre: "Un nom qui circule",
      corps: [
        "Atteindre le **niveau 30** de brocanteur.",
        "« Ton nom vaut plus que ta caisse. Fais-le circuler. »",
      ],
      cibles: [],
      objectifs: [{ type: "niveau", niveau: 30 }],
      recompense: { argent: 180 },
    },
  },
  {
    id: "trame_ch6",
    ordre: 6,
    acte: 2,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "songeur", texte: "Un jour, j'ai laissé filer une tabatière en argent pour trois sous. Revendue dix fois son prix la semaine d'après, sous mes yeux." },
      { humeur: "emu", texte: "Je n'ai pas dormi de la nuit. Pas pour l'argent — pour n'avoir pas su voir." },
      { humeur: "souriant", texte: "Le flair, ça se forge. Fais-moi un joli coup : cent euros de mieux sur une seule vente, et je croirai que tu as l'œil." },
    ],
    payload: {
      titre: "Le flair",
      corps: [
        "Réaliser un profit d'au moins **100 €** sur une seule vente.",
        "« Acheter juste, vendre juste. Entre les deux, il y a l'œil. »",
      ],
      cibles: [],
      objectifs: [{ type: "profitVente", montant: 100 }],
      recompense: { argent: 200 },
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
    dialogue: [
      { humeur: "souriant", texte: "J'ai fait le tour de ta collection ce matin, pendant que tu dormais. Permets — vieille habitude." },
      { humeur: "emu", texte: "Il y a du goût, là-dedans. Du vrai. Ta grand-mère aurait déplacé deux ou trois choses, mais elle aurait souri." },
      { humeur: "songeur", texte: "Étoffe-la encore. Une collection, c'est un visage : il faut qu'on te reconnaisse au premier regard." },
    ],
    payload: {
      titre: "Une vitrine digne de ce nom",
      corps: [
        "Atteindre **1 500 €** de valeur de collection.",
        "« Une collection, c'est un visage. Fais que le tien soit inoubliable. »",
      ],
      cibles: [],
      objectifs: [{ type: "valeurCollection", montant: 1500 }],
      recompense: { argent: 220 },
    },
  },
  {
    id: "trame_ch8",
    ordre: 8,
    acte: 2,
    condition: { type: "depart" },
    invitationTier: 3,
    dialogue: [
      { humeur: "songeur", texte: "Chez les collectionneurs, on murmure de nouveau sur les bijoux de la reine. Les rumeurs reviennent toujours par les salons." },
      { humeur: "souriant", texte: "Pour y entrer, il faut montrer patte blanche. Une belle gravure, impeccable — voilà qui ouvre les portes feutrées." },
      { humeur: "emu", texte: "J'ai passé trente ans à guetter ces murmures. Toi, tu vas t'asseoir à leur table." },
    ],
    payload: {
      titre: "Le beau monde",
      corps: [
        "Retrouver une **gravure « Vue de Paris »** en très bon état.",
        "« Là-haut, on ne pardonne pas l'à-peu-près. Impeccable, tu m'entends. »",
      ],
      cibles: [{ templateId: "art.gravure_jouy_paris", etatMin: "Très bon" }],
      objectifs: [{ type: "objet", templateId: "art.gravure_jouy_paris", etatMin: "Très bon" }],
      recompense: { argent: 260 },
    },
  },
  {
    id: "trame_salons",
    ordre: 9,
    acte: 3,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "songeur", texte: "Les salons, petit, c'est un autre pays. On y parle plus bas, on y compte plus vite. Ma première fois, j'ai gardé les mains dans les poches toute la journée — de peur qu'on les voie trembler." },
      { humeur: "souriant", texte: "Un beau coup, tout le monde peut en faire un. Ce qui fait un marchand, c'est le tiroir-caisse qui chante tous les soirs. La régularité, voilà la vraie élégance." },
      { humeur: "rieur", texte: "Trois mille euros de ventes. Fais-les chanter — et là-haut, on retiendra ton nom sans que tu aies à le donner." },
    ],
    payload: {
      titre: "Marchand parmi les marchands",
      corps: [
        "Cumuler **3 000 €** de ventes depuis l'acceptation.",
        "« Un beau coup, tout le monde peut en faire un. Un marchand, c'est un tiroir-caisse qui chante tous les soirs. »",
      ],
      cibles: [],
      objectifs: [{ type: "ventesCumulees", montant: 3000 }],
      recompense: { argent: 280 },
    },
  },
  {
    id: "trame_ch9",
    ordre: 10,
    acte: 3,
    condition: { type: "depart" },
    // Décision 2026-07-17 : mission de maîtrise placée en late game (venue du
    // ch7) — au seuil du Grand Salon, le palier Réparer 3 est atteignable.
    dialogue: [
      { humeur: "songeur", texte: "Il y a l'ouvrage propre, et il y a l'ouvrage de maître. Cinquante ans d'établi, et je compte sur une main ceux qui ont franchi ce pas." },
      { humeur: "emu", texte: "Un objet remis à neuf, c'est une vie qu'on prolonge. La mienne s'est usée à ça — et je ne regrette rien." },
      { humeur: "souriant", texte: "Prends ton temps, choisis ta pièce, et rends-la parfaite. Le Grand Salon ne mérite rien de moins. Toi non plus." },
    ],
    payload: {
      titre: "Pièce de maître",
      corps: [
        "Restaurer un objet jusqu'à l'état **Pristin état**.",
        "« Un objet remis à neuf, c'est une vie qu'on prolonge. »",
      ],
      cibles: [],
      objectifs: [{ type: "restauration", etatMin: "Pristin état" }],
      recompense: { argent: 320 },
    },
  },
  {
    id: "trame_grand_coup",
    ordre: 11,
    acte: 3,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "songeur", texte: "Tu te souviens de ma tabatière en argent ? Celle que j'ai laissée filer pour trois sous. J'y pense encore, certains soirs d'hiver." },
      { humeur: "souriant", texte: "Dans les salons, la revanche a une autre saveur. Les pièces y sont plus belles, les yeux plus affûtés — et l'erreur des autres y vaut de l'or." },
      { humeur: "emu", texte: "Fais-le pour moi : trois cents euros de mieux sur une seule vente. La tabatière sera vengée, et je dormirai enfin tranquille." },
    ],
    payload: {
      titre: "Le grand coup",
      corps: [
        "Réaliser un profit d'au moins **300 €** sur une seule vente.",
        "« L'œil, ça se forge aux étals. Mais c'est dans les salons qu'on le trempe. »",
      ],
      cibles: [],
      objectifs: [{ type: "profitVente", montant: 300 }],
      recompense: { argent: 360 },
    },
  },
  {
    id: "trame_antichambre",
    ordre: 12,
    acte: 3,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "songeur", texte: "Les murmures reprennent, petit. Les bijoux de la reine — on en reparle dans les salons, à mots couverts, comme toujours." },
      { humeur: "emu", texte: "Cinquante ans que je guette cette rumeur. Chaque fois, elle s'éteint. Cette fois… cette fois je crois qu'elle brûle encore." },
      { humeur: "souriant", texte: "Le Grand Salon n'ouvre qu'aux vitrines qui parlent d'elles-mêmes. Cinq mille euros de collection — et l'on t'ouvrira des portes que je n'ai fait qu'entrevoir." },
    ],
    payload: {
      titre: "L'antichambre",
      corps: [
        "Atteindre **5 000 €** de valeur de collection.",
        "« Le Grand Salon n'écoute pas les cartes de visite. Il regarde les vitrines. »",
      ],
      cibles: [],
      objectifs: [{ type: "valeurCollection", montant: 5000 }],
      recompense: { argent: 400 },
    },
  },
  {
    id: "trame_ch10",
    ordre: 13,
    acte: 4,
    condition: { type: "depart" },
    invitationTier: 4,
    dialogue: [
      { humeur: "songeur", texte: "Assieds-toi. Il est temps que je te raconte la fin — ou le début, c'est selon." },
      { humeur: "emu", texte: "Les bijoux de la reine. Cinquante ans que je les cherche. J'ai vu passer leur trace dans trois ventes, deux inventaires, un mensonge. Chaque fois, trop tard." },
      { humeur: "emu", texte: "C'est pour eux que j'ai raté des dimanches, des anniversaires… le pichet de ta grand-mère. Un rêve, ça éclaire — mais ça brûle aussi, quand on le tient trop près." },
      { humeur: "souriant", texte: "Le Grand Salon des Antiquaires t'ouvre ses portes — les organisateurs t'écriront. C'est là que tout s'arrête, ou que tout s'achève. Vas-y pour moi." },
    ],
    payload: {
      titre: "L'invitation",
      corps: [
        "Le grand-père a tout raconté : cinquante ans de quête, et le Grand Salon comme dernière piste.",
        "« C'est là que tout s'arrête, ou que tout s'achève. »",
      ],
      cibles: [],
      objectifs: [],
      recompense: { argent: 450 },
    },
  },
  {
    id: "trame_ch11",
    ordre: 14,
    acte: 4,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "songeur", texte: "Ils sont là, quelque part, entre les vitrines du Grand Salon. Je le sens comme on sent l'orage." },
      { humeur: "souriant", texte: "Je ne viens pas. C'est ton regard qu'il faut, plus le mien. Trouve-les — et garde-les. Ils sont à toi. Le rêve, lui, m'appartient encore un peu." },
    ],
    payload: {
      titre: "Les bijoux de la reine",
      corps: [
        "Acquérir **les bijoux de la reine** au Grand Salon. Ils resteront dans ta collection.",
        "« Cinquante ans que je les cherche. À toi de tendre la main. »",
      ],
      cibles: [{ templateId: "uniq.mo.bijou_marie_antoinette" }],
      objectifs: [{ type: "objet", templateId: "uniq.mo.bijou_marie_antoinette" }],
      recompense: { argent: 600 },
      conserverCibles: true,
    },
  },
  {
    id: "trame_heritage",
    ordre: 15,
    acte: 4,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "emu", texte: "Alors c'est vrai. Ils existent. Je suis passé dix fois devant ta vitrine ce matin — et dix fois j'ai oublié ce que je venais y chercher." },
      { humeur: "songeur", texte: "Mais un rêve accompli ne paie pas le loyer, et une vitrine n'est pas un mausolée. La boutique doit vivre — après moi, après les bijoux, après tout ça." },
      { humeur: "souriant", texte: "Montre-moi que le métier continue : deux mille euros de ventes. Après quoi… j'ai une valise à faire, je crois." },
    ],
    payload: {
      titre: "Que la boutique vive",
      corps: [
        "Cumuler **2 000 €** de ventes depuis l'acceptation.",
        "« Une vitrine n'est pas un mausolée. Vends, petit — c'est comme ça qu'une boutique respire. »",
      ],
      cibles: [],
      objectifs: [{ type: "ventesCumulees", montant: 2000 }],
      recompense: { argent: 700 },
    },
  },
  {
    id: "trame_ch12",
    ordre: 16,
    acte: 4,
    condition: { type: "depart" },
    dialogue: [
      { humeur: "emu", texte: "Laisse-moi les regarder encore un peu, avant de partir. On ne se lasse pas d'un rêve — même accompli." },
      { humeur: "rieur", texte: "Ta grand-mère dirait que le bleu du pichet leur allait mieux. Elle aurait raison, comme toujours." },
      { humeur: "songeur", texte: "Mon rêve est accompli — pas comme je l'imaginais : mieux. C'est toi qui l'as fini. Une histoire n'appartient jamais à celui qui la commence, tu sais." },
      { humeur: "souriant", texte: "Tiens : les clés. Toutes. Moi, j'ai un train demain — Venise d'abord, ensuite on verra. Je t'écrirai. Prends soin de la boutique… elle a toujours pris soin de nous." },
    ],
    payload: {
      titre: "La remise des clés",
      corps: [
        "La boutique est à toi. Le grand-père part en voyage — il écrira.",
        "« Une histoire n'appartient jamais à celui qui la commence. »",
      ],
      cibles: [],
      objectifs: [],
      recompense: { argent: 800 },
    },
  },
];

export function chapitreParOrdre(ordre: number): ChapitrePrincipal | undefined {
  return QUETES_PRINCIPALES.find((c) => c.ordre === ordre);
}

export function chapitreParId(id: string): ChapitrePrincipal | undefined {
  return QUETES_PRINCIPALES.find((c) => c.id === id);
}
