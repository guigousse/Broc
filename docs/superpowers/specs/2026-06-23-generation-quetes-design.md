# Génération des quêtes + arc principal (Sous-projet 2)

Date : 2026-06-23
Branche : `feat/bureau-deux-carnets`
Suite de : `2026-06-23-carnet-quetes-vertical-design.md` (SP1 — modèle + UI, déjà livré).

## Contexte

Le SP1 a posé le modèle (`CourrierPayloadMission` à `categorie` + `cibles[]`,
commanditaires avec `domaine`/`avatar`) et l'UI verticale du carnet. Aujourd'hui
les quêtes sont des **missions de démo** (`creerMissionsTest`, ids `demo_*`)
injectées au démarrage.

Le SP2 remplace ces démos par :
1. un **générateur de quêtes secondaires** (probabiliste, réalisable, équilibré) ;
2. un **arc narratif principal** scénarisé (le grand-père antiquaire disparu).

## Objectifs

1. Générer des **quêtes secondaires** au fil du jeu : probabiliste par jour,
   objets toujours **réalisables** (présents dans les brocantes débloquées),
   cap évolutif, difficulté et récompense progressives, échéances ≥ 2 semaines.
2. Implémenter l'**arc principal** en chapitres scénarisés débloqués par la
   progression, culminant sur l'objet unique « Les bijoux de la reine ».
3. Tout en **fonctions pures testables**, branchées sur `avancerJour`.
4. **Aucune perte de sauvegarde** ; amorce de l'arc injectée pour les saves
   existantes.

Hors périmètre : refonte de l'UI du carnet (faite au SP1), nouveaux
commanditaires illustrés (portraits viendront plus tard).

## Trame narrative (arc principal)

Le joueur a hérité de son **grand-père antiquaire**, qui a **disparu** (peut-être
pas mort — le scénario entretient le **mystère**). Avant de disparaître, le
grand-père a **écrit à l'avance toutes les lettres** de son carnet, **adressées
directement au joueur** (« tu »), anticipant étrangement son parcours. La
dernière commande du carnet : retrouver **« Les bijoux de la reine »**, objet
unique présent uniquement dans la **dernière brocante**.

**Ton** : nostalgie + comédie sarcastique + mystère.

L'arc = se faire **inviter au Grand Salon des Antiquaires** (brocante finale) en
débloquant progressivement les brocantes, puis y acquérir l'unique. Des
**indices** sur la disparition sont distillés de chapitre en chapitre, avec une
**révélation / fin ouverte** à la finale.

### Éléments existants réutilisés
- Brocante finale : `salon-antiquaires-drouot` (« Grand Salon des Antiquaires »,
  tier 4, débloqué quand 5 brocantes tier 3 le sont).
- Objet unique : `uniq.mo.bijou_marie_antoinette` (déjà dans le `poolExclusif`
  du salon final) — **renommé « Les bijoux de la reine »** (`nom` uniquement,
  templateId inchangé).

## Architecture (modules)

Tout le neuf vit dans `src/lib/quetes/` + `src/data/quetesPrincipales.ts`, en
fonctions pures. `GameContext.avancerJour` orchestre.

| Fichier | Rôle |
|---|---|
| `src/lib/quetes/atteignables.ts` | `objetsAtteignables(state): ObjetTemplate[]` |
| `src/lib/quetes/progression.ts` | `niveauProgression(state)` + `capSecondaires(state)` |
| `src/lib/quetes/recompense.ts` | `calculerRecompense(cibles, templates): number` |
| `src/lib/quetes/textes.ts` | gabarits titre/corps par commanditaire |
| `src/lib/quetes/generateurSecondaire.ts` | `genererQueteSecondaire(state, jour, rng): Courrier \| null` |
| `src/data/quetesPrincipales.ts` | registre des chapitres (données) |
| `src/lib/quetes/principales.ts` | `debloquerQuetesPrincipales(state, jour): Courrier[]` |
| `src/lib/courrier.ts` | retrait des `demo_*` ; helper d'injection amorce |
| `src/context/GameContext.tsx` | branchement dans `avancerJour` |
| `src/data/uniques.ts`, `src/data/brocantes.ts` | renommage de l'unique |

### Objets atteignables (`atteignables.ts`)

