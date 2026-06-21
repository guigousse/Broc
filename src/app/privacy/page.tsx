import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Broc",
  description:
    "Broc ne collecte aucune donnée personnelle. Toutes les données restent sur votre appareil.",
};

const MAJ = "22 juin 2026";
const CONTACT = "guillaume.fenard@gmail.com";
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
        <strong>En bref : Broc ne collecte aucune donnée personnelle.</strong> Le
        jeu fonctionne entièrement sur votre appareil et ne transmet aucune
        information à qui que ce soit.
      </p>

      <h2 style={h2}>1. Données traitées</h2>
      <p>
        Broc ne demande aucun compte, aucune inscription et ne collecte aucune
        donnée personnelle. Votre progression (argent, collection, réglages,
        sauvegarde) est enregistrée <strong>localement</strong> sur votre
        appareil (stockage local du système) et n’est jamais envoyée sur un
        serveur ni partagée.
      </p>

      <h2 style={h2}>2. Aucun service tiers, aucun pistage</h2>
      <p>
        L’application ne contient aucun outil de mesure d’audience, aucun
        traceur, aucune publicité et aucun bouton de réseau social. Les polices
        et les sons sont intégrés à l’application : Broc{" "}
        <strong>ne réalise aucun appel réseau</strong> et fonctionne hors ligne.
      </p>

      <h2 style={h2}>3. Achats intégrés</h2>
      <p>
        L’application ne propose aucun achat intégré ni aucune publicité.
      </p>

      <h2 style={h2}>4. Enfants</h2>
      <p>
        Aucune donnée n’étant collectée, l’application convient à tous les
        publics, y compris les enfants.
      </p>

      <h2 style={h2}>5. Suppression de vos données</h2>
      <p>
        Toutes les données sont sur votre appareil. Vous pouvez les effacer à
        tout moment via « Réinitialiser la partie » dans les réglages du jeu, ou
        en désinstallant l’application.
      </p>

      <h2 style={h2}>6. Modifications</h2>
      <p>
        Cette politique pourra être mise à jour ; la date en haut de page
        indique la dernière version.
      </p>

      <h2 style={h2}>7. Contact</h2>
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
        <strong>In short: Broc does not collect any personal data.</strong> The
        game runs entirely on your device and does not transmit any information
        to anyone.
      </p>

      <h2 style={h2}>1. Data we process</h2>
      <p>
        Broc requires no account or sign-up and collects no personal data. Your
        progress (money, collection, settings, save file) is stored{" "}
        <strong>locally</strong> on your device (system local storage) and is
        never uploaded to a server or shared.
      </p>

      <h2 style={h2}>2. No third parties, no tracking</h2>
      <p>
        The app contains no analytics, no trackers, no advertising and no social
        media widgets. Fonts and sounds are bundled with the app: Broc{" "}
        <strong>makes no network requests</strong> and works offline.
      </p>

      <h2 style={h2}>3. In-app purchases</h2>
      <p>The app has no in-app purchases and no advertising.</p>

      <h2 style={h2}>4. Children</h2>
      <p>
        Since no data is collected, the app is suitable for all audiences,
        including children.
      </p>

      <h2 style={h2}>5. Deleting your data</h2>
      <p>
        All data lives on your device. You can erase it at any time via “Reset
        game” in the in-game settings, or by uninstalling the app.
      </p>

      <h2 style={h2}>6. Changes</h2>
      <p>
        This policy may be updated; the date at the top of the page indicates the
        latest version.
      </p>

      <h2 style={h2}>7. Contact</h2>
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
