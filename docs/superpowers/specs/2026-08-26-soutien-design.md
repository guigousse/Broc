# Soutenir Broc — conception

> Broc est en ligne sur l'App Store (`id6784023113`) depuis peu, et pas encore
> sur Google Play. Le jeu ne dit nulle part qu'il a un auteur, un compte
> Instagram, ou qu'un avis lui ferait du bien. Ce document conçoit les trois
> endroits où il le dira.

## Pourquoi

Deux manques, qui n'ont pas la même nature.

Le premier est commercial : **rien dans le jeu ne demande d'avis**. Or les avis
décident du classement dans les stores, et un jeu sans avis reste invisible quel
que soit son contenu. Les comptes `@broc.le.jeu` (Instagram, TikTok) existent et
sont alimentés, mais aucun joueur ne peut les trouver depuis l'application.

Le second est fictionnel, et c'est celui qui a déclenché le chantier. La borne
d'arcade affiche onze jeux, dont un gros **PLAY** clignotant sur ceux que le
joueur a dénichés. Aujourd'hui, taper dessus ne fait **rien du tout** — ni
navigation, ni son, ni message. Le joueur qui a cherché sa cartouche, l'a
achetée, restaurée et rangée dans sa collection tape sur PLAY et reçoit le
silence. C'est le seul endroit de Broc où le jeu promet quelque chose qu'il ne
tient pas.

Les deux manques se réparent au même endroit : la déception de la borne est
précisément le moment où l'on peut demander un coup de main sans être indécent.

## Ce que les stores autorisent, et ce qu'ils interdisent

Cette section n'est pas du décor : elle a écarté la première version du design,
et il faut qu'elle reste lisible pour quiconque reprendra ce code.

**Google Play est explicite sur trois points** ([doc][gp]) :

