/**
 * Coordonnées des objets de la scène du Bazar.
 *
 * MÊME REPÈRE QUE LE QG : `left`/`width` sur un panorama de référence de 300
 * unités, `bottom` en % de la hauteur de scène. Ce n'est pas un hasard : c'est
 * la convention que `qgPct()` sait traduire et que l'outil de calage dev
 * (`?qgedit=1`) partage, ce qui permet aux deux scènes d'utiliser le même
 * outil.
 *
 * ⚠ Ces unités ne sont PAS des `vw`. La scène est dimensionnée par sa HAUTEUR,
 * donc sa largeur dépend de l'aspect du fond : mesurée à 338 vw sur un
 * téléphone de 393 px. L'outil de calage a longtemps dessiné ses cadres en vw
 * bruts et les manquait de 265 px — corrigé le 2026-08-20.
 *
 * Valeurs de départ posées à la lecture du fond ; à affiner à la souris.
 *
 * Pas de `panoramaWidth` ici : le repère de 300 vw est celui du QG, et
 * `qgPct()` (seule voie de conversion vers un % de scène) divise par
 * `QG_LAYOUT.panoramaWidth`. Un second champ portant le même nombre serait une
 * deuxième source de vérité que rien ne relierait à la première.
 */
export const BAZAR_LAYOUT = {
  panoramaAspect: { w: 2752, h: 1536 },
  objets: {
    // Zone gauche (0..100vw) — la borne d'arcade, MESURÉE sur le fond le
    // 2026-08-22 et non estimée. Trois nombres, trois raisons :
    //
    // Calée à la main par Guillaume le 2026-08-22, puis glissée de 3,8 unités
    // vers la gauche — et c'est CE déplacement qui mérite d'être écrit, parce
    // que rien à l'écran ne le réclamait.
    //
    // `width` 33,2 est son réglage : à l'œil, la borne demandait à être plus
    // grosse que les 29 déduits de l'échelle du mur (1 % ≈ 5 cm, une borne de
    // 1,70 m = 33 % de hauteur). Elle mesure donc ~1,95 m — un peu haute pour
    // une vraie borne, juste pour celle-ci : c'est le sujet de la zone, et le
    // seul objet peint qui lui dispute le regard est une bibliothèque de 2,6 m.
    //
    // `left` 61,2 et pas 65 : à 65, la borne finissait à 98,2 alors que
    // l'écran ne montre la zone arcade que jusqu'à 94,4 (cf. le garde plus
    // bas) — son flanc droit était tranché de 17 px, et le snap étant
    // `mandatory`, on ne pouvait pas s'arrêter ailleurs pour le voir. Mesuré
    // sur quatre gabarits, de l'Android 360 px au 15 Pro Max. 61,2 est le
    // dernier `left` qui la fait tenir entière ; elle chevauche alors le
    // montant droit de la bibliothèque, ce qui ne cache aucune marchandise et
    // se lit comme de la profondeur dans une boutique encombrée.
    //
    // `bottom` 20,5 : DEVANT la plinthe (~25 %), pas dessus. Une borne a
    // ~75 cm de profondeur, son pied avant descend sous la ligne du mur —
    // exactement ce que fait le comptoir, base à 21 % pour un mur à 25 %.
    borne: { left: 61.2, bottom: 20.5, width: 33.2 },
    // Zone centre (100..200vw) — la grille de six cases, MESURÉE sur le fond
    // et non estimée : les arêtes des deux planches ressortent à 65,9 % et
    // 55,9 % de la hauteur, et la planche court de 114 à 186 vw.
    //
    // Les six cases ont TOUTES été reprises à la souris par l'auteur le
    // 2026-08-22, en deux passes qui ont fusionné ici : celle de la borne
    // d'arcade a recalé les cases 4 et 6 de quelques dixièmes, celle de la
    // vitrine a rétréci les trois cases du haut.
    //
    // La planche du HAUT : colonnes resserrées de 22 à 20 vw, pas élargi à
    // ~24,2. Le motif est la TAILLE, pas la position — à 22 vw les trois
    // objets se touchaient presque, et une vitrine de boutique demande que
    // chaque pièce respire. Rétrécir les cases élargit d'autant le vide entre
    // elles.
    //
    // La planche du BAS garde les colonnes de 22 vw, à quelques dixièmes près
    // sur les cases 4 et 6.
    //
    // Les trois cases d'une planche visent le MÊME `bottom` : elles reposent
    // sur une seule planche peinte, horizontale. Le test le garde à l'unité
    // près — il absorbe les dixièmes qu'un glisser-déposer laisse derrière lui
    // (case4 à 55,8), mais pas un objet qui dériverait sur l'autre planche.
    case1: { left: 114.8, bottom: 66.0, width: 20.0 },
    case2: { left: 139.6, bottom: 66.0, width: 20.0 },
    case3: { left: 163.2, bottom: 66.0, width: 20.0 },
    case4: { left: 117.4, bottom: 55.8, width: 22.0 },
    case5: { left: 138.0, bottom: 56.0, width: 22.0 },
    case6: { left: 160.5, bottom: 56.0, width: 22.0 },
    // Le tenancier, dans la bande de mur entre le plateau du comptoir et la
    // première planche. MESURÉ sur le fond, pas posé à l'estime :
    //  · `bottom` 38,8 % = l'arête ARRIÈRE du plateau (y ≈ 940 sur 1536). Le
    //    bas du buste s'y confond, ce qui le met DERRIÈRE le comptoir ; à 40 %
    //    il flottait 20 px au-dessus.
    //  · `left` et `width` sont ceux calés à la souris par l'auteur.
    //  · `bottom` 38 % vaut y = 952 sur le fond : les DOIGTS s'y posent, au
    //    milieu du plateau, qui court de 937 (arête arrière) à 963 (arête
    //    avant) — 26 px de profondeur mesurés sur `fond-bazar.webp`, et toute
    //    la perspective tient là-dedans.
    //
    //    Ce réglage, posé à la souris par l'auteur, tombe exactement juste :
    //    la coupe du buste (faite dans l'illustration même, cf.
    //    `scripts/_decouper-tenancier.mjs`, 15 px de fond au-dessus des
    //    doigts) atterrit à y = 937,3, c'est-à-dire SUR l'arête arrière au
    //    tiers de pixel près. Le buste passe donc derrière le bois pendant que
    //    les mains restent devant.
    //
    //    ⚠ Les trois nombres sont solidaires de la coupe : changer `width`
    //    change la hauteur affichée, donc l'échelle, donc la position de la
    //    coupe. Retoucher `bottom` seul déplace l'ensemble sans casser
    //    l'alignement ; retoucher `width` demande de recalculer `COUPE_Y`.
    vendeur: { left: 122.0, bottom: 38.0, width: 31.4 },
    // Zone droite (200..300vw) — réservé et sortie.
    table: { left: 209.0, bottom: 18.0, width: 44.0 },
    sortie: { left: 270.0, bottom: 20.0, width: 28.0 },
  },
} as const;

export type BazarObjetKey = keyof typeof BAZAR_LAYOUT.objets;

/**
 * Toutes les clés du Bazar, dans l'ordre du dictionnaire. C'est la liste que
 * la scène passe à l'overlay de calage et que le panneau dev liste.
 */
export const CLES_BAZAR = Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[];

/**
 * Les trois lots de pièces vont sur la planche du BAS — la plus proche de la
 * main, et celle que le regard rencontre en premier en arrivant au comptoir.
 */
export const CLES_LOTS: BazarObjetKey[] = ["case4", "case5", "case6"];

/**
 * L'étagère du HAUT porte les trois objets uniques, un par gamme de prix
 * (cf. `GAMMES_BAZAR`) : la trouvaille modeste à gauche, la vitrine de la
 * semaine au milieu, la pièce de caractère à droite. L'ordre des clés EST
 * l'ordre des index de `EtalBazar.articles` — le prix monte le long de la
 * planche.
 */
export const CLES_ARTICLES: BazarObjetKey[] = ["case1", "case2", "case3"];
