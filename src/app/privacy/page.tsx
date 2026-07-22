import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Broc",
  description:
    "Données locales et service d’heure utilisé par Broc.",
};

const MAJ = "17 juillet 2026";
const CONTACT = "pepite.admin@gmail.com";
const EDITEUR = "Guillaume Fenard";

export default function PrivacyPage() {
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
        <Link href="/" style={{ color: "#6b5a2e", textDecoration: "none" }}>
          ← Retour au jeu
        </Link>
      </p>

      {/* ====================== FRANÇAIS ====================== */}
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 30, marginBottom: 4 }}>
        Politique de confidentialité
      </h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Broc — dernière mise à jour : {MAJ}</p>

      <p>
        <strong>En bref : votre progression reste sur votre appareil.</strong> Le
        jeu effectue toutefois un appel réseau limité à un service d’heure,
        décrit ci-dessous.
      </p>

      <h2 style={h2}>1. Données traitées</h2>
      <p>
        Broc ne demande aucun compte, aucune inscription et ne collecte aucune
        donnée personnelle. Votre progression (argent, collection, réglages,
        sauvegarde) est enregistrée <strong>localement</strong> sur votre
        appareil (stockage local du système) et n’est jamais envoyée sur un
        serveur ni partagée.
      </p>

      <h2 style={h2}>2. Service d’heure utilisé</h2>
      <p>
        Afin de limiter la manipulation de l’horloge de l’appareil et de calculer
        certaines échéances du jeu, Broc interroge le service tiers{" "}
        <strong>timeapi.io</strong>. La requête demande uniquement l’heure UTC :
        aucune sauvegarde, aucun identifiant de joueur et aucune information sur
        votre progression ne sont transmis par Broc. Comme pour toute connexion
        Internet, le fournisseur du service peut néanmoins recevoir des données
        techniques telles que votre adresse IP, la date de la requête et des
        informations réseau.
      </p>

      <h2 style={h2}>3. Aucun suivi publicitaire ou analytique</h2>
      <p>
        L’application ne contient actuellement aucun outil de mesure d’audience,
        aucun traceur publicitaire, aucun SDK publicitaire et aucun bouton de
        réseau social. Les polices, images et sons sont intégrés à l’application.
        Broc reste jouable hors ligne ; si le service d’heure est indisponible,
        l’application utilise l’horloge de l’appareil.
      </p>

      <h2 style={h2}>4. Achats intégrés et publicité</h2>
      <p>
        Cette version de l’application ne propose aucun achat intégré et
        n’affiche aucune publicité fournie par un tiers. Certaines récompenses
        publicitaires peuvent être simulées localement pendant le développement,
        sans diffusion de publicité ni transmission de données à un réseau
        publicitaire.
      </p>

      <h2 style={h2}>5. Enfants</h2>
      <p>
        Broc ne demande ni compte, ni nom, ni adresse électronique et ne diffuse
        pas de publicité tierce. L’utilisation limitée du service d’heure est la
        même pour tous les joueurs.
      </p>

      <h2 style={h2}>6. Suppression de vos données</h2>
      <p>
        Toutes les données sont sur votre appareil. Vous pouvez les effacer à
        tout moment via « Réinitialiser la partie » dans les réglages du jeu, ou
        en désinstallant l’application.
      </p>

      <h2 style={h2}>7. Modifications</h2>
      <p>
        Cette politique pourra être mise à jour ; la date en haut de page
        indique la dernière version.
      </p>

      <h2 style={h2}>8. Contact</h2>
      <p>
        Éditeur : {EDITEUR}. Pour toute question :{" "}
        <a href={`mailto:${CONTACT}`} style={link}>
          {CONTACT}
        </a>
        .
      </p>

      <hr style={{ margin: "56px 0", border: "none", borderTop: "1px solid #cdbf9a" }} />

      {/* ====================== ENGLISH ====================== */}
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 30, marginBottom: 4 }}>
        Privacy Policy
      </h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Broc — last updated: {MAJ}</p>

      <p>
        <strong>In short: your game progress stays on your device.</strong> The
        game nevertheless makes a limited network request to a time service, as
        described below.
      </p>

      <h2 style={h2}>1. Data we process</h2>
      <p>
        Broc requires no account or sign-up and collects no personal data. Your
        progress (money, collection, settings, save file) is stored{" "}
        <strong>locally</strong> on your device (system local storage) and is
        never uploaded to a server or shared.
      </p>

      <h2 style={h2}>2. Time service</h2>
      <p>
        To limit manipulation of the device clock and calculate certain in-game
        deadlines, Broc queries the third-party service <strong>timeapi.io</strong>.
        The request asks only for the current UTC time: Broc sends no save data,
        player identifier or information about your progress. As with any Internet
        connection, the service provider may nevertheless receive technical data
        such as your IP address, request time and network information.
      </p>

      <h2 style={h2}>3. No advertising or analytics tracking</h2>
      <p>
        The app currently contains no analytics tool, advertising tracker,
        advertising SDK or social-media widget. Fonts, images and sounds are
        bundled with the app. Broc remains playable offline; if the time service
        is unavailable, the app falls back to the device clock.
      </p>

      <h2 style={h2}>4. In-app purchases and advertising</h2>
      <p>
        This version has no in-app purchases and displays no third-party
        advertising. Advertising rewards may be simulated locally during
        development, without displaying an advertisement or sending data to an
        advertising network.
      </p>

      <h2 style={h2}>5. Children</h2>
      <p>
        Broc asks for no account, name or email address and displays no
        third-party advertising. The limited use of the time service is the same
        for every player.
      </p>

      <h2 style={h2}>6. Deleting your data</h2>
      <p>
        All data lives on your device. You can erase it at any time via “Reset
        game” in the in-game settings, or by uninstalling the app.
      </p>

      <h2 style={h2}>7. Changes</h2>
      <p>
        This policy may be updated; the date at the top of the page indicates the
        latest version.
      </p>

      <h2 style={h2}>8. Contact</h2>
      <p>
        Publisher: {EDITEUR}. For any question:{" "}
        <a href={`mailto:${CONTACT}`} style={link}>
          {CONTACT}
        </a>
        .
      </p>

      <p style={{ marginTop: 48 }}>
        <Link href="/mentions-legales" style={link}>
          Mentions légales / Legal notice
        </Link>
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
