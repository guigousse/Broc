# Refonte UI/UX du mode chinage — dock de compétences & carte objet

**Date** : 2026-07-13
**Statut** : validé par Guillaume

## Objectif

Améliorer la lisibilité et l'ergonomie de l'écran de chinage :

1. Centraliser les trois atouts du chinage (Flair, Fouille, Tchatche) dans le
   header bas sous forme de cercles de compétence « style jeu vidéo », y compris
   les atouts non débloqués (grisés + cadenas).
2. Réorganiser la carte objet : titre et infos (état, thème, prix) **au-dessus**
   de l'image ; navigation ◀ 1/6 ▶ **sous** l'image.
3. Ajouter un badge collection avec ✓ quand l'objet a déjà été possédé.
4. Corriger le débordement de texte des boutons « Négocier / Acheter XX € ».

## 1. Header bas : dock de compétences (`ChineSkillDock`)

Nouveau composant rendu dans le header bas d'`ItemSwipeDeck`, à droite du
bouton « Sortir » (inchangé, à gauche).

**Cercles** — trois, dans l'ordre de déblocage : Flair (N5), Fouille (N15),
Tchatche (N25).

- Style : cercle ~52 px, anneau laiton (`--brass-500`), fond sombre
  (`--forest-800`), illustration webp rognée en cercle.
- Pastille d'usages restants en bas à droite du cercle (police mono).
  À 0 usage : cercle atténué (opacité 0.4), inactif.
- **Verrouillé** (niveau Brocanteur insuffisant) : illustration en grisaille
  (`filter: grayscale`), icône `Lock` (lucide) superposée, pastille « N15 »
  (niveau requis). Un tap affiche un toast « {Nom} — se débloque au niveau X ».

**Règles d'activation**

- **Flair** : consomme un usage, révèle les cotes pour toute la session
  (comportement actuel). Une fois actif : cercle en surbrillance, désactivé.
- **Fouille** : agit sur la carte courante ; mêmes conditions qu'aujourd'hui
  (objet non acheté, négociation pas en cours, usages > 0).
- **Tchatche** : actif uniquement si la négociation de la carte courante est
  en statut `fache` ou `refus_poli` et usages > 0. Déclenche la relance.

**Suppressions** : la barre Flair en haut de l'écran (ClientPage), le bouton
Fouille du header bas actuel, les boutons 💬 Tchatche du tiroir de négociation.

## 2. Carte objet réorganisée (`ChineSlide` + `ItemSwipeDeck`)

- **Au-dessus de l'image** : titre, puis ligne d'infos —
  étoiles d'état · badge collection · thème/catégorie · prix (+ cote si connue).
- **Badge collection** : logo collection avec ✓, affiché si le template a déjà
  été possédé au moins une fois (`dejaPossede` dans un slot de la collection),
  placé juste après les étoiles d'état. Absent sinon.
- **Sous l'image** : chevrons ◀ ▶ et compteur « 1 / 6 » regroupés. Rendus par
  le deck (position stable entre les slides), entre la zone de swipe et le
  tiroir vendeur. Le compteur compte toutes les slides (boîte mystère incluse).
- Slide boîte mystère : inchangée (pas de ligne d'infos) ; la barre de
  navigation reste visible.

Le calcul `dejaPossede(templateId)` est fait dans `ClientPage` (accès au
`state`) et passé dans la slide (`kind: "item"`), comme `coteConnue`.

## 3. Câblage Tchatche (état de négociation)

- `ClientPage` gagne `jouerTchatche(item)` : calcule
  `relancerNegociation(item.negociation)` (fonction pure) ; si l'état change,
  consomme l'usage via `utiliserActive("tchatche")` puis écrit via `setItem`.
  Même garde qu'aujourd'hui : ne jamais consommer pour un effet nul.
- `ChineNegoDrawer` : suppression de la prop `tchatche` et des boutons 💬 ;
  resynchronisation de `localNego` quand `item.negociation` change de
  l'extérieur, avec garde anti-boucle vis-à-vis d'`onUpdateNego`.
- Le dock lit le statut de négo de la carte courante (`item.negociation`)
  pour activer/désactiver le cercle Tchatche.

## 4. Assets & i18n

- Trois illustrations à générer (session d'assets séparée, même pipeline que
  les visuels de compétences) : `public/competences/atout.flair.webp`,
  `atout.fouille.webp`, `atout.tchatche.webp`.
- **Fallback emoji** (🔍 🧹 💬) si le webp manque (`onError` sur l'image) :
  le code peut être livré avant les assets.
- Nouvelles chaînes i18n FR/EN/ES : toast de niveau requis, aria-labels des
  cercles (verrouillé/actif/usages). Aucune chaîne localisée en save.

## 5. Boutons Négocier / Acheter (`ChineNegoDrawer`)

- Retrait de `whiteSpace: "nowrap"` dans `btnBase` : passage sur 2 lignes
  autorisé.
- Police fluide `clamp(12px, 3.4vw, 15px)`.
- « Acheter XX € » reçoit `flex: 1.3` (vs `1` pour « Négocier »), son libellé
  étant structurellement plus long (pire en EN/ES).

## Tests & vérification

- `ChineNegoDrawer.test.tsx` : retrait tchatche, resynchronisation externe.
- Nouveaux tests : logique du dock (verrouillage, quotas, conditions
  d'activation par atout) et condition du badge collection.
- Lint : `npx eslint src` (`npm run lint` cassé, Next 16) +
  `npm run lint:hooks`.
- Vérification device (simulateur iOS via `scripts/ios-sim.sh`) après livraison.

## Hors périmètre

- Migration des autres atouts (Lot garni, Boniment, Criée — mode vente).
- Refonte du tiroir de négociation au-delà du retrait des boutons Tchatche.
- Génération des trois webp (session dédiée).
