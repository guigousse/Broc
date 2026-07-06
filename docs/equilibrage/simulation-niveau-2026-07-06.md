# Simulation de la courbe de Niveau de Brocanteur — 2026-07-06

Simulateur branché sur les vrais modules du jeu (`src/lib/simulation/niveauSim.ts`), 3 profils × 12 seeds × 120 jours. Détails de modélisation et limites d'honnêteté : voir l'en-tête de `niveauSim.ts` et `.superpowers/sdd/sim-report.md`.

## Profil Casual (2 visites/jour)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 5 | 6.0 | 6 |
| 14 | 7 | 8.0 | 8 |
| 30 | 8 | 10.0 | 12 |
| 60 | 8 | 11.0 | 13 |
| 90 | 9 | 11.0 | 14 |
| 120 | 10 | 12.0 | 14 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 4 |
| N5 | 12/12 | 5 |
| N8 | 12/12 | 12 |
| N10 | 11/12 | 20 |
| N14 | 4/12 | 45 |
| N20 | 0/12 | non atteint |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **OK** (jour médian N10 = 20)
- N20 ≤ J90 (aspirationnel) : **NON** (jour médian N20 = non atteint)
- Écart max entre deux niveaux avant N20 ≤ 5j : **NON** (observé max = 57j, médiane des runs = 42.0j)

### 3. XP/jour par source (moyenne)

| Source | XP/jour |
|---|---|
| Achat (chinage) | 9.43 |
| Découverte collection | 5.49 |
| Négo réussie (achat) | 4.72 |
| Vente | 12.17 |
| Juste prix (achat direct) | 1.23 |
| Négo réussie (vente) | 2.43 |
| Restauration (atelier) | 7.38 |
| Quête quotidienne | 2.64 |
| Quête hebdo | 3.13 |
| Quête principale (chapitres) | 1.67 |
| **Total** | **50.3** |

### 4. Double gate (% de déblocages où le niveau était bloquant)

| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |
|---|---|---|---|---|
| tier2 | 0% | 100% | 0% | 12 |

### 5. Sessions effectives/jour, avant vs après jalon énergie

- N8 (+1 énergie) : avant = 3.00 sessions/j, après = 3.00 sessions/j
- N14 (+1 énergie) : avant = 3.00 sessions/j, après = 3.90 sessions/j

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J5, lotGarni=J10, fouille=J16, boniment=J35, tchatche=J43

## Profil Régulier (4 visites/jour)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 5 | 6.0 | 6 |
| 14 | 8 | 9.0 | 10 |
| 30 | 11 | 12.0 | 14 |
| 60 | 12 | 14.0 | 16 |
| 90 | 13 | 15.0 | 17 |
| 120 | 14 | 16.0 | 18 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 3 |
| N5 | 12/12 | 5 |
| N8 | 12/12 | 11 |
| N10 | 12/12 | 16 |
| N14 | 11/12 | 35 |
| N20 | 2/12 | 83 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **OK** (jour médian N10 = 16)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 83)
- Écart max entre deux niveaux avant N20 ≤ 5j : **NON** (observé max = 44j, médiane des runs = 38.0j)

### 3. XP/jour par source (moyenne)

| Source | XP/jour |
|---|---|
| Achat (chinage) | 15.44 |
| Découverte collection | 6.49 |
| Négo réussie (achat) | 7.72 |
| Vente | 20.08 |
| Juste prix (achat direct) | 2.01 |
| Négo réussie (vente) | 4.01 |
| Restauration (atelier) | 14.75 |
| Quête quotidienne | 2.57 |
| Quête hebdo | 3.13 |
| Quête principale (chapitres) | 4.17 |
| **Total** | **80.4** |

### 4. Double gate (% de déblocages où le niveau était bloquant)

| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |
|---|---|---|---|---|
| tier2 | 0% | 100% | 0% | 12 |

### 5. Sessions effectives/jour, avant vs après jalon énergie

- N8 (+1 énergie) : avant = 5.00 sessions/j, après = 5.90 sessions/j
- N14 (+1 énergie) : avant = 6.00 sessions/j, après = 6.00 sessions/j

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J5, lotGarni=J8, fouille=J12, boniment=J26, tchatche=J34, criee=J75

## Profil Hardcore (présence quasi continue)

### 1. Courbe niveau/jour (p10 / médiane / p90)

| Jour | p10 | Médiane | p90 |
|---|---|---|---|
| 7 | 6 | 7.0 | 7 |
| 14 | 9 | 9.0 | 10 |
| 30 | 10 | 14.0 | 14 |
| 60 | 11 | 16.0 | 19 |
| 90 | 13 | 17.0 | 20 |
| 120 | 14 | 18.0 | 21 |

Jour médian d'atteinte de chaque niveau-jalon :

| Niveau | Runs l'ayant atteint | Jour médian |
|---|---|---|
| N4 | 12/12 | 3 |
| N5 | 12/12 | 4 |
| N8 | 12/12 | 9 |
| N10 | 12/12 | 15 |
| N14 | 12/12 | 27 |
| N20 | 5/12 | 80 |

### 2. Verdicts du rapport

- N10 entre J10-J25 : **OK** (jour médian N10 = 15)
- N20 ≤ J90 (aspirationnel) : **OK** (jour médian N20 = 80)
- Écart max entre deux niveaux avant N20 ≤ 5j : **NON** (observé max = 31j, médiane des runs = 25.0j)

