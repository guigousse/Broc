# Level up « Certificat de brocanteur » — design

**Date** : 2026-07-23
**Statut** : validé par Guillaume (direction « Diplôme + cachet de cire », cachet en image générée Gemini)

## Problème

L'écran de level up actuel (titre détaché + carte papier + encadrés « plaque laiton »
ajoutés le 2026-07-23) ne plaît pas : les plaques laiton sont lourdes et le rendu
manque d'impact pour un moment de récompense.

## Décision

Remplacer tout le rendu de `LevelUpOverlay` par **un seul grand certificat ancien**
plein largeur, avec une séquence d'animation en cascade qui se termine par un
**cachet de cire rouge qui s'écrase** sur le document.

## Structure visuelle (de haut en bas)

Un conteneur unique `.broc-levelup-certificat`, maxWidth ~340px :

- fond papier crème (`--paper-100`) avec léger grain, **double filet doré**
  (bordure `--brass-700` + inset shadows `--paper-100`/`--brass-500`, même recette
  que la carte flottante des brocantes `BrocanteDetailFloating`) ;
- **ornements Art déco aux 4 coins** (réutilisation du motif `CornerOrnament`
  « stairstep » de `BrocanteDetailFloating`, extrait en composant partagé) ;
- eyebrow « — Certificat de brocanteur — » (**nouvelle clé i18n**
  `sheets.eyebrowCertificat`, 4 langues FR/EN/ES/EL) ;
- « **Niveau {n}** » en très grand (font display, brass, une seule ligne,
  clé `niveauNCelebration` existante — sans « ! », déjà retiré) ;
- les mentions séparées par des **filets dorés avec losange central** (◆, variante
  du `goldRuleStyle`) :
  1. « +1 point de compétence » (masquée si plafond à vie atteint, logique existante),
  2. les déblocages du niveau — l'atout garde son grand format (emoji 40px +
     titre + description, `extraireEmoji` existant), les autres en ligne mono,
  3. « Prochain — Niv. {n} : … » (si existant) ;
- bouton **CONTINUER** (style existant) ;
- **cachet de cire** : webp positionné en absolu, bas-droite, à cheval sur le bord
  du certificat, rotation ~-12°, taille ~84px.

Les styles « plaque laiton » du 2026-07-23 (composant `Plaque`, `plaqueStyle`,
rivets) sont supprimés. La logique du composant (gating session, `marquerNiveauVu`,
plafond compétences, audio) ne change pas.

## Séquence d'animation (globals.css)

1. **Certificat** : montée + fade (~400ms, `broc-levelup-carte-in` adapté).
2. **Mentions** : apparition en cascade, stagger ~120ms par ligne
   (delays CSS incrémentaux via classes ou variable `--i`).
3. **Cachet** : « slam » — scale 2.5 → 1 + rotation légère + opacité, ~350ms,
   easing sec (`cubic-bezier` type back/expo), déclenché après la cascade ;
   à l'impact, **micro-shake** du certificat (~150ms, translate 1–2px).
4. **Bouton Continuer** : apparaît en dernier (fade, après le slam).

`prefers-reduced-motion: reduce` → aucune animation, tout visible immédiatement
(étendre le bloc média existant). Le mp3 `playLevelUp` existant reste déclenché
à l'ouverture (pas de nouveau son pour l'instant).

## Asset cachet de cire

- Généré via **Gemini Image API** (`gemini-3-pro-image-preview`), même pipeline
  que `scripts/generate-boite-mystere.mjs` : fond magenta #FF00FF → chroma-key →
  webp. Nouveau script `scripts/generate-cachet-cire.mjs`.
- Sujet : cachet de cire à cacheter rouge sombre, monogramme « B » gravé,
  style catalogue de musée vintage cohérent avec l'app.
- Sortie : `public/ui/cachet-cire.webp` (~256px source, affiché ~84px).
- Guillaume valide le visuel avant intégration finale.

## i18n

- Ajout `sheets.eyebrowCertificat` : FR « — Certificat de brocanteur — »,
  EN « — Picker's certificate — », ES « — Certificado de rebuscador — »,
  EL « — Πιστοποιητικό παλιατζή — ».
- Aucune autre clé ne bouge. Rappel règle d'or : jamais de chaîne localisée en save.

## Tests

- Mise à jour de `LevelUpOverlay.test.tsx` : le test « titre détaché » devient
  « certificat unique » (`.broc-levelup-certificat` contient titre ET bouton) ;
  le cachet a `data-testid="levelup-cachet"` (présence + alt vide/aria-hidden) ;
  les tests logique (plafond, atout, multi-niveaux, session) inchangés dans
  leur intention, sélecteurs ajustés.
- `npx tsc --noEmit`, suite vitest complète, eslint sur fichiers touchés.

## Hors périmètre

- Nouveau son « thunk » à l'impact du cachet (piste future).
- Particules/poussière dorée (option si le rendu manque encore de vie).
- Vérification device (TestFlight) — comme d'habitude, après merge.
