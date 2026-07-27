# Pipeline de Reels marketing — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire, à la commande, des vidéos verticales de ~18 s pour Instagram Reels et TikTok — POV d'un vendeur derrière son étal de brocante — en ne changeant que les objets exposés et le chineur qui se présente.

**Architecture:** Deux étages. Un étage image compose l'étal de l'épisode à partir d'une image de référence figée et des `.webp` réels du catalogue du jeu ; un étage vidéo anime cette image en deux plans de 8 s, le second démarrant sur la dernière image du premier pour que le raccord soit invisible. Toute la logique décidable (lecture du catalogue, résolution d'un épisode, fabrication des prompts, calcul des coûts, construction des commandes ffmpeg) vit dans des modules purs testés ; les appels réseau et les appels ffmpeg sont des coquilles minces qui reçoivent leurs dépendances par injection.

**Tech Stack:** Node ESM (`.mjs`, patron des `scripts/generate-*.mjs` existants), `@google/genai` 2.6.0 (`gemini-3-pro-image` pour l'image, `veo-3.1-*` pour la vidéo), `ffmpeg` (CLI), Vitest pour les tests.

**Spec de référence :** `docs/superpowers/specs/2026-07-27-pipeline-reels-marketing-design.md`

## Global Constraints

- **Rien sous `public/`.** Toutes les sorties vont dans `marketing/reels/` à la racine, pour ne pas entrer dans le bundle iOS.
- **Langue :** commentaires, messages console et contenu éditorial en français ; les prompts envoyés aux modèles en anglais, comme dans tous les `scripts/generate-*.mjs` existants.
- **Clé API :** `GEMINI_API_KEY` lue depuis `.env` par un chargeur maison (pas de dépendance `dotenv`), exactement comme `scripts/generate-brocante-scenes.mjs:39`.
- **Palier vidéo par défaut :** `lite` en `720p`. `--model=fast --hd` pour la prise finale.
- **Une prise vidéo payée n'est jamais écrasée** : numérotation `takeN` croissante.
- **`--force` ne s'applique qu'aux images**, jamais aux vidéos.
- **Durées :** 8 s par plan, 2 plans, carte de fin de 2 s, sortie 1080 × 1920.
- **Test runner :** `npm run test:run` (Vitest). Aucun test ne doit appeler le réseau ni `ffmpeg`.

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `scripts/reels-prompts.json` | Le contenu : blocs de style figés + épisodes. Le seul fichier édité au quotidien. |
| `scripts/reels/config.mjs` | Chemins, identifiants de modèles, grille tarifaire, constantes de durée. Aucune logique. |
| `scripts/reels/catalogue.mjs` | Lecture de `docs/items-catalogue.csv` (pur). |
| `scripts/reels/episode.mjs` | Résolution d'un épisode brut en épisode complet (pur). |
| `scripts/reels/prompts.mjs` | Fabrication des trois prompts : étal, plan 1, plan 2 (pur). |
| `scripts/reels/couts.mjs` | Estimation des coûts et formatage (pur). |
| `scripts/reels/cli.mjs` | Analyse de `process.argv` (pur). |
| `scripts/reels/images.mjs` | Appel image Gemini, client injecté. |
| `scripts/reels/video.mjs` | Appel Veo + sondage de l'opération + numérotation des prises, client injecté. |
| `scripts/reels/ffmpeg.mjs` | Construction des lignes de commande ffmpeg (pur) + exécution. |
| `scripts/generate-reels.mjs` | Coquille CLI : orchestration, journaux, confirmations. |
| `scripts/reels/*.test.mjs` | Les tests, à côté de chaque module. |

Chaque module pur est importable sans effet de bord : aucun `process.exit`, aucun accès disque au chargement.

---

### Task 1 : Socle — arborescence, contenu et filet de tests

**Files:**
- Create: `scripts/reels-prompts.json`
- Create: `scripts/reels/config.mjs`
- Create: `scripts/reels/config.test.mjs`
- Modify: `vitest.config.ts:11` (champ `include`)
- Modify: `package.json` (section `scripts`)
- Create: `marketing/reels/.gitkeep`

**Interfaces:**
- Consumes: rien.
- Produces: `CHEMINS` (objet de chemins absolus), `MODELES`, `TARIFS`, `DUREES`, et le fichier `scripts/reels-prompts.json` dont la forme est `{ decor, camera, ambiance, episodes: [...] }`.

- [ ] **Step 1 : Étendre Vitest aux tests de `scripts/`**

Dans `vitest.config.ts`, remplacer la ligne `include` par :

```ts
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.mjs",
    ],
```

- [ ] **Step 2 : Écrire le test de configuration (il doit échouer)**

Créer `scripts/reels/config.test.mjs` :

```js
import { describe, expect, it } from "vitest";
import { CHEMINS, DUREES, MODELES, TARIFS } from "./config.mjs";

describe("config des reels", () => {
  it("place toutes les sorties sous marketing/, jamais sous public/", () => {
    for (const cle of ["masters", "sorties", "musique"]) {
      expect(CHEMINS[cle]).toContain("/marketing/reels");
      expect(CHEMINS[cle]).not.toContain("/public/");
    }
    expect(CHEMINS.sorties).toContain("/marketing/reels/out");
    expect(CHEMINS.masters).toContain("/marketing/reels/master");
  });

  it("expose les trois paliers vidéo et le modèle image", () => {
    expect(MODELES.video.lite).toBe("veo-3.1-lite-generate-preview");
    expect(MODELES.video.fast).toBe("veo-3.1-fast-generate-preview");
    expect(MODELES.video.pro).toBe("veo-3.1-generate-preview");
    expect(MODELES.image.pro).toBe("gemini-3-pro-image");
  });

  it("tarifie les trois paliers en 720p et 1080p", () => {
    expect(TARIFS.lite["720p"]).toBe(0.05);
    expect(TARIFS.fast["1080p"]).toBe(0.12);
    expect(TARIFS.pro["1080p"]).toBe(0.4);
  });

  it("fixe deux plans de 8 s et une carte de fin de 2 s", () => {
    expect(DUREES.plan).toBe(8);
    expect(DUREES.plans).toBe(2);
    expect(DUREES.carteFin).toBe(2);
  });
});
```

- [ ] **Step 3 : Lancer le test pour vérifier qu'il échoue**

Run: `npm run test:run -- scripts/reels/config.test.mjs`
Expected: FAIL — `Failed to resolve import "./config.mjs"`.

- [ ] **Step 4 : Écrire `scripts/reels/config.mjs`**

```js
/**
 * Constantes de la pipeline de Reels marketing.
 * Aucune logique ici : chemins, modèles, tarifs, durées.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(__dirname, "..", "..");

export const CHEMINS = {
  racine: RACINE,
  env: path.join(RACINE, ".env"),
  contenu: path.join(RACINE, "scripts", "reels-prompts.json"),
  catalogue: path.join(RACINE, "docs", "items-catalogue.csv"),
  personas: path.join(RACINE, "scripts", "clients-prompts.json"),
  itemsImages: path.join(RACINE, "public", "items"),
  masters: path.join(RACINE, "marketing", "reels", "master"),
  sorties: path.join(RACINE, "marketing", "reels", "out"),
  musique: path.join(RACINE, "marketing", "reels", "musique"),
  icone: path.join(RACINE, "public", "icon-512.png"),
  policeTitre: path.join(RACINE, "public", "fonts", "VerveShadow.ttf"),
  policeSousTitre: "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
};

export const MODELES = {
  image: {
    pro: "gemini-3-pro-image",
    flash: "gemini-2.5-flash-image",
  },
  video: {
    lite: "veo-3.1-lite-generate-preview",
    fast: "veo-3.1-fast-generate-preview",
    pro: "veo-3.1-generate-preview",
  },
};

/** Dollars par seconde de vidéo, audio inclus. Relevé le 2026-07-27 sur
 *  https://ai.google.dev/gemini-api/docs/pricing — à recaler si Google bouge. */
export const TARIFS = {
  lite: { "720p": 0.05, "1080p": 0.08 },
  fast: { "720p": 0.1, "1080p": 0.12 },
  pro: { "720p": 0.4, "1080p": 0.4 },
};

/** Dollars par image générée, même relevé. */
export const TARIFS_IMAGE = { pro: 0.134, flash: 0.039 };

export const DUREES = {
  plan: 8,
  plans: 2,
  carteFin: 2,
  fonduAudio: 0.2,
};

/** Chutes par défaut quand l'épisode déclare `"chute": "auto"`. */
export const CHUTES_AUTO = {
  marchande: "Vous auriez accepté ?",
  repart: "Trop cher ? Ou l'affaire du jour ?",
  // `achete` est calculée à partir de la cote de l'objet vedette.
};
```

- [ ] **Step 5 : Relancer le test**

Run: `npm run test:run -- scripts/reels/config.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 6 : Écrire le contenu `scripts/reels-prompts.json`**

Les blocs `decor`, `camera` et `ambiance` sont la direction artistique figée de toute la série. Écrire **exactement** ceci :

```json
{
  "decor": "Vintage Art Déco illustration in a museum catalog style, the same visual language as the rest of the game: elegant sepia ink line-art with soft forest-green colour wash on warm cream parchment, warm sepia / forest green / brass / warm wood palette, subtle paper grain across the whole image, soft directional light, no neon, no high-saturation colour. PORTRAIT 9:16 vertical canvas, bleeding edge to edge on all four sides, no border, no vignette, no frame, no text, no watermark, no UI element. SUBJECT: a first-person view from BEHIND a flea-market stall, as seen by the stallholder standing at their own table. Composition, bottom to top: the bottom 25 % is the near edge of the trestle table seen in three-quarter high angle — a faded striped cloth, a small open cash tin, and the stallholder's own shoulders and forearms entering the frame as dark out-of-focus silhouettes in the two bottom corners; the next 45 % is the table top where the goods for sale are laid out on the cloth; the next 20 % is EMPTY STANDING SPACE just beyond the table, at chest height, where a visitor will later stand; the top 10 % is the street of the flea market — neighbouring stalls, plane trees, plain Haussmann-style façades, a few distant strollers. The empty standing space beyond the table must be left clear of any person and any object.",
  "camera": "The camera is LOCKED OFF on a tripod: absolutely no pan, no tilt, no zoom, no dolly, no handheld shake, no re-framing, no rack focus, no cut. The framing is identical for the whole shot and identical to the input image. The stallholder is never seen: their forearms stay motionless in the bottom corners and they never step into frame. Keep the exact same illustration style, palette, line quality and paper grain as the input image. Do not add text, captions, subtitles, logos or UI elements to the picture.",
  "ambiance": "Ambient sound bed, constant and identical throughout: the muffled hubbub of a Sunday neighbourhood flea market — distant chatter, footsteps on gravel, a bicycle bell far away, occasional clink of coins. Low, steady, no music, no sudden change in density or level.",
  "episodes": [
    {
      "id": "ep01-aquarelle",
      "items": [
        "art.aquarelle_marine_xixe",
        "mus.violon_atelier_mirecourt",
        "lv.cartes_postales_anciennes"
      ],
      "vedette": "art.aquarelle_marine_xixe",
      "acheteur": "a French woman in her thirties, faded denim jacket, loose bun, round glasses, canvas tote bag on her shoulder, curious and friendly",
      "fond": "autumn morning, low raking light, two strollers passing in the distance",
      "accroche": "Elle vaut combien, à votre avis ?",
      "plan1": {
        "action": "she steps up to the table, picks up the marine watercolour with both hands and tilts it towards the light to read the signature",
        "demande": "Elle est signée, celle-là… vous en voulez combien ?",
        "prix": "Quarante euros."
      },
      "plan2": {
        "denouement": "marchande",
        "action": "she lays the watercolour back down on the cloth, folds her arms and tilts her head with a half-smile",
        "replique": "Vingt-cinq, et je la prends tout de suite."
      },
      "chute": "auto"
    }
  ]
}
```

- [ ] **Step 7 : Ajouter le script npm et le dossier de sortie**

Dans `package.json`, à la suite des autres `gen:*` :

```json
    "gen:reels": "node scripts/generate-reels.mjs",
```

Puis :

```bash
mkdir -p marketing/reels/master marketing/reels/out marketing/reels/musique
touch marketing/reels/.gitkeep
```

- [ ] **Step 8 : Vérifier que la suite complète passe toujours**

Run: `npm run test:run`
Expected: PASS — les tests existants du projet plus les 4 nouveaux.

- [ ] **Step 9 : Commit**

```bash
git add vitest.config.ts package.json scripts/reels-prompts.json scripts/reels/config.mjs scripts/reels/config.test.mjs marketing/reels/.gitkeep
git commit -m "feat(reels): socle de la pipeline marketing (config, contenu, filet de tests)"
```

---

### Task 2 : Lecture du catalogue d'objets

**Files:**
- Create: `scripts/reels/catalogue.mjs`
- Create: `scripts/reels/catalogue.test.mjs`

**Interfaces:**
- Consumes: rien (module pur, reçoit le texte du CSV).
- Produces:
  - `analyserCsv(texte) -> string[][]` — découpe RFC-4180 avec séparateur `;`.
  - `chargerCatalogue(texte) -> Map<string, { id, nom, categorie, rarete, prixTresBon }>`.

Le CSV réel commence par un BOM UTF-8 et contient des champs entre guillemets avec guillemets doublés (`docs/items-catalogue.csv:337`) : le découpage naïf par `split(";")` est faux.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `scripts/reels/catalogue.test.mjs` :

```js
import { describe, expect, it } from "vitest";
import { analyserCsv, chargerCatalogue } from "./catalogue.mjs";

const ENTETE =
  "templateId;nom;categorie;rarete;unique;tierMin;prix_Mauvais;prix_Bon;prix_TresBon;prix_PristinEtat";

describe("analyserCsv", () => {
  it("retire le BOM de la première cellule", () => {
    const lignes = analyserCsv("\uFEFF" + ENTETE);
    expect(lignes[0][0]).toBe("templateId");
  });

  it("découpe une ligne simple", () => {
    const texte = `${ENTETE}\nart.aquarelle_marine_xixe;Aquarelle marine du XIXe;Objets d'art;commun;;2;11;21;35;49`;
    expect(analyserCsv(texte)[1]).toEqual([
      "art.aquarelle_marine_xixe",
      "Aquarelle marine du XIXe",
      "Objets d'art",
      "commun",
      "",
      "2",
      "11",
      "21",
      "35",
      "49",
    ]);
  });

  it("respecte les champs entre guillemets et les guillemets doublés", () => {
    const texte = `${ENTETE}\nuniq.mus.violon_paganini;"Violon ""Il Cannone"" de Paganini";Musique;legendaire;oui;;2700;5400;9000;12600`;
    expect(analyserCsv(texte)[1][1]).toBe('Violon "Il Cannone" de Paganini');
  });

  it("tolère les fins de ligne Windows et les lignes vides", () => {
    const texte = `${ENTETE}\r\nbr.marteau_menuisier;Marteau;Bricolage;commun;;1;2;5;8;11\r\n\r\n`;
    const lignes = analyserCsv(texte);
    expect(lignes).toHaveLength(2);
    expect(lignes[1][0]).toBe("br.marteau_menuisier");
  });
});

describe("chargerCatalogue", () => {
  const texte = `\uFEFF${ENTETE}\nart.aquarelle_marine_xixe;Aquarelle marine du XIXe;Objets d'art;commun;;2;11;21;35;49`;

  it("indexe les objets par templateId", () => {
    const catalogue = chargerCatalogue(texte);
    expect(catalogue.get("art.aquarelle_marine_xixe")).toEqual({
      id: "art.aquarelle_marine_xixe",
      nom: "Aquarelle marine du XIXe",
      categorie: "Objets d'art",
      rarete: "commun",
      prixTresBon: 35,
    });
  });

  it("expose la cote comme un nombre, pas une chaîne", () => {
    const cote = chargerCatalogue(texte).get("art.aquarelle_marine_xixe").prixTresBon;
    expect(typeof cote).toBe("number");
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npm run test:run -- scripts/reels/catalogue.test.mjs`
Expected: FAIL — `Failed to resolve import "./catalogue.mjs"`.

- [ ] **Step 3 : Écrire l'implémentation**

Créer `scripts/reels/catalogue.mjs` :

```js
/**
 * Lecture de docs/items-catalogue.csv.
 * Module pur : il reçoit le texte du fichier, il ne le lit pas lui-même.
 */

/**
 * Découpage CSV avec séparateur « ; », champs éventuellement entre
 * guillemets doubles, guillemet littéral échappé en le doublant.
 * Le BOM UTF-8 éventuel est retiré.
 */
export function analyserCsv(texte) {
  const source = texte.replace(/^\uFEFF/, "");
  const lignes = [];
  let cellules = [];
  let cellule = "";
  let entreGuillemets = false;

  for (let i = 0; i < source.length; i++) {
    const c = source[i];

    if (entreGuillemets) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          cellule += '"';
          i++;
        } else {
          entreGuillemets = false;
        }
      } else {
        cellule += c;
      }
      continue;
    }

    if (c === '"') {
      entreGuillemets = true;
    } else if (c === ";") {
      cellules.push(cellule);
      cellule = "";
    } else if (c === "\n") {
      cellules.push(cellule);
      lignes.push(cellules);
      cellules = [];
      cellule = "";
    } else if (c !== "\r") {
      cellule += c;
    }
  }

  if (cellule !== "" || cellules.length > 0) {
    cellules.push(cellule);
    lignes.push(cellules);
  }

  // Une ligne vide donne une unique cellule vide : on l'écarte.
  return lignes.filter((l) => l.some((cel) => cel !== ""));
}

/**
 * Indexe le catalogue par templateId. Seules les colonnes utiles à la
 * pipeline sont retenues — la cote « très bon état » sert aux chutes.
 */
export function chargerCatalogue(texte) {
  const [entete, ...corps] = analyserCsv(texte);
  const colonne = (nom) => entete.indexOf(nom);
  const iId = colonne("templateId");
  const iNom = colonne("nom");
  const iCategorie = colonne("categorie");
  const iRarete = colonne("rarete");
  const iCote = colonne("prix_TresBon");

  const catalogue = new Map();
  for (const ligne of corps) {
    const id = ligne[iId];
    if (!id) continue;
    catalogue.set(id, {
      id,
      nom: ligne[iNom],
      categorie: ligne[iCategorie],
      rarete: ligne[iRarete],
      prixTresBon: Number(ligne[iCote]),
    });
  }
  return catalogue;
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npm run test:run -- scripts/reels/catalogue.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5 : Vérifier sur le vrai fichier**

Run:
```bash
node -e "
import('./scripts/reels/catalogue.mjs').then(async (m) => {
  const fs = await import('node:fs/promises');
  const c = m.chargerCatalogue(await fs.readFile('docs/items-catalogue.csv', 'utf8'));
  console.log(c.size, c.get('art.aquarelle_marine_xixe'), c.get('uniq.mus.violon_paganini').nom);
});
"
```
Expected: `392` objets, l'aquarelle avec `prixTresBon: 35`, et le nom du violon avec ses guillemets internes intacts.

- [ ] **Step 6 : Commit**

```bash
git add scripts/reels/catalogue.mjs scripts/reels/catalogue.test.mjs
git commit -m "feat(reels): lecture du catalogue d'objets"
```

---

### Task 3 : Résolution d'un épisode

**Files:**
- Create: `scripts/reels/episode.mjs`
- Create: `scripts/reels/episode.test.mjs`

**Interfaces:**
- Consumes: `chargerCatalogue` (Task 2), `CHUTES_AUTO` et `CHEMINS.itemsImages` (Task 1).
- Produces: `resoudreEpisode(brut, { catalogue, personas, fichierExiste }) -> EpisodeResolu` avec

```js
{
  id: string,
  items: [{ id, nom, prixTresBon, fichier }],   // fichier = chemin absolu du .webp
  vedette: { id, nom, prixTresBon, fichier },
  acheteur: string,                              // description en anglais, résolue
  fond: string,
  accroche: string,
  plan1: { action, demande, prix },
  plan2: { denouement, action, replique },
  chute: string,                                 // toujours résolue, jamais "auto"
}
```

`fichierExiste` est une fonction `(chemin) => boolean` injectée, pour que le module reste pur et testable sans disque.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `scripts/reels/episode.test.mjs` :

```js
import { describe, expect, it } from "vitest";
import { resoudreEpisode } from "./episode.mjs";

const catalogue = new Map([
  ["art.aquarelle_marine_xixe", { id: "art.aquarelle_marine_xixe", nom: "Aquarelle marine du XIXe", categorie: "Objets d'art", rarete: "commun", prixTresBon: 35 }],
  ["lv.cartes_postales_anciennes", { id: "lv.cartes_postales_anciennes", nom: "Cartes postales anciennes (boîte)", categorie: "Livres & Papeterie", rarete: "commun", prixTresBon: 9 }],
]);

const personas = new Map([
  ["retraite_chineur", "an elderly French retired man in his 70s, flat wool cap"],
]);

const toutExiste = () => true;

function brut(surcharge = {}) {
  return {
    id: "ep01",
    items: ["art.aquarelle_marine_xixe", "lv.cartes_postales_anciennes"],
    vedette: "art.aquarelle_marine_xixe",
    acheteur: "a French woman in her thirties, denim jacket",
    fond: "autumn morning",
    accroche: "Elle vaut combien ?",
    plan1: { action: "she picks it up", demande: "Vous en voulez combien ?", prix: "Quarante euros." },
    plan2: { denouement: "marchande", action: "she folds her arms", replique: "Vingt-cinq." },
    chute: "auto",
    ...surcharge,
  };
}

describe("resoudreEpisode", () => {
  it("associe chaque objet à son fichier .webp", () => {
    const r = resoudreEpisode(brut(), { catalogue, personas, fichierExiste: toutExiste });
    expect(r.items).toHaveLength(2);
    expect(r.items[0].nom).toBe("Aquarelle marine du XIXe");
    expect(r.items[0].fichier).toMatch(/public\/items\/art\.aquarelle_marine_xixe\.webp$/);
  });

  it("désigne l'objet vedette", () => {
    const r = resoudreEpisode(brut(), { catalogue, personas, fichierExiste: toutExiste });
    expect(r.vedette.id).toBe("art.aquarelle_marine_xixe");
    expect(r.vedette.prixTresBon).toBe(35);
  });

  it("refuse un objet absent du catalogue en le nommant", () => {
    const ko = brut({ items: ["art.inexistant"], vedette: "art.inexistant" });
    expect(() => resoudreEpisode(ko, { catalogue, personas, fichierExiste: toutExiste })).toThrow(
      /art\.inexistant.*catalogue/i,
    );
  });

  it("refuse un objet sans image en le nommant", () => {
    expect(() =>
      resoudreEpisode(brut(), { catalogue, personas, fichierExiste: () => false }),
    ).toThrow(/art\.aquarelle_marine_xixe.*image/i);
  });

  it("refuse une vedette absente de la liste d'objets", () => {
    const ko = brut({ vedette: "lv.autre_chose" });
    expect(() => resoudreEpisode(ko, { catalogue, personas, fichierExiste: toutExiste })).toThrow(
      /vedette/i,
    );
  });

  it("résout un acheteur donné par identifiant de persona", () => {
    const r = resoudreEpisode(brut({ acheteur: "retraite_chineur" }), {
      catalogue,
      personas,
      fichierExiste: toutExiste,
    });
    expect(r.acheteur).toBe("an elderly French retired man in his 70s, flat wool cap");
  });

  it("garde une description d'acheteur libre telle quelle", () => {
    const r = resoudreEpisode(brut(), { catalogue, personas, fichierExiste: toutExiste });
    expect(r.acheteur).toBe("a French woman in her thirties, denim jacket");
  });

  it("compose la chute automatique d'un achat à partir de la cote", () => {
    const r = resoudreEpisode(brut({ plan2: { denouement: "achete", action: "elle paie", replique: "Je la prends." } }), {
      catalogue,
      personas,
      fichierExiste: toutExiste,
    });
    expect(r.chute).toBe("Valeur réelle : 35 €");
  });

  it("compose la chute automatique d'un marchandage", () => {
    const r = resoudreEpisode(brut(), { catalogue, personas, fichierExiste: toutExiste });
    expect(r.chute).toBe("Vous auriez accepté ?");
  });

  it("compose la chute automatique d'un départ", () => {
    const r = resoudreEpisode(brut({ plan2: { denouement: "repart", action: "elle s'éloigne", replique: "Je vais réfléchir." } }), {
      catalogue,
      personas,
      fichierExiste: toutExiste,
    });
    expect(r.chute).toBe("Trop cher ? Ou l'affaire du jour ?");
  });

  it("laisse une chute écrite à la main intacte", () => {
    const r = resoudreEpisode(brut({ chute: "Et vous, vous auriez cédé ?" }), {
      catalogue,
      personas,
      fichierExiste: toutExiste,
    });
    expect(r.chute).toBe("Et vous, vous auriez cédé ?");
  });

  it("refuse un dénouement inconnu", () => {
    const ko = brut({ plan2: { denouement: "hesite", action: "…", replique: "…" } });
    expect(() => resoudreEpisode(ko, { catalogue, personas, fichierExiste: toutExiste })).toThrow(
      /hesite/,
    );
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npm run test:run -- scripts/reels/episode.test.mjs`
Expected: FAIL — `Failed to resolve import "./episode.mjs"`.

- [ ] **Step 3 : Écrire l'implémentation**

Créer `scripts/reels/episode.mjs` :

```js
/**
 * Résolution d'un épisode brut (tel qu'écrit dans reels-prompts.json) en
 * épisode complet : objets retrouvés dans le catalogue, images localisées,
 * acheteur résolu, chute calculée.
 *
 * Module pur : le catalogue, les personas et le test d'existence de fichier
 * sont injectés.
 */
import path from "node:path";
import { CHEMINS, CHUTES_AUTO } from "./config.mjs";

const DENOUEMENTS = ["marchande", "achete", "repart"];

function resoudreItem(id, { catalogue, fichierExiste }) {
  const fiche = catalogue.get(id);
  if (!fiche) {
    throw new Error(`objet « ${id} » absent du catalogue docs/items-catalogue.csv`);
  }
  const fichier = path.join(CHEMINS.itemsImages, `${id}.webp`);
  if (!fichierExiste(fichier)) {
    throw new Error(`objet « ${id} » sans image : ${fichier} introuvable`);
  }
  return { id, nom: fiche.nom, prixTresBon: fiche.prixTresBon, fichier };
}

function resoudreChute(brut, vedette) {
  if (brut.chute && brut.chute !== "auto") return brut.chute;
  if (brut.plan2.denouement === "achete") {
    return `Valeur réelle : ${vedette.prixTresBon} €`;
  }
  return CHUTES_AUTO[brut.plan2.denouement];
}

export function resoudreEpisode(brut, { catalogue, personas, fichierExiste }) {
  if (!DENOUEMENTS.includes(brut.plan2?.denouement)) {
    throw new Error(
      `dénouement « ${brut.plan2?.denouement} » inconnu : attendu ${DENOUEMENTS.join(", ")}`,
    );
  }

  const items = brut.items.map((id) => resoudreItem(id, { catalogue, fichierExiste }));
  const vedette = items.find((item) => item.id === brut.vedette);
  if (!vedette) {
    throw new Error(
      `vedette « ${brut.vedette} » absente de la liste d'objets de l'épisode ${brut.id}`,
    );
  }

  return {
    id: brut.id,
    items,
    vedette,
    acheteur: personas.get(brut.acheteur) ?? brut.acheteur,
    fond: brut.fond,
    accroche: brut.accroche,
    plan1: { ...brut.plan1 },
    plan2: { ...brut.plan2 },
    chute: resoudreChute(brut, vedette),
  };
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npm run test:run -- scripts/reels/episode.test.mjs`
Expected: PASS (12 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/reels/episode.mjs scripts/reels/episode.test.mjs
git commit -m "feat(reels): resolution d'un episode (objets, acheteur, chute)"
```

---

### Task 4 : Fabrication des prompts

**Files:**
- Create: `scripts/reels/prompts.mjs`
- Create: `scripts/reels/prompts.test.mjs`

**Interfaces:**
- Consumes: `EpisodeResolu` (Task 3), les blocs `{ decor, camera, ambiance }` de `reels-prompts.json`.
- Produces:
  - `promptEtal(episode, blocs) -> string`
  - `promptPlan1(episode, blocs) -> string`
  - `promptPlan2(episode, blocs) -> string`

Trois règles portent le résultat et sont donc testées explicitement : le plan 1 dit que la voix du vendeur est **hors champ**, le plan 2 **ne redécrit jamais le décor** (il part de l'image de raccord), et les deux plans embarquent le **même bloc d'ambiance** pour que les fonds sonores se raccordent.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `scripts/reels/prompts.test.mjs` :

```js
import { describe, expect, it } from "vitest";
import { promptEtal, promptPlan1, promptPlan2 } from "./prompts.mjs";

const blocs = {
  decor: "DECOR-BLOC",
  camera: "CAMERA-BLOC",
  ambiance: "AMBIANCE-BLOC",
};

const episode = {
  id: "ep01",
  items: [
    { id: "a", nom: "Aquarelle marine du XIXe", prixTresBon: 35, fichier: "/tmp/a.webp" },
    { id: "b", nom: "Violon d'atelier", prixTresBon: 320, fichier: "/tmp/b.webp" },
  ],
  vedette: { id: "a", nom: "Aquarelle marine du XIXe", prixTresBon: 35, fichier: "/tmp/a.webp" },
  acheteur: "a French woman in her thirties, denim jacket",
  fond: "autumn morning, low raking light",
  accroche: "Elle vaut combien ?",
  plan1: { action: "she picks it up", demande: "Vous en voulez combien ?", prix: "Quarante euros." },
  plan2: { denouement: "marchande", action: "she folds her arms", replique: "Vingt-cinq." },
  chute: "Vous auriez accepté ?",
};

describe("promptEtal", () => {
  it("injecte le bloc décor et l'ambiance visuelle de l'épisode", () => {
    const p = promptEtal(episode, blocs);
    expect(p).toContain("DECOR-BLOC");
    expect(p).toContain("autumn morning, low raking light");
  });

  it("nomme les objets à poser et les rattache aux images fournies", () => {
    const p = promptEtal(episode, blocs);
    expect(p).toContain("Aquarelle marine du XIXe");
    expect(p).toContain("Violon d'atelier");
    expect(p).toMatch(/attached|reference image/i);
  });

  it("exige que l'espace du visiteur reste vide", () => {
    expect(promptEtal(episode, blocs)).toMatch(/empty|no person/i);
  });
});

describe("promptPlan1", () => {
  it("embarque les blocs caméra et ambiance", () => {
    const p = promptPlan1(episode, blocs);
    expect(p).toContain("CAMERA-BLOC");
    expect(p).toContain("AMBIANCE-BLOC");
  });

  it("décrit l'arrivée du chineur, son geste et sa demande", () => {
    const p = promptPlan1(episode, blocs);
    expect(p).toContain("a French woman in her thirties, denim jacket");
    expect(p).toContain("she picks it up");
    expect(p).toContain("Vous en voulez combien ?");
  });

  it("place la réponse du vendeur en voix hors champ", () => {
    const p = promptPlan1(episode, blocs);
    expect(p).toContain("Quarante euros.");
    expect(p).toMatch(/off-screen|off screen/i);
    expect(p).toMatch(/never (appears|enters)/i);
  });
});

describe("promptPlan2", () => {
  it("embarque les blocs caméra et ambiance, mais jamais le décor", () => {
    const p = promptPlan2(episode, blocs);
    expect(p).toContain("CAMERA-BLOC");
    expect(p).toContain("AMBIANCE-BLOC");
    expect(p).not.toContain("DECOR-BLOC");
  });

  it("annonce une continuité stricte avec l'image d'entrée", () => {
    expect(promptPlan2(episode, blocs)).toMatch(/continu(es|ation)/i);
  });

  it("décrit le marchandage", () => {
    const p = promptPlan2(episode, blocs);
    expect(p).toContain("she folds her arms");
    expect(p).toContain("Vingt-cinq.");
    expect(p).toMatch(/haggl|lower price/i);
  });

  it("décrit un achat quand le dénouement est achete", () => {
    const p = promptPlan2({ ...episode, plan2: { denouement: "achete", action: "she opens her purse", replique: "Je la prends." } }, blocs);
    expect(p).toMatch(/pays|banknotes|purse/i);
  });

  it("décrit un départ quand le dénouement est repart", () => {
    const p = promptPlan2({ ...episode, plan2: { denouement: "repart", action: "she puts it down", replique: "Je vais réfléchir." } }, blocs);
    expect(p).toMatch(/walks (away|out of frame)|leaves/i);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npm run test:run -- scripts/reels/prompts.test.mjs`
Expected: FAIL — `Failed to resolve import "./prompts.mjs"`.

- [ ] **Step 3 : Écrire l'implémentation**

Créer `scripts/reels/prompts.mjs` :

```js
/**
 * Fabrication des trois prompts d'un épisode : l'étal (image), le plan 1 et
 * le plan 2 (vidéo). Module pur.
 */

/** Squelette d'action injecté selon le dénouement du plan 2. */
const SQUELETTES = {
  marchande:
    "The visitor does NOT buy yet: she haggles, offering a clearly lower price, still holding the deal open.",
  achete:
    "The visitor buys: she opens her purse, counts out banknotes and coins, hands them over the table and takes the item away with her.",
  repart:
    "The visitor declines: she puts the item back down on the cloth, gives a polite apologetic smile and walks out of frame to the side, leaving the standing space empty again.",
};

export function promptEtal(episode, blocs) {
  const liste = episode.items
    .map((item, i) => `${i + 1}. ${item.nom}`)
    .join("\n");

  return [
    blocs.decor,
    "",
    `Background variation for this shot: ${episode.fond}.`,
    "",
    "GOODS ON THE TABLE — the attached reference images show, in order, the exact objects to lay out on the cloth. Reproduce each of them faithfully in the illustration style of the scene: same shapes, same colours, same proportions. Arrange them naturally across the table top, slightly overlapping, as a real stallholder would, with the first one placed most prominently and fully visible.",
    liste,
    "",
    "The standing space just beyond the table must stay completely EMPTY: no person, no silhouette, no object there. Nothing must be added in the top street band either.",
  ].join("\n");
}

export function promptPlan1(episode, blocs) {
  return [
    "Animate the attached image. It is the first frame and the framing must never change.",
    blocs.camera,
    "",
    `ACTION: a visitor walks up to the stall and stops behind the table — ${episode.acheteur}. ${episode.plan1.action}. She looks up towards the camera and speaks to the stallholder.`,
    "",
    `DIALOGUE — the visitor says, in French, looking at the camera: "${episode.plan1.demande}"`,
    `Then the stallholder answers, in French: "${episode.plan1.prix}" — this reply is an OFF-SCREEN voice coming from behind the camera. The stallholder never appears, never enters the frame; no character on screen speaks that line and no mouth moves for it.`,
    "",
    blocs.ambiance,
  ].join("\n");
}

export function promptPlan2(episode, blocs) {
  return [
    "Animate the attached image. It is the first frame and it continues the previous shot without any break: same visitor, same clothes, same pose, same objects in the same places, same light. The framing must never change.",
    blocs.camera,
    "",
    `ACTION: ${SQUELETTES[episode.plan2.denouement]} ${episode.plan2.action}.`,
    "",
    `DIALOGUE — the visitor says, in French, looking at the camera: "${episode.plan2.replique}"`,
    "The stallholder does not answer and never appears in frame.",
    "",
    blocs.ambiance,
  ].join("\n");
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npm run test:run -- scripts/reels/prompts.test.mjs`
Expected: PASS (11 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/reels/prompts.mjs scripts/reels/prompts.test.mjs
git commit -m "feat(reels): fabrication des prompts etal, plan 1 et plan 2"
```

---

### Task 5 : Coûts, analyse des arguments, et `--dry-run` de bout en bout

Premier livrable visible : `npm run gen:reels -- --dry-run ep01-aquarelle` affiche les prompts résolus et le coût estimé, sans un octet de réseau.

**Files:**
- Create: `scripts/reels/couts.mjs`
- Create: `scripts/reels/couts.test.mjs`
- Create: `scripts/reels/cli.mjs`
- Create: `scripts/reels/cli.test.mjs`
- Create: `scripts/generate-reels.mjs`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces:
  - `coutClip({ palier, definition, secondes }) -> number` (dollars)
  - `coutEpisode({ palier, definition, plans }) -> number`
  - `formaterDollars(n) -> string` (`"1,30 $"`)
  - `parserArgs(argv) -> { ids, etapes, palier, definition, force, yes, dryRun, plan, take1, take2, verbose }`
  - `chargerContexte()` dans `generate-reels.mjs` : lit `.env`, le contenu, le catalogue, les personas.

- [ ] **Step 1 : Écrire le test des coûts**

Créer `scripts/reels/couts.test.mjs` :

```js
import { describe, expect, it } from "vitest";
import { coutClip, coutEpisode, formaterDollars } from "./couts.mjs";

describe("coutClip", () => {
  it("chiffre un plan de 8 s en lite 720p", () => {
    expect(coutClip({ palier: "lite", definition: "720p", secondes: 8 })).toBeCloseTo(0.4, 5);
  });

  it("chiffre un plan de 8 s en fast 1080p", () => {
    expect(coutClip({ palier: "fast", definition: "1080p", secondes: 8 })).toBeCloseTo(0.96, 5);
  });

  it("chiffre un plan de 8 s en pro", () => {
    expect(coutClip({ palier: "pro", definition: "1080p", secondes: 8 })).toBeCloseTo(3.2, 5);
  });

  it("refuse un palier inconnu en le nommant", () => {
    expect(() => coutClip({ palier: "ultra", definition: "720p", secondes: 8 })).toThrow(/ultra/);
  });

  it("refuse une définition inconnue en la nommant", () => {
    expect(() => coutClip({ palier: "lite", definition: "4k", secondes: 8 })).toThrow(/4k/);
  });
});

describe("coutEpisode", () => {
  it("compte les deux plans", () => {
    expect(coutEpisode({ palier: "fast", definition: "1080p", plans: 2 })).toBeCloseTo(1.92, 5);
  });
});

describe("formaterDollars", () => {
  it("formate à la française avec deux décimales", () => {
    expect(formaterDollars(1.9200001)).toBe("1,92 $");
    expect(formaterDollars(0.4)).toBe("0,40 $");
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run -- scripts/reels/couts.test.mjs`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : Écrire `scripts/reels/couts.mjs`**

```js
/** Estimation des coûts de génération. Module pur. */
import { DUREES, TARIFS } from "./config.mjs";

export function coutClip({ palier, definition, secondes = DUREES.plan }) {
  const grille = TARIFS[palier];
  if (!grille) {
    throw new Error(`palier « ${palier} » inconnu : attendu ${Object.keys(TARIFS).join(", ")}`);
  }
  const tarif = grille[definition];
  if (tarif === undefined) {
    throw new Error(
      `définition « ${definition} » inconnue pour le palier ${palier} : attendu ${Object.keys(grille).join(", ")}`,
    );
  }
  return tarif * secondes;
}

export function coutEpisode({ palier, definition, plans = DUREES.plans }) {
  return coutClip({ palier, definition }) * plans;
}

export function formaterDollars(montant) {
  return `${montant.toFixed(2).replace(".", ",")} $`;
}
```

- [ ] **Step 4 : Vérifier le passage**

Run: `npm run test:run -- scripts/reels/couts.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5 : Écrire le test d'analyse des arguments**

Créer `scripts/reels/cli.test.mjs` :

```js
import { describe, expect, it } from "vitest";
import { parserArgs } from "./cli.mjs";

describe("parserArgs", () => {
  it("prend lite 720p par défaut", () => {
    const a = parserArgs([]);
    expect(a.palier).toBe("lite");
    expect(a.definition).toBe("720p");
  });

  it("passe en 1080p avec --hd", () => {
    expect(parserArgs(["--hd"]).definition).toBe("1080p");
  });

  it("lit le palier", () => {
    expect(parserArgs(["--model=fast"]).palier).toBe("fast");
  });

  it("collecte les identifiants d'épisodes", () => {
    expect(parserArgs(["ep01", "--hd", "ep02"]).ids).toEqual(["ep01", "ep02"]);
  });

  it("déduit les étapes des drapeaux d'étape", () => {
    expect(parserArgs(["--frame", "ep01"]).etapes).toEqual(["frame"]);
    expect(parserArgs(["--video", "--montage", "ep01"]).etapes).toEqual(["video", "montage"]);
  });

  it("enchaîne les trois étapes quand aucune n'est demandée", () => {
    expect(parserArgs(["ep01"]).etapes).toEqual(["frame", "video", "montage"]);
  });

  it("reconnaît l'étape master, qui ne prend pas d'épisode", () => {
    expect(parserArgs(["--master"]).etapes).toEqual(["master"]);
  });

  it("lit les drapeaux booléens", () => {
    const a = parserArgs(["--force", "--yes", "--dry-run", "--verbose"]);
    expect(a).toMatchObject({ force: true, yes: true, dryRun: true, verbose: true });
  });

  it("lit le plan ciblé et les prises à monter", () => {
    const a = parserArgs(["--plan=2", "--take1=3", "--take2=1"]);
    expect(a.plan).toBe(2);
    expect(a.take1).toBe(3);
    expect(a.take2).toBe(1);
  });

  it("refuse un plan autre que 1 ou 2", () => {
    expect(() => parserArgs(["--plan=3"])).toThrow(/plan/i);
  });
});
```

- [ ] **Step 6 : Vérifier l'échec**

Run: `npm run test:run -- scripts/reels/cli.test.mjs`
Expected: FAIL — module introuvable.

- [ ] **Step 7 : Écrire `scripts/reels/cli.mjs`**

```js
/** Analyse de la ligne de commande. Module pur. */

const ETAPES_CONNUES = ["master", "frame", "video", "montage"];
const ETAPES_PAR_DEFAUT = ["frame", "video", "montage"];

function valeur(argv, nom) {
  const prefixe = `--${nom}=`;
  const trouve = argv.find((a) => a.startsWith(prefixe));
  return trouve ? trouve.slice(prefixe.length) : undefined;
}

function entier(argv, nom) {
  const brut = valeur(argv, nom);
  return brut === undefined ? undefined : Number(brut);
}

export function parserArgs(argv) {
  const etapes = ETAPES_CONNUES.filter((e) => argv.includes(`--${e}`));
  const plan = entier(argv, "plan");
  if (plan !== undefined && plan !== 1 && plan !== 2) {
    throw new Error(`--plan=${plan} invalide : attendu 1 ou 2`);
  }

  return {
    ids: argv.filter((a) => !a.startsWith("--")),
    etapes: etapes.length ? etapes : ETAPES_PAR_DEFAUT,
    palier: valeur(argv, "model") ?? "lite",
    definition: argv.includes("--hd") ? "1080p" : "720p",
    force: argv.includes("--force"),
    yes: argv.includes("--yes"),
    dryRun: argv.includes("--dry-run"),
    verbose: argv.includes("--verbose"),
    plan,
    take1: entier(argv, "take1"),
    take2: entier(argv, "take2"),
  };
}
```

- [ ] **Step 8 : Vérifier le passage**

Run: `npm run test:run -- scripts/reels/cli.test.mjs`
Expected: PASS (10 tests).

- [ ] **Step 9 : Écrire la coquille CLI avec le seul mode `--dry-run`**

Créer `scripts/generate-reels.mjs` :

```js
#!/usr/bin/env node
/**
 * Pipeline de production des Reels / TikTok marketing.
 *
 * Voir docs/superpowers/specs/2026-07-27-pipeline-reels-marketing-design.md
 *
 * Usage :
 *   npm run gen:reels -- --dry-run ep01-aquarelle
 *   npm run gen:reels -- --master
 *   npm run gen:reels -- --frame ep01-aquarelle
 *   npm run gen:reels -- --video ep01-aquarelle --model=fast --hd
 *   npm run gen:reels -- --montage ep01-aquarelle
 *   npm run gen:reels -- ep01-aquarelle          # les trois étapes
 */
import fs from "node:fs";
import fsp from "node:fs/promises";

import { chargerCatalogue } from "./reels/catalogue.mjs";
import { parserArgs } from "./reels/cli.mjs";
import { CHEMINS } from "./reels/config.mjs";
import { coutEpisode, formaterDollars } from "./reels/couts.mjs";
import { resoudreEpisode } from "./reels/episode.mjs";
import { promptEtal, promptPlan1, promptPlan2 } from "./reels/prompts.mjs";

async function chargerDotEnv() {
  try {
    const contenu = await fsp.readFile(CHEMINS.env, "utf8");
    for (const brut of contenu.split("\n")) {
      const ligne = brut.trim();
      if (!ligne || ligne.startsWith("#")) continue;
      const eq = ligne.indexOf("=");
      if (eq < 0) continue;
      const cle = ligne.slice(0, eq).trim();
      let val = ligne.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(cle in process.env)) process.env[cle] = val;
    }
  } catch {
    // pas de .env : la clé viendra de l'environnement, ou l'étape réseau échouera.
  }
}

async function chargerContexte() {
  const contenu = JSON.parse(await fsp.readFile(CHEMINS.contenu, "utf8"));
  const catalogue = chargerCatalogue(await fsp.readFile(CHEMINS.catalogue, "utf8"));
  const personasBruts = JSON.parse(await fsp.readFile(CHEMINS.personas, "utf8"));
  const personas = new Map(personasBruts.map((p) => [p.id, p.desc]));
  return { contenu, catalogue, personas };
}

function episodesDemandes(contenu, ids) {
  if (!ids.length) return contenu.episodes;
  const parId = new Map(contenu.episodes.map((e) => [e.id, e]));
  return ids.map((id) => {
    const e = parId.get(id);
    if (!e) throw new Error(`épisode « ${id} » introuvable dans ${CHEMINS.contenu}`);
    return e;
  });
}

function afficherDryRun(episode, contenu, args) {
  const blocs = { decor: contenu.decor, camera: contenu.camera, ambiance: contenu.ambiance };
  console.log(`\n════ ${episode.id} ════`);
  console.log(`\n— objets —`);
  for (const item of episode.items) {
    console.log(`  ${item.id.padEnd(38)} ${item.nom} (cote ${item.prixTresBon} €)`);
    console.log(`    ↳ ${item.fichier}`);
  }
  console.log(`\n— chute — ${episode.chute}`);
  console.log(`\n— prompt étal —\n${promptEtal(episode, blocs)}`);
  console.log(`\n— prompt plan 1 —\n${promptPlan1(episode, blocs)}`);
  console.log(`\n— prompt plan 2 —\n${promptPlan2(episode, blocs)}`);
  const cout = coutEpisode({ palier: args.palier, definition: args.definition });
  console.log(
    `\n— coût vidéo estimé — 2 plans en ${args.palier} ${args.definition} : ${formaterDollars(cout)}`,
  );
}

async function main() {
  const args = parserArgs(process.argv.slice(2));
  await chargerDotEnv();
  const { contenu, catalogue, personas } = await chargerContexte();

  const bruts = episodesDemandes(contenu, args.ids);
  const episodes = bruts.map((brut) =>
    resoudreEpisode(brut, {
      catalogue,
      personas,
      fichierExiste: (chemin) => fs.existsSync(chemin),
    }),
  );

  if (args.dryRun) {
    for (const episode of episodes) afficherDryRun(episode, contenu, args);
    return;
  }

  console.error(
    "Seul --dry-run est disponible pour l'instant (étapes master/frame/video/montage à venir).",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(`❌ ${err.message ?? err}`);
  process.exit(1);
});
```

- [ ] **Step 10 : Vérifier le dry-run sur le vrai contenu**

Run: `npm run gen:reels -- --dry-run ep01-aquarelle`
Expected: les trois objets listés avec leurs cotes et leurs chemins `.webp`, la chute `Vous auriez accepté ?`, les trois prompts complets, et `coût vidéo estimé … 0,80 $`.

- [ ] **Step 11 : Vérifier qu'un identifiant fautif est nommé**

Run: `npm run gen:reels -- --dry-run ep-inconnu`
Expected: sortie non nulle, message `❌ épisode « ep-inconnu » introuvable dans …`.

- [ ] **Step 12 : Lancer toute la suite**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 13 : Commit**

```bash
git add scripts/reels/couts.mjs scripts/reels/couts.test.mjs scripts/reels/cli.mjs scripts/reels/cli.test.mjs scripts/generate-reels.mjs
git commit -m "feat(reels): couts, arguments et dry-run de bout en bout"
```

---

### Task 6 : Étape image — `--master` et `--frame`

**Files:**
- Create: `scripts/reels/images.mjs`
- Create: `scripts/reels/images.test.mjs`
- Modify: `scripts/generate-reels.mjs` (branches `master` et `frame`)

**Interfaces:**
- Consumes: `promptEtal` (Task 4), `MODELES.image`, `CHEMINS.masters`.
- Produces:
  - `partsAvecImages({ texteIntro, images, prompt }) -> contents` pour `ai.models.generateContent`
  - `extraireImage(reponse) -> Buffer` — jette si la réponse ne contient pas d'image
  - `genererImage({ ai, model, contents, aspectRatio, imageSize }) -> Buffer`

`ai` est injecté : les tests passent un faux client, aucun appel réseau.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `scripts/reels/images.test.mjs` :

```js
import { describe, expect, it, vi } from "vitest";
import { extraireImage, genererImage, partsAvecImages } from "./images.mjs";

const PNG_B64 = Buffer.from("faux-png").toString("base64");

describe("partsAvecImages", () => {
  it("place l'intro, puis les images dans l'ordre, puis le prompt", () => {
    const contents = partsAvecImages({
      texteIntro: "INTRO",
      images: [
        { mimeType: "image/png", data: "AAA" },
        { mimeType: "image/webp", data: "BBB" },
      ],
      prompt: "PROMPT",
    });
    const parts = contents[0].parts;
    expect(parts[0]).toEqual({ text: "INTRO" });
    expect(parts[1].inlineData.data).toBe("AAA");
    expect(parts[2].inlineData.data).toBe("BBB");
    expect(parts[3]).toEqual({ text: "PROMPT" });
  });
});

describe("extraireImage", () => {
  it("rend le premier inlineData en Buffer", () => {
    const buf = extraireImage({
      candidates: [{ content: { parts: [{ text: "blabla" }, { inlineData: { data: PNG_B64 } }] } }],
    });
    expect(buf.toString()).toBe("faux-png");
  });

  it("jette quand la réponse ne contient aucune image", () => {
    expect(() => extraireImage({ candidates: [{ content: { parts: [{ text: "refus" }] } }] })).toThrow(
      /image/i,
    );
  });
});

describe("genererImage", () => {
  it("appelle le client avec la config d'aspect et rend le Buffer", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: PNG_B64 } }] } }],
    });
    const buf = await genererImage({
      ai: { models: { generateContent } },
      model: "gemini-3-pro-image",
      contents: "PROMPT",
      aspectRatio: "9:16",
      imageSize: "2K",
    });
    expect(buf.toString()).toBe("faux-png");
    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-3-pro-image",
      contents: "PROMPT",
      config: { imageConfig: { aspectRatio: "9:16", imageSize: "2K" } },
    });
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run -- scripts/reels/images.test.mjs`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : Écrire `scripts/reels/images.mjs`**

```js
/**
 * Étage image : composition de l'étal via Gemini.
 * Le client `ai` est toujours injecté pour rester testable hors réseau.
 */

export function partsAvecImages({ texteIntro, images, prompt }) {
  return [
    {
      role: "user",
      parts: [
        { text: texteIntro },
        ...images.map((image) => ({ inlineData: image })),
        { text: prompt },
      ],
    },
  ];
}

export function extraireImage(reponse) {
  const parts = reponse.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
  }
  const texte = parts.find((p) => p.text)?.text ?? "";
  throw new Error(`pas d'image dans la réponse du modèle${texte ? ` — « ${texte.slice(0, 200)} »` : ""}`);
}

