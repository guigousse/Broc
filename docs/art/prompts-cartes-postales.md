# Prompts — illustrations des cartes postales de l'épilogue

Cible : `public/cartes-postales/{venise,lisbonne,marrakech,kyoto,athenes}.webp`,
**paysage 3:2, 1200×800** (le recto de `CartePostaleView` recadre en
`objectFit: cover` — toute image non-3:2 sera rognée).

Direction artistique : celle des personas
(`docs/superpowers/specs/2026-06-01-personas-illustrations-design.md`) —
aquarelle + encre légère, style carte postale/magazine français années 1940,
palette terre, jamais de néon. Motif récurrent : le grand-père voyageur, petit
dans la scène, toujours de dos.

Conversion après téléchargement du PNG :

```bash
magick raw.png -resize 1200x800^ -gravity center -extent 1200x800 -quality 82 public/cartes-postales/<nom>.webp
```

## Socle commun (préfixe de chaque prompt)

```
Vintage travel postcard illustration, landscape orientation. Watercolor and
light ink, soft washed colors, gentle pencil sketch under the color washes,
no hard black outlines. Reminiscent of 1940s French travel postcards and
magazine illustrations. Subtle aged paper grain. Base palette of earthy
tones — ochre (#C9A04A), warm browns (#6B4A2B), off-white (#F4EFE6) — with
the destination's own accent colors kept muted, never neon or saturated.
In the scene, small and seen from behind, an elderly gentleman traveler in
1940s clothes (hat, walking cane, small suitcase) — never facing the viewer.
No text, no lettering, no borders, no stamps.
```

## 1. venise.webp — Carte de Venise

```
SCENE: Venice under gentle rain. A quiet canal with gondolas moored along
mossy poles, ochre and faded rose facades. The water mirrors the city almost
perfectly — the reflection as detailed as the buildings, two Venices in one
image. The elderly traveler stands on a small stone bridge under an umbrella,
watching the reflections. Accent colors: lagoon blue-grey (#5a7d9a), muted
rose plaster. Rain rendered as soft washes, luminous grey sky.
```

## 2. lisbonne.webp — Carte de Lisbonne

```
SCENE: Lisbon, a steep narrow street in Alfama. A vintage yellow tram climbs
the hill between houses covered in blue-and-white azulejo tiles, laundry
strung between windows, warm afternoon light. The elderly traveler walks up
the cobbled sidewalk beside the rails, suitcase in hand. Accent colors: tram
yellow-ochre (#c98a3d), azulejo blue kept soft and chalky. Terracotta
rooftops descending toward a glimpse of the Tagus river.
```

## 3. marrakech.webp — Carte de Marrakech

```
SCENE: Marrakech souk alley, canvas awnings filtering warm sunlight into
stripes. Stalls overflowing with brass and silver teapots, lanterns and
woven rugs. In the foreground corner, a low table with two glasses of mint
tea and an ornate teapot. The elderly traveler sits at the table with a
merchant, mid-negotiation, both seen from behind/profile at a distance.
Accent colors: terracotta (#b5533c), saffron, warm shadow tones. Dust motes
in the light beams.
```

## 4. kyoto.webp — Carte de Kyoto

```
SCENE: Kyoto, a quiet artisan workshop opening onto a small zen garden with
a red maple. On a low wooden table in the foreground, a ceramic bowl
repaired with kintsugi — thin luminous gold seams across its dark glaze —
beside brushes and a small pot of gold lacquer. The elderly traveler kneels
at the table, seen from behind, head bowed toward the bowl. Accent colors:
matcha green (#7d9a6a), dark clay, one restrained touch of gold. Soft paper
lantern light.
```

## 5. athenes.webp — Carte d'Athènes

```
SCENE: Athens in golden morning light, a shaded café terrace in the Plaka
district. In the distance the Acropolis on its rocky hill — and, strung
between the nearest houses, the neighbor's laundry sharing the sky with it,
on equal footing. The elderly traveler sits at a small marble café table,
seen from behind, a tiny Greek coffee cup before him. At the foot of the
hill nearby, a modest little shop with wooden shutters ajar, a workbench
glimpsed inside. Accent colors: Aegean blue (#3d6e8f), warm marble whites,
one discreet bougainvillea. Mood: settled, serene — the end of a journey,
not a stop.
```

## Critères de validation

- Aquarelle assumée, pas de rendu 3D/photo ni de contours noirs durs.
- Aucun lettrage (alphabet latin OU grec, enseignes comprises), cadre,
  timbre ou légende dans l'image → régénérer sinon.
- Le grand-père : petit dans la scène, de dos, chapeau — jamais de visage.
- Les teintes d'accent font écho à `couleurTimbre` de chaque carte
  (`src/data/cartesPostales.ts`) : la vignette du timbre et le recto restent
  accordés.
