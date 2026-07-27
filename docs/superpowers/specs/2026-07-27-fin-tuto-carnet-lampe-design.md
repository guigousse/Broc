# Fin du tutoriel : la lampe s'inscrit dans le carnet de commandes

Date : 2026-07-27
Branche de travail : `fix/pre-appstore`

## Problème

À la fin du tutoriel guidé, le joueur suit la main flottante jusqu'au carnet de
commandes… et découvre une page vide. Le premier chapitre de la trame
(`trame_ch1`, « La lampe de mon atelier ») est délivré ailleurs, par la pastille
« ! » du grand-père au bureau, sans lien avec le carnet qu'on vient de lui
montrer. Les deux gestes se concurrencent : selon l'ordre des taps, le joueur
ouvre un carnet vide ou un carnet déjà rempli sans avoir vu qui écrit dedans.

## Objectif

Faire du carnet le lieu de la scène : la main guide vers le carnet, et c'est
**une fois le carnet ouvert** que le grand-père parle de sa lampe — la première
ligne du carnet s'écrit sous les yeux du joueur.

## Enchaînement retenu

```
tuto_conclusion (grand-père, bureau)
   « …mon carnet de commandes. Ouvre-le donc — j'ai justement
     quelque chose à y inscrire. »
        ↓ terminerTutoriel()  →  miniTutoCarnet: "ouvrir"
main flottante  →  zone gauche  →  main sur le carnet
        ↓ tap
RegistreOverlay ouvert, onglet Commandes, page VIDE
        ↓ ~500 ms de battement (le joueur voit la page vide)
DialogueOverlay (z-index 120, par-dessus le carnet z-index 51) : dlg_trame_ch1
   « Ah, tu l'ouvres… Alors écris, petit. La toute première
     ligne sera pour moi. »  + les 4 lignes existantes de la lampe
        ↓ onFini
accepterChapitrePrincipal("trame_ch1")  +  missionCibleId = "trame_ch1"
        ↓
carnet toujours ouvert : « La lampe de mon atelier » s'affiche, dépliée
```

Décisions de mise en scène :

- **Le carnet ne se ferme jamais.** Le dialogue se joue par-dessus ; l'entrée
  apparaît dans le carnet resté ouvert.
- **La pastille « ! » du grand-père reste éteinte** de la fin du tutoriel
  jusqu'à ce que le dialogue de la lampe soit armé/consommé. Le seul chemin vers
  le chapitre 1 passe par le carnet. Elle reprend son rôle normal dès le
  chapitre 2.
- **L'entrée arrive dépliée** (accordéon ouvert, objectif visible), en
  réutilisant la plomberie existante `missionCibleId` → `missionInitialeId` →
  `ouvertInitialId`, déjà employée par les badges livrables. Pas d'animation
  d'écriture.

## Découpage technique

### `src/lib/tutoriel.ts`

Nouveau prédicat pur, à côté de `doigtSwipeVersCarnet` :

```ts
/** Vrai quand l'ouverture du carnet doit déclencher le chapitre du grand-père. */
export function chapitreDuCarnetDu(
  miniTuto: GameState["miniTutoCarnet"],
  registreOuvert: "commandes" | "comptes" | null,
): boolean
```

Vrai seulement si `miniTuto === "ouvrir"` et `registreOuvert === "commandes"`.
Garde le layout bête et rend la règle testable.

### `src/app/(qg)/layout.tsx`

1. `QgCarnet.onTap` n'appelle plus `terminerMiniTutoCarnet()` — il se contente
   d'ouvrir le registre. La clôture du mini-tuto migre dans l'effet A.
2. **Effet A** — dépend de `chapitreDuCarnetDu(state.miniTutoCarnet, registreOuvert)` :
   appelle `terminerMiniTutoCarnet()` et, si `chPret` existe, arme
   `setDialogueChapitreId(chPret.id)` + `setLampeEnAttente(true)`. Aucun timer
   ici.