export async function genererImage({ ai, model, contents, aspectRatio = "9:16", imageSize = "2K" }) {
  const reponse = await ai.models.generateContent({
    model,
    contents,
    config: { imageConfig: { aspectRatio, imageSize } },
  });
  return extraireImage(reponse);
}
```

- [ ] **Step 4 : Vérifier le passage**

Run: `npm run test:run -- scripts/reels/images.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5 : Brancher `--master` et `--frame` dans le CLI**

Dans `scripts/generate-reels.mjs`, ajouter les imports :

```js
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { genererImage, partsAvecImages } from "./reels/images.mjs";
import { MODELES } from "./reels/config.mjs";
```

Puis ces fonctions, avant `main()` :

```js
const INTRO_MASTER = [
  "Create the reference frame of a recurring illustrated scene.",
  "No objects on the table yet: leave the table top nearly bare, with only the cloth and the cash tin.",
].join(" ");

const INTRO_ETAL = [
  "Reference image (first image attached): the master scene to MATCH exactly.",
  "Keep the same camera, the same framing, the same horizon, the same table position, the same street background, the same illustration style and palette.",
  "Only the objects laid out on the table may change.",
  "The following attached images are the objects to place on the table.",
].join(" ");

async function lireImage(chemin) {
  const buf = await fsp.readFile(chemin);
  const mimeType = chemin.endsWith(".webp") ? "image/webp" : "image/png";
  return { mimeType, data: buf.toString("base64") };
}

async function etapeMaster(contenu, args, ai) {
  await fsp.mkdir(CHEMINS.masters, { recursive: true });
  const sortie = path.join(CHEMINS.masters, "_master-etal.png");
  if (!args.force && fs.existsSync(sortie)) {
    console.log(`⏭️  _master-etal.png déjà présent (--force pour regénérer)`);
    return;
  }
  console.log(`🎨  master — génération…`);
  const buf = await genererImage({
    ai,
    model: MODELES.image.pro,
    contents: `${INTRO_MASTER}\n\n${contenu.decor}`,
  });
  await fsp.writeFile(sortie, buf);
  console.log(`✅  ${sortie} (${Math.round(buf.length / 1024)} kB)`);
}

async function etapeFrame(episode, contenu, args, ai) {
  await fsp.mkdir(CHEMINS.masters, { recursive: true });
  const master = path.join(CHEMINS.masters, "_master-etal.png");
  if (!fs.existsSync(master)) {
    throw new Error(`image de référence absente : lance d'abord « npm run gen:reels -- --master »`);
  }
  const sortie = path.join(CHEMINS.masters, `${episode.id}-etal.png`);
  if (!args.force && fs.existsSync(sortie)) {
    console.log(`⏭️  ${episode.id}-etal.png déjà présent (--force pour regénérer)`);
    return;
  }

  const images = [await lireImage(master)];
  for (const item of episode.items) images.push(await lireImage(item.fichier));

  const blocs = { decor: contenu.decor, camera: contenu.camera, ambiance: contenu.ambiance };
  const contents = partsAvecImages({
    texteIntro: INTRO_ETAL,
    images,
    prompt: promptEtal(episode, blocs),
  });

  console.log(`🎨  ${episode.id} — composition de l'étal (${episode.items.length} objets)…`);
  const buf = await genererImage({ ai, model: MODELES.image.pro, contents });
  await fsp.writeFile(sortie, buf);
  console.log(`✅  ${sortie} (${Math.round(buf.length / 1024)} kB)`);
}

