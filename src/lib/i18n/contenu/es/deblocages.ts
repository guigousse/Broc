/**
 * Overlay ES des déblocages de niveau (spec i18n §2, SP3). Clé = titre FR canonique
 * de `src/data/deblocagesNiveau.ts` (pas d'id en data). Résolu À L'AFFICHAGE, fallback FR.
 * Les emojis des actives sont conservés à l'identique.
 */
export const DEBLOCAGES_ES: Record<string, string> = {
  "Ouverture de l'écran Compétences (+1 point)": "Pantalla de Habilidades desbloqueada (+1 punto)",
  "Quêtes quotidiennes et hebdomadaires": "Misiones diarias y semanales",
  "Atout 🔍 Le Flair": "Baza 🔍 El Olfato",
  "Atout 🧺 Le Lot garni": "Baza 🧺 El Lote",
  "Atout 🧹 La Fouille": "Baza 🧹 El Rebusco",
  "Paliers 2 des compétences": "Rango 2 de las habilidades",
  "Paliers 3 des compétences": "Rango 3 de las habilidades",
  "Atout 🎩 Le Boniment": "Baza 🎩 El Camelo",
  "Atout 💬 La Tchatche": "Baza 💬 La Cháchara",
  "Atout 📣 La Criée": "Baza 📣 El Pregón",
  "Atout 🔍 Le Flair — 2ᵉ usage par jour": "Baza 🔍 El Olfato — 2.º uso al día",
  "Atout 🔍 Le Flair — 3ᵉ usage par jour": "Baza 🔍 El Olfato — 3.er uso al día",
  "Atout 🧺 Le Lot garni — 2ᵉ usage par jour": "Baza 🧺 El Lote — 2.º uso al día",
  "Atout 🧺 Le Lot garni — 3ᵉ usage par jour": "Baza 🧺 El Lote — 3.er uso al día",
  "Atout 🧹 La Fouille — 2ᵉ usage par jour": "Baza 🧹 El Rebusco — 2.º uso al día",
  "Atout 🧹 La Fouille — 3ᵉ usage par jour": "Baza 🧹 El Rebusco — 3.er uso al día",
  "Atout 🎩 Le Boniment — 2ᵉ usage par jour": "Baza 🎩 El Camelo — 2.º uso al día",
  "Atout 🎩 Le Boniment — 3ᵉ usage par jour": "Baza 🎩 El Camelo — 3.er uso al día",
  "Atout 💬 La Tchatche — 2ᵉ usage par jour": "Baza 💬 La Cháchara — 2.º uso al día",
  "Atout 💬 La Tchatche — 3ᵉ usage par jour": "Baza 💬 La Cháchara — 3.er uso al día",
  "Atout 📣 La Criée — 2ᵉ usage par jour": "Baza 📣 El Pregón — 2.º uso al día",
  "Atout 📣 La Criée — 3ᵉ usage par jour": "Baza 📣 El Pregón — 3.er uso al día",
};

export const DEBLOCAGES_DESC_ES: Record<string, string> = {
  "Ouverture de l'écran Compétences (+1 point)":
    "La biblioteca abre la pantalla de Habilidades: gasta tus puntos (1 por nivel) para afinar el oficio.",
  "Quêtes quotidiennes et hebdomadaires":
    "El correo trae encargos: uno diario y otro semanal más ambicioso, recompensados con dinero.",
  "Paliers 2 des compétences": "El rango 2 de todas las ramas de habilidades pasa a estar disponible.",
  "Paliers 3 des compétences": "El rango 3 — la cima de cada rama — pasa a estar disponible.",
  "Atout 🔍 Le Flair":
    "En la rebusca: revela el valor real de todos los objetos del puesto durante el resto de la visita. Un uso al día.",
  "Atout 🧺 Le Lot garni":
    "En plena negociación en tu puesto: añade un segundo objeto al lote del cliente, el precio se renegocia en bloque. Un uso al día.",
  "Atout 🧹 La Fouille":
    "En la rebusca: el vendedor sustituye el objeto elegido por una nueva pieza. Un uso al día.",
  "Atout 🎩 Le Boniment":
    "Al vender: fuerza el cierre — si tu precio es razonable el cliente lo acepta al momento; si no, revela su presupuesto exacto sin enfadarse. Un uso al día.",
  "Atout 💬 La Tchatche":
    "En la rebusca: reabre una negociación recién fracasada, el vendedor se calma. Un uso al día.",
  "Atout 📣 La Criée":
    "En el puesto: atrae a la multitud — tres clientes llegan seguidos. Un uso al día.",
};
const DESC_USAGE_2_ES = "La baza puede usarse ahora dos veces al día.";
const DESC_USAGE_3_ES = "La baza puede usarse ahora tres veces al día.";
for (const t of ["Atout 🔍 Le Flair", "Atout 🧺 Le Lot garni", "Atout 🧹 La Fouille", "Atout 🎩 Le Boniment", "Atout 💬 La Tchatche", "Atout 📣 La Criée"]) {
  DEBLOCAGES_DESC_ES[`${t} — 2ᵉ usage par jour`] = DESC_USAGE_2_ES;
  DEBLOCAGES_DESC_ES[`${t} — 3ᵉ usage par jour`] = DESC_USAGE_3_ES;
}
