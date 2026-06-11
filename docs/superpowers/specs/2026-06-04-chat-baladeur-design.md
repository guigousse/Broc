# Chat baladeur sur le panorama — design

**Date** : 2026-06-04
**Branche** : `feat/qg-decor-ludique`

## Intention

Donner l'impression que le chat du local n'est pas toujours au même endroit : selon le jour, il apparaît à un emplacement différent du panorama unifié (bureau ou atelier). Si le chat est déjà sur son fauteuil (`chatSurFauteuil === true`), aucun chat baladeur n'est affiché — il ne peut pas se dédoubler.

## Périmètre

- **Zone couverte** : le panorama unifié complet (6 sections : bureau / porte / repos / stockage / établi / coinL).
- **Nombre d'emplacements** : 3 (un par photo).
- **Fréquence** : un tirage par jour, stable jusqu'au passage au jour suivant.
- **Interaction** : aucune. Le chat baladeur est purement décoratif (`pointer-events: none`).

## Assets

Trois fichiers fournis par l'utilisateur, à placer dans `public/qg/chat-baladeur/` :

| Fichier final | Source utilisateur | Posture | Zone visée |
|---|---|---|---|
| `qg-fenetre.webp` | `chat bureau qui regarde dehor.webp` | Assis de dos, regarde dehors | Bureau (zones 0–2) |
| `atelier-fenetre.webp` | `chat atelier qui regarde dehors .png` | Assis de dos, regarde dehors | Atelier (zones 3–5) |
| `atelier-marche.webp` | `chat atelier fond.png` | En marche, profil | Atelier (zones 3–5) |

Conversion PNG → WebP cohérente avec la convention du repo (commit `f78f16d`). Chaque photo a une posture qui implique son emplacement — pas de réutilisation cross-zone.

## Architecture

### Layout dédié

Nouveau fichier `src/components/mobile/qg/chatBaladeurLayout.ts` :

```ts
export const CHAT_BALADEUR_LAYOUT = {
  emplacements: {
    "qg-fenetre":      { left: ?, bottom: ?, width: ? },
    "atelier-fenetre": { left: ?, bottom: ?, width: ? }, // left déjà décalé +300vw
    "atelier-marche":  { left: ?, bottom: ?, width: ? }, // left déjà décalé +300vw
  },
} as const;

export type ChatBaladeurId = keyof typeof CHAT_BALADEUR_LAYOUT.emplacements;

export const CHAT_BALADEUR_ORDER: ChatBaladeurId[] = [
  "qg-fenetre",
  "atelier-fenetre",
  "atelier-marche",
];
```

Convention identique à `QG_LAYOUT.objets` / `ATELIER_LAYOUT.objets` : `left` et `width` en vw, `bottom` en pourcentage. Pour les emplacements atelier, `left` est déjà exprimé dans le repère du panorama unifié (origine = bord gauche bureau), donc avec le décalage `ATELIER_X_SHIFT_VW` (+300) appliqué — pas de calcul à faire au rendu.

### Composant

Nouveau fichier `src/components/mobile/qg/QgChatBaladeur.tsx`. Rendu une fois dans le `UnifiedPanorama` du layout panorama (`src/app/(panorama)/layout.tsx`), juste après les hotspots atelier.

```tsx
interface QgChatBaladeurProps {
  jourActuel: number;
  chatSurFauteuil: boolean;
}
```

Comportement :
- Si `chatSurFauteuil` → retourne `null`.
- Sinon → `id = CHAT_BALADEUR_ORDER[jourActuel % 3]`, rend un `<img>` positionné en absolu d'après `CHAT_BALADEUR_LAYOUT.emplacements[id]`.

### Sélection déterministe

`jourActuel % CHAT_BALADEUR_ORDER.length`. Simple, stable dans la journée, change à chaque incrément de `jourActuel`. Si on ajoute plus tard une 4e photo, il suffit d'étendre `CHAT_BALADEUR_ORDER`.

### Rendu visuel

