import { creerCourrierMission } from "@/lib/courrier";
import { EXPEDITEURS } from "@/data/expediteursCourrier";
import type { ObjetTemplate } from "@/data/objetTemplates";
import type { Courrier, GameState, MissionCible } from "@/types/game";
import { objetsAtteignables } from "./atteignables";
import { calculerRecompense } from "./recompense";
import { genererTexte, genererTexteChiffre } from "./textes";
import { FAMILLE, FORMES_HEBDOMADAIRES, contenuFormeChiffree, type FormeQuete } from "./formes";

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
  const recompense = { argent: calculerRecompense(cibles, templates) };
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
 * Formes composant un lot.
 *
 * Quotidienne : la journée reste tournée vers la chine, faisable en une session.
 * Hebdomadaire : trois formes distinctes parmi les six, avec au moins une forme
 * de vente — sans ce garde-fou, une semaine pourrait n'être qu'une série de
 * quotidiennes en plus lent.
 */
function formesDuLot(type: TypePeriodique, rng: () => number): FormeQuete[] {
  if (type === "quotidienne") return ["objet", "objet", "objetsRares"];

  const choisies = melanger(FORMES_HEBDOMADAIRES, rng).slice(0, 3);
  if (choisies.some((f) => FAMILLE[f] === "vente")) return choisies;

  // Aucune vente tirée : on remplace la dernière par une forme de vente.
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
  const categories = [...new Set(objetsAtteignables(state).map((t) => t.categorie))];
  const contenu = contenuFormeChiffree(
    forme,
    type,
    state.brocanteur.niveau,
    categories,
    rng,
  );
  if (!contenu) return null;

  // Le commanditaire donne le TON de la lettre : celui de la catégorie demandée
  // quand il y en a une, un marchand générique sinon.
  const commanditaires = Object.values(EXPEDITEURS).filter(
    (e) => e.id !== "maman" && e.id !== "grand-pere" && e.domaine,
  );
  const cat = contenu.gabaritParams.categorie;
  const exp =
    (cat ? commanditaires.find((e) => e.domaine === cat) : undefined) ??
    pick(commanditaires, rng);

  const texte = genererTexteChiffre(contenu.gabaritCle, contenu.gabaritParams, rng);

  return {
    ...creerCourrierMission({
      id,
      jour: state.jourActuel,
      expediteurId: exp.id,
      titre: texte.titre,
      corps: texte.corps,
      categorie: type,
      cibles: [],
      recompense: { argent: contenu.recompenseArgent },
      objectifs: contenu.objectifs,
      gabaritId: texte.gabaritId,
      gabaritParams: contenu.gabaritParams,
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
  const formes = formesDuLot(type, rng);
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
