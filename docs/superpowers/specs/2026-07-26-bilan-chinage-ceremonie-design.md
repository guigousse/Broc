# Bilan de chinage — cérémonie de fin de session

**Date** : 2026-07-26
**Portée** : mode chinage uniquement, composants écrits pour accueillir la vente plus tard.

## Problème

À la fin d'une session de chinage, `SessionSummary` s'affiche en page pleine : fond papier
opaque, headers de session remplacés, deux `Panel` empilés (achats, XP), un bouton
« Rentrer au QG ». La session se termine sur une facture, pas sur une récompense.

Par ailleurs l'expérience gagnée se manifeste pendant la session par des floats « +N XP »
en haut à droite et par une barre de niveau qui avance en direct. Le gain est donc consommé
au fil de l'eau, et il ne reste rien à célébrer au bilan.

## Ce qu'on construit

Le bilan devient un calque **à l'intérieur de la session** : les deux headers restent en
place, le fond de brocante flouté reste visible derrière. Le tap sur « Retour au QG » ne
quitte plus l'écran immédiatement : il joue une cérémonie en trois actes — les objets
achetés s'envolent un à un vers le stockage, puis le décompte d'expérience se compose et
part rejoindre la barre de niveau, qui ne progresse **qu'à ce moment-là**.

## Écran

```
┌──────────────────────────────┐
│  N3 ▓▓▓░  ⚡4/6      1 250 € │  header haut inchangé (barre XP gelée)
├──────────────────────────────┤
│  ╔══════════════════════════╗│
│  ║ ▚  BILAN DE CHINAGE   ▞ ║│  cadre art déco, fixe pendant
│  ║   ◆ ────────────── ◆    ║│  toute la cérémonie
│  ║    Brocante de Sarlat    ║│
│  ║   3 objets  ·  −125 €    ║│
│  ╚══════════════════════════╝│
│                              │
│  🪑  CHAISE THONET    −45 €  │  ← zone défilante (les items)
│  📻  POSTE TSF        −80 €  │
│  🕰  PENDULE          −.. €  │
│                              │
├──────────────────────────────┤
│ 🚪 RETOUR AU QG      📦 8/12 │  header bas : atouts → icône Stockage
└──────────────────────────────┘
```

**Fond.** Le bilan remplace le deck d'objets dans le `<main>` de la page de session. Le
calque de fond flouté (`brocanteBg`, `blur(7px)`, voile forêt 42 %) reste en place et
visible — même traitement que pendant la session.

**Le cadre art déco.** Chevrons en éventail dans les angles supérieurs, double filet
laiton, losange central sur le séparateur. Construit avec les briques maison
(`BrassCorners`, `DecoDivider`) plutôt qu'avec un `Panel` générique, sur un fond papier
légèrement translucide pour laisser deviner la brocante derrière. Il contient, dans
l'ordre : le titre « Bilan de chinage », le nom localisé de la brocante, puis le total
(`3 objets · −125 €`). Le total vit dans le cadre — et non en pied de liste — pour que
l'écran garde son ancrage quand la liste se vide pendant l'acte 1.

**Les items.** Pas de panneau : chaque ligne est posée directement sur le fond flouté —
sticker (`ItemSticker thumb`), nom en display majuscules, prix en vermillon, séparés par un
filet pointillé. Le bloc défile si la session a été chargée ; le cadre ne défile pas.

**Le header bas.** Il garde exactement sa forme de session (fond `--forest-800`, liseré
`--brass-500` 3 px, `safe-bottom`). À gauche « Retour au QG » avec l'icône porte, à droite
l'icône Stockage suivie de la place occupée (`8/12`), porteuse de
`data-fly-target="stockage-bilan"`. Les 3 atouts disparaissent : ils n'ont plus d'objet à
ce stade.

**Session sans achat.** Le cadre affiche la mention « les poches vides » à la place de la
liste, et le tap sur « Retour au QG » saute directement à l'acte 2.

## Chorégraphie

Le tap sur « Retour au QG » désactive le bouton (plus de double-tap possible) et lance :

### Acte 1 — l'envol des items

Les items partent de haut en bas, **220 ms** d'écart entre chacun. Pour chacun : mesure du
rect de son sticker, puis `flyToTab()` vers `[data-fly-target="stockage-bilan"]` (620 ms,
atterrissage → `audioManager.playPickup()` + pulsation `broc-pulse-once` de la cible) —
c'est exactement le son et la pulsation de l'ajout d'objet existant (colis du grand-père,
`ColisOverlay`). La ligne s'efface derrière son sticker : fondu + effondrement de sa
hauteur en 260 ms, les lignes suivantes remontent.

