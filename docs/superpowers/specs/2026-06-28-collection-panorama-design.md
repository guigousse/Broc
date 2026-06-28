# Collection — 3ᵉ scène du panorama du QG

**Date :** 2026-06-28
**Statut :** Design validé, prêt pour le plan d'implémentation

## Contexte

Le panorama unifié du QG (`UnifiedPanorama`) juxtapose aujourd'hui **deux sections de 300vw**, chacune découpée en 3 zones swipables :

- **QG / Bureau** (`fond-cabinet.webp`) : `bureau` (carnet/comptes), `porte` (chinage/vitrine), `repos` (fauteuil/gramophone).
- **Atelier** (`fond-atelier.png`) : `stockage` (cartons), `etabli` (restauration), `coinL` (coin).

On ajoute une **3ᵉ section** représentant la **Collection** : le cabinet privé du grand-père antiquaire, dans la continuité **à gauche** du bureau.

## Concept & narration

La Collection devient une scène panoramique à part entière : le **cabinet privé du grand-père antiquaire** (qui tenait magasin à Paris), prolongement direct **à gauche** du bureau du QG. Même immeuble, mêmes fenêtres sur la rue parisienne, même style Art Déco et même perspective. C'est la pièce où il gardait *sa* collection — celle qu'il ne vendait jamais. Émotionnellement, c'est le « sanctuaire » du joueur.

## Composition des 3 panneaux (gauche → centre → droite)

- **Gauche — La vitrine (seul hotspot).** Haute vitrine Art Déco vitrée, étagères éclairées, garnie de quelques belles pièces génériques d'antiquaire. **Décor statique** (ne reflète PAS les objets réellement possédés par le joueur). Léger halo/reflet pour appeler le tap. **Taper la vitrine → ouvre l'écran/grille Collection existant.**
- **Centre — Espace libre (réservé).** Mur du fond avec les **fenêtres sur la rue parisienne** (immeubles haussmanniens, réverbère, terrasse de café — comme le bureau), parquet à chevrons, lumière chaude. Volontairement **peu meublé** : c'est la zone d'arrivée par défaut de la section, qu'on garnira plus tard (future vitrine à trophées). **Aucun hotspot pour l'instant.**
- **Droite — L'escalier en colimaçon.** Bel **escalier en fer forgé** Art Déco montant hors champ. **Purement d'ambiance** (aucune action). Suggère un étage au-dessus : réserve narrative pour le futur.

## Brief de style pour l'image (asset à générer)

- **Fichier :** `/public/collection/fond-collection.webp`
- **Dimensions :** 2752×1536 (mêmes que `fond-cabinet.webp`), ratio ~1.791:1.
- **Vocabulaire visuel (identique au bureau) :** papier peint damassé vert sauge, boiseries + corniches en bois chaud, plinthes, parquet à chevrons, vue **frontale quasi à plat** avec la **même profondeur / le même point de fuite** que `fond-cabinet.webp`, hautes fenêtres à petits carreaux donnant sur la rue parisienne, suspension Art Déco au plafond, rendu illustré **ligne claire + aquarelle**, palette crème / vert sauge / bois doré, lumière chaude.
- **Continuité :** la section est juxtaposée (hard-cut) à gauche du bureau, comme l'atelier l'est à droite aujourd'hui — **pas besoin de raccord pixel-perfect** au joint, seulement une cohérence de style et de perspective.

## Intégration technique

### Placement dans le swipe (option retenue : (i) à gauche, avant le bureau)

Nouvel ordre des zones, de gauche à droite :

```
vitrine → galerie → escalier → bureau → porte → repos → stockage → etabli → coinL
```

Ordre des images dans le panorama : `fond-collection` | `fond-cabinet` | `fond-atelier`.

- Largeur totale du panorama : **600vw → 900vw**.
- La section Collection occupe les offsets **0 / 100 / 200** ; les sections existantes sont **décalées de +300vw** (bureau 0→300, porte 100→400, repos 200→500, stockage 318→618, etabli 408→708, coinL 495→795).
- Les valeurs exactes (inset des zones extrêmes) seront ajustées contre l'art final, comme pour l'atelier.
- La **zone d'arrivée par défaut reste `porte`** (centre du bureau) : la logique nommée n'est pas affectée, seuls les offsets changent.

### Fichiers à créer

- `src/components/mobile/collection-pano/layout.ts` — sur le modèle de `qg/layout.ts` :
  `COLLECTION_LAYOUT = { panoramaWidth: 300, panoramaAspect: { w: 2752, h: 1536 }, zones: { vitrine, galerie, escalier }, objets: { vitrine: { left, bottom, width } } }`, type `CollectionObjetKey`, hook `useCollectionObjetStyle`.
- `src/components/mobile/collection-pano/CollectionScene.tsx` — affiche `/collection/fond-collection.webp` (sur le modèle de `QgScene.tsx`).
- `src/components/mobile/collection-pano/CollectionVitrine.tsx` — `<button>` positionné via `useCollectionObjetStyle("vitrine")`, `onTap` → ouvre la Collection.
- `src/app/(panorama)/collection/page.tsx` — marqueur de route (`return null`).

### Fichiers à modifier

- `src/components/mobile/panorama/UnifiedPanorama.tsx` — étendre `UnifiedZoneKey`, `UNIFIED_ZONE_OFFSETS`, `UNIFIED_ZONE_ORDER` ; ajouter la 3ᵉ image et décaler les sections existantes ; nouvelle largeur 900vw.
- `src/app/(panorama)/layout.tsx` — monter `CollectionScene` + `CollectionVitrine` ; maj `pathnameToTab()` / `tabToInitialZone()` (initialZone selon pathname `/collection`) ; brancher l'ouverture de la grille Collection au tap de la vitrine.
- `src/lib/panoramaActiveStore.ts` — ajouter `"collection"` au type `ActiveTab`.
- TabBar — ajouter l'onglet/dot « Collection » (placé **avant** Bureau pour refléter l'ordre spatial : Collection · Bureau · Atelier).

### Réutilisation

L'écran/grille Collection (stickers + overlay détail) existe déjà : la vitrine ne fait que **l'ouvrir**. Aucun changement à la grille elle-même.

## Hors périmètre (volontairement reporté)

- **Vitrine vivante** : afficher les objets réellement possédés derrière la vitre (rendu dynamique). Reporté.
- **Vitrine à trophées** dans la zone centrale. Reporté (la zone reste libre).
- **Escalier interactif / étage au-dessus.** Reporté (décor seul).

## Critères de succès

- On peut swiper depuis le bureau vers la gauche et entrer dans la section Collection (3 zones).
- La section respecte le style et la perspective du bureau (continuité visuelle).
- Taper la vitrine ouvre la grille Collection existante.
- La TabBar et les routes reflètent le nouvel ordre (Collection · Bureau · Atelier) ; le comportement existant (zone par défaut, atelier, stockage) est inchangé.
