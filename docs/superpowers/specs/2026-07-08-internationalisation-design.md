# Internationalisation FR/EN/ES — Design

**Date** : 2026-07-08 · **Statut** : design validé par Guillaume

## Objectif

Le jeu complet jouable en français, anglais et espagnol : interface ET
contenu (objets, clients, brocantes, compétences, quêtes, textes générés).
Traduction rédigée par Claude, relue par Guillaume au fil de l'eau.

## Décisions validées

- **Ambition** : tout traduire (pas de mode hybride UI-seulement durable).
- **Sélection de langue** : auto au premier lancement (langue du téléphone,
  fallback anglais si ni FR ni ES), forçable via un encadré « Langue » dans
  Réglages, persistée en localStorage.
- **Architecture** : dictionnaires maison typés + overlays de contenu —
  pas de dépendance i18n externe (cohérent avec `output: "export"` + Tauri).

## 1. Infrastructure (`src/lib/i18n/`)

- `Locale = "fr" | "en" | "es"` ; clé storage `projet-broc:langue:v1`.
- Détection : `navigator.language` → fr/es sinon `en`, uniquement si aucune
  préférence persistée.
- `LangueProvider` monté au layout racine ; hook `useLangue()` →
  `{ locale, setLocale, t }`. Changer de langue re-rend l'app entière
  (state React, pas de reload).
- Dictionnaires UI : `src/lib/i18n/ui/fr.ts` = source (objet const, clés
  par écran/section), `en.ts` et `es.ts` typés `satisfies` la forme du
  français → **clé manquante = erreur tsc**. Interpolation `{param}` via
  `t(cle, params)`. Pluriels simples gérés par clés dédiées (`_un`/`_n`),
  pas d'ICU.
- Formats : `toLocaleString(locale)` pour les nombres ; **prix toujours
  en €** (choix d'ambiance — France, 1924).

## 2. Contenu de jeu — overlays par domaine

- Le français reste **canonique** dans `src/data/` (aucun changement de
  structure).
- Traductions dans `src/lib/i18n/contenu/{en,es}/` : un fichier par domaine
  (`objets.ts`, `clients.ts`, `brocantes.ts`, `competences.ts`,
  `quetes.ts`, `celebrites.ts`, `meteos.ts`, `expediteurs.ts`…), chacun
  `Record<Id, { nom: string; description?: string }>` (champs selon le
  domaine).
- Helpers de résolution (`nomObjet(templateId)`, `descCompetence(id)`…)
  consommés par l'UI au rendu, fallback français si entrée absente.
- **Tests de complétude** par domaine : chaque id FR doit avoir son entrée
  EN et ES (échec de suite sinon) — le pendant du filet « visuels 96→24 ».

## 3. Règle d'or : ne jamais persister une chaîne localisée

- `Objet.nom` et `CollectionSlot.nom` (snapshots FR déjà en save) : champs
  conservés pour compat mais **plus jamais affichés** — l'UI résout via
  `templateId` au rendu. Changer de langue traduit donc l'existant.
- `EtatObjet` (« Mauvais »… « Pristin état ») : reste l'union interne
  (valeur de save et de logique) ; traduction à l'affichage uniquement.
- **Courrier** (lettres générées puis persistées avec titre/corps FR) :
  les nouvelles lettres persistent `gabaritId` + paramètres et sont
  rendues à la volée dans la langue courante ; les lettres déjà en save
  s'affichent telles quelles (FR) — dégradation assumée, pas de migration.
- Toute nouvelle feature suit la règle : ids en save, texte au rendu.

## 4. Phasage — 4 sous-projets (spec commun, un plan chacun)

1. **SP1 — Infra + menu** : lib i18n complète, encadré Langue dans
   Réglages, écran-titre + overlays Parties/Réglages/Crédits trilingues.
   Preuve de bout en bout (détection, bascule à chaud, persistance).
2. **SP2 — UI in-game** : écran par écran (QG/panorama + sheets, chine,
   vente/négo, collection, bibliothèque, atelier, stockage, carnet,
   gazette UI, header/tabbar, toasts, modals système).
3. **SP3 — Contenu** : overlays objets/clients/brocantes/compétences/
   quêtes/célébrités/météos/expéditeurs + bascule des rendus sur les
   helpers (dont inventaire/collection via templateId).
4. **SP4 — Textes dynamiques** : gazette générée, répliques de négo,
   notifications locales, courrier à gabarits + audit final « zéro
   français en dur » (grep systématique + passe visuelle EN/ES).

## Hors périmètre

- Conversion monétaire, formats de date historiques : non (€ et ambiance
  France 1924 partout).
- Langues supplémentaires (DE, IT…) : l'architecture les permet (ajouter
  un dictionnaire + overlays), mais aucune n'est prévue ici.
- Localisation de la fiche App Store : chantier marketing séparé.

## Risques connus

- **Volume** : ~3 200 lignes de data FR + ~100 composants. Le phasage et
  les tests de complétude sont la parade — jamais de langue « à moitié ».
- **Textes générés** (gazette, négo) : gabarits avec accords/genres par
  langue — prévoir des gabarits par langue, pas une traduction mot à mot.
- **Longueur des chaînes** : l'anglais est plus court, l'espagnol plus
  long que le français (~+10 %) — vérifier les boutons étroits (menu 210px,
  badges) dans la passe visuelle de chaque SP.