Le compteur du header bas part de la place occupée **à l'entrée de la brocante** et
s'incrémente à chaque atterrissage (`8/12` → `9/12` → …).

### Acte 2 — le décompte d'expérience

Démarre à l'atterrissage du dernier item. Sous le cadre, à la place des items, le bloc XP
se compose :

```
  Achats           +24
  Découvertes      +20     ← lignes non nulles, cascade de 180 ms
  Négociations      +9
  ──────────────────────
       ╭────────╮
       │ +53 XP │          ← pastille : pop 300 ms
       ╰────────╯
```

Après une respiration de 350 ms, la pastille s'envole vers
`[data-fly-target="xp-header"]` (déjà porté par le bloc N/barre de `MobileHeader`), même
moteur `flyToTab`, mais `audioManager.playRarete()` à l'arrivée au lieu du son d'ajout —
pour ne pas confondre avec le stockage.

### Acte 3 — la barre rattrape

À l'atterrissage de la pastille, le gel d'affichage se lève : la barre du header glisse
jusqu'à sa vraie valeur (transition `width 300ms` déjà en place) et le numéro de niveau se
met à jour si le joueur a franchi un palier. 700 ms de pause, puis `enregistrerSession`,
`avancerJour`, et `router.push("/bureau")` — où le certificat de level-up se déclenche
comme aujourd'hui (`LevelUpOverlay` diffère déjà sa célébration hors routes de session).

### Garde-fous

**Passer la cérémonie.** Un tap n'importe où pendant les actes 1 et 2 saute à l'état final
— liste vide, bloc XP affiché, pastille atterrie, gel levé — puis sort après 400 ms. Les
vols en cours sont laissés se terminer (leurs clones se nettoient seuls) ; aucun nouveau
vol n'est lancé.

**Mouvement réduit.** Si `prefersReducedMotion()`, aucun vol ni cascade : l'état final
s'affiche immédiatement, `playPickup()` est joué une seule fois, le gel est levé, et il n'y
a pas de navigation automatique. Le bouton reste alors actif et porte le second tap, qui
sort vers le QG.

## Architecture

| Fichier | Rôle |
|---|---|
| `src/components/mobile/bilan/BilanSession.tsx` | Le calque bilan : cadre + liste + bloc XP, et pilotage de la cérémonie. |
| `src/components/mobile/bilan/CadreBilan.tsx` | Le cadre art déco seul, purement présentationnel. |
| `src/lib/bilan/ceremonie.ts` | Minutage et automate de phases, en pur. |
| `src/components/mobile/BarreBasSession.tsx` | Extraction de la barre du bas de `ItemSwipeDeck`. |
| `src/lib/xpAffichageGele.ts` | Gel d'affichage de la barre XP du header. |

### `BilanSession`

```ts
interface BilanItem {
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  prix: number;
}

interface BilanSessionProps {
  /** Nom localisé de la brocante. */
  titre: string;
  items: BilanItem[];
  /** Lignes de gain, dans l'ordre d'affichage ; les montants nuls sont ignorés. */
  xpLignes: ReadonlyArray<{ cle: "achats" | "decouvertes" | "negociations"; montant: number }>;
  /** Sélecteur de la cible du vol des items. */
  cibleVolItems: string;
  /** Place occupée / capacité à l'entrée de session, pour le compteur qui s'incrémente. */
  stockageDepart: { occupe: number; capacite: number };
  /** Fin de cérémonie : la page enregistre la session, avance le jour et navigue. */
  onTermine: () => void;
}
```

La structure est celle de n'importe quelle session : la vente s'y branchera en passant ses
ventes en `items` et une autre `cibleVolItems` (la caisse du header haut). Ce qui lui
manquera alors — le libellé du cadre et le signe des montants — sera ajouté à ce
moment-là plutôt que codé à l'avance : aucun `type: "chinage" | "vente"` tant qu'un seul
mode l'utilise.

### `ceremonie.ts`

Fonction pure `phasesCeremonie(nbItems, nbLignesXp)` renvoyant la liste datée des étapes
(`{ at: number; etape: … }`, triée), consommée par un `useEffect` à base de `setTimeout`
dans `BilanSession`. Le mouvement réduit court-circuite en amont (l'état final est posé
sans consulter le minutage). Le minutage est ainsi testable sans DOM, et les constantes
(`DECALAGE_ITEM_MS = 220`, `VOL_MS = 620`, `EFFACEMENT_LIGNE_MS = 260`,
`CASCADE_XP_MS = 180`, `POP_PASTILLE_MS = 300`, `RESPIRATION_MS = 350`,
`PAUSE_FINALE_MS = 700`) vivent en un seul endroit.

