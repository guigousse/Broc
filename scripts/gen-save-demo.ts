/**
 * Génère une sauvegarde de DÉMO pour les captures App Store : partie avancée
 * (niveau 75, ~1/4 de la collection remplie, stand garni, ateliers au max).
 *
 * Sortie : un JSON prêt à écrire dans localStorage sous la clé du slot 1
 * (`projet-broc:slot:1:v1`). N'écrit rien lui-même — imprime le JSON sur stdout.
 *
 *   npx tsx scripts/gen-save-demo.ts > scripts/save-demo.json
 *
 * Utilise les VRAIES fonctions/données du jeu (pas de JSON à la main) : la save
 * reste valide vis-à-vis de la version courante et des migrations.
 *
 * Variable d'environnement APPSTORE_SEED (optionnelle) : si définie, fige
 * Math.random (mulberry32) pour que tendances/météo/célébrité du jour soient
 * reproductibles — utilisé par le pipeline des visuels App Store
 * (generate-appstore-shots.mjs). Si absente (cas historique, notamment
 * scripts/seed-demo-sim.sh), le comportement reste inchangé : tirage aléatoire
 * réel à chaque exécution.
 */
import type {
  CategorieObjet,
  CollectionSlot,
  EtatObjet,
  GameState,
  MissionResolution,
  Objet,
  ObjetEnVitrine,
} from "@/types/game";
import { INITIAL_JOUR } from "@/types/game";
import { SAVE_VERSION } from "@/lib/migrations";
import { ENERGIE_MAX } from "@/lib/energie";
import { initCollection } from "@/lib/collection";
import { genererTendances } from "@/lib/tendances";
import { prochainLundi } from "@/lib/calendrier";
import { tirerMeteoSemaine } from "@/lib/meteo";
import { tirerCelebrite } from "@/lib/celebrite";
import { emptyPiecesAmelioration } from "@/data/categories";
import { xpRequisPourNiveauBrocanteur } from "@/lib/xp";
import { OBJET_TEMPLATES, LEGENDAIRES } from "@/data/objetTemplates";
import { UNIQUES } from "@/data/uniques";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";
import { competencesParTree, TREE_GENERAL } from "@/data/competences";
import { mulberry32 } from "./appstore/mulberry32.mjs";

// --- Graine du RNG (reproductibilité inter-exécutions, optionnelle) -----
// Ce script tourne dans un process Node séparé du navigateur Playwright :
// l'injection de scriptGraine() (amorce.mjs) ne le couvre pas. Or
// genererTendances()/tirerMeteoSemaine()/tirerCelebrite() ci-dessous
// utilisent Math.random. scripts/generate-appstore-shots.mjs fixe
// APPSTORE_SEED avant d'invoquer ce script, pour que la save de démo soit
// reproductible d'une exécution à l'autre (tendances de prix, célébrité du
// jour). SANS cette variable — c'est le cas de scripts/seed-demo-sim.sh, un
// usage préexistant et partagé — Math.random n'est PAS touché : le
// comportement historique (tirage aléatoire réel à chaque exécution) est
// préservé à l'identique.
if (process.env.APPSTORE_SEED !== undefined) {
  Math.random = mulberry32(Number(process.env.APPSTORE_SEED));
}

const NIVEAU_CIBLE = 75;
// Horodatage figé (le script tourne hors app ; on ne veut pas Date.now()
// non-déterministe dans une save de démo). ~milieu de partie plausible.
const NOW = Date.parse("2026-07-20T10:00:00Z");

// XP juste au-dessus du seuil du niveau 75 (barre entamée, pas pleine).
const seuil75 = xpRequisPourNiveauBrocanteur(NIVEAU_CIBLE);
const seuil76 = xpRequisPourNiveauBrocanteur(NIVEAU_CIBLE + 1);
const xp = seuil75 + Math.round((seuil76 - seuil75) * 0.35);

// --- Pool de templates + helpers (avant tout usage) --------------------
const POOL = [...OBJET_TEMPLATES, ...LEGENDAIRES, ...UNIQUES];
function tmpl(id: string) {
  const t = POOL.find((x) => x.templateId === id);
  if (!t) throw new Error(`template introuvable : ${id}`);
  return t;
}
function valeurRef(id: string): number {
  return tmpl(id).prixRefBase;
}
function objetDe(id: string, etat: EtatObjet, idx: number): Objet {
  const t = tmpl(id);
  return {
    id: `demo-${idx}`,
    templateId: t.templateId,
    nom: t.nom,
    categorie: t.categorie,
    prixReferenceReel: t.prixRefBase,
    etat,
    rarete: t.rarete,
    prixAchat: Math.round(t.prixRefBase * 0.4),
  };
}

