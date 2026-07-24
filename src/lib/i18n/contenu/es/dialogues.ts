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
    "Ah, el olor de las cosas viejas por la mañana… Mira los puestos: desliza de un objeto a otro, tómate tu tiempo.",
    "Cuando un objeto te hable, regatea — o cómpralo al precio marcado si el corazón te lo pide. Venga, elige uno.",
  ],
  tuto_achat_fait: [
    "¡Bien hecho! Tu abuela habría regateado dos céntimos más, pero es un comienzo.",
    "Venga, volvamos. Sal por la salida, con tu tesoro bajo el brazo.",
  ],
  tuto_retour: [
    "Rebuscar es el placer. Vender es el oficio. Pero un puesto no se monta con un solo hallazgo…",
    "Así que te he preparado un paquete: algunas piezas de la tienda para llenar tu primer escaparate. Te espera junto a la puerta — ¡ábrelo!",
  ],
  tuto_vente_entree: [
    "Los clientes vendrán. Escúchalos, déjalos hablar… y nunca bajes tu precio demasiado rápido.",
  ],
  tuto_vente_faite: [
    "¡Y ahí está tu primera venta! El canto de la caja registradora — nunca se olvida.",
    "Cierra el puesto cuando quieras, y volvamos. Tengo algo para ti en casa.",
  ],
  tuto_conclusion: [
    "Tienes el ojo, y la mano… solo te faltan los años. La tienda queda en buenas manos.",
    "Toma: mi cuaderno de encargos. La gente apunta lo que busca — míralo a menudo.",
    "Y ha pasado el cartero: una carta de tu madre, creo. A trabajar… estaré en mi sillón si me necesitas.",
  ],
  dlg_trame_ch1: [
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
    "Así que es verdad. Existen. Ahí, en tu escaparate… Déjame mirarlas un poco más.",
    "Tu abuela diría que el azul de la jarra les sentaba mejor. Tendría razón, como siempre.",
    "Mi sueño se ha cumplido — no como lo imaginaba: mejor. Eres tú quien lo ha terminado. Una historia nunca pertenece a quien la empieza, ¿sabes?",
    "Toma: las llaves. Todas. Yo tengo un tren mañana — Venecia primero, luego ya veremos. Te escribiré. Cuida la tienda… ella siempre ha cuidado de nosotros.",
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
  gazette_tuto: [
    "¡Ah, la has encontrado! La Gaceta de los Chamarileros — cincuenta años leyéndola cada lunes. Esta te la regalo yo.",
    "Mira la sección de tendencias: te dice qué categorías están de moda esta semana. Cuanto más entendido seas, más te revela.",
    "El parte meteorológico anuncia el clima en los mercadillos — y la afluencia que trae consigo. Lo leerás con la habilidad «Parte meteorológico».",
    "Los ecos de sociedad susurran qué celebridad visitará qué mercadillo… Negocios de oro — para quien tiene «Ecos de sociedad».",
    "Y con algo de «Influencia», hasta podrás hacer reescribir un artículo que no te guste. Ay, la prensa…",
    "Desde el próximo lunes, el quiosco la dejará ante tu puerta. Unas monedas bien invertidas, créeme. Esta la dejo en la esquina del escritorio.",
  ],
};