function clientGemini() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY absente. Voir .env");
    process.exit(1);
  }
  return new GoogleGenAI({ apiKey });
}
```

Puis, dans `main()`, remplacer le bloc final (`console.error("Seul --dry-run …")`) par :

```js
  const ai = clientGemini();

  if (args.etapes.includes("master")) {
    await etapeMaster(contenu, args, ai);
    return;
  }

  for (const episode of episodes) {
    if (args.etapes.includes("frame")) await etapeFrame(episode, contenu, args, ai);
  }

  const restantes = args.etapes.filter((e) => e !== "frame");
  if (restantes.length) {
    console.error(`Étapes non encore disponibles : ${restantes.join(", ")}`);
    process.exit(1);
  }
```

- [ ] **Step 6 : Générer l'image de référence pour de vrai**

Run: `npm run gen:reels -- --master`
Expected: `marketing/reels/master/_master-etal.png` créé. **L'ouvrir et le regarder** : table en amorce, mains du vendeur dans les coins bas, espace vide derrière la table, rue en haut, format vertical. Si le cadrage est faux, ajuster le bloc `decor` de `scripts/reels-prompts.json` et relancer avec `--force` — c'est le moment de le faire, tout le reste en dépend.

- [ ] **Step 7 : Composer l'étal du premier épisode**

Run: `npm run gen:reels -- --frame ep01-aquarelle`
Expected: `marketing/reels/master/ep01-aquarelle-etal.png` créé, montrant les trois objets du catalogue sur la nappe, et l'espace derrière la table toujours vide.

- [ ] **Step 8 : Vérifier le refus quand le master manque**

Run: `mv marketing/reels/master/_master-etal.png /tmp/ && npm run gen:reels -- --frame ep01-aquarelle --force ; mv /tmp/_master-etal.png marketing/reels/master/`
Expected: sortie non nulle, message invitant à lancer `--master` d'abord.

- [ ] **Step 9 : Commit**

```bash
git add scripts/reels/images.mjs scripts/reels/images.test.mjs scripts/generate-reels.mjs marketing/reels/master
git commit -m "feat(reels): etape image, master et composition de l'etal"
```

---

### Task 7 : Étape vidéo — les deux plans et le raccord

**Files:**
- Create: `scripts/reels/video.mjs`
- Create: `scripts/reels/video.test.mjs`
- Create: `scripts/reels/ffmpeg.mjs`
- Create: `scripts/reels/ffmpeg.test.mjs`
- Modify: `scripts/generate-reels.mjs` (branche `video`)

**Interfaces:**
- Consumes: `promptPlan1`, `promptPlan2` (Task 4), `coutEpisode` (Task 5), `MODELES.video`.
- Produces:
  - `prochainTake(fichiers, prefixe) -> number` — pur
  - `nomPrise(id, plan, take) -> string` — pur, `"ep01-p1-take2.mp4"`
  - `attendreOperation({ ai, operation, dormir, journaliser }) -> operation` — sondage
  - `genererVideo({ ai, model, prompt, image, definition, dormir }) -> Video`
  - `commandeDerniereFrame(mp4, png) -> string[]` — pur, arguments ffmpeg
  - `executer(binaire, args) -> Promise<void>` — exécution avec erreur parlante

- [ ] **Step 1 : Écrire le test vidéo qui échoue**

Créer `scripts/reels/video.test.mjs` :

```js
import { describe, expect, it, vi } from "vitest";
import { attendreOperation, genererVideo, nomPrise, prochainTake } from "./video.mjs";

