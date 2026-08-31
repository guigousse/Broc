# Classeur de cartes & album de timbres — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deux collections à part (50 cartes, 50 timbres) achetées au Bazar, trouvables en brocante (≤ 1 par session), rangées automatiquement dans un classeur 3×3 / un album à lignes aimantées, doublons recyclés en pièces de réparation — avec visuels provisoires.

**Architecture:** Catalogue à part (`PieceCollection`, jamais dans `OBJET_TEMPLATES`), résolu par la façade `getTemplate` pour que fiche/négo/prix marchent sans retouche ; état `albums` dans la save (SAVE_VERSION 22) ; logique pure dans `src/lib/albums.ts` + `src/lib/bazar/albums.ts`, aiguillage unique de l'achat dans `GameContext.acheterObjet`, UI en deux overlays modaux + trois entrées (collection, bureau, Bazar).

**Tech Stack:** Next 16 / React / TypeScript, vitest (+ jsdom, @testing-library/react), lucide-react, i18n typé (`DictionnaireUI = DeepStrings<typeof fr>` → toute clé FR doit exister en EN/ES/EL, tsc le garde).

**Spec:** `docs/superpowers/specs/2026-08-30-classeur-album-design.md`

## Global Constraints

- Tests : TOUJOURS `npx vitest run --maxWorkers=4 <chemin>` (sans le drapeau : ~41 faux échecs par famine de workers sur ce Mac Intel).
- Typage : `npx tsc --noEmit -p .` doit rester propre à chaque commit. Lint : `npx eslint src`.
- Jamais de chaîne localisée en save. Toute chaîne UI passe par `src/lib/i18n/ui/{fr,en,es,el}.ts` (les 4 fichiers, même clés).
- Noms des pièces : FR dans le catalogue, EN/ES/EL dans `src/lib/i18n/contenu/<langue>/objets.ts` (cartes : traduction de l'objet source ; timbres : 50 entrées × 3).
- Personnages et culture pop des timbres : FICTIFS (noms-parodies déjà présents dans le jeu).
- Commits : messages en français, préfixe `feat(albums):` / `fix(...)` / `test(...)`, avec le trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Écarts assumés par rapport à la spec (décidés à la rédaction du plan, à la lumière du code) :
  1. `GameState.albums` est **optionnel** (`albums?: AlbumsState`) lu via `albumsDe(state)` — comme `bazar?`. Des dizaines de tests construisent des `GameState` à la main ; un champ requis les casserait tous. La migration v22 le renseigne quand même.
  2. Les overlays classeur/album ne s'appuient pas sur `FloatingRoomOverlay` (qui est un composant de ROUTE du groupe `(qg)`) mais sur un voile modal `open/onClose` comme `CollectionDetailOverlay`, pour pouvoir s'ouvrir depuis la collection, le bureau ET le Bazar.
  3. L'envol du bilan de chinage garde sa cible actuelle (la réserve) ; la pièce y est listée avec la mention « rangée dans l'album ». Viser une icône d'album demanderait un nouvel ancrage dans `BilanSession` sans gain joueur.
  4. Le simulateur d'équilibrage (`niveauSim.ts`) ignore les pièces (filtre `estPiece`) : il mesure l'économie des objets.

---

### Task 1 : Catalogues des pièces + façade `getTemplate`

**Files:**
- Create: `src/data/pieces.ts`, `src/data/cartes.ts`, `src/data/timbres.ts`
- Modify: `src/data/objetTemplates.ts:556-559` (`getTemplate`)
- Test: `src/data/pieces.test.ts`

**Interfaces:**
- Produces: `type AlbumId = "classeur" | "timbres"`, `interface PieceCollection { id; nom; album; serie; rarete; prixRefBase; source?; ordre }`, `CARTES: PieceCollection[]` (50), `TIMBRES: PieceCollection[]` (50), `PIECES: PieceCollection[]` (100), `CATEGORIE_ALBUM: Record<AlbumId, CategorieObjet>`, `THEMES_TIMBRES` (5 clés), `estPiece(id): boolean`, `albumDe(id): AlbumId | null`, `getPiece(id): PieceCollection | undefined`, `piecesDe(album): PieceCollection[]` (triées par `ordre`), `templateDePiece(id): ObjetTemplate | undefined`. `getTemplate(id)` résout aussi les pièces.

- [ ] **Step 1 : Écrire le test**

```ts
// src/data/pieces.test.ts
import { describe, expect, it } from "vitest";
import {
  CARTES, TIMBRES, PIECES, THEMES_TIMBRES, albumDe, estPiece, getPiece,
  piecesDe, templateDePiece,
} from "@/data/pieces";
import { ALL_TEMPLATES, getTemplate, poolPourTier } from "@/data/objetTemplates";
import { initCollection } from "@/lib/collection";
import { poolDeGamme, GAMMES_BAZAR } from "@/lib/bazar/etal";

function compte(l: { rarete: string }[], r: string) {
  return l.filter((p) => p.rarete === r).length;
}

describe("catalogues de pièces", () => {
  it("50 cartes et 50 timbres, ids uniques et préfixés", () => {
    expect(CARTES).toHaveLength(50);
    expect(TIMBRES).toHaveLength(50);
    expect(new Set(PIECES.map((p) => p.id)).size).toBe(100);
    for (const c of CARTES) expect(c.id.startsWith("carte.")).toBe(true);
    for (const t of TIMBRES) expect(t.id.startsWith("timbre.")).toBe(true);
  });

  it("30 communes / 15 rares / 5 légendaires par album", () => {
    for (const l of [CARTES, TIMBRES]) {
      expect(compte(l, "commun")).toBe(30);
      expect(compte(l, "rare")).toBe(15);
      expect(compte(l, "legendaire")).toBe(5);
    }
  });

  it("`ordre` est une permutation de 0..49 dans chaque album", () => {
    for (const l of [CARTES, TIMBRES]) {
      expect([...l.map((p) => p.ordre)].sort((a, b) => a - b)).toEqual(
        Array.from({ length: 50 }, (_, i) => i),
      );
    }
  });

  it("chaque carte pointe un objet du catalogue ; chaque timbre un thème connu (10 par thème)", () => {
    for (const c of CARTES) expect(getTemplate(c.source!)).toBeDefined();
    for (const th of THEMES_TIMBRES) {
      expect(TIMBRES.filter((t) => t.serie === th)).toHaveLength(10);
    }
  });

  it("helpers : estPiece / albumDe / getPiece / piecesDe", () => {
    expect(estPiece("carte.marteau_menuisier")).toBe(true);
    expect(estPiece("br.marteau_menuisier")).toBe(false);
    expect(albumDe("timbre.renard_roux")).toBe("timbres");
    expect(albumDe("carte.marteau_menuisier")).toBe("classeur");
    expect(albumDe("mus.33tours_jazz_1")).toBeNull();
    expect(getPiece("timbre.renard_roux")?.serie).toBe("faune");
    expect(piecesDe("classeur").map((p) => p.ordre)).toEqual(
      Array.from({ length: 50 }, (_, i) => i),
    );
  });

  it("getTemplate résout une pièce en vue ObjetTemplate (XS, catégorie de l'album)", () => {
    const t = getTemplate("timbre.renard_roux");
    expect(t).toMatchObject({
      templateId: "timbre.renard_roux",
      categorie: "Livres & Papeterie",
      taille: "XS",
    });
    expect(getTemplate("carte.marteau_menuisier")?.categorie).toBe("Jeux & Loisirs");
    expect(templateDePiece("br.marteau_menuisier")).toBeUndefined();
  });

  it("INVARIANT : aucune pièce dans les pools dérivés d'OBJET_TEMPLATES", () => {
    const ids = new Set(PIECES.map((p) => p.id));
    for (const t of ALL_TEMPLATES) expect(ids.has(t.templateId)).toBe(false);
    for (const t of poolPourTier(4)) expect(ids.has(t.templateId)).toBe(false);
    for (const g of GAMMES_BAZAR) for (const t of poolDeGamme(g)) expect(ids.has(t.templateId)).toBe(false);
    const col = initCollection();
    for (const cat of Object.keys(col) as (keyof typeof col)[])
      for (const s of col[cat]) expect(ids.has(s.templateId)).toBe(false);
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/data/pieces.test.ts`
Expected: FAIL — `Cannot find module '@/data/pieces'`.

- [ ] **Step 3 : Écrire `src/data/pieces.ts`**

```ts
// src/data/pieces.ts
import type { CategorieObjet, Rarete } from "@/types/game";
import type { ObjetTemplate } from "@/data/objetTemplates";
import { CARTES } from "@/data/cartes";
import { TIMBRES } from "@/data/timbres";

export type AlbumId = "classeur" | "timbres";

export interface PieceCollection {
  /** "carte.<slug>" ou "timbre.<slug>" — le préfixe identifie l'album. */
  id: string;
  nom: string;
  album: AlbumId;
  /** Cartes : catégorie de l'objet source. Timbres : thème. */
  serie: string;
  rarete: Rarete;
  /** Valeur de référence (« Très bon ») pour le prix en brocante. */
  prixRefBase: number;
  /** Cartes uniquement : templateId de l'objet toonifié (placeholder). */
  source?: string;
  /** Ordre dans l'album (0..49), stable : sert aux pochettes du classeur. */
  ordre: number;
}

/** Catégorie sous laquelle une pièce se présente quand elle est enveloppée en Objet. */
export const CATEGORIE_ALBUM: Record<AlbumId, CategorieObjet> = {
  classeur: "Jeux & Loisirs",
  timbres: "Livres & Papeterie",
};

export const THEMES_TIMBRES = ["voyage", "faune", "monuments", "celebrites", "culture-pop"] as const;
export type ThemeTimbre = (typeof THEMES_TIMBRES)[number];

export const PIECES: PieceCollection[] = [...CARTES, ...TIMBRES];
const PAR_ID = new Map(PIECES.map((p) => [p.id, p]));

export function estPiece(id: string): boolean {
  return id.startsWith("carte.") || id.startsWith("timbre.");
}

export function albumDe(id: string): AlbumId | null {
  if (id.startsWith("carte.")) return "classeur";
  if (id.startsWith("timbre.")) return "timbres";
  return null;
}

export function getPiece(id: string): PieceCollection | undefined {
  return PAR_ID.get(id);
}

/** Les 50 pièces d'un album, dans l'ordre des pochettes. */
export function piecesDe(album: AlbumId): PieceCollection[] {
  return PIECES.filter((p) => p.album === album).sort((a, b) => a.ordre - b.ordre);
}

/** Vue ObjetTemplate d'une pièce — ce que `getTemplate` renvoie pour elle. */
export function templateDePiece(id: string): ObjetTemplate | undefined {
  const p = PAR_ID.get(id);
  if (!p) return undefined;
  return {
    templateId: p.id,
    nom: p.nom,
    categorie: CATEGORIE_ALBUM[p.album],
    rarete: p.rarete,
    prixRefBase: p.prixRefBase,
    taille: "XS",
  };
}
```

- [ ] **Step 4 : Écrire `src/data/cartes.ts`** — 50 cartes = objets du jeu toonifiés. `id = "carte." + source sans son préfixe de catégorie` (`br.marteau_menuisier` → `carte.marteau_menuisier` ; `leg.mus.x` → `carte.x`). Prix : commune 10, rare 40, légendaire 150. `serie` = catégorie de l'objet. `ordre` = position dans la liste.

```ts
// src/data/cartes.ts
import type { PieceCollection } from "@/data/pieces";
import type { CategorieObjet, Rarete } from "@/types/game";

const PRIX: Record<Rarete, number> = { commun: 10, rare: 40, legendaire: 150 };

// [source, nom, rarete] — 30 communes / 15 rares / 5 légendaires, ordre = ordre des pochettes.
type Row = [source: string, nom: string, rarete: Rarete, serie: CategorieObjet];
const ROWS: Row[] = [
  // Musique — 5 c, 2 r, 1 l
  ["mus.vinyle_des_loups_des_steppes_bark_to_be_free", "Vinyle des Loups des Steppes — 'Bark to Be Free'", "commun", "Musique"],
  ["mus.vinyle_grand_max_des_combines", "Vinyle Babylone — 'Sur mon île'", "commun", "Musique"],
  ["mus.33tours_jazz_1", "33 tours de jazz inconnu", "commun", "Musique"],
  ["mus.harmonica_chromatique_de_bluesman", "Harmonica chromatique de bluesman", "commun", "Musique"],
  ["mus.vinyle_stevranos_vive_la_fet_a", "Vinyle Stevranos 'Vive la fêt(a)'", "commun", "Musique"],
  ["mus.guitare_classique_ancienne", "Vieille guitare classique", "rare", "Musique"],
  ["mus.test_pressing_des_trolling_sons", "Test pressing des Trolling Sons", "rare", "Musique"],
  ["leg.mus.violon_de_maitre_cremonais_1715", "Violon de maître crémonais (1715)", "legendaire", "Musique"],
  // Jeux & Loisirs — 4 c, 2 r, 1 l
  ["jx.cartouche_le_plombier_sauteur_8_bit", "Cartouche 'Le Plombier Sauteur' (8-bit)", "commun", "Jeux & Loisirs"],
  ["jx.manette_megadrive", "Manette de console 16-bit", "commun", "Jeux & Loisirs"],
  ["jx.playbox_pocket", "PlayBox Pocket", "commun", "Jeux & Loisirs"],
  ["jx.risk_1992", "Jeu 'Krise' (1992)", "commun", "Jeux & Loisirs"],
  ["jx.figurine_de_guerre_galactique_1978", "Figurine de Guerre galactique (1978)", "rare", "Jeux & Loisirs"],
  ["jx.flipper_a_plateau_annees_60", "Flipper à plateau années 60", "rare", "Jeux & Loisirs"],
  ["leg.jx.cartouche_stadium_events", "Cartouche 8-bit de sport ultra-rare", "legendaire", "Jeux & Loisirs"],
  // Livres & Papeterie — 4 c, 2 r, 1 l
  ["lv.monte_cristo", "Roman 'Le Comte de Monte-Cristo'", "commun", "Livres & Papeterie"],
  ["lv.les_aventures_de_titou_cap_sur_la_lune", "Les Aventures de Titou — 'Cap sur la Lune'", "commun", "Livres & Papeterie"],
  ["lv.paris_match_70s", "Lot de magazines d'actualité 70s", "commun", "Livres & Papeterie"],
  ["lv.miserables_pleiade", "Les Misérables — reliure prestige cuir", "commun", "Livres & Papeterie"],
  ["lv.conte_de_l_aviateur_et_de_l_enfant_roi_edition", "Conte de l'Aviateur et de l'Enfant-Roi (édition 1943)", "rare", "Livres & Papeterie"],
  ["lv.le_petit_moustachu_edition_originale_1961", "Le Petit Moustachu — édition originale 1961", "rare", "Livres & Papeterie"],
  ["leg.lv.gutenberg_feuillet", "Feuillet original Bible de Gutenberg", "legendaire", "Livres & Papeterie"],
  // Mode — 4 c, 2 r, 1 l
  ["mo.veste_jean_delavee", "Veste en jean délavée", "commun", "Mode"],
  ["mo.blouson_cuir_vintage", "Blouson cuir vintage", "commun", "Mode"],
  ["mo.chapeau_feutre_50s", "Chapeau de feutre années 50", "commun", "Mode"],
  ["mo.robe_50s_pinup", "Robe pin-up années 50", "commun", "Mode"],
  ["mo.broche_emaillee_artdeco", "Broche émaillée Art Déco", "rare", "Mode"],
  ["mo.sac_a_main_talaria", "Sac à main Talaria", "rare", "Mode"],
  ["leg.mo.la_petite_robe_noire_chaine_1925", "La petite robe noire Chaîné (1925)", "legendaire", "Mode"],
  // Maison — 4 c, 2 r, 1 l
  ["ma.figurine_porcelaine", "Petite figurine en porcelaine", "commun", "Maison"],
  ["ma.service_the_faience", "Service à thé en faïence", "commun", "Maison"],
  ["ma.tabouret_bois_patine", "Tabouret en bois patiné", "commun", "Maison"],
  ["ma.vase_en_cristal_baraka", "Vase en cristal Baraka", "commun", "Maison"],
  ["ma.boite_musique_ancienne", "Boîte à musique ancienne", "rare", "Maison"],
  ["ma.lampe_bureau_artdeco", "Lampe de bureau Art Déco", "rare", "Maison"],
  ["leg.ma.uf_joaillier_imperial_en_email_replique", "Œuf joaillier impérial en émail (réplique)", "legendaire", "Maison"],
  // Objets d'art — 4 c, 2 r
  ["art.aquarelle_paysage_anonyme", "Aquarelle de paysage (anonyme XIXe)", "commun", "Objets d'art"],
  ["art.terre_cuite_buste", "Petit buste en terre cuite", "commun", "Objets d'art"],
  ["art.masque_tribal_decoratif", "Masque tribal décoratif", "commun", "Objets d'art"],
  ["art.bronze_animalier", "Bronze animalier signé", "commun", "Objets d'art"],
  ["art.vase_galle_signe", "Vase Émile Gallé signé", "rare", "Objets d'art"],
  ["art.dessin_surrealiste_aux_montres_molles_signe", "Dessin surréaliste aux montres molles (signé)", "rare", "Objets d'art"],
  // Bricolage — 5 c, 3 r
  ["br.marteau_menuisier", "Marteau de menuisier", "commun", "Bricolage"],
  ["br.boite_outils_complete", "Boîte à outils complète", "commun", "Bricolage"],
  ["br.etabli_pliant_ancien", "Établi pliant ancien", "commun", "Bricolage"],
  ["br.pince_etirer_cuivre", "Pince à étirer en cuivre", "commun", "Bricolage"],
  ["br.scie_egoine_de_charpentier", "Scie égoïne de charpentier", "commun", "Bricolage"],
  ["br.boite_d_outils_de_manufacture_signee", "Boîte d'outils de manufacture (signée)", "rare", "Bricolage"],
  ["br.rabot_d_ebeniste_a_semelle_modele_605", "Rabot d'ébéniste à semelle (modèle 605)", "rare", "Bricolage"],
  ["br.coffret_ebeniste_xixe", "Coffret d'outils d'ébéniste XIXe", "rare", "Bricolage"],
];

/** `leg.mus.x` → `x`, `br.x` → `x`. */
export function slugDeSource(source: string): string {
  return source.replace(/^leg\./, "").replace(/^[a-z]+\./, "");
}

export const CARTES: PieceCollection[] = ROWS.map(([source, nom, rarete, serie], ordre) => ({
  id: `carte.${slugDeSource(source)}`,
  nom,
  album: "classeur",
  serie,
  rarete,
  prixRefBase: PRIX[rarete],
  source,
  ordre,
}));
```

- [ ] **Step 5 : Écrire `src/data/timbres.ts`** — 5 thèmes × 10 (6 c / 3 r / 1 l chacun), personnages et culture pop = noms-parodies du jeu.

```ts
// src/data/timbres.ts
import type { PieceCollection, ThemeTimbre } from "@/data/pieces";
import type { Rarete } from "@/types/game";

const PRIX: Record<Rarete, number> = { commun: 10, rare: 40, legendaire: 150 };

type Row = [slug: string, nom: string, rarete: Rarete];
const PAR_THEME: Record<ThemeTimbre, Row[]> = {
  voyage: [
    ["paquebot_etoile_du_nord", "Paquebot « Étoile du Nord »", "commun"],
    ["ballon_monte_1870", "Ballon monté de 1870", "commun"],
    ["orient_express_quai_7", "L'Orient-Express au quai 7", "commun"],
    ["autocar_route_des_alpes", "Autocar de la Route des Alpes", "commun"],
    ["phare_de_ker_avel", "Phare de Ker-Avel", "commun"],
    ["croisiere_du_nil_1932", "Croisière du Nil, 1932", "commun"],
    ["hydravion_ligne_sud", "Hydravion de la Ligne Sud", "rare"],
    ["cremaillere_du_mont_bleu", "Train à crémaillère du Mont-Bleu", "rare"],
    ["dirigeable_aurore", "Dirigeable « Aurore »", "rare"],
    ["premier_vol_postal_1925", "Premier vol postal transsaharien (1925)", "legendaire"],
  ],
  faune: [
    ["renard_roux", "Renard roux", "commun"],
    ["herisson_d_europe", "Hérisson d'Europe", "commun"],
    ["mesange_bleue", "Mésange bleue", "commun"],
    ["cerf_en_brame", "Cerf en brame", "commun"],
    ["loutre_de_riviere", "Loutre de rivière", "commun"],
    ["chouette_hulotte", "Chouette hulotte", "commun"],
    ["lynx_boreal", "Lynx boréal", "rare"],
    ["ours_des_pyrenees", "Ours des Pyrénées", "rare"],
    ["gypaete_barbu", "Gypaète barbu", "rare"],
    ["grand_tetras_surcharge", "Grand Tétras (surcharge inversée)", "legendaire"],
  ],
  monuments: [
    ["tour_de_l_horloge", "Tour de l'Horloge", "commun"],
    ["pont_des_arts", "Pont des Arts", "commun"],
    ["phare_de_cordouan", "Phare de Cordouan", "commun"],
    ["chateau_de_chambord", "Château de Chambord", "commun"],
    ["mont_saint_michel", "Mont-Saint-Michel", "commun"],
    ["arenes_de_nimes", "Arènes de Nîmes", "commun"],
    ["viaduc_de_garabit", "Viaduc de Garabit", "rare"],
    ["opera_garnier", "Opéra Garnier", "rare"],
    ["palais_ideal", "Palais idéal du Facteur Cheval", "rare"],
    ["tour_eiffel_erreur_de_couleur", "Tour Eiffel (erreur de couleur)", "legendaire"],
  ],
  celebrites: [
    ["victor_de_la_brasse", "Victor de la Brasse, chanteur", "commun"],
    ["judith_loiseau", "Judith Loiseau, chanteuse", "commun"],
    ["paul_nazamour", "Paul Nazamour, crooner", "commun"],
    ["stevranos", "Stevranos, roi de la fête", "commun"],
    ["grand_max", "Grand Max des Combines", "commun"],
    ["bebert_bahut", "Bébert Bahut, peintre", "commun"],
    ["picassiette", "Picassiette, maître cubiste", "rare"],
    ["roland_duff", "Roland Duff, fauviste", "rare"],
    ["laluck_verrier", "Laluck, maître verrier", "rare"],
    ["ridor_couturier", "Ridor, couturier du New Look", "legendaire"],
  ],
  "culture-pop": [
    ["le_plombier_sauteur", "Le Plombier Sauteur", "commun"],
    ["foxy_crush", "Foxy Crush", "commun"],
    ["pocket_monster_jungle", "Pocket Monster — la Jungle", "commun"],
    ["dark_father", "Dark Father", "commun"],
    ["titou_cap_sur_la_lune", "Titou — Cap sur la Lune", "commun"],
    ["le_petit_moustachu", "Le Petit Moustachu", "commun"],
    ["loups_des_steppes", "Les Loups des Steppes en tournée", "rare"],
    ["trolling_sons", "Les Trolling Sons", "rare"],
    ["legende_de_solda", "La Légende de Solda", "rare"],
    ["guerre_galactique_1978", "Guerre galactique — affiche de 1978", "legendaire"],
  ],
};

export const TIMBRES: PieceCollection[] = (Object.keys(PAR_THEME) as ThemeTimbre[]).flatMap(
  (theme, ti) =>
    PAR_THEME[theme].map(([slug, nom, rarete], i) => ({
      id: `timbre.${slug}`,
      nom,
      album: "timbres" as const,
      serie: theme,
      rarete,
      prixRefBase: PRIX[rarete],
      ordre: ti * 10 + i,
    })),
);
```

⚠ Import circulaire `pieces.ts` ↔ `cartes.ts`/`timbres.ts` : `cartes.ts` et `timbres.ts` n'importent de `pieces.ts` que des **types** (`import type`), donc rien à l'exécution. Ne pas y importer `PRIX` ou autre valeur depuis `pieces.ts`.

- [ ] **Step 6 : Façade `getTemplate`** dans `src/data/objetTemplates.ts` :

```ts
import { templateDePiece } from "@/data/pieces";
// ...
/** Résout un templateId vers son template (légendaires, uniques… et les pièces d'album). */
export function getTemplate(templateId: string): ObjetTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.templateId === templateId) ?? templateDePiece(templateId);
}
```

`ALL_TEMPLATES` ne change PAS (invariant §3.2). `pieces.ts` importe `ObjetTemplate` en `import type` seulement → pas de cycle à l'exécution.

- [ ] **Step 7 : Lancer les tests + tsc**

Run: `npx vitest run --maxWorkers=4 src/data/pieces.test.ts src/data && npx tsc --noEmit -p .`
Expected: PASS (le test d'`objets.test.ts` sur `ALL_TEMPLATES` reste vert : les pièces n'y sont pas).

- [ ] **Step 8 : Commit**

```bash
git add src/data/pieces.ts src/data/cartes.ts src/data/timbres.ts src/data/pieces.test.ts src/data/objetTemplates.ts
git commit -m "feat(albums): catalogues des 50 cartes et 50 timbres, façade getTemplate"
```

---

### Task 2 : État `albums` dans la save + logique pure `src/lib/albums.ts`

**Files:**
- Modify: `src/types/game.ts` (après `bazar?: EtalBazar;` ligne ~504)
- Create: `src/lib/albums.ts`
- Test: `src/lib/albums.test.ts`

**Interfaces:**
- Produces (types) : `AlbumState { achete; pieces: Record<string, number>; nouvelles: string[] }`, `AlbumTimbresState extends AlbumState { placements: Record<string, PlacementTimbre>; ordreZ: string[] }`, `PlacementTimbre { page: 0 | 1; ligne: 0|1|2|3|4; x: number }`, `AlbumsState { classeur: AlbumState; timbres: AlbumTimbresState }`, `GameState.albums?: AlbumsState`.
- Produces (fonctions) : `initAlbums(): AlbumsState`, `albumsDe(state: Pick<GameState,"albums">): AlbumsState`, `ajouterPiece(albums, id): AlbumsState`, `marquerConsultee(albums, id): AlbumsState`, `nbPossedees(album: AlbumState): number`, `doublons(album): number`, `recyclerDoublons(state: GameState, albumId): { state: GameState; n: number }`, `POIDS_RARETE = { commun: 70, rare: 25, legendaire: 5 }`, `tirerPiece(albumId, rng = Math.random): PieceCollection`, `ouvrirPaquet(albumId, rng?): PieceCollection[]` (3), `poserTimbre(albums, id, page, ligne, x): AlbumsState`, `rendreAuBac(albums, id): AlbumsState`, `premierePlaceLibre(albums, page): PlacementTimbre`, `NB_LIGNES_ALBUM = 5`, `NB_PAGES_ALBUM = 2`, `TAILLE_PAQUET = 3`.

- [ ] **Step 1 : Types** dans `src/types/game.ts`, juste après `bazar?: EtalBazar;` :

```ts
  /** Classeur de cartes et album de timbres (2026-08-30). Absent = jamais renseigné (vieille save) : lire via `albumsDe`. */
  albums?: AlbumsState;
```

et, à côté de `EtalBazar` :

```ts
export interface AlbumState {
  achete: boolean;
  /** id de pièce → quantité possédée (≥ 1). Absent = jamais obtenue. */
  pieces: Record<string, number>;
  /** Pièces obtenues pas encore consultées dans l'album (pastille « nouveau »). */
  nouvelles: string[];
}
export interface PlacementTimbre {
  page: 0 | 1;
  ligne: 0 | 1 | 2 | 3 | 4;
  /** Centre du timbre en fraction de la largeur de page, 0..1. */
  x: number;
}
export interface AlbumTimbresState extends AlbumState {
  /** Timbres posés sur une page. Absent = dans le bac « en vrac ». */
  placements: Record<string, PlacementTimbre>;
  /** Ordre d'empilement : le DERNIER id est dessus. */
  ordreZ: string[];
}
export interface AlbumsState {
  classeur: AlbumState;
  timbres: AlbumTimbresState;
}
```

- [ ] **Step 2 : Test**

```ts
// src/lib/albums.test.ts
import { describe, expect, it } from "vitest";
import {
  ajouterPiece, albumsDe, doublons, initAlbums, marquerConsultee, nbPossedees,
  ouvrirPaquet, poserTimbre, premierePlaceLibre, recyclerDoublons, rendreAuBac,
  tirerPiece, TAILLE_PAQUET,
} from "@/lib/albums";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { piecesDe } from "@/data/pieces";

const rngFixe = (suite: number[]) => { let i = 0; return () => suite[i++ % suite.length]; };

describe("albums — état", () => {
  it("initAlbums : rien d'acheté, vide ; albumsDe remplace un champ absent", () => {
    const a = initAlbums();
    expect(a.classeur.achete).toBe(false);
    expect(a.timbres.placements).toEqual({});
    expect(albumsDe(createMockGameState())).toEqual(initAlbums());
  });

  it("ajouterPiece empile et note la nouveauté à la première fois seulement", () => {
    let a = ajouterPiece(initAlbums(), "timbre.renard_roux");
    a = ajouterPiece(a, "timbre.renard_roux");
    expect(a.timbres.pieces["timbre.renard_roux"]).toBe(2);
    expect(a.timbres.nouvelles).toEqual(["timbre.renard_roux"]);
    expect(nbPossedees(a.timbres)).toBe(1);
    expect(doublons(a.timbres)).toBe(1);
    expect(marquerConsultee(a, "timbre.renard_roux").timbres.nouvelles).toEqual([]);
  });

  it("recyclerDoublons ramène chaque quantité à 1 et crédite la catégorie de l'album", () => {
    let a = initAlbums();
    for (let i = 0; i < 3; i++) a = ajouterPiece(a, "carte.marteau_menuisier");
    a = ajouterPiece(a, "carte.risk_1992");
    a = ajouterPiece(a, "carte.risk_1992");
    const { state, n } = recyclerDoublons(createMockGameState({ albums: a }), "classeur");
    expect(n).toBe(3);
    expect(state.piecesAmelioration["Jeux & Loisirs"]).toBe(3);
    expect(state.albums!.classeur.pieces).toEqual({ "carte.marteau_menuisier": 1, "carte.risk_1992": 1 });
  });
});

describe("albums — tirage", () => {
  it("tirerPiece respecte les poids 70/25/5 et reste dans l'album demandé", () => {
    expect(tirerPiece("timbres", rngFixe([0.0, 0.0])).rarete).toBe("commun");
    expect(tirerPiece("timbres", rngFixe([0.71, 0.0])).rarete).toBe("rare");
    expect(tirerPiece("timbres", rngFixe([0.96, 0.0])).rarete).toBe("legendaire");
    expect(tirerPiece("classeur", rngFixe([0.5, 0.5])).album).toBe("classeur");
  });

  it("ouvrirPaquet donne 3 pièces, doublons possibles", () => {
    const p = ouvrirPaquet("classeur", rngFixe([0.1, 0.0]));
    expect(p).toHaveLength(TAILLE_PAQUET);
    expect(new Set(p.map((x) => x.id)).size).toBe(1);
  });
});

describe("album de timbres — placement", () => {
  const id = "timbre.renard_roux";
  it("poserTimbre borne x, aimante la ligne et passe le timbre dessus", () => {
    let a = ajouterPiece(initAlbums(), id);
    a = ajouterPiece(a, "timbre.lynx_boreal");
    a = poserTimbre(a, "timbre.lynx_boreal", 0, 2, 0.5);
    a = poserTimbre(a, id, 1, 4, 1.7);
    expect(a.timbres.placements[id]).toEqual({ page: 1, ligne: 4, x: 1 });
    expect(a.timbres.ordreZ).toEqual(["timbre.lynx_boreal", id]);
    a = poserTimbre(a, "timbre.lynx_boreal", 0, 0, -3);
    expect(a.timbres.placements["timbre.lynx_boreal"].x).toBe(0);
    expect(a.timbres.ordreZ).toEqual([id, "timbre.lynx_boreal"]);
  });

  it("refuse de poser un timbre non possédé", () => {
    const a = initAlbums();
    expect(poserTimbre(a, id, 0, 0, 0.5)).toBe(a);
  });

  it("rendreAuBac retire le placement et l'ordreZ", () => {
    let a = poserTimbre(ajouterPiece(initAlbums(), id), id, 0, 0, 0.5);
    a = rendreAuBac(a, id);
    expect(a.timbres.placements[id]).toBeUndefined();
    expect(a.timbres.ordreZ).toEqual([]);
  });

  it("premierePlaceLibre avance de 0,2 en 0,2 sur la ligne 0 et retombe au centre si tout est pris", () => {
    let a = initAlbums();
    expect(premierePlaceLibre(a, 0)).toEqual({ page: 0, ligne: 0, x: 0.1 });
    const ids = piecesDe("timbres").slice(0, 5).map((p) => p.id);
    ids.forEach((pid, k) => { a = ajouterPiece(a, pid); a = poserTimbre(a, pid, 0, 0, 0.1 + 0.2 * k); });
    expect(premierePlaceLibre(a, 0)).toEqual({ page: 0, ligne: 0, x: 0.5 });
    expect(premierePlaceLibre(a, 1)).toEqual({ page: 1, ligne: 0, x: 0.1 });
  });
});
```

- [ ] **Step 3 : Lancer, vérifier l'échec** — `npx vitest run --maxWorkers=4 src/lib/albums.test.ts` → FAIL (module absent).

- [ ] **Step 4 : Implémenter `src/lib/albums.ts`**

```ts
// src/lib/albums.ts
import type { AlbumsState, AlbumState, GameState, PlacementTimbre, Rarete } from "@/types/game";
import { CATEGORIE_ALBUM, albumDe, getPiece, piecesDe, type AlbumId, type PieceCollection } from "@/data/pieces";

export const NB_LIGNES_ALBUM = 5;
export const NB_PAGES_ALBUM = 2;
export const TAILLE_PAQUET = 3;
export const POIDS_RARETE: Record<Rarete, number> = { commun: 70, rare: 25, legendaire: 5 };

export function initAlbums(): AlbumsState {
  return {
    classeur: { achete: false, pieces: {}, nouvelles: [] },
    timbres: { achete: false, pieces: {}, nouvelles: [], placements: {}, ordreZ: [] },
  };
}

/** Lecture tolérante : une save d'avant 2026-08-30 n'a pas le champ. */
export function albumsDe(state: Pick<GameState, "albums">): AlbumsState {
  return state.albums ?? initAlbums();
}

function patchAlbum(albums: AlbumsState, id: AlbumId, patch: Partial<AlbumsState["timbres"]>): AlbumsState {
  return id === "classeur"
    ? { ...albums, classeur: { ...albums.classeur, ...patch } }
    : { ...albums, timbres: { ...albums.timbres, ...patch } };
}

export function ajouterPiece(albums: AlbumsState, id: string): AlbumsState {
  const a = albumDe(id);
  if (!a) return albums;
  const album = albums[a];
  const qte = album.pieces[id] ?? 0;
  return patchAlbum(albums, a, {
    pieces: { ...album.pieces, [id]: qte + 1 },
    nouvelles: qte === 0 ? [...album.nouvelles, id] : album.nouvelles,
  });
}

export function marquerConsultee(albums: AlbumsState, id: string): AlbumsState {
  const a = albumDe(id);
  if (!a || !albums[a].nouvelles.includes(id)) return albums;
  return patchAlbum(albums, a, { nouvelles: albums[a].nouvelles.filter((x) => x !== id) });
}

export function nbPossedees(album: AlbumState): number {
  return Object.keys(album.pieces).length;
}

export function doublons(album: AlbumState): number {
  return Object.values(album.pieces).reduce((s, q) => s + Math.max(0, q - 1), 0);
}

/** 1 pièce de réparation (catégorie de l'album) par exemplaire recyclé. */
export function recyclerDoublons(state: GameState, albumId: AlbumId): { state: GameState; n: number } {
  const albums = albumsDe(state);
  const n = doublons(albums[albumId]);
  if (n === 0) return { state, n: 0 };
  const pieces = Object.fromEntries(Object.keys(albums[albumId].pieces).map((id) => [id, 1]));
  const cat = CATEGORIE_ALBUM[albumId];
  return {
    n,
    state: {
      ...state,
      albums: patchAlbum(albums, albumId, { pieces }),
      piecesAmelioration: { ...state.piecesAmelioration, [cat]: (state.piecesAmelioration[cat] ?? 0) + n },
    },
  };
}

/** Poids 70/25/5 par rareté, uniforme dans la rareté. Doublons possibles. */
export function tirerPiece(albumId: AlbumId, rng: () => number = Math.random): PieceCollection {
  const total = POIDS_RARETE.commun + POIDS_RARETE.rare + POIDS_RARETE.legendaire;
  const r = rng() * total;
  const rarete: Rarete = r < POIDS_RARETE.commun ? "commun" : r < POIDS_RARETE.commun + POIDS_RARETE.rare ? "rare" : "legendaire";
  const pool = piecesDe(albumId).filter((p) => p.rarete === rarete);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

export function ouvrirPaquet(albumId: AlbumId, rng: () => number = Math.random): PieceCollection[] {
  return Array.from({ length: TAILLE_PAQUET }, () => tirerPiece(albumId, rng));
}

export function poserTimbre(albums: AlbumsState, id: string, page: 0 | 1, ligne: PlacementTimbre["ligne"], x: number): AlbumsState {
  if (albumDe(id) !== "timbres" || !albums.timbres.pieces[id] || !getPiece(id)) return albums;
  const xb = Math.min(1, Math.max(0, x));
  return patchAlbum(albums, "timbres", {
    placements: { ...albums.timbres.placements, [id]: { page, ligne, x: xb } },
    ordreZ: [...albums.timbres.ordreZ.filter((z) => z !== id), id],
  });
}

export function rendreAuBac(albums: AlbumsState, id: string): AlbumsState {
  if (!albums.timbres.placements[id]) return albums;
  const { [id]: _retire, ...placements } = albums.timbres.placements;
  void _retire;
  return patchAlbum(albums, "timbres", { placements, ordreZ: albums.timbres.ordreZ.filter((z) => z !== id) });
}

/** Chemin sans glisser : ligne 0, x = 0,1 + 0,2 k dont aucun timbre posé n'est à moins de 0,15 ; sinon 0,5. */
export function premierePlaceLibre(albums: AlbumsState, page: 0 | 1): PlacementTimbre {
  const poses = Object.values(albums.timbres.placements).filter((p) => p.page === page && p.ligne === 0);
  for (let k = 0; k < 5; k++) {
    const x = Math.round((0.1 + 0.2 * k) * 100) / 100;
    if (poses.every((p) => Math.abs(p.x - x) >= 0.15)) return { page, ligne: 0, x };
  }
  return { page, ligne: 0, x: 0.5 };
}
```

- [ ] **Step 5 : Lancer** — `npx vitest run --maxWorkers=4 src/lib/albums.test.ts && npx tsc --noEmit -p .` → PASS.

- [ ] **Step 6 : Commit** — `git add src/types/game.ts src/lib/albums.ts src/lib/albums.test.ts && git commit -m "feat(albums): état des albums dans la save et logique pure (pièces, doublons, tirage, placement)"`

---

### Task 3 : Migration v22 + les 5 lots de cartes remplacés

**Files:**
- Modify: `src/lib/migrations.ts` (`SAVE_VERSION`, bloc final), `src/data/objetTemplates.ts:121-149`, `src/data/objetTemplatesTailles.ts:83-87`, `src/data/templateIdRenames.ts`, `src/lib/itemImages.ts`, `src/lib/i18n/contenu/{en,es,el}/objets.ts`
- Rename (git mv) : `public/items/{jx.lot_de_cartes_l_assemblee_des_mages,jx.lot_de_cartes_de_yo_hi_ah,jx.cartes_pocket_monster_set_jungle,jx.cartes_pocket_monster_1ere_edition}.webp` et leurs `thumbs/` → nouveaux ids ; `git rm` les 2 fichiers `jx.cartes_pocket_monster_holographiques_japonaise.webp`.
- Test: `src/lib/migrations.test.ts`, `src/data/objetTemplates.test.ts` (existant, doit rester vert)

**Interfaces:** `SAVE_VERSION = 22` ; `OLD_TO_NEW_TEMPLATE_ID` gagne 5 entrées ; 4 nouveaux templates Jeux & Loisirs.

- [ ] **Step 1 : Test de migration** (ajouter dans `src/lib/migrations.test.ts`, en réutilisant le style des tests voisins) :

```ts
describe("v22 — albums et lots de cartes remplacés", () => {
  it("renseigne `albums` vide sur une save sans le champ", () => {
    const out = migrerSauvegarde(createMockGameState({ version: 21 } as Partial<GameState>));
    expect(out.version).toBe(22);
    expect(out.albums).toEqual(initAlbums());
    expect(out.albums!.classeur.achete).toBe(false);
  });

  it("conserve un `albums` existant", () => {
    const a = ajouterPiece(initAlbums(), "timbre.renard_roux");
    const out = migrerSauvegarde(createMockGameState({ version: 21, albums: a } as Partial<GameState>));
    expect(out.albums).toEqual(a);
  });

  it("renomme les 4 lots de cartes dans l'inventaire et rebascule les holographiques sur la locomotive", () => {
    const inv = [
      createMockObjet({ id: "a", templateId: "jx.lot_de_cartes_l_assemblee_des_mages" }),
      createMockObjet({ id: "b", templateId: "jx.cartes_pocket_monster_holographiques_japonaise" }),
    ];
    const out = migrerSauvegarde(createMockGameState({ version: 21, inventaireJoueur: inv } as Partial<GameState>));
    expect(out.inventaireJoueur.map((o) => o.templateId)).toEqual([
      "jx.puzzle_en_bois_1000_pieces_paysage_alpin",
      "jx.locomotive_a_vapeur_electrique_1950",
    ]);
    expect(getTemplate("jx.cartes_pocket_monster_holographiques_japonaise")).toBeUndefined();
  });
});
```

(imports à ajouter : `initAlbums`, `ajouterPiece` de `@/lib/albums`, `createMockObjet` de la fixture, `getTemplate`.)

- [ ] **Step 2 : Lancer, vérifier l'échec** — `npx vitest run --maxWorkers=4 src/lib/migrations.test.ts` → FAIL (version 21, `albums` undefined).

- [ ] **Step 3 : Templates** — dans `src/data/objetTemplates.ts`, remplacer les 5 lignes :

```ts
  // ligne 121-123 (communs Jeux & Loisirs)
  ["jx.puzzle_en_bois_1000_pieces_paysage_alpin", "Puzzle en bois 1000 pièces — paysage alpin", 80],
  ["jx.jeu_de_l_oie_lithographie_1900", "Jeu de l'oie lithographié (1900)", 35],
  ["jx.boite_de_construction_metallique_no_3", "Boîte de construction métallique n°3", 60],
  // ligne 144 (rares)
  ["jx.locomotive_a_vapeur_electrique_1950", "Locomotive à vapeur électrique (1950)", 220],
  // ligne 149 : SUPPRIMER la ligne holographiques (360)
```

Vérifier que la section « rares » garde un compte cohérent avec son commentaire d'en-tête (`// JEUX & LOISIRS — N communs + M rares`) : décrémenter M de 1.

- [ ] **Step 4 : Tailles, renommages, images, traductions**

`src/data/objetTemplatesTailles.ts:83-87` → remplacer par les 4 nouveaux ids : puzzle `"S"`, jeu de l'oie `"S"`, boîte de construction `"S"`, locomotive `"M"`.

`src/data/templateIdRenames.ts` (ajouter, clés historiques) :
```ts
  // 2026-08-30 : les lots de cartes à collectionner sont devenus le classeur.
  "jx.lot_de_cartes_l_assemblee_des_mages": "jx.puzzle_en_bois_1000_pieces_paysage_alpin",
  "jx.lot_de_cartes_de_yo_hi_ah": "jx.jeu_de_l_oie_lithographie_1900",
  "jx.cartes_pocket_monster_set_jungle": "jx.boite_de_construction_metallique_no_3",
  "jx.cartes_pocket_monster_1ere_edition": "jx.locomotive_a_vapeur_electrique_1950",
  "jx.cartes_pocket_monster_holographiques_japonaise": "jx.locomotive_a_vapeur_electrique_1950",
```

`src/lib/itemImages.ts` : dans `ITEMS_WITH_IMAGE`, remplacer les 4 anciens ids par les 4 nouveaux, retirer le 5ᵉ. Images (placeholders renommés, l'art viendra après) :
```bash
cd public/items
for p in "" thumbs/; do
  git mv "${p}jx.lot_de_cartes_l_assemblee_des_mages.webp" "${p}jx.puzzle_en_bois_1000_pieces_paysage_alpin.webp"
  git mv "${p}jx.lot_de_cartes_de_yo_hi_ah.webp" "${p}jx.jeu_de_l_oie_lithographie_1900.webp"
  git mv "${p}jx.cartes_pocket_monster_set_jungle.webp" "${p}jx.boite_de_construction_metallique_no_3.webp"
  git mv "${p}jx.cartes_pocket_monster_1ere_edition.webp" "${p}jx.locomotive_a_vapeur_electrique_1950.webp"
  git rm "${p}jx.cartes_pocket_monster_holographiques_japonaise.webp"
done
```

Traductions (`src/lib/i18n/contenu/{en,es,el}/objets.ts`, remplacer les 5 entrées) :
- EN : `"Wooden 1000-piece puzzle — alpine landscape"`, `"Lithographed Game of the Goose (1900)"`, `"Metal construction set no. 3"`, `"Electric steam locomotive (1950)"`.
- ES : `"Puzle de madera de 1000 piezas — paisaje alpino"`, `"Juego de la oca litografiado (1900)"`, `"Caja de construcción metálica n.º 3"`, `"Locomotora de vapor eléctrica (1950)"`.
- EL : `"Ξύλινο παζλ 1000 κομματιών — αλπικό τοπίο"`, `"Λιθογραφημένο παιχνίδι της χήνας (1900)"`, `"Μεταλλικό σετ κατασκευών αρ. 3"`, `"Ηλεκτρική ατμομηχανή (1950)"`.

Puis `grep -rn "pocket_monster\|lot_de_cartes" src public docs/superpowers/plans/2026-08-30-classeur-album.md --include='*.ts' --include='*.tsx' --include='*.html'` : seuls `templateIdRenames.ts` (clés) doivent rester dans `src`. Les pages `public/dev-save-*.html` sont ignorées par git — les ignorer.

- [ ] **Step 5 : Migration** — `src/lib/migrations.ts` : `SAVE_VERSION = 22` ; dans l'objet assemblé (près de `jetons:`), ajouter :

```ts
    albums: (() => {
      const a = (loaded as Partial<GameState>).albums;
      // Une save avec le champ le garde tel quel ; sans lui, albums neufs.
      return a && typeof a === "object" && a.classeur && a.timbres ? a : initAlbums();
    })(),
```
avec `import { initAlbums } from "@/lib/albums";`. Le remap des ids (`remapTemplateIds`) couvre déjà inventaire/vitrine/collection : rien d'autre à écrire.

- [ ] **Step 6 : Lancer** — `npx vitest run --maxWorkers=4 src/lib/migrations.test.ts src/data src/lib/i18n src/lib/itemImages.test.ts && npx tsc --noEmit -p .` → PASS. Si un test de complétude d'images/traductions échoue, c'est un id oublié : le corriger, pas le test.

- [ ] **Step 7 : Commit** — `git add -A src/data src/lib/migrations.ts src/lib/migrations.test.ts src/lib/itemImages.ts src/lib/i18n/contenu public/items && git commit -m "feat(albums): SAVE_VERSION 22, albums dans la save, 4 nouveaux objets à la place des lots de cartes"`

---

### Task 4 : Visuels provisoires des pièces (`PieceVisuel`)

**Files:**
- Create: `src/lib/pieceImages.ts`, `src/components/pieces/PieceVisuel.tsx`
- Test: `src/lib/pieceImages.test.ts`, `src/components/pieces/PieceVisuel.test.tsx`

**Interfaces:**
- Produces: `PIECES_AVEC_IMAGE: ReadonlySet<string>` (vide pour l'instant), `pieceImageSrc(id): string | null` (`/cartes/<id>.webp` ou `/timbres/<id>.webp` si déclaré, sinon `null`), `ICONE_THEME_TIMBRE: Record<ThemeTimbre, LucideIcon>`, `COULEUR_THEME_TIMBRE: Record<ThemeTimbre, string>`, `<PieceVisuel id size? grise? />` (carré `size` px, ou `fill` si `size` absent) — rend l'image réelle si déclarée, sinon `<CartePlaceholder>` (image de l'objet `source` dans un cadre CSS teinté par la rareté, filtre `saturate(1.4) contrast(1.1)`) ou `<TimbrePlaceholder>` (SVG dentelé, fond du thème, icône lucide, numéro `ordre + 1`). Attribut `data-testid="piece-visuel"` et `data-piece-source="image" | "placeholder"`.

- [ ] **Step 1 : Tests**

```ts
// src/lib/pieceImages.test.ts
import { describe, expect, it } from "vitest";
import { pieceImageSrc, PIECES_AVEC_IMAGE } from "@/lib/pieceImages";

describe("pieceImageSrc", () => {
  it("null tant que le fichier n'est pas déclaré", () => {
    expect(pieceImageSrc("timbre.renard_roux")).toBeNull();
    expect(pieceImageSrc("br.marteau_menuisier")).toBeNull();
  });
  it("chemin par album pour un id déclaré", () => {
    const set = new Set([...PIECES_AVEC_IMAGE, "timbre.renard_roux", "carte.marteau_menuisier"]);
    expect(pieceImageSrc("timbre.renard_roux", set)).toBe("/timbres/timbre.renard_roux.webp");
    expect(pieceImageSrc("carte.marteau_menuisier", set)).toBe("/cartes/carte.marteau_menuisier.webp");
  });
});
```

```tsx
// src/components/pieces/PieceVisuel.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PieceVisuel } from "./PieceVisuel";

afterEach(cleanup);

describe("PieceVisuel", () => {
  it("une carte sans art montre l'objet source dans un cadre", () => {
    const { container } = render(<PieceVisuel id="carte.marteau_menuisier" size={96} />);
    const v = container.querySelector('[data-testid="piece-visuel"]') as HTMLElement;
    expect(v.dataset.pieceSource).toBe("placeholder");
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toContain("br.marteau_menuisier");
    expect(v.style.width).toBe("96px");
  });
  it("un timbre sans art montre un SVG dentelé numéroté", () => {
    const { container } = render(<PieceVisuel id="timbre.renard_roux" size={64} />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent).toContain("11"); // ordre 10 → n° 11
  });
  it("grisé : filtre gris", () => {
    const { container } = render(<PieceVisuel id="timbre.renard_roux" size={64} grise />);
    const v = container.querySelector('[data-testid="piece-visuel"]') as HTMLElement;
    expect(v.style.filter).toContain("grayscale");
  });
});
```

- [ ] **Step 2 : Lancer, échec attendu** — `npx vitest run --maxWorkers=4 src/lib/pieceImages.test.ts src/components/pieces` → FAIL.

- [ ] **Step 3 : `src/lib/pieceImages.ts`**

```ts
import { albumDe } from "@/data/pieces";

/** Ids dont l'art définitif est livré dans public/cartes/ ou public/timbres/. Le chantier art remplit ce Set. */
export const PIECES_AVEC_IMAGE: ReadonlySet<string> = new Set<string>([]);

export function pieceImageSrc(id: string, declarees: ReadonlySet<string> = PIECES_AVEC_IMAGE): string | null {
  if (!declarees.has(id)) return null;
  const album = albumDe(id);
  if (album === "classeur") return `/cartes/${id}.webp`;
  if (album === "timbres") return `/timbres/${id}.webp`;
  return null;
}
```

- [ ] **Step 4 : `src/components/pieces/PieceVisuel.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import { Gamepad2, Landmark, PawPrint, Plane, Star, type LucideIcon } from "lucide-react";
import { getPiece, type ThemeTimbre } from "@/data/pieces";
import { getItemImageUrl } from "@/lib/itemImages";
import { pieceImageSrc } from "@/lib/pieceImages";
import { getRarityColors } from "@/lib/rarityColors";

export const ICONE_THEME_TIMBRE: Record<ThemeTimbre, LucideIcon> = {
  voyage: Plane, faune: PawPrint, monuments: Landmark, celebrites: Star, "culture-pop": Gamepad2,
};
export const COULEUR_THEME_TIMBRE: Record<ThemeTimbre, string> = {
  voyage: "#6f9ac2", faune: "#7da36a", monuments: "#c9a86a", celebrites: "#c27a8a", "culture-pop": "#8a7ac2",
};

interface Props { id: string; size?: number; grise?: boolean }

export function PieceVisuel({ id, size, grise = false }: Props) {
  const piece = getPiece(id);
  const src = pieceImageSrc(id);
  const box: CSSProperties = {
    width: size ?? "100%", height: size ?? "100%", position: "relative",
    filter: grise ? "grayscale(1) opacity(0.55)" : undefined,
  };
  if (!piece) return <div data-testid="piece-visuel" data-piece-source="placeholder" style={box} />;
  if (src) {
    return (
      <div data-testid="piece-visuel" data-piece-source="image" style={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    );
  }
  return (
    <div data-testid="piece-visuel" data-piece-source="placeholder" style={box}>
      {piece.album === "classeur" ? <CartePlaceholder id={id} /> : <TimbrePlaceholder id={id} />}
    </div>
  );
}

/** Carte à jouer : l'objet source « toonifié » par un filtre, dans un cadre teinté par la rareté. */
function CartePlaceholder({ id }: { id: string }) {
  const piece = getPiece(id)!;
  const couleurs = getRarityColors(piece.rarete);
  const src = piece.source ? getItemImageUrl(piece.source) : null;
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "6%", border: `3px solid ${couleurs.outer}`, background: "var(--paper-100)", boxSizing: "border-box", padding: "8%", display: "grid", placeItems: "center", overflow: "hidden" }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" draggable={false} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "saturate(1.4) contrast(1.1)" }} />
      )}
    </div>
  );
}

/** Timbre : rectangle dentelé (masque SVG), fond du thème, icône, numéro. */
function TimbrePlaceholder({ id }: { id: string }) {
  const piece = getPiece(id)!;
  const theme = piece.serie as ThemeTimbre;
  const Icone = ICONE_THEME_TIMBRE[theme];
  const fond = COULEUR_THEME_TIMBRE[theme];
  // Dentelure : 8 dents par côté, dessinées par des cercles blancs sur le bord.
  const dents: string[] = [];
  for (let i = 0; i < 8; i++) {
    const p = 6.25 + i * 12.5;
    dents.push(`<circle cx="${p}" cy="0" r="4"/>`, `<circle cx="${p}" cy="100" r="4"/>`, `<circle cx="0" cy="${p}" r="4"/>`, `<circle cx="100" cy="${p}" r="4"/>`);
  }
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "grid", placeItems: "center" }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} aria-hidden>
        <rect x="0" y="0" width="100" height="100" fill="var(--paper-100)" />
        <g fill="var(--wood-light)" dangerouslySetInnerHTML={{ __html: dents.join("") }} />
        <rect x="9" y="9" width="82" height="82" fill={fond} stroke={getRarityColors(piece.rarete).outer} strokeWidth="2" />
        <text x="88" y="88" fontSize="11" textAnchor="end" fill="#fff" fontFamily="var(--font-display)">{piece.ordre + 1}</text>
      </svg>
      <Icone size={28} color="#fff" style={{ position: "relative" }} />
    </div>
  );
}
```

- [ ] **Step 5 : Lancer** — les deux fichiers de test + tsc + `npx eslint src/components/pieces src/lib/pieceImages.ts` → PASS.
- [ ] **Step 6 : Commit** — `git add src/lib/pieceImages.ts src/lib/pieceImages.test.ts src/components/pieces && git commit -m "feat(albums): visuels provisoires des cartes et timbres"`

---

### Task 5 : Tirage d'une pièce en session de chine

**Files:**
- Modify: `src/lib/chine.ts` (`genererSession`, nouvelle `instancierPiece`, constante), `src/lib/simulation/niveauSim.ts:417,753` (filtre)
- Test: `src/lib/chine.test.ts`

**Interfaces:**
- Produces: `CHANCE_PIECE_PAR_SESSION: Record<1|2|3|4, number> = {1: 0.35, 2: 0.45, 3: 0.55, 4: 0.65}`, `instancierPiece(piece: PieceCollection, tendances, tier, brocante?): ObjetEnVente` (état forcé « Très bon », `prixReferenceReel = prixRefBase`), `genererSession(..., exclus?, rngPiece: () => number = Math.random)` — 6ᵉ paramètre optionnel, injectable pour les tests.

- [ ] **Step 1 : Tests** (ajouter à `src/lib/chine.test.ts`)

```ts
import { estPiece } from "@/data/pieces";
import { CHANCE_PIECE_PAR_SESSION, genererRemplacement, genererSession } from "@/lib/chine";
import { createMockBrocante } from "@/lib/__test-fixtures__/gameState";

describe("pièces d'album en session", () => {
  const b = createMockBrocante({ tier: 2, taillePool: 8 });
  it("au plus une pièce, à la place d'un objet, quand le tirage dit oui", () => {
    const s = genererSession(8, [], b, null, undefined, () => 0.0); // 0 < chance → pièce
    const pieces = s.filter((it) => estPiece(it.objet.templateId));
    expect(pieces).toHaveLength(1);
    expect(s).toHaveLength(8);
    expect(pieces[0].objet.etat).toBe("Très bon");
    expect(pieces[0].objet.categorie).toMatch(/Jeux & Loisirs|Livres & Papeterie/);
  });
  it("aucune pièce quand le tirage dit non", () => {
    const s = genererSession(8, [], b, null, undefined, () => 0.99);
    expect(s.some((it) => estPiece(it.objet.templateId))).toBe(false);
  });
  it("chances croissantes par tier", () => {
    expect(CHANCE_PIECE_PAR_SESSION).toEqual({ 1: 0.35, 2: 0.45, 3: 0.55, 4: 0.65 });
  });
  it("la Fouille ne tire jamais de pièce", () => {
    const s = genererSession(8, [], b, null, undefined, () => 0.0);
    for (let i = 0; i < 40; i++) {
      const r = genererRemplacement(s[0], s, [], b);
      expect(estPiece(r.objet.templateId)).toBe(false);
    }
  });
  it("une bourse à thème propose aussi la pièce", () => {
    const s = genererSession(8, [], createMockBrocante({ tier: 2, taillePool: 8, specialisation: "Mode" }), null, undefined, () => 0.0);
    expect(s.filter((it) => estPiece(it.objet.templateId))).toHaveLength(1);
  });
});
```

- [ ] **Step 2 : Lancer, échec** — `npx vitest run --maxWorkers=4 src/lib/chine.test.ts` → FAIL.

- [ ] **Step 3 : Implémenter** dans `src/lib/chine.ts`

```ts
import { CATEGORIE_ALBUM, type PieceCollection } from "@/data/pieces";
import { tirerPiece } from "@/lib/albums";

/** Chance qu'UNE pièce d'album (carte ou timbre, 50/50) prenne un emplacement de la session. */
export const CHANCE_PIECE_PAR_SESSION: Record<1 | 2 | 3 | 4, number> = { 1: 0.35, 2: 0.45, 3: 0.55, 4: 0.65 };

/** Une pièce d'album sur l'étal : état forcé « Très bon » (pas de restauration), négo et persona comme un objet. */
export function instancierPiece(piece: PieceCollection, tendances: readonly Tendance[], tier: 1 | 2 | 3 | 4 = 1, brocante?: Brocante): ObjetEnVente {
  const template: ObjetTemplate = {
    templateId: piece.id, nom: piece.nom, categorie: CATEGORIE_ALBUM[piece.album],
    rarete: piece.rarete, prixRefBase: piece.prixRefBase, taille: "XS",
  };
  return instancier(template, tendances, tier, brocante, { etat: "Très bon" });
}
```

Dans `genererSession`, ajouter le paramètre `rngPiece: () => number = Math.random` après `exclus`, et juste avant `return items;` :

```ts
  // Pièce d'album : ≤ 1 par session, à la place d'un objet tiré (la taille ne
  // bouge pas), position uniforme. Indépendante de l'emplacement exclusif et
  // du thème de la bourse — c'est un petit extra du vendeur.
  const tier = brocante?.tier ?? 1;
  if (items.length > 0 && rngPiece() < CHANCE_PIECE_PAR_SESSION[tier]) {
    const album = rngPiece() < 0.5 ? "classeur" : "timbres";
    const idx = Math.min(items.length - 1, Math.floor(rngPiece() * items.length));
    items[idx] = instancierPiece(tirerPiece(album, rngPiece), tendances, tier, brocante);
  }
```

`genererRemplacement` et `genererSessionScriptee` ne changent pas (ils ne passent jamais par ce bloc). Dans `niveauSim.ts`, aux deux appels : `.filter((it) => !estPiece(it.objet.templateId))` (import `estPiece`).

- [ ] **Step 4 : Lancer** — `npx vitest run --maxWorkers=4 src/lib/chine.test.ts src/lib/simulation && npx tsc --noEmit -p .` → PASS.
- [ ] **Step 5 : Commit** — `git add src/lib/chine.ts src/lib/chine.test.ts src/lib/simulation/niveauSim.ts && git commit -m "feat(albums): une pièce d'album au plus par session de chine"`

---

### Task 6 : Aiguillage de l'achat (pure + GameContext)

**Files:**
- Modify: `src/lib/albums.ts` (ajout `acheterPiece`), `src/context/GameContext.tsx:863-885` (`acheterObjet`), `src/lib/i18n/ui/{fr,en,es,el}.ts` (section `raisons`)
- Test: `src/lib/albums.test.ts`

**Interfaces:**
- Produces: `acheterPiece(state: GameState, objet: Objet, prix: number): { ok: true; state: GameState } | { ok: false; raison: "albumManquant" | "budget" }` ; `GameContext.acheterObjet` inchangé de signature, mais pour une pièce : refuse `raisonLocalisee("albumManquant")` si l'album n'est pas acheté, sinon débite et `ajouterPiece` (pas de contrôle de réserve).
- Clés i18n `raisons.albumManquant` : FR « Il vous faut d'abord le classeur ou l'album — en vente au Bazar. », EN "You need the binder or the album first — on sale at the Bazaar.", ES "Necesitas primero el clasificador o el álbum — a la venta en el Bazar.", EL "Χρειάζεστε πρώτα το ντοσιέ ή το άλμπουμ — πωλείται στο Παζάρι."

- [ ] **Step 1 : Test** (dans `src/lib/albums.test.ts`)

```ts
describe("acheterPiece", () => {
  const objet = createMockObjet({ templateId: "timbre.renard_roux", categorie: "Livres & Papeterie", prixReferenceReel: 10 });
  it("refuse sans album", () => {
    const r = acheterPiece(createMockGameState({ budget: 100 }), objet, 8);
    expect(r).toEqual({ ok: false, raison: "albumManquant" });
  });
  it("refuse sans budget", () => {
    const a = { ...initAlbums(), timbres: { ...initAlbums().timbres, achete: true } };
    expect(acheterPiece(createMockGameState({ budget: 5, albums: a }), objet, 8)).toEqual({ ok: false, raison: "budget" });
  });
  it("débite et range dans l'album, sans toucher à la réserve", () => {
    const a = { ...initAlbums(), timbres: { ...initAlbums().timbres, achete: true } };
    const r = acheterPiece(createMockGameState({ budget: 100, albums: a }), objet, 8);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.budget).toBe(92);
    expect(r.state.albums!.timbres.pieces["timbre.renard_roux"]).toBe(1);
    expect(r.state.inventaireJoueur).toHaveLength(0);
  });
});
```

- [ ] **Step 2 : Échec attendu**, puis **Step 3 : implémenter** dans `src/lib/albums.ts` :

```ts
export type RefusPiece = "albumManquant" | "budget";
export function acheterPiece(state: GameState, objet: Objet, prix: number): { ok: true; state: GameState } | { ok: false; raison: RefusPiece } {
  const album = albumDe(objet.templateId);
  if (!album) return { ok: false, raison: "albumManquant" };
  const albums = albumsDe(state);
  if (!albums[album].achete) return { ok: false, raison: "albumManquant" };
  if (state.budget < prix) return { ok: false, raison: "budget" };
  return { ok: true, state: { ...state, budget: state.budget - prix, albums: ajouterPiece(albums, objet.templateId) } };
}
```

- [ ] **Step 4 : GameContext** — dans `acheterObjet`, avant le contrôle de budget :

```ts
      if (estPiece(objet.templateId)) {
        const pre = acheterPiece(current, objet, prix);
        if (!pre.ok) {
          return pre.raison === "budget"
            ? { ok: false, raison: raisonLocalisee("ilManqueEuros", { n: prix - current.budget }) }
            : { ok: false, raison: raisonLocalisee("albumManquant") };
        }
        setState((prev) => {
          if (!prev) return prev;
          const r = acheterPiece(prev, objet, prix);
          return r.ok ? r.state : prev;
        });
        return { ok: true };
      }
```
(imports : `estPiece` de `@/data/pieces`, `acheterPiece` de `@/lib/albums`). Ajouter la clé `albumManquant` dans les 4 dictionnaires (section `raisons`).

- [ ] **Step 5 : Lancer** — `npx vitest run --maxWorkers=4 src/lib/albums.test.ts src/context src/lib/i18n && npx tsc --noEmit -p .` → PASS.
- [ ] **Step 6 : Commit** — `git commit -am "feat(albums): l'achat d'une pièce va dans l'album, refus sans album"` (après `git add` des fichiers touchés).

---

### Task 7 : Chine — verrou « album manquant », tampon, bilan, loupe

**Files:**
- Modify: `src/components/mobile/chine/ChineSlide.tsx` (type `ChineSlide` + `ChineSlideVue`), `src/components/mobile/chine/ChineNegoDrawer.tsx`, `src/app/chiner/[brocanteId]/ClientPage.tsx:300,427,690-730`, `src/components/mobile/bilan/BilanSession.tsx` (`BilanItem`), `src/components/mobile/brocante-pano/ObjetsTrouvablesSheet.tsx:136`, `src/lib/i18n/ui/{fr,en,es,el}.ts` (section `chine`)
- Test: `src/components/mobile/chine/ChineNegoDrawer.test.tsx`, `src/components/mobile/chine/ChineSlide.test.tsx` (créer si absent)

**Interfaces:**
- `ChineSlide` (kind `item`) gagne `albumManquant?: AlbumId | null` ; `ChineSlideVue` : pour une pièce, rend `<PieceVisuel>` à la place d'`ItemSticker`, ignore `plein`, et tamponne `d.chine.tamponClasseurManquant` / `tamponAlbumManquant` si `albumManquant`.
- `ChineNegoDrawer` gagne `verrouAlbum?: AlbumId | null` : si posé, ni Négocier ni Acheter, un `<span style={srOnly}>` avec le libellé du tampon + l'aide `d.chine.albumManquantAide` visible ; `plein` est ignoré pour une pièce (`estPiece(item.objet.templateId)`).
- `BilanItem.album?: AlbumId` → la ligne du bilan ajoute « · {d.bilan.rangeeDansAlbum} ».
- Clés i18n (`chine`) : `tamponClasseurManquant` « Classeur manquant » / "Binder missing" / "Falta el clasificador" / "Λείπει το ντοσιέ" ; `tamponAlbumManquant` « Album manquant » / "Album missing" / "Falta el álbum" / "Λείπει το άλμπουμ" ; `albumManquantAide` « En vente au Bazar » / "On sale at the Bazaar" / "A la venta en el Bazar" / "Πωλείται στο Παζάρι" ; `objetsTrouvablesPieces` « + cartes et timbres à collectionner » / "+ collectible cards and stamps" / "+ cromos y sellos para coleccionar" / "+ κάρτες και γραμματόσημα για συλλογή". (`bilan`) : `rangeeDansAlbum` « rangée dans l'album » / "filed in the album" / "guardada en el álbum" / "τοποθετήθηκε στο άλμπουμ".

- [ ] **Step 1 : Tests** (`ChineNegoDrawer.test.tsx`, reprendre le `render` helper existant du fichier) :

```tsx
it("verrouAlbum : ni Négocier ni Acheter, l'aide « En vente au Bazar » est visible", () => {
  monter({ verrouAlbum: "timbres" }); // adapter au helper du fichier
  expect(screen.queryByRole("button", { name: /négocier/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /acheter/i })).toBeNull();
  expect(screen.getByText("En vente au Bazar")).toBeInTheDocument();
  expect(screen.getByText("Album manquant")).toBeInTheDocument();
});
it("une pièce ignore « Stock plein »", () => {
  monter({ plein: true, item: itemAvec({ templateId: "timbre.renard_roux" }) });
  expect(screen.getByRole("button", { name: /acheter/i })).toBeEnabled();
});
```

`ChineSlide.test.tsx` : rendre `<ChineSlideVue slide={{ kind: "item", item, estRareOuPlus: false, coteConnue: false, albumManquant: "classeur" }} />` avec `item.objet.templateId = "carte.marteau_menuisier"` → `container.querySelector('[data-testid="piece-visuel"]')` non nul et texte « Classeur manquant » présent ; avec `plein` et sans `albumManquant` → pas de « Stock plein ».

- [ ] **Step 2 : Échec attendu.** **Step 3 : Implémenter.**

`ChineSlide.tsx` : type + dans `ChineSlideVue`, `const piece = estPiece(objet.templateId); const bloquePlein = plein && !piece; const verrou = slide.albumManquant ?? null;` ; le sticker :
```tsx
{piece ? (
  <PieceVisuel id={objet.templateId} grise={acquis || vendeurFache || !!verrou} />
) : (
  <ItemSticker ... variant={acquis || vendeurFache || bloquePlein ? "grise" : "normal"} ... />
)}
{(acquis || vendeurFache || bloquePlein || verrou) && (
  <TamponEncreur encre={acquis ? "var(--forest-600)" : "var(--vermillion-500)"}>
    {acquis ? d.chine.tamponVendu : vendeurFache ? d.chine.vendeurFache : verrou ? (verrou === "classeur" ? d.chine.tamponClasseurManquant : d.chine.tamponAlbumManquant) : d.chine.tamponStockPlein}
  </TamponEncreur>
)}
```
`ChineNegoDrawer.tsx` : prop `verrouAlbum`, `const pleinEffectif = plein && !estPiece(item.objet.templateId); const acheterDisabled = acquis || tropCher || pleinEffectif;` ; dans la chaîne de rendu, après `facheInitial`, une branche `verrouAlbum ? (<div style={peekBtnRow}><span style={srOnly}>{libelléTampon}</span><span style={aideVerrou}>{d.chine.albumManquantAide}</span></div>)` où `aideVerrou` = `{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--vermillion-600)", alignSelf: "center" }` ; remplacer `plein ?` par `pleinEffectif ?`.

`ClientPage.tsx` : `const albums = albumsDe(state);` ; `const verrouPour = (it: ObjetEnVente): AlbumId | null => { const a = albumDe(it.objet.templateId); return a && !albums[a].achete ? a : null; };` ; à la construction des slides (ligne ~300) `albumManquant: verrouPour(it)` ; au `<ChineNegoDrawer ... verrouAlbum={verrouPour(item)} />` ; dans `handleAchatAuPrix`, ne pas appeler `marquerDejaPossedeTemplate`/`compterXp("decouvertes")` pour une pièce (`if (!estPiece(it.objet.templateId)) { ... }`), et dans `setAchats` ajouter `album: albumDe(it.objet.templateId) ?? undefined`. `noterDecouverte`/`marquerVuTemplate` sur une pièce : `marquerVu` ne trouve pas le slot → no-op, rien à changer.

`BilanSession.tsx` : `album?: AlbumId` sur `BilanItem` ; dans la ligne d'item, après le nom : `{it.album && <span> · {d.bilan.rangeeDansAlbum}</span>}`.

`ObjetsTrouvablesSheet.tsx` : sous le sous-titre, `<p style={tiersPrecedents} data-testid="trouvables-pieces">{d.chine.objetsTrouvablesPieces}</p>`.

- [ ] **Step 4 : Lancer** — `npx vitest run --maxWorkers=4 src/components/mobile/chine src/components/mobile/bilan src/components/mobile/brocante-pano src/app/chiner && npx tsc --noEmit -p .` → PASS.
- [ ] **Step 5 : Commit** — `feat(albums): verrou sans album en chine, pièce au bilan, ligne de la loupe`

---

### Task 8 : Bazar — logique (étal à 1 lot, albums, paquets)

**Files:**
- Create: `src/lib/bazar/albums.ts`
- Modify: `src/lib/bazar/etal.ts:11` (`NB_LOTS_PIECES = 1`), `src/lib/bazar/achat.ts:24-28` (`AchatBazar`, `RaisonRefus`), `src/context/GameContext.tsx:1087-1120` (`acheterAuBazar`), `src/lib/i18n/ui/*` (`raisons.bazarAlbumDejaAchete`)
- Test: `src/lib/bazar/albums.test.ts`, `src/lib/bazar/etal.test.ts` (adapter « trois lots » → « un lot »), `src/components/bazar/BazarScene.test.tsx` (`ETAL.lotsPieces` à 1 entrée)

**Interfaces:**
- `PRIX_ALBUM = 10`, `PRIX_PAQUET = 5`, `acheterAlbum(state, albumId): ResultatAchat` (refus `"jetons"` ; `"indisponible"` si déjà acheté), `acheterPaquet(state, albumId, rng?): ResultatAchat & { pieces?: string[] }` (refus `"indisponible"` si album non acheté, `"jetons"`), `AchatBazar |= { type: "album"; album: AlbumId } | { type: "paquet"; album: AlbumId }`.
- `GameContext.acheterAuBazar(achat)` renvoie désormais `{ ok: boolean; raison?: string; pieces?: string[] }` (les 3 ids pour la cérémonie). Type `ResultatAchatBazar` dans `ArticleDetailBazar.tsx` élargi de la même façon.

- [ ] **Step 1 : Tests**

```ts
// src/lib/bazar/albums.test.ts
import { describe, expect, it } from "vitest";
import { acheterAlbum, acheterPaquet, PRIX_ALBUM, PRIX_PAQUET } from "@/lib/bazar/albums";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { initAlbums } from "@/lib/albums";

describe("Bazar — albums", () => {
  it("acheterAlbum débite 10 Ƶ et marque l'album acheté ; refuse sans jetons ; refuse un second achat", () => {
    expect(acheterAlbum(createMockGameState({ jetons: 9 }), "classeur")).toEqual({ ok: false, raison: "jetons" });
    const r = acheterAlbum(createMockGameState({ jetons: 12 }), "classeur");
    expect(r.ok && r.state.jetons).toBe(12 - PRIX_ALBUM);
    expect(r.ok && r.state.albums!.classeur.achete).toBe(true);
    expect(r.ok && acheterAlbum(r.state, "classeur")).toEqual({ ok: false, raison: "indisponible" });
  });
  it("acheterPaquet exige l'album, débite 5 Ƶ, range 3 pièces et les renvoie", () => {
    expect(acheterPaquet(createMockGameState({ jetons: 20 }), "timbres")).toEqual({ ok: false, raison: "indisponible" });
    const a = { ...initAlbums(), timbres: { ...initAlbums().timbres, achete: true } };
    const r = acheterPaquet(createMockGameState({ jetons: 20, albums: a }), "timbres", () => 0.2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.jetons).toBe(20 - PRIX_PAQUET);
    expect(r.pieces).toHaveLength(3);
    const total = Object.values(r.state.albums!.timbres.pieces).reduce((s, q) => s + q, 0);
    expect(total).toBe(3);
  });
});
```
`etal.test.ts` : le test « présente trois lots… » devient « présente un lot de pièces » (`toHaveLength(1)`, `NB_LOTS_PIECES === 1`).

- [ ] **Step 2 : Échec.** **Step 3 : Implémenter**

```ts
// src/lib/bazar/albums.ts
import type { GameState } from "@/types/game";
import type { AlbumId } from "@/data/pieces";
import { ajouterPiece, albumsDe, ouvrirPaquet } from "@/lib/albums";
import type { ResultatAchat } from "./achat";

export const PRIX_ALBUM = 10;
export const PRIX_PAQUET = 5;

export function acheterAlbum(state: GameState, albumId: AlbumId): ResultatAchat {
  const albums = albumsDe(state);
  if (albums[albumId].achete) return { ok: false, raison: "indisponible" };
  if (state.jetons < PRIX_ALBUM) return { ok: false, raison: "jetons" };
  return { ok: true, state: { ...state, jetons: state.jetons - PRIX_ALBUM, albums: { ...albums, [albumId]: { ...albums[albumId], achete: true } } } };
}

export function acheterPaquet(state: GameState, albumId: AlbumId, rng: () => number = Math.random): ResultatAchat & { pieces?: string[] } {
  const albums = albumsDe(state);
  if (!albums[albumId].achete) return { ok: false, raison: "indisponible" };
  if (state.jetons < PRIX_PAQUET) return { ok: false, raison: "jetons" };
  const pieces = ouvrirPaquet(albumId, rng).map((p) => p.id);
  const next = pieces.reduce((acc, id) => ajouterPiece(acc, id), albums);
  return { ok: true, state: { ...state, jetons: state.jetons - PRIX_PAQUET, albums: next }, pieces };
}
```
`achat.ts` : étendre `AchatBazar`. `etal.ts` : `NB_LOTS_PIECES = 1` (mettre à jour le commentaire). `GameContext.acheterAuBazar` : `precheck` et updater par `switch (achat.type)` (`"album"` → `acheterAlbum`, `"paquet"` → `acheterPaquet(prev, achat.album, rng)`) ; ⚠ le paquet doit être tiré UNE fois : tirer `const pieces = ouvrirPaquet(...)` hors de l'updater ? Non — l'updater doit rester pur et rejouable. Solution : tirer les 3 ids dans le pré-check (`const pre = acheterPaquet(current, ...)`), puis dans l'updater ré-appliquer avec un rng qui rejoue exactement ces ids : plus simple, exposer `appliquerPaquet(state, albumId, ids: string[]): ResultatAchat` dans `bazar/albums.ts` (mêmes contrôles, `ajouterPiece` des ids donnés) et l'utiliser dans l'updater avec `pre.pieces`. Retourner `{ ok: true, pieces: pre.pieces }`.

- [ ] **Step 4 : Lancer** — `npx vitest run --maxWorkers=4 src/lib/bazar src/components/bazar src/context && npx tsc --noEmit -p .` → PASS (adapter `BazarScene.test.tsx` : `lotsPieces` à un seul lot).
- [ ] **Step 5 : Commit** — `feat(albums): le Bazar vend classeur, album et paquets ; un seul lot de pièces par semaine`

---

### Task 9 : Bazar — scène et fiche (cases 5 et 6)

**Files:**
- Modify: `src/components/bazar/BazarScene.tsx` (props `albums: AlbumsState`, rendu cases 5/6), `src/components/bazar/ArticleDetailBazar.tsx` (`ArticleDetail |= { genre: "album" | "paquet"; album: AlbumId; libelle; prix }`), `src/app/bazar/page.tsx` (passer `albums`), `src/lib/i18n/ui/*` (section `bazar`)
- Test: `src/components/bazar/BazarScene.test.tsx`, `src/components/bazar/ArticleDetailBazar.test.tsx`

**Interfaces:**
- Clés `bazar` : `classeur` « Classeur de cartes » / "Card binder" / "Clasificador de cromos" / "Ντοσιέ καρτών" ; `albumTimbres` « Album de timbres » / "Stamp album" / "Álbum de sellos" / "Άλμπουμ γραμματοσήμων" ; `paquetCartes` « Paquet de 3 cartes » / "Pack of 3 cards" / "Sobre de 3 cromos" / "Πακέτο 3 καρτών" ; `pochetteTimbres` « Pochette de 3 timbres » / "Pouch of 3 stamps" / "Sobre de 3 sellos" / "Φάκελος 3 γραμματοσήμων" ; `albumDescription` « Ouvre une nouvelle collection : les pièces trouvées en brocante s'y rangent d'elles-mêmes. » / "Opens a new collection: pieces found at flea markets file themselves in it." / "Abre una nueva colección: las piezas halladas en el mercadillo se guardan solas." / "Ανοίγει μια νέα συλλογή: τα κομμάτια από το παζάρι τακτοποιούνται μόνα τους." ; `paquetDescription` « 3 pièces au hasard. Les doublons se recyclent en pièces de réparation. » / "3 random pieces. Duplicates recycle into repair parts." / "3 piezas al azar. Los duplicados se reciclan en piezas de reparación." / "3 τυχαία κομμάτια. Τα διπλά ανακυκλώνονται σε ανταλλακτικά."
- Visuels : icônes lucide dans un rond crème (comme `PieceIcon`) : `Album` (classeur), `BookOpen` (album), `Package` (paquet), `Mail` (pochette), taille 48 sur l'étagère, 120 dans la fiche. Fichiers `public/bazar/albums/*.webp` : NON créés dans ce chantier (les icônes sont le placeholder) — quand l'art arrivera, remplacer l'icône par `<img>`.

- [ ] **Step 1 : Tests** (`BazarScene.test.tsx`, avec `monter` étendu d'un paramètre `albums = initAlbums()`) :

```tsx
it("cases 5 et 6 : classeur et album avant achat, paquet et pochette après", () => {
  monter(ETAL, 25, { ok: true }, undefined, initAlbums());
  expect(screen.getByRole("button", { name: /classeur de cartes/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /album de timbres/i })).toBeInTheDocument();
  cleanup();
  const a = initAlbums(); a.classeur.achete = true; a.timbres.achete = true;
  monter(ETAL, 25, { ok: true }, undefined, a);
  expect(screen.getByRole("button", { name: /paquet de 3 cartes/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /pochette de 3 timbres/i })).toBeInTheDocument();
});
it("taper le classeur ouvre la fiche et l'achat envoie { type: 'album', album: 'classeur' }", () => {
  const { onAcheter } = monter(ETAL, 25, { ok: true }, undefined, initAlbums());
  fireEvent.click(screen.getByRole("button", { name: /classeur de cartes/i }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /acheter pour 10/i }));
  expect(onAcheter).toHaveBeenCalledWith({ type: "album", album: "classeur" });
});
```
`ArticleDetailBazar.test.tsx` : une fiche `genre: "paquet"` affiche `paquetDescription` et le bouton « Acheter pour 5 ».

- [ ] **Step 2 : Échec.** **Step 3 : Implémenter** — dans `BazarScene`, remplacer la boucle `etal.lotsPieces.map` par : case 4 = `etal.lotsPieces[0]` (rendu inchangé, `cle="case4"`), puis :

```tsx
{(["classeur", "timbres"] as const).map((album, i) => {
  const achete = albums[album].achete;
  const libelle = album === "classeur" ? (achete ? d.bazar.paquetCartes : d.bazar.classeur) : achete ? d.bazar.pochetteTimbres : d.bazar.albumTimbres;
  const prix = achete ? PRIX_PAQUET : PRIX_ALBUM;
  const Icone = album === "classeur" ? (achete ? Package : Album) : achete ? Mail : BookOpen;
  return (
    <ArticleBazar key={album} cle={i === 0 ? "case5" : "case6"} visuel={<RondArticle><Icone size={28} /></RondArticle>} libelle={libelle}
      onOuvrir={() => setSelection({ detail: { genre: achete ? "paquet" : "album", album, libelle, prix }, achat: achete ? { type: "paquet", album } : { type: "album", album } })} />
  );
})}
```
`RondArticle` : `<span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: "50%", background: "var(--paper-100)", border: "2px solid var(--brass-500)", color: "var(--forest-800)" }}>`. Dans `ArticleDetailBazar`, brancher les deux genres : visuel = même rond en 120 px, sous la plaque un paragraphe `albumDescription` / `paquetDescription` (style `{ fontSize: 13, color: "var(--paper-100)", textAlign: "center", margin: "0 0 14px", textShadow: "0 1px 2px rgba(0,0,0,.6)" }`), pas d'étoiles ; `celebrer()` avec `imageUrl: null`. `page.tsx` : `albums={albumsDe(state)}`.

- [ ] **Step 4 : Lancer** — `npx vitest run --maxWorkers=4 src/components/bazar src/app/bazar && npx tsc --noEmit -p . && npx eslint src/components/bazar` → PASS.
- [ ] **Step 5 : Commit** — `feat(albums): classeur, album et paquets sur la planche du bas du Bazar`

---

### Task 10 : Actions GameContext des albums + `FichePiece` + `ClasseurOverlay`

**Files:**
- Modify: `src/context/GameContext.tsx` (4 actions), `src/lib/i18n/ui/*` (nouvelle section `albums`)
- Create: `src/components/albums/FichePiece.tsx`, `src/components/albums/AlbumShell.tsx`, `src/components/albums/ClasseurOverlay.tsx`
- Test: `src/components/albums/ClasseurOverlay.test.tsx`

**Interfaces:**
- `useGame()` gagne : `recyclerDoublonsAlbum(albumId): number` (retourne n, toast à la charge de l'appelant), `marquerPieceConsultee(id): void`, `poserTimbre(id, page, ligne, x): void`, `rendreTimbreAuBac(id): void`. Chacune = `setState(prev => prev ? f(prev) : prev)` sur `albumsDe(prev)` puis `{ ...prev, albums }` (pour `recycler`, l'appel pur renvoie le state complet ; `n` est lu sur `stateRef.current` avant le setState).
- `AlbumShell({ open, onClose, titre, compteur: { possedees, total }, doublons, onRecycler, children })` : voile `ficheBackdrop` (zIndex 105), carte pleine largeur `min(420px, 94vw)`, en-tête (titre en `plaqueLaiton`, compteur « 12 / 50 », bouton Recycler désactivé à 0, croix), `role="dialog"`, `aria-label={titre}`. Le bouton Recycler ouvre un `ConfirmModal` (`@/components/ui/ConfirmModal`, déjà utilisé par la collection) avec `d.albums.recyclerConfirm` interpolé `{n}`.
- `FichePiece({ id, quantite, onClose, children? })` : `FicheObjet` avec `templateId=id`, `categorie=CATEGORIE_ALBUM`, `nom` localisé (`nomObjet` — voir plus bas), `rarete`, `etat="Très bon"`, `prixMarche={null}`, `prixAchat={null}` ; ⚠ `FicheObjet` rend un `ItemSticker` → pour une pièce il faut `srcOverride` : passer par une prop nouvelle `visuel?: ReactNode` sur `FicheObjet` qui remplace le sticker quand fournie (`<PieceVisuel id={id} />`). Sous la plaque : ligne « {série} · ×{quantite} » quand quantite > 1.
- `ClasseurOverlay({ open, onClose })` : 6 pages 3×3 (`piecesDe("classeur")` en tranches de 9), swipe horizontal (pointer events, seuil 40 px — même valeur que `ItemSwipeDeck`) + boutons ◀ ▶ + points ; pochette : `<PieceVisuel grise={!possede} />`, `?` centré si non possédée, badge `×N` (coin bas droit, laiton) si N > 1, pastille « * » (`newBadge` de `CollectionGrid`) si dans `nouvelles` ; tap sur une possédée → `marquerPieceConsultee` + `FichePiece` ; les 4 dernières pochettes (page 6) rendent `d.albums.aVenir`.
- Nom localisé d'une pièce : étendre `nomObjet` dans `src/lib/i18n/contenu/index.ts` : si `estPiece(id)` et locale ≠ fr → cartes : `OBJETS[locale][getPiece(id).source]` ; timbres : `TIMBRES_TRAD[locale][id]` — nouvelle table `src/lib/i18n/contenu/{en,es,el}/timbres.ts` (50 entrées chacune, à écrire en traduisant les 50 noms de `timbres.ts` ; test de complétude `src/lib/i18n/contenu/timbres.test.ts` : chaque id de `TIMBRES` a une entrée non vide dans les 3 langues).
- Section i18n `albums` (4 langues) : `classeurTitre` « Classeur de cartes », `albumTitre` « Album de timbres », `compteur` « {n} / {total} », `recycler` « Recycler les doublons ({n}) », `recyclerConfirm` « Recycler {n} doublon(s) contre {n} pièce(s) de réparation ? », `recycleFait` « +{n} pièces · {categorie} », `aVenir` « à venir », `pochetteVide` « Pas encore trouvée », `bac` « En vrac », `poserSurLaPage` « Poser sur la page », `pageSuivante` « Page suivante », `pagePrecedente` « Page précédente », `enVenteAuBazar` « En vente au Bazar », `voir` « Voir », `nouveau` « Nouveau ! », `doublon` « ×{n} », `serie` « Série : {serie} », `theme_voyage` « Voyage », `theme_faune` « Faune », `theme_monuments` « Monuments », `theme_celebrites` « Célébrités », `theme_culture-pop` « Culture pop ». EN : "Card binder", "Stamp album", "{n} / {total}", "Recycle duplicates ({n})", "Recycle {n} duplicate(s) for {n} repair part(s)?", "+{n} parts · {categorie}", "coming soon", "Not found yet", "Loose", "Place on the page", "Next page", "Previous page", "On sale at the Bazaar", "View", "New!", "×{n}", "Series: {serie}", "Travel", "Wildlife", "Monuments", "Celebrities", "Pop culture". ES : "Clasificador de cromos", "Álbum de sellos", "{n} / {total}", "Reciclar duplicados ({n})", "¿Reciclar {n} duplicado(s) por {n} pieza(s) de reparación?", "+{n} piezas · {categorie}", "próximamente", "Aún no encontrada", "Sueltos", "Colocar en la página", "Página siguiente", "Página anterior", "A la venta en el Bazar", "Ver", "¡Nuevo!", "×{n}", "Serie: {serie}", "Viajes", "Fauna", "Monumentos", "Famosos", "Cultura pop". EL : "Ντοσιέ καρτών", "Άλμπουμ γραμματοσήμων", "{n} / {total}", "Ανακύκλωση διπλών ({n})", "Ανακύκλωση {n} διπλών για {n} ανταλλακτικά;", "+{n} ανταλλακτικά · {categorie}", "σύντομα", "Δεν βρέθηκε ακόμη", "Χύμα", "Τοποθέτηση στη σελίδα", "Επόμενη σελίδα", "Προηγούμενη σελίδα", "Πωλείται στο Παζάρι", "Προβολή", "Νέο!", "×{n}", "Σειρά: {serie}", "Ταξίδια", "Πανίδα", "Μνημεία", "Διασημότητες", "Ποπ κουλτούρα".

- [ ] **Step 1 : Test** `ClasseurOverlay.test.tsx` (mock `@/context/GameContext` comme `page.test.tsx` de la collection, avec `state.albums` fourni et `recyclerDoublonsAlbum: vi.fn(() => 2)`, `marquerPieceConsultee: vi.fn()`) :

```tsx
it("affiche 9 pochettes par page, le compteur et le badge ×N", () => {
  // albums : classeur acheté, 2 pièces dont une en double
  render(<ClasseurOverlay open onClose={() => {}} />);
  expect(screen.getByText("2 / 50")).toBeInTheDocument();
  expect(document.querySelectorAll('[data-testid="pochette"]')).toHaveLength(9);
  expect(screen.getByText("×2")).toBeInTheDocument();
});
it("page suivante → les 9 pochettes suivantes", () => {
  render(<ClasseurOverlay open onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Page suivante" }));
  expect(screen.getByText("2 / 6")).toBeInTheDocument(); // indicateur de page
});
it("recycler : confirmation puis appel", () => {
  const { recyclerDoublonsAlbum } = mocks;
  render(<ClasseurOverlay open onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /recycler les doublons \(1\)/i }));
  fireEvent.click(screen.getByRole("button", { name: /^recycler/i, hidden: false })); // bouton de confirmation
  expect(recyclerDoublonsAlbum).toHaveBeenCalledWith("classeur");
});
it("tap sur une carte possédée ouvre la fiche et marque la pièce consultée", () => {
  render(<ClasseurOverlay open onClose={() => {}} />);
  fireEvent.click(screen.getAllByTestId("pochette")[0]);
  expect(mocks.marquerPieceConsultee).toHaveBeenCalled();
  expect(screen.getByTestId("fiche-visuel")).toBeInTheDocument();
});
```

- [ ] **Step 2 : Échec.** **Step 3 : Implémenter** (GameContext, i18n, `FicheObjet.visuel`, `nomObjet`, tables timbres, `AlbumShell`, `FichePiece`, `ClasseurOverlay`). Structure du classeur :

```tsx
export function ClasseurOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { d, tr, locale } = useLangue();
  const { state, recyclerDoublonsAlbum, marquerPieceConsultee } = useGame();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [fiche, setFiche] = useState<string | null>(null);
  if (!open || !state) return null;
  const album = albumsDe(state).classeur;
  const pieces = piecesDe("classeur");
  const pages = Math.ceil(pieces.length / 9); // 6
  const tranche = pieces.slice(page * 9, page * 9 + 9);
  const cases = [...tranche, ...Array.from({ length: 9 - tranche.length }, () => null)];
  return (
    <AlbumShell open onClose={onClose} titre={d.albums.classeurTitre}
      compteur={{ possedees: nbPossedees(album), total: 50 }} doublons={doublons(album)}
      onRecycler={() => { const n = recyclerDoublonsAlbum("classeur"); toast(tr(d.albums.recycleFait, { n, categorie: libelleCategorie("Jeux & Loisirs", d) }), { type: "succes" }); }}>
      <div style={grille3x3} data-testid="page-classeur">
        {cases.map((p, i) => p ? (
          <button key={p.id} type="button" data-testid="pochette" style={pochette} disabled={!album.pieces[p.id]}
            aria-label={album.pieces[p.id] ? nomObjet({ templateId: p.id, nom: p.nom }, locale) : d.albums.pochetteVide}
            onClick={() => { marquerPieceConsultee(p.id); setFiche(p.id); }}>
            <PieceVisuel id={p.id} grise={!album.pieces[p.id]} />
            {!album.pieces[p.id] && <span style={pointInterrogation}>?</span>}
            {(album.pieces[p.id] ?? 0) > 1 && <span style={badgeQuantite}>{tr(d.albums.doublon, { n: album.pieces[p.id] })}</span>}
            {album.nouvelles.includes(p.id) && <span style={newBadge} aria-label={d.albums.nouveau}>*</span>}
          </button>
        ) : (<div key={`vide-${i}`} style={{ ...pochette, opacity: 0.4 }}>{d.albums.aVenir}</div>))}
      </div>
      <Pagination page={page} pages={pages} onChange={setPage} d={d} />
      {fiche && <FichePiece id={fiche} quantite={album.pieces[fiche] ?? 0} onClose={() => setFiche(null)} />}
    </AlbumShell>
  );
}
```
Swipe : `onPointerDown/Up` sur la grille, `dx < -40` → page + 1, `dx > 40` → page − 1. `Pagination` : ◀ (aria `pagePrecedente`), « {page+1} / {pages} », ▶ (`pageSuivante`), points. Styles : `grille3x3 = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: 12, background: "var(--forest-800)", borderRadius: 8 }`, `pochette = { position: "relative", aspectRatio: "3 / 4", background: "var(--paper-100)", border: "1px solid var(--brass-500)", borderRadius: 6, padding: 6, display: "grid", placeItems: "center" }`. `FichePiece` s'affiche PAR-DESSUS l'AlbumShell (zIndex 106).

- [ ] **Step 4 : Lancer** — `npx vitest run --maxWorkers=4 src/components/albums src/lib/i18n src/context src/components/ui/FicheObjet.test.tsx && npx tsc --noEmit -p . && npx eslint src/components/albums` → PASS.
- [ ] **Step 5 : Commit** — `feat(albums): classeur de cartes (pages 3×3, fiche, recyclage) et actions du contexte`

---

### Task 11 : `AlbumTimbresOverlay` (lignes aimantées, bac, glisser)

**Files:**
- Create: `src/components/albums/AlbumTimbresOverlay.tsx`, `src/components/albums/albumTimbresLayout.ts`
- Test: `src/components/albums/albumTimbresLayout.test.ts`, `src/components/albums/AlbumTimbresOverlay.test.tsx`

**Interfaces:**
- `albumTimbresLayout.ts` (pur, testable sans DOM) : `TAILLE_TIMBRE = 1 / 6` (fraction de la largeur de page), `HAUTEUR_PAGE_RATIO = 1.3` (page = largeur × 1,3), `yDeLigne(ligne): number` (fraction de hauteur : `(ligne + 0.5) / 5`), `ligneLaPlusProche(yFraction): 0|1|2|3|4`, `xBorne(xFraction): number` (clamp `[TAILLE_TIMBRE/2, 1 − TAILLE_TIMBRE/2]`), `positionDepuisPointeur(rectPage: DOMRectLike, clientX, clientY): { ligne; x } | null` (null si hors page).
- `AlbumTimbresOverlay({ open, onClose })` : `AlbumShell` + page courante (2 pages, ◀ ▶, points), 5 lignes tracées (`div` absolus à `yDeLigne`), timbres posés en absolu (`left: x·100%`, `top: yDeLigne(ligne)·100%`, `translate(-50%,-50%)`, `width: TAILLE_TIMBRE·100%`, `zIndex` = index dans `ordreZ`), bac en bas (`data-testid="bac"`, scroll horizontal) listant les timbres possédés sans placement (avec `×N`, pastille nouveau). Glisser (pointer events + `setPointerCapture`) : fantôme `position: fixed` qui suit le doigt ; au `pointerup` : sur la page → `poserTimbre(id, page, ligne, x)` ; sur le bac → `rendreTimbreAuBac(id)` ; ailleurs → rien. Un `pointerup` sans mouvement (< 6 px) = tap → `marquerPieceConsultee` + `FichePiece` (avec bouton `poserSurLaPage` si le timbre est dans le bac → `premierePlaceLibre`). Le swipe de page est inerte pendant un glisser.

- [ ] **Step 1 : Tests**

```ts
// albumTimbresLayout.test.ts
it("aimante à la ligne la plus proche et borne x à la demi-largeur du timbre", () => {
  expect(ligneLaPlusProche(0.02)).toBe(0);
  expect(ligneLaPlusProche(0.5)).toBe(2);
  expect(ligneLaPlusProche(0.99)).toBe(4);
  expect(xBorne(-1)).toBeCloseTo(1 / 12);
  expect(xBorne(2)).toBeCloseTo(11 / 12);
  const rect = { left: 100, top: 200, width: 300, height: 390 };
  expect(positionDepuisPointeur(rect, 250, 395)).toEqual({ ligne: 2, x: 0.5 });
  expect(positionDepuisPointeur(rect, 50, 395)).toBeNull();
});
```
```tsx
// AlbumTimbresOverlay.test.tsx (GameContext mocké : album timbres acheté, 3 timbres possédés dont 1 posé)
it("les timbres sans placement sont dans le bac, le timbre posé sur sa ligne", () => {
  render(<AlbumTimbresOverlay open onClose={() => {}} />);
  expect(within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")).toHaveLength(2);
  const pose = screen.getByTestId("timbre-pose");
  expect(pose.style.top).toBe("50%"); // ligne 2
});
it("lâcher un timbre du bac sur la page appelle poserTimbre avec la ligne aimantée", () => {
  render(<AlbumTimbresOverlay open onClose={() => {}} />);
  const page = screen.getByTestId("page-timbres");
  page.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 390, right: 300, bottom: 390, x: 0, y: 0, toJSON: () => ({}) });
  const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
  fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
  fireEvent.pointerMove(t, { clientX: 150, clientY: 200, pointerId: 1 });
  fireEvent.pointerUp(t, { clientX: 150, clientY: 200, pointerId: 1 });
  expect(mocks.poserTimbre).toHaveBeenCalledWith(expect.any(String), 0, 2, 0.5);
});
it("un tap sans mouvement ouvre la fiche avec « Poser sur la page »", () => {
  render(<AlbumTimbresOverlay open onClose={() => {}} />);
  const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
  fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
  fireEvent.pointerUp(t, { clientX: 12, clientY: 501, pointerId: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Poser sur la page" }));
  expect(mocks.poserTimbre).toHaveBeenCalledWith(expect.any(String), 0, 0, 0.1);
});
```
⚠ jsdom n'implémente pas `setPointerCapture` : dans le composant, `el.setPointerCapture?.(e.pointerId)` (optionnel), et le test le stubbe si besoin.

- [ ] **Step 2 : Échec.** **Step 3 : Implémenter** (layout pur puis composant ; réutiliser `AlbumShell`, `FichePiece`, `PieceVisuel`). Le fantôme : `<div style={{ position: "fixed", left, top, width: 60, transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 110 }}><PieceVisuel id /></div>`. Les timbres posés portent `data-testid="timbre-pose"` et `data-id`. Le bac : `data-testid="bac"`, items `data-testid="timbre-bac"`. `prefersReducedMotion()` (`@/lib/transitionIris`) : pas de transition sur la pose.

- [ ] **Step 4 : Lancer** — `npx vitest run --maxWorkers=4 src/components/albums && npx tsc --noEmit -p . && npx eslint src/components/albums` → PASS.
- [ ] **Step 5 : Commit** — `feat(albums): album de timbres à lignes aimantées, bac en vrac et glisser-déposer`

---

### Task 12 : Cérémonie d'ouverture de paquet + câblage de la page Bazar

**Files:**
- Create: `src/components/albums/OuverturePaquetOverlay.tsx`
- Modify: `src/app/bazar/page.tsx:24,108` (`handleAcheter`, état `paquetOuvert`, overlays), `src/components/bazar/ArticleDetailBazar.tsx` (`ResultatAchatBazar.pieces?`)
- Test: `src/components/albums/OuverturePaquetOverlay.test.tsx`, `src/app/bazar/page.test.tsx`

**Interfaces:**
- `OuverturePaquetOverlay({ albumId, pieces: string[], quantitesAvant: Record<string, number>, onVoirAlbum, onClose })` : voile zIndex 107 (au-dessus de la fiche d'article), 3 emplacements ; chaque tap (ou 800 ms sans tap, `setTimeout`) retourne la carte suivante (`data-testid="carte-paquet"`, `data-retournee`) ; « Nouveau ! » si `quantitesAvant[id]` est 0/absent, sinon `×{quantitesAvant[id] + occurrences déjà révélées dans ce paquet + 1}` ; `prefersReducedMotion()` → les 3 retournées d'emblée ; boutons « Voir » (→ `onVoirAlbum`) et « Ranger » (`d.albums.ranger` « Ranger » / "Put away" / "Guardar" / "Τακτοποίηση", à ajouter à la section `albums`) → `onClose`.
- `page.tsx` : `handleAcheter` capture `quantitesAvant = { ...albumsDe(state)[album].pieces }` AVANT l'appel, puis si `res.ok && res.pieces` → `setPaquetOuvert({ albumId, pieces: res.pieces, quantitesAvant })`. « Voir » → ferme la cérémonie et ouvre `ClasseurOverlay` ou `AlbumTimbresOverlay` (état `albumOuvert: AlbumId | null`).

- [ ] **Step 1 : Tests**

```tsx
it("retourne une carte par tap, dit Nouveau ! ou ×N, puis propose Voir et Ranger", () => {
  const onVoir = vi.fn(); const onClose = vi.fn();
  render(<OuverturePaquetOverlay albumId="classeur" pieces={["carte.marteau_menuisier", "carte.marteau_menuisier", "carte.risk_1992"]} quantitesAvant={{ "carte.risk_1992": 1 }} onVoirAlbum={onVoir} onClose={onClose} />);
  const cartes = screen.getAllByTestId("carte-paquet");
  expect(cartes.every((c) => c.dataset.retournee === "0")).toBe(true);
  fireEvent.click(cartes[0]);
  expect(cartes[0].dataset.retournee).toBe("1");
  expect(screen.getByText("Nouveau !")).toBeInTheDocument();
  fireEvent.click(cartes[1]);
  expect(screen.getByText("×2")).toBeInTheDocument();
  fireEvent.click(cartes[2]);
  expect(screen.getAllByText("×2")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Voir" }));
  expect(onVoir).toHaveBeenCalled();
});
it("sans tap, une carte se retourne toutes les 800 ms", () => {
  vi.useFakeTimers();
  render(<OuverturePaquetOverlay albumId="timbres" pieces={["timbre.renard_roux", "timbre.lynx_boreal", "timbre.ours_des_pyrenees"]} quantitesAvant={{}} onVoirAlbum={() => {}} onClose={() => {}} />);
  act(() => { vi.advanceTimersByTime(2400); });
  expect(screen.getAllByTestId("carte-paquet").every((c) => c.dataset.retournee === "1")).toBe(true);
  vi.useRealTimers();
});
```
`page.test.tsx` (Bazar) : `acheterAuBazar` mocké renvoyant `{ ok: true, pieces: [...] }` → après le clic sur « Acheter pour 5 » dans la fiche de la pochette, la cérémonie (`role="dialog"`, aria-label `d.albums.ouverture` « Ouverture » / "Opening" / "Apertura" / "Άνοιγμα") est à l'écran.

- [ ] **Step 2 : Échec.** **Step 3 : Implémenter.** Le compteur ×N se calcule au rendu : `quantitesAvant[id] ?? 0` + nombre d'occurrences de `id` parmi les pièces déjà révélées d'index < i, + 1 ; « Nouveau ! » si ce total vaut 1. Retournement : `transform: rotateY(180deg)` 400 ms, dos = rond laiton, face = `<PieceVisuel>` + nom localisé.

- [ ] **Step 4 : Lancer** — `npx vitest run --maxWorkers=4 src/components/albums src/app/bazar src/components/bazar && npx tsc --noEmit -p .` → PASS.
- [ ] **Step 5 : Commit** — `feat(albums): cérémonie d'ouverture des paquets au Bazar`

---

### Task 13 : Entrée Collection (deux tuiles injectées)

**Files:**
- Modify: `src/components/CollectionGrid.tsx` (prop `casesSpeciales`), `src/app/collection/page.tsx`
- Test: `src/components/CollectionGrid.test.tsx` (existant ou à créer), `src/app/collection/page.test.tsx`

**Interfaces:**
- `CollectionGrid` gagne `casesSpeciales?: { key: string; categorie: CategorieObjet; element: ReactNode }[]` : chaque case est insérée en TÊTE de sa catégorie dans la liste aplatie (`slots` est trié par catégorie : insérer avant le premier slot de `categorie`, ou en fin si la catégorie est absente/filtrée hors). Les rangées sont découpées après insertion ; `Rangee` rend `element` tel quel pour une case spéciale (`key`).
- `page.tsx` : construit 2 cases (`key: "album-classeur"` → Jeux & Loisirs, `"album-timbres"` → Livres & Papeterie) avec `<TuileAlbum albumId ... />` : bouton `aspectRatio 1/1`, `data-testid="tuile-album"`, avant achat = cadenas laiton (`Lock` lucide, `var(--brass-500)`) + `aria-label={tr(d.albums.classeurTitre)} — {d.albums.enVenteAuBazar}` et `disabled` ; après = `<Album>/<BookOpen>` + compteur « 12/50 » + pastille `*` si `nouvelles.length > 0` ; tap → `setAlbumOuvert(albumId)` → `<ClasseurOverlay open={albumOuvert === "classeur"} .../>` et `<AlbumTimbresOverlay .../>`. Les compteurs (`comptes`, `totauxParCat`, `valeursParCat`) ne changent pas — ils lisent `state.collection` seulement. Le filtre : la case n'apparaît que si `filtre === null || filtre === categorie`.

- [ ] **Step 1 : Tests** — `page.test.tsx` (mock avec `albums: initAlbums()` puis acheté) :
```tsx
it("montre deux tuiles d'album cadenassées avant achat", () => {
  render(<CollectionPage />);
  const tuiles = screen.getAllByTestId("tuile-album");
  expect(tuiles).toHaveLength(2);
  expect(tuiles[0]).toBeDisabled();
  expect(tuiles[0]).toHaveAttribute("aria-label", expect.stringContaining("En vente au Bazar"));
});
it("après achat, la tuile porte le compteur et ouvre le classeur", () => {
  // mock : classeur acheté avec 3 pièces
  render(<CollectionPage />);
  const t = screen.getAllByTestId("tuile-album")[0];
  expect(t).toHaveTextContent("3/50");
  fireEvent.click(t);
  expect(screen.getByRole("dialog", { name: "Classeur de cartes" })).toBeInTheDocument();
});
```
`CollectionGrid.test.tsx` : avec 2 slots Musique + 2 slots Maison et une case spéciale Maison, l'ordre des cellules rendues est [mus, mus, spéciale, ma, ma].

- [ ] **Step 2 : Échec.** **Step 3 : Implémenter** (insertion : `const cases: Case[] = []; for (const cat of ordreCategories) { push spéciales de cat ; push slots de cat }` où l'ordre des catégories est celui de `CATEGORIES`, en ne gardant que les catégories présentes dans `slots` ou dans `casesSpeciales`). Le collection-tutoriel (`scrollVersTemplateId`, `mainTemplateId`, `PELUCHE_TEMPLATE_ID`) ne concerne que des `CollectionSlot` : ne rien y changer.

- [ ] **Step 4 : Lancer** — `npx vitest run --maxWorkers=4 src/components/CollectionGrid.test.tsx src/app/collection && npx tsc --noEmit -p .` → PASS.
- [ ] **Step 5 : Commit** — `feat(albums): tuiles Classeur et Album dans la collection`

---

### Task 14 : Entrée Bureau (livre de comptes ressuscité + sheet « Mes albums »)

**Files:**
- Restore: `public/qg/carnet.webp` (`git show d9995f44^:public/qg/carnet.webp > public/qg/carnet.webp`)
- Create: `src/components/mobile/qg/QgCarnet.tsx` (reprendre le code de `git show 890a5cc1^:src/components/mobile/qg/QgCarnet.tsx`, aria-label `d.albums.mesAlbums`, sans `tutoMain`), `src/components/mobile/qg/sheets/AlbumsSheet.tsx`
- Modify: `src/app/(qg)/layout.tsx:600-612` (zone 0), états + rendu des overlays ; `src/lib/i18n/ui/*` (`albums.mesAlbums` « Mes albums » / "My albums" / "Mis álbumes" / "Τα άλμπουμ μου", `albums.auBazar` « Au Bazar » / "At the Bazaar" / "En el Bazar" / "Στο Παζάρι")
- Test: `src/components/mobile/qg/sheets/AlbumsSheet.test.tsx`, `src/app/(qg)/layout.test.tsx` (existant : ajouter un cas)

**Interfaces:**
- `AlbumsSheet({ open, onClose, albums: AlbumsState, onOuvrir: (a: AlbumId) => void })` : `FloatingActionBar` avec deux `FloatingActionButton` (`d.albums.classeurTitre`, `d.albums.albumTitre`), `disabled` + suffixe « — Au Bazar » si non acheté.
- Layout : `const albums = albumsDe(state); const unAlbum = albums.classeur.achete || albums.timbres.achete;` ; dans `showQgZone(0)` : `{unAlbum && <QgCarnet onTap={() => { if (tutoActif) return; setAlbumsSheet(true); }} />}` ; états `albumsSheet`, `albumOuvert: AlbumId | null` ; rendu près de `<GazetteSheet>` : `<AlbumsSheet open={albumsSheet} .../>`, `<ClasseurOverlay open={albumOuvert === "classeur"} onClose={() => setAlbumOuvert(null)} />`, `<AlbumTimbresOverlay open={albumOuvert === "timbres"} .../>`. La coordonnée `carnet` existe toujours dans `QG_LAYOUT.objets`.

- [ ] **Step 1 : Tests** — `AlbumsSheet.test.tsx` : ouvert avec seul le classeur acheté → bouton « Classeur de cartes » actif (clic → `onOuvrir("classeur")`), bouton « Album de timbres — Au Bazar » désactivé. `layout.test.tsx` : avec `albums` vides, aucun `img[src="/qg/carnet.webp"]` ; avec le classeur acheté, il est là et son clic ouvre la sheet (texte « Mes albums » / bouton « Classeur de cartes »).

- [ ] **Step 2 : Échec.** **Step 3 : Implémenter.** **Step 4 : Lancer** — `npx vitest run --maxWorkers=4 src/components/mobile/qg "src/app/(qg)" && npx tsc --noEmit -p . && npx eslint src` → PASS.
- [ ] **Step 5 : Commit** — `feat(albums): le livre de comptes revient sur le bureau et ouvre les albums`

---

### Task 15 : Vérification finale, recette locale, mémoire

**Files:**
- Modify (si besoin) : ce qui ressort de la passe complète.
- Memory : `~/.claude/projects/-Users-guillaume-dev-Projet-Broc-V2/memory/classeur-album.md` + ligne dans `MEMORY.md`.

- [ ] **Step 1 : Passe complète**

Run: `npx tsc --noEmit -p . && npx eslint src && npx vitest run --maxWorkers=4`
Expected: 0 erreur, 0 échec. Noter le nombre de tests.

- [ ] **Step 2 : Recette `next dev`** (cf. mémoire « Captures UI contre next dev » : `localhost`, un seul `next dev`) — injecter une save via une page `public/dev-save-*.html` (ignorée par git) avec 30 Ƶ, vérifier à l'œil et en mesurant les rects : Bazar cases 5/6 avant/après achat, cérémonie, classeur (6 pages, ×N, recyclage), album (glisser, aimant, bac, chevauchement), tuiles de collection, livre de comptes au bureau, chine avec pièce (tampon « manquant », puis achat rangé), bilan, loupe. Consigner les défauts trouvés et les corriger (chacun en TDD, commit dédié).

- [ ] **Step 3 : Mémoire** — écrire `classeur-album.md` (type `project`) : branche, état (code livré / recette faite), les décisions non dérivables (albums optionnel, overlays modaux, envol inchangé, 1 lot de pièces/semaine assumé), et ce qui reste (art des 100 pièces + 4 articles Bazar, TestFlight, PR vers `feat/quetes-quotidiennes-variees`). Ajouter la ligne d'index dans `MEMORY.md` (< 200 caractères).

- [ ] **Step 4 : Commit final** — `git add -A && git commit -m "chore(albums): passe finale (lint, tests, recette locale)"` puis `git push -u origin feat/classeur-album` seulement si Guillaume le demande.