### 3. XP/jour par source (moyenne)

| Source | XP/jour |
|---|---|
| Achat (chinage) | 18.64 |
| Découverte collection | 6.48 |
| Négo réussie (achat) | 9.32 |
| Vente | 24.79 |
| Juste prix (achat direct) | 2.47 |
| Négo réussie (vente) | 4.96 |
| Restauration (atelier) | 29.50 |
| Quête quotidienne | 2.73 |
| Quête hebdo | 3.13 |
| Quête principale (chapitres) | 4.17 |
| **Total** | **106.2** |

### 4. Double gate (% de déblocages où le niveau était bloquant)

| Tier | % niveau bloquant | % éco bloquant | % les deux même jour | n |
|---|---|---|---|---|
| tier2 | 0% | 100% | 0% | 12 |

### 5. Sessions effectives/jour, avant vs après jalon énergie

- N8 (+1 énergie) : avant = 7.00 sessions/j, après = 7.90 sessions/j
- N14 (+1 énergie) : avant = 8.00 sessions/j, après = 8.90 sessions/j

_Jours médians de déblocage des actives (indicatif, NIVEAU_ACTIVES) :_ flair=J4, lotGarni=J7, fouille=J12, boniment=J23, tchatche=J31, criee=J40

## 6. Fouille — farm check (1000 étals T3)

- Rares+légendaires par étal, 0 remplacement : 1.103
- Rares+légendaires par étal, 3 remplacements ciblés (moins chers) : 1.609
- **Multiplicateur : 1.46×**

## 7. Lot garni — re-roll check (1000 négos)

- Ratio prixMax(bundle) / (prixMax(obj1 seul) + prixMax(obj2 seul)) : p50 = 1.124, p90 = 1.461
- Gain au-delà de la valeur ajoutée (€) : p50 = 25.0, p90 = 82.0

## 8. Après aplatissement (34N+66)

Courbe corrigée le 2026-07-06 suite à ce même rapport (`src/lib/xp.ts` :
`XP_BROCANTEUR_PENTE` 60 → 34, seuil cumulé 30N²+70N → 17N²+83N ; N1 = 100 XP
inchangé). Re-simulation avec le même moteur, mêmes profils/seeds/durée ;
rejoue `SIMULATION=1 npx vitest run src/lib/simulation/niveauSim.test.ts`.

### Jour médian par jalon (avant → après)

| Profil | N10 | N14 | N20 (runs l'ayant atteint) |
|---|---|---|---|
| Casual | 20 → **13** | 45 (4/12) → **23** (8/12) | non atteint (0/12) → **50** (2/12) |
| Régulier | 16 → **11** | 35 (11/12) → **20** (12/12) | 83 (2/12) → **38** (6/12) |
| Hardcore | 15 → **9** | 27 (12/12) → **17** (12/12) | 80 (5/12) → **33** (9/12) |

### Écart max entre deux niveaux avant N20 (avant → après)

| Profil | Observé max | Médiane des runs |
|---|---|---|
| Casual | 57j → **53j** | 42.0j → **37.0j** |
| Régulier | 44j → **32j** | 38.0j → **26.0j** |
| Hardcore | 31j → **20j** | 25.0j → **4.0j** |

### Verdicts vs cibles du rapport (avant → après)

| Profil | N10 ∈ [J10,J25] | N20 ≤ J90 | Écart max avant N20 ≤ 5j |
|---|---|---|---|
| Casual | OK → OK | NON → OK | NON → NON |
| Régulier | OK → OK | OK → OK | NON → NON |
| Hardcore | **OK → NON** (médian passe à J9, sous la borne basse J10) | OK → OK | NON → NON |

### Constat

- Le plateau tardif se réduit nettement en **médiane** (le cas le plus
  parlant : Hardcore 25.0j → 4.0j), et Régulier/Casual gagnent 6-11j sur le
  jalon N10 et 12-45j sur N14. C'est la correction attendue.
- L'« écart max observé » (pire run individuel) baisse beaucoup moins que
  prévu (régulier 44j→32j, pas ~7-9j) : ce chiffre reste dominé par les runs
  qui n'atteignent toujours pas N20 en 120 jours (2/12 en Casual, 6/12 en
  Régulier, 9/12 en Hardcore) — la métrique mesure alors le temps restant
  jusqu'à J120, pas un écart entre deux level-ups. Amélioration réelle mais
  plus modeste que l'hypothèse « ~7-9j au revenu mesuré » du rapport pour
  cette statistique précise.
- **Régression à signaler** : le profil Hardcore, qui respectait la cible
  N10 ∈ [J10,J25] avant l'aplatissement (médian J15), tombe maintenant à
  J9 — sous la borne basse. La pente plus faible accélère aussi le tout
  début de la partie pour les profils à fort débit d'XP/jour (Hardcore =
  97.9 XP/j simulé), pas seulement la fin. À arbitrer : soit la cible N10
  basse (J10) est trop stricte pour ce profil, soit il faut une courbe qui
  ne s'aplatit qu'au-delà d'un certain niveau plutôt qu'une pente unique
  sur tout le parcours. Pas de nouveau tuning appliqué sans validation.

