# Refonte du carnet de commandes — récompenses multiples et cérémonie de livraison

**Date** : 2026-07-30
**Statut** : validé (brainstorming avec Guillaume)
**Référence visuelle** : mockup Gemini (carte à avatar, barre de progression pleine largeur, récompense mise en valeur, en-têtes de section alignés à gauche avec compte)

## Objectif

Revoir l'affichage du carnet de commandes (onglet Commandes du registre) pour :

1. mettre en valeur la **récompense** de chaque commande ;
2. mettre en valeur la **progression** ;
3. permettre aux commandes de donner de l'**XP** et de l'**énergie** en plus de l'argent ;
4. célébrer la livraison par une **cérémonie d'envol** des récompenses vers le header.

Périmètre : `RegistreOverlay` / `OngletCommandes` / `CommandeRow`, `CourrierSheet`
(lettre), grand livre (onglet Comptes, suffixe seulement), `MobileHeader` (cible
énergie + gel d'affichage), modèle `recompense`, mécanique d'énergie (débordement).

Hors périmètre : onglet Comptes au-delà du suffixe de gains, refonte du châssis
du carnet (onglets, fond papier — conservés), contenu des quêtes (montants XP/énergie
réels par quête : l'équilibrage viendra après, les défauts couvrent l'existant).

## Décisions actées

| Sujet | Décision |
|---|---|
| Cachet de cire | Abandonné — bandeau récompense en pied de carte à la place |
| Modèle récompense | `{ argent, xp?, energie? }`, additif, défaut XP par catégorie |
| Énergie pleine à la livraison | **Débordement autorisé** (ex. 7/5), pub récompensée reste plafonnée |
| Surfaces d'affichage | Carte du carnet, détail déplié, lettre reçue, retour de livraison, grand livre (suffixe) |
| En-tête du carnet | Titre « Carnet de commandes » conservé, jour en sous-titre (pas de « JOUR 45 » héros) |
| Retour de livraison | Cérémonie d'envol (pas de toast), ordre **XP → énergie → argent** |
| Échéance `J−n` | Pastille mono en haut à droite de la carte, vermillon si ≤ 3 jours |

## 1. Modèle de données

`src/types/game.ts` — champ `recompense` de `CourrierPayloadMission` :

```ts
recompense: {
  argent: number;
  /** XP versée à la livraison. Absent → constante de catégorie
   *  (XP_QUETE_QUOTIDIENNE 25 / XP_QUETE_HEBDO 75 / XP_QUETE_PRINCIPALE 100). */
  xp?: number;
  /** Énergie versée à la livraison. Absent → 0. Peut faire déborder la jauge. */
  energie?: number;
}
```

Champs **additifs** : les courriers sérialisés dans les sauvegardes en cours
restent valides, aucune migration de save. Le comportement XP actuel (constante
par catégorie, versée par `livrerMission`) devient simplement le **défaut**.

`RecompenseCourrier` (lettres) reste inchangé (`argent?` seul).

## 2. Source unique de vérité : `src/lib/recompenses.ts`

Module **pur** (sans React), car la récompense s'affiche désormais sur quatre
surfaces qui ne doivent jamais diverger.

```ts
/** Récompense totale effective, défauts appliqués. */
export function recompenseEffective(
  payload: CourrierPayloadMission,
): { argent: number; xp: number; energie: number };

/** Verse la récompense : argent au grand livre (écriture mission_recompense),
 *  XP via appliquerGainXPBrocanteur, énergie avec débordement (settle puis +gain,
 *  borné par ENERGIE_PLAFOND, pas par ENERGIE_MAX). Extrait du corps de
 *  livrerMission (GameContext). */
export function appliquerRecompense(/* state, recompense effective, contexte ledger */): GameState;
```

`livrerMission` (`GameContext.tsx`) délègue à ces fonctions — le versement
inline (~120 lignes) en sort. Le bonus de points de compétence par chapitre
(`POINTS_BONUS_CHAPITRE`) reste où il est : c'est une mécanique de trame, pas
une récompense de commande.

## 3. Débordement d'énergie

Trois changements coordonnés :

- **`src/lib/energie.ts`** — `settleEnergie` : quand `energie >= energieMax`,
  retourner `energie` **inchangée** (plus de rabat à `max`), ancre suivant `now`
  (pas de recharge tant qu'on est ≥ max — comportement actuel conservé).
- **`src/lib/migrations.ts`** (~l.771) — le plafond de chargement passe de
  `ENERGIE_MAX` à un nouveau `ENERGIE_PLAFOND = 10` (exporté par `energie.ts`).
  `appliquerRecompense` plafonne aussi à `ENERGIE_PLAFOND`.
  Effet assumé : les vieilles saves à 6-7 ne sont plus rabattues (état désormais légal).
- **Affichage** — `MobileHeader` et `EnergieRecharge` affichent `7/5` tel quel ;
  `angleAiguille` clampe déjà le ratio à 1 (aiguille au max). Le bouton « + »
  de recharge reste masqué dès `energie >= ENERGIE_MAX` (comportement actuel :
  `peutRecharger = energie < energieMax`).

La **pub récompensée reste plafonnée** à `ENERGIE_MAX` (`Math.min` conservé,
`GameContext.tsx` ~l.412) : seule une commande peut faire déborder, sinon la
boucle pub devient une banque d'énergie.

## 4. Composant partagé : `RecompenseJetons`

`src/components/mobile/qg/RecompenseJetons.tsx` — rend les jetons de gains à
partir d'une `recompenseEffective`. Jetons : `● {n} €` (cire/laiton),
`★ {n} XP`, `⚡ {n}` (omis si `energie === 0` ; XP toujours > 0 par défaut).

Deux variantes :
- `"bandeau"` : pleine largeur avec libellé `RÉCOMPENSE` (pied de carte, détail déplié) ;
- `"ligne"` : inline compacte (lettre `CourrierSheet`).

Chaque jeton porte un `data-testid` (`jeton-argent`, `jeton-xp`, `jeton-energie`)
et un `data-jeton` exploitable par la cérémonie (rect source du vol).

## 5. La carte de commande (`CommandeRow`)

```
┌────────────────────────────────────────────┐
│ ┌──────┐  LE FLAIR                   J−4   │
│ │ 👤   │  Grand-père                       │
│ │      │  Meilleur profit sur une vente    │
│ │      │  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░    95 / 100 €  │
│ └──────┘                                   │
│────────────────────────────────────────────│
│ RÉCOMPENSE      ● 200 €   ★ 300 XP   ⚡ 2  │
└────────────────────────────────────────────┘
```

- **Bloc central pleine largeur** : plus de colonne droite (l'ancien compteur
  `1/2` + mini-barre 46 px disparaît). Titre display, commanditaire serif dessous.
- **Progression pleine largeur** : barre laiton sur toute la largeur du bloc
  central, compteur aligné à droite (`95 / 100 €` pour un objectif chiffré,
  `1/2` pour des objectifs multiples, `0/1` pour une cible unique).
  - Commandes à objets : les vignettes 44 px avec pastille ✓/○ restent
    (plafond 4 + jeton `+n`), au-dessus de la barre.
- **`J−n`** : pastille mono en haut à droite, vermillon (`#a31f1f`) si ≤ 3 jours.
- **État « prêt »** (livrable) : le libellé `RÉCOMPENSE` du bandeau devient
  `PRÊT ✓` en vert (`#2c5e3f`), bordure du bandeau laiton, fond légèrement
  réchauffé. Le badge vert isolé actuel disparaît.
- **Détail déplié** : inchangé dans sa structure (corps, liste des cibles,
  objectifs), mais la ligne récompense du bas devient le **bandeau
  `RecompenseJetons`**, juste au-dessus du bouton Livrer.

## 6. En-têtes de section (`OngletCommandes`)

Alignés à **gauche** (fini le centré sur filet pointillé) :

```
▤ COMMANDES PRINCIPALES (1)              ▾
+/− COMMANDES QUOTIDIENNES (2)           ▾
    Renouvellement dans 11 h 47
```

- Icône de tête (dossier pour principales, +/− pour périodiques — glyphe ou
  petit SVG inline, pas d'asset), libellé existant, **compte `(n)`**, chevron
  de repli à droite. Sous-libellé de renouvellement sous l'en-tête, aligné à gauche.
- Le repli par section (état `sectionsRepliees`) et la section « Terminées »
  restent fonctionnellement identiques.

## 7. En-tête du carnet (`RegistreOverlay`)

Conservé : titre « Carnet de commandes », sous-titre `Jour {n} · {k} livrable(s)`.
Aucun changement structurel (symétrie avec l'onglet Comptes).

## 8. Lettre reçue (`CourrierSheet`)

La ligne `Récompense +90 €` devient `RecompenseJetons` variante `"ligne"`,
alimentée par `recompenseEffective` — la lettre annonce exactement ce que la
livraison versera (XP comprise, désormais visible).

## 9. Grand livre

L'écriture `mission_recompense` garde `recette: argent`. Ses `params`
(structurés, additifs) gagnent `xp` et `energie` ; l'onglet Comptes les rend en
suffixe discret de la désignation (ex. `· +100 XP · +2 ⚡`). Pas de nouveau type
d'écriture, pas de migration ; les écritures historiques (sans ces params)
s'affichent comme aujourd'hui.

## 10. Cérémonie de livraison

Au tap sur « Livrer » (carnet ouvert, header visible au-dessus du scrim) :

1. **L'état est versé immédiatement** (`livrerMission` complet : inventaire,
   ledger, XP, énergie). Un kill de l'app ne perd rien. Seul l'**affichage**
   des compteurs du header est différé.
2. La carte passe en état « livrée » : bandeau allumé, puis envol séquencé des
   jetons, **ordre XP → énergie → argent**, un à la fois (~260 ms d'écart) :
   - `★ XP` → `[data-fly-target="xp-header"]`
   - `⚡ énergie` → `[data-fly-target="energie-header"]` (sauté si gain nul)
   - `● argent` → `[data-fly-target="caisse-header"]`
3. Chaque arrivée : pulsation + son pickup (fournis par `flyToTab`), et le
   compteur correspondant du header « rattrape » sa vraie valeur.
4. Après le dernier vol : la carte se fond/se rétracte, rejoint « Terminées »,
   compte de section mis à jour.

### Réalisation

- **`src/lib/quetes/ceremonieLivraison.ts`** (pur, testable — modèle
  `lib/bilan/ceremonie.ts`) : constantes de rythme +
  `phasesLivraison(recompense) → EtapeDatee[]` (liste ordonnée des vols avec
  délais, énergie omise si nulle). L'UI suit ce plan.
- **Gel d'affichage** : le carnet publie un `recompenseEnVol`
  (`{ xp, energie, argent }` restant à livrer visuellement) que `MobileHeader`
  soustrait des valeurs affichées ; chaque arrivée le décrémente. Même principe
  que `xpAffichageGele` du bilan. Canal : prop remontée via le state du QG
  (le header et le registre partagent la page QG) — pas de contexte global neuf
  si une remontée de props suffit.
- **Cible énergie** : ajouter `data-fly-target="energie-header"` sur le bloc ⚡
  du `MobileHeader`.
- **Clones en vol** : `flyToTab` avec `imageUrl: null` + `fallbackBg` au style
  du jeton (disque cire/laiton). Rect source = le jeton du bandeau (`data-jeton`).
- **StrictMode** : déclenchement dans le handler du tap, jamais dans un effet
  (pas de double vol).
- **Dégradation** : cible absente du DOM → `flyToTab` saute le vol et joue le
  son ; le compteur se met à jour immédiatement. Idem pour toute la cérémonie
  en environnement de test (jsdom).
- Pas de toast de livraison : la cérémonie le remplace.

## 11. i18n

Clés `carnet` touchées (FR/EN/ES/EL, `src/lib/i18n/ui/*.ts`) :
- ajouts : jetons (`jetonXp` « {n} XP », `jetonEnergie`), `pretBandeau` (« Prêt ✓ »
  réutilisable si le libellé actuel ne convient pas tel quel), compte de section
  si le format `(n)` est gabarisé ;
- `recompenseLabel` conservé (libellé du bandeau).

Règle d'or respectée : aucune chaîne localisée en save (les params du ledger
sont des nombres).

## 12. Tests

**Nouveaux**
- `src/lib/recompenses.test.ts` : défauts XP par catégorie ; énergie absente → 0 ;
  `appliquerRecompense` crédite ledger/XP/énergie ; débordement (4 + 2 → 6) ;
  plafond `ENERGIE_PLAFOND`.
- `src/lib/energie.test.ts` (étendu) : `settleEnergie` préserve 7/5 (pas de
  rabat, pas de recharge, ancre suit `now`) ; pub toujours plafonnée à 5.
- `src/lib/migrations` (étendu) : une save à 7 d'énergie n'est plus rabattue à 5,
  une save à 12 est rabattue à 10.
- `src/lib/quetes/ceremonieLivraison.test.ts` : ordre XP → énergie → argent,
  énergie omise si nulle, délais croissants.
- `RecompenseJetons.test.tsx` : jetons présents/omis selon la récompense,
  variantes bandeau/ligne.

**À reprendre** (cassés mécaniquement par la refonte)
- `CommandeRow.test.tsx` : le test `0/1` (l.117) et le sélecteur de barre par
  style inline `rgb(200, 162, 74)` (l.120) — rebranchés sur des `data-testid`
  stables (`progression-compteur`, `progression-barre`).
- Vérifier `OngletCommandes.test.tsx`, `RegistreOverlay.test.tsx`,
  `CourrierSheet.test.tsx` (textes de récompense).

Commande : `npx vitest run --maxWorkers=4` (obligatoire sur ce Mac).

## Ordre d'implémentation suggéré

1. Modèle + `recompenses.ts` + débordement énergie (pur, testable) ;
2. `RecompenseJetons` + refonte `CommandeRow` + en-têtes de section ;
3. `CourrierSheet` + suffixe grand livre ;
4. `ceremonieLivraison.ts` + cible énergie + gel d'affichage + branchement UI ;
5. i18n 4 langues + passe de tests complète.