describe("prochainTake", () => {
  it("part de 1 quand rien n'existe", () => {
    expect(prochainTake([], "ep01-p1")).toBe(1);
  });

  it("suit la plus haute prise existante", () => {
    const fichiers = ["ep01-p1-take1.mp4", "ep01-p1-take3.mp4", "ep01-p2-take9.mp4", "autre.txt"];
    expect(prochainTake(fichiers, "ep01-p1")).toBe(4);
  });

  it("ne confond pas deux épisodes de préfixe voisin", () => {
    expect(prochainTake(["ep01-bis-p1-take7.mp4"], "ep01-p1")).toBe(1);
  });
});

describe("nomPrise", () => {
  it("compose le nom de fichier d'une prise", () => {
    expect(nomPrise("ep01", 2, 3)).toBe("ep01-p2-take3.mp4");
  });
});

describe("attendreOperation", () => {
  it("sonde jusqu'à ce que l'opération soit terminée", async () => {
    const getVideosOperation = vi
      .fn()
      .mockResolvedValueOnce({ done: false })
      .mockResolvedValueOnce({ done: true, response: { generatedVideos: [{ video: { uri: "u" } }] } });
    const dormir = vi.fn().mockResolvedValue(undefined);

    const finale = await attendreOperation({
      ai: { operations: { getVideosOperation } },
      operation: { done: false },
      dormir,
      journaliser: () => {},
    });

    expect(getVideosOperation).toHaveBeenCalledTimes(2);
    expect(dormir).toHaveBeenCalledTimes(2);
    expect(finale.response.generatedVideos[0].video.uri).toBe("u");
  });

  it("jette quand l'opération finit en erreur", async () => {
    await expect(
      attendreOperation({
        ai: { operations: { getVideosOperation: vi.fn() } },
        operation: { done: true, error: { message: "quota dépassé" } },
        dormir: vi.fn(),
        journaliser: () => {},
      }),
    ).rejects.toThrow(/quota dépassé/);
  });
});

