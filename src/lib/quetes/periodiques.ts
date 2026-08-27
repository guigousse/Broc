import { creerCourrierMission } from "@/lib/courrier";
import { EXPEDITEURS } from "@/data/expediteursCourrier";
import type { ObjetTemplate } from "@/data/objetTemplates";
import type { Courrier, GameState, MissionCible } from "@/types/game";
import { JETONS_HEBDO, JETONS_QUOTIDIENNE } from "@/lib/recompenses";
import { objetsAtteignables } from "./atteignables";
import { calculerRecompense } from "./recompense";
import { genererTexte, genererTexteChiffre } from "./textes";
import { FAMILLE, FORMES_HEBDOMADAIRES, contenuFormeChiffree, type FormeQuete } from "./formes";
import { formeEligible } from "./eligibilite";

export type TypePeriodique = "quotidienne" | "hebdomadaire";

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Génère UNE commande périodique en évitant les templateId déjà pris dans `pris`. */
function genererUne(
  state: GameState,
  type: TypePeriodique,
  id: string,
  pris: Set<string>,
  rng: () => number,
): Courrier | null {
  const pool = objetsAtteignables(state).filter((t) => !pris.has(t.templateId));
  if (pool.length === 0) return null;

  const commanditaires = Object.values(EXPEDITEURS).filter(
    (e) => e.id !== "maman" && e.id !== "grand-pere" && e.domaine,
  );
  const candidats = commanditaires.filter((e) => pool.some((t) => t.categorie === e.domaine));
  const exp = candidats.length > 0 ? pick(candidats, rng) : pick(commanditaires, rng);
  const poolDomaine = pool.filter((t) => t.categorie === exp.domaine);
  const poolCible = poolDomaine.length > 0 ? poolDomaine : pool;

  // Quotidienne = 1 cible ; hebdomadaire = 2-3 cibles (plus dure).
  const nbVoulu = type === "quotidienne" ? 1 : 2 + Math.floor(rng() * 2);
  const choisis: ObjetTemplate[] = [];
  const restant = [...poolCible];
  for (let i = 0; i < nbVoulu && restant.length > 0; i++) {
    choisis.push(restant.splice(Math.floor(rng() * restant.length), 1)[0]);
  }
  if (choisis.length === 0) return null;
  for (const t of choisis) pris.add(t.templateId);

  // Hebdo plus exigeante : état minimum « Très bon » avec proba.
  const etatMin = type === "hebdomadaire" && rng() < 0.5 ? ("Très bon" as const) : undefined;
  const cibles: MissionCible[] = choisis.map((t) => ({
    templateId: t.templateId,
    ...(etatMin ? { etatMin } : {}),
  }));
  const templates = new Map(choisis.map((t) => [t.templateId, t]));
  const jetons = type === "quotidienne" ? JETONS_QUOTIDIENNE : JETONS_HEBDO;
  const recompense = { argent: calculerRecompense(cibles, templates), jetons };
  const texte = genererTexte(exp.id, choisis.map((t) => t.nom), etatMin, rng);

  return {
    ...creerCourrierMission({
      id,
      jour: state.jourActuel,
      expediteurId: exp.id,
      titre: texte.titre,
      corps: texte.corps,
      categorie: type,
      cibles,
      recompense,
      gabaritId: texte.gabaritId,
      ...(etatMin ? { gabaritParams: { etatMin } } : {}),
    }),
    lu: true,
  };
}

/** Mélange une copie du tableau (Fisher-Yates sur `rng`). */
function melanger<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pool de tirage QUOTIDIEN. `objet` en est absent volontairement : la quête
 * d'objet nommé est ajoutée à part, en un exemplaire garanti. L'inclure ici
 * autoriserait deux ou trois quêtes d'objet le même jour — moins varié
 * qu'avant ce chantier, ce qui serait un comble.
 */
const POOL_QUOTIDIEN: FormeQuete[] = [
  "objetsRares",
  "objetLegendaire",
  "restauration",
  "beneficeCumule",
  "chiffreAffaires",
  "profitVente",
  "ventesCategorie",
];

/**
 * Formes composant un lot.
 *
 * Quotidienne : UNE quête d'objet nommé garantie (photo, commanditaire, négo —
 * l'identité du jeu) plus deux formes distinctes tirées dans le pool éligible,
 * le tout mélangé pour que l'objet garanti ne soit pas éternellement en tête.
 * Garde-fou : au plus une forme de famille « vente » parmi les deux tirées —
 * quatre des sept formes du pool en sont, et sans lui une journée sur trois
 * environ ne serait qu'une paire d'objectifs de caisse. MAIS ce garde-fou ne
 * s'active que si le pool éligible compte au moins DEUX formes hors famille
 * « vente » : en dessous, il n'y a plus de choix à garder, seulement une
 * ligne à imposer.
 *
 * Piège vérifié en revue (mesure : 500 graines sur partie neuve) : sur une
 * partie neuve, `objetLegendaire` et `restauration` sont verrouillées — le
 * pool hors-vente éligible se réduit à la seule `objetsRares`. Appliquer le
 * garde-fou sans condition forçait alors `objetsRares` dans TOUS les lots
 * (500/500) et ne laissait que 4 compositions distinctes possibles : très
 * exactement la ligne unique que ce chantier existe pour supprimer. Ne
 * resserre pas ce garde-fou à « au moins une forme hors-vente » sans relire
 * cette mesure — c'est la condition qui recrée le bug.
 *
 * Hebdomadaire : trois formes distinctes parmi les six, avec au moins une forme
 * de vente — sans ce garde-fou, une semaine pourrait n'être qu'une série de
 * quotidiennes en plus lent.
 */
