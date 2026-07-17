import { ID_LETTRE_MAMAN_DEBUT } from "@/lib/courrier";

/**
 * Overlay ES du courrier scénarisé (spec i18n §2, SP4) : lettre starter de Maman
 * + trame principale (`trame_ch1..12`) + invitations des organisateurs
 * (`invitation_tier2/3/4`) + cartes postales d'épilogue (`carte_postale_1..5`).
 * Clé = id stable du courrier ; résolu À L'AFFICHAGE, fallback payload FR
 * (helpers `titreCourrier`/`corpsCourrier`).
 *
 * Traduction littéraire (ES d'Espagne, « tú »), pas fonctionnelle : la voix du
 * grand-père (nostalgie, tendresse, mystère qui affleure) est la matière du
 * jeu. Les `**gras**` sont conservés (rendu par les sheets) ; les objets cités
 * restent COHÉRENTS avec `es/objets.ts` (lampe = « Quinqué antiguo », faïence =
 * « Jarra de loza esmaltada », gravure = « Grabado 'Vista de París' de Jouy »,
 * bijoux = « Las joyas de la reina »). Le grand-père se prénomme « Marcel »
 * (gardé tel quel, cf. lettre de Maman) ; sa signature reprend le nom déjà
 * établi dans `es/personnages.ts` (« Abuelo »). « Grand Salon des
 * Antiquaires » → « Gran Salón de los Anticuarios » comme dans
 * `es/brocantes.ts` (id `salon-antiquaires-drouot`, tier 4 — à ne pas
 * confondre avec « Gran Feria de Antigüedades » qui traduit `foire-chatou`,
 * tier 3). Le NOMBRE de paragraphes suit le FR (mise en page).
 */
