# Carnet de commandes — refonte verticale (Sous-projet 1 : Modèle + UI)

Date : 2026-06-23
Branche : `feat/bureau-deux-carnets`

## Contexte

Le jeu Broc possède un système de **commandes** (quêtes) : un commanditaire
demande au joueur de lui fournir un objet précis contre récompense. Une mission
= un `Courrier` (payload `mission`) + une `MissionResolution` (statut). Le carnet
actuel (`CarnetNotesOverlay`) liste les missions en deux sections « En cours » /
« Terminées » sous forme de cartes empilées, sans avatar ni progression chiffrée.

On refond l'expérience pour le **mode vertical/mobile**, plus ergonomique et
fidèle au design de l'app (parchemin, laiton, vert forêt, polices Cinzel /
Cormorant Garamond).

Ce document couvre le **sous-projet 1** uniquement : évolution du **modèle de
données** + refonte de l'**UI du carnet**. La **génération automatique des
quêtes** et le **contenu scénarisé** font l'objet d'un sous-projet 2 séparé.

## Objectifs

1. Missions à **deux catégories** : `principale` / `secondaire`.
2. Missions **multi-cibles** : une commande peut demander plusieurs objets ;
   progression `X/Y` ; livrable quand tout est réuni.
3. **Commanditaires** enrichis : nom, personnalité, domaine, avatar (portraits
   fournis par l'auteur).
4. **Carnet vertical** : header fixe, sections Principales / Secondaires /
   Terminées, lignes (avatar · nom · progression), détails en accordéon (1 max).
5. **Aucune perte de sauvegarde** : migration des missions existantes.

Hors périmètre (sous-projet 2) : génération/attribution dynamique des quêtes,
équilibrage, contenu écrit des quêtes principales.

## Modèle de données

### Mission (`CourrierPayloadMission`, `src/types/game.ts`)

```ts
type MissionCategorie = "principale" | "secondaire";

interface MissionCible {
  templateId: string;
  etatMin?: EtatObjet;
}

interface CourrierPayloadMission {
  type: "mission";
  categorie: MissionCategorie;     // NOUVEAU
  expediteurId: string;
  titre: string;
  corps: string[];
  cibles: MissionCible[];          // remplace `cible: {…}` (single → liste)
  jourLimite?: number;
  recompense: { argent: number };
}
```

### Commanditaire (`ExpediteurDef`, `src/data/expediteursCourrier.ts`)

```ts
interface ExpediteurDef {
  id: string;
  nom: string;
  personnalite: string;       // NOUVEAU — ex. "Passionné de jeux vidéo"
  domaine?: CategorieObjet;   // NOUVEAU — catégorie d'objets demandée (sert au SP2)
  relation?: string;          // existant (optionnel)
  avatar?: string;            // NOUVEAU — "/personas/commanditaires/{id}.webp"
  signature: string;
}
```

Commanditaires de départ : `maman`, `jeux-video` (domaine Jeux & Loisirs),
`set-designer` (domaine Maison), `mode` (domaine Mode), `art` (domaine Objets
d'art). Les portraits sont fournis par l'auteur et déposés dans
`public/personas/commanditaires/{id}.webp` ; en attendant, fallback sur une
pastille avec initiale.

### Progression (dérivée, non stockée)

- Pour chaque cible, on cherche dans l'inventaire un objet **distinct** avec le
  bon `templateId` et un état ≥ `etatMin` (et non en restauration).
- `nbRemplies = nombre de cibles satisfaites` ; total = `cibles.length`.
- Mission **livrable** ⇔ `nbRemplies === cibles.length`.
- Helper `progressionMission(payload, inventaire) → { remplies, total, livrable, ciblesEtat: boolean[] }`
  dans `src/lib/missions.ts` (remplace/étend `estMissionLivrable`).
- Le matching réserve un objet par cible (pas de double comptage si deux cibles
  partagent le même `templateId`).

### Livraison (`livrerMission`, `GameContext`)

- Vérifie la livrabilité, **retire un objet par cible** (le moins bon état
  satisfaisant en priorité, pour que le joueur garde ses meilleures pièces… à
  confirmer ; par défaut : premier objet satisfaisant).
- Crédite `recompense.argent` (entrée grand livre `mission_recompense`).
- Passe la `MissionResolution` en `livree` + `jourResolution`.

### Migration (`src/lib/migrations.ts`)

- Mission avec ancien champ `cible` → `cibles: [cible]`, supprimer `cible`.
- Mission sans `categorie` → `"secondaire"`.
- Idempotent ; intégré au flux `migrerSauvegarde` existant.

## UI du carnet (`CarnetNotesOverlay` refondu)

Point d'entrée inchangé : bouton « carnet rouge » du bureau
(`QgCarnetNotes` → overlay).

### Structure

- **Header fixe** (sticky, bandeau parchemin + filet laiton) : titre « Carnet de
  commandes » · « Jour N » · « X livrables » · bouton ✕.
- **Corps scrollable**, sections dans l'ordre :
  1. **Commandes principales** (actives, `categorie === "principale"`)
  2. **Commandes secondaires** (actives, `categorie === "secondaire"`)
  3. **Terminées** (livrées + expirées) — repliable, repliée par défaut.
- Titre de section masqué si la section est vide.

### Ligne de commande (`CommandeRow`)

- Gauche : **avatar** rond du commanditaire (`avatar` ou pastille à initiale),
  bord laiton.
- Centre : **titre** de la quête (gras) + sous-ligne « Nom · personnalité ».
- Droite : **progression**
  - jauge `X/Y` (petite barre laiton) tant que non livrable ;
  - badge vert « Prêt ✓ » quand livrable ;
  - échéance `J-n` en couleur d'urgence (vermillon proche de 0).
- Tap → ouvre/ferme l'accordéon. **Une seule ligne ouverte** (state `selectedId`).

### Détails (accordéon, sous la ligne)

- Texte de la demande (`corps`, italique, markdown `**gras**` minimal).
- **Checklist des cibles** : pour chaque cible, vignette de l'objet
  (`ItemSticker`/`ItemImage`, fallback `CategorieIcon`) + nom + « état min : … » +
  marqueur ✓ (réunie) / ○ (à trouver).
- Récompense `+X €` · échéance `J-n`.
- Bouton **Livrer** : actif si livrable, sinon grisé « Livrer (x/y) ».

### Ligne terminée

- Version aplatie : avatar atténué, titre barré, statut en marge
  (« Livrée ✓ » vert / « Expirée ✗ » vermillon, + jour).

### Tri

- Principales & Secondaires : livrables d'abord → échéance croissante → sans
  échéance en dernier → ordre de réception.
- Terminées : `jourResolution` décroissant.

### Fidélité design

- Variables CSS de l'app (`--brass-*`, `--forest-*`, `--vermillion-*`), polices
  `Cinzel` (titres) / `Cormorant Garamond` (texte), fond/edges du carnet
  existant, scrim et pattern de fermeture des overlays QG.
- Réutiliser `ItemSticker`/`ItemImage` pour les vignettes d'objets et
  `CategorieIcon` en fallback.

## Composants & fichiers touchés

| Fichier | Changement |
|---|---|
| `src/types/game.ts` | `MissionCategorie`, `MissionCible`, `cibles[]`, `categorie` |
| `src/data/expediteursCourrier.ts` | `personnalite`, `domaine`, `avatar` + nouveaux commanditaires |
| `src/lib/missions.ts` | `progressionMission()` multi-cibles (remplace `estMissionLivrable`) |
| `src/lib/courrier.ts` | `creerCourrierMission` → `cibles[]` + `categorie` ; missions de test mises à jour |
| `src/lib/migrations.ts` | migration `cible` → `cibles`, `categorie` par défaut |
| `src/context/GameContext.tsx` | `livrerMission` multi-cibles ; compteurs badge |
| `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx` | refonte UI (header fixe, sections, lignes, accordéon) |
| `src/components/mobile/qg/overlays/CommandeRow.tsx` (nouveau) | ligne + détails accordéon |
| `public/personas/commanditaires/*.webp` | portraits (fournis par l'auteur) |

## Tests

- `missions.test.ts` : `progressionMission` (0/n, partiel, complet ; cibles
  même templateId → 2 objets requis ; état min respecté ; objet en restauration
  exclu).
- `migrations.test.ts` : `cible` → `cibles`, `categorie` par défaut.
- `courrier.test.ts` : missions de test valides au nouveau format.
- Tests composant (jsdom) pour `CarnetNotesOverlay` : sections, accordéon
  (1 ouvert max), bouton Livrer grisé/actif.

## Risques / points ouverts

- **Priorité de consommation** à la livraison (premier objet satisfaisant vs le
  moins bon état) — défaut : premier satisfaisant ; à affiner si besoin.
- Les **avatars** des nouveaux commanditaires dépendent de la fourniture des
  portraits ; fallback pastille en attendant.
- Le contenu réel des quêtes (principales scénarisées) arrive au sous-projet 2 ;
  ici on garde/adapte les missions de test.
