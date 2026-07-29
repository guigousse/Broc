# Visuels App Store — plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE — utiliser
> superpowers:subagent-driven-development (recommandé) ou
> superpowers:executing-plans pour dérouler ce plan tâche par tâche. Les étapes
> utilisent la syntaxe à cases à cocher (`- [ ]`).

**But :** produire les 40 PNG de la fiche App Store (5 visuels × 2 appareils ×
4 langues) à partir de vraies captures de l'application, composées avec un
gabarit maison.

**Architecture :** un module `scripts/appstore/` fait de fichiers purs et
testés, plus deux points d'entrée `scripts/generate-appstore-shots.mjs` et
`scripts/generate-grand-pere-hd.mjs`. Playwright sert deux fois : une fois pour
capturer les écrans du jeu servi depuis `out/`, une fois pour rendre le gabarit
HTML aux dimensions finales. `sharp` aplatit et contrôle les sorties.

**Pile technique :** Node ESM, Playwright 1.61, sharp 0.34, vitest 4,
`@google/genai` pour les portraits.

**Spec :** `docs/superpowers/specs/2026-07-29-visuels-appstore-design.md`

## Contraintes globales

- Le module suit la structure de `scripts/reels/` : modules purs `.mjs` avec
  test `.test.mjs` colocalisé, orchestration dans le point d'entrée.
- **Les tests se lancent avec `--maxWorkers=4`.** Sans ce drapeau, ce Mac
  produit des dizaines de faux échecs par famine de workers. Commande de
  référence : `npx vitest run --maxWorkers=4 scripts/appstore/`.
- Aucune sortie sous `public/`. Les visuels vont dans `marketing/appstore/`,
  les portraits HD dans `public/personas/grand-pere/hd/` (assets, pas sorties).
- Aucune modification du code de l'application (`src/`). Les sélecteurs
  d'attente visent des chemins d'images, jamais du texte traduit.
- Les commentaires et les messages sont en français, comme le reste du dépôt.
- Dimensions de sortie exactes : iPhone **1242 × 2688**, iPad **2064 × 2752**.
- Les PNG livrés sont **sans canal alpha** (Apple refuse la transparence).

---

### Tâche 1 : Configuration du pipeline

**Fichiers :**
- Créer : `scripts/appstore/config.mjs`
- Test : `scripts/appstore/config.test.mjs`

**Interfaces :**
- Produit : `CHEMINS`, `LANGUES`, `APPAREILS`, `VISUELS`, `BROCANTE_DEMO`.
  `APPAREILS` est un objet indexé par `"iphone"` / `"ipad"`, chaque entrée
  ayant `{ id, viewport: {width,height}, densite, sortie: {width,height},
  grille: {colonnes,lignes}, titreRatio, bulleRatio, gpLargeur, chassis }`.
  `VISUELS` est un tableau de `{ n, cle, route, ancre, expression, ouvrirNego }`
  où `route` est une fonction `(brocanteId) => string` ou `null` pour le
  visuel 5.

- [ ] **Étape 1 : Écrire le test qui échoue**

```js
// scripts/appstore/config.test.mjs
import { describe, expect, it } from "vitest";
import { APPAREILS, BROCANTE_DEMO, CHEMINS, LANGUES, VISUELS } from "./config.mjs";

describe("config des visuels App Store", () => {
  it("écrit ses sorties sous marketing/, jamais sous public/", () => {
    expect(CHEMINS.sorties).toContain("/marketing/appstore");
    expect(CHEMINS.sorties).not.toContain("/public/");
    expect(CHEMINS.captures).toContain("/marketing/appstore");
  });

  it("cible les quatre langues de la fiche", () => {
    expect(LANGUES).toEqual(["fr", "en", "es", "el"]);
  });

  it("fixe les dimensions natives exigées par App Store Connect", () => {
    expect(APPAREILS.iphone.sortie).toEqual({ width: 1242, height: 2688 });
    expect(APPAREILS.ipad.sortie).toEqual({ width: 2064, height: 2752 });
  });

  it("dérive chaque sortie du viewport et de la densité", () => {
    for (const a of Object.values(APPAREILS)) {
      expect(a.viewport.width * a.densite).toBe(a.sortie.width);
      expect(a.viewport.height * a.densite).toBe(a.sortie.height);
    }
  });

  it("donne une grille 4×4 sur iPhone et 5×4 sur iPad", () => {
    expect(APPAREILS.iphone.grille).toEqual({ colonnes: 4, lignes: 4 });
    expect(APPAREILS.ipad.grille).toEqual({ colonnes: 5, lignes: 4 });
  });

  it("décrit cinq visuels, seul le dernier sans route ni ancre", () => {
    expect(VISUELS).toHaveLength(5);
    expect(VISUELS.map((v) => v.cle)).toEqual([
      "chiner", "negocier", "vendre", "collection", "personnages",
    ]);
    for (const v of VISUELS.slice(0, 4)) {
      expect(typeof v.route).toBe("function");
      expect(v.ancre).toMatch(/^img\[src\*=/);
    }
    expect(VISUELS[4].route).toBeNull();
    expect(VISUELS[4].ancre).toBeNull();
  });

  it("n'ouvre le tiroir de négociation que sur le visuel 2", () => {
    expect(VISUELS.filter((v) => v.ouvrirNego).map((v) => v.n)).toEqual([2]);
  });

  it("donne une expression de grand-père différente aux visuels 1 à 4", () => {
    const e = VISUELS.slice(0, 4).map((v) => v.expression);
    expect(new Set(e).size).toBe(4);
  });

  it("route sur la brocante armée dans la sauvegarde de démo", () => {
    expect(BROCANTE_DEMO).toBe("marche-saint-ouen");
    expect(VISUELS[0].route(BROCANTE_DEMO)).toBe("/chiner/marche-saint-ouen");
    expect(VISUELS[2].route(BROCANTE_DEMO)).toBe("/vitrine/marche-saint-ouen/journee");
  });
});
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/config.test.mjs`
Attendu : ÉCHEC — `Cannot find module './config.mjs'`

- [ ] **Étape 3 : Écrire le module**

```js
// scripts/appstore/config.mjs
/** Configuration du pipeline des visuels App Store. Module pur. */
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const CHEMINS = {
  racine: RACINE,
  export: path.join(RACINE, "out"),
  sorties: path.join(RACINE, "marketing/appstore"),
  captures: path.join(RACINE, "marketing/appstore/.captures"),
  saveDemo: path.join(RACINE, "scripts/save-demo.json"),
  portraitsHd: path.join(RACINE, "public/personas/grand-pere/hd"),
  personas: path.join(RACINE, "public/personas"),
  globalsCss: path.join(RACINE, "src/app/globals.css"),
  fonts: path.join(RACINE, "public"),
};

export const LANGUES = ["fr", "en", "es", "el"];

/** La brocante armée par scripts/gen-save-demo.ts (stand garni). */
export const BROCANTE_DEMO = "marche-saint-ouen";

export const APPAREILS = {
  iphone: {
    id: "iphone-6.5",
    viewport: { width: 414, height: 896 },
    densite: 3,
    sortie: { width: 1242, height: 2688 },
    grille: { colonnes: 4, lignes: 4 },
    // Part de la largeur du visuel occupée par la fonte du titre / de la bulle.
    titreRatio: 0.091,
    bulleRatio: 0.071,
    gpLargeur: 0.52,
    // Le châssis iPhone est dimensionné par sa LARGEUR.
    chassis: { mode: "largeur", valeur: 0.70, haut: 0.18, ratioEcran: 1242 / 2688, island: true },
    titreHaut: 0.042,
    filetHaut: 0.154,
  },
  ipad: {
    id: "ipad-13",
    viewport: { width: 1032, height: 1376 },
    densite: 2,
    sortie: { width: 2064, height: 2752 },
    grille: { colonnes: 5, lignes: 4 },
    titreRatio: 0.055,
    bulleRatio: 0.045,
    gpLargeur: 0.40,
    // Le châssis iPad est dimensionné par sa HAUTEUR — à 70 % de largeur il
    // déborderait, le format étant bien moins allongé (0,750 contre 0,462).
    chassis: { mode: "hauteur", valeur: 0.60, haut: 0.17, ratioEcran: 2064 / 2752, island: false },
    titreHaut: 0.040,
    filetHaut: 0.130,
  },
};

export const VISUELS = [
  {
    n: 1, cle: "chiner", expression: "souriant", ouvrirNego: false,
    route: (b) => `/chiner/${b}`,
    ancre: 'img[src*="/items/"]',
  },
  {
    n: 2, cle: "negocier", expression: "rieur", ouvrirNego: true,
    route: (b) => `/chiner/${b}`,
    ancre: 'img[src*="/personas/vendeur-"]',
  },
  {
    n: 3, cle: "vendre", expression: "emu", ouvrirNego: false,
    route: (b) => `/vitrine/${b}/journee`,
    ancre: 'img[src*="/personas/clients/"]',
  },
  {
    n: 4, cle: "collection", expression: "songeur", ouvrirNego: false,
    route: () => "/collection",
    ancre: 'img[src*="/items/thumbs/"]',
  },
  {
    n: 5, cle: "personnages", expression: "souriant", ouvrirNego: false,
    route: null,
    ancre: null,
  },
];
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il passe**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/config.test.mjs`
Attendu : SUCCÈS, 9 tests

