/**
 * Overlay ES des gabarits de quêtes périodiques (spec i18n §2, SP4, tâches 5 et 7).
 * Clé = `"cle#index"` où `cle` ∈ {generique, jeux-video, set-designer, mode, art,
 * rares, benefice, chiffre, marge, categorie} et `index` = variante FR tirée
 * (cf. `GabaritQueteId` dans quetes/textes.ts). Résolu À L'AFFICHAGE (helpers
 * `titreCourrier`/`corpsCourrier`) quand le payload porte un `gabaritId` et
 * que la locale ≠ fr ; fallback payload FR sinon.
 *
 * Reformulation par TON de commanditaire (PAS un calque du FR) :
 *  - jeux-video  : jugador entusiasta
 *  - set-designer: escenógrafo profesional
 *  - mode        : modista con clase
 *  - art         : esteta refinado
 *  - familles chiffrées (rares/benefice/chiffre/marge/categorie) : le même
 *    vieux marchand que le FR, en plus chaleureux — direct mais amical.
 * Placeholders `{objets}` / `{etat}` interpolés par la mise en forme ES
 * (guillemets « », mention d'état traduite) dans `contenu/index.ts` ; les
 * familles chiffrées ajoutent `{nombre}`, `{montant}` (déjà formaté
 * « 1.800 € ») et `{categorie}` (libellé traduit).
 */
export const QUETES_GABARITS_ES: Record<
  string,
  { titre: string; corps: string[] }
> = {
  "generique#0": {
    titre: "Busco: {objets}",
    corps: [
      "Hola,",
      "Ando buscando {objets}{etat}. Si lo consigues, avísame — pago bien.",
    ],
  },
  "jeux-video#0": {
    titre: "La pieza que falta",
    corps: [
      "¡Hola!",
      "Todavía me falta {objets}{etat} para completar mi colección. ¿Podrías conseguirlo?",
    ],
  },
  "jeux-video#1": {
    titre: "Para la vitrina retro",
    corps: [
      "¡Buenas!",
      "Estoy montando una vitrina retro y necesito {objets}{etat}. ¡Cuento contigo!",
    ],
  },
  "set-designer#0": {
    titre: "Atrezo necesario",
    corps: [
      "Buenos días,",
      "Para un decorado necesito {objets}{etat}. Es el detalle que lo hace creíble.",
    ],
  },
  "set-designer#1": {
    titre: "En el plató",
    corps: [
      "Hola,",
      "Mi plató reclama {objets}{etat}. Sin eso, la imagen suena a falso.",
    ],
  },
  "mode#0": {
    titre: "Una pieza vintage",
    corps: [
      "Estimado buscador,",
      "Mi armario reclama {objets}{etat}. La prenda adecuada siempre cuenta una historia.",
    ],
  },
  "mode#1": {
    titre: "Inspiración de pasarela",
    corps: [
      "Hola,",
      "Preparo un desfile y {objets}{etat} sería justo la musa que necesito. ¿Podrías encontrarlo?",
    ],
  },
  "art#0": {
    titre: "Para la galería",
    corps: [
      "Querido amigo,",
      "Me encantaría colgar {objets}{etat}. Una bella pieza, por supuesto.",
    ],
  },
  "art#1": {
    titre: "Una adquisición",
    corps: [
      "Estimado colega,",
      "Un aficionado exigente busca {objets}{etat} para su colección. Hágamelo saber.",
    ],
  },
  "rares#0": {
    titre: "Un ojo para lo bueno",
    corps: [
      "Hola,",
      "Dicen que tienes buen ojo. Tráeme {nombre} piezas raras de tus próximas rondas y sabré a quién llamar.",
    ],
  },
  "rares#1": {
    titre: "Solo lo mejor, por favor",
    corps: [
      "Estimado buscador,",
      "Lo corriente ya no me interesa. {nombre} piezas raras, ni una menos — enséñame lo que sabes encontrar.",
    ],
  },
  "benefice#0": {
    titre: "Ojo al margen",
    corps: [
      "Hola,",
      "Comprar lo sabe hacer cualquiera. Saca {montant} de beneficio esta semana y hablamos de tu talento.",
    ],
  },
  "benefice#1": {
    titre: "Donde está el dinero",
    corps: [
      "Hola,",
      "Una apuesta: {montant} de beneficio antes de que acabe la semana. Si lo consigues, te pago con gusto.",
    ],
  },
  "chiffre#0": {
    titre: "Que la tienda no pare",
    corps: [
      "Hola,",
      "Olvida el margen, quiero ver movimiento. {montant} en ventas esta semana.",
    ],
  },
  "chiffre#1": {
    titre: "Que suene la caja",
    corps: [
      "Hola,",
      "Haz sonar esa caja registradora — {montant} recaudados antes del domingo.",
    ],
  },
  "marge#0": {
    titre: "La venta del siglo",
    corps: [
      "Estimado colega,",
      "Todos venden mucho. Pocos logran LA venta. Consigue {montant} de margen en una sola operación.",
    ],
  },
  "marge#1": {
    titre: "Con una basta",
    corps: [
      "Hola,",
      "Una buena venta vale más que diez mediocres. {montant} de margen, en una sola pieza.",
    ],
  },
  "categorie#0": {
    titre: "Se busca especialista",
    corps: [
      "Hola,",
      "Necesito a alguien que conozca bien su terreno. Vende {nombre} artículos de {categorie} y tendrás mi confianza.",
    ],
  },
  "categorie#1": {
    titre: "A vaciar el estante",
    corps: [
      "Hola,",
      "Mi stock de {categorie} desborda. Muéveme {nombre} de esos y te lo deberé.",
    ],
  },
};
