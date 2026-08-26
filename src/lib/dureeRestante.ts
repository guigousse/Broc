/**
 * LE FORMAT D'UNE ATTENTE.
 *
 * Une seule règle, deux présentations : le carnet de quêtes compte en heures
 * (« 97 h 28 » avant le renouvellement hebdomadaire), l'ardoise du Bazar en
 * jours (« 4 j 01 h ») — sur une ardoise posée dans un décor, quatre jours ne
 * se lisent pas en heures.
 *
 * La précision MONTE à mesure que l'échéance approche : jours et heures, puis
 * heures et minutes sous la journée, puis minutes seules dans la dernière
 * heure. C'est ce qu'on attend d'un compte à rebours — savoir « dans trois
 * jours » suffit de loin, « dans 12 minutes » se compte de près.
 */
export function formatRestant(ms: number, options: { jours?: boolean } = {}): string {
  // La minute ENTAMÉE compte : à 30 secondes de l'échéance il reste « 1 min »,
  // pas « 0 min ». Un compte à rebours qui affiche zéro pendant une minute
  // entière a l'air arrêté.
  const min = Math.max(0, Math.ceil(ms / 60_000));

  if (options.jours && min >= 24 * 60) {
    const j = Math.floor(min / (24 * 60));
    const h = Math.floor((min % (24 * 60)) / 60);
    return h === 0 ? `${j} j` : `${j} j ${String(h).padStart(2, "0")} h`;
  }

  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
  }

  return `${min} min`;
}

/** Une attente découpée : combien, et de quoi. */
export interface RestantDecoupe {
  unite: "jours" | "heures" | "minutes";
  n: number;
}

/**
 * LA MÊME ATTENTE, prête à être dite en toutes lettres.
 *
 * Le tenancier du Bazar ne lit pas « 4 j » à voix haute, il dit « 4 jours ».
 * Cette fonction reste PURE — elle rend l'unité et le nombre — et c'est la
 * couche d'affichage qui va chercher le mot dans la langue du joueur, avec son
 * singulier.
 *
 * L'unité ne monte jamais d'un cran par arrondi : à 23 h 59 il reste
 * « 23 heures », pas « 1 jour ». Promettre une journée entière quand la
 * marchandise arrive dans l'heure qui suit minuit est le genre de mensonge qui
 * se remarque.
 */
export function decouperRestant(ms: number): RestantDecoupe {
  const min = Math.max(0, Math.ceil(ms / 60_000));
  if (min >= 24 * 60) return { unite: "jours", n: Math.floor(min / (24 * 60)) };
  if (min >= 60) return { unite: "heures", n: Math.floor(min / 60) };
  return { unite: "minutes", n: min };
}