// --- Collection : remplir ~1/4 par catégorie ---------------------------
// Les 1ers slots (triés commun→rare→légendaire) deviennent « donnés » (sticker
// couleur + étoiles) ; une frange suivante reste « vue » (grisée) pour un
// dégradé de progression réaliste. Le reste : silhouette.
// Templates forcés à « vu » : la pastille « Nouveau » du chinage déborde de
// l'écran quand le nom tient sur deux lignes (cf. visuels App Store).
const DEJA_VUS = new Set(["leg.lv.gutenberg_feuillet"]);
// Vinyles forcés dans la collection : le gramophone du bureau ne joue que les
// disques POSSÉDÉS (donation non nulle). Sans eux la discothèque n'affiche
// que trois pochettes, ce qui vend mal les 24 morceaux originaux du jeu.
const DONS_FORCES = new Set([
  "mus.vinyle_des_loups_des_steppes_bark_to_be_free",
  "mus.vinyle_free_robot_des_punkbot",
  "mus.vinyle_collector_de_vagabond_horizon_celeste",
  "mus.vinyle_de_la_rousse_mystique_ainsi_soit_elle",
]);
const ETATS_DEMO: EtatObjet[] = ["Bon", "Très bon", "Pristin état"];
const collection = initCollection();
for (const cat of Object.keys(collection) as CategorieObjet[]) {
  const slots = collection[cat];
  const nDonnes = Math.round(slots.length * 0.25);
  const nVus = Math.round(slots.length * 0.12); // frange grisée en plus
  collection[cat] = slots.map((s, i): CollectionSlot => {
    if (i < nDonnes || DONS_FORCES.has(s.templateId)) {
      const etat = ETATS_DEMO[i % ETATS_DEMO.length];
      const valeurBase = valeurRef(s.templateId);
      const prime = etat === "Pristin état" ? 1.6 : etat === "Très bon" ? 1.3 : 1;
      return {
        ...s,
        vu: true,
        dejaPossede: true,
        vuDansCollection: true,
        donation: { etat, valeur: Math.round(valeurBase * prime), valeurBase },
      };
    }
    if (i < nDonnes + nVus || DEJA_VUS.has(s.templateId)) {
      return { ...s, vu: true, dejaPossede: true, vuDansCollection: true };
    }
    return s;
  });
}

// --- Stand (vitrine) + inventaire : quelques objets pour les captures ---
// 6 objets variés pour le stand (ids réels pris dans le pool, communs+rares).
const idsStand = POOL.filter((t) => t.rarete !== "legendaire")
  .slice(0, 6)
  .map((t) => t.templateId);
const vitrineObjets: ObjetEnVitrine[] = idsStand.map((id, i) => {
  const etat: EtatObjet = i % 2 === 0 ? "Très bon" : "Bon";
  const o = objetDe(id, etat, i);
  return {
    objet: { ...o, prixVenteSouhaite: Math.round(o.prixReferenceReel * 1.1) },
    prixVente: Math.round(o.prixReferenceReel * 1.1),
    posX: 0.2 + (i % 3) * 0.3,
    posY: 0.3 + Math.floor(i / 3) * 0.35,
    rotation: (i * 37) % 20 - 10,
  };
});
// 4 objets en stock (inventaire).
const inventaire: Objet[] = POOL.slice(10, 14).map((t, i) =>
  objetDe(t.templateId, "Bon", 100 + i),
);

// --- Trame principale : les 12 chapitres livrés -------------------------
// Un niveau 75 a forcément terminé le fil rouge. Nécessaire notamment pour
// débloquer marche-saint-ouen (tier 2), dont la condition exige le chapitre 4.
const missions: MissionResolution[] = QUETES_PRINCIPALES.map((ch, i) => ({
  courrierId: ch.id,
  statut: "livree",
  jourResolution: 5 + i * 6,
}));

// --- Compétences : l'arbre général en entier ------------------------------
// Un niveau 75 sans aucune compétence est incohérent, et prive la démo de
// mécaniques visibles — « Lecteur d'âmes » (general.presentation.1) est ce qui
// révèle le nom et l'ambiance de l'acheteur : sans lui, l'étal n'affiche que
// « Un inconnu » et une silhouette noire.
const competencesDebloquees = competencesParTree(TREE_GENERAL).map((c) => c.id);

const brocanteId = "marche-saint-ouen";
const state: GameState = {
  version: SAVE_VERSION,
  budget: 8420,
  jourActuel: 96,
  inventaireJoueur: inventaire,
  colisTutorielLivres: 0,
  vitrine: { brocanteId, objets: vitrineObjets },
  historique: [],
  ventesParCategorie: {},
  tendances: genererTendances(),
  prochainesTendances: genererTendances(),
  prochainRafraichissementTendances: prochainLundi(INITIAL_JOUR + 1),
  competencesDebloquees,
  brocanteur: { xp, niveau: NIVEAU_CIBLE, pointsDisponibles: 0 },
  collection,
  gazetteAchetee: true,
  tutoGazette: "faite",
  gazetteRefusee: false,
  bossDebloqueSeen: true,
  niveauVu: NIVEAU_CIBLE,
  meteoSemaine: tirerMeteoSemaine(),
  celebriteActuelle: tirerCelebrite(),
  influenceUtilisee: false,
  courriers: [],
  niveauAtelier: 3,
  niveauStockage: 3,
  niveauCamion: 3,
  piecesAmelioration: emptyPiecesAmelioration(),
  chatSurFauteuil: true,
  passagesSansChat: 0,
  declencheursDeclenches: [],
  grandLivre: [],
  missions,
  quetesPeriodiques: {
    quotidien: { cle: "", courrierIds: [] },
    hebdo: { cle: "", courrierIds: [] },
  },
  energie: ENERGIE_MAX,
  energieDerniereMaj: NOW,
  tutorielEtape: "termine",
};

process.stdout.write(JSON.stringify(state));
