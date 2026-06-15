# Slots de restauration visibles dans le panorama Atelier

**Date** : 2026-06-15
**Statut** : Design validé, prêt pour plan d'implémentation

## Contexte

Aujourd'hui, l'atelier est un meuble cliquable dans le panorama (zone "etabli") qui ouvre `/atelier/gerer`. Quand un objet est envoyé en restauration, le joueur n'a aucun retour visuel dans le panorama : il doit ouvrir la page de gestion pour voir l'état des travaux en cours. De plus, la restauration s'applique automatiquement au passage du jour (`GameContext.passerJour`, lignes 247–260) : l'objet voit son état muter sans interaction explicite.

## Objectif

Rendre les travaux en cours **diégétiques** dans le panorama : afficher au-dessus de l'établi, sur le rebord de la fenêtre vitrail, des slots représentant la capacité de l'atelier. Le joueur voit immédiatement quels objets sont en chantier, le temps restant, et peut récupérer un objet terminé d'un simple tap qui le ramène au stock.

Le déclenchement de la mutation d'état devient explicite (clic "Récupérer") au lieu d'automatique au passage du jour.

## Périmètre

**Inclus**
- Nouveau composant `WorkshopSlots` rendu dans `AtelierScene` au-dessus de l'établi.
- Coordonnées des slots ajoutées à `ATELIER_LAYOUT`.
- Action `recupererObjetRestaure(objetId)` dans `GameContext` qui applique la mutation d'état et libère le slot.
- Suppression de la mutation automatique dans `passerJour` (l'objet reste `enRestauration` jusqu'au clic).
- Bouton "Récupérer" ajouté dans `/atelier/gerer` section "Travaux en cours" (cohérence : même action que le tap slot).

**Exclus**
- Pas de refonte de la page `/atelier/gerer`.
- Pas de changement du système de coût/durée de restauration.
- Pas de notifications push ou badge global "objet prêt".
- Pas d'affichage des slots dans la zone `stockage` du panorama (ils restent localisés au-dessus de l'établi, donc visibles uniquement quand le scroll est près de la zone `etabli`).

## Comportement utilisateur

### Affichage des slots

