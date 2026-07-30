# Vendeur mystère — bandeau aligné et cartel de visionnage

Date : 2026-07-30
Composants : `src/components/mobile/chine/ChineMystereDrawer.tsx`,
`src/components/mobile/BoiteMystereOverlay.tsx`,
`src/components/mobile/EnergieRecharge.tsx`

## Problème

Le vendeur mystère parle une autre langue visuelle que le reste du jeu.

Son bandeau de nom est un `namePlateLuxe` local — vert profond, texte laiton —
alors que les quatorze autres vendeurs partagent le bandeau laiton de
`namePlateStyle()`. Croisé dans le même carrousel, il ne se lit pas comme « un
vendeur de plus » mais comme un élément d'interface étranger.

Son bouton d'action annonce « Regarder une pub pour ouvrir ». La formule dit
l'action mais ne se **voit** pas : rien ne la relie au seul autre bouton
publicitaire du jeu, le cartel laiton de la machine à énergie. Le joueur doit
lire pour comprendre, là où il devrait reconnaître.

Enfin le texte de la modale — « Une boîte scellée… personne ne sait ce qu'elle
cache. Regarde une pub pour l'ouvrir. » — est plat : il décrit la mécanique au
lieu de faire parler le personnage, un dandy masqué en costume vert semé de
points d'interrogation dorés.

## Ce qu'on veut

Le vendeur mystère rentre dans le rang du carrousel : même bandeau que les
autres. Son costume vert suffit à le distinguer — c'est lui qui doit trancher
sur le laiton, pas l'inverse.

Le geste « je regarde une pub » prend partout la même forme : une plaque dorée
à rivets portant une grande icône de visionnage. Vue sur la machine à énergie,
elle se reconnaît sur la boîte mystère sans qu'on ait à la lire.

Et le masqué dit quelque chose qui lui ressemble.

## 1. `CartelPub` — le cartel de visionnage partagé

Nouveau composant `src/components/ui/CartelPub.tsx`.

Le cartel laiton n'existe aujourd'hui qu'à l'intérieur d'`EnergieRecharge.tsx`,
soudé à son placement absolu sur l'illustration de la machine
(`plaqueBtnStyle`, `rivetStyle`, `ZONE_PLAQUE`). On l'extrait en suivant le
patron déjà en place dans le projet pour les identités visuelles partagées —
`src/components/ui/namePlate.ts` : le module possède l'**apparence**, l'appelant
possède la **mise en page**.

```tsx
export function CartelPub({
  indisponible,   // grisé + désaturé + curseur interdit
  pulse,          // halo doré pulsant (mode alerte de la machine)
  onClick,
  ariaLabel,      // nom accessible ; toujours renseigné
  style,          // positionnement/dimensions, à la charge de l'appelant
  children,
}: { … }): JSX.Element
```

Le composant rend un `<button>` qui fusionne son style de base et le `style`
reçu, et encadre `children` des deux rivets `aria-hidden`.

Ce qu'il possède, repris tel quel de `plaqueBtnStyle` : dégradé laiton
disponible / grisé, bordure, `boxShadow` (dont le halo `0 0 14px`), `filter:
saturate(0.5) brightness(0.85)` en indisponible, `color: #3a2410`,
`font-display` 700, `letterSpacing`, `textShadow`, `cursor`,
`WebkitTapHighlightColor`, `display: flex` centré, `gap: 4`, `borderRadius: 4`,
et l'animation `broc-cartel-pulse` quand `pulse`.

Ce qu'il ne possède pas, et que chaque appelant passe : `position`, `left`,
`top`, `width`, `height`, `margin`, `padding`.

### Migration d'`EnergieRecharge`

`plaqueBtnStyle` et `rivetStyle` disparaissent du fichier. Le bouton pub devient
un `CartelPub` recevant en `style` exactement ce que `ZONE_PLAQUE` produisait
(`position: absolute`, `left/top/width/height` en %, `padding: "0 14px"`), et en
`children` le contenu conditionnel actuel (pub en cours / énergie au maximum /
pub épuisée / `MonitorPlay` + `+1` + `Zap`).

