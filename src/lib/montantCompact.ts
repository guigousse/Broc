import type { Locale } from "@/lib/i18n/locales";

/**
 * Paliers d'abréviation, du plus grand au premier atteint. Les lettres sont
 * en minuscules : dans le header, elles suivent un chiffre en police
 * d'affichage, et une capitale y ferait une seconde hampe qui se lit comme un
 * caractère de plus.
 */
const PALIERS = [
  { seuil: 1_000_000, diviseur: 1_000_000, suffixe: "m" },
  { seuil: 1_000, diviseur: 1_000, suffixe: "k" },
] as const;

/**
 * Écrit un montant sous sa forme courte : `10 610` devient `10,6k`.
 *
 * Le header porte trois blocs sur une seule ligne — niveau, énergie, caisse —
 * et la caisse est le seul dont la largeur suit la fortune du joueur. Passé
 * quelques milliers d'euros, elle poussait les deux autres et décentrait le
 * niveau. La forme courte lui donne une largeur bornée.
 *
 * Deux choix qui se voient :
 *
 * - **On tronque, on n'arrondit pas.** Une caisse ne doit jamais annoncer plus
 *   qu'elle ne contient : `10 690 €` affichés « 10,7k » promettraient dix
 *   euros qui n'existent pas. Corollaire utile, `999 999` reste `999,9k` et ne
 *   saute pas au million par arrondi.
 * - **Le séparateur suit la langue**, comme tous les autres montants du jeu :
 *   `10,6k` en français, `10.6k` en anglais.
 *
 * La décimale disparaît quand elle est nulle (`2 000` → `2k`) : c'est un
 * maximum d'une décimale, pas une décimale obligatoire.
 *
 * Le montant exact reste dû au lecteur d'écran — cette forme est une
 * commodité pour l'œil, pas la valeur elle-même.
 */
export function formaterMontantCompact(n: number, locale: Locale): string {
  const signe = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const palier = PALIERS.find((p) => abs >= p.seuil);
  if (!palier) return signe + abs.toLocaleString(locale);

  // Le dixième se prend sur l'entier (× 10 avant la division) : passer par le
  // quotient flottant ferait tomber 128 450 / 1000 sur 128,450000000000002,
  // et un floor sur cette valeur n'est plus prévisible.
  const tronque = Math.floor((abs * 10) / palier.diviseur) / 10;
  return (
    signe +
    tronque.toLocaleString(locale, { maximumFractionDigits: 1 }) +
    palier.suffixe
  );
}