describe("genererVideo", () => {
  it("passe l'image de départ, l'aspect vertical et l'audio", async () => {
    const generateVideos = vi.fn().mockResolvedValue({
      done: true,
      response: { generatedVideos: [{ video: { uri: "u" } }] },
    });
    const video = await genererVideo({
      ai: { models: { generateVideos }, operations: { getVideosOperation: vi.fn() } },
      model: "veo-3.1-lite-generate-preview",
      prompt: "PROMPT",
      image: { imageBytes: "AAA", mimeType: "image/png" },
      definition: "720p",
      dormir: vi.fn(),
      journaliser: () => {},
    });

    expect(video.uri).toBe("u");
    expect(generateVideos).toHaveBeenCalledWith({
      model: "veo-3.1-lite-generate-preview",
      prompt: "PROMPT",
      image: { imageBytes: "AAA", mimeType: "image/png" },
      config: {
        aspectRatio: "9:16",
        resolution: "720p",
        numberOfVideos: 1,
        durationSeconds: 8,
        generateAudio: true,
        personGeneration: "allow_all",
      },
    });
  });

  it("jette quand aucune vidéo n'est rendue", async () => {
    await expect(
      genererVideo({
        ai: {
          models: { generateVideos: vi.fn().mockResolvedValue({ done: true, response: { generatedVideos: [] } }) },
          operations: { getVideosOperation: vi.fn() },
        },
        model: "m",
        prompt: "p",
        image: { imageBytes: "A", mimeType: "image/png" },
        definition: "720p",
        dormir: vi.fn(),
        journaliser: () => {},
      }),
    ).rejects.toThrow(/aucune vidéo/i);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run -- scripts/reels/video.test.mjs`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : Écrire `scripts/reels/video.mjs`**

```js
/**
 * Étage vidéo : génération d'un plan via Veo.
 * Le client `ai` et la fonction d'attente sont injectés.
 */
import { DUREES } from "./config.mjs";

export function prochainTake(fichiers, prefixe) {
  const motif = new RegExp(`^${prefixe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-take(\\d+)\\.mp4$`);
  let max = 0;
  for (const nom of fichiers) {
    const m = nom.match(motif);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export function nomPrise(id, plan, take) {
  return `${id}-p${plan}-take${take}.mp4`;
}

export async function attendreOperation({ ai, operation, dormir, journaliser }) {
  let courante = operation;
  let tours = 0;
  while (!courante.done) {
    await dormir(10000);
    tours++;
    journaliser(`⏳  génération en cours… (${tours * 10} s)`);
    courante = await ai.operations.getVideosOperation({ operation: courante });
  }
  if (courante.error) {
    throw new Error(`Veo a échoué : ${courante.error.message ?? JSON.stringify(courante.error)}`);
  }
  return courante;
}

export async function genererVideo({ ai, model, prompt, image, definition, dormir, journaliser }) {
  const operation = await ai.models.generateVideos({
    model,
    prompt,
    image,
    config: {
      aspectRatio: "9:16",
      resolution: definition,
      numberOfVideos: 1,
      durationSeconds: DUREES.plan,
      generateAudio: true,
      personGeneration: "allow_all",
    },
  });

  const finale = await attendreOperation({ ai, operation, dormir, journaliser });
  const video = finale.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error("aucune vidéo dans la réponse de Veo");
  return video;
}
```

Note : `attendreOperation` dort **avant** le premier sondage, ce qui laisse à l'opération le temps de démarrer ; c'est pourquoi le test attend deux appels à `dormir` pour deux sondages.

- [ ] **Step 4 : Vérifier le passage**

Run: `npm run test:run -- scripts/reels/video.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5 : Écrire le test ffmpeg qui échoue**

Créer `scripts/reels/ffmpeg.test.mjs` :

```js
import { describe, expect, it } from "vitest";
import { commandeDerniereFrame } from "./ffmpeg.mjs";

describe("commandeDerniereFrame", () => {
  const args = commandeDerniereFrame("/tmp/p1.mp4", "/tmp/raccord.png");

  it("lit la fin du fichier et n'extrait qu'une image", () => {
    expect(args).toContain("-sseof");
    expect(args).toContain("-update");
    expect(args.join(" ")).toContain("-frames:v 1");
  });

  it("écrase sans poser de question et cible la sortie demandée", () => {
    expect(args).toContain("-y");
    expect(args[args.length - 1]).toBe("/tmp/raccord.png");
  });

  it("prend le fichier source en entrée", () => {
    expect(args[args.indexOf("-i") + 1]).toBe("/tmp/p1.mp4");
  });
});
```

- [ ] **Step 6 : Vérifier l'échec**

Run: `npm run test:run -- scripts/reels/ffmpeg.test.mjs`
Expected: FAIL — module introuvable.

- [ ] **Step 7 : Écrire `scripts/reels/ffmpeg.mjs`**

```js
/**
 * Enveloppe ffmpeg. Les constructeurs de commandes sont purs et testés ;
 * seule `executer` touche au système.
 */
import { spawn } from "node:child_process";

/** Dernière image d'un mp4 : c'est elle qui sert d'image de départ au plan 2. */
export function commandeDerniereFrame(mp4, png) {
  return ["-sseof", "-0.2", "-i", mp4, "-update", "1", "-frames:v", "1", "-y", png];
}

export function executer(binaire, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaire, args, { stdio: ["ignore", "ignore", "pipe"] });
    let erreurs = "";
    proc.stderr.on("data", (d) => {
      erreurs += d.toString();
    });
    proc.on("error", (err) => {
      reject(
        err.code === "ENOENT"
          ? new Error(`${binaire} introuvable — installe-le (brew install ffmpeg)`)
          : err,
      );
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${binaire} a échoué (code ${code}) :\n${erreurs.slice(-2000)}`));
    });
  });
}