export const COURRIER_ES: Record<string, { titre: string; corps: string[] }> = {
  [ID_LETTRE_MAMAN_DEBUT]: {
    titre: "Para empezar con buen pie",
    corps: [
      "Mi niño querido,",
      "Así que ya está: ¡tu abuelo te ha confiado la tienda! Marcel no me lo dijo hasta después, claro — ya lo conoces. Creo que nunca ha estado tan orgulloso, aunque refunfuñará si se lo repites.",
      "Te deslizo **150 €** en el sobre para ayudarte a empezar. Regálate una pieza bonita para tu escaparate, o guárdalos para los días flojos.",
      "Cuida un poco de él, ¿quieres? Y ven a verme cuando tengas un minuto.",
    ],
  },
  trame_ch1: {
    titre: "La lámpara de mi taller",
    corps: [
      "Encontrar un **quinqué antiguo** en buen estado.",
      "«Cuarenta años que alumbró mis hallazgos. Una tienda sin su lámpara es una historia sin luz.»",
    ],
  },
  trame_ch2: {
    titre: "Vender es vivir",
    corps: [
      "Acumular **300 €** en ventas desde la aceptación.",
      "«Rebuscar es el placer. Vender es el oficio. Y el oficio se aprende vendiendo.»",
    ],
  },
  trame_ch3: {
    titre: "Manos de oro",
    corps: [
      "Restaurar un objeto hasta el estado **Bueno**.",
      "«Un objeto dañado es una historia que tartamudea. Repárala.»",
    ],
  },
  trame_ch4: {
    titre: "La jarra de tu abuela",
    corps: [
      "Encontrar una **jarra de loza esmaltada**.",
      "«La vendí un invierno de estrecheces. Algunos arrepentimientos tienen forma de jarra azul.»",
    ],
  },
  trame_ch5: {
    titre: "Un nombre que circula",
    corps: [
      "Alcanzar el **nivel 8** de chamarilero.",
      "«Tu nombre vale más que tu caja. Hazlo circular.»",
    ],
  },
  trame_ch6: {
    titre: "El olfato",
    corps: [
      "Conseguir un beneficio de al menos **100 €** en una sola venta.",
      "«Comprar bien, vender bien. Entre los dos, está el ojo.»",
    ],
  },
  trame_ch7: {
    titre: "Un escaparate digno de ese nombre",
    corps: [
      "Alcanzar **1.500 €** de valor de colección.",
      "«Una colección es un rostro. Haz que el tuyo sea inolvidable.»",
    ],
  },
  trame_ch8: {
    titre: "La alta sociedad",
    corps: [
      "Encontrar un **grabado 'Vista de París' de Jouy** en muy buen estado.",
      "«Ahí arriba no se perdona el más o menos. Impecable, ¿me oyes?»",
    ],
  },
  trame_ch9: {
    titre: "Obra maestra",
    corps: [
      "Restaurar un objeto hasta el estado **Impecable**.",
      "«Un objeto restaurado es una vida que se prolonga.»",
    ],
  },
  trame_ch10: {
    titre: "La invitación",
    corps: [
      "El abuelo lo ha contado todo: cincuenta años de búsqueda, y el Gran Salón como última pista.",
      "«Es ahí donde todo se detiene, o donde todo se cumple.»",
    ],
  },
  trame_ch11: {
    titre: "Las joyas de la reina",
    corps: [
      "Conseguir **las joyas de la reina** en el Gran Salón. Se quedarán en tu colección.",
      "«Cincuenta años que las busco. Ahora te toca a ti tender la mano.»",
    ],
  },
  trame_ch12: {
    titre: "La entrega de las llaves",
    corps: [
      "La tienda es tuya ahora. El abuelo se va de viaje — escribirá.",
      "«Una historia nunca pertenece a quien la empieza.»",
    ],
  },
  invitation_tier2: {
    titre: "Invitación a los mercados de la ciudad",
    corps: [
      "Tu puesto ya no pasa desapercibido: varios de nuestros expositores nos han hablado de ti.",
      "Los **mercados ★★ de la ciudad** ya están abiertos para ti. Preséntate en la entrada — tu nombre bastará.",
    ],
  },
  invitation_tier3: {
    titre: "Invitación a los salones",
    corps: [
      "Tu reputación te precede — algo poco común, y que sabemos reconocer.",
      "Los **salones ★★★** se sentirían honrados con tu visita. Se aprecia vestimenta correcta, se exige buen ojo.",
    ],
  },
  invitation_tier4: {
    titre: "El Gran Salón de los Anticuarios",
    corps: [
      "Pocos nombres entran en **el Gran Salón**. El tuyo acaba de ser inscrito.",
      "Te esperamos. Algunos buscan tesoros allí; los más sabios encuentran historias.",
    ],
  },
  carte_postale_1: {
    titre: "Postal desde Venecia",
    corps: [
      "Llueve sobre la laguna y todos lo encuentran triste, menos yo. Los reflejos duplican la ciudad — dos Venecias por el precio de una, menudo chollo.",
      "Regateé una copa de Murano por principio. Perdí. El vendedor tenía tu edad — buena señal para el oficio.",
      "Cuida la tienda. — Abuelo",
    ],
  },
  carte_postale_2: {
    titre: "Postal desde Lisboa",
    corps: [
      "Los tranvías de aquí chirrían igual que la escalera de la tienda. Me sentí como en casa enseguida.",
      "Una señora me vendió azulejos «del siglo XVIII». Son de 1974. Los compré igual: lo que se compra es la historia, no la fecha.",
      "— Abuelo",
    ],
  },
  carte_postale_3: {
    titre: "Postal desde Marrakech",
    corps: [
      "El zoco, pequeño. EL ZOCO. Negocié tres horas por una tetera; acabamos bebiendo el té en ella, en casa de su abuela.",
      "Te enseñaré el gesto de las manos, un día. Eso no se escribe.",
      "— Abuelo",
    ],
  },
  carte_postale_4: {
    titre: "Postal desde Kioto",
    corps: [
      "Aquí reparan los cuencos rotos con polvo de oro. Lo llaman kintsugi: la cicatriz forma parte de la belleza.",
      "Pensé en mis manos, y en ti, en el banco de trabajo. Hicimos bien en recomponer las cosas, ¿sabes?",
      "— Abuelo",
    ],
  },
  carte_postale_5: {
    titre: "Postal sin sello",
    corps: [
      "Por todas partes me preguntan qué buscaba, corriendo así detrás de las joyas de una reina. Respondo: nada — ya lo tenía todo, encima de una tienda de chamarilero.",
      "El tren vuelve a partir. Todavía no sé hacia dónde, y así está bien.",
      "Hasta pronto, pequeño. — Abuelo",
    ],
  },
};
