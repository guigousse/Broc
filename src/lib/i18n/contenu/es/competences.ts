import { CATEGORIES } from "@/data/categories";
import type { CategorieObjet } from "@/types/game";
import type { OverlayCompetences } from "@/lib/i18n/contenu";

/**
 * Overlay ES des compétences (spec i18n §2, SP3). Le FR de `src/data/competences.ts`
 * reste canonique ; ces Record<Id, …> sont résolus À L'AFFICHAGE (fallback FR sinon).
 * Clés : `arbres` = treeId, `branches` = `${treeId}/${brancheId}`, `paliers` = CompetenceDef.id.
 * ⚠️ Les chiffres d'équilibrage sont conservés à l'identique (décimales ES : `0,75`, `%` détaché).
 */

/** Libellé espagnol de catégorie (miroir de ui/es.ts, local pour éviter un couplage au dictionnaire UI). */
export const CAT_ES: Record<CategorieObjet, string> = {
  Musique: "Música",
  "Jeux & Loisirs": "Juegos y ocio",
  "Livres & Papeterie": "Libros y papelería",
  Mode: "Moda",
  Maison: "Hogar",
  "Objets d'art": "Objetos de arte",
  Bricolage: "Bricolaje",
};

/** Les 4 branches thématiques partagent la même structure — 1 seule table de gabarits. */
function paliersThematiques(cat: CategorieObjet): OverlayCompetences["paliers"] {
  const c = CAT_ES[cat];
  return {
    [`cat.${cat}.reparer.1`]: {
      nom: `Aprendiz — ${c}`,
      description: `Restauras las piezas « ${c} » en mal estado (Malo → Bueno, 1 hora).`,
    },
    [`cat.${cat}.reparer.2`]: {
      nom: `Artesano — ${c}`,
      description: `Rematas las piezas ya decentes (Bueno → Muy bueno, 2 horas).`,
    },
    [`cat.${cat}.reparer.3`]: {
      nom: `Maestro — ${c}`,
      description: `Consigues elevar las piezas a impecable y reduces todos los tiempos de restauración « ${c} » en 30 min.`,
    },
    [`cat.${cat}.connaisseur.1`]: {
      nom: `Vigía — ${c}`,
      description: `La Gaceta de los Rebuscadores te revela la tasa de tendencia de la categoría « ${c} ».`,
    },
    [`cat.${cat}.connaisseur.2`]: {
      nom: `Mercader avisado — ${c}`,
      description: `En tu puesto (preparación y venta), se muestra la cotización de las piezas « ${c} ».`,
    },
    [`cat.${cat}.connaisseur.3`]: {
      nom: `Ojo entrenado — ${c}`,
      description: `Al rebuscar, lees la cotización real de los objetos « ${c} ».`,
    },
    [`cat.${cat}.passion.1`]: {
      nom: `Aficionado — ${c}`,
      description: `Los clientes pagan un +10 % por los objetos « ${c} ».`,
    },
    [`cat.${cat}.passion.2`]: {
      nom: `Apasionado — ${c}`,
      description: `Los clientes pagan un +20 % por los objetos « ${c} » (reemplaza a Aficionado).`,
    },
    [`cat.${cat}.passion.3`]: {
      nom: `Forofo — ${c}`,
      description: `Los clientes pagan un +30 % por los objetos « ${c} » (reemplaza a Apasionado).`,
    },
    [`cat.${cat}.oeil_aiguise.1`]: {
      nom: `Labia ágil — ${c}`,
      description: `Cuando un cliente regatea un objeto « ${c} », tolera contraofertas un +10 % más codiciosas.`,
    },
    [`cat.${cat}.oeil_aiguise.2`]: {
      nom: `Labia — ${c}`,
      description: `Cuando un cliente regatea un objeto « ${c} », tolera contraofertas un +20 % más codiciosas (reemplaza a Labia ágil).`,
    },
    [`cat.${cat}.oeil_aiguise.3`]: {
      nom: `Pico de oro — ${c}`,
      description: `Cuando un cliente regatea un objeto « ${c} », tolera contraofertas un +30 % más codiciosas (reemplaza a Labia).`,
    },
  };
}

