/**
 * Difficulté des quêtes périodiques chiffrées, par paliers de niveau.
 *
 * SOURCE UNIQUE : cibles ET récompenses sortent d'ici. Aucun coefficient
 * ailleurs. Du premier au dernier palier : ×6 — la croissance économique
 * réelle du jeu (marchandise accessible ×2,8, chargement ×1,75, marges des
 * compétences). Voir l'annexe B de la spec pour les mesures.
 *
 * La cible est lue UNE FOIS, à la naissance de la quête, et figée dans
 * l'objectif : un joueur qui prend un niveau en milieu de semaine ne voit pas
 * son objectif se durcir sous ses pieds.
 */
export interface CiblesNiveau {
  /** « Réalise X € de bénéfice » (hebdomadaire). */
  beneficeSemaine: number;
  /** « Réalise X € de chiffre d'affaires » (hebdomadaire). */
  chiffreAffairesSemaine: number;
  /** « Fais X € de marge sur une seule vente » (hebdomadaire). */
  profitVenteUnique: number;
  /** « Vends X objets de catégorie Y » (hebdomadaire). */
  ventesCategorie: number;
  /** « Trouve X objets rares » — version quotidienne. */
  objetsRaresQuotidien: number;
  /** « Trouve X objets rares » — version hebdomadaire, plus exigeante. */
  objetsRaresHebdo: number;
  /** Récompense en € d'une hebdomadaire SANS objet nommé. */
  recompenseHebdo: number;
  /** Récompense en € d'une quotidienne SANS objet nommé. */
  recompenseQuotidienne: number;
}

/** Paliers, du plus bas au plus haut. Le premier couvre tout niveau < 10. */
const PALIERS: { niveauMin: number; cibles: CiblesNiveau }[] = [
  {
    niveauMin: 0,
    cibles: { beneficeSemaine: 300, chiffreAffairesSemaine: 600, profitVenteUnique: 60, ventesCategorie: 3, objetsRaresQuotidien: 2, objetsRaresHebdo: 4, recompenseHebdo: 75, recompenseQuotidienne: 25 },
  },
  {
    niveauMin: 10,
    cibles: { beneficeSemaine: 500, chiffreAffairesSemaine: 1000, profitVenteUnique: 100, ventesCategorie: 4, objetsRaresQuotidien: 2, objetsRaresHebdo: 5, recompenseHebdo: 125, recompenseQuotidienne: 40 },
  },
  {
    niveauMin: 20,
    cibles: { beneficeSemaine: 850, chiffreAffairesSemaine: 1700, profitVenteUnique: 170, ventesCategorie: 5, objetsRaresQuotidien: 3, objetsRaresHebdo: 6, recompenseHebdo: 210, recompenseQuotidienne: 70 },
  },
  {
    niveauMin: 40,
    cibles: { beneficeSemaine: 1300, chiffreAffairesSemaine: 2600, profitVenteUnique: 260, ventesCategorie: 6, objetsRaresQuotidien: 3, objetsRaresHebdo: 7, recompenseHebdo: 325, recompenseQuotidienne: 110 },
  },
  {
    niveauMin: 70,
    cibles: { beneficeSemaine: 1800, chiffreAffairesSemaine: 3600, profitVenteUnique: 360, ventesCategorie: 8, objetsRaresQuotidien: 4, objetsRaresHebdo: 9, recompenseHebdo: 450, recompenseQuotidienne: 150 },
  },
];

/** Cibles applicables à un niveau de Brocanteur. Jamais `undefined`. */
export function ciblesPourNiveau(niveau: number): CiblesNiveau {
  let out = PALIERS[0].cibles;
  for (const p of PALIERS) if (niveau >= p.niveauMin) out = p.cibles;
  // Retourner une copie pour que les appelants ne puissent pas muter la table
  // et casser la promesse que les cibles sont « figées dans l'objectif ».
  return { ...out };
}
