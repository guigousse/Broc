import type { CleMessageNego } from "@/types/game";

/**
 * Overlay ES des répliques de négociation (spec i18n §2, SP4). Même forme que
 * `POOLS_NEGO_FR` : une liste de variantes par clé. Reformulation (pas de
 * mot-à-mot) qui garde l'esprit marchand gouailleur, en espagnol d'Espagne
 * avec tutoiement (« tú »). Placeholders identiques au FR par clé (`{prix}`,
 * `{cibleSecrete}`) — le test `nego.test.ts` l'impose ; le nombre de variantes
 * peut différer (modulo au rendu). Résolu À L'AFFICHAGE via `texteNego()`.
 */
export const NEGO_ES: Record<CleMessageNego, string[]> = {
  ouvertureAchat: ["Desliza el cursor para proponer un precio."],
  ouvertureVente: ["El cliente te ha hecho una oferta. Te toca."],
  contreVendeur: [
    "« Venga, te hago un pequeño gesto, {prix} €… »",
    "« Mmm. Digamos {prix} €. »",
    "« {prix} € y no se hable más. »",
    "« Puedo bajar a {prix} €, es mi mejor precio. »",
  ],
  contreClient: [
    "« Puedo subir un poco: {prix} €. »",
    "« {prix} €, y es una oferta honesta. »",
    "« Venga, {prix} € si me lo envuelves. »",
  ],
  refusPoliVendeur: [
    "« Bueno, lo recojo. Una lástima, eso sí. »",
    "« Qué le vamos a hacer, otra vez será. »",
  ],
  refusPoliClient: [
    "« Nada, me voy a mirar a otro sitio. »",
    "« Paso, gracias. »",
  ],
  fache: [
    "« ¿Te estás quedando conmigo? »",
    "« Estás abusando de mi paciencia. »",
  ],
  accord: [
    "Trato hecho por {prix} €.",
    "Vendido por {prix} €.",
  ],
  relance: ["« Bueno… venga, te escucho una última vez. »"],
  diplomate: [
    "« Mi tope es {cibleSecrete} €. Una última vez, te escucho. »",
  ],
  bonimentConclu: ["« ¡Trato hecho! Se te da bien esto… »"],
  bonimentDernierMot: ["« Esta es mi última palabra: lo tomas o lo dejas. »"],
  lotGarni: ["« Mmm, ¿los dos juntos? Hazme un precio… »"],
};