```ts
function objetsAtteignables(state: GameState): ObjetTemplate[]
```
- Calcule l'ensemble des `ObjetTemplate` que le joueur peut effectivement
  trouver, à partir des **brocantes débloquées** (`brocantesDebloquees(state)` /
  `lib/deblocage`).
- Pour chaque brocante débloquée : `poolPourTier(brocante.tier)` (pool générique)
  + `brocante.poolExclusif` résolus.
- **Exclut** les uniques (`uniq.*`) et légendaires (`leg.*` / via `rarete`),
  réservés au chinage et à l'arc principal.
- Dédupliqué par `templateId`.

### Progression & cap (`progression.ts`)

```ts
function niveauProgression(state): { tierMax: 1|2|3|4; nbDebloquees: number }
function capSecondaires(state): number  // clamp(2 + floor(nbDebloquees/3), 2, 6)
```
- `tierMax` = tier le plus élevé parmi les brocantes débloquées.
- Sert à piloter le **cap**, le **nombre de cibles** et l'**état min**.

### Récompense (`recompense.ts`)

```ts
function calculerRecompense(cibles: MissionCible[], templates: Map<string, ObjetTemplate>): number
```
- Base = Σ sur chaque cible de `prixReferenceBase` du template, **pondéré par
  `etatMin`** (multiplicateur croissant : Mauvais ×0,8 … Pristin ×1,4 ; absent ⇒ ×1).
- × **prime** dans `[1,3 ; 1,6]` (déterministe via une valeur dérivée, pas de
  hasard non testable — p. ex. médiane 1,45, modulée par le nb de cibles).
- + **bonus multi-objets** : +10 % par cible au-delà de la première.
- Arrondi à l'unité « ronde » la plus proche (multiple de 5).

### Générateur secondaire (`generateurSecondaire.ts`)

```ts
function genererQueteSecondaire(
  state: GameState,
  jour: number,
  rng: () => number = Math.random,
): Courrier | null
```
Étapes :
1. **Cap** : si `secondaires actives ≥ capSecondaires(state)` → `null`.
2. **Tirage** : si `rng() ≥ P_GEN` (`P_GEN ≈ 0,3`) → `null`.
3. **Pool** : `pool = objetsAtteignables(state)` moins les `templateId` déjà
   demandés par une quête active. Si vide → `null` (garde-fou début de partie).
4. **Commanditaire** : choisir (via `rng`) un commanditaire (hors `maman`,
   `grand-pere`) dont le `domaine` a ≥ 1 objet dans `pool`. Fallback : tout
   commanditaire à domaine + tout objet du `pool`.
5. **Cibles** (difficulté selon `tierMax`) :
   - tier 1-2 : 1 cible, `etatMin` absent (parfois `Bon`).
   - tier 3-4 : 1 à 3 cibles (tirage pondéré), `etatMin` parfois `Très bon`.
   - cibles tirées dans le `domaine` du commanditaire en priorité ; objets
     distincts.
6. **Récompense** : `calculerRecompense(...)`.
7. **Échéance** : `jourLimite = jour + (14 + floor(rng()*8))` (14-21 j).
8. **Texte** : `textes.ts` fournit titre + corps selon le commanditaire, nom(s)
   d'objet insérés. Courrier `categorie: "secondaire"`, `lu: true`, id unique
   (`sec_<jour>_<compteur/rng>`).

### Gabarits de texte (`textes.ts`)

- Par commanditaire (`jeux-video`, `set-designer`, `mode`, `art`, + générique),
  un petit ensemble de gabarits `{ titre, corps }` avec emplacements
  `{objet}` / `{objets}` / `{etat}`.
- Sélection via `rng`. Ton cohérent avec la `personnalite`.

### Arc principal — registre (`data/quetesPrincipales.ts`)

```ts
interface ChapitrePrincipal {
  id: string;            // "principale_ch1" …
  ordre: number;         // 1..N
  condition: ConditionDeblocage;   // type existant (depart | valeurCollection | brocantesDebloquees | …)
  payload: {
    titre: string;
    corps: string[];     // lettre du grand-père, « tu », ton nostalgie+sarcasme+mystère
    cibles: MissionCible[];   // peut être [] pour un chapitre purement narratif
    recompense: { argent: number };
    jourLimiteOffset?: number; // les principales ont une échéance large ou aucune
  };
}
export const QUETES_PRINCIPALES: ChapitrePrincipal[]
```