- `<img>` natif (pas `next/image` — sprites ~30–80 Ko, et `fill` complique le positionnement absolu).
- `position: absolute`, `left: {n}vw`, `bottom: {n}%`, `width: {n}vw`, `height: auto`.
- `pointerEvents: "none"` (décoratif, ne doit pas intercepter de clic).
- `draggable={false}`, `userSelect: "none"`.
- Placé dans le calque des objets du panorama (z-index 2 du conteneur).

## Restauration de l'outil de dev

L'outil `QgEditContext` + `QgEditOverlay` + `QgEditPanel` existe encore dans `src/components/mobile/qg/dev/` mais n'est plus monté : il était branché dans `QgScene`, qui n'est plus rendu (le panorama utilise désormais `UnifiedPanorama` directement). L'utilisateur ne peut donc plus ajuster visuellement les positions.

### Plan de remise en route

1. **Étendre `QgObjetKey`** dans `src/components/mobile/qg/layout.ts` (ou créer un type union dans `QgEditContext`) pour inclure les 3 ids de chat baladeur. Le contexte d'édition manipule alors `QgObjetKey | ChatBaladeurId`.
2. **Monter `QgEditProvider`** dans `src/app/(panorama)/layout.tsx`, autour du `UnifiedPanorama`. `enabled` piloté par `process.env.NEXT_PUBLIC_QG_EDIT === "1"`.
3. **Rendre `QgEditOverlay`** dans le `UnifiedPanorama` (à l'intérieur du calque objets) quand `enabled`.
4. **Étendre `QgEditPanel`** pour lister aussi les 3 chats baladeurs (mêmes contrôles left/bottom/width que les autres objets).
5. **Brancher `QgChatBaladeur` sur `useQgObjet`** (ou un hook équivalent) pour que les overrides du panel s'appliquent en direct.

L'utilisateur lance `NEXT_PUBLIC_QG_EDIT=1 npm run dev`, place les 3 chats, communique les coords. Je les hardcode dans `chatBaladeurLayout.ts`, puis on retire l'env var.

## Modèle de données

Aucun changement de state. La position se déduit de `state.jourActuel` (déjà persisté). Pas de migration, pas de nouvelle clé dans la sauvegarde.

## Tests

- **Unit (Vitest)** : une petite fonction `selectChatBaladeur(jourActuel, chatSurFauteuil)` qui renvoie `ChatBaladeurId | null`. Tests :
  - `chatSurFauteuil === true` → `null` quelle que soit la valeur de `jourActuel`.
  - `jourActuel === 0` → `"qg-fenetre"`.
  - `jourActuel === 1` → `"atelier-fenetre"`.
  - `jourActuel === 2` → `"atelier-marche"`.
  - `jourActuel === 3` → `"qg-fenetre"` (cycle).
- **Pas de test d'intégration UI** : composant trivial, validation visuelle suffisante.

## Fichiers touchés

**Nouveaux**
- `public/qg/chat-baladeur/qg-fenetre.webp`
- `public/qg/chat-baladeur/atelier-fenetre.webp`
- `public/qg/chat-baladeur/atelier-marche.webp`
- `src/components/mobile/qg/chatBaladeurLayout.ts`
- `src/components/mobile/qg/QgChatBaladeur.tsx`
- `src/lib/chatBaladeur.ts` (fonction `selectChatBaladeur` + son test)
- `src/lib/chatBaladeur.test.ts`

**Modifiés**
- `src/app/(panorama)/layout.tsx` (monte `QgEditProvider` + `QgChatBaladeur`)
- `src/components/mobile/panorama/UnifiedPanorama.tsx` (monte `QgEditOverlay` quand `enabled`)
- `src/components/mobile/qg/dev/QgEditContext.tsx` (élargit la clé éditable)
- `src/components/mobile/qg/dev/QgEditPanel.tsx` (ajoute les 3 chats à la liste)

## Hors-périmètre

- Animation du chat (déplacement, idle bobbing) — décoratif statique, point final.
- Variantes saisonnières ou conditionnées au scénario.
- Ronronnement / son d'ambiance lié au chat baladeur (pas d'interaction, donc pas de son).
- Multi-chats simultanés.
