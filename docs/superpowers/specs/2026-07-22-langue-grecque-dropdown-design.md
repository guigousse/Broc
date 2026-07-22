# Ajout du grec + sélecteur de langue en menu déroulant — Design

**Date** : 2026-07-22
**Statut** : validé par Guillaume (traductions générées par Claude, `<select>` natif stylé)

## Objectif

1. Ajouter le grec (`el`) comme quatrième langue jouable, à parité complète avec l'anglais et l'espagnol.
2. Remplacer la rangée de boutons segmentés du choix de langue (réglages) par un menu déroulant — nécessaire car 4 langues ne tiennent plus confortablement en rangée, et évolutif pour les suivantes.

## Contexte

- Le français est la langue canonique (textes dans `src/data/` et `src/lib/`), EN/ES sont des overlays résolus à l'affichage avec repli FR.
- `src/lib/i18n/locales.ts` : type `Locale`, `LOCALES`, `LOCALE_LABELS`, `estLocale`, `detecterLocale`.
- `src/lib/i18n/ui/{fr,en,es}.ts` : dictionnaires UI (~680 lignes), forme validée par `DeepStrings<typeof fr>`.
- `src/lib/i18n/contenu/{en,es}/` : 10 domaines (objets, brocantes, compétences, déblocages, personnages, divers, courrier, quetesGabarits, dialogues, nego).
- `src/lib/i18n/contenu/index.ts` : overlays typés `Record<"en" | "es", …>` (~12 occurrences) + `MISE_EN_FORME_GABARIT` par langue.
- Sélecteur actuel : `ReglagesModal.tsx` (~l. 266-283), boutons `segBtn`.
- Règle d'or : **jamais de chaîne localisée en sauvegarde** — tout est lookup par id stable à l'affichage.

## Design

### 1. Locale `el`

- `locales.ts` : `"el"` ajouté au type `Locale`, à `LOCALES`, à `estLocale()` ; `LOCALE_LABELS.el = "Ελληνικά"` ; `detecterLocale()` reconnaît `nav.startsWith("el")` (le repli international reste l'anglais).
- **Refactor évolutivité** : nouveau type exporté `LocaleTraduite = Exclude<Locale, "fr">` dans `locales.ts`. `contenu/index.ts` remplace toutes ses signatures `Record<"en" | "es", …>` et paramètres `locale: "en" | "es"` par `LocaleTraduite` — la prochaine langue ne demandera plus que d'ajouter les entrées aux records (le compilateur signalera chaque record incomplet).

### 2. Traductions grecques (générées par Claude)

- `ui/el.ts` : dictionnaire UI complet, exporté `el`, enregistré dans `DICTIONNAIRES`.
- `contenu/el/` : les 10 fichiers, mêmes exports que leurs homologues EN/ES (`OBJETS_EL`, `BROCANTES_EL`, …), enregistrés dans chaque overlay de `contenu/index.ts`.
- `MISE_EN_FORME_GABARIT.el` : guillemets grecs « » (usage grec standard), mention d'état traduite (`(ελάχ. κατάσταση: …)`).
- Source de traduction : le **français canonique** (ton, jeux de mots, registre brocante) ; EN sert de référence croisée. Les noms propres inventés du jeu sont adaptés, pas translittérés mécaniquement, en respectant les renommages « droits d'auteur » existants.
- Les tests de complétude existants (parité de clés, `manquants`/`orphelins`, itération sur `LOCALES`) couvrent automatiquement `el` dès qu'il entre dans `LOCALES` ; les tests qui énumèrent les locales en dur (`locales.test.ts` : « expose exactement fr/en/es », etc.) sont mis à jour.

### 3. Menu déroulant

- `ReglagesModal.tsx` : la section langue troque ses boutons pour un `<select>` natif :
  - valeur = `locale`, options = `LOCALES` avec `LOCALE_LABELS` (autonymes).
  - `onChange` → `playClick()` + `setLocale()`.
  - Style : même famille visuelle que la carte réglages (fond, bordure, radius, police), `appearance: none` + chevron ▾ en pseudo-élément/span pour un rendu cohérent ; sur iOS le tap ouvre le picker natif à roue.
  - Accessibilité : `<select>` natif = label associé via le titre de section (`aria-label={d.reglages.langue}` déjà en place sur la section ; le select reçoit son propre `aria-label`).

## Hors périmètre

- Pas de changement de schéma de save ni de migration (`projet-broc:langue:v1` accepte simplement `"el"`).
- Pas de relecture par locuteur natif (assumé).
- Pas de refonte des autres sections des réglages.

## Tests

- `locales.test.ts` : `LOCALES` = fr/en/es/el, détection `el-GR` → `el`, persistance `el`.
- Tests de parité UI/contenu : passent avec `el` inclus (complétude forcée par le typage + tests existants).
- `ReglagesModal` : le sélecteur affiche les 4 langues et `setLocale` est appelé au changement (adapter le test existant s'il vise les boutons).
- Suite complète verte (`npx vitest run`), lint via `npx eslint src` (npm run lint cassé, Next 16).