- [ ] **Étape 5 : Commit**

```bash
git add scripts/appstore/config.mjs scripts/appstore/config.test.mjs
git commit -m "feat(appstore): configuration du pipeline des visuels"
```

---

### Tâche 2 : Textes, portraits et garde sur les libellés du jeu

**Fichiers :**
- Créer : `scripts/appstore/textes.mjs`
- Test : `scripts/appstore/textes.test.mjs`

**Interfaces :**
- Consomme : `LANGUES`, `VISUELS` de `config.mjs`.
- Produit : `TITRES` (objet `{ [cle]: { [langue]: string } }`), `BULLE`
  (`{ [langue]: string }`), `LIBELLE_NEGOCIER` (`{ [langue]: string }`),
  `PORTRAITS_GALERIE` (tableau de 19 chemins relatifs à `public/personas/`,
  les 15 premiers pour l'iPhone, les 19 pour l'iPad),
  `MEDAILLON_PLUS` (`{ [langue]: string }`).

Le test compare `LIBELLE_NEGOCIER` au contenu réel de
`src/lib/i18n/ui/<langue>.ts` : si quelqu'un renomme le bouton dans le jeu, le
test casse au lieu de la capture.

- [ ] **Étape 1 : Écrire le test qui échoue**

```js
// scripts/appstore/textes.test.mjs
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHEMINS, LANGUES, VISUELS } from "./config.mjs";
import { BULLE, LIBELLE_NEGOCIER, MEDAILLON_PLUS, PORTRAITS_GALERIE, TITRES } from "./textes.mjs";

describe("textes des visuels App Store", () => {
  it("donne un titre non vide pour chaque visuel et chaque langue", () => {
    for (const v of VISUELS) {
      for (const l of LANGUES) {
        expect(TITRES[v.cle]?.[l], `${v.cle}/${l}`).toBeTruthy();
      }
    }
  });

  it("annonce 31 personnages dans les quatre langues", () => {
    for (const l of LANGUES) expect(TITRES.personnages[l]).toContain("31");
  });

  it("donne une bulle et un libellé « et + » dans chaque langue", () => {
    for (const l of LANGUES) {
      expect(BULLE[l]).toBeTruthy();
      expect(MEDAILLON_PLUS[l]).toBeTruthy();
    }
  });

  it("liste 19 portraits, tous existants sur le disque", () => {
    expect(PORTRAITS_GALERIE).toHaveLength(19);
    expect(new Set(PORTRAITS_GALERIE).size).toBe(19);
    for (const p of PORTRAITS_GALERIE) {
      expect(fs.existsSync(path.join(CHEMINS.personas, p)), p).toBe(true);
    }
  });

  it("n'utilise aucune silhouette de repli dans la galerie", () => {
    for (const p of PORTRAITS_GALERIE) {
      expect(p).not.toContain("vendeur-mystere");
      expect(p).not.toContain("client-inconnu");
      expect(p).not.toContain("-fache");
    }
  });

  // Garde : le pipeline clique un bouton dont le libellé vient du jeu.
  it("reprend exactement le libellé « Négocier » de chaque fichier i18n", () => {
    for (const l of LANGUES) {
      const src = fs.readFileSync(
        path.join(CHEMINS.racine, `src/lib/i18n/ui/${l}.ts`), "utf8",
      );
      const trouve = src.match(/^\s*negocier:\s*"([^"]+)"/m);
      expect(trouve, `pas de clé negocier dans ${l}.ts`).toBeTruthy();
      expect(LIBELLE_NEGOCIER[l]).toBe(trouve[1]);
    }
  });
});
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/textes.test.mjs`
Attendu : ÉCHEC — `Cannot find module './textes.mjs'`

- [ ] **Étape 3 : Écrire le module**

```js
// scripts/appstore/textes.mjs
/** Textes affichés sur les visuels App Store. Module pur. */

export const TITRES = {
  chiner: {
    fr: "Dénichez des trésors oubliés",
    en: "Uncover forgotten treasures",
    es: "Descubre tesoros olvidados",
    el: "Ανακαλύψτε ξεχασμένους θησαυρούς",
  },
  negocier: {
    fr: "Négociez chaque euro",
    en: "Haggle for every euro",
    es: "Regatea hasta el último euro",
    el: "Παζαρέψτε για κάθε ευρώ",
  },
  vendre: {
    fr: "Tenez votre propre stand",
    en: "Run your own stall",
    es: "Monta tu propio puesto",
    el: "Στήστε τον δικό σας πάγκο",
  },
  collection: {
    fr: "Complétez votre collection",
    en: "Complete your collection",
    es: "Completa tu colección",
    el: "Ολοκληρώστε τη συλλογή σας",
  },
  personnages: {
    fr: "31 personnages uniques à rencontrer",
    en: "31 unique characters to meet",
    es: "31 personajes únicos por conocer",
    el: "31 μοναδικοί χαρακτήρες",
  },
};

/** Réplique du grand-père, visuel 5 uniquement. */
export const BULLE = {
  fr: "Méfie-toi de celui qui sourit le plus",
  en: "Beware the one who smiles the most",
  es: "Desconfía del que más sonríe",
  el: "Να φυλάγεσαι απ' αυτόν που χαμογελάει πιο πολύ",
};

/** Seizième (ou vingtième) médaillon de la galerie. */
export const MEDAILLON_PLUS = { fr: "et +", en: "and +", es: "y +", el: "και +" };

/**
 * Libellé du bouton qui ouvre le tiroir de négociation. Recopié depuis
 * src/lib/i18n/ui/<langue>.ts — un test compare les deux, pour qu'un renommage
 * dans le jeu casse la suite de tests plutôt que la capture.
 */
export const LIBELLE_NEGOCIER = {
  fr: "Négocier",
  en: "Haggle",
  es: "Regatear",
  el: "Παζάρεμα",
};

/**
 * Portraits de la galerie du visuel 5, dans l'ordre de lecture.
 * Les 15 premiers alimentent la grille 4×4 de l'iPhone ; les 19 alimentent la
 * grille 5×4 de l'iPad. La dernière case est toujours le médaillon « et + ».
 */
export const PORTRAITS_GALERIE = [
  "vendeur-antiquaire.webp",
  "vendeur-bonimenteur.webp",
  "vendeur-disquaire.webp",
  "vendeur-grincheux.webp",
  "vendeur-malin.webp",
  "vendeur-naif.webp",
  "vendeur-pipelette.webp",
  "vendeur-videcave.webp",
  "vendeur-bonhomme.webp",
  "clients/client-galeriste.webp",
  "clients/client-bibliophile.webp",
  "clients/client-snob_bourgeois.webp",
  "clients/client-gamer_nostalgique.webp",
  "clients/client-passionnee_artdeco.webp",
  "commanditaires/mode.webp",
  "clients/client-retraite_chineur.webp",
  "clients/client-touriste_perdu.webp",
  "vendeur-mamie.webp",
  "commanditaires/art.webp",
];
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il passe**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/textes.test.mjs`
Attendu : SUCCÈS, 6 tests

- [ ] **Étape 5 : Commit**

```bash
git add scripts/appstore/textes.mjs scripts/appstore/textes.test.mjs
git commit -m "feat(appstore): textes des cinq visuels dans les quatre langues"
```

---

### Tâche 3 : Analyse de la ligne de commande

**Fichiers :**
- Créer : `scripts/appstore/cli.mjs`
- Test : `scripts/appstore/cli.test.mjs`

**Interfaces :**
- Consomme : `LANGUES`, `APPAREILS`, `VISUELS` de `config.mjs`.
- Produit : `parserArgs(argv)` → `{ langues: string[], appareils: string[],
  visuels: number[], sauterCapture: boolean, aide: boolean }`. Lève une `Error`
  sur tout drapeau ou toute valeur inconnus.

- [ ] **Étape 1 : Écrire le test qui échoue**

