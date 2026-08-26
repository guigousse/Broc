/**
 * Overlay ES de los diálogos (clave = id de secuencia, mismo número de
 * líneas que el FR). SP3 Task 8 : además de las secuencias del tutorial
 * (`tuto_*`, catalogadas en `TOUTES_SEQUENCES`), se traducen aquí los 12
 * diálogos de entrega de los capítulos de la trama. Estas secuencias se
 * construyen ad hoc por el layout del QG (`{ id: `dlg_${ch.id}`, lignes:
 * ch.dialogue }`, cf. `src/app/(qg)/layout.tsx`) y se resuelven con
 * `lignesDialogue()` — clave `dlg_trame_chN`, NO registradas en
 * `TOUTES_SEQUENCES` (registro propio del tutorial). Cf.
 * `src/lib/i18n/contenu/dialogues.test.ts` para la verificación de paridad.
 */
export const DIALOGUES_ES: Record<string, string[]> = {
  tuto_accueil: [
    "¡Por fin llegas! Pasa, pasa… Cuidado con la pila de periódicos, lleva ahí desde 1987.",
    "Cincuenta años llevo con esta tienda. Cada objeto aquí tiene una historia… y mis rodillas también, por desgracia.",
    "Es hora de pasar el relevo. Y te he elegido a ti. No pongas esa cara — te va a encantar.",
    "Empecemos por el principio: el mercadillo. La puerta está ahí — sígueme.",
  ],
  tuto_chine_entree: [
    "Ah, el olor de las cosas viejas por la mañana… Hoy te guío yo: cuatro objetos, cuatro lecciones.",
    "Mira ese tocadiscos. Bonito, ¿eh? Despliega «Regatear» y ofrécele cuatro perras — a ver qué pasa.",
  ],
  tuto_nego_echec_avant: [
    "Venga, atrévete: desliza el cursor hasta abajo del todo y haz la oferta. En el peor de los casos, gruñe.",
  ],
  tuto_nego_echec_apres: [
    "¡Y ahí lo tienes, ofendido! Una oferta demasiado baja es como pisotearle el jardín: cada vendedor tiene su límite… y su carácter.",
    "Con la experiencia — niveles, habilidades, el ojo que se afina — sabrás hasta dónde bajar sin ofender a nadie.",
    "Le pasa a los mejores. Venga, siguiente puesto: te enseño lo contrario.",
  ],
  tuto_achat_direct_avant: [
    "Esta jarra de cristal… a este precio, es un chollo. A veces no se regatea: se tienden los billetes antes de que lo haga otro.",
  ],
  tuto_achat_direct_apres: [
    "Bien. Reconocer un buen chollo a la primera ya es parte del oficio.",
  ],
  tuto_nego_un_avant: [
    "¡Un mando Vibraduo! Los coleccionistas se vuelven locos por ellos. Esta vez, regatea de verdad: quédate en la zona del cursor, ni muy bajo ni muy alto.",
  ],
  tuto_nego_un_apres: [
    "¡Tu primer regateo logrado! ¿Has visto el ir y venir? Tú subes, él baja… y os encontráis en el medio.",
  ],
  tuto_nego_deux_avant: [
    "Oh… un peluche de mohair. Tu abuela tenía uno igual en su sillón. Regatéamelo con cariño, ¿quieres?",
  ],
  tuto_nego_deux_apres: [
    "¡Regateado como un maestro! Cuídalo bien, a ese… tengo mi propia idea sobre su futuro.",
  ],
  tuto_chine_sortir: [
    "Ya hemos gastado bastante por hoy — guarda algo de dinero para después. Échale un vistazo a los últimos puestos si quieres, y luego sal por la salida.",
  ],
  tuto_retour: [
    "¡Tres hallazgos de una vez! Pero un vendedor que amontona es un vendedor que pierde. Cada cosa en su lugar.",
    "Abre el Almacén, ahí abajo — te enseño la trastienda.",
  ],
  tuto_peluche_collection: [
    "El peluche… No lo vendas, a ese. Hay objetos que se guardan — eso es una colección.",
    "Mándalo a tu colección: toca su botoncito, ahí.",
  ],
  tuto_collection_lecon: [
    "¿Ves esa cifra? El valor de tu colección. Es ella la que hace tu reputación de vendedor.",
    "Y mira: el Mercadillo del domingo ya te abre sus puertas. ¡Empiezan a hablar de ti, chaval!",
    "Ahora, la venta. Vuelve al despacho — la puerta nos espera.",
  ],
  tuto_colis_avant: [
    "Antes de ir a vender, toma: un paquete de mi parte. Algunas piezas de la tienda para llenar tu primer puesto.",
    "Ábrelo — te espera junto a la puerta.",
  ],
  tuto_prix_avant: [
    "El precio es la mitad del oficio. Muy alto, nadie se detiene; muy bajo, trabajas para nada.",
    "Ya he puesto las etiquetas a mis piezas. Para el mando y la jarra, desliza el cursor hasta el precio que te indico — un pequeño margen, por debajo de la cotización: así se vende rápido.",
  ],
  tuto_prix_apres: [
    "Ahí tienes etiquetas honestas. En marcha — los clientes no esperan.",
  ],
  tuto_vente_entree: [
    "¡Bonito puesto! Me quedo contigo para esta primera vez — y suerte la tuya: por aquí conozco a todo el mundo.",
    "Van a pasar tres caras. Escúchalas, y recuerda: el precio lo llevas TÚ.",
  ],
  tuto_vente_refus_avant: [
    "Mira, Maxime, el del rastro… Siempre ofrece tres perras. Escucha su oferta — y no temas dejarlo marchar.",
  ],
  tuto_vente_refus_apres: [
    "Y ya está. Rechazar una mala venta ya es ganar. La jarra encontrará comprador — al precio justo.",
  ],
  tuto_vente_directe_avant: [
    "¡Ah, Léo! Un amigo — y loco por los mandos viejos. A precio justo, ni siquiera discutirá.",
  ],
  tuto_vente_directe_apres: [
    "¿Ves? Un precio honesto se vende solo. La caja registradora ya canta.",
  ],
  tuto_vente_nego_avant: [
    "Bérénice, la decoradora. Va a regatear, no puede evitarlo… Mantén tu precio: ella subirá.",
  ],
  tuto_vente_nego_apres: [
    "Tu primera negociación de venta de verdad. Has aguantado — ya no tengo mucho más que enseñarte.",
    "Cierra el puesto cuando quieras, y volvamos. Todavía tengo un par de palabras que decirte en casa.",
  ],
  tuto_niveau_avant: [
    "¡Un nivel más! ¿Ves esa lluvia de oro? Quiere decir que el oficio empieza a calarte.",
    "Cada nivel te da un punto para gastar. Así es como uno se forja un oficio propio — el tuyo.",
    "Abre las Habilidades, ahí abajo: te las enseño.",
  ],
  tuto_niveau_apres: [
    "«Lector de almas»: desde la próxima venta, sabrás quién tienes delante. Un nombre, un carácter — y ya la mitad del regateo hecho.",
    "Las demás ramas esperarán a tus próximos niveles. Volvamos a casa, todavía tengo algo que confiarte.",
  ],
  tuto_conclusion: [
    "Tienes el ojo, y la mano… solo te faltan los años. La tienda queda en buenas manos.",
    "Toma: mi cuaderno de encargos. La gente apunta lo que busca. Ábrelo, anda — justo tengo algo que apuntar en él.",
    "Y ha pasado el cartero: una carta de tu madre, creo. A trabajar… estaré en mi sillón si me necesitas.",
  ],
  dlg_trame_ch1: [
    "Ah, lo abres… Pues escribe, muchacho. La primerísima línea será para mí.",
    "Cuarenta años que mi viejo quinqué alumbró el banco de trabajo. Lo rompí una noche de torpeza… mis manos, ya entonces.",
    "Cada hallazgo pasaba bajo su luz antes de llegar al escaparate. Es una tontería, un viejo que se encariña con una lámpara, ¿eh?",
    "Todavía se encuentran en los mercadillos, en buen estado si buscas bien. Tráeme uno, ¿quieres?",
    "¡Y regatea! Si la pagas al precio completo, lo sabré. Siempre lo sé.",
  ],
  dlg_trame_ch2: [
    "Mi primera venta, la eché a perder. Un espejo con manchas, un cliente con prisa… titubeé, se fue. Lloré detrás de la cortina, ¿sabes?",
    "Al día siguiente, tu abuela me dijo: «Vuelve a intentarlo». Vendí un marco por dos francos. El día más bonito de mi vida como vendedor.",
    "Ahora te toca a ti. Haz cantar la caja registradora: 300 € en ventas, y te cuento lo que pasó después.",
  ],
  dlg_trame_ch3: [
    "Míralas. Tiemblan, ahora. Estas manos han encolado, lijado, barnizado durante cincuenta años.",
    "Toma mis herramientas. Son tuyas — el mazo tiene su historia, te la contaré un día.",
    "Encuentra una pieza dañada y devuélvele su forma. La primera vez que un objeto revive entre tus dedos… ya verás.",
  ],
  dlg_trame_ch4: [
    "Tu abuela tenía una jarra de loza, azul, mellada en el pico. Reinaba sobre el aparador, siempre llena de flores silvestres.",
    "Un invierno difícil, la vendí. Ella no dijo nada. Ese silencio es el que nunca he sabido reparar.",
    "Soñaba con que un día le regalara las joyas de una reina. Yo ni siquiera supe guardarle su jarra.",
    "Se encuentran parecidas en los mercadillos. Encuéntramela. Bueno… encuéntrasela a ella.",
  ],
  dlg_trame_ch5: [
    "¡Me han hablado de ti en el café, esta mañana! «El chico de la tienda», dicen. Decían lo mismo de mí, en 1975.",
    "En este oficio, tu nombre vale más que tu caja. Se gana despacio, en los puestos, un apretón de manos a la vez.",
    "Sigue rebuscando, vendiendo, aprendiendo. Cuando los mercados murmuren tu nombre, yo lo sabré antes que tú.",
  ],
  dlg_trame_ch6: [
    "Un día, dejé escapar una tabaquera de plata por cuatro perras. La revendieron diez veces su precio la semana siguiente, delante de mis narices.",
    "No dormí en toda la noche. No por el dinero — por no haber sabido ver.",
    "El olfato se forja. Hazme una buena jugada: cien euros de más en una sola venta, y creeré que tienes el ojo.",
  ],
  dlg_trame_ch7: [
    "He echado un vistazo a tu colección esta mañana, mientras dormías. Permíteme — vieja costumbre.",
    "Hay buen gusto ahí dentro. De verdad. Tu abuela habría movido dos o tres cosas, pero habría sonreído.",
    "Amplíala más. Una colección es un rostro: hay que reconocerte a primera vista.",
  ],
  dlg_trame_ch8: [
    "Entre los coleccionistas, vuelve a murmurarse sobre las joyas de la reina. Los rumores siempre regresan por los salones.",
    "Para entrar, hay que dar garantías. Un buen grabado, impecable — eso es lo que abre esas puertas discretas.",
    "Pasé treinta años acechando esos murmullos. Tú vas a sentarte a su mesa.",
  ],
  dlg_trame_ch9: [
    "Está el trabajo limpio, y está el trabajo de maestro. Cincuenta años de banco, y cuento con una mano a los que han dado ese paso.",
    "Un objeto restaurado es una vida que se prolonga. La mía se gastó en eso — y no me arrepiento de nada.",
    "Tómate tu tiempo, elige tu pieza, y hazla perfecta. El Gran Salón no merece menos. Tú tampoco.",
  ],
  dlg_trame_ch10: [
    "Siéntate. Es hora de que te cuente el final — o el principio, según se mire.",
    "Las joyas de la reina. Cincuenta años que las busco. He visto pasar su rastro en tres ventas, dos inventarios, una mentira. Cada vez, demasiado tarde.",
    "Es por ellas que me perdí domingos, cumpleaños… la jarra de tu abuela. Un sueño alumbra — pero también quema, cuando lo sostienes demasiado cerca.",
    "El Gran Salón de los Anticuarios te abre sus puertas — los organizadores te escribirán. Es ahí donde todo se detiene, o donde todo se cumple. Ve por mí.",
  ],
  dlg_trame_ch11: [
    "Están ahí, en algún lugar, entre las vitrinas del Gran Salón. Lo siento como se siente la tormenta.",
    "Yo no voy. Es tu mirada la que hace falta, ya no la mía. Encuéntralas — y guárdalas. Son tuyas. El sueño, en cambio, todavía me pertenece un poco.",
  ],
  dlg_trame_ch12: [
    "Déjame mirarlas un poco más, antes de irme. Uno no se cansa de un sueño — ni siquiera cumplido.",
    "Tu abuela diría que el azul de la jarra les sentaba mejor. Tendría razón, como siempre.",
    "Mi sueño se ha cumplido — no como lo imaginaba: mejor. Eres tú quien lo ha terminado. Una historia nunca pertenece a quien la empieza, ¿sabes?",
    "Toma: las llaves. Todas. Yo tengo un tren mañana — Venecia primero, luego ya veremos. Te escribiré. Cuida la tienda… ella siempre ha cuidado de nosotros.",
  ],
  dlg_trame_salons: [
    "Los salones, muchacho, son otro país. Allí se habla más bajo y se cuenta más rápido. Mi primera vez, pasé el día con las manos en los bolsillos — por miedo a que las vieran temblar.",
    "Un buen golpe lo da cualquiera. Lo que hace a un chamarilero es la caja que canta todas las noches. La regularidad: esa es la verdadera elegancia.",
    "Tres mil euros de ventas. Hazlos cantar — y allá arriba recordarán tu nombre sin que tengas que darlo.",
  ],
  dlg_trame_grand_coup: [
    "¿Te acuerdas de mi tabaquera de plata? La que dejé escapar por cuatro perras. Aún pienso en ella, algunas noches de invierno.",
    "En los salones, la revancha sabe distinto. Las piezas son más bellas, los ojos más afilados — y el error ajeno vale oro.",
    "Hazlo por mí: trescientos euros de más en una sola venta. La tabaquera quedará vengada, y por fin dormiré tranquilo.",
  ],
  dlg_trame_antichambre: [
    "Vuelven los rumores, muchacho. Las joyas de la reina — se habla de ellas otra vez en los salones, a media voz, como siempre.",
    "Cincuenta años llevo acechando ese rumor. Cada vez se apaga. Esta vez… esta vez creo que aún arde.",
    "El Gran Salón solo se abre a las vitrinas que hablan por sí solas. Cinco mil euros de colección — y se te abrirán puertas que yo apenas llegué a entrever.",
  ],
  dlg_trame_heritage: [
    "Así que es verdad. Existen. Esta mañana he pasado diez veces por delante de tu vitrina — y diez veces he olvidado qué venía a buscar.",
    "Pero un sueño cumplido no paga el alquiler, y una vitrina no es un mausoleo. La tienda debe vivir — después de mí, después de las joyas, después de todo esto.",
    "Demuéstrame que el oficio continúa: dos mil euros de ventas. Después… creo que tengo una maleta que hacer.",
  ],
  anniv_cadeau: [
    "¡Feliz cumpleaños, pequeño! Tu madre nunca olvida la fecha — y sabe elegir.",
    "¡Un disco de jazz! Ve al Almacén y añádelo a tu colección — un vinilo guardado es una música ganada.",
    "Luego vuelve al despacho: el gramófono sabrá hacerlo cantar.",
  ],
  anniv_fin: [
    "¡Ah, ese swing! Me quita cuarenta años de encima.",
    "Otros vinilos duermen en los mercadillos. No dudes en añadirlos a tu colección — cada disco es una música por descubrir.",
  ],
  anniv_cadeau_recurrent: [
    "¡Feliz cumpleaños, muchacho! Tu madre nunca olvida la fecha — este año el cartero llegó silbando otra vez.",
    "¡Otro disco para tu colección! Ve a añadirlo al Almacén — el gramófono lo está esperando.",
  ],
  gazette_tuto: [
    "¡Ah, la has encontrado! La Gaceta de los Rebuscadores — cincuenta años leyéndola cada lunes. Esta te la regalo yo.",
    "Mira la sección de tendencias: te dice qué categorías están de moda esta semana. Cuanto más conocedor te vuelvas, más te revela.",
    "El parte meteorológico anuncia el clima en los mercadillos — y la afluencia que trae consigo. Lo leerás con la habilidad «Parte meteorológico».",
    "Los ecos de sociedad susurran qué celebridad visitará qué mercadillo… Negocios de oro — para quien tiene «Ecos de sociedad».",
    "Y con algo de «Influencia», hasta podrás hacer reescribir un artículo que no te guste. Ay, la prensa…",
    "Desde el próximo lunes, el quiosco la dejará ante tu puerta. Unas monedas bien invertidas, créeme. Esta la dejo en la esquina del escritorio.",
  ],
  bazar_tenancier_1: [
    "¡Pase, pase! Cada pieza de aquí ya ha vivido dos vidas — la próxima la escribe usted.",
  ],
  bazar_tenancier_2: [
    "Llega en buen momento: he sacado brillo a todo el escaparate esta mañana. Reluce, ¿eh?",
  ],
  bazar_tenancier_3: [
    "Tómese su tiempo. Las buenas piezas se dejan mirar antes de dejarse llevar.",
  ],
  bazar_tenancier_4: [
    "El otro día me ofrecieron el doble por esa. Dije que no: esperaba a alguien.",
  ],
  bazar_tenancier_5: [
    "Aquí se paga en Bazarcoins, una vieja manía de la casa. Créame, vale más que los francos.",
  ],
  bazar_tenancier_6: [
    "Treinta años tras este mostrador y todavía me sorprende. ¡Mire lo que ha llegado esta semana!",
  ],
  bazar_tenancier_delai: [
    "El próximo envío llega en {t} — ¡vuelva a verme!",
  ],
};