function formesDuLot(
  state: GameState,
  type: TypePeriodique,
  rng: () => number,
): FormeQuete[] {
  if (type === "quotidienne") {
    const eligibles = POOL_QUOTIDIEN.filter((f) => formeEligible(f, state));
    const horsVenteEligibles = eligibles.filter((f) => FAMILLE[f] !== "vente");
    const gardeFouActif = horsVenteEligibles.length >= 2;

    const pool = melanger(eligibles, rng);
    const tirees: FormeQuete[] = [];
    for (const f of pool) {
      if (tirees.length === 2) break;
      if (
        gardeFouActif &&
        FAMILLE[f] === "vente" &&
        tirees.some((t) => FAMILLE[t] === "vente")
      ) {
        continue;
      }
      tirees.push(f);
    }
    return melanger(["objet", ...tirees], rng);
  }

  const choisies = melanger(FORMES_HEBDOMADAIRES, rng).slice(0, 3);
  if (choisies.some((f) => FAMILLE[f] === "vente")) return choisies;

  // Branche actuellement INATTEIGNABLE (et volontairement conservée) : sur
  // les 6 formes hebdomadaires, seules 2 ("objet", "objetsRares") sont de
  // famille "chine" ; 3 tirages distincts contiennent donc TOUJOURS au moins
  // une forme de vente. Elle reste correcte en garde-fou pour un futur
  // catalogue hebdomadaire plus large.
  const ventes = melanger(
    FORMES_HEBDOMADAIRES.filter((f) => FAMILLE[f] === "vente" && !choisies.includes(f)),
    rng,
  );
  return [choisies[0], choisies[1], ventes[0]];
}

/** Génère UNE quête chiffrée (sans objet nommé). `null` si inconstructible. */
function genererUneChiffree(
  state: GameState,
  forme: Exclude<FormeQuete, "objet">,
  type: TypePeriodique,
  id: string,
  rng: () => number,
): Courrier | null {
  // Le commanditaire donne le TON de la lettre : celui de la catégorie demandée
  // quand il y en a une, un marchand générique sinon.
  const commanditaires = Object.values(EXPEDITEURS).filter(
    (e) => e.id !== "maman" && e.id !== "grand-pere" && e.domaine,
  );
  const categoriesToutes = [...new Set(objetsAtteignables(state).map((t) => t.categorie))];
  // « vends X objets de catégorie Y » : ne pas demander une catégorie que
  // personne dans le carnet d'adresses n'incarne, sous peine d'une lettre
  // signée par un commanditaire au ton (et au portrait) sans rapport avec la
  // catégorie annoncée dans le corps. Repli sur la liste complète si aucune
  // catégorie atteignable n'a de commanditaire dédié (tout début de partie).
  const domainesCommanditaires = new Set(commanditaires.map((e) => e.domaine));
  const categoriesAvecCommanditaire = categoriesToutes.filter((c) =>
    domainesCommanditaires.has(c),
  );
  const categories =
    forme === "ventesCategorie" && categoriesAvecCommanditaire.length > 0
      ? categoriesAvecCommanditaire
      : categoriesToutes;
  const contenu = contenuFormeChiffree(
    forme,
    type,
    state.brocanteur.niveau,
    categories,
    rng,
  );
  if (!contenu) return null;

  const cat = contenu.gabaritParams.categorie;
  const exp =
    (cat ? commanditaires.find((e) => e.domaine === cat) : undefined) ??
    pick(commanditaires, rng);

  const texte = genererTexteChiffre(contenu.gabaritCle, contenu.gabaritParams, rng);

  const jetons =
    contenu.jetons ?? (type === "quotidienne" ? JETONS_QUOTIDIENNE : JETONS_HEBDO);

  return {
    ...creerCourrierMission({
      id,
      jour: state.jourActuel,
      expediteurId: exp.id,
      titre: texte.titre,
      corps: texte.corps,
      categorie: type,
      cibles: [],
      recompense: { argent: contenu.recompenseArgent, jetons },
      objectifs: contenu.objectifs,
      gabaritId: texte.gabaritId,
      gabaritParams: contenu.gabaritParams,
      ...(contenu.primeVariable ? { primeVariable: contenu.primeVariable } : {}),
    }),
    lu: true,
  };
}

/** Génère le lot de 3 commandes du type pour la période `cle`. IDs déterministes. */
export function genererLot(
  state: GameState,
  type: TypePeriodique,
  cle: string,
  rng: () => number = Math.random,
): Courrier[] {
  const prefixe = type === "quotidienne" ? "quo" : "heb";
  const pris = new Set<string>();
  const lot: Courrier[] = [];
  const formes = formesDuLot(state, type, rng);
  for (let i = 0; i < formes.length; i++) {
    const id = `${prefixe}_${cle}_${i}`;
    const forme = formes[i];
    const c =
      forme === "objet"
        ? genererUne(state, type, id, pris, rng)
        : genererUneChiffree(state, forme, type, id, rng);
    if (c) lot.push(c);
  }
  return lot;
}