```js
// scripts/appstore/cli.test.mjs
import { describe, expect, it } from "vitest";
import { parserArgs } from "./cli.mjs";

describe("ligne de commande des visuels App Store", () => {
  it("produit tout par défaut", () => {
    const a = parserArgs([]);
    expect(a.langues).toEqual(["fr", "en", "es", "el"]);
    expect(a.appareils).toEqual(["iphone", "ipad"]);
    expect(a.visuels).toEqual([1, 2, 3, 4, 5]);
    expect(a.sauterCapture).toBe(false);
    expect(a.aide).toBe(false);
  });

  it("restreint les langues", () => {
    expect(parserArgs(["--lang=fr,en"]).langues).toEqual(["fr", "en"]);
  });

  it("restreint les appareils", () => {
    expect(parserArgs(["--device=ipad"]).appareils).toEqual(["ipad"]);
  });

  it("restreint les visuels et les trie", () => {
    expect(parserArgs(["--only=5,1"]).visuels).toEqual([1, 5]);
  });

  it("reconnaît --skip-capture et --help", () => {
    expect(parserArgs(["--skip-capture"]).sauterCapture).toBe(true);
    expect(parserArgs(["--help"]).aide).toBe(true);
  });

  it("rejette un drapeau inconnu", () => {
    expect(() => parserArgs(["--turbo"])).toThrow(/turbo/);
  });

  it("rejette une langue inconnue", () => {
    expect(() => parserArgs(["--lang=de"])).toThrow(/de/);
  });

  it("rejette un appareil inconnu", () => {
    expect(() => parserArgs(["--device=watch"])).toThrow(/watch/);
  });

  it("rejette un numéro de visuel hors bornes", () => {
    expect(() => parserArgs(["--only=9"])).toThrow(/9/);
  });
});
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/cli.test.mjs`
Attendu : ÉCHEC — `Cannot find module './cli.mjs'`

- [ ] **Étape 3 : Écrire le module**

```js
// scripts/appstore/cli.mjs
/** Analyse de la ligne de commande. Module pur. */
import { APPAREILS, LANGUES, VISUELS } from "./config.mjs";

const DRAPEAUX_BOOLEENS = ["--skip-capture", "--help"];
const CLES_VALEUR = ["lang", "device", "only"];
const NUMEROS = VISUELS.map((v) => v.n);
const APPAREILS_CONNUS = Object.keys(APPAREILS);

function valeur(argv, nom) {
  const prefixe = `--${nom}=`;
  const trouve = argv.find((a) => a.startsWith(prefixe));
  return trouve ? trouve.slice(prefixe.length) : undefined;
}

function liste(argv, nom, connus, etiquette) {
  const brut = valeur(argv, nom);
  if (brut === undefined) return [...connus];
  const demandes = brut.split(",").map((s) => s.trim()).filter(Boolean);
  for (const d of demandes) {
    if (!connus.includes(d)) {
      throw new Error(`${etiquette} « ${d} » inconnu : attendu ${connus.join(", ")}`);
    }
  }
  return connus.filter((c) => demandes.includes(c));
}

function verifierDrapeauxConnus(argv) {
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    if (DRAPEAUX_BOOLEENS.includes(a)) continue;
    const eq = a.indexOf("=");
    if (eq > 2 && CLES_VALEUR.includes(a.slice(2, eq))) continue;
    const acceptes = [...DRAPEAUX_BOOLEENS, ...CLES_VALEUR.map((c) => `--${c}=…`)].join(", ");
    throw new Error(`drapeau « ${a} » inconnu : attendu ${acceptes}`);
  }
}

export function parserArgs(argv) {
  verifierDrapeauxConnus(argv);
  const brutVisuels = valeur(argv, "only");
  let visuels = [...NUMEROS];
  if (brutVisuels !== undefined) {
    const demandes = brutVisuels.split(",").map((s) => Number(s.trim()));
    for (const d of demandes) {
      if (!NUMEROS.includes(d)) {
        throw new Error(`visuel « ${d} » inconnu : attendu ${NUMEROS.join(", ")}`);
      }
    }
    visuels = NUMEROS.filter((n) => demandes.includes(n));
  }
  return {
    langues: liste(argv, "lang", LANGUES, "langue"),
    appareils: liste(argv, "device", APPAREILS_CONNUS, "appareil"),
    visuels,
    sauterCapture: argv.includes("--skip-capture"),
    aide: argv.includes("--help"),
  };
}
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il passe**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/cli.test.mjs`
Attendu : SUCCÈS, 9 tests

- [ ] **Étape 5 : Commit**

```bash
git add scripts/appstore/cli.mjs scripts/appstore/cli.test.mjs
git commit -m "feat(appstore): analyse de la ligne de commande"
```

---

### Tâche 4 : Serveur statique et amorçage du localStorage

**Fichiers :**
- Créer : `scripts/appstore/serveur.mjs`, `scripts/appstore/amorce.mjs`
- Test : `scripts/appstore/serveur.test.mjs`, `scripts/appstore/amorce.test.mjs`

**Interfaces :**
- Produit : `demarrerServeur(dossier)` → `Promise<{ url: string, fermer:
  () => Promise<void> }>` ; `scriptAmorce(saveJson, langue)` → `string` (source
  JavaScript à passer à `page.addInitScript`).

Les quatre clés écrites sont celles qu'emploie déjà `scripts/seed-demo-sim.sh` :
`projet-broc:slot:1:v1`, `projet-broc:slot:1:v1:backup`,
`projet-broc:slots:v1`, plus `projet-broc:langue:v1` pour la langue.

- [ ] **Étape 1 : Écrire les tests qui échouent**

```js
// scripts/appstore/amorce.test.mjs
import { describe, expect, it } from "vitest";
import { scriptAmorce } from "./amorce.mjs";

const SAVE = JSON.stringify({ version: 17, budget: 8420 });

describe("amorçage du localStorage", () => {
  it("écrit la save dans le slot 1 et sa copie de secours", () => {
    const js = scriptAmorce(SAVE, "fr");
    expect(js).toContain("projet-broc:slot:1:v1");
    expect(js).toContain("projet-broc:slot:1:v1:backup");
    expect(js).toContain("projet-broc:slots:v1");
  });

  it("fixe la langue demandée", () => {
    expect(scriptAmorce(SAVE, "el")).toContain('{"locale":"el"}');
    expect(scriptAmorce(SAVE, "es")).toContain('{"locale":"es"}');
  });

  it("désigne le slot 1 comme actif", () => {
    expect(scriptAmorce(SAVE, "fr")).toContain('"actif":1');
  });

  it("produit du JavaScript syntaxiquement valide", () => {
    expect(() => new Function(scriptAmorce(SAVE, "fr"))).not.toThrow();
  });

  it("échappe une save contenant des guillemets sans casser le script", () => {
    const piege = JSON.stringify({ nom: 'un "beau" vase', chemin: "a\\b" });
    expect(() => new Function(scriptAmorce(piege, "fr"))).not.toThrow();
  });

  it("refuse une langue hors des quatre", () => {
    expect(() => scriptAmorce(SAVE, "de")).toThrow(/de/);
  });
});
```

```js
// scripts/appstore/serveur.test.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demarrerServeur } from "./serveur.mjs";

let racine;
let serveur;

beforeAll(async () => {
  racine = await fs.mkdtemp(path.join(os.tmpdir(), "appstore-serveur-"));
  await fs.writeFile(path.join(racine, "index.html"), "<h1>broc</h1>");
  await fs.mkdir(path.join(racine, "sous"));
  await fs.writeFile(path.join(racine, "sous", "index.html"), "<h1>sous</h1>");
  await fs.writeFile(path.join(racine, "a.css"), "body{}");
  serveur = await demarrerServeur(racine);
});

afterAll(async () => {
  await serveur.fermer();
  await fs.rm(racine, { recursive: true, force: true });
});

describe("serveur statique de l'export", () => {
  it("sert index.html à la racine", async () => {
    const r = await fetch(serveur.url + "/");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("broc");
  });

  it("sert l'index d'un sous-dossier (routes de l'export statique)", async () => {
    const r = await fetch(serveur.url + "/sous");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("sous");
  });

  it("sert un fichier avec le bon type MIME", async () => {
    const r = await fetch(serveur.url + "/a.css");
    expect(r.headers.get("content-type")).toContain("text/css");
  });

  it("répond 404 sur un fichier absent", async () => {
    expect((await fetch(serveur.url + "/nope.js")).status).toBe(404);
  });

  it("refuse de remonter au-dessus de la racine", async () => {
    const r = await fetch(serveur.url + "/../../etc/passwd");
    expect([400, 403, 404]).toContain(r.status);
  });
});
```

- [ ] **Étape 2 : Lancer les tests pour vérifier qu'ils échouent**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/amorce.test.mjs scripts/appstore/serveur.test.mjs`
Attendu : ÉCHEC — modules introuvables

- [ ] **Étape 3 : Écrire les modules**

```js
// scripts/appstore/amorce.mjs
/** Construction du script d'amorçage du localStorage. Module pur. */
import { LANGUES } from "./config.mjs";

/** Horodatage figé : une save de démo ne doit pas dépendre de l'heure. */
const HORODATAGE = 1753005600000;

/**
 * Source JavaScript à injecter avant hydratation (`page.addInitScript`) :
 * écrit la sauvegarde de démo et la langue, exactement comme le fait
 * scripts/seed-demo-sim.sh pour le simulateur iOS.
 */
export function scriptAmorce(saveJson, langue) {
  if (!LANGUES.includes(langue)) {
    throw new Error(`langue « ${langue} » inconnue : attendu ${LANGUES.join(", ")}`);
  }
  const index = JSON.stringify({
    actif: 1,
    slots: { 1: { nom: "Démo App Store", derniereSession: HORODATAGE }, 2: null, 3: null },
  });
  // JSON.stringify d'une chaîne produit un littéral JS sûr (guillemets et
  // antislashs échappés) — c'est ce qui rend l'injection inoffensive.
  return [
    "try {",
    `  var s = ${JSON.stringify(saveJson)};`,
    '  localStorage.setItem("projet-broc:slot:1:v1", s);',
    '  localStorage.setItem("projet-broc:slot:1:v1:backup", s);',
    `  localStorage.setItem("projet-broc:slots:v1", ${JSON.stringify(index)});`,
    `  localStorage.setItem("projet-broc:langue:v1", ${JSON.stringify(JSON.stringify({ locale: langue }))});`,
    "} catch (e) {}",
  ].join("\n");
}
```

