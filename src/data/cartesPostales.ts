/** Épilogue : cartes postales du grand-père en voyage, injectées une à une
 *  après la remise des clés (trame_ch12). Contenu léger — garde le
 *  personnage vivant. */
export const INTERVALLE_CARTES_POSTALES = 6; // jours de jeu entre deux cartes

export const CARTES_POSTALES: ReadonlyArray<{ id: string; titre: string; corps: string[] }> = [
  {
    id: "carte_postale_1",
    titre: "Carte de Venise",
    corps: [
      "Il pleut sur la lagune et tout le monde trouve ça triste, sauf moi. Les reflets doublent la ville — deux Venise pour le prix d'une, quelle affaire.",
      "J'ai marchandé un verre de Murano pour le principe. J'ai perdu. Le vendeur avait ton âge — bon signe pour le métier.",
      "Prends soin de la boutique. — Grand-père",
    ],
  },
  {
    id: "carte_postale_2",
    titre: "Carte de Lisbonne",
    corps: [
      "Les tramways d'ici grincent exactement comme l'escalier de la boutique. Je me suis senti chez moi tout de suite.",
      "Une dame m'a vendu des azulejos « du XVIIIᵉ ». Ils sont de 1974. Je les ai pris quand même : c'est l'histoire qu'on achète, pas la date.",
      "— Grand-père",
    ],
  },
  {
    id: "carte_postale_3",
    titre: "Carte de Marrakech",
    corps: [
      "Le souk, petit. LE SOUK. J'ai négocié trois heures pour une théière ; on a fini par boire le thé dedans, chez sa grand-mère à lui.",
      "Je t'apprendrai le geste des mains, un jour. Ça ne s'écrit pas.",
      "— Grand-père",
    ],
  },
  {
    id: "carte_postale_4",
    titre: "Carte de Kyoto",
    corps: [
      "Ici, on répare les bols cassés à la poudre d'or. Ils appellent ça kintsugi : la cicatrice fait partie de la beauté.",
      "J'ai pensé à mes mains, et à toi, à l'établi. On avait raison de recoller les choses, tu sais.",
      "— Grand-père",
    ],
  },
  {
    id: "carte_postale_5",
    titre: "Carte sans timbre",
    corps: [
      "On me demande partout ce que je cherchais, à courir ainsi après les bijoux d'une reine. Je réponds : rien — j'avais déjà tout, au-dessus d'une boutique de brocante.",
      "Le train repart. Je ne sais pas encore vers où, et c'est très bien ainsi.",
      "À bientôt, petit. — Grand-père",
    ],
  },
];
