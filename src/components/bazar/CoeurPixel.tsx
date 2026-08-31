"use client";

/**
 * Le cœur 8-bit de la borne : une grille de carrés, pas une courbe. Dessiné en
 * `<rect>` plutôt qu'en `<path>` pour qu'il reste franchement pixélisé à
 * n'importe quelle taille — un SVG lissé trahirait tout de suite le décor.
 *
 * La grille (7 × 6), lue comme une carte de jeu 8-bit :
 *   . X X . X X .
 *   X X X X X X X
 *   X X X X X X X
 *   . X X X X X .
 *   . . X X X . .
 *   . . . X . . .
 */
const GRILLE = [
  "0110110",
  "1111111",
  "1111111",
  "0111110",
  "0011100",
  "0001000",
];

export function CoeurPixel({
  size = 18,
  couleur = "#ff4d4d",
}: {
  size?: number;
  couleur?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * GRILLE.length) / 7}
      viewBox={`0 0 7 ${GRILLE.length}`}
      shapeRendering="crispEdges"
      role="presentation"
      focusable="false"
      aria-hidden
      data-testid="coeur-pixel"
    >
      {GRILLE.flatMap((ligne, y) =>
        [...ligne].map((c, x) =>
          c === "1" ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={couleur} />
          ) : null,
        ),
      )}
    </svg>
  );
}
