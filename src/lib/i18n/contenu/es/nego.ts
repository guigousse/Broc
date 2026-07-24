import type { CleMessageNego, Temperament } from "@/types/game";

/**
 * Overlay ES des répliques de négociation (spec i18n §2, SP4). Même forme que
 * `POOLS_NEGO_FR` : une liste de variantes par clé. Reformulation (pas de
 * mot-à-mot) qui garde l'esprit marchand gouailleur, en espagnol d'Espagne
 * avec tutoiement (« tú »). Placeholders identiques au FR par clé (`{prix}`,
 * `{cibleSecrete}`) — le test `nego.test.ts` l'impose ; le nombre de variantes
 * peut différer (modulo au rendu). Résolu À L'AFFICHAGE via `texteNego()`.
 */
export const NEGO_ES: Record<CleMessageNego, string[]> = {
  ouvertureAchat: [
    "« ¡Buenos días! Acércate, echa un vistazo. »",
    "« ¡Bienvenido! Todo está en venta, o casi. »",
    "« Buenas… te ha entrado por el ojo, ¿eh? »",
  ],
  ouvertureVente: ["El cliente te ha hecho una oferta. Te toca."],
  contreVendeur: [
    "« Venga, te hago un pequeño gesto, {prix} €… »",
    "« Mmm. Digamos {prix} €. »",
    "« {prix} € y no se hable más. »",
    "« Puedo bajar a {prix} €, es mi mejor precio. »",
    "« Sabes regatear, tú… {prix} €. »",
    "« Venga, {prix} €, partimos la diferencia. »",
  ],
  contreClient: [
    "« Puedo subir un poco: {prix} €. »",
    "« {prix} €, y es una oferta honesta. »",
    "« Venga, {prix} € si me lo envuelves. »",
    "« ¿Decimos {prix} € y nos damos la mano? »",
    "« {prix} €, último empujón. »",
  ],
  refusPoliVendeur: [
    "« Bueno, lo recojo. Una lástima, eso sí. »",
    "« Qué le vamos a hacer, otra vez será. »",
    "« No, lo guardo. El día es largo. »",
  ],
  refusPoliClient: [
    "« Nada, me voy a mirar a otro sitio. »",
    "« Paso, gracias. »",
    "« Otra vez será, quizá. »",
  ],
  fache: [
    "« ¿Te estás quedando conmigo? »",
    "« Estás abusando de mi paciencia. »",
    "« ¡A ese precio, es un insulto! »",
    "« A mí no me la das. ¡Buenos días! »",
  ],
  accord: [
    "Trato hecho por {prix} €.",
    "Vendido por {prix} €.",
    "Trato cerrado: {prix} €.",
    "Choca esos cinco — {prix} €.",
  ],
  relance: [
    "« Bueno… venga, te escucho una última vez. »",
    "« Una última oferta. La buena, esta vez. »",
  ],
  diplomate: [
    "« Mi tope es {cibleSecrete} €. Una última vez, te escucho. »",
  ],
  bonimentConclu: ["« ¡Trato hecho! Se te da bien esto… »"],
  bonimentDernierMot: ["« Esta es mi última palabra: lo tomas o lo dejas. »"],
  lotGarni: ["« Mmm, ¿los dos juntos? Hazme un precio… »"],
};

/**
 * Overlay ES des pools colorés par tempérament (même forme que
 * `POOLS_NEGO_TEMPERAMENT_FR`). Une clé/un tempérament absent retombe sur
 * `NEGO_ES` au rendu.
 */
export const NEGO_TEMPERAMENT_ES: Partial<
  Record<Temperament, Partial<Record<CleMessageNego, string[]>>>