**5 chapitres** (textes écrits à l'implémentation, respectant le ton) :
1. `principale_ch1` — **« La dernière page du carnet »** (`condition: depart`) :
   amorce ; petit objet-souvenir tier 1 à « rapporter » au grand-père.
2. `principale_ch2` — **« Te faire un nom »** (`brocantesDebloquees tier 2 ≥ 1`) :
   1-2 pièces correctes.
3. `principale_ch3` — **« Les portes du beau monde »** (`brocantesDebloquees
   tier 3 ≥ 1`) : pièce exigeante (`Très bon`).
4. `principale_ch4` — **« L'invitation »** (salon final débloqué) : narratif
   (cibles `[]`), indices sur la disparition.
5. `principale_ch5` — **« Les bijoux de la reine »** (chapitre 4 livré) : cible
   = `uniq.mo.bijou_marie_antoinette` ; livrable seulement une fois l'unique
   possédé (donc après avoir atteint le Salon final) → révélation / fin ouverte.

Expéditeur dédié **`grand-pere`** ajouté à `EXPEDITEURS` (nom « Grand-père »,
personnalité « Antiquaire disparu », pas d'avatar pour l'instant → pastille).

### Déblocage des principales (`principales.ts`)

```ts
function debloquerQuetesPrincipales(state: GameState, jour: number): Courrier[]
```
- Trouve le **prochain chapitre** (`ordre` minimal non encore présent dans
  `state.courriers`).
- L'injecte (Courrier mission `categorie: "principale"`, `lu: true`) **si** :
  son `condition` est remplie (`estConditionRemplie`, `lib/deblocage`) **et** le
  chapitre précédent est `livree` (chapitre 1 sans prérequis).
- Idempotent (ne réinjecte jamais un chapitre déjà présent).
- Échéance : large (`jour + jourLimiteOffset`) ou aucune (`undefined`).

## Intégration (`GameContext.avancerJour`)

Pour chaque jour du pas, après l'expiration des missions échues (déjà en place) :
1. `debloquerQuetesPrincipales(state, jourCourant)` → ajoute les courriers dus.
2. `genererQueteSecondaire(state, jourCourant)` → ajoute éventuellement une
   secondaire.
3. Pour chaque courrier mission ajouté, créer la `MissionResolution`
   `{ courrierId, statut: "active" }`.

Les ajouts sont fusionnés dans le `setState` existant d'`avancerJour` (pas de
double passe d'état).

## Migration / compat

- **Amorce** : `principale_ch1` injecté si absent au chargement
  (`migrerSauvegarde`/`injecter…`), pour les saves existantes.
- **Retrait des démos** : `creerMissionsTest` (ids `demo_*`) n'est plus injecté
  pour les nouvelles parties ; `ID_MISSIONS_TEST` et la fonction sont retirés ou
  vidés. Les `demo_*` déjà dans une save restent (vivent / expirent) — inoffensifs.
- **Renommage unique** : seul le `nom` change ; templateId inchangé → aucune
  migration de données nécessaire.

## Tests

- `atteignables.test.ts` : n'inclut que les objets des brocantes débloquées ;
  exclut uniques/légendaires ; déduplique.
- `recompense.test.ts` : prime appliquée, bonus multi-objets, pondération état,
  arrondi.
- `progression.test.ts` : `tierMax`/`capSecondaires` selon brocantes débloquées.
- `generateurSecondaire.test.ts` (rng injecté, déterministe) : respecte le cap ;
  `null` si pool vide ou tirage raté ; pas de doublon de `templateId` actif ;
  cible le domaine du commanditaire ; échéance ∈ [14, 21] ; difficulté selon tier.
- `principales.test.ts` : injecte le chapitre seulement si condition remplie +
  chapitre précédent livré ; idempotent ; finale livrable uniquement avec
  l'unique en inventaire.
- Garde-fou : aucune génération si `objetsAtteignables` vide.

## Risques / points ouverts

- **Équilibrage** (P_GEN, prime, courbe de cap) : valeurs de départ raisonnables,
  à ajuster après test en jeu.
- **Textes** : qualité du ton (nostalgie/sarcasme/mystère) — itératif, contenu
  écrit à l'implémentation et relu.
- **Portraits** des commanditaires/grand-père : pastille à initiale en attendant.
- Si la décision « finale : objet conservé vs consommé » évolue, seul le
  chapitre 5 est concerné (par défaut : consommé comme une livraison classique).
```
