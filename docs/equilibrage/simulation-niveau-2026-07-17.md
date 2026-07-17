# Simulation de la courbe de Niveau de Brocanteur — 2026-07-17

Simulateur branché sur les vrais modules du jeu (`src/lib/simulation/niveauSim.ts`), 3 profils × 12 seeds × 120 jours. Détails de modélisation et limites d'honnêteté : voir l'en-tête de `niveauSim.ts` et `.superpowers/sdd/sim-report.md`.

## Profil Casual (2 visites/jour)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 9 | 14.0 | 15 |
| 14 | 15 | 24.0 | 26 |
| 30 | 18 | 29.0 | 39 |
| 60 | 21 | 33.0 | 42 |
| 90 | 26 | 36.0 | 45 |
| 120 | 29 | 39.0 | 47 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 2 |
| N5 | 12/12 | 3 |
| N8 | 12/12 | 4 |
| N10 | 12/12 | 5 |
| N14 | 12/12 | 7 |
| N20 | 12/12 | 12 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **NON** (jour médian N10 = 5)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 12)
- Écart max entre deux niveaux avant N20 ≤ 5j : **NON** (observé max = 11j, médiane des runs = 1.0j)

### 3. XP/jour par source (moyenne)

| Source | XP/jour |
|---|---|
| Achat (chinage) | 7.62 |
| Découverte collection | 4.66 |
| Négo réussie (achat) | 3.75 |
| Vente | 9.03 |
| Juste prix (achat direct) | 0.88 |
| Négo réussie (vente) | 1.78 |
| Restauration (atelier) | 7.13 |
| Quête quotidienne | 2.41 |
| Quête hebdo | 3.13 |
| Quête principale (chapitres) | 1.67 |
| **Total** | **42.0** |

### 4. Double gate (% de déblocages où le niveau était bloquant)

| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |
|---|---|---|---|---|
| tier2 | 0% | 100% | 0% | 12 |

### 5. Sessions effectives/jour, avant vs après jalon énergie

- N8 (+1 énergie) : avant = 3.00 sessions/j, après = 3.00 sessions/j
- N14 (+1 énergie) : avant = 3.00 sessions/j, après = 3.00 sessions/j

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J3, lotGarni=J5, fouille=J8, boniment=J12, tchatche=J14, criee=J21

## Profil Régulier (4 visites/jour)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 13 | 15.0 | 16 |
| 14 | 27 | 29.0 | 31 |
| 30 | 40 | 50.0 | 55 |
| 60 | 45 | 54.0 | 74 |
| 90 | 49 | 57.0 | 77 |
| 120 | 52 | 60.0 | 78 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 2 |
| N5 | 12/12 | 3 |
| N8 | 12/12 | 4 |
| N10 | 12/12 | 5 |
| N14 | 12/12 | 7 |
| N20 | 12/12 | 9 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **NON** (jour médian N10 = 5)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 9)
- Écart max entre deux niveaux avant N20 ≤ 5j : **OK** (observé max = 2j, médiane des runs = 1.0j)

### 3. XP/jour par source (moyenne)

| Source | XP/jour |
|---|---|
| Achat (chinage) | 17.37 |
| Découverte collection | 6.65 |
| Négo réussie (achat) | 8.58 |
| Vente | 23.58 |
| Juste prix (achat direct) | 2.23 |
| Négo réussie (vente) | 4.73 |
| Restauration (atelier) | 14.75 |
| Quête quotidienne | 2.36 |
| Quête hebdo | 3.13 |
| Quête principale (chapitres) | 4.17 |
| **Total** | **87.5** |

### 4. Double gate (% de déblocages où le niveau était bloquant)

| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |
|---|---|---|---|---|
| tier2 | 0% | 100% | 0% | 12 |

### 5. Sessions effectives/jour, avant vs après jalon énergie

- N8 (+1 énergie) : avant = 5.00 sessions/j, après = 5.00 sessions/j
- N14 (+1 énergie) : avant = 5.00 sessions/j, après = 5.00 sessions/j

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J3, lotGarni=J5, fouille=J7, boniment=J9, tchatche=J11, criee=J14

## Profil Hardcore (présence quasi continue)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 15 | 17.0 | 18 |
| 14 | 27 | 30.0 | 35 |
| 30 | 46 | 54.0 | 57 |
| 60 | 52 | 74.0 | 78 |
| 90 | 57 | 77.0 | 83 |
| 120 | 62 | 80.0 | 85 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 2 |
| N5 | 12/12 | 3 |
| N8 | 12/12 | 4 |
| N10 | 12/12 | 5 |
| N14 | 12/12 | 6 |
| N20 | 12/12 | 8 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **NON** (jour médian N10 = 5)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 8)
- Écart max entre deux niveaux avant N20 ≤ 5j : **OK** (observé max = 2j, médiane des runs = 1.0j)

### 3. XP/jour par source (moyenne)

| Source | XP/jour |
|---|---|
| Achat (chinage) | 25.15 |
| Découverte collection | 7.10 |
| Négo réussie (achat) | 12.45 |
| Vente | 34.69 |
| Juste prix (achat direct) | 3.33 |
| Négo réussie (vente) | 6.95 |
| Restauration (atelier) | 29.50 |
| Quête quotidienne | 2.53 |
| Quête hebdo | 3.13 |
| Quête principale (chapitres) | 4.17 |
| **Total** | **129.0** |

### 4. Double gate (% de déblocages où le niveau était bloquant)

| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |
|---|---|---|---|---|
| tier2 | 0% | 100% | 0% | 12 |

### 5. Sessions effectives/jour, avant vs après jalon énergie

- N8 (+1 énergie) : avant = 7.00 sessions/j, après = 7.00 sessions/j
- N14 (+1 énergie) : avant = 7.00 sessions/j, après = 7.00 sessions/j

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J3, lotGarni=J5, fouille=J7, boniment=J8, tchatche=J11, criee=J13

## 6. Fouille — farm check (1000 étals T3)

- Rares+légendaires par étal, 0 remplacement : 1.103
- Rares+légendaires par étal, 3 remplacements ciblés (moins chers) : 1.609
- **Multiplicateur : 1.46×**

## 7. Lot garni — re-roll check (1000 négos)

- Ratio prixMax(bundle) / (prixMax(obj1 seul) + prixMax(obj2 seul)) : p50 = 1.102, p90 = 1.431
- Gain au-delà de la valeur ajoutée (€) : p50 = 20.0, p90 = 78.0