export async function verifierFfmpeg() {
  await executer("ffmpeg", ["-version"]);
}
```

- [ ] **Step 8 : Vérifier le passage**

Run: `npm run test:run -- scripts/reels/ffmpeg.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 9 : Installer ffmpeg**

Run: `brew install ffmpeg && ffmpeg -version | head -1`
Expected: une version affichée. Sans lui, l'étape vidéo ne peut pas produire l'image de raccord.

- [ ] **Step 10 : Brancher l'étape `video` dans le CLI**

Dans `scripts/generate-reels.mjs`, ajouter aux imports :

```js
import readline from "node:readline/promises";
import { commandeDerniereFrame, executer, verifierFfmpeg } from "./reels/ffmpeg.mjs";
import { genererVideo, nomPrise, prochainTake } from "./reels/video.mjs";
import { promptPlan1, promptPlan2 } from "./reels/prompts.mjs";
import { coutClip } from "./reels/couts.mjs";
```

Puis ces fonctions :

```js
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function confirmer(question, args) {
  if (args.yes) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const reponse = await rl.question(`${question} [o/N] `);
  rl.close();
  return /^o(ui)?$/i.test(reponse.trim());
}

async function imageDepart(chemin) {
  const buf = await fsp.readFile(chemin);
  return { imageBytes: buf.toString("base64"), mimeType: "image/png" };
}

async function genererPlan({ episode, contenu, args, ai, plan, cheminImage }) {
  await fsp.mkdir(CHEMINS.sorties, { recursive: true });
  const blocs = { decor: contenu.decor, camera: contenu.camera, ambiance: contenu.ambiance };
  const prompt = plan === 1 ? promptPlan1(episode, blocs) : promptPlan2(episode, blocs);
  const model = MODELES.video[args.palier];
  if (!model) throw new Error(`palier « ${args.palier} » inconnu : lite, fast ou pro`);

  const fichiers = await fsp.readdir(CHEMINS.sorties);
  const take = prochainTake(fichiers, `${episode.id}-p${plan}`);
  const nom = nomPrise(episode.id, plan, take);
  const sortie = path.join(CHEMINS.sorties, nom);

  console.log(`🎬  ${nom} — ${model} ${args.definition}, ${DUREES.plan} s`);
  const video = await genererVideo({
    ai,
    model,
    prompt,
    image: await imageDepart(cheminImage),
    definition: args.definition,
    dormir,
    journaliser: (m) => console.log(`   ${m}`),
  });

  await ai.files.download({ file: video, downloadPath: sortie });
  await fsp.writeFile(
    sortie.replace(/\.mp4$/, ".json"),
    JSON.stringify(
      {
        episode: episode.id,
        plan,
        take,
        model,
        definition: args.definition,
        secondes: DUREES.plan,
        cout: coutClip({ palier: args.palier, definition: args.definition }),
        imageDepart: path.basename(cheminImage),
        prompt,
        date: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`✅  ${sortie}`);
  return sortie;
}

async function etapeVideo(episode, contenu, args, ai) {
  await verifierFfmpeg();
  const etal = path.join(CHEMINS.masters, `${episode.id}-etal.png`);
  const raccord = path.join(CHEMINS.masters, `${episode.id}-raccord.png`);

  const plans = args.plan ? [args.plan] : [1, 2];
  const cout = coutClip({ palier: args.palier, definition: args.definition }) * plans.length;
  const ok = await confirmer(
    `Générer ${plans.length} plan(s) en ${args.palier} ${args.definition} pour ${formaterDollars(cout)} ?`,
    args,
  );
  if (!ok) {
    console.log("Abandon.");
    return;
  }

  if (plans.includes(1)) {
    if (!fs.existsSync(etal)) {
      throw new Error(`étal absent : lance d'abord « npm run gen:reels -- --frame ${episode.id} »`);
    }
    const p1 = await genererPlan({ episode, contenu, args, ai, plan: 1, cheminImage: etal });
    console.log(`🔗  extraction de l'image de raccord…`);
    await executer("ffmpeg", commandeDerniereFrame(p1, raccord));
    console.log(`✅  ${raccord}`);
  }

  if (plans.includes(2)) {
    if (!fs.existsSync(raccord)) {
      throw new Error(
        `image de raccord absente : génère d'abord le plan 1 (« --video ${episode.id} --plan=1 »)`,
      );
    }
    await genererPlan({ episode, contenu, args, ai, plan: 2, cheminImage: raccord });
  }
}
```

Ajouter `DUREES` et `formaterDollars` aux imports existants, puis dans `main()`, à la suite de la boucle `frame` :

```js
    if (args.etapes.includes("video")) await etapeVideo(episode, contenu, args, ai);
```

et retirer `"video"` de la liste des étapes non disponibles.

- [ ] **Step 11 : Vérifier le refus quand l'étal manque**

Run: `npm run gen:reels -- --video ep01-aquarelle --plan=1 --yes` après avoir déplacé `marketing/reels/master/ep01-aquarelle-etal.png` ailleurs.
Expected: sortie non nulle, message invitant à lancer `--frame`, **aucun appel réseau**. Remettre ensuite le fichier en place.

- [ ] **Step 12 : Générer les deux plans pour de vrai, en Lite 720p**

Run: `npm run gen:reels -- --video ep01-aquarelle`
Expected: confirmation demandée à `0,80 $`, puis `ep01-aquarelle-p1-take1.mp4`, `ep01-aquarelle-raccord.png`, `ep01-aquarelle-p2-take1.mp4` et leurs `.json`. Regarder les deux clips : caméra immobile, vendeur jamais visible, chineuse qui parle.

- [ ] **Step 13 : Vérifier que rien n'est écrasé**

Run: `npm run gen:reels -- --video ep01-aquarelle --plan=2 --yes`
Expected: un nouveau fichier `…-p2-take2.mp4`, l'ancien intact.

- [ ] **Step 14 : Commit**

```bash
git add scripts/reels/video.mjs scripts/reels/video.test.mjs scripts/reels/ffmpeg.mjs scripts/reels/ffmpeg.test.mjs scripts/generate-reels.mjs marketing/reels/out marketing/reels/master
git commit -m "feat(reels): etape video, deux plans et image de raccord"
```

---

### Task 8 : Montage — assemblage, habillage, carte de fin

**Files:**
- Modify: `scripts/reels/ffmpeg.mjs` (constructeurs de commandes de montage)
- Modify: `scripts/reels/ffmpeg.test.mjs`
- Modify: `scripts/generate-reels.mjs` (branche `montage`)

**Interfaces:**
- Consumes: les prises validées de la Task 7, `CHEMINS.policeTitre`, `CHEMINS.policeSousTitre`, `CHEMINS.icone`.
- Produces:
  - `echapperTexte(s) -> string` — échappe pour `drawtext`
  - `commandeAssemblage({ p1, p2, sortie }) -> string[]`
  - `commandeHabillage({ entree, sortie, accroche, sousTitres }) -> string[]` où `sousTitres` vaut `[{ texte, debut, fin }]`
  - `commandeSon({ entree, musique, sortie, duree }) -> string[]`
  - `commandeCarteFin({ icone, chute, signature, cta, sortie }) -> string[]`
  - `commandeConcat({ liste, sortie }) -> string[]`

Le montage se fait en cinq passes ffmpeg successives, chacune simple à déboguer, plutôt qu'en un seul filtre illisible : assemblage, habillage, son, carte de fin, concaténation.

- [ ] **Step 1 : Ajouter les tests de montage (ils doivent échouer)**

Ajouter à `scripts/reels/ffmpeg.test.mjs` :

```js
import {
  commandeAssemblage,
  commandeCarteFin,
  commandeConcat,
  commandeHabillage,
  echapperTexte,
} from "./ffmpeg.mjs";