```js
// scripts/appstore/serveur.mjs
/** Petit serveur statique pour servir l'export out/ à Playwright. */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

async function resoudre(racine, urlPath) {
  const decode = decodeURIComponent(urlPath.split("?")[0]);
  const cible = path.resolve(racine, "." + decode);
  // Barrière anti-remontée : tout ce qui sort de la racine est refusé.
  if (cible !== racine && !cible.startsWith(racine + path.sep)) return null;
  try {
    const st = await fs.stat(cible);
    if (st.isDirectory()) return resoudre(racine, path.posix.join(decode, "index.html"));
    return cible;
  } catch {
    // L'export statique de Next écrit /route/index.html ; on tente aussi .html.
    try {
      const alt = cible + ".html";
      await fs.stat(alt);
      return alt;
    } catch {
      return null;
    }
  }
}

/** Démarre le serveur sur un port libre et renvoie son URL. */
export async function demarrerServeur(dossier) {
  const racine = path.resolve(dossier);
  const serveur = http.createServer(async (req, res) => {
    const fichier = await resoudre(racine, req.url ?? "/");
    if (!fichier) {
      res.writeHead(404).end("Not found");
      return;
    }
    const type = MIME[path.extname(fichier).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(await fs.readFile(fichier));
  });
  await new Promise((ok) => serveur.listen(0, "127.0.0.1", ok));
  const { port } = serveur.address();
  return {
    url: `http://127.0.0.1:${port}`,
    fermer: () => new Promise((ok) => serveur.close(ok)),
  };
}
```

- [ ] **Étape 4 : Lancer les tests pour vérifier qu'ils passent**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/amorce.test.mjs scripts/appstore/serveur.test.mjs`
Attendu : SUCCÈS, 11 tests

- [ ] **Étape 5 : Commit**

```bash
git add scripts/appstore/serveur.mjs scripts/appstore/serveur.test.mjs \
        scripts/appstore/amorce.mjs scripts/appstore/amorce.test.mjs
git commit -m "feat(appstore): serveur statique et amorcage du localStorage"
```

---

### Tâche 5 : Le gabarit HTML

C'est la pièce centrale. Elle produit le document rendu par Playwright aux
dimensions finales.

**Fichiers :**
- Créer : `scripts/appstore/gabarit.mjs`
- Test : `scripts/appstore/gabarit.test.mjs`

**Interfaces :**
- Consomme : `APPAREILS`, `CHEMINS` de `config.mjs` ; `TITRES`, `BULLE`,
  `MEDAILLON_PLUS` de `textes.mjs`.
- Produit :
  - `extraireFontFace(css, familles, baseUrl)` → `string` (blocs `@font-face`
    filtrés, URL réécrites).
  - `construireHtml({ visuel, langue, appareil, fontFaceCss, captureDataUri,
    grandPereDataUri, portraitsDataUri })` → `string`. `portraitsDataUri` n'est
    lu que pour le visuel 5 ; `captureDataUri` est `null` pour lui.

- [ ] **Étape 1 : Écrire le test qui échoue**

```js
// scripts/appstore/gabarit.test.mjs
import { describe, expect, it } from "vitest";
import { APPAREILS, VISUELS } from "./config.mjs";
import { BULLE, TITRES } from "./textes.mjs";
import { construireHtml, extraireFontFace } from "./gabarit.mjs";

const CSS = `
@font-face { font-family: 'Cinzel'; src: url(/fonts/google/g05.woff2) format('woff2');
  unicode-range: U+0000-00FF; }
@font-face { font-family: 'Cinzel'; src: url('/fonts/google/gfs-didot-greek.woff2') format('woff2');
  unicode-range: U+0370-0377; }
@font-face { font-family: 'Caveat'; src: url(/fonts/google/g03.woff2) format('woff2');
  unicode-range: U+0000-00FF; }
@font-face { font-family: 'Courier Prime'; src: url(/fonts/google/g20.woff2) format('woff2'); }
`;

const FAUX = "data:image/webp;base64,AAAA";
const base = (n, appareil = "iphone") => ({
  visuel: VISUELS[n - 1],
  langue: "fr",
  appareil: APPAREILS[appareil],
  fontFaceCss: "",
  captureDataUri: n === 5 ? null : FAUX,
  grandPereDataUri: FAUX,
  portraitsDataUri: Array.from({ length: 19 }, () => FAUX),
});

describe("extraction des @font-face du jeu", () => {
  it("garde les familles demandées et écarte les autres", () => {
    const css = extraireFontFace(CSS, ["Cinzel", "Caveat"], "file:///app/public");
    expect(css).toContain("Cinzel");
    expect(css).toContain("Caveat");
    expect(css).not.toContain("Courier Prime");
  });

  it("conserve le repli grec déclaré sous le nom Cinzel", () => {
    const css = extraireFontFace(CSS, ["Cinzel"], "file:///app/public");
    expect(css).toContain("gfs-didot-greek.woff2");
    expect(css).toContain("U+0370-0377");
  });

  it("réécrit les URL en absolu, avec ou sans guillemets", () => {
    const css = extraireFontFace(CSS, ["Cinzel"], "file:///app/public");
    expect(css).toContain("url(file:///app/public/fonts/google/g05.woff2)");
    expect(css).toContain("url('file:///app/public/fonts/google/gfs-didot-greek.woff2')");
  });

  it("lève si aucune famille ne correspond", () => {
    expect(() => extraireFontFace(CSS, ["Helvetica"], "file:///x")).toThrow(/Helvetica/);
  });
});

describe("gabarit des visuels", () => {
  it("dimensionne la page à la sortie exacte de l'appareil", () => {
    expect(construireHtml(base(1, "iphone"))).toContain("width: 1242px");
    expect(construireHtml(base(1, "iphone"))).toContain("height: 2688px");
    expect(construireHtml(base(1, "ipad"))).toContain("width: 2064px");
    expect(construireHtml(base(1, "ipad"))).toContain("height: 2752px");
  });

  it("affiche le titre de la langue demandée", () => {
    const html = construireHtml({ ...base(1), langue: "el" });
    expect(html).toContain(TITRES.chiner.el);
    expect(html).toContain('lang="el"');
  });

  it("demande Cinzel pour le titre, y compris en grec", () => {
    // Le repli grec est déclaré SOUS le nom Cinzel dans globals.css : aucun
    // cas particulier ne doit exister ici.
    const el = construireHtml({ ...base(1), langue: "el" });
    expect(el).toContain("'Cinzel'");
    expect(el).not.toMatch(/GFS Didot|EB Garamond/);
  });

  it("insère la capture et le grand-père sur les visuels 1 à 4", () => {
    for (const n of [1, 2, 3, 4]) {
      const html = construireHtml(base(n));
      expect(html).toContain('class="chassis"');
      expect(html.match(/data:image\/webp;base64,AAAA/g).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("ne met ni châssis ni capture sur le visuel 5", () => {
    const html = construireHtml(base(5));
    expect(html).not.toContain('class="chassis"');
    expect(html).toContain('class="grille"');
  });

  it("affiche la Dynamic Island sur iPhone et pas sur iPad", () => {
    expect(construireHtml(base(1, "iphone"))).toContain('class="island"');
    expect(construireHtml(base(1, "ipad"))).not.toContain('class="island"');
  });

  it("remplit 16 cases sur iPhone et 20 sur iPad, la dernière étant « et + »", () => {
    const tel = construireHtml(base(5, "iphone"));
    const tab = construireHtml(base(5, "ipad"));
    expect(tel.match(/class="case/g)).toHaveLength(16);
    expect(tab.match(/class="case/g)).toHaveLength(20);
    for (const html of [tel, tab]) {
      expect(html).toContain("et +");
      expect(html.lastIndexOf("et +")).toBeGreaterThan(html.lastIndexOf("<img class=\"portrait\""));
    }
  });

  it("n'affiche la bulle que sur le visuel 5", () => {
    expect(construireHtml(base(5))).toContain(BULLE.fr);
    for (const n of [1, 2, 3, 4]) {
      expect(construireHtml(base(n))).not.toContain(BULLE.fr);
    }
  });

  it("place le grand-père après le châssis, pour qu'il passe devant", () => {
    const html = construireHtml(base(1));
    expect(html.indexOf('class="grand-pere"')).toBeGreaterThan(html.indexOf('class="chassis"'));
  });

  it("injecte les @font-face fournis", () => {
    const html = construireHtml({ ...base(1), fontFaceCss: "/*FONTES*/" });
    expect(html).toContain("/*FONTES*/");
  });

  it("dimensionne le châssis par la largeur sur iPhone, par la hauteur sur iPad", () => {
    expect(construireHtml(base(1, "iphone"))).toMatch(/\.chassis\s*\{[^}]*width:\s*869px/);
    expect(construireHtml(base(1, "ipad"))).toMatch(/\.chassis\s*\{[^}]*height:\s*1651px/);
  });
});
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/gabarit.test.mjs`
Attendu : ÉCHEC — `Cannot find module './gabarit.mjs'`

