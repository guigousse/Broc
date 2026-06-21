import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales — Broc",
  description: "Mentions légales de l'application Broc.",
};

const MAJ = "22 juin 2026";
const CONTACT = "guillaume.fenard@gmail.com";
const EDITEUR = "Guillaume Fenard";

export default function MentionsLegalesPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "48px 24px 96px",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 18,
        lineHeight: 1.65,
        color: "#2b2418",
      }}
    >
      <p style={{ marginBottom: 24 }}>
        <Link href="/" style={link}>
          ← Retour au jeu
        </Link>
      </p>

      {/* ====================== FRANÇAIS ====================== */}
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 30, marginBottom: 4 }}>
        Mentions légales
      </h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Broc — {MAJ}</p>

      <h2 style={h2}>Éditeur</h2>
      <p>
        L’application <strong>Broc</strong> est éditée par {EDITEUR}, éditeur
        individuel.
        <br />
        Contact :{" "}
        <a href={`mailto:${CONTACT}`} style={link}>
          {CONTACT}
        </a>
        <br />
        Directeur de la publication : {EDITEUR}.
      </p>

      <h2 style={h2}>Hébergement</h2>
      <p>
        La présente page web est hébergée par Vercel Inc., 340 S Lemon Ave
        #4133, Walnut, CA 91789, États-Unis.
        <br />
        L’application mobile est distribuée via l’App Store, exploité par Apple
        Inc., One Apple Park Way, Cupertino, CA 95014, États-Unis.
      </p>

      <h2 style={h2}>Propriété intellectuelle</h2>
      <p>
        Les textes, illustrations, sons et l’ensemble des éléments de
        l’application Broc sont des créations originales protégées. Toute
        reproduction sans autorisation est interdite. Les noms et visuels du jeu
        sont fictifs ; toute ressemblance avec des marques, œuvres ou personnes
        réelles serait fortuite.
      </p>

      <h2 style={h2}>Données personnelles</h2>
      <p>
        Broc ne collecte aucune donnée personnelle. Voir la{" "}
        <Link href="/privacy" style={link}>
          politique de confidentialité
        </Link>
        .
      </p>

      <hr style={{ margin: "56px 0", border: "none", borderTop: "1px solid #cdbf9a" }} />

      {/* ====================== ENGLISH ====================== */}
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 30, marginBottom: 4 }}>
        Legal Notice
      </h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Broc — {MAJ}</p>

      <h2 style={h2}>Publisher</h2>
      <p>
        The <strong>Broc</strong> application is published by {EDITEUR}, sole
        proprietor.
        <br />
        Contact:{" "}
        <a href={`mailto:${CONTACT}`} style={link}>
          {CONTACT}
        </a>
      </p>

      <h2 style={h2}>Hosting</h2>
      <p>
        This web page is hosted by Vercel Inc., 340 S Lemon Ave #4133, Walnut,
        CA 91789, USA.
        <br />
        The mobile app is distributed via the App Store, operated by Apple Inc.,
        One Apple Park Way, Cupertino, CA 95014, USA.
      </p>

      <h2 style={h2}>Intellectual property</h2>
      <p>
        All text, artwork, sounds and other elements of the Broc app are
        original protected creations. Any reproduction without permission is
        prohibited. Names and visuals in the game are fictional; any resemblance
        to real brands, works or people would be coincidental.
      </p>

      <h2 style={h2}>Personal data</h2>
      <p>
        Broc collects no personal data. See the{" "}
        <Link href="/privacy" style={link}>
          privacy policy
        </Link>
        .
      </p>
    </main>
  );
}

const h2: React.CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: 20,
  marginTop: 32,
  marginBottom: 8,
};
const link: React.CSSProperties = { color: "#6b5a2e" };
