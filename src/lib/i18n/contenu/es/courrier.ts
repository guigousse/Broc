import { ID_LETTRE_MAMAN_DEBUT } from "@/lib/courrier";

/**
 * Overlay ES du courrier scénarisé (spec i18n §2, SP4) : lettre starter de Maman
 * + arc principal del abuelo anticuario. Clave = id stable del courrier ; résolu
 * À L'AFFICHAGE, fallback payload FR (helpers `titreCourrier`/`corpsCourrier`).
 *
 * Traduction littéraire (ES d'Espagne, « tú ») : la voix du grand-père (nostalgie,
 * comédie sarcastique sèche, mystère qui affleure) est la matière du jeu. Les
 * `**gras**` sont conservés ; les objets cités restent COHÉRENTS avec `es/objets.ts`
 * (lampe = « Quinqué antiguo », faïence = « Jarra de loza esmaltada », gravure =
 * « Grabado 'Vista de París' de Jouy », bijoux = « Las joyas de la reina »).
 * « Grand Salon » → « Gran Salón de los Anticuarios » comme dans `es/brocantes.ts`.
 * Le NOMBRE de paragraphes suit le FR (mise en page).
 */
export const COURRIER_ES: Record<string, { titre: string; corps: string[] }> = {
  [ID_LETTRE_MAMAN_DEBUT]: {
    titre: "Para empezar con buen pie",
    corps: [
      "Mi niño querido,",
      "Sé que te lanzas a esta nueva aventura como chamarilero, y estoy muy orgullosa de ti. El mercadillo es un mundo maravilloso, pero exigente: ten paciencia, observa, aprende.",
      "Te deslizo en este sobre **150 €** para ayudarte a empezar. Cómprate una pieza bonita para tu primer escaparate, o guárdalos para los días más difíciles.",
      "Ven a verme cuando tengas un rato.",
    ],
  },
  principale_ch1: {
    titre: "La última página del cuaderno",
    corps: [
      "Pequeño mío,",
      "Si estás leyendo estas líneas, es que la tienda es tuya — y yo, en otra parte. No pongas esa cara: un anticuario no muere, simplemente se muda, eso es todo.",
      "Antes de marcharme, me quedaba un último capricho: encuéntrame mi vieja **lámpara de taller**. Alumbró cuarenta años de hallazgos. Devuélvemela — es un decir.",
    ],
  },
  principale_ch2: {
    titre: "Hacerte un nombre",
    corps: [
      "¿Ya te reciben los grandes? No está mal, para un principiante.",
      "En este oficio solo se respeta a quien tiene buen ojo. Consígueme una **buena pieza de loza** — que se note que sabes reconocer la calidad.",
      "(Y no, todavía no te diré dónde estoy. Paciencia.)",
    ],
  },
  principale_ch3: {
    titre: "Las puertas del gran mundo",
    corps: [
      "Vaya, vaya. Los salones más selectos te abren sus puertas.",
      "Ahí arriba no se perdona el más o menos. Encuéntrame un **grabado en muy buen estado** — impecable, ¿me oyes?",
      "Lo que yo buscaba se esconde justo en lo más alto de esa escalera. Qué casualidad.",
    ],
  },
  principale_ch4: {
    titre: "La invitación",
    corps: [
      "El Gran Salón de los Anticuarios te ha invitado. Cómo no iba a invitarte — lo tenía todo previsto, pequeño.",
      "Todo esto, este cuaderno, estos encargos… no era por la lámpara ni por la loza. Era para traerte hasta aquí. Donde todo empezó. Donde todo se detuvo.",
      "Una última cosa te espera en ese salón. Ya sabes cuál.",
    ],
  },
  principale_ch5: {
    titre: "Las joyas de la reina",
    corps: [
      "Aquí están. **Las joyas de la reina.** Aquello por lo que lo dejé todo, una noche, sin decir palabra.",
      "Hazte con ellas y entenderás por qué me marché — y quizá dónde encontrarme.",
      "Lo demás te pertenece, ahora. Como todo lo demás.",
    ],
  },
};