- [ ] **Étape 3 : Écrire le module**

```js
// scripts/appstore/gabarit.mjs
/** Construction du document HTML d'un visuel. Module pur. */
import { BULLE, MEDAILLON_PLUS, TITRES } from "./textes.mjs";

const BLOC_FONT_FACE = /@font-face\s*\{[^}]*\}/g;

/**
 * Extrait de `globals.css` les blocs @font-face des familles demandées et
 * réécrit leurs URL en absolu. Les replis grecs sont déclarés SOUS le nom de
 * la famille latine (Cinzel → GFS Didot, Caveat → EB Garamond italique) : les
 * garder suffit à couvrir le grec, sans cas particulier ailleurs.
 */
export function extraireFontFace(css, familles, baseUrl) {
  const blocs = css.match(BLOC_FONT_FACE) ?? [];
  const gardes = blocs.filter((b) => {
    const m = b.match(/font-family:\s*['"]([^'"]+)['"]/);
    return m ? familles.includes(m[1]) : false;
  });
  if (gardes.length === 0) {
    throw new Error(`aucun @font-face trouvé pour ${familles.join(", ")}`);
  }
  return gardes
    .map((b) => b.replace(/url\((['"]?)\/fonts\//g, `url($1${baseUrl}/fonts/`))
    .join("\n");
}

const ECHAPPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ECHAPPE[c]);

/** Géométrie du châssis, en pixels de sortie. */
function geometrieChassis(appareil) {
  const { sortie, chassis } = appareil;
  if (chassis.mode === "largeur") {
    const largeur = Math.round(sortie.width * chassis.valeur);
    return { largeur, hauteur: Math.round(largeur / chassis.ratioEcran) };
  }
  const hauteur = Math.round(sortie.height * chassis.valeur);
  return { largeur: Math.round(hauteur * chassis.ratioEcran), hauteur };
}

export function construireHtml({
  visuel, langue, appareil, fontFaceCss,
  captureDataUri, grandPereDataUri, portraitsDataUri,
}) {
  const { sortie, grille } = appareil;
  const L = sortie.width;
  const H = sortie.height;
  const px = (frac, base = L) => Math.round(base * frac);
  const geo = geometrieChassis(appareil);
  const galerie = visuel.cle === "personnages";
  const cases = grille.colonnes * grille.lignes;
  const portraits = portraitsDataUri.slice(0, cases - 1);

  const corpsGalerie = `
    <div class="grille">
      ${portraits.map((p) => `<div class="case"><img class="portrait" src="${p}" alt=""></div>`).join("\n      ")}
      <div class="case plus"><span>${esc(MEDAILLON_PLUS[langue])}</span></div>
    </div>
    <div class="bulle">${esc(BULLE[langue])}</div>`;

  const corpsChassis = `
    <div class="chassis">
      <div class="coque">
        <div class="ecran">
          ${appareil.chassis.island ? '<div class="island"></div>' : ""}
          <img class="capture" src="${captureDataUri}" alt="">
          <div class="barre-accueil"></div>
        </div>
      </div>
      <div class="bouton mute"></div><div class="bouton up"></div>
      <div class="bouton dn"></div><div class="bouton pwr"></div>
    </div>`;

  return `<!doctype html>
<html lang="${esc(langue)}"><head><meta charset="utf-8">
<style>
${fontFaceCss}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${L}px; height: ${H}px; overflow: hidden; }
body {
  position: relative;
  background: linear-gradient(172deg, #1e1208 0%, #3a2310 44%, #6b4720 82%, #8a5c2a 100%);
}
.halo { position: absolute; inset: 0;
  background: radial-gradient(75% 55% at 50% 40%, rgba(255,210,140,.17), transparent 70%); }
.titre { position: absolute; top: ${px(appareil.titreHaut, H)}px; left: 6%; right: 6%;
  text-align: center; font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: ${px(appareil.titreRatio)}px; line-height: 1.08; color: #f8ead0;
  text-shadow: 0 ${px(0.002)}px ${px(0.01)}px rgba(0,0,0,.55); }
.filet { position: absolute; top: ${px(appareil.filetHaut, H)}px; left: 33%; right: 33%;
  height: 2px; background: linear-gradient(90deg, transparent, #cfa863, transparent); }
.chassis { position: absolute; left: 50%; transform: translateX(-50%);
  top: ${px(appareil.chassis.haut, H)}px;
  width: ${geo.largeur}px; height: ${geo.hauteur}px;
  padding: ${px(0.0035)}px; border-radius: ${px(0.022)}px;
  background: linear-gradient(150deg,#e8e3da 0%,#8d867c 22%,#4c4841 46%,#b8b1a6 64%,#5a564f 82%,#ddd7cd 100%);
  box-shadow: 0 ${px(0.018)}px ${px(0.03)}px rgba(0,0,0,.65); }
.coque { width: 100%; height: 100%; background: #0a0a0a;
  border-radius: ${px(0.019)}px; padding: ${px(0.0016)}px; }
.ecran { position: relative; width: 100%; height: 100%; overflow: hidden;
  border-radius: ${px(0.017)}px; background: #1d1206; }
.capture { width: 100%; height: 100%; object-fit: cover; display: block; }
.island { position: absolute; top: 1.9%; left: 50%; transform: translateX(-50%);
  width: 30%; height: 2.1%; background: #000; border-radius: 999px; z-index: 3; }
.barre-accueil { position: absolute; bottom: .9%; left: 50%; transform: translateX(-50%);
  width: 32%; height: ${px(0.0025)}px; background: rgba(251,247,238,.85);
  border-radius: 999px; z-index: 3; }
.bouton { position: absolute; width: ${px(0.002)}px; border-radius: 2px;
  background: linear-gradient(180deg,#b4ada2,#5d5952); }
.mute { left: -${px(0.0015)}px; top: 15%; height: 4%; }
.up   { left: -${px(0.0015)}px; top: 23%; height: 7%; }
.dn   { left: -${px(0.0015)}px; top: 32%; height: 7%; }
.pwr  { right: -${px(0.0015)}px; top: 26%; height: 10%; }
.grand-pere { position: absolute; bottom: -3%; left: -10%;
  width: ${px(appareil.gpLargeur)}px;
  filter: drop-shadow(0 ${px(0.011)}px ${px(0.018)}px rgba(0,0,0,.75)); }
.grille { position: absolute; left: 5%; right: 5%; top: 20%;
  display: grid; grid-template-columns: repeat(${grille.colonnes}, 1fr); gap: ${px(0.032)}px; }
.case { position: relative; aspect-ratio: 1; border-radius: 50%; overflow: hidden;
  border: ${px(0.005)}px solid #cfa863; background: #2a1a0c;
  box-shadow: 0 ${px(0.004)}px ${px(0.01)}px rgba(0,0,0,.6); }
.portrait { width: 134%; margin-left: -17%; margin-top: -10%; display: block; }
.plus { display: flex; align-items: center; justify-content: center; border-style: dashed;
  background: radial-gradient(circle at 50% 40%, #4a3116, #241505); }
.plus span { font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: ${px(0.05)}px; color: #f0d9a8; }
.bulle { position: absolute; right: 4%; bottom: 13%; width: 56%;
  background: #FBF7EE; border: ${px(0.004)}px solid #C5A059; border-radius: ${px(0.011)}px;
  padding: ${px(0.026)}px ${px(0.03)}px; text-align: center;
  font-family: 'Caveat', cursive; font-size: ${px(appareil.bulleRatio)}px;
  line-height: 1.15; color: #3b2a16;
  box-shadow: 0 ${px(0.008)}px ${px(0.018)}px rgba(0,0,0,.55); }
.bulle::before { content: ''; position: absolute; left: -${px(0.013)}px; bottom: ${px(0.03)}px;
  border-top: ${px(0.008)}px solid transparent; border-bottom: ${px(0.008)}px solid transparent;
  border-right: ${px(0.013)}px solid #C5A059; }
.bulle::after { content: ''; position: absolute; left: -${px(0.0095)}px; bottom: ${px(0.032)}px;
  border-top: ${px(0.006)}px solid transparent; border-bottom: ${px(0.006)}px solid transparent;
  border-right: ${px(0.0105)}px solid #FBF7EE; }
</style></head>
<body>
  <div class="halo"></div>
  <div class="titre">${esc(TITRES[visuel.cle][langue])}</div>
  <div class="filet"></div>
  ${galerie ? corpsGalerie : corpsChassis}
  <img class="grand-pere" src="${grandPereDataUri}" alt="">
</body></html>`;
}
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il passe**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/gabarit.test.mjs`
Attendu : SUCCÈS, 15 tests

Si le test de géométrie échoue, vérifier le calcul attendu :
iPhone `1242 × 0,70 = 869` px de large ; iPad `2752 × 0,60 = 1651` px de haut.

- [ ] **Étape 5 : Commit**

```bash
git add scripts/appstore/gabarit.mjs scripts/appstore/gabarit.test.mjs
git commit -m "feat(appstore): gabarit HTML des visuels"
```

---

### Tâche 6 : Contrôle des sorties

**Fichiers :**
- Créer : `scripts/appstore/controle.mjs`
- Test : `scripts/appstore/controle.test.mjs`

**Interfaces :**
- Produit : `controlerFichier(chemin, attendu)` → `Promise<{ ok: boolean,
  problemes: string[] }>` où `attendu` vaut `{ width, height }` ;
  `resumerControles(resultats)` → `string`.

Vérifie les trois exigences d'App Store Connect : dimensions exactes, absence
de canal alpha, espace sRGB.

- [ ] **Étape 1 : Écrire le test qui échoue**

```js
// scripts/appstore/controle.test.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { controlerFichier, resumerControles } from "./controle.mjs";

let dossier;
const f = (n) => path.join(dossier, n);

beforeAll(async () => {
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), "appstore-controle-"));
  const fond = { create: { width: 1242, height: 2688, channels: 3, background: "#1e1208" } };
  await sharp(fond).png().toFile(f("bon.png"));
  await sharp({ create: { ...fond.create, width: 1000 } }).png().toFile(f("petit.png"));
  await sharp({ create: { ...fond.create, channels: 4, background: "#1e120880" } })
    .png().toFile(f("alpha.png"));
});

afterAll(async () => { await fs.rm(dossier, { recursive: true, force: true }); });

const ATTENDU = { width: 1242, height: 2688 };

describe("contrôle des visuels produits", () => {
  it("accepte un PNG aux bonnes dimensions et sans alpha", async () => {
    const r = await controlerFichier(f("bon.png"), ATTENDU);
    expect(r.ok).toBe(true);
    expect(r.problemes).toEqual([]);
  });

  it("refuse de mauvaises dimensions et le dit", async () => {
    const r = await controlerFichier(f("petit.png"), ATTENDU);
    expect(r.ok).toBe(false);
    expect(r.problemes.join(" ")).toMatch(/1000/);
    expect(r.problemes.join(" ")).toMatch(/1242/);
  });

  it("refuse un canal alpha — Apple rejette la transparence", async () => {
    const r = await controlerFichier(f("alpha.png"), ATTENDU);
    expect(r.ok).toBe(false);
    expect(r.problemes.join(" ")).toMatch(/alpha|transparen/i);
  });

  it("signale un fichier absent au lieu de lever", async () => {
    const r = await controlerFichier(f("fantome.png"), ATTENDU);
    expect(r.ok).toBe(false);
    expect(r.problemes.join(" ")).toMatch(/introuvable/i);
  });

  it("résume en comptant les fichiers en défaut", () => {
    const texte = resumerControles([
      { fichier: "a.png", ok: true, problemes: [] },
      { fichier: "b.png", ok: false, problemes: ["canal alpha présent"] },
    ]);
    expect(texte).toMatch(/1\s*\/\s*2/);
    expect(texte).toContain("b.png");
    expect(texte).toContain("canal alpha");
  });
});
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/controle.test.mjs`
Attendu : ÉCHEC — `Cannot find module './controle.mjs'`

- [ ] **Étape 3 : Écrire le module**

```js
// scripts/appstore/controle.mjs
/** Contrôle des PNG livrés à App Store Connect. */
import sharp from "sharp";

/**
 * Vérifie les trois exigences d'Apple : dimensions natives exactes, aucun
 * canal alpha (la transparence est refusée), espace colorimétrique sRGB.
 */
export async function controlerFichier(chemin, attendu) {
  const problemes = [];
  let meta;
  try {
    meta = await sharp(chemin).metadata();
  } catch {
    return { fichier: chemin, ok: false, problemes: ["fichier introuvable ou illisible"] };
  }
  if (meta.width !== attendu.width || meta.height !== attendu.height) {
    problemes.push(
      `dimensions ${meta.width}×${meta.height}, attendu ${attendu.width}×${attendu.height}`,
    );
  }
  if (meta.hasAlpha) problemes.push("canal alpha présent (transparence refusée par Apple)");
  if (meta.space && meta.space !== "srgb") problemes.push(`espace ${meta.space}, attendu srgb`);
  return { fichier: chemin, ok: problemes.length === 0, problemes };
}

export function resumerControles(resultats) {
  const bons = resultats.filter((r) => r.ok).length;
  const lignes = [`Contrôle : ${bons} / ${resultats.length} fichiers conformes.`];
  for (const r of resultats.filter((x) => !x.ok)) {
    lignes.push(`  ✗ ${r.fichier} — ${r.problemes.join(" ; ")}`);
  }
  return lignes.join("\n");
}
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il passe**

Lancer : `npx vitest run --maxWorkers=4 scripts/appstore/controle.test.mjs`
Attendu : SUCCÈS, 5 tests

- [ ] **Étape 5 : Commit**

```bash
git add scripts/appstore/controle.mjs scripts/appstore/controle.test.mjs
git commit -m "feat(appstore): controle des dimensions et de l'absence d'alpha"
```

---

### Tâche 7 : Portraits haute définition du grand-père

Préalable bloquant : les portraits actuels plafonnent à 446 px alors que le
gabarit en demande ~700 px sur iPhone et ~1 200 px sur iPad.

**Fichiers :**
- Créer : `scripts/generate-grand-pere-hd.mjs`
- Modifier : `package.json` (ajouter le script npm `gen:gp-hd`)

**Interfaces :**
- Produit : quatre fichiers `public/personas/grand-pere/hd/{souriant,rieur,emu,songeur}.webp`,
  détourés, ~2048 px de côté.

Reprendre la mécanique de `scripts/generate-client-personas.mjs` : envoi du
portrait existant comme référence d'identité (image-to-image), fond magenta,
chroma-key, export webp. Lire ce fichier avant d'écrire celui-ci et en copier
la structure — mêmes helpers, mêmes options `--force` et ids positionnels.

- [ ] **Étape 1 : Écrire le script**

Le code ci-dessous reprend telles quelles les briques de
`scripts/generate-client-personas.mjs` : `loadDotEnv`, `chromaKeyMagenta`, la
forme de l'appel `generateContent` avec l'image de référence en `inlineData`.
Trois écarts assumés, tous justifiés par l'usage marketing : `imageSize: "2K"`
au lieu de `"1K"`, aucun redimensionnement à 512 px en sortie, et l'écriture
dans un sous-dossier `hd/` qui ne touche pas aux originaux.

```js
// scripts/generate-grand-pere-hd.mjs
#!/usr/bin/env node
/**
 * Régénère les portraits du grand-père en HAUTE DÉFINITION pour les visuels
 * App Store — les originaux plafonnent à 446 px, le gabarit en demande ~1 200.
 *
 * Image-to-image depuis le portrait existant : c'est la SEULE façon de garder
 * le même personnage (une génération indépendante réinvente le visage).
 * Pipeline identique à generate-client-personas.mjs : fond magenta →
 * chroma-key → webp.
 *
 * N'écrase JAMAIS les originaux : sortie dans public/personas/grand-pere/hd/.
 * L'application continue d'utiliser les fichiers actuels.
 *
 * Clé : GEMINI_API_KEY dans .env.
 *
 * Usage :
 *   npm run gen:gp-hd                 # les expressions manquantes
 *   npm run gen:gp-hd -- --force      # tout régénérer
 *   npm run gen:gp-hd -- souriant     # une expression précise
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(PROJECT_ROOT, "public", "personas", "grand-pere");
const OUTPUT_DIR = path.join(SOURCE_DIR, "hd");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const MODEL = "gemini-3-pro-image-preview";

const EXPRESSIONS = ["souriant", "rieur", "emu", "songeur"];
/** Côté minimal acceptable en sortie ; en dessous, le gabarit sera mou. */
const COTE_MIN = 1536;

async function loadDotEnv() {
  try {
    const content = await fs.readFile(ENV_PATH, "utf8");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // pas de .env
  }
}
await loadDotEnv();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY absente (.env).");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIds = args.filter((a) => !a.startsWith("--"));

const ai = new GoogleGenAI({ apiKey });

/** Redessine à l'identique, en plus grand. Aucune liberté sur le personnage. */
function buildPrompt() {
  return [
    "Redraw the reference character illustration at MUCH HIGHER RESOLUTION and finer detail.",
    "Keep the EXACT SAME person — identical face shape, wrinkles, skin tone, hair, beard, glasses, hat, outfit, accessories, colors, pose, facial expression, framing and art style.",
    "This is an upscale and refinement, NOT a reinterpretation: do NOT add, remove or redesign anything, do NOT change the crop, the proportions or the mood.",
    "Preserve the warm watercolor and ink style with soft muted palette, gentle painterly shading and subtle paper grain.",
    "Render crisp clean edges suitable for cutting the subject out.",
    "Output on a SOLID FLAT PURE MAGENTA background (#FF00FF), absolutely uniform — NO shadow on the background, NO gradient, NO texture, no text, no watermark, no frame.",
    "Strict square 1:1 aspect ratio, same composition as the reference.",
  ].join(" ");
}

async function generate(prompt, refPng) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/png", data: refPng.toString("base64") } },
          { text: prompt },
        ],
      },
    ],
    // 2K au lieu du 1K des personas du jeu : ces portraits sont affichés
    // jusqu'à ~1 200 px de large sur les visuels iPad.
    config: { imageConfig: { aspectRatio: "1:1", imageSize: "2K" } },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
    if (part.text) console.log(`💬  ${part.text.slice(0, 200)}`);
  }
  return null;
}

/** Détoure le fond magenta (#FF00FF) → alpha, bords adoucis + anti-spill. */
async function chromaKeyMagenta(pngPath) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const magentaness = Math.min(r, b) - g;
    if (magentaness > 45) {
      data[i] = 150;
      data[i + 1] = 150;
      data[i + 2] = 150;
      data[i + 3] = 0;
    } else if (magentaness > 12) {
      const t = (magentaness - 12) / 33;
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
      data[i] = Math.round(r - (r - g) * t);
      data[i + 2] = Math.round(b - (b - g) * t);
    }
  }
  const tmp = pngPath + ".tmp.png";
  await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toFile(tmp);
  await fs.rename(tmp, pngPath);
}

/** Contrairement aux personas du jeu : AUCUN redimensionnement à la baisse. */
async function toWebp(pngPath) {
  const webpPath = pngPath.replace(/\.png$/, ".webp");
  const buf = await sharp(pngPath).webp({ quality: 92 }).toBuffer();
  await fs.writeFile(webpPath, buf);
  const { width } = await sharp(buf).metadata();
  console.log(`   → ${path.basename(webpPath)} (${width} px, ${Math.round(buf.length / 1024)} kB)`);
  if (width < COTE_MIN) {
    console.warn(`   ⚠ ${width} px seulement (< ${COTE_MIN}) — le grand-père sera mou sur iPad.`);
  }
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const cibles = EXPRESSIONS.filter((e) => onlyIds.length === 0 || onlyIds.includes(e));
  if (cibles.length === 0) {
    console.error(`❌ Aucune expression ne correspond (connues : ${EXPRESSIONS.join(", ")}).`);
    process.exit(1);
  }

  let echecs = 0;
  for (const expression of cibles) {
    const webp = path.join(OUTPUT_DIR, `${expression}.webp`);
    if (!force && (await exists(webp))) {
      console.log(`✓ ${expression}.webp déjà présent`);
      continue;
    }
    const source = path.join(SOURCE_DIR, `${expression}.webp`);
    if (!(await exists(source))) {
      console.error(`❌ portrait source absent : ${source}`);
      echecs++;
      continue;
    }
    console.log(`🎨  grand-père ${expression} — génération HD…`);
    try {
      const refPng = await sharp(source).png().toBuffer();
      const png = await generate(buildPrompt(), refPng);
      if (!png) throw new Error("aucune image renvoyée par le modèle");
      const pngPath = path.join(OUTPUT_DIR, `${expression}.png`);
      await fs.writeFile(pngPath, png);
      await chromaKeyMagenta(pngPath);
      await toWebp(pngPath);
      await fs.unlink(pngPath);
    } catch (e) {
      console.error(`❌ ${expression} : ${e.message}`);
      echecs++;
    }
  }
  if (echecs > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exitCode = 1;
});
```

Si le modèle ignore `imageSize: "2K"` et renvoie du 1024 px, l'avertissement
du script le dira. Repli dans ce cas : agrandir à 2048 px avec
`sharp(...).resize(2048, 2048, { kernel: "lanczos3" }).sharpen({ sigma: 0.6 })`
avant l'export webp, en ajoutant l'étape dans `toWebp`.

- [ ] **Étape 2 : Ajouter le script npm**

Dans `package.json`, à la suite des autres `gen:` :

```json
"gen:gp-hd": "node scripts/generate-grand-pere-hd.mjs",
```

- [ ] **Étape 3 : Générer et vérifier les dimensions**

```bash
npm run gen:gp-hd
node -e "const s=require('sharp');(async()=>{for(const e of ['souriant','rieur','emu','songeur']){const m=await s('public/personas/grand-pere/hd/'+e+'.webp').metadata();console.log(e,m.width+'×'+m.height,'alpha:'+m.hasAlpha)}})()"
```

Attendu : quatre fichiers d'au moins 1536 px de côté, tous avec `alpha: true`
(le détourage doit avoir produit de la transparence).

- [ ] **Étape 4 : POINT DE CONTRÔLE — validation visuelle**

**Arrêter ici et montrer les quatre portraits à Guillaume.** Ne pas enchaîner
sur la production des 40 images sans son accord. Deux défauts connus à
regarder : la dérive de ressemblance par rapport aux portraits d'origine, et le
liseré de détourage sur les contours.

- [ ] **Étape 5 : Commit**

```bash
git add scripts/generate-grand-pere-hd.mjs package.json public/personas/grand-pere/hd
git commit -m "feat(appstore): portraits HD du grand-pere pour les visuels"
```

---

### Tâche 8 : Capture, rendu et point d'entrée

**Fichiers :**
- Créer : `scripts/appstore/capture.mjs`, `scripts/appstore/rendu.mjs`,
  `scripts/generate-appstore-shots.mjs`
- Modifier : `package.json` (script npm `gen:appstore`)

**Interfaces :**
- Consomme : tous les modules précédents.
- Produit :
  - `capturerEcrans({ navigateur, baseUrl, langue, appareil, visuels, saveJson,
    dossier })` → `Promise<Map<string, string>>` associant `"<cle>"` au chemin
    du PNG capturé.
  - `rendreVisuel({ navigateur, html, sortie, fichier })` → `Promise<void>`,
    écrit un PNG **aplati** (sans alpha).

- [ ] **Étape 1 : Écrire le module de capture**

```js
// scripts/appstore/capture.mjs
/** Capture des écrans réels du jeu avec Playwright. */
import path from "node:path";
import { scriptAmorce } from "./amorce.mjs";
import { BROCANTE_DEMO } from "./config.mjs";
import { LIBELLE_NEGOCIER } from "./textes.mjs";

/** Laisse retomber les animations d'entrée avant de déclencher. */
const REPOS_MS = 1200;

export async function capturerEcrans({
  navigateur, baseUrl, langue, appareil, visuels, saveJson, dossier, log = () => {},
}) {
  const contexte = await navigateur.newContext({
    viewport: appareil.viewport,
    deviceScaleFactor: appareil.densite,
    isMobile: true,
    hasTouch: true,
    locale: langue,
    reducedMotion: "reduce",
  });
  await contexte.addInitScript(scriptAmorce(saveJson, langue));
  const faites = new Map();
  try {
    for (const visuel of visuels) {
      if (!visuel.route) continue; // visuel 5 : pas d'écran de jeu
      const page = await contexte.newPage();
      const url = baseUrl + visuel.route(BROCANTE_DEMO);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector(visuel.ancre, { timeout: 20000 });

      if (visuel.ouvrirNego) {
        const bouton = page.getByRole("button", {
          name: new RegExp(LIBELLE_NEGOCIER[langue], "i"),
        });
        await bouton.first().click();
        await page.waitForSelector(visuel.ancre, { timeout: 20000 });
      }

      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(REPOS_MS);

      const fichier = path.join(dossier, `${langue}-${appareil.id}-${visuel.cle}.png`);
      await page.screenshot({ path: fichier, type: "png" });
      faites.set(visuel.cle, fichier);
      log(`  ✓ capture ${langue}/${appareil.id}/${visuel.cle}`);
      await page.close();
    }
  } finally {
    await contexte.close();
  }
  return faites;
}
```

- [ ] **Étape 2 : Écrire le module de rendu**

```js
// scripts/appstore/rendu.mjs
/** Rendu du gabarit HTML en PNG aplati, aux dimensions finales. */
import sharp from "sharp";

/** Fond du gabarit : sert de couleur d'aplatissement de l'alpha. */
const FOND = "#1e1208";

export async function rendreVisuel({ navigateur, html, sortie, fichier }) {
  const contexte = await navigateur.newContext({
    viewport: sortie,
    deviceScaleFactor: 1,
  });
  const page = await contexte.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const brut = await page.screenshot({ type: "png" });
    // Playwright produit toujours un PNG avec alpha ; Apple le refuse.
    await sharp(brut)
      .flatten({ background: FOND })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toFile(fichier);
  } finally {
    await contexte.close();
  }
}
```

- [ ] **Étape 3 : Écrire le point d'entrée**

```js
// scripts/generate-appstore-shots.mjs
#!/usr/bin/env node
/**
 * Produit les visuels de la fiche App Store.
 *
 * Voir docs/superpowers/specs/2026-07-29-visuels-appstore-design.md
 *
 * Usage :
 *   npm run gen:appstore                          # les 40 images
 *   npm run gen:appstore -- --lang=fr --only=1    # une seule image, pour itérer
 *   npm run gen:appstore -- --skip-capture        # recompose sans relancer le jeu
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

import { capturerEcrans } from "./appstore/capture.mjs";
import { parserArgs } from "./appstore/cli.mjs";
import { APPAREILS, CHEMINS, VISUELS } from "./appstore/config.mjs";
import { controlerFichier, resumerControles } from "./appstore/controle.mjs";
import { construireHtml, extraireFontFace } from "./appstore/gabarit.mjs";
import { rendreVisuel } from "./appstore/rendu.mjs";
import { demarrerServeur } from "./appstore/serveur.mjs";
import { PORTRAITS_GALERIE } from "./appstore/textes.mjs";

const AIDE = `
Visuels App Store — 5 visuels × 2 appareils × 4 langues.

  --lang=fr,en      langues à produire      (défaut : les 4)
  --device=iphone   appareils à produire    (défaut : iphone,ipad)
  --only=1,5        visuels à produire      (défaut : 1..5)
  --skip-capture    réutilise les captures déjà présentes
  --help            affiche ceci
`;

const log = (m) => process.stdout.write(m + "\n");

async function dataUri(chemin) {
  const buf = await fs.readFile(chemin);
  const ext = path.extname(chemin).slice(1).toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function main() {
  const args = parserArgs(process.argv.slice(2));
  if (args.aide) { log(AIDE); return; }

  if (!fsSync.existsSync(path.join(CHEMINS.export, "index.html"))) {
    throw new Error("out/ absent — lance d'abord : npm run build");
  }

  // Sauvegarde de démo régénérée à chaque fois : elle doit rester valide
  // vis-à-vis de la version courante des migrations.
  log("🧱 Génération de la sauvegarde de démo…");
  const saveJson = execFileSync("npx", ["tsx", "scripts/gen-save-demo.ts"], {
    cwd: CHEMINS.racine, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  JSON.parse(saveJson); // valide
  await fs.writeFile(CHEMINS.saveDemo, saveJson);

  await fs.mkdir(CHEMINS.captures, { recursive: true });

  const css = await fs.readFile(CHEMINS.globalsCss, "utf8");
  const fontFaceCss = extraireFontFace(
    css, ["Cinzel", "Caveat"], `file://${CHEMINS.fonts}`,
  );

  const portraitsDataUri = await Promise.all(
    PORTRAITS_GALERIE.map((p) => dataUri(path.join(CHEMINS.personas, p))),
  );

  const visuels = VISUELS.filter((v) => args.visuels.includes(v.n));
  const navigateur = await chromium.launch();
  const serveur = args.sauterCapture ? null : await demarrerServeur(CHEMINS.export);
  const resultats = [];

  try {
    for (const langue of args.langues) {
      for (const cleAppareil of args.appareils) {
        const appareil = APPAREILS[cleAppareil];

        let captures = new Map();
        if (serveur) {
          captures = await capturerEcrans({
            navigateur, baseUrl: serveur.url, langue, appareil, visuels,
            saveJson, dossier: CHEMINS.captures, log,
          });
        } else {
          for (const v of visuels.filter((x) => x.route)) {
            captures.set(v.cle, path.join(
              CHEMINS.captures, `${langue}-${appareil.id}-${v.cle}.png`,
            ));
          }
        }

        const dossier = path.join(CHEMINS.sorties, langue, appareil.id);
        await fs.mkdir(dossier, { recursive: true });

        for (const visuel of visuels) {
          const html = construireHtml({
            visuel, langue, appareil, fontFaceCss,
            captureDataUri: visuel.route ? await dataUri(captures.get(visuel.cle)) : null,
            grandPereDataUri: await dataUri(
              path.join(CHEMINS.portraitsHd, `${visuel.expression}.webp`),
            ),
            portraitsDataUri,
          });
          const fichier = path.join(
            dossier, `${String(visuel.n).padStart(2, "0")}-${visuel.cle}.png`,
          );
          await rendreVisuel({ navigateur, html, sortie: appareil.sortie, fichier });
          resultats.push(await controlerFichier(fichier, appareil.sortie));
          log(`  ✓ visuel ${langue}/${appareil.id}/${visuel.cle}`);
        }
      }
    }
  } finally {
    await navigateur.close();
    if (serveur) await serveur.fermer();
  }

  log("");
  log(resumerControles(resultats));
  if (resultats.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((e) => { console.error("❌", e.message); process.exitCode = 1; });
```

- [ ] **Étape 4 : Ajouter le script npm**

Dans `package.json`, à la suite de `gen:gp-hd` :

```json
"gen:appstore": "node scripts/generate-appstore-shots.mjs",
```

- [ ] **Étape 5 : Ignorer les captures intermédiaires**

Ajouter à `.gitignore` :

```
marketing/appstore/.captures/
```

- [ ] **Étape 6 : Essai sur une seule image**

```bash
npm run build
npm run gen:appstore -- --lang=fr --device=iphone --only=1
```

Attendu : `marketing/appstore/fr/iphone-6.5/01-chiner.png` en 1242 × 2688, et
`Contrôle : 1 / 1 fichiers conformes.`

Ouvrir le fichier et vérifier de l'œil : le titre est lisible, la capture
remplit l'écran du châssis sans déformation, le grand-père est net.

- [ ] **Étape 7 : Essai du visuel qui demande une interaction**

```bash
npm run gen:appstore -- --lang=fr --device=iphone --only=2
```

Attendu : le tiroir de négociation est ouvert sur la capture. S'il ne l'est
pas, le sélecteur du bouton est en cause — vérifier avec
`npx playwright open` sur l'URL servie, sans modifier `src/`.

- [ ] **Étape 8 : Lancer toute la suite de tests**

Lancer : `npx vitest run --maxWorkers=4`
Attendu : SUCCÈS, aucune régression sur les tests existants du dépôt.

- [ ] **Étape 9 : Commit**

```bash
git add scripts/appstore/capture.mjs scripts/appstore/rendu.mjs \
        scripts/generate-appstore-shots.mjs package.json .gitignore
git commit -m "feat(appstore): capture Playwright, rendu et point d'entree"
```

---

### Tâche 9 : Production et vérification des 40 images

**Fichiers :**
- Créer : `marketing/appstore/{fr,en,es,el}/{iphone-6.5,ipad-13}/*.png`

- [ ] **Étape 1 : Produire la série complète**

```bash
npm run gen:appstore
```

Attendu : `Contrôle : 40 / 40 fichiers conformes.` et un code de sortie 0.

- [ ] **Étape 2 : Vérifier l'inventaire**

```bash
find marketing/appstore -name "*.png" -not -path "*/.captures/*" | wc -l
```

Attendu : `40`

- [ ] **Étape 3 : Vérifier les langues à l'œil**

Ouvrir les cinq visuels grecs — c'est la langue à risque. Contrôler que les
titres s'affichent bien en GFS Didot (empattements fins, majuscules grecques)
et non dans une police système, et que la bulle grecque tient dans son cadre
sans déborder.

```bash
open marketing/appstore/el/iphone-6.5/
```

- [ ] **Étape 4 : Vérifier la cohérence langue interface / langue titre**

Sur `marketing/appstore/en/iphone-6.5/01-chiner.png`, l'interface du jeu à
l'intérieur du châssis doit être en anglais, pas en français. Même contrôle sur
`es` et `el`. C'est le piège principal du pipeline.

- [ ] **Étape 5 : POINT DE CONTRÔLE — validation par Guillaume**

Montrer la série. Les retouches attendues à ce stade portent sur le cadrage du
grand-père, la taille des titres et le choix des écrans capturés — tout cela se
rejoue avec `--only=N` sans relancer les 40.

- [ ] **Étape 6 : Commit**

```bash
git add marketing/appstore
git commit -m "feat(appstore): 40 visuels de la fiche App Store"
```

---

## Auto-relecture

**Couverture du spec.** Chaque section du spec est portée par une tâche :
gabarit et géométrie iPad → tâche 5 ; les cinq visuels et leurs routes →
tâche 1 ; textes, quatre langues et garde sur le libellé traduit → tâche 2 ;
pipeline en trois étapes → tâches 4, 8 ; arborescence de sortie et contrôle
sans alpha → tâches 6, 8, 9 ; portraits HD et point de contrôle → tâche 7 ;
captures localisées → tâches 4 et 8 ; extraction des `@font-face` → tâche 5.

**Point laissé volontairement ouvert.** Le spec note que les atouts s'affichent
en emoji dans la barre du bas du jeu ; aucune tâche n'y touche, conformément à
la décision prise.

**Risque principal.** L'étape 7 de la tâche 8 (ouverture du tiroir de
négociation) est la seule qui dépende d'une interaction, donc la plus fragile.
Elle est isolée dans sa propre étape de vérification pour être diagnostiquée
sans bloquer les quatre autres visuels.