- Le nombre de slots affichés = `getCapaciteAtelier(state.niveauAtelier)` (1, 2 ou 3).
- Les slots sont centrés horizontalement sur la fenêtre vitrail (au-dessus de l'établi), répartis uniformément.
- Chaque slot a un cadre proche du style de l'image de référence (bordure laiton ou verte selon état, fond légèrement papier).

### États du slot

**Vide** (aucun objet en restauration dans ce slot)
- Cadre bordure `--brass-500` à 50% d'opacité, fond `rgba(255,255,255,0.35)` (effet rebord clair).
- Mention "libre" en monospace très discrète, centrée.
- Non cliquable.

**En cours** (objet en restauration, `state.jourActuel < enRestauration.jourFin`)
- Cadre bordure `--brass-700` pleine.
- PNG de l'objet (via `getItemImageUrl(templateId)`) centré dans le cadre, avec un voile semi-transparent gris-brun (`rgba(76,60,40,0.25)`) qui évoque "objet en travaux".
- Sablier `⏳` + texte `Xj` en monospace, positionné en bas-droite du cadre (badge superposé).
- `X` = `enRestauration.jourFin - state.jourActuel` (au moins 1).
- Tap → `router.push("/atelier/gerer")`.

**Prêt** (objet en restauration, `state.jourActuel >= enRestauration.jourFin`)
- Cadre bordure `--forest-700` avec animation de pulsation douce (opacité 0.7 → 1 → 0.7, période 1.6 s).
- PNG de l'objet sans voile, pleinement visible.
- Sablier remplacé par ✓ vert dans le coin bas-droite.
- Petit pill "Récupérer" en monospace uppercase (style proche des actions existantes : fond `--forest-800`, texte `--paper-100`, padding compact, bordure légère), superposé en bas-centre du slot (chevauche le bas de l'image).
- Tap → `recupererObjetRestaure(objet.id)` : mutation d'état + retour au stock + slot redevient vide.

### Récupération

Au clic sur un slot "Prêt" :
1. L'action `recupererObjetRestaure(objetId)` :
   - Applique `recalculerPrixReference(o.prixReferenceReel, o.etat, enRestauration.etatCible)`.
   - Met `o.etat = enRestauration.etatCible`.
   - Met `o.enRestauration = undefined`.
   - L'objet reste dans `inventaireJoueur` (il y était déjà — il ne quitte jamais l'inventaire pendant la restauration).
2. Le slot se libère immédiatement (transition douce optionnelle).
3. Aucune navigation, aucun overlay : le joueur reste dans le panorama.

### Changement de logique métier

Dans `GameContext.passerJour` (lignes 247–260) : la mutation automatique au passage du jour est **supprimée**. L'objet reste `enRestauration` indéfiniment ; seul un clic explicite (slot ou page atelier) déclenche la mutation.

Conséquence : si le joueur ne vient pas récupérer l'objet, il occupe son slot et empêche d'envoyer un nouvel objet en restauration. Comportement voulu (incitatif).

## Architecture

### Nouveaux artefacts

- **`src/components/mobile/atelier-pano/WorkshopSlots.tsx`** : composant qui rend les slots. Consomme `state.inventaireJoueur` et `state.niveauAtelier`. Délègue le clic à un handler reçu via props (`onRecuperer(objetId)`, `onTapEnCours()`).
- **`ATELIER_LAYOUT.slotsRangee`** dans `layout.ts` : `{ left, bottom, width, height, gap }` définissant la rangée centrée au-dessus de l'établi.

### Modifications

- **`AtelierScene.tsx`** : accueille `WorkshopSlots` en couche `zIndex: 3` (au-dessus des hotspots décor).
- **`AtelierPanoramaView.tsx`** : passe les handlers de navigation et de récupération au scene (qui les passe à `WorkshopSlots`).
- **`GameContext.tsx`** :
  - Supprimer la mutation auto dans `passerJour` (boucle `inv.map`).
  - Ajouter l'action `recupererObjetRestaure(objetId: string)` exposée via le context (idempotente, no-op si l'objet n'existe plus ou n'est pas prêt).
- **`app/atelier/gerer/page.tsx`** : remplacer la cellule "Prêt ✓" passive par un bouton "Récupérer" appelant la même action quand `ready`.

### Données / types

- Pas de nouveau type. La structure `Objet.enRestauration` reste inchangée.
- Le critère "prêt" est dérivé en runtime : `objet.enRestauration && state.jourActuel >= objet.enRestauration.jourFin`.

## Décisions de design

| Décision | Choix | Justification |
|---|---|---|
| Auto-completion vs clic | Clic explicite | Feedback tangible, incite à revisiter l'atelier, cohérent avec affichage panorama. |
| Format temps restant | `⏳ Xj` mono | Précis, lisible, cohérent avec ton mono du jeu. |
| Slots verrouillés | Cachés | Évite encombrement visuel ; la progression est déjà signalée par le bouton upgrade. |
| Voile sur objet en cours | Oui | Lit l'état "en chantier" tout en gardant l'objet identifiable. |
| Tap en cours | `/atelier/gerer` | Continuité de l'UX existante (page de gestion = source de vérité détaillée). |

## Risques et points d'attention

- **Migration** : les sauvegardes existantes peuvent contenir des objets avec `enRestauration` dont `jourFin <= jourActuel`. Sans migration, ils s'afficheront simplement comme "Prêt" au prochain chargement et le joueur pourra les récupérer normalement. Pas de migration nécessaire.
- **Tests existants** : `atelier.test.ts` ne teste pas directement le comportement de `passerJour` sur la restauration. Vérifier qu'aucun test n'en dépend implicitement.
- **Performance** : les slots sont des éléments DOM simples (≤ 3). Pas de problème.
- **Capacité réduite** : si le joueur tombe d'un niveau à un autre (théoriquement impossible aujourd'hui), des objets en cours pourraient excéder la capacité. Hors périmètre.
