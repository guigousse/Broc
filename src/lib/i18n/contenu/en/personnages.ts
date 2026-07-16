import type { VendeurArchetypeId } from "@/types/game";

/**
 * Overlay EN des personnages (spec i18n §2, SP3, tâche 7). Regroupe clients de
 * vente, vendeurs de chine et expéditeurs de courrier. Le FR de `src/data/` et
 * `src/lib/personas.ts` reste canonique ; ici on résout par id à l'affichage.
 *
 * - `archetypesClient` : clé = `ClientArchetype.id`.
 * - `personnages` : clé = `ClientPersonnage.id` (ex. `retraite_chineur.0`).
 * - `archetypesVendeur` : clé = `VendeurArchetypeId` (14).
 * - `vendeurs` : clé = `VendeurArchetypeId`, uniquement les 10 non-commanditaires.
 *   Les 4 commanditaires (joueur/setdesigner/modeuse/esthete) NE sont PAS dupliqués :
 *   ils se résolvent via l'expéditeur correspondant (source unique du courrier).
 * - `expediteurs` : clé = `ExpediteurDef.id` (7). Signatures : garder les `\n`.
 *
 * Noms propres à gouaille : adaptation légère qui conserve la saveur.
 */
export interface OverlayPersonnages {
  archetypesClient: Record<string, { nom: string }>;
  personnages: Record<string, { nom: string; ambiance: string }>;
  archetypesVendeur: Record<VendeurArchetypeId, string>;
  vendeurs: Partial<Record<VendeurArchetypeId, string>>;
  vendeurInconnu: string;
  expediteurs: Record<
    string,
    { nom: string; personnalite: string; relation?: string; signature: string }
  >;
}