3. **Effet B** — dépend uniquement de `lampeEnAttente` : `setTimeout(500)` →
   `setDialogueQg({ id: "dlg_" + id, lignes })` puis `setLampeEnAttente(false)` ;
   cleanup `clearTimeout`.

   *Pourquoi deux effets :* si le timer vivait dans l'effet A, le flip d'état
   provoqué par `terminerMiniTutoCarnet()` changerait ses dépendances, son
   cleanup s'exécuterait et tuerait le timer avant qu'il ne tire. Le découplage
   met le timer sur une dépendance stable — c'est aussi ce qui le rend correct
   sous StrictMode (double montage : le cleanup annule, le second effet réarme).
4. `GrandPereBadge.visible` devient
   `!!chPret && !dialogueQg && !dialogueChapitreId && state.miniTutoCarnet !== "ouvrir"`.
5. `DialogueOverlay.onFini` : dans la branche `dialogueChapitreId`, ajouter
   `setMissionCibleId(dialogueChapitreId)` avant de le remettre à `null`, pour
   que la commande neuve arrive dépliée.

Autre point d'entrée du registre — `LivrablesBadges` (ligne ~870) — hors sujet
ici : il est gaté sur `!tutoActif` et sur l'existence d'une commande livrable,
donc inatteignable au moment du mini-tuto. Placer la règle dans un effet sur
`registreOuvert` (plutôt que dans le handler de tap) la rend malgré tout
indépendante du point d'entrée.

### `src/components/mobile/qg/overlays/OngletCommandes.tsx`

`ouvertId` est initialisé par `useState(ouvertInitialId ?? null)`, donc lu au
seul montage. Ici le carnet est déjà monté quand la commande arrive : ajouter un
`useEffect` qui synchronise `ouvertId` lorsque `ouvertInitialId` devient non nul
(l'effet de scroll existant, déjà branché sur `ouvertInitialId`, n'a pas besoin
de changer).

### Textes (4 langues)

Source FR dans `src/data/`, overlays dans `src/lib/i18n/contenu/{en,es,el}/dialogues.ts`.

1. `SEQUENCES_TUTORIEL.tuto_conclusion`, ligne 2 (`src/data/dialogues.ts`) :

   - avant : « Tiens : mon carnet de commandes. Les gens y notent ce qu'ils cherchent — regarde-le souvent. »
   - après : « Tiens : mon carnet de commandes. Les gens y notent ce qu'ils cherchent. Ouvre-le donc — j'ai justement quelque chose à y inscrire. »

2. `QUETES_PRINCIPALES[trame_ch1].dialogue` (`src/data/quetesPrincipales.ts`) :
   nouvelle ligne **en tête**, humeur `souriant` :

   « Ah, tu l'ouvres… Alors écris, petit. La toute première ligne sera pour moi. »

Les overlays EN/ES/EL sont des tableaux indexés par ligne : `tuto_conclusion[1]`
est réécrit et `dlg_trame_ch1` gagne une entrée en position 0 dans chacun des
trois fichiers.

## Ce qui ne change pas

- Aucun changement de type de sauvegarde, aucune migration : `miniTutoCarnet`
  garde ses deux valeurs `"ouvrir" | "termine"`.
- `chapitrePret()`, `accepterChapitre()`, `appliquerFinTutoriel()` sont
  inchangés — seul le point de déclenchement UI bouge.
- Une partie sauvegardée avec `miniTutoCarnet: "ouvrir"` reprend la nouvelle
  mise en scène au chargement. Une partie plus avancée (`"termine"`, chapitre 1
  déjà accepté) ne voit aucune différence.

## Tests

- `src/lib/tutoriel.test.ts` : `chapitreDuCarnetDu` — vrai sur
  (`"ouvrir"`, `"commandes"`), faux sur (`"termine"`, `"commandes"`),
  (`"ouvrir"`, `"comptes"`), (`"ouvrir"`, `null`).
- `src/lib/i18n/contenu/dialogues.test.ts` : filet existant — il vérifie déjà que
  chaque overlay EN/ES/EL a le même nombre de lignes que le FR, `dlg_trame_chN`
  compris. Il doit rester vert après l'ajout de la ligne d'amorce.
- Nouveau test RTL sur `OngletCommandes` : une commande dont l'id arrive via
  `ouvertInitialId` **après** le montage s'affiche dépliée.
- Non couvert par les tests, à valider sur device : la chorégraphie complète
  (battement de 500 ms, dialogue par-dessus le carnet, entrée qui se pose),
  y compris au retour dans l'app en cours de séquence.