- *« Don't ask the user any questions before or while presenting the rating
  button or card, including questions about their opinion (such as "Do you like
  the app?") or predictive questions (such as "Would you rate this app 5
  stars"). »*
- *« You should not have a call-to-action option (such as a button) to trigger
  the API, as a user might have already hit their quota and the flow won't be
  shown, presenting a broken experience. For this use case, redirect the user to
  the Play Store instead. »*
- La carte ne doit être ni redimensionnée, ni recouverte, ni retirée par le code.

**Apple aboutit au même endroit par un autre chemin** ([doc][sk]) : `requestReview()`
est une *demande*. Le système l'affiche **trois fois par an au maximum**, par
appareil et par application, et ignore silencieusement les appels suivants.

Trois conséquences, qui structurent tout le reste :

1. **Un bouton « Noter » ne peut pas déclencher la feuille native.** Il ouvrirait
   dans le vide une fois sur deux. Un bouton ouvre la **fiche du store** ; c'est
   toujours autorisé et ça marche toujours.
2. **La feuille native se déclenche toute seule**, à un moment choisi par le jeu,
   jamais en réponse à un tap.
3. **On ne saura jamais si elle s'est affichée**, ni si le joueur a noté, ni quelle
   note il a mise. Aucune logique ne doit en dépendre — et récompenser un avis
   est de toute façon interdit des deux côtés.

[gp]: https://developer.android.com/guide/playcore/in-app-review
[sk]: https://developer.apple.com/documentation/storekit/skstorereviewcontroller

## Périmètre

**Dans le périmètre :** un bouton « Soutenir » au menu principal, une feuille
partagée (Instagram, TikTok, noter), le pop-up de la borne au premier tap, un
toast aux taps suivants, et la feuille de notation native à la fermeture de la
fanfare du niveau 10.

**Hors périmètre :** les mini-jeux jouables sur la borne (chantier annoncé
ailleurs), tout compteur d'abonnés, toute récompense contre un avis, un sixième
onglet dans la `TabBar` (**décision explicite : la barre du bas n'est pas
touchée**), et tout second point de déclenchement de la notation native.

## 1. Une feuille, deux portes

Le cœur du chantier est **un seul composant**, `SoutienSheet`, ouvert depuis deux
endroits sans rapport l'un avec l'autre.

| Pièce | Déclencheur | Ce qui s'affiche |
|---|---|---|
| Menu principal | bouton **Soutenir** | la feuille nue |
| Borne d'arcade | 1ᵉʳ tap sur un jeu **trouvé** | l'accroche CRT, puis la feuille |
| Feuille native | fermeture de la fanfare **niveau 10** | boîte système, zéro UI à nous |

`SoutienSheet` prend une prop `intro?: ReactNode` : absente depuis le menu,
elle porte l'écran CRT depuis la borne. **Une seule liste de liens, un seul jeu
de libellés à traduire, un seul endroit à corriger le jour où une URL change.**

La feuille s'appuie sur le `BottomSheet` existant (`open`, `onClose`, `title`) —
aucune mécanique d'ouverture n'est à écrire. Trois boutons empilés : Instagram,
TikTok, puis un séparateur et **★ Noter Broc**.

## 2. Le menu principal

`src/app/page.tsx` empile cinq `BoutonMenu` (Continuer, Nouvelle partie, Charger,
Réglages, Crédits). Le sixième s'y range à la fin, icône `Heart`, sur le modèle
exact des deux précédents : un état `soutienOuvert`, un `onSoutien` qui joue le
clic, et la feuille montée à côté de `ReglagesModal` et `CreditsModal`.

C'est délibérément l'endroit le plus discret possible : le joueur qui veut aider
sait où chercher, et celui qui joue n'est jamais sollicité.

## 3. Le pop-up de la borne

### Sur quoi le tap se pose

`EcranArcade` gagne un tap sur `zoneJeu`, **uniquement quand `jeu.trouve` est
vrai**. Les jeux non trouvés gardent leur neige, leur « PAS DE SIGNAL » et leur
indice de cartouche : cet écran-là fait déjà son travail, il dit ce qui manque
et comment le trouver. Y greffer une demande de soutien punirait le joueur qui
n'a encore rien déniché.

Le tap doit se distinguer du swipe. Rien de neuf à mesurer : `onPointerUp`
calcule déjà `dx` pour décider de la navigation. C'est un tap si
`Math.abs(dx) <= SWIPE_SEUIL_PX`, un swipe au-delà.

### Le dégradé — l'invitation une fois, la réponse toujours

```
1ᵉʳ tap   →  pop-up complet : accroche CRT + feuille de soutien
taps ≥ 2  →  toast « MODE DÉMONSTRATION. CE JEU NE SE LANCE PAS. »
```

Un pop-up à chaque tap serait du harcèlement : le joueur qui parcourt les onze
jeux le verrait onze fois d'affilée. Mais « rien du tout » aux taps suivants
rendrait le bouton PLAY mort une deuxième fois, et le joueur conclurait au bug.
Le toast — le système existe déjà — garantit que **l'écran répond toujours**,
sans jamais redemander quoi que ce soit.

### L'accroche

> **▶ INSERT COIN**
> MODE DÉMONSTRATION. CE JEU NE SE LANCE PAS.
>
> ---
> Broc est fabriqué par une seule personne. Suivre l'atelier ou laisser un avis,
> c'est ce qui l'aide à continuer d'exister.

Trois choses à ne pas défaire en la retouchant :

- **C'est la borne qui parle**, dans sa langue, en capitales vertes. Le joueur
  n'est pas tiré hors de la fiction pour se faire demander un service ; la
  demande arrive ensuite, en petit, comme une note de bas de page.
- **« Mode démonstration » ne promet rien.** Une vraie borne au repos tourne en
  mode démonstration, et c'est littéralement ce que fait cet écran : une capture
  et un PLAY qui clignote. Les formulations écartées — « pas encore sorti »,
  « FÉFÉ GAMES travaille dessus », « hors service » — créaient toutes l'attente
  d'un jeu à venir que personne ne s'est engagé à livrer.
- **Aucune question d'opinion.** « Tu aimes Broc ? » est le cas nommément
  interdit par Google. Ni ici, ni ailleurs, ni dans aucune traduction.

### Où vit le drapeau « déjà vu »

Dans `localStorage` (via `safeLocalStorageGet` / `safeLocalStorageSet`, déjà
utilisés pour la préférence de langue), et **non** dans le `GameState`.

Le dépôt range pourtant ce genre de drapeau dans l'état de partie
(`miniTutoVinyle`, `miniTutoCarnet`, `miniTutoAtelier`), et l'écart mérite sa
justification : le `GameState` est **par emplacement de sauvegarde**. Un joueur
qui mène trois parties verrait le pop-up trois fois. Or la demande de soutien
s'adresse à la personne qui tient le téléphone, pas au brocanteur qu'elle
incarne — elle ne fait pas partie de la fiction, et elle n'a donc rien à faire
dans la sauvegarde. Bénéfice secondaire : aucun champ ajouté à `GameState`,
donc aucune migration de sauvegarde.

## 4. La notation native au niveau 10

`tauri-plugin-in-app-review` ([dépôt][iar]), à vendorer comme l'ont été `admob`,
`iap` et `firebase`. Il couvre iOS (StoreKit) et Android (Play In-App Review).

Un seul appel, **dans le gestionnaire de fermeture de `LevelUpOverlay`** et non
dans l'action `marquerNiveauVu` du `GameContext` : la logique de jeu n'a pas à
connaître l'existence des stores. Il part quand le niveau qui vient d'être
célébré est le dixième. `LevelUpOverlay` porte déjà toute la politesse nécessaire — il attend
que l'écran soit libre, ne se déclenche ni pendant une session de chine, ni
pendant un dialogue, ni pendant le tutoriel. On hérite de cette garde au lieu de
la réécrire.

**Pourquoi le niveau 10.** Le tutoriel rapporte ≥ 115 XP alors que le niveau 1
est à 100 : le joueur passe niveau 1 **à coup sûr** pendant le tutoriel, avant
d'avoir rien vu du jeu. Le niveau 10 garantit un joueur qui connaît Broc, et
c'est un triomphe franc — feux d'artifice, son, vibrations — c'est-à-dire le
contexte que la recherche recommande.

Le drapeau anti-répétition vit dans `localStorage`, pour la raison du §3.

**Ce qu'on ne branche surtout pas derrière cet appel :** rien. Pas de
récompense, pas de compteur, pas de « il a noté donc ». L'appel ne renvoie aucune
information exploitable, et le supposer produirait un bug invisible.

Piège de recette à connaître : la boîte n'apparaît **ni** en build debug installé
via ADB, **ni** sur TestFlight. Sa vérification demande une piste de test interne
ou une vraie release.

[iar]: https://github.com/Gbyte-Group/tauri-plugin-in-app-review

## 5. Les liens externes

`tauri-plugin-opener` (officiel, `openUrl()`). Tout est centralisé dans
`src/lib/soutien/liens.ts` :

| Clé | URL |
|---|---|
| `INSTAGRAM` | `https://instagram.com/broc.le.jeu` |
| `TIKTOK` | `https://tiktok.com/@broc.le.jeu` |
| `APP_STORE` | `itms-apps://itunes.apple.com/app/id6784023113?action=write-review` |
| `PLAY_STORE` | `market://details?id=com.guigousse.broc` |

Le module absorbe trois pièges :

**La permission par défaut ne suffit pas.** `opener` autorise d'office `https://`,
`http://`, `mailto:` et `tel:` — mais **ni `itms-apps://` ni `market://`**. Les
deux schémas doivent être déclarés explicitement dans
`src-tauri/capabilities/default.json`, sinon le bouton de notation échoue en
silence sur les deux plateformes.

**Le web existe aussi.** Broc est également déployé sur Vercel, où `openUrl`
n'existe pas. Repli sur `window.open`, avec l'URL App Store en `https://`
(`https://apps.apple.com/fr/app/broc-jeu-de-brocante/id6784023113`) plutôt qu'en
`itms-apps://`.

**Android n'a pas encore de fiche.** Une constante `PLAY_STORE_ACTIF = false`
masque le bouton de notation sur Android tant que Broc n'est pas publié sur Play.
Les boutons de réseaux, eux, restent affichés partout. Un bouton qui ouvre une
page inexistante est pire que pas de bouton — et la feuille native ne s'affiche
de toute façon pas pour une application installée hors du Play Store. Le jour de
la sortie Play, une seule ligne bascule.

La distinction de plateforme réclame un `tauriAndroidDisponible()` à écrire à côté
du `tauriIosDisponible()` existant dans `src/lib/plateforme.ts`, sur le même
modèle.

## 6. Traductions

Une branche `soutien` dans les quatre dictionnaires (`fr`, `en`, `es`, `el`).
`ui.test.ts` vérifie déjà que les jeux de clés se correspondent d'une langue à
l'autre : un oubli casse la suite, il n'y a rien de plus à mettre en place.

L'accroche a été choisie en partie pour sa robustesse en traduction — elle est
courte, et « INSERT COIN » comme « MODE DÉMONSTRATION » ont un équivalent direct
dans les quatre langues, y compris le grec.

## 7. Ce que les tests doivent tenir

- Taper un jeu **trouvé** ouvre la feuille la première fois, un toast ensuite.
- Taper un jeu **non trouvé** n'ouvre rien du tout.
- Un swipe (`dx > SWIPE_SEUIL_PX`) navigue et n'ouvre jamais la feuille.
- Le drapeau `localStorage` survit à un remontage du composant.
- `liens.ts` renvoie l'URL attendue pour chaque plateforme, web compris.
- Le bouton de notation est absent sur Android tant que `PLAY_STORE_ACTIF` est faux.
- Les quatre dictionnaires portent les mêmes clés `soutien` (couvert par `ui.test.ts`).

## 8. Décisions écartées, et pourquoi

| Écarté | Raison |
|---|---|
| Un 6ᵉ onglet dans la `TabBar` | Décision de Guillaume : la barre reste à cinq onglets, le soutien vit au menu principal. Évite six colonnes serrées sur petit écran et garde la règle « un onglet = un lieu ». |
| Un écran `/soutenir` à part entière | Une feuille suffit, et c'est le même composant que le pop-up de la borne. |
| La feuille native déclenchée à la borne | Deux boîtes sur un seul geste, et Google interdit nommément de faire précéder sa carte d'une sollicitation. |
| Un bouton « Noter » ouvrant la boîte native | Interdit par Google, cassé une fois sur deux par le quota d'Apple. |
| Facebook dans la feuille | Page 100 % française, alors que l'application est jouable en quatre langues. |
| Un drapeau « il a déjà noté » | Techniquement impossible : aucune des deux plateformes ne le dit. StoreKit écarte déjà tout seul ceux qui ont noté. |
| Une récompense contre un avis | Interdit par les deux stores. |