export const PERSONNAGES_EN: OverlayPersonnages = {
  archetypesClient: {
    retraite_chineur: { nom: "Retired bargain-hunter" },
    passionnee_artdeco: { nom: "Art Deco devotee" },
    brocanteur_concurrent: { nom: "Rival dealer" },
    collectionneur_musique: { nom: "Music collector" },
    gamer_nostalgique: { nom: "Nostalgic gamer" },
    bibliophile: { nom: "Bibliophile" },
    bricoleur_dimanche: { nom: "Sunday handyman" },
    etudiant_fauche: { nom: "Broke student" },
    snob_bourgeois: { nom: "Bourgeois snob" },
    touriste_perdu: { nom: "Lost tourist" },
    famille_dimanche: { nom: "Sunday family" },
    decorateur: { nom: "Interior decorator" },
    amateur_vintage: { nom: "Vintage lover" },
    notable_curieux: { nom: "Curious notable" },
    opportuniste: { nom: "Sniffing opportunist" },
    galeriste: { nom: "Gallery owner" },
  },
  personnages: {
    "retraite_chineur.0": {
      nom: "Mr. Durand",
      ambiance: "Counts every penny, peering over his glasses.",
    },
    "retraite_chineur.1": {
      nom: "Mrs. Rivoire",
      ambiance: 'Always asks "is that your best price?"',
    },
    "retraite_chineur.2": {
      nom: "Pierre from down the road",
      ambiance: "Mostly comes to chat, buys little.",
    },
    "passionnee_artdeco.0": {
      nom: "Léonie of Tourcoing",
      ambiance: "Sighs softly at every fine patina.",
    },
    "passionnee_artdeco.1": {
      nom: "Camille Mercier",
      ambiance: "Quietly photographs the pieces she likes.",
    },
    "passionnee_artdeco.2": {
      nom: "Mrs. Renaud",
      ambiance: "Strokes the carved wood with a knowing finger.",
    },
    "brocanteur_concurrent.0": {
      nom: "Maxime the flea-marketeer",
      ambiance: "Never smiles, always offers 30% below.",
    },
    "brocanteur_concurrent.1": {
      nom: "Hugo the reseller",
      ambiance: "Knows your stall and your prices by heart.",
    },
    "brocanteur_concurrent.2": {
      nom: 'Jean-Claude "the going rate"',
      ambiance: "Quotes auction sales to justify his lowballs.",
    },
    "collectionneur_musique.0": {
      nom: "Bertrand the music buff",
      ambiance: "Sniffs each record sleeve with respect.",
    },
    "collectionneur_musique.1": {
      nom: "Sophie LP",
      ambiance: "Always leaves with two or three records under her arm.",
    },
    "collectionneur_musique.2": {
      nom: "Vinyl Vincent",
      ambiance: "Knows every pressing, every label.",
    },
    "gamer_nostalgique.0": {
      nom: "Léo the retro kid",
      ambiance: "Melts at every childhood cartridge.",
    },
    "gamer_nostalgique.1": {
      nom: "Thomas the pixel",
      ambiance: "Checks the controllers, sighs with joy.",
    },
    "gamer_nostalgique.2": {
      nom: "Marina the geek",
      ambiance: "Hunting a gift for her collector brother.",
    },
    "bibliophile.0": {
      nom: "Hélène the librarian",
      ambiance: "Checks for missing pages, ever sententious.",
    },
    "bibliophile.1": {
      nom: "Professor Lambert",
      ambiance: "Roots around among the first editions.",
    },
    "bibliophile.2": {
      nom: "Émilie of the fountain pen",
      ambiance: "Seeks old paper and Sergent-Major nibs.",
    },
    "bricoleur_dimanche.0": {
      nom: "Marcel the handyman",
      ambiance: "Smells the sawdust from ten feet away.",
    },
    "bricoleur_dimanche.1": {
      nom: "Patrice with the drill",
      ambiance: "Always asks whether it still works.",
    },
    "bricoleur_dimanche.2": {
      nom: "Jacques of the pliers",
      ambiance: "Inspects each tool like a surgeon.",
    },
    "etudiant_fauche.0": {
      nom: "Théo the intern",
      ambiance: "Stares a long while, pats his pockets, puts it back.",
    },
    "etudiant_fauche.1": {
      nom: "Anaïs the penniless",
      ambiance: "Haggles as if her life depended on it.",
    },
    "etudiant_fauche.2": {
      nom: "Yanis the bohemian",
      ambiance: "Wants it all, can afford a tenth of it.",
    },
    "snob_bourgeois.0": {
      nom: "Charles-Henri de B.",
      ambiance: "Doesn't greet the seller, examines with fingertips.",
    },
    "snob_bourgeois.1": {
      nom: "Mrs. de Lacombe",
      ambiance: "Eyes the pieces without deigning to touch them.",
    },
    "snob_bourgeois.2": {
      nom: "Aristide senior",
      ambiance: "Politely refuses anything that looks common.",
    },
    "touriste_perdu.0": {
      nom: "Karl from Berlin",
      ambiance: "Gushes in halting French.",
    },
    "touriste_perdu.1": {
      nom: "Maria from Milan",
      ambiance: "Converts prices on the fly, surprised and won over.",
    },
    "touriste_perdu.2": {
      nom: "Hiroshi & Yuka",
      ambiance: "Reach for anything that glitters a little.",
    },
    "famille_dimanche.0": {
      nom: "The Martinez family",
      ambiance: "The kids grab at everything that makes noise.",
    },
    "famille_dimanche.1": {
      nom: "Mrs. Petit and her son",
      ambiance: "Looking for a little gift for grandma.",
    },
    "famille_dimanche.2": {
      nom: "The Garniers",
      ambiance: "Rarely leave empty-handed when there are toys.",
    },
    "decorateur.0": {
      nom: "Sylvain the designer",
      ambiance: "Already picturing the piece in a Lyon loft.",
    },
    "decorateur.1": {
      nom: "Bérénice the decorator",
      ambiance: "Snaps a photo, takes measurements, walks off with it.",
    },
    "decorateur.2": {
      nom: "Olivier the renovator",
      ambiance: "Hunting for character to fit his projects.",
    },
    "amateur_vintage.0": {
      nom: "Inès the rockabilly",
      ambiance: "After a leather jacket and a 45.",
    },
    "amateur_vintage.1": {
      nom: "Théo the mod",
      ambiance: "Taps his foot to a tune spinning in his head.",
    },
    "amateur_vintage.2": {
      nom: "Clara in denim",
      ambiance: "Tries everything, leaves with two pieces.",
    },
    "notable_curieux.0": {
      nom: "Counsel Lefèvre",
      ambiance: "Exquisite manners, wallet discreet but deep.",
    },
    "notable_curieux.1": {
      nom: "Doctor Roux",
      ambiance: "Curious about everything, talks Latin with the books.",
    },
    "notable_curieux.2": {
      nom: "The Countess",
      ambiance: "Comes to pass the time, leaves for the pleasure of it.",
    },
    "opportuniste.0": {
      nom: "Sébastien the sly",
      ambiance: "Points straight at your softest prices.",
    },
    "opportuniste.1": {
      nom: "Rachida the eye",
      ambiance: "Spots a mispriced tag from ten paces.",
    },
    "opportuniste.2": {
      nom: "Vincent from the market",
      ambiance: "Always startles you with a rock-bottom price… that works.",
    },
    "galeriste.0": {
      nom: "Aurélien of Saint-Germain",
      ambiance: "Circles the piece, mutters in Italian.",
    },
    "galeriste.1": {
      nom: "Mrs. Vermeer",
      ambiance: "Pulls out a pocket loupe and studies the signature.",
    },
    "galeriste.2": {
      nom: "Pascal the gallerist",
      ambiance: "Talks pedigree, provenance, certificates.",
    },
  },
  archetypesVendeur: {
    naif: "The Greenhorn",
    bonhomme: "The Good Fellow",
    mamie: "Granny in a hurry",
    malin: "The Sharp One",
    grincheux: "The Grump",
    antiquaire: "The Antiquarian",
    pipelette: "The Chatterbox",
    videcave: "The Cellar-Clearer",
    bonimenteur: "The Smooth Talker",
    disquaire: "The Record Dealer",
    joueur: "The Gamer",
    setdesigner: "The Set Designer",
    modeuse: "The Fashion Designer",
    esthete: "The Aesthete",
  },
  vendeurs: {
    naif: "Li'l Lucien",
    bonhomme: "Suspenders Dédé",
    mamie: "Granny Odette",
    malin: "Anatole the Angle",
    grincheux: "Old Anselme",
    antiquaire: "Madame Vasseur",
    pipelette: "Auntie Monique",
    videcave: "Jeannot Cellar-Clearer",
    bonimenteur: "Oscar the Gab",
    disquaire: "Barnabé 33s",
  },
  vendeurInconnu: "A seller",
  expediteurs: {
    maman: {
      nom: "Mum",
      personnalite: "Your mother",
      relation: "Mother",
      signature: "With all my love,\nMum",
    },
    "grand-pere": {
      nom: "Grandpa",
      personnalite: "Retired antiquarian",
      relation: "Grandfather",
      signature: "Your move now, kid.\nGrandpa",
    },
    "jeux-video": {
      nom: "The Yard-Sale Gamer",
      personnalite: "Video-game enthusiast",
      signature: "Catch you in the pixels,\nThe Yard-Sale Gamer",
    },
    "set-designer": {
      nom: "Clara",
      personnalite: "Set designer",
      signature: "Thanks in advance,\nClara",
    },
    mode: {
      nom: "Arianne",
      personnalite: "Fashion designer",
      signature: "With style,\nArianne",
    },
    art: {
      nom: "Paul-Henry",
      personnalite: "Art collector",
      signature: "Yours truly,\nPaul-Henry",
    },
    organisateurs: {
      nom: "The Organisers",
      personnalite: "Flea-market committee",
      relation: "Organisers",
      signature: "Looking forward to seeing you there,\nThe Organisers",
    },
  },
};
