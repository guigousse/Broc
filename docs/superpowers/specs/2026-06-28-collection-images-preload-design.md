# Préchargement des vignettes de la collection (anti pop-in)

**Date :** 2026-06-28
**Statut :** Design validé, prêt pour le plan d'implémentation

## Problème

Dans la grille Collection (`/collection/grille`), les vignettes d'items « apparaissent en direct » (fondu) pendant le scroll, et il y a une latence à l'ouverture. Causes :

- `ItemSticker` rend `<img loading="lazy" decoding="async">` → le navigateur attend que la cellule soit quasi visible pour charger, puis décode en asynchrone → fondu visible.
- `CollectionGrid` est virtualisée avec `overscan: 4` → les rangées ne se montent que ~4 lignes avant l'écran, donc le chargement+décodage se fait au moment où ça défile.

Contrainte forte : la virtualisation a été ajoutée parce que décoder des **centaines** d'images en bitmaps simultanément fait recharger le WebView iOS (mémoire). Toute solution doit éviter de réintroduire ce décodage massif.

Données : 392 vignettes locales, ~22 Ko chacune (~9,3 Mo au total). Le réseau n'est pas le facteur limitant ; le coût est le **décodage** (mémoire/CPU).

## Approche retenue (A) : préchargement en avance + warm-up du cache, dans la fenêtre de virtualisation

Trois leviers, tous bornés pour rester iOS-safe.

### (a) `ItemSticker` — chargement immédiat optionnel

- Ajout d'un prop `eager?: boolean` (défaut `false`).
- `false` → comportement actuel `loading="lazy"` (pour les vues plein écran : overlay détail, etc.).
- `true` → `loading="eager"`.
- `decoding="async"` est conservé dans tous les cas (le décodage hors écran est assuré par l'overscan).
- La grille passe `eager` pour ses vignettes : la virtualisation borne déjà le nombre de cellules montées, donc charger immédiatement la fenêtre montée est sûr.

### (b) `CollectionGrid` — overscan plus large

- `overscan: 4 → 8`.
- Effet : les rangées se montent ~8 lignes avant d'entrer dans l'écran → le fetch+décodage se termine hors champ avant que la cellule arrive → plus de fondu visible au scroll normal.
- Reste borné : 8 rangées × `colonnes` = quelques dizaines de cellules au maximum dans la fenêtre. Pas de décodage massif.

### (c) Warm-up du cache à l'ouverture — octets seulement, pas de décodage

- Au montage de la grille (et quand la liste de slots affichés change), précharger en **cache HTTP** les octets des vignettes des slots **actuellement affichés** (donc le préchargement suit le filtre catégorie courant).
- Mécanisme : `fetch(url)` fire-and-forget, **pas** `new Image()` (qui décoderait → réintroduirait le problème mémoire). `fetch` met les octets en cache sans créer de bitmap.
- Concurrence limitée (~6 requêtes en parallèle), liste dédupliquée et filtrée aux items qui ont une image (`ITEMS_WITH_IMAGE`).
- Conséquence : quand une rangée virtualisée se monte en `eager`, les octets sont déjà en cache → fetch quasi instantané ; le décodage reste borné par la virtualisation.

## Pourquoi c'est iOS-safe

Le crash venait du décodage simultané de centaines d'images en bitmaps. Ici :
- le warm-up ne met que des **octets** en cache (aucun décodage) ;
- le décodage reste limité à la fenêtre overscan (quelques dizaines de cellules).

On ne réintroduit pas le pic mémoire.

## Découpage / fichiers

- **`src/components/ui/ItemSticker.tsx`** : nouveau prop `eager?: boolean` (défaut `false`) ; l'`<img>` utilise `loading={eager ? "eager" : "lazy"}`.
- **`src/lib/prefetchThumbs.ts`** (nouveau) :
  - `thumbUrlsForSlots(slots: CollectionSlot[]): string[]` — fonction **pure** : mappe les slots vers leurs URLs de vignette via `getItemThumbUrl`, retire les `null` (items sans image) et déduplique.
  - `prefetchThumbs(urls: string[], concurrency = 6): void` — fire-and-forget ; lance des `fetch(url)` avec une concurrence bornée ; ignore les erreurs (best-effort).
- **`src/components/CollectionGrid.tsx`** : `overscan: 8` ; passe `eager` à `ItemSticker` (via `CollectionCell`) ; `useEffect` qui appelle `prefetchThumbs(thumbUrlsForSlots(slots))` quand `slots` change.

## Tests

- **`ItemSticker`** : `eager` → l'`<img>` a `loading="eager"` ; sans le prop → `loading="lazy"`.
- **`thumbUrlsForSlots`** (pure) : ne garde que les items présents dans `ITEMS_WITH_IMAGE`, retire les doublons, mappe vers `/items/thumbs/{id}.webp`.
- **Overscan / warm-up** : vérification manuelle dans l'app — scroll fluide sans fondu visible, ouverture de la collection plus rapide, pas de rechargement/instabilité sur iOS.

## Hors périmètre

- Décodage anticipé manuel via `Image().decode()` (approche B) — écarté (complexité vs gain marginal).
- Suppression de la virtualisation (approche C) — écartée (réintroduit le crash iOS).
- Préchargement de toute la collection indépendamment du filtre — on se limite aux slots affichés.

## Critères de succès

- Au scroll normal, les vignettes sont déjà nettes quand la cellule arrive à l'écran (plus de fondu « en direct »).
- L'ouverture de la collection ne montre plus de latence notable avant l'affichage des vignettes.
- Pas de régression mémoire sur iOS (pas de rechargement du WebView), la virtualisation restant la borne du décodage.
