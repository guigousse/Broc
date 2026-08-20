"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { estRoutePartie } from "@/lib/routesPartie";
import { getAnalytics, EVENEMENTS } from "@/lib/analytics/analytics";
import { FirebaseAnalyticsProvider } from "@/lib/analytics/firebaseProvider";
import { definirLecteurContexte, logEvenement } from "@/lib/analytics/contexte";
import { nomEcran } from "@/lib/analytics/ecrans";

/**
 * Trois effets, montés une fois dans le layout racine :
 *   1. démarrage du SDK natif (Tauri iOS uniquement) ;
 *   2. publication du contexte de jeu (jour, niveau) vers la lib analytics ;
 *   3. `screen_view` à chaque changement de route.
 * Rend rien ; toute erreur est avalée (une panne de mesure ne casse pas le jeu).
 */
export function FirebaseBootstrap() {
  const { state, isHydrated } = useGame();
  const pathname = usePathname();

  // Le lecteur de contexte est appelé de façon synchrone au moment du log :
  // il doit voir l'état COURANT, pas celui figé à la création du lecteur.
  // D'où la ref, réassignée à chaque rendu.
  const etatRef = useRef({ jour: 0, niveau: 0, enPartie: false });
  etatRef.current = {
    jour: state?.jourActuel ?? 0,
    niveau: state?.brocanteur?.niveau ?? 0,
    // La route seule ne suffit pas : tant que le chargement async de la save
    // n'a pas résolu (`isHydrated` faux), `state` est encore `null` alors que
    // `pathname` peut déjà pointer sur une route de jeu — sans `state != null`
    // ici, cette fenêtre fabriquait un jour 0 pour un joueur qui peut être au
    // jour 80 (revue task 5, finding 1).
    // `/bazar` est un écran de jeu absent de ROUTES_PARTIE (cette liste pilote
    // le chrome global, on n'y touche pas) — Bazar pas encore fusionné sur
    // cette branche, mais le complément reste correct le jour où il l'est.
    enPartie: isHydrated && state != null && (estRoutePartie(pathname) || pathname === "/bazar"),
  };

  useEffect(() => {
    const provider = getAnalytics();
    if (provider instanceof FirebaseAnalyticsProvider) {
      provider.initialiser().catch(() => {});
    }
  }, []);

  useEffect(() => {
    definirLecteurContexte(() => {
      const { jour, niveau, enPartie } = etatRef.current;
      // Hors partie, la save du slot actif reste chargée en mémoire : envoyer
      // son jour donnerait des chiffres d'une partie qu'on ne joue pas.
      return enPartie ? { jour, niveau } : null;
    });
    return () => definirLecteurContexte(null);
  }, []);

  useEffect(() => {
    // Ce premier `screen_view` d'un boot à froid part avant que la save soit
    // hydratée (l'effet de contexte ci-dessus tourne au même commit, `state`
    // encore `null`) : il part donc sans `jour` ni `niveau`. C'est le
    // compromis voulu — un contexte absent plutôt qu'un jour 0 fabriqué pour
    // un joueur qui peut être bien plus loin (voir le commentaire d'`enPartie`
    // ci-dessus) — pas un bug à corriger.
    const nom = nomEcran(pathname);
    if (nom) logEvenement(EVENEMENTS.ecranVu, { screen_name: nom });
  }, [pathname]);

  return null;
}
