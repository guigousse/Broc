import type { CategorieObjet, GameState, Session } from "@/types/game";

/**
 * Plafond du journal de sessions persisté. Sans cap, `historique` grossit à
 * chaque session : la save enfle (stringify complet à chaque auto-save) et le
 * quota localStorage (~10 Mo WKWebView) finit par claquer. Les consommateurs
 * qui ont besoin d'un cumul complet (conditions `ventesCategorie`) lisent le
 * compteur `ventesParCategorie`, pas l'historique.
 */
export const MAX_HISTORIQUE = 100;

/** Incrémente le compteur cumulatif de ventes par catégorie pour une session. */
export function cumulerVentes(
  compteur: GameState["ventesParCategorie"],
  session: Session,
): GameState["ventesParCategorie"] {
  if (session.type !== "vente" || session.ventes.length === 0) return compteur;
  const next: Partial<Record<CategorieObjet, number>> = { ...compteur };
  for (const v of session.ventes) {
    next[v.categorie] = (next[v.categorie] ?? 0) + 1;
  }
  return next;
}

/**
 * Ajoute une session en tête d'historique (plafonné) et met à jour le
 * compteur cumulatif de ventes. Fonction pure.
 */
export function ajouterSession(state: GameState, session: Session): GameState {
  return {
    ...state,
    historique: [session, ...state.historique].slice(0, MAX_HISTORIQUE),
    ventesParCategorie: cumulerVentes(state.ventesParCategorie, session),
  };
}

/**
 * Reconstruit le compteur cumulatif depuis un historique complet — utilisé
 * une seule fois, à la migration v17, AVANT le premier cap de l'historique.
 */
export function compterVentesParCategorie(
  historique: readonly Session[],
): Partial<Record<CategorieObjet, number>> {
  const agg: Partial<Record<CategorieObjet, number>> = {};
  for (const s of historique) {
    if (s.type !== "vente") continue;
    for (const v of s.ventes) {
      agg[v.categorie] = (agg[v.categorie] ?? 0) + 1;
    }
  }
  return agg;
}