> = {
  bourru: {
    ouvertureAchat: [
      "« ¿Qué? Ah, buenos días. Se mira con los ojos, no con las manos. »",
      "« Buenas. Esto no es un museo, está en venta. »",
    ],
    contreVendeur: [
      "« {prix} €. Y date con un canto en los dientes. »",
      "« Pff… {prix} €, y es mi última palabra. »",
      "« No tengo todo el día. {prix} €, lo tomas o lo dejas. »",
    ],
    contreClient: [
      "« {prix} €. Y ya es pagar de más. »",
      "« Subo a {prix} €, y solo porque va a llover. »",
      "« {prix} €. Sigue regateando y me largo. »",
    ],
    refusPoliVendeur: [
      "« Se acabó. Circulando. »",
      "« No. Guarda tus monedas, que yo recojo el puesto. »",
    ],
    refusPoliClient: [
      "« Bah. Quédate con tu trasto. »",
      "« Tampoco lo quería tanto, la verdad. »",
    ],
    fache: [
      "« ¿¡Pero tú me has visto bien!? »",
      "« ¡Aire! Con los graciosos no negocio. »",
    ],
    accord: [
      "« {prix} €, trato hecho. Y sin reclamaciones. »",
      "« Bueno. {prix} €, choca, y acabemos de una vez. »",
    ],
    relance: ["« Grmf… Vale. Una última oferta, y que sea buena. »"],
  },
  chaleureux: {
    ouvertureAchat: [
      "« ¡Buenos días, buenos días! Acércate, estás en tu casa. »",
      "« ¡Anda, una buena cara! Bienvenido, mira todo lo que quieras. »",
    ],
    contreVendeur: [
      "« Venga, para ti: {prix} €, porque tienes buena cara. »",
      "« Ya nos arreglaremos… digamos {prix} €, ¿te va? »",
      "« {prix} €, y te cuento su historia de regalo. »",
    ],
    contreClient: [
      "« Puedo llegar a {prix} € sin enfadar a mi hucha. »",
      "« {prix} €, y me harías muy feliz. »",
      "« Venga, {prix} €, me trae tantos recuerdos… »",
    ],
    refusPoliVendeur: [
      "« Hoy será que no, pero vuelve a verme, ¿eh? »",
      "« Otra vez será, sin rencor. »",
    ],
    refusPoliClient: [
      "« Qué pena la mía… con lo bonito que era. »",
      "« Me lo pensaré un poco más, gracias de corazón. »",
    ],
    fache: [
      "« Oh… ahora sí que me has dado un disgusto. »",
      "« ¡Hombre, ya! Te creía más amable. »",
    ],
    accord: [
      "« ¡{prix} €, y listo! Cuídamelo bien, ¿prometido? »",
      "« Adjudicado por {prix} € — tú haces negocio, y yo, un amigo. »",
    ],
    relance: ["« Venga, no sé decir que no… te escucho, una última vez. »"],
  },
  radin: {
    ouvertureAchat: [
      "« Buenos días. Aviso desde ya: aquí nada es regalado. »",
      "« Buenas… llegas a tiempo, todo debe salir. Eso sí, al buen precio. »",
    ],
    contreVendeur: [
      "« {prix} €… y ya pierdo dinero, te lo juro. »",
      "« Bueno, {prix} €, pero solo porque el día está muerto. »",
      "« {prix} €. Por menos, me lo quedo para mi cuñada. »",
    ],
    contreClient: [
      "« {prix} €, y me salto un almuerzo esta semana. »",
      "« Rebañando los bolsillos: {prix} €. »",
      "« {prix} €, es todo lo que tengo — lo he contado dos veces. »",
    ],
    refusPoliVendeur: [
      "« A ese precio prefiero quedármelo, total, no ocupa sitio. »",
      "« No, no, el año que viene valdrá más. »",
    ],
    refusPoliClient: [
      "« Demasiado caro para mí, qué le vamos a hacer. »",
      "« Mi banquero me mataría. Paso. »",
    ],
    fache: [
      "« ¿¡Quieres arruinarme!? »",
      "« ¿Y qué más, mis ahorros también? »",
    ],
    accord: [
      "« {prix} €… vale. Pero me estás retorciendo el brazo. »",
      "« Va, {prix} €, y no le decimos a nadie que he cedido. »",
    ],
    relance: ["« Espera… he vuelto a echar cuentas. Te escucho. »"],
  },
  raffine: {
    ouvertureAchat: [
      "« Bienvenido. Tienes ojo, ya lo veo. »",
      "« Buenos días. Tómate tu tiempo — las cosas bellas lo merecen. »",
    ],
    contreVendeur: [
      "« Esta pieza tiene procedencia, y eso se paga: {prix} €. »",
      "« {prix} €. El buen gusto cuesta, querido amigo. »",
      "« Digamos {prix} €, y te llevas un fragmento de historia. »",
    ],
    contreClient: [
      "« {prix} €, ni uno más — tengo ojo para el justo valor. »",
      "« Consiento {prix} €, por amor a la pieza. »",
      "« {prix} €. Más allá, sería pura especulación. »",
    ],
    refusPoliVendeur: [
      "« Esperará a un comprador entendido. Buenos días. »",
      "« Está claro que no hablamos el mismo idioma. Sin rencor. »",
    ],
    refusPoliClient: [
      "« La pieza no merece esa tarifa, por desgracia. »",
      "« Me retiro — mi presupuesto tiene principios. »",
    ],
    fache: [
      "« ¡Es un insulto al buen gusto! »",
      "« Así no se regatea una pieza semejante. Adiós. »",
    ],
    accord: [
      "« {prix} €. Excelente elección, tienes ojo. »",
      "« Trato cerrado por {prix} € — quedará perfecta en tu casa. »",
    ],
    relance: ["« Sea. La elegancia obliga a escuchar una última propuesta. »"],
  },
  bavard: {
    ouvertureAchat: [
      "« ¡Ah, buenos días! Justo le decía a mi vecino de puesto — en fin, ¡acércate! »",
      "« ¡Bienvenido, bienvenido! Cada pieza tiene su historia, ¡pregúntame! »",
    ],
    contreVendeur: [
      "« ¡{prix} €! Y te juro que mi prima me ofrecía el doble — en fin, {prix} €. »",
      "« Escucha, entre nosotros: {prix} €, y es un secreto. »",
      "« {prix} €, y te cuento dónde lo encontré — ¡una historia increíble! »",
    ],
    contreClient: [
      "« {prix} €, y eso que dicen que siempre pago de más — en fin, ¡{prix} €! »",
      "« Bueno, entre gente que sabe conversar: {prix} €. »",
      "« {prix} €, y créeme, ¡he visto pasar muchos puestos! »",
    ],
    refusPoliVendeur: [
      "« ¡Qué le vamos a hacer! Pero quédate, que te cuento cómo lo conseguí… »",
      "« No hay trato, ¡pero qué gusto charlar contigo! »",
    ],
    refusPoliClient: [
      "« ¡Da igual! Total, el coche ya lo llevo lleno, si tú supieras… »",
      "« Paso — ¡pero qué placer de conversación, de verdad! »",
    ],
    fache: [
      "« Pues me he quedado sin palabras. Y créeme, ¡eso es raro! »",
      "« Enfadarías a un charlatán — ¡que ya es decir! »",
    ],
    accord: [
      "« ¡{prix} €, adjudicado! Esta historia se contará, créeme. »",
      "« ¡Choca, {prix} €! Ya verás, todo el mercado hablará de esto. »",
    ],
    relance: ["« Bueno, bueno… no sé estar callado, así que te escucho. »"],
  },
  passionne: {
    ouvertureAchat: [
      "« ¡Buenos días! Todo lo de aquí está elegido con amor, créeme. »",
      "« Bienvenido… ah, veo que miras la mejor pieza. »",
    ],
    contreVendeur: [
      "« {prix} €… conozco esta pieza de memoria, los vale. »",
      "« Para alguien que sabrá apreciarla: {prix} €. »",
      "« {prix} €. Mira ese estado — no encontrarás otra igual. »",
    ],
    contreClient: [
      "« ¡{prix} €! Llevo años detrás de esa pieza. »",
      "« Subo a {prix} €, el corazón tiene sus razones. »",
      "« {prix} €… mi colección la reclama, sé amable. »",
    ],
    refusPoliVendeur: [
      "« Pues se queda conmigo. Lo que se ama no se malvende. »",
      "« Qué le vamos a hacer. Ya encontrará a su entendido. »",
    ],
    refusPoliClient: [
      "« El corazón quería, el bolsillo no. Una pena. »",
      "« Me habría hecho tan feliz… pero no a ese precio. »",
    ],
    fache: [
      "« ¡Así no se habla de una pieza semejante! »",
      "« ¿¡Es que no respetas el buen trabajo!? »",
    ],
    accord: [
      "« {prix} € — se va a buenas manos, eso me consuela. »",
      "« Trato hecho por {prix} €. Tienes un pequeño tesoro, que lo sepas. »",
    ],
    relance: ["« Por ella, acepto escuchar una última vez. »"],
  },
};