`ZONE_PLAQUE`, `ZONE_LEVIER`, `levierTapStyle` et la zone de tap redondante sur
le levier peint restent inchangés.

Contrainte de non-régression : l'`aria-label` reste `d.chrome.regarderPub`
lorsque la pub est disponible, et les textes d'indisponibilité restent le
contenu du bouton. Les tests d'`EnergieRecharge` ciblent le bouton par son nom
accessible (`/regarder une pub/i`, `/plus de pub aujourd'hui/i`, `/au
maximum/i`) — ils doivent passer sans modification.

## 2. Le tiroir du vendeur mystère

`ChineMystereDrawer.tsx`.

**Bandeau de nom.** `namePlateLuxe` est supprimé ; le bandeau devient
`namePlateStyle("12px 12px 0 0")`, importé de `@/components/ui/namePlate` —
strictement le même appel que `ChineNegoDrawer`.

**Bouton.** `btnLuxe` est supprimé. L'action devient :

```tsx
<CartelPub
  ariaLabel={d.sheets.regarderPubPourOuvrir}
  onClick={onOuvrirBoite}
  style={{ width: "100%", marginBottom: 10, padding: "10px 18px" }}
>
  <MonitorPlay size={26} strokeWidth={2.2} aria-hidden />
  {d.sheets.pourOuvrirLaBoite}
</CartelPub>
```

Le libellé **visible** est « Pour ouvrir la boîte » ; le nom **accessible**
reste « Regarder une pub pour ouvrir ». Un lecteur d'écran doit continuer
d'annoncer qu'il s'agit d'une publicité — c'est déjà la règle appliquée par la
machine à énergie, dont le bouton n'affiche qu'une icône.

**Statuts.** `statutTexte` local devient paramétré par couleur — même signature
et même corps que son homonyme de `ChineNegoDrawer`, qui n'est pas exporté et
reste local à chaque fichier (trois lignes ; les factoriser créerait un module
partagé pour moins de code qu'il n'en économise). La couleur fixe
`var(--brass-300)` cède la place à :

- « Boîte déjà ouverte » → `var(--brass-700)`, comme le statut « Acquis ».
- « Stockage plein » → `var(--vermillion-600)`, comme dans le tiroir de négo.

Le `textShadow` local disparaît avec lui : les statuts du tiroir de négo n'en
ont pas.

Inchangés : `drawerStyle`, `imageZone`, `vendeurImg` (hauteur `clamp(143px,
21vh, 182px)`), `rightZone`, et l'illustration `VENDEUR_MYSTERE_ILLUSTRATION`.

## 3. La modale d'ouverture

`BoiteMystereOverlay.tsx`, **écran scellé uniquement**.

Le bouton d'ouverture devient un `CartelPub` pleine largeur portant la même
icône et le même libellé que le tiroir, avec `indisponible={enCours}`. Pendant
le chargement de la pub, il affiche `d.sheets.ouverture` à la place de
l'icône et du libellé — comme la machine affiche « Pub en cours… ».

Le bouton « Parfait ! » de l'écran de révélation **ne change pas** : ce n'est
pas un déclencheur de publicité, il garde `boutonStyle` en laiton plein. L'icône
`Gift` de lucide n'est plus utilisée et son import disparaît.

Les phases `vibration` / `eclosion` / `reveal`, leurs durées, l'aura, le flash
et la sortie de l'objet ne sont pas touchés.

## 4. Chaînes i18n

Dans `fr.ts`, `en.ts`, `es.ts`, `el.ts`, section `sheets` :

**Nouvelle clé `pourOuvrirLaBoite`** — le libellé visible du cartel :

