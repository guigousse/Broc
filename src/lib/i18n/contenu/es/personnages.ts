import type { OverlayPersonnages } from "@/lib/i18n/contenu/en/personnages";

/**
 * Overlay ES (España, «tú») des personnages (spec i18n §2, SP3, tâche 7).
 * Clients de vente, vendeurs de chine et expéditeurs regroupés. Le FR reste
 * canonique ; résolution par id à l'affichage. Signatures : garder les `\n`.
 * Noms propres à gouaille : saveur conservée (« Mamie Odette » → « Abuela Odette »).
 */
export const PERSONNAGES_ES: OverlayPersonnages = {
  archetypesClient: {
    retraite_chineur: { nom: "Jubilado gangueador" },
    passionnee_artdeco: { nom: "Apasionada del Art Déco" },
    brocanteur_concurrent: { nom: "Anticuario rival" },
    collectionneur_musique: { nom: "Coleccionista de música" },
    gamer_nostalgique: { nom: "Gamer nostálgico" },
    bibliophile: { nom: "Bibliófilo" },
    bricoleur_dimanche: { nom: "Manitas de domingo" },
    etudiant_fauche: { nom: "Estudiante sin blanca" },
    snob_bourgeois: { nom: "Burgués esnob" },
    touriste_perdu: { nom: "Turista perdido" },
    famille_dimanche: { nom: "Familia de domingo" },
    decorateur: { nom: "Decorador de interiores" },
    amateur_vintage: { nom: "Amante del vintage" },
    notable_curieux: { nom: "Notable curioso" },
    opportuniste: { nom: "Oportunista con olfato" },
    galeriste: { nom: "Galerista" },
  },
  personnages: {
    "retraite_chineur.0": {
      nom: "Señor Durand",
      ambiance: "Cuenta cada céntimo mirando por encima de las gafas.",
    },
    "retraite_chineur.1": {
      nom: "Señora Rivoire",
      ambiance: 'Siempre pregunta "¿es su último precio?".',
    },
    "retraite_chineur.2": {
      nom: "Pierre del barrio",
      ambiance: "Viene sobre todo a charlar, compra poco.",
    },
    "passionnee_artdeco.0": {
      nom: "Léonie de Tourcoing",
      ambiance: "Suspira despacio ante cada bella pátina.",
    },
    "passionnee_artdeco.1": {
      nom: "Camille Mercier",
      ambiance: "Fotografía con discreción las piezas que le gustan.",
    },
    "passionnee_artdeco.2": {
      nom: "Señora Renaud",
      ambiance: "Acaricia la madera labrada con dedo entendido.",
    },
    "brocanteur_concurrent.0": {
      nom: "Maxime del rastro",
      ambiance: "Nunca sonríe, siempre ofrece un 30 % menos.",
    },
    "brocanteur_concurrent.1": {
      nom: "Hugo el revendedor",
      ambiance: "Se sabe tu puesto y tus precios de memoria.",
    },
    "brocanteur_concurrent.2": {
      nom: 'Jean-Claude "el precio"',
      ambiance: "Cita subastas para justificar sus ofertas ridículas.",
    },
    "collectionneur_musique.0": {
      nom: "Bertrand el melómano",
      ambiance: "Huele cada funda de vinilo con respeto.",
    },
    "collectionneur_musique.1": {
      nom: "Sophie LP",
      ambiance: "Siempre se va con dos o tres discos bajo el brazo.",
    },
    "collectionneur_musique.2": {
      nom: "Vinilo Vincent",
      ambiance: "Conoce todas las prensas, todos los sellos.",
    },
    "gamer_nostalgique.0": {
      nom: "Léo el retro",
      ambiance: "Se enternece ante cada cartucho de su infancia.",
    },
    "gamer_nostalgique.1": {
      nom: "Thomas el píxel",
      ambiance: "Comprueba el estado de los mandos y suspira de gusto.",
    },
    "gamer_nostalgique.2": {
      nom: "Marina la geek",
      ambiance: "Busca un regalo para su hermano coleccionista.",
    },
    "bibliophile.0": {
      nom: "Hélène la bibliotecaria",
      ambiance: "Revisa las páginas que faltan, muy sentenciosa.",
    },
    "bibliophile.1": {
      nom: "Profesor Lambert",
      ambiance: "Hurga entre las ediciones originales.",
    },
    "bibliophile.2": {
      nom: "Émilie la de la pluma",
      ambiance: "Busca papel antiguo y plumines Sergent-Major.",
    },
    "bricoleur_dimanche.0": {
      nom: "Marcel el manitas",
      ambiance: "Huele el serrín a tres metros.",
    },
    "bricoleur_dimanche.1": {
      nom: "Patrice el del taladro",
      ambiance: "Siempre pregunta si todavía funciona.",
    },
    "bricoleur_dimanche.2": {
      nom: "Jacques el de los alicates",
      ambiance: "Inspecciona cada herramienta como un cirujano.",
    },
    "etudiant_fauche.0": {
      nom: "Théo en prácticas",
      ambiance: "Mira largo rato, se palpa los bolsillos y lo deja.",
    },
    "etudiant_fauche.1": {
      nom: "Anaïs sin un duro",
      ambiance: "Regatea como si le fuera la vida en ello.",
    },
    "etudiant_fauche.2": {
      nom: "Yanis el bohemio",
      ambiance: "Lo quiere todo, puede pagar una décima parte.",
    },
    "snob_bourgeois.0": {
      nom: "Charles-Henri de B.",
      ambiance: "No saluda al vendedor, examina con la yema de los dedos.",
    },
    "snob_bourgeois.1": {
      nom: "Señora de Lacombe",
      ambiance: "Ojea las piezas sin dignarse a tocarlas.",
    },
    "snob_bourgeois.2": {
      nom: "Aristide padre",
      ambiance: "Rechaza con cortesía todo lo que parece vulgar.",
    },
    "touriste_perdu.0": {
      nom: "Karl el berlinés",
      ambiance: "Se entusiasma en un francés titubeante.",
    },
    "touriste_perdu.1": {
      nom: "Maria de Milán",
      ambiance: "Convierte los precios al vuelo, sorprendida y conquistada.",
    },
    "touriste_perdu.2": {
      nom: "Hiroshi y Yuka",
      ambiance: "Alargan la mano hacia todo lo que brilla un poco.",
    },
    "famille_dimanche.0": {
      nom: "Familia Martínez",
      ambiance: "Los niños se agarran a todo lo que hace ruido.",
    },
    "famille_dimanche.1": {
      nom: "Señora Petit y su hijo",
      ambiance: "Buscan un regalito para la abuela.",
    },
    "famille_dimanche.2": {
      nom: "Los Garnier",
      ambiance: "Rara vez se van con las manos vacías si hay juguetes.",
    },
    "decorateur.0": {
      nom: "Sylvain el diseñador",
      ambiance: "Ya imagina la pieza en un loft de Lyon.",
    },
    "decorateur.1": {
      nom: "Bérénice la decoradora",
      ambiance: "Hace una foto, toma medidas y se la lleva.",
    },
    "decorateur.2": {
      nom: "Olivier el reformista",
      ambiance: "Busca carácter para sus obras.",
    },
    "amateur_vintage.0": {
      nom: "Inès la rockabilly",
      ambiance: "Busca una cazadora de cuero y un single de 45.",
    },
    "amateur_vintage.1": {
      nom: "Théo el mod",
      ambiance: "Marca el pie al ritmo de una melodía que suena en su cabeza.",
    },
    "amateur_vintage.2": {
      nom: "Clara en vaqueros",
      ambiance: "Se prueba de todo, se va con dos piezas.",
    },
    "notable_curieux.0": {
      nom: "Letrado Lefèvre",
      ambiance: "Cortesía exquisita, cartera discreta pero honda.",
    },
    "notable_curieux.1": {
      nom: "Doctor Roux",
      ambiance: "Curioso por todo, habla latín con los libros.",
    },
    "notable_curieux.2": {
      nom: "La Condesa",
      ambiance: "Viene a pasar el rato, se va por el gusto de hacerlo.",
    },
    "opportuniste.0": {
      nom: "Sébastien el listo",
      ambiance: "Señala directo tus precios más blandos.",
    },
    "opportuniste.1": {
      nom: "Rachida el ojo",
      ambiance: "Detecta la etiqueta mal puesta a diez pasos.",
    },
    "opportuniste.2": {
      nom: "Vincent del mercado",
      ambiance: "Siempre sorprende con un precio bajísimo… que cuela.",
    },
    "galeriste.0": {
      nom: "Aurélien de Saint-Germain",
      ambiance: "Rodea la pieza y murmura en italiano.",
    },
    "galeriste.1": {
      nom: "Señora Vermeer",
      ambiance: "Saca una lupa de bolsillo y examina la firma.",
    },
    "galeriste.2": {
      nom: "Pascal el galerista",
      ambiance: "Habla de pedigrí, procedencia y certificados.",
    },
  },
  archetypesVendeur: {
    naif: "El Novato",
    bonhomme: "El Buenazo",
    mamie: "Abuela con prisa",
    malin: "El Astuto",
    grincheux: "El Gruñón",
    antiquaire: "El Anticuario",
    pipelette: "La Parlanchina",
    videcave: "El Vacía-Sótanos",
    bonimenteur: "El Charlatán",
    disquaire: "El Discófilo",
    joueur: "El Gamer",
    setdesigner: "La Escenógrafa",
    modeuse: "La Modista",
    esthete: "El Esteta",
  },
  vendeurs: {
    naif: "Lucienito",
    bonhomme: "Dédé el Tirantes",
    mamie: "Abuela Odette",
    malin: "Anatole el Truco",
    grincheux: "Tío Anselme",
    antiquaire: "Señora Vasseur",
    pipelette: "Tía Monique",
    videcave: "Jeannot Vacía-Sótanos",
    bonimenteur: "Óscar el Labia",
    disquaire: "Barnabé 33-Vueltas",
  },
  vendeurInconnu: "Un vendedor",
  expediteurs: {
    maman: {
      nom: "Mamá",
      personnalite: "Tu madre",
      relation: "Madre",
      signature: "Con todo mi cariño,\nMamá",
    },
    "grand-pere": {
      nom: "Abuelo",
      personnalite: "Anticuario desaparecido",
      relation: "Abuelo",
      signature: "Ahora te toca a ti, pequeño.\nAbuelo",
    },
    "jeux-video": {
      nom: "El Jugador del Mercadillo",
      personnalite: "Apasionado de los videojuegos",
      signature: "Nos vemos en los píxeles,\nEl Jugador del Mercadillo",
    },
    "set-designer": {
      nom: "Clara",
      personnalite: "Escenógrafa",
      signature: "Gracias de antemano,\nClara",
    },
    mode: {
      nom: "Arianne",
      personnalite: "Diseñadora de moda",
      signature: "Con estilo,\nArianne",
    },
    art: {
      nom: "Paul-Henry",
      personnalite: "Coleccionista de arte",
      signature: "Un cordial saludo,\nPaul-Henry",
    },
  },
};
