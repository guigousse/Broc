import { statsDuel } from "@/data/duel/cartesDuel";
import { actionAChoix, type Action, type Declencheur, type MotCleActif } from "@/data/duel/types";
import { MAIN_MAX, VITRINE_INITIALE, adverse, sousRuse, trouverObjet, type Cible, type EtatPartie } from "@/lib/duel/etat";
import { categorieDe, infligerDegats, piocher, retirerCasses } from "@/lib/duel/operations";

function actionsDe(id: string, declencheur: Declencheur): Action[] {
  const t = statsDuel(id).texte;
  if (!t) return [];
  if (t.type === "cri") {
    if (declencheur !== "pose") return [];
    if (t.variante === "pioche") return [{ type: "pioche", valeur: 1 }];
    if (t.variante === "degat") return [{ type: "degats", cible: "objetAdverse", valeur: 1 }];
    return [{ type: "soinVitrine", valeur: 2 }];
  }
  if (t.type === "effet") return t.declencheur === declencheur ? t.actions : [];
  return [];
}

export function cibleRequise(id: string): boolean {
  return actionsDe(id, "pose").some(actionAChoix);
}

/** Uids adverses qu'une action à choix du joueur `j` peut viser (hors Ruse). */
export function ciblesDeChoix(e: EtatPartie, j: 0 | 1): number[] {
  return e.joueurs[adverse(j)].etal.filter((o) => !sousRuse(e, o)).map((o) => o.uid);
}

/** Dégâts hors attaque : Solide s'applique, pas la roue ; déclenche `blesse`. Mute `e`. */
export function blesserObjet(e: EtatPartie, uid: number, n: number): void {
  const t = trouverObjet(e, uid);
  if (!t) return;
  const reel = infligerDegats(e, uid, n);
  if (reel > 0) declencher(e, t.joueur, uid, "blesse");
}

export function appliquerAction(e: EtatPartie, j: 0 | 1, uid: number, a: Action, cible?: Cible): void {
  const moi = e.joueurs[j];
  const lui = e.joueurs[adverse(j)];
  const cibleUid = cible?.type === "objet" && ciblesDeChoix(e, j).includes(cible.uid) ? cible.uid : null;
  switch (a.type) {
    case "degats":
      if (a.cible === "vitrineAdverse") lui.vitrine -= a.valeur;
      else if (a.cible === "tousObjetsAdverses") for (const o of [...lui.etal]) blesserObjet(e, o.uid, a.valeur);
      else if (cibleUid !== null) blesserObjet(e, cibleUid, a.valeur);
      break;
    case "soinVitrine":
      moi.vitrine = Math.min(VITRINE_INITIALE, moi.vitrine + a.valeur);
      break;
    case "pioche":
      piocher(e, j, a.valeur);
      break;
    case "energie":
      moi.energie += a.valeur;
      break;
    case "gain": {
      const cibles = a.cible === "soi"
        ? moi.etal.filter((o) => o.uid === uid)
        : a.cible === "allies" ? moi.etal : moi.etal.filter((o) => categorieDe(o.id) === a.categorie);
      for (const o of cibles) { if (a.stat === "attaque") o.attaque += a.valeur; else o.pv += a.valeur; }
      break;
    }
    case "retourEnMain":
      if (cibleUid !== null) {
        const o = lui.etal.find((x) => x.uid === cibleUid)!;
        lui.etal = lui.etal.filter((x) => x.uid !== cibleUid);
        if (lui.main.length >= MAIN_MAX) lui.casse.push(o.id); else lui.main.push(o.id);
      }
      break;
    case "volMotCle":
      if (cibleUid !== null) {
        const o = lui.etal.find((x) => x.uid === cibleUid)!;
        const vole: MotCleActif | undefined = o.motsCles.shift();
        const soi = moi.etal.find((x) => x.uid === uid);
        if (vole && soi && !soi.motsCles.includes(vole)) soi.motsCles.push(vole);
      }
      break;
  }
}

/**
 * Déclenche les actions de l'objet `uid` (propriétaire `j`) pour `declencheur`. Ne nettoie PAS
 * les casses (spec §3.3 « simultanément ») : c'est à l'appelant public (poser/attaquer/
 * commencerTour/finirTour) d'appeler `nettoyerCasse` une seule fois, après sa séquence
 * d'actions complète. Mute `e`.
 */
export function declencher(e: EtatPartie, j: 0 | 1, uid: number, declencheur: Declencheur, cible?: Cible): void {
  const t = trouverObjet(e, uid);
  if (!t) return;
  for (const a of actionsDe(t.objet.id, declencheur)) appliquerAction(e, j, uid, a, cible);
}

/** Retire les objets à 0 PV et déclenche leurs effets `casse`, jusqu'à stabilité. Mute `e`. */
export function nettoyerCasse(e: EtatPartie): void {
  for (let garde = 0; garde < 20; garde++) {
    const casses = retirerCasses(e);
    if (casses.length === 0) return;
    for (const c of casses) for (const a of actionsDe(c.objet.id, "casse")) appliquerAction(e, c.joueur, c.objet.uid, a);
  }
}