describe("echapperTexte", () => {
  it("échappe les caractères qui cassent drawtext", () => {
    expect(echapperTexte("Vingt-cinq : d'accord ?")).toBe("Vingt-cinq \\: d'accord ?");
    expect(echapperTexte("a%b")).toBe("a\\%b");
    expect(echapperTexte("a'b")).toBe("a'b");
  });

  it("échappe la virgule, qui séparerait sinon deux filtres", () => {
    expect(echapperTexte("Bon, d'accord")).toBe("Bon\\, d'accord");
  });
});

describe("commandeAssemblage", () => {
  const args = commandeAssemblage({ p1: "/t/p1.mp4", p2: "/t/p2.mp4", sortie: "/t/joint.mp4" });
  const filtre = args[args.indexOf("-filter_complex") + 1];

  it("concatène l'image sans transition", () => {
    expect(filtre).toContain("concat=n=2:v=1:a=0");
  });

  it("fond les deux ambiances sur 0.2 s", () => {
    expect(filtre).toContain("acrossfade=d=0.2");
  });

  it("normalise en 1080x1920", () => {
    expect(filtre).toContain("1080:1920");
  });
});

describe("commandeHabillage", () => {
  const args = commandeHabillage({
    entree: "/t/joint.mp4",
    sortie: "/t/habille.mp4",
    accroche: "Elle vaut combien ?",
    sousTitres: [
      { texte: "Vous en voulez combien ?", debut: 2, fin: 5 },
      { texte: "Quarante euros.", debut: 5, fin: 8 },
    ],
  });
  const filtre = args[args.indexOf("-vf") + 1];

  it("affiche l'accroche pendant les deux premières secondes", () => {
    expect(filtre).toContain("Elle vaut combien ?");
    expect(filtre).toContain("between(t,0,2)");
  });

  it("affiche chaque sous-titre sur sa fenêtre", () => {
    expect(filtre).toContain("between(t,2,5)");
    expect(filtre).toContain("between(t,5,8)");
    expect(filtre).toContain("Quarante euros.");
  });

  it("utilise la police du jeu pour l'accroche", () => {
    expect(filtre).toContain("VerveShadow.ttf");
  });
});

describe("commandeCarteFin", () => {
  const args = commandeCarteFin({
    icone: "/t/icon.png",
    chute: "Valeur réelle : 35 €",
    signature: "Broc — Chaque objet a une histoire.",
    cta: "Bientôt sur l'App Store",
    sortie: "/t/fin.mp4",
  });

  it("dure deux secondes sur fond crème avec une piste silencieuse", () => {
    expect(args.join(" ")).toContain("color=c=0xF5EFE0:s=1080x1920");
    expect(args.join(" ")).toContain("anullsrc");
    expect(args).toContain("2");
  });

  it("écrit la chute échappée, la signature et le CTA", () => {
    const filtre = args[args.indexOf("-filter_complex") + 1];
    expect(filtre).toContain("Valeur réelle \\: 35 €");
    expect(filtre).toContain("Broc — Chaque objet a une histoire.");
    expect(filtre).toContain("Bientôt sur l'App Store");
  });
});

describe("commandeConcat", () => {
  it("passe par le demuxer concat", () => {
    const args = commandeConcat({ liste: "/t/liste.txt", sortie: "/t/final.mp4" });
    expect(args.join(" ")).toContain("-f concat");
    expect(args[args.length - 1]).toBe("/t/final.mp4");
  });
});