### `BarreBasSession`

`ItemSwipeDeck` porte aujourd'hui la barre du bas en dur dans son JSX. On l'extrait en un
composant qui prend un contenu gauche et un contenu droit et n'apporte que le châssis
(fond, liseré, padding, safe-bottom). Le deck l'utilise avec Sortir + `SkillDock`, le
bilan avec Retour au QG + jauge stockage. C'est la condition pour que le header bas du
bilan soit *le même* objet visuel que celui de la session, pas une copie qui dérivera.

### `xpAffichageGele`

Petit store de module exposé via `useSyncExternalStore`, plutôt qu'un contexte : c'est une
préoccupation purement d'affichage, ça évite de gonfler `GameContext` (déjà très large) et
d'imposer un provider de plus dans `layout.tsx`.

```ts
export function gelerXpAffichage(instantane: Brocanteur): void;
export function degelerXpAffichage(): void;
export function useXpAffiche(reel: Brocanteur): Brocanteur;  // instantané si gelé, réel sinon
```

`MobileHeader` appelle `useXpAffiche(state.brocanteur)` et affiche le résultat — niveau et
progression. La page de chinage gèle à l'entrée de session, dégèle à l'atterrissage de la
pastille **et** dans le cleanup de son `useEffect` de montage : aucun chemin de sortie
(retour arrière, navigation directe, remontée après kill) ne peut laisser la barre gelée.

### Comptabilité XP

`xpBrocanteurSession` (un seul nombre) devient
`xpSession: { achats: number; decouvertes: number; negociations: number }`, alimenté aux
trois endroits existants (achat au prix, découverte de collection, négociation conclue).
Le total reste ce qui part dans `enregistrerSession({ xpBrocanteur })` : le type
`SessionHistorique` ne bouge pas, **aucune migration de sauvegarde**.

Les appels à `gagnerXPBrocanteur` restent inchangés et immédiats — seul l'affichage est
gelé. L'XP n'est donc jamais perdue si l'app est tuée en pleine session, et les +10 de
découverte crédités atomiquement dans `GameContext.marquerDejaPossedeTemplate` n'ont pas à
être touchés.

### Suppression des floats XP

`useXpFloats` / `XpFloatsVue` ne sont utilisés que par les deux pages de session. On
supprime :

- `src/components/mobile/XpFloats.tsx` et `XpFloats.test.tsx` ;
- la keyframe `broc-xp-float` dans `globals.css` ;
- la clé `chrome.xpGagne` dans les 4 langues (aucun autre point d'appel).

La page de vente perd donc ses floats elle aussi, et sa barre est gelée pendant la session
(le rattrapage se fait au retour au QG, sans cérémonie, en attendant son propre bilan).

### i18n

Nouvelles clés FR/EN/ES/EL : titre du cadre, mention « les poches vides », les trois
libellés de lignes XP, aria-label de la jauge stockage, aria-label du bouton Retour au QG.
Aucune de ces chaînes n'entre en sauvegarde — la règle d'or est respectée.

## Ce qui ne bouge pas

- `SessionSummary` reste en place, inchangé, pour la session de vente et pour le replay de
  session dans le registre (`RegistreOverlay`).
- Le certificat de level-up et son différé hors session.
- Le format des sauvegardes.

## Filets de test

- `ceremonie.test.ts` — enchaînement et minutage des phases, cas 0 item, cas mouvement
  réduit.
- `BilanSession.test.tsx` — rendu des lignes et du total, tap « passer » → état final
  immédiat, `onTermine` appelé une seule fois.
- `xpAffichageGele.test.ts` + un cas dans `MobileHeader.test.tsx` — la barre affiche
  l'instantané pendant le gel, la vraie valeur après dégel.
- Ajustement des tests existants touchant `ItemSwipeDeck` après l'extraction de la barre du
  bas.

## Point de vigilance

`enregistrerSession` et `avancerJour` se déclenchent aujourd'hui au tap sur le bouton de
retour ; ils passent à la toute fin de l'acte 3, juste avant le `router.push`. La garde
synchrone `sessionEnregistreeRef` reste en place, et la cérémonie ne peut pas être relancée
puisque le bouton se désactive au premier tap (hors mouvement réduit, où le second tap ne
fait que sortir, sans rejouer de cérémonie).
