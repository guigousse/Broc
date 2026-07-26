# Simulation de la courbe de Niveau de Brocanteur — 2026-07-17

Simulateur branché sur les vrais modules du jeu (`src/lib/simulation/niveauSim.ts`), 3 profils × 12 seeds × 120 jours. Détails de modélisation et limites d'honnêteté : voir l'en-tête de `niveauSim.ts` et `.superpowers/sdd/sim-report.md`.

## Profil Casual (2 visites/jour)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 12 | 14.0 | 15 |
| 14 | 21 | 26.0 | 26 |
| 30 | 27 | 36.0 | 42 |
| 60 | 32 | 39.0 | 44 |
| 90 | 36 | 42.0 | 47 |
| 120 | 38 | 44.0 | 49 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 2 |
| N5 | 12/12 | 2 |
| N8 | 12/12 | 4 |
| N10 | 12/12 | 5 |
| N14 | 12/12 | 7 |
| N20 | 12/12 | 10 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **NON** (jour médian N10 = 5)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 10)
- Écart max entre deux niveaux avant N20 ≤ 5j : **OK** (observé max = 2j, médiane des runs = 1.0j)

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

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J2, lotGarni=J5, fouille=J7, boniment=J10, tchatche=J14, criee=J19

## Profil Régulier (4 visites/jour)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 13 | 16.0 | 19 |
| 14 | 24 | 29.0 | 33 |
| 30 | 43 | 51.0 | 54 |
| 60 | 48 | 55.0 | 69 |
| 90 | 52 | 58.0 | 71 |
| 120 | 55 | 61.0 | 73 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 2 |
| N5 | 12/12 | 2 |
| N8 | 12/12 | 4 |
| N10 | 12/12 | 5 |
| N14 | 12/12 | 6 |
| N20 | 12/12 | 9 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **NON** (jour médian N10 = 5)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 9)
- Écart max entre deux niveaux avant N20 ≤ 5j : **OK** (observé max = 1j, médiane des runs = 1.0j)

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

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J2, lotGarni=J5, fouille=J7, boniment=J9, tchatche=J11, criee=J13

## Profil Hardcore (présence quasi continue)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 14 | 19.0 | 21 |
| 14 | 29 | 32.0 | 35 |
| 30 | 41 | 52.0 | 56 |
| 60 | 48 | 58.0 | 66 |
| 90 | 55 | 63.0 | 70 |
| 120 | 60 | 67.0 | 73 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 2 |
| N5 | 12/12 | 3 |
| N8 | 12/12 | 4 |
| N10 | 12/12 | 4 |
| N14 | 12/12 | 5 |
| N20 | 12/12 | 8 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **NON** (jour médian N10 = 4)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 8)
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

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J3, lotGarni=J4, fouille=J6, boniment=J8, tchatche=J10, criee=J12

## 6. Fouille — farm check (1000 étals T3)

- Rares+légendaires par étal, 0 remplacement : 1.103
- Rares+légendaires par étal, 3 remplacements ciblés (moins chers) : 1.609
- **Multiplicateur : 1.46×**

## 7. Lot garni — re-roll check (1000 négos)

- Ratio prixMax(bundle) / (prixMax(obj1 seul) + prixMax(obj2 seul)) : p50 = 1.102, p90 = 1.431
- Gain au-delà de la valeur ajoutée (€) : p50 = 20.0, p90 = 78.0