describe("commandeSon", () => {
  it("sans musique, applique seulement le fondu de sortie", () => {
    const args = commandeSon({ entree: "/t/h.mp4", musique: null, sortie: "/t/s.mp4", duree: 16 });
    const filtre = args[args.indexOf("-af") + 1];
    expect(filtre).toContain("afade=t=out");
    expect(args).not.toContain("-filter_complex");
  });

  it("avec musique, la mixe en dessous et la boucle sous les deux plans", () => {
    const args = commandeSon({
      entree: "/t/h.mp4",
      musique: "/t/lit.mp3",
      sortie: "/t/s.mp4",
      duree: 16,
    });
    const filtre = args[args.indexOf("-filter_complex") + 1];
    expect(filtre).toContain("volume=0.18");
    expect(filtre).toContain("aloop=loop=-1");
    expect(filtre).toContain("amix=inputs=2");
    expect(filtre).toContain("afade=t=out");
    expect(args[args.indexOf("-i") + 1]).toBe("/t/h.mp4");
  });

  it("recopie l'image sans la ré-encoder", () => {
    const args = commandeSon({ entree: "/t/h.mp4", musique: null, sortie: "/t/s.mp4", duree: 16 });
    expect(args.join(" ")).toContain("-c:v copy");
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run -- scripts/reels/ffmpeg.test.mjs`
Expected: FAIL — `commandeAssemblage is not a function` (et les suivantes).

- [ ] **Step 3 : Implémenter les constructeurs dans `scripts/reels/ffmpeg.mjs`**

Ajouter `import { CHEMINS, DUREES } from "./config.mjs";` **en tête du fichier**, sous l'import de `node:child_process`, puis le reste à la suite de `commandeDerniereFrame` :

```js
/** drawtext casse sur « : » et « % ». Les apostrophes passent si on ne
 *  quote pas la valeur avec des simples quotes — on utilise text=… nu. */
export function echapperTexte(texte) {
  return texte
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,");
}

const CADRE_1080 =
  "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x1a1a1a,setsar=1";

/** Passe 1 : coller les deux plans. Coupe franche à l'image (les deux
 *  frames sont identiques), fondu croisé de 0,2 s sur le son. */
export function commandeAssemblage({ p1, p2, sortie }) {
  const filtre = [
    `[0:v]${CADRE_1080}[v0]`,
    `[1:v]${CADRE_1080}[v1]`,
    `[v0][v1]concat=n=2:v=1:a=0[v]`,
    `[0:a][1:a]acrossfade=d=${DUREES.fonduAudio}[a]`,
  ].join(";");

  return [
    "-i", p1,
    "-i", p2,
    "-filter_complex", filtre,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-c:a", "aac",
    "-b:a", "192k",
    "-y", sortie,
  ];
}

/** Passe 2 : accroche en haut, sous-titres en bas. */
export function commandeHabillage({ entree, sortie, accroche, sousTitres }) {
  const dessins = [
    [
      `drawtext=fontfile=${CHEMINS.policeTitre}`,
      `text=${echapperTexte(accroche)}`,
      "fontsize=76",
      "fontcolor=0xF5EFE0",
      "borderw=6",
      "bordercolor=0x1a1a1a",
      "x=(w-text_w)/2",
      "y=h*0.14",
      "enable=between(t,0,2)",
    ].join(":"),
    ...sousTitres.map((st) =>
      [
        `drawtext=fontfile=${CHEMINS.policeSousTitre}`,
        `text=${echapperTexte(st.texte)}`,
        "fontsize=52",
        "fontcolor=white",
        "box=1",
        "boxcolor=0x1a1a1a@0.55",
        "boxborderw=22",
        "x=(w-text_w)/2",
        "y=h*0.80",
        `enable=between(t,${st.debut},${st.fin})`,
      ].join(":"),
    ),
  ];

  return [
    "-i", entree,
    "-vf", dessins.join(","),
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-c:a", "copy",
    "-y", sortie,
  ];
}

/** Passe 3 : la carte de fin, 2 s sur fond parchemin. */
export function commandeCarteFin({ icone, chute, signature, cta, sortie }) {
  const filtre = [
    "[1:v]scale=280:280[ico]",
    "[0:v][ico]overlay=(W-w)/2:H*0.28[bg]",
    [
      "[bg]drawtext=fontfile=" + CHEMINS.policeTitre,
      `text=${echapperTexte(chute)}`,
      "fontsize=72",
      "fontcolor=0x2F4F3E",
      "x=(w-text_w)/2",
      "y=h*0.50",
    ].join(":") + "[t1]",
    [
      "[t1]drawtext=fontfile=" + CHEMINS.policeSousTitre,
      `text=${echapperTexte(signature)}`,
      "fontsize=40",
      "fontcolor=0x5A4632",
      "x=(w-text_w)/2",
      "y=h*0.60",
    ].join(":") + "[t2]",
    [
      "[t2]drawtext=fontfile=" + CHEMINS.policeSousTitre,
      `text=${echapperTexte(cta)}`,
      "fontsize=46",
      "fontcolor=0x2F4F3E",
      "x=(w-text_w)/2",
      "y=h*0.68",
    ].join(":") + "[v]",
  ].join(";");

  return [
    "-f", "lavfi",
    "-i", `color=c=0xF5EFE0:s=1080x1920:r=30:d=${DUREES.carteFin}`,
    "-i", icone,
    "-f", "lavfi",
    "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-filter_complex", filtre,
    "-map", "[v]",
    "-map", "2:a",
    "-t", `${DUREES.carteFin}`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-y", sortie,
  ];
}

/**
 * Passe 3 bis : le son. Fondu de sortie sur la dernière seconde, et si un
 * mp3 est fourni, lit musical bouclé à bas niveau par-dessus la jointure —
 * c'est la troisième mesure du spec contre le raccord audible.
 */
export function commandeSon({ entree, musique, sortie, duree }) {
  const fondu = `afade=t=out:st=${Math.max(0, duree - 1)}:d=1`;
  const commun = ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-y", sortie];

  if (!musique) {
    return ["-i", entree, "-af", fondu, ...commun];
  }

  const filtre = [
    `[1:a]volume=0.18,aloop=loop=-1:size=2e9[lit]`,
    `[0:a][lit]amix=inputs=2:duration=first:dropout_transition=0,${fondu}[a]`,
  ].join(";");

  return [
    "-i", entree,
    "-i", musique,
    "-filter_complex", filtre,
    "-map", "0:v",
    "-map", "[a]",
    ...commun,
  ];
}

/** Passe 4 : clip habillé + carte de fin. */
export function commandeConcat({ liste, sortie }) {
  return [
    "-f", "concat",
    "-safe", "0",
    "-i", liste,
    "-c", "copy",
    "-y", sortie,
  ];
}
```

- [ ] **Step 4 : Vérifier le passage**

Run: `npm run test:run -- scripts/reels/ffmpeg.test.mjs`
Expected: PASS (les 3 tests de la Task 7 plus 15 nouveaux).

- [ ] **Step 5 : Brancher l'étape `montage` dans le CLI**

Dans `scripts/generate-reels.mjs`, ajouter aux imports ffmpeg :

```js
import {
  commandeAssemblage,
  commandeCarteFin,
  commandeConcat,
  commandeDerniereFrame,
  commandeHabillage,
  commandeSon,
  executer,
  verifierFfmpeg,
} from "./reels/ffmpeg.mjs";
```

Les tests de la Task 7 importaient déjà `commandeDerniereFrame` depuis ce module : fusionner les deux `import` de `./ffmpeg.mjs` dans `ffmpeg.test.mjs` en un seul, plutôt que d'en laisser deux.

Puis :

```js
const SIGNATURE = "Broc — Chaque objet a une histoire.";
const CTA = "Bientôt sur l'App Store";

/** Premier mp3 déposé dans marketing/reels/musique/, ou null. */
async function premierMp3() {
  try {
    const fichiers = await fsp.readdir(CHEMINS.musique);
    const mp3 = fichiers.filter((n) => n.toLowerCase().endsWith(".mp3")).sort()[0];
    return mp3 ? path.join(CHEMINS.musique, mp3) : null;
  } catch {
    return null;
  }
}

/** Prise retenue : celle demandée en argument, sinon la plus récente. */
async function priseRetenue(episode, plan, demandee) {
  const fichiers = await fsp.readdir(CHEMINS.sorties);
  const motif = new RegExp(`^${episode.id}-p${plan}-take(\\d+)\\.mp4$`);
  const prises = fichiers
    .map((nom) => ({ nom, take: Number(nom.match(motif)?.[1]) }))
    .filter((p) => Number.isInteger(p.take));
  if (!prises.length) {
    throw new Error(`aucune prise pour le plan ${plan} de ${episode.id} : lance « --video ${episode.id} »`);
  }
  const choisie = demandee
    ? prises.find((p) => p.take === demandee)
    : prises.sort((a, b) => b.take - a.take)[0];
  if (!choisie) throw new Error(`prise ${demandee} introuvable pour le plan ${plan} de ${episode.id}`);
  return { chemin: path.join(CHEMINS.sorties, choisie.nom), take: choisie.take };
}

/** Le plan 2 doit descendre de la prise du plan 1 retenue. */
async function verifierRaccord(episode, prise1, prise2) {
  const journal = JSON.parse(
    await fsp.readFile(prise2.chemin.replace(/\.mp4$/, ".json"), "utf8"),
  );
  const attendu = `${episode.id}-raccord.png`;
  if (journal.imageDepart !== attendu) {
    throw new Error(
      `la prise ${prise2.take} du plan 2 n'a pas été générée depuis ${attendu} — impossible de garantir le raccord`,
    );
  }
  console.log(`🔗  raccord : plan 1 take ${prise1.take} → plan 2 take ${prise2.take}`);
}

async function etapeMontage(episode, args) {
  await verifierFfmpeg();
  const prise1 = await priseRetenue(episode, 1, args.take1);
  const prise2 = await priseRetenue(episode, 2, args.take2);
  await verifierRaccord(episode, prise1, prise2);

  const tmp = (suffixe) => path.join(CHEMINS.sorties, `.${episode.id}-${suffixe}.mp4`);
  const joint = tmp("joint");
  const habille = tmp("habille");
  const sonorise = tmp("sonorise");
  const carte = tmp("carte");
  const finale = path.join(CHEMINS.sorties, `${episode.id}.mp4`);

  console.log("🎞️   assemblage des deux plans…");
  await executer("ffmpeg", commandeAssemblage({ p1: prise1.chemin, p2: prise2.chemin, sortie: joint }));

  console.log("✍️   accroche et sous-titres…");
  await executer(
    "ffmpeg",
    commandeHabillage({
      entree: joint,
      sortie: habille,
      accroche: episode.accroche,
      sousTitres: [
        { texte: episode.plan1.demande, debut: 2, fin: 5 },
        { texte: episode.plan1.prix, debut: 5, fin: 8 },
        { texte: episode.plan2.replique, debut: 10, fin: 15.8 },
      ],
    }),
  );

  const lit = await premierMp3();
  console.log(lit ? `🎵  lit musical : ${path.basename(lit)}` : "🔉  fondu de sortie…");
  await executer(
    "ffmpeg",
    commandeSon({
      entree: habille,
      musique: lit,
      sortie: sonorise,
      duree: DUREES.plan * DUREES.plans,
    }),
  );

  console.log("🃏  carte de fin…");
  await executer(
    "ffmpeg",
    commandeCarteFin({
      icone: CHEMINS.icone,
      chute: episode.chute,
      signature: SIGNATURE,
      cta: CTA,
      sortie: carte,
    }),
  );

  const liste = path.join(CHEMINS.sorties, `.${episode.id}-liste.txt`);
  await fsp.writeFile(liste, `file '${sonorise}'\nfile '${carte}'\n`);
  console.log("🔗  concaténation finale…");
  await executer("ffmpeg", commandeConcat({ liste, sortie: finale }));

  for (const jetable of [joint, habille, sonorise, carte, liste]) {
    await fsp.rm(jetable, { force: true });
  }
  console.log(`✅  ${finale}`);
}
```

Dans `main()`, à la suite de l'étape vidéo :

```js
    if (args.etapes.includes("montage")) await etapeMontage(episode, args);
```

et supprimer le bloc « étapes non encore disponibles », désormais sans objet.

- [ ] **Step 6 : Monter le premier épisode**

Run: `npm run gen:reels -- --montage ep01-aquarelle`
Expected: `marketing/reels/out/ep01-aquarelle.mp4`, ~18 s, 1080 × 1920. Les fichiers temporaires `.ep01-*` sont supprimés.

- [ ] **Step 7 : Vérifier le format et la durée**

Run: `ffprobe -v error -show_entries format=duration -show_entries stream=width,height -of default=noprint_wrappers=1 marketing/reels/out/ep01-aquarelle.mp4`
Expected: `width=1080`, `height=1920`, durée entre 17,5 et 18,5 s.

- [ ] **Step 8 : Vérifier le refus d'un montage sans raccord**

Run: `npm run gen:reels -- --montage ep01-aquarelle --take2=99`
Expected: sortie non nulle, message `prise 99 introuvable pour le plan 2`.

- [ ] **Step 9 : Lancer toute la suite de tests**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 10 : Commit**

```bash
git add scripts/reels/ffmpeg.mjs scripts/reels/ffmpeg.test.mjs scripts/generate-reels.mjs marketing/reels/out
git commit -m "feat(reels): montage, habillage et carte de fin"
```

---

### Task 9 : Recette du premier épisode et mode d'emploi

**Files:**
- Create: `marketing/reels/README.md`
- Modify: `scripts/reels-prompts.json` (deux épisodes de plus, un par dénouement restant)

**Interfaces:**
- Consumes: la pipeline complète.
- Produces: la documentation d'usage et la preuve que les trois dénouements fonctionnent.

- [ ] **Step 1 : Regarder le mp4 final sur un téléphone**

Transférer `marketing/reels/out/ep01-aquarelle.mp4` sur l'iPhone et le lire en plein écran. Vérifier, dans cet ordre :

1. **le raccord à l'image** — aucun saut, aucun changement de cadrage ni de lumière à la 8ᵉ seconde ;
2. **le raccord au son** — écouter précisément la jointure : si la bascule d'ambiance s'entend, noter le constat, c'est le repli prévu par le spec (garder l'ambiance du plan 1 sous les deux plans) ;
3. la lisibilité de l'accroche et des sous-titres en tenant le téléphone à bout de bras ;
4. le vendeur jamais visible, la caméra jamais mobile.

- [ ] **Step 2 : Ajouter les deux autres dénouements**

Ajouter à `scripts/reels-prompts.json`, dans `episodes`, en réutilisant les mêmes objets pour prouver que seule la fin change :

```json
    {
      "id": "ep02-achat",
      "items": [
        "art.aquarelle_marine_xixe",
        "mus.violon_atelier_mirecourt",
        "lv.cartes_postales_anciennes"
      ],
      "vedette": "art.aquarelle_marine_xixe",
      "acheteur": "an elderly French retired man in his 70s, flat wool cap, beige knitted cardigan, canvas tote bag, warm knowing smile",
      "fond": "bright late morning, warm light, a stroller pausing at the next stall",
      "accroche": "Il a vu ce que personne n'a vu.",
      "plan1": {
        "action": "he leans over the table, picks up the marine watercolour and holds it at arm's length, squinting at the horizon line",
        "demande": "Vous la laissez à combien, cette marine ?",
        "prix": "Quarante euros."
      },
      "plan2": {
        "denouement": "achete",
        "action": "he nods once, tucks the watercolour under his arm and counts banknotes onto the cloth",
        "replique": "Je la prends. Elle est bien mieux que ce qu'elle a l'air."
      },
      "chute": "auto"
    },
    {
      "id": "ep03-depart",
      "items": [
        "art.aquarelle_marine_xixe",
        "mus.violon_atelier_mirecourt",
        "lv.cartes_postales_anciennes"
      ],
      "vedette": "mus.violon_atelier_mirecourt",
      "acheteur": "a young man in his twenties, corduroy jacket, tousled hair, headphones around his neck, hesitant",
      "fond": "grey overcast noon, flat soft light, empty street behind",
      "accroche": "Trois cents euros. Il repose tout.",
      "plan1": {
        "action": "he lifts the violin by its neck, turns it slowly and peers through the f-hole at the maker's label",
        "demande": "Il vient d'où, celui-là ?",
        "prix": "Mirecourt. Trois cents."
      },
      "plan2": {
        "denouement": "repart",
        "action": "he sets the violin back down very carefully, gives an apologetic smile and steps sideways out of frame",
        "replique": "Je vais réfléchir…"
      },
      "chute": "auto"
    }
```

- [ ] **Step 3 : Vérifier les deux épisodes à blanc**

Run: `npm run gen:reels -- --dry-run ep02-achat ep03-depart`
Expected: pour `ep02-achat`, chute `Valeur réelle : 35 €` ; pour `ep03-depart`, chute `Trop cher ? Ou l'affaire du jour ?` et prompts contenant `walks out of frame` / `puts the item back`.

- [ ] **Step 4 : Produire l'épisode 2 en entier**

Run: `npm run gen:reels -- ep02-achat`
Expected: étal composé, deux plans générés (confirmation à `0,80 $` en Lite 720p), montage, `marketing/reels/out/ep02-achat.mp4`. Vérifier que le décor est identique à celui de l'épisode 1 — c'est le test réel de la constance de la série.

- [ ] **Step 5 : Écrire le mode d'emploi**

Créer `marketing/reels/README.md` :

```markdown
# Reels marketing — mode d'emploi

Vidéos verticales de ~18 s : POV d'un vendeur derrière son étal de brocante.
Seuls changent les objets exposés et le chineur qui se présente.

Spec : `docs/superpowers/specs/2026-07-27-pipeline-reels-marketing-design.md`

## Prérequis

- `GEMINI_API_KEY` dans `.env`
- `brew install ffmpeg`

## Écrire un épisode

Ajouter une entrée dans `scripts/reels-prompts.json` → `episodes`. Les
identifiants d'objets viennent de `docs/items-catalogue.csv` (colonne
`templateId`) et doivent avoir une image dans `public/items/`. Le champ
`acheteur` accepte une description libre en anglais ou un identifiant de
`scripts/clients-prompts.json`. `denouement` vaut `marchande`, `achete` ou
`repart`. `chute: "auto"` calcule la carte de fin toute seule.

## Produire

```
npm run gen:reels -- --dry-run ep04-xxx   # prompts et coût, sans dépense
npm run gen:reels -- --frame ep04-xxx     # composer l'étal (centimes)
npm run gen:reels -- --video ep04-xxx     # les deux plans (payant)
npm run gen:reels -- --montage ep04-xxx   # assembler
npm run gen:reels -- ep04-xxx             # tout d'affilée
```

## Méthode de travail

1. Itérer sur `--frame` jusqu'à ce que l'étal soit juste : c'est gratuit ou presque.
2. Générer les plans en **Lite 720p** (défaut, ~0,80 $ l'épisode) pour juger
   l'action, le dialogue et le raccord.
3. Une fois l'épisode validé, refaire les plans en **Fast 1080p** :
   `npm run gen:reels -- --video ep04-xxx --model=fast --hd`, puis
   `--montage --take1=N --take2=N` en désignant les bonnes prises.

Les prises ne sont jamais écrasées : chaque relance crée un `takeN` et son
journal `.json` (prompt exact, modèle, coût, date).

## Musique

Déposer un mp3 libre de droits dans `marketing/reels/musique/` : le montage le
mixe automatiquement à bas niveau sous les deux plans. C'est aussi ce qui masque
le mieux la jointure sonore entre les plans. Sans mp3, seul le fondu de sortie
est appliqué.

## Grille tarifaire

| Palier | 720p | 1080p | Épisode (2 plans de 8 s) |
|---|---|---|---|
| lite | 0,05 $/s | 0,08 $/s | 0,80 $ / 1,28 $ |
| fast | 0,10 $/s | 0,12 $/s | 1,60 $ / 1,92 $ |
| pro | 0,40 $/s | 0,40 $/s | 6,40 $ |

Relevé le 2026-07-27 — à recaler dans `scripts/reels/config.mjs` si Google bouge.

## Attention

- Rien ne doit aller dans `public/` : ces vidéos n'entrent pas dans le bundle iOS.
- Ne pas regénérer `_master-etal.png` sans intention : toute la série change d'un coup.
```

- [ ] **Step 6 : Vérifier la suite complète et le linter**

Run: `npm run test:run && npx eslint src`
Expected: PASS des deux (`npm run lint` est cassé depuis Next 16 — utiliser `npx eslint src`).

- [ ] **Step 7 : Commit**

```bash
git add marketing/reels scripts/reels-prompts.json
git commit -m "docs(reels): mode d'emploi et trois episodes de reference"
```

---

## Après le plan

Points laissés ouverts, à trancher à la recette et non sur le papier :

- **Le raccord sonore.** Si la bascule d'ambiance s'entend à la jointure malgré le fondu de 0,2 s, appliquer le repli du spec : ne garder que la voix sur le plan 2 et laisser courir l'ambiance du plan 1 sous les deux plans.
- **Le timing des sous-titres.** Les fenêtres (2–5 s, 5–8 s, 10–15,8 s) sont posées à l'estime. Si les répliques générées tombent à côté, ajuster les valeurs dans `etapeMontage`.
- **Le nombre d'objets sur l'étal.** Trois pour commencer ; si l'étal paraît vide, en ajouter — chaque objet supplémentaire est une image de plus en entrée, sans surcoût vidéo.
