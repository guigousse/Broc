/**
 * Overlay ES des gabarits de quêtes périodiques (spec i18n §2, SP4, tâche 5).
 * Clé = `"cle#index"` où `cle` ∈ {generique, jeux-video, set-designer, mode, art}
 * et `index` = variante FR tirée (cf. `GabaritQueteId` dans quetes/textes.ts).
 * Résolu À L'AFFICHAGE (helpers `titreCourrier`/`corpsCourrier`) quand le payload
 * porte un `gabaritId` et que la locale ≠ fr ; fallback payload FR sinon.
 *
 * Reformulation par TON de commanditaire (PAS un calque du FR) :
 *  - jeux-video  : jugador entusiasta
 *  - set-designer: escenógrafo profesional
 *  - mode        : modista con clase
 *  - art         : esteta refinado
 * Placeholders `{objets}` / `{etat}` interpolés par la mise en forme ES
 * (guillemets « », mention d'état traduite) dans `contenu/index.ts`.
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
};
