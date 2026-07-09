/**
 * Overlay EN des brocantes (spec i18n §2, SP3). Clé = `Brocante.id`, le FR de
 * `src/data/brocantes.ts` reste canonique. `ambiance` est une clé logique
 * (BIAIS_AMBIANCE) non affichée : jamais traduite, absente de l'overlay.
 * Noms propres de lieux fictifs français : saveur conservée, descriptif traduit.
 */
export const BROCANTES_EN: Record<string, { nom: string; description: string }> = {
  // TIER 1
  "vide-grenier-quartier": {
    nom: "Neighborhood yard sale",
    description:
      "A few folding tables on the square. Low prices, few gems — but everyone starts somewhere.",
  },
  "marche-aux-puces-dimanche": {
    nom: "Sunday flea market",
    description:
      "The great gathering of pickers. More people, more choice, craftier sellers.",
  },
  "bouquinerie-plein-air": {
    nom: "Open-air book stall",
    description:
      "Boxes of books lined up on trestles. Enthusiasts linger here for hours.",
  },
  "vide-dressing-centre": {
    nom: "Downtown wardrobe sale",
    description:
      "Wardrobes unpacked onto rails. Seventies vintage, battered bags, forgotten brooches.",
  },
  "brocante-club-jeux": {
    nom: "Games club flea market",
    description:
      "NES cartridges in bins, board-game boxes stacked high. A haunt for the nostalgic.",
  },
  // TIER 2
  "deballage-collectionneurs": {
    nom: "Collectors' fair",
    description:
      "For well-lined wallets only. Rare pieces change hands here — but at what price?",
  },
  "marche-saint-ouen": {
    nom: "Grand Flea Market of the Capital",
    description:
      "The legendary flea market. Licensed antique dealers, stinging prices, possible gems.",
  },
  "disquaire-independant": {
    nom: "Independent record shop",
    description:
      "A dim cellar, crates as far as the eye can see, an owner who knows every sleeve.",
  },
  "atelier-bricoleur": {
    nom: "Handyman's workshop",
    description:
      "Old tools in a jumble, Japanese saws and prewar screwdrivers.",
  },
  "marche-antiquaires-bibelots": {
    nom: "Antique dealers' market (trinkets)",
    description:
      "Locked display cases, sellers who handle each piece with gloves.",
  },
  // TIER 3
  "foire-chatou": {
    nom: "Grand Antiques Fair",
    description:
      "Twice a year, the Island of the Impressionists hosts the trade's finest.",
  },
  "salon-grands-collectionneurs": {
    nom: "Grand collectors' salon",
    description:
      "A closed circle, by invitation only. The rarest pieces find their showcase here.",
  },
  "drouot-mode-couture": {
    nom: "Auction House — Fashion & Couture",
    description:
      "Themed sales where the great pieces pass through: designer dresses, iconic bags.",
  },
  "salon-violon-ancien": {
    nom: "Antique violin salon",
    description:
      "Luthiers, curators, virtuosos. Silence here is worth its weight in gold — so are the instruments.",
  },
  "galerie-arts-decoratifs": {
    nom: "Decorative arts gallery",
    description:
      "Faience, crystal, gilt. The pieces are signed, the prices make you cough.",
  },
  "galerie-tableaux-sculptures": {
    nom: "Sale Gallery — Paintings & Sculptures",
    description:
      "Gilt frames on the walls, sculptures on plinths. You enter as if to the opera, and leave poorer — sometimes richer.",
  },
  // BOSS
  "salon-antiquaires-drouot": {
    nom: "Grand Antique Dealers' Salon",
    description:
      "The holy of holies. The greatest collectors cross paths here, and unique pieces make their final appearance.",
  },
};
