# Carte 5 : Athènes remplace la « Carte sans timbre » — design

**Date** : 2026-07-21
**Statut** : validé par Guillaume
**Prérequis** : chantier cartes postales illustrées (spec 2026-07-21, mergé)

## Objectif

La 5ᵉ et dernière carte postale de l'épilogue devient la **Carte d'Athènes** :
le grand-père annonce qu'il s'y installe — il a trouvé sa place. La carte
gagne un timbre (comme les quatre autres) ; la mécanique « carte sans
timbre » disparaît des données mais reste supportée par le composant.

## 1. Données — `src/data/cartesPostales.ts`

L'id `carte_postale_5` ne change **pas** (stocké dans les saves, idempotence
de l'injection dans `tick.ts`). Champs remplacés :

- `titre` : `"Carte d'Athènes"`
- `corps` (texte validé, verbatim) :
  1. `"Depuis la terrasse où je t'écris, on voit l'Acropole et le linge du voisin, à égalité. J'ai visité la moitié du monde en courant après les bijoux d'une reine — et c'est ici, devant un café trop sucré, que j'ai cessé de courir."`
  2. `"Je reste. Il y a une échoppe à louer au pied de la colline, juste la place pour un établi et deux chaises. On avait déjà tout, tu sais — moi, il me manquait juste un endroit où le savoir."`
  3. `"Viens me voir quand la boutique te laissera respirer. — Grand-père"`
- `illustration` : `"/cartes-postales/athenes.webp"`
- `cachet` : `"ATHINA"` (convention noms locaux : VENEZIA, LISBOA, MARRAKECH, KYOTO)
- `couleurTimbre` : `"#3d6e8f"` (bleu Égée — distinct du bleu-gris lagune `#5a7d9a` de Venise)

## 2. Tests

- `src/data/cartesPostales.test.ts` : le test « cartes 1-4 : cachet ; carte
  5 : ni l'un ni l'autre » devient « les 5 cartes ont cachet + couleurTimbre »
  (+ vérification `carte_postale_5` → cachet `ATHINA`). Le test du chemin
  d'illustration couvre déjà `athenes.webp` via le motif générique.
- `src/components/mobile/qg/sheets/CartePostaleView.test.tsx` : le test
  « carte 5 : aucun timbre au verso » est conservé mais bascule sur une
  **fixture locale** `CartePostale` sans `cachet` (la capacité « carte sans
  timbre » du composant reste couverte alors qu'aucune donnée réelle ne
  l'utilise plus). Le courrier de la fixture reste `creerCartePostale(5, 60)`
  — seul l'objet `carte` passé en prop est fabriqué.

## 3. i18n — `src/lib/i18n/contenu/{en,es}/courrier.ts`

Remplacer l'entrée `carte_postale_5` (titre + corps, 3 paragraphes) par les
traductions du nouveau texte :

- EN : titre `"Postcard from Athens"`, corps fidèle au FR (ton « Grandpa »,
  signature `— Grandpa`).
- ES : titre `"Postal de Atenas"`, corps fidèle au FR (signature `— Abuelo`).

Le test de parité `src/lib/i18n/contenu/courrier.test.ts` doit rester vert
(mêmes clés, même nombre de paragraphes que le FR).

## 4. Illustration — `scripts/generate-cartes-postales.mjs`

- L'entrée `sans-timbre` devient `athenes`. Scène : terrasse ombragée d'un
  café à Plaka au petit matin, l'Acropole au loin ET le linge du voisin dans
  le cadre (« à égalité »), le grand-père attablé de dos devant un café grec,
  une petite échoppe à louer au pied de la colline (volet, établi entrevu).
  Accents : bleu Égée (#3d6e8f), marbre chaud, bougainvillier discret.
  Mêmes contraintes que les autres (aquarelle 1940s, full-bleed 3:2, AUCUN
  texte — pas d'enseigne lisible, pas d'alphabet grec).
- Régénérer `athenes.webp` (1200×800), **supprimer**
  `public/cartes-postales/sans-timbre.webp`.
- Mettre à jour `docs/art/prompts-cartes-postales.md` (section 5 remplacée,
  critères inchangés).

## 5. Compatibilité saves

Aucune migration. Le contenu est résolu à l'affichage par id
(`titreCourrier`/`corpsCourrier`). Cas limite assumé : une save FR ayant déjà
reçu `carte_postale_5` affichera l'ancien texte (payload FR embarqué servant
de fallback) — aucun joueur réel concerné à ce stade.

## Hors périmètre (YAGNI)

- Pas de 6ᵉ carte, pas de renommage d'id, pas de migration de payload.
- Pas de retouche des 4 autres cartes ni du composant (le rendu « sans
  cachet → sans timbre » existe déjà et reste tel quel).
