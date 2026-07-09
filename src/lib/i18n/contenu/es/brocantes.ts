/**
 * Overlay ES (España, «tú») des brocantes (spec i18n §2, SP3). Clé = `Brocante.id`,
 * le FR de `src/data/brocantes.ts` reste canonique. `ambiance` est une clé
 * logique (BIAIS_AMBIANCE) non affichée : jamais traduite, absente de l'overlay.
 * Noms propres de lieux fictifs français : saveur conservée, descriptif traduit.
 */
export const BROCANTES_ES: Record<string, { nom: string; description: string }> = {
  // TIER 1
  "vide-grenier-quartier": {
    nom: "Rastrillo del barrio",
    description:
      "Unas mesas plegables en la plaza. Precios bajos, pocas joyas — pero por algo se empieza.",
  },
  "marche-aux-puces-dimanche": {
    nom: "Mercadillo del domingo",
    description:
      "La gran cita de los rebuscadores. Más gente, más opciones, vendedores más astutos.",
  },
  "bouquinerie-plein-air": {
    nom: "Librería de viejo al aire libre",
    description:
      "Cajas de libros alineadas sobre caballetes. Los aficionados se entretienen horas.",
  },
  "vide-dressing-centre": {
    nom: "Mercadillo de ropa del centro",
    description:
      "Armarios volcados en percheros. Vintage de los setenta, bolsos ajados, broches olvidados.",
  },
  "brocante-club-jeux": {
    nom: "Mercadillo del club de juegos",
    description:
      "Cartuchos de NES en cubetas, cajas de juegos apiladas. Punto de encuentro de nostálgicos.",
  },
  // TIER 2
  "deballage-collectionneurs": {
    nom: "Feria de coleccionistas",
    description:
      "Solo para carteras bien surtidas. Circulan piezas raras, pero ¿a qué precio?",
  },
  "marche-saint-ouen": {
    nom: "Grandes Pulgas de la Capital",
    description:
      "El mítico mercadillo. Anticuarios con licencia, precios que pican, posibles joyas.",
  },
  "disquaire-independant": {
    nom: "Tienda de discos independiente",
    description:
      "Un sótano en penumbra, cajones hasta donde alcanza la vista, un dueño que conoce cada funda.",
  },
  "atelier-bricoleur": {
    nom: "Taller del manitas",
    description:
      "Herramientas viejas revueltas, sierras japonesas y destornilladores de anteguerra.",
  },
  "marche-antiquaires-bibelots": {
    nom: "Mercado de anticuarios (baratijas)",
    description:
      "Vitrinas cerradas con llave, vendedores que sacan las piezas con guantes.",
  },
  // TIER 3
  "foire-chatou": {
    nom: "Gran Feria de Antigüedades",
    description:
      "Dos veces al año, la Isla de los Impresionistas acoge a la flor y nata del oficio.",
  },
  "salon-grands-collectionneurs": {
    nom: "Salón de los grandes coleccionistas",
    description:
      "Círculo cerrado, solo con invitación. Las piezas más raras encuentran aquí su vitrina.",
  },
  "drouot-mode-couture": {
    nom: "Casa de Subastas — Moda y Alta Costura",
    description:
      "Subastas temáticas por donde pasan las grandes piezas: vestidos de firma, bolsos icónicos.",
  },
  "salon-violon-ancien": {
    nom: "Salón del violín antiguo",
    description:
      "Lutieres, conservadores, virtuosos. Aquí el silencio vale oro, y los instrumentos también.",
  },
  "galerie-arts-decoratifs": {
    nom: "Galería de artes decorativas",
    description:
      "Loza, cristal, dorados. Las piezas van firmadas, los precios hacen toser.",
  },
  "galerie-tableaux-sculptures": {
    nom: "Galería de Subastas — Cuadros y Esculturas",
    description:
      "Marcos dorados en las paredes, esculturas sobre pedestales. Se entra como a la ópera y se sale más pobre, a veces más rico.",
  },
  // BOSS
  "salon-antiquaires-drouot": {
    nom: "Gran Salón de los Anticuarios",
    description:
      "El sanctasanctórum. Los mayores coleccionistas se cruzan aquí, y las piezas únicas hacen su última aparición.",
  },
};