function arbreThematique(cat: CategorieObjet): { nom: string; baseline: string } {
  return { nom: CAT_ES[cat], baseline: `Especialízate en « ${CAT_ES[cat]} ».` };
}

/** Branches thématiques : mêmes 4 libellés pour chaque catégorie, jamais de description (comme le FR). */
function branchesThematiques(cat: CategorieObjet): OverlayCompetences["branches"] {
  return {
    [`cat.${cat}/reparer`]: { nom: "Reparar" },
    [`cat.${cat}/connaisseur`]: { nom: "Conocedor" },
    [`cat.${cat}/passion`]: { nom: "Pasión" },
    [`cat.${cat}/oeil_aiguise`]: { nom: "Ojo agudo" },
  };
}

export const COMPETENCES_ES: OverlayCompetences = {
  arbres: {
    general: { nom: "General", baseline: "El oficio de mercader, en sus cimientos." },
    ...Object.fromEntries(CATEGORIES.map((cat) => [`cat.${cat}`, arbreThematique(cat)])),
  },
  branches: {
    "general/negociation": { nom: "Regateo", description: "Tus contraofertas aguantan más." },
    "general/charisme": { nom: "Carisma", description: "Tu puesto atrae a la multitud." },
    "general/presentation": {
      nom: "Perspicacia",
      description: "Lees a tus clientes como un libro abierto.",
    },
    "general/vision": {
      nom: "Visión del mercado",
      description: "Lees el clima de los negocios y los rumores de salón.",
    },
    ...Object.assign({}, ...CATEGORIES.map((cat) => branchesThematiques(cat))),
  },
  paliers: {
    "general.negociation.1": {
      nom: "Labia",
      description:
        "Los clientes toleran contraofertas un 20 % más codiciosas antes de molestarse.",
    },
    "general.negociation.2": {
      nom: "Pico de oro",
      description:
        "Los clientes toleran contraofertas un 40 % más codiciosas antes de molestarse.",
    },
    "general.negociation.3": {
      nom: "Diplomático",
      description:
        "En vez de marcharse enfadado, el cliente te suelta su precio máximo exacto y te deja una última contraoferta (1 vez al día).",
    },
    "general.charisme.1": {
      nom: "Puesto cuidado",
      description:
        "El intervalo entre dos transeúntes se reduce un 25 % (×0,75): alrededor de un tercio más de clientes en el día.",
    },
    "general.charisme.2": {
      nom: "Buena fama",
      description: "El apetito medio de todos tus clientes sube un +10 %.",
    },
    "general.charisme.3": {
      nom: "Puesto de renombre",
      description:
        "Al menos una vez al día, un cliente de gran bolsa (apetito ×1,3) viene a verte.",
    },
    "general.presentation.1": {
      nom: "Lector de almas",
      description:
        "Reconoces a tus clientes: su nombre y su ánimo aparecen en la ficha de regateo.",
    },
    "general.presentation.2": {
      nom: "Tasador de bolsas",
      description:
        "Se muestra la cartera del cliente — el dinero que lleva encima — en la ficha de negociación.",
    },
    "general.presentation.3": {
      nom: "Ojo agudo",
      description:
        "La ficha de regateo muestra una horquilla del 20 % donde se esconde el precio máximo del cliente — nunca justo en el centro.",
    },
    "general.vision.1": {
      nom: "Parte meteorológico",
      description:
        "El tiempo del día aparece en la Gaceta, con su efecto en la afluencia del puesto.",
    },
    "general.vision.2": {
      nom: "Ecos de sociedad",
      description:
        "Se te revela el nombre de la celebridad anunciada esta edición y el mercadillo que la acoge: ese día, tus probabilidades de encontrar objetos raros o legendarios al rebuscar se duplican y el montón de rebusca crece un 50 %.",
    },
    "general.vision.3": {
      nom: "Influencia",
      description:
        "Una vez por edición de la Gaceta, puedes volver a tirar (reroll) el tiempo del día o el mercadillo de sociedad.",
    },
    ...Object.assign({}, ...CATEGORIES.map((cat) => paliersThematiques(cat))),
  },
};