| | |
|---|---|
| FR | `Pour ouvrir la boîte` |
| EN | `To open the box` |
| ES | `Para abrir la caja` |
| EL | `Για να ανοίξεις το κουτί` |

**`boiteDescription` réécrite** — la voix du masqué :

| | |
|---|---|
| FR | `Personne n'a jamais vu ce qu'il y a là-dedans. Moi non plus, d'ailleurs.` |
| EN | `Nobody has ever seen what's inside. Me included, come to think of it.` |
| ES | `Nadie ha visto jamás lo que hay dentro. Yo tampoco, la verdad.` |
| EL | `Κανείς δεν έχει δει ποτέ τι κρύβει. Ούτε κι εγώ, βασικά.` |

La mention « Regarde une pub pour l'ouvrir » quitte la description : elle est
désormais portée par le cartel lui-même.

`regarderPubPourOuvrir` est **conservée** dans les quatre langues — elle devient
le nom accessible du cartel dans le tiroir et dans la modale.

## Tests

Aucun des composants touchés côté boîte mystère n'a de test aujourd'hui.

**`src/components/ui/CartelPub.test.tsx`** (nouveau)

- Rend un bouton dont le nom accessible est l'`ariaLabel` reçu, et non le texte
  des `children`.
- `indisponible` pose l'attribut `disabled` et n'appelle pas `onClick` au clic.
- Le `style` reçu est fusionné sur le style de base sans écraser l'apparence
  (vérifier qu'une largeur passée s'applique et que la couleur de texte reste
  celle du cartel).

**`src/components/mobile/chine/ChineMystereDrawer.test.tsx`** (nouveau) — les
trois états mutuellement exclusifs :

- Ouvrable (`plein: false`, `boiteReclamee: false`) : un bouton nommé
  `/regarder une pub/i` est présent, le clic appelle `onOuvrirBoite`, et le
  libellé visible « Pour ouvrir la boîte » est rendu.
- Déjà réclamée (`boiteReclamee: true`) : aucun bouton, le texte
  « Boîte déjà ouverte » est affiché.
- Stockage plein (`plein: true`, `boiteReclamee: false`) : aucun bouton, le
  texte « Stockage plein » est affiché.
- Le bandeau affiche « Vendeur mystère ».

Le composant ne consomme que `useLangue` — un rendu enveloppé du provider de
langue suffit, sans `GameContext`.

**`EnergieRecharge.test.tsx`** : aucune modification attendue. C'est le filet de
non-régression de l'extraction ; il doit passer tel quel.

Rappel d'exécution sur ce poste : `npx vitest run --maxWorkers=4`. Sans le
drapeau, les workers meurent de famine et produisent des dizaines de faux
échecs.

## Hors périmètre

Relevé pendant l'exploration, laissé en l'état à la demande explicite :

- **Taux de drop de la boîte.** `POIDS_RARETE_BOITE` (70 / 26 / 4) sont des
  poids **par template**, pas des pourcentages. Croisés avec la composition du
  pool, les chances réelles sont 89,6 % commun / 10,0 % rare / **0,4 %**
  légendaire, et ce quel que soit le tier de la brocante. Le chinage normal en
  4⭐ donne 71,2 / 28 / **0,8**. La boîte payée en publicité est donc **moins
  généreuse** qu'un objet ramassé gratuitement sur un étal haut de gamme, ce qui
  contredit le commentaire « boostés vs chinage normal » du fichier.
- **Commentaire faux.** `ClientPage.tsx:203` annonce un tirage « 1/10 » là où
  `CHANCE_APPARITION_BASE` vaut `0.2`.
- **Tableau des probabilités.** Une pastille ⓘ ouvrant une table croisée
  état × rareté a été envisagée puis abandonnée. Si elle revient un jour, elle
  suppose de tirer la rareté sur des pourcentages explicites — à la manière de
  `MIX_RARETE_PAR_TIER` en chinage normal — pour que l'affiché soit
  littéralement la configuration.
