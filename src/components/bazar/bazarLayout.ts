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
    // Zone gauche (0..100vw) — réservé, muet.
    borne: { left: 61.0, bottom: 18.0, width: 30.0 },
    // Zone centre (100..200vw) — la grille de six cases, MESURÉE sur le fond
    // et non estimée : les arêtes des deux planches ressortent à 65,9 % et
    // 55,9 % de la hauteur, et la planche court de 114 à 186 vw.
    //
    // La planche du BAS garde la grille régulière d'origine : trois colonnes
    // de 22 vw sur un pas de 24, soit 114→136, 138→160 et 162→184, les 2 vw
    // d'écart entre colonnes et les 2 vw de marge en bout de planche.
    //
    // La planche du HAUT s'en écarte : colonnes resserrées à 20 vw et pas
    // élargi à ~24,2, repris à la souris par l'auteur le 2026-08-22. Le motif
    // est la TAILLE, pas la position — à 22 vw les trois objets se touchaient
    // presque, et une vitrine de boutique demande que chaque pièce respire.
    // Rétrécir les cases élargit d'autant le vide entre elles.
    //
    // Les trois partagent le MÊME `bottom` : ils reposent sur une seule
    // planche peinte, horizontale. Si un calage à la souris fait apparaître
    // des dixièmes d'écart, c'est de l'imprécision de glisser-déposer, pas une
    // intention — les remettre à égalité.
    case1: { left: 114.8, bottom: 66.0, width: 20.0 },
    case2: { left: 139.6, bottom: 66.0, width: 20.0 },
    case3: { left: 163.2, bottom: 66.0, width: 20.0 },
    case4: { left: 114.0, bottom: 56.0, width: 22.0 },
    case5: { left: 138.0, bottom: 56.0, width: 22.0 },
    case6: { left: 162.0, bottom: 56.0, width: 22.0 },
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
