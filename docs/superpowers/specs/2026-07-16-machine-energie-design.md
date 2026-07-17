# Machine à énergie du savant fou — Design

**Date :** 2026-07-16
**Statut :** validé par Guillaume (remplace la modale de recharge d'énergie actuelle)

## Problème

La fenêtre de recharge d'énergie (`src/components/mobile/EnergieRecharge.tsx`) est une simple carte texte : compteur ⚡ n/5, minuteur, bouton pub. Fonctionnelle mais sans attrait — or c'est un point de contact monétisation (pub récompensée). Il faut un visuel fort.

## Vision

Une **machine à électricité de savant fou** : la modale devient la machine elle-même. Grand cadran de galvanomètre pour la jauge d'énergie, gros levier en laiton pour lancer la pub, étincelles à la récompense.

## Décisions validées

1. **Jauge = aiguille analogique** dans le cadran (graduations 0→5), chiffre « n/5 » sous le cadran, aiguille animée quand l'énergie monte.
2. **Bouton pub = levier intégré** à la machine (si réalisable proprement ; sinon repli : bouton stylisé plaque laiton sur la machine). Étincelles ⚡ à la récompense.
3. **Format = modale centrée** comme aujourd'hui (fond assombri, ✕, fermeture au clic sur le scrim) — seul le contenu de la carte change.

## L'asset (illustration générée)

- Générée via le pipeline Gemini existant (`@google/genai`, cf. `scripts/generate-competences.mjs` pour le modèle de script).
- Machine vue de face, style gravure vintage du jeu : laiton, bois sombre, bobines Tesla, câbles, arcs électriques. Palette forest/brass/paper du jeu.
- **Un grand cadran rond VIDE** (fond crème uni, sans graduations, sans aiguille, sans texte) en haut au centre — le SVG du galvanomètre viendra dessus.
- **Un gros levier laiton** latéral, position neutre.
- **AUCUN texte peint dans l'image** (règle i18n : FR/EN/ES partagent l'asset, tout texte est overlay HTML).
- Sortie : `public/qg/machine-energie.webp` (portrait, ~3:4, adapté à une carte ~340 px de large).
- Nice-to-have : une 2ᵉ frame « levier abaissé » cohérente pour un swap d'image pendant la pub. Si la génération n'est pas propre (incohérences entre frames), on abandonne le swap sans regret — le tremblement + étincelles suffit.

## Le composant

`EnergieRecharge.tsx` refondu (même API : `{ onClose }`, même logique métier — `energie.ts` et `adProvider` intouchés) :

- **Carte** : l'illustration remplit la carte (`maxWidth` ~340), les contrôles sont positionnés par-dessus en % (coordonnées mesurées une fois sur l'image générée, constantes de module).
- **Galvanomètre SVG** superposé au cadran vide : arc de graduations 0→ENERGIE_MAX, aiguille dont l'angle est une fonction pure de `energie / ENERGIE_MAX` (exportée pour test), transition CSS type ressort.
- **« n/5 »** en `--font-mono` laiton sous le cadran ; **minuteur** « Prochaine ⚡ dans mm:ss » (chaînes i18n existantes `d.chrome.*`) sur une plaque sous le cadran ; « Énergie au maximum » quand plein.
- **Levier/bouton pub** : zone bouton sur le levier, libellés existants (`regarderPub`, `pubEnCours`, `pubEpuisee`), `aria-label` complet. Tap → machine tremble (CSS keyframes) ; récompense → étincelles ⚡ (petit burst d'éléments animés) + aiguille qui bondit d'un cran.
- **États** : quota épuisé → levier grisé + libellé `pubEpuisee` ; `enCours` → libellé `pubEnCours`, bouton désactivé.
- ✕ et fermeture scrim inchangés.

## Hors périmètre

- Aucune nouvelle chaîne i18n obligatoire (pas de nom de machine pour l'instant).
- Pas de changement à `src/lib/energie.ts`, au quota de pubs, ni à `adProvider`.
- Le provider pub reste le StubAdProvider (cf. mémoire boîte mystère).

## Tests

- Unitaires (jsdom) : fonction d'angle de l'aiguille (0/5 → min, 5/5 → max), états du bouton (dispo / en cours / épuisé), rendu du minuteur vs « au maximum ».
- Vérification e2e Playwright (vrai navigateur) : ouvrir la modale depuis le header, capture, tirer le levier (stub pub → +1 ⚡), vérifier l'aiguille et le compteur.
