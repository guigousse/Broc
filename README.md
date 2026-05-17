# Projet Broc

Jeu de simulation et de gestion de brocante — MVP web (Next.js 15 + TypeScript + Tailwind v4).

## Installation

```bash
npm install
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Layout racine + GameProvider
│   ├── page.tsx            # Écran 1 — Menu principal
│   ├── globals.css         # Tailwind v4
│   └── qg/page.tsx         # Écran 2 — QG (dashboard)
├── components/
│   ├── ui/                 # Primitives (Button, Card)
│   ├── StatusBar.tsx
│   ├── InventoryGrid.tsx
│   └── MarketTrendsPanel.tsx
├── context/
│   └── GameContext.tsx     # État global du jeu (useContext)
├── data/
│   └── starterInventory.ts # Inventaire de départ
├── lib/storage/
│   ├── gameRepository.ts   # Interface (prête pour Supabase)
│   └── localGameRepository.ts  # Impl. localStorage
└── types/
    └── game.ts             # Objet, GameState, etc.
```

## Brancher Supabase plus tard

L'état du jeu passe par `GameRepository` (interface). Pour brancher Supabase :

1. Créer `src/lib/storage/supabaseGameRepository.ts` qui implémente `GameRepository`.
2. Remplacer l'import dans `src/context/GameContext.tsx`.

Le reste du code (composants, pages, contexte) reste inchangé.

## État actuel (MVP)

- [x] Menu principal avec « Nouvelle Partie »
- [x] QG : bandeau d'état, inventaire, tendances, actions
- [x] Persistance locale (localStorage)
- [ ] Écran « Partir Chiner »
- [ ] Écran « Stand de vente »
- [ ] Système de prix dynamique / tendances
- [ ] Intégration Supabase
