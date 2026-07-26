# Simulation de la courbe de Niveau de Brocanteur — 2026-07-17

Simulateur branché sur les vrais modules du jeu (`src/lib/simulation/niveauSim.ts`), 3 profils × 12 seeds × 120 jours. Détails de modélisation et limites d'honnêteté : voir l'en-tête de `niveauSim.ts` et `.superpowers/sdd/sim-report.md`.

## Profil Casual (2 visites/jour)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 8 | 9.0 | 9 |
| 14 | 13 | 15.0 | 16 |
| 30 | 16 | 21.0 | 25 |
| 60 | 19 | 23.0 | 27 |
| 90 | 21 | 25.0 | 29 |
| 120 | 23 | 27.0 | 30 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 3 |
| N5 | 12/12 | 3 |
| N8 | 12/12 | 6 |
| N10 | 12/12 | 8 |
| N14 | 12/12 | 12 |
| N20 | 12/12 | 21 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **NON** (jour médian N10 = 8)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 21)
- Écart max entre deux niveaux avant N20 ≤ 5j : **NON** (observé max = 21j, médiane des runs = 2.0j)

### 3. XP/jour par source (moyenne)

| Source | XP/jour |
|---|---|
| Achat (chinage) | 9.03 |
| Découverte collection | 5.44 |
| Négo réussie (achat) | 4.44 |
| Vente | 11.33 |
| Juste prix (achat direct) | 0.88 |
| Négo réussie (vente) | 2.36 |
| Restauration (atelier) | 7.61 |
| Quête quotidienne | 2.33 |
| Quête hebdo | 3.13 |
| Quête principale (chapitres) | 1.67 |
| **Total** | **48.2** |

### 4. Double gate (% de déblocages où le niveau était bloquant)

| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |
|---|---|---|---|---|
| tier2 | 0% | 100% | 0% | 13 |

### 5. Sessions effectives/jour, avant vs après jalon énergie

- N8 (+1 énergie) : avant = 3.00 sessions/j, après = 3.00 sessions/j
- N14 (+1 énergie) : avant = 3.00 sessions/j, après = 3.00 sessions/j

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J3, lotGarni=J8, fouille=J13, boniment=J21, tchatche=J42, criee=J80

## Profil Régulier (4 visites/jour)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 8 | 10.0 | 12 |
| 14 | 14 | 17.0 | 20 |
| 30 | 26 | 32.0 | 34 |
| 60 | 29 | 34.0 | 48 |
| 90 | 32 | 37.0 | 50 |
| 120 | 35 | 40.0 | 53 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 3 |
| N5 | 12/12 | 3 |
| N8 | 12/12 | 5 |
| N10 | 12/12 | 7 |
| N14 | 12/12 | 10 |
| N20 | 12/12 | 15 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **NON** (jour médian N10 = 7)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 15)
- Écart max entre deux niveaux avant N20 ≤ 5j : **NON** (observé max = 14j, médiane des runs = 2.0j)

### 3. XP/jour par source (moyenne)

| Source | XP/jour |
|---|---|
| Achat (chinage) | 16.35 |
| Découverte collection | 6.70 |
| Négo réussie (achat) | 8.07 |
| Vente | 21.26 |
| Juste prix (achat direct) | 1.88 |
| Négo réussie (vente) | 4.32 |
| Restauration (atelier) | 14.75 |
| Quête quotidienne | 2.57 |
| Quête hebdo | 3.13 |
| Quête principale (chapitres) | 4.17 |
| **Total** | **83.2** |

### 4. Double gate (% de déblocages où le niveau était bloquant)

| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |
|---|---|---|---|---|
| tier2 | 0% | 100% | 0% | 12 |

### 5. Sessions effectives/jour, avant vs après jalon énergie

- N8 (+1 énergie) : avant = 5.00 sessions/j, après = 5.00 sessions/j
- N14 (+1 énergie) : avant = 5.00 sessions/j, après = 5.00 sessions/j

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J3, lotGarni=J7, fouille=J11, boniment=J15, tchatche=J20, criee=J27

## Profil Hardcore (présence quasi continue)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 9 | 12.0 | 13 |
| 14 | 17 | 19.0 | 21 |
| 30 | 25 | 33.0 | 36 |
| 60 | 30 | 38.0 | 45 |
| 90 | 35 | 42.0 | 49 |
| 120 | 39 | 46.0 | 53 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 3 |
| N5 | 12/12 | 3 |
| N8 | 12/12 | 5 |
| N10 | 12/12 | 6 |
| N14 | 12/12 | 9 |
| N20 | 12/12 | 14 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **NON** (jour médian N10 = 6)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 14)
- Écart max entre deux niveaux avant N20 ≤ 5j : **OK** (observé max = 2j, médiane des runs = 1.0j)

### 3. XP/jour par source (moyenne)

| Source | XP/jour |
|---|---|
| Achat (chinage) | 15.37 |
| Découverte collection | 6.60 |
| Négo réussie (achat) | 7.59 |
| Vente | 19.29 |
| Juste prix (achat direct) | 1.65 |
| Négo réussie (vente) | 3.94 |
| Restauration (atelier) | 29.50 |
| Quête quotidienne | 2.78 |
| Quête hebdo | 3.13 |
| Quête principale (chapitres) | 4.17 |
| **Total** | **94.0** |

### 4. Double gate (% de déblocages où le niveau était bloquant)

| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |
|---|---|---|---|---|
| tier2 | 0% | 100% | 0% | 12 |

### 5. Sessions effectives/jour, avant vs après jalon énergie

- N8 (+1 énergie) : avant = 7.00 sessions/j, après = 7.00 sessions/j
- N14 (+1 énergie) : avant = 7.00 sessions/j, après = 7.00 sessions/j

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J3, lotGarni=J6, fouille=J9, boniment=J14, tchatche=J19, criee=J24

## 6. Fouille — farm check (1000 étals T3)

- Rares+légendaires par étal, 0 remplacement : 1.103
- Rares+légendaires par étal, 3 remplacements ciblés (moins chers) : 1.609
- **Multiplicateur : 1.46×**

## 7. Lot garni — re-roll check (1000 négos)

- Ratio prixMax(bundle) / (prixMax(obj1 seul) + prixMax(obj2 seul)) : p50 = 1.102, p90 = 1.431
- Gain au-delà de la valeur ajoutée (€) : p50 = 20.0, p90 = 78.0

