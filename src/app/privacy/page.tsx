import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Broc",
  description:
    "Données locales et service d’heure utilisé par Broc.",
};

const MAJ = "23 juillet 2026";
const CONTACT = "pepite.admin@gmail.com";
const EDITEUR = "Guillaume Fenard";

export default function PrivacyPage() {
  return (
    <main
      style={{
        // Body verrouillé (globals.css) : la page scrolle elle-même.
        height: "100dvh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
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
        Broc ne demande aucun compte ni inscription et ne collecte directement
        aucune donnée personnelle. Votre progression (argent, collection,
        réglages, sauvegarde) est enregistrée <strong>localement</strong> sur
        votre appareil (stockage local du système) et n’est jamais envoyée sur
        un serveur ni partagée. Seules les publicités facultatives (voir
        section 4, « Publicités ») impliquent une collecte de données par
        Google AdMob.
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

      <h2 style={h2}>3. Aucun suivi analytique</h2>
      <p>
        L’application ne contient aucun outil de mesure d’audience ni aucun
        bouton de réseau social. Les polices, images et sons sont intégrés à
        l’application. Broc reste jouable hors ligne (hors visionnage de
        publicités et interrogation du service d’heure) ; si le service d’heure
        est indisponible, l’application utilise l’horloge de l’appareil.
      </p>

      <h2 style={h2}>4. Achats intégrés et publicités</h2>
      <p>Cette version de l’application ne propose aucun achat intégré.</p>
      <p>
        <strong>Publicités.</strong> L’application affiche des publicités
        récompensées, uniquement lorsque vous choisissez d’en regarder une pour
        obtenir un bonus en jeu. Elles sont fournies par Google AdMob. À cette
        fin, Google peut collecter des identifiants d’appareil (dont
        l’identifiant publicitaire, avec votre accord via la popup iOS
        « Autoriser l’app à suivre vos activités ? »), votre adresse IP et des
        données de diagnostic publicitaire. Au premier lancement, un formulaire
        de consentement (RGPD) vous permet d’accepter ou de refuser les
        publicités personnalisées ; en cas de refus, des publicités non
        personnalisées sont affichées. Ce choix n’est pas modifiable
        directement en jeu à ce jour ; pour le retirer, supprimez puis
        réinstallez l’application (le formulaire de consentement sera
        représenté au premier lancement). Les publicités restent dans tous
        les cas facultatives et à votre seule initiative. Pour en savoir plus
        sur les pratiques de Google en la matière, consultez la{" "}
        <a
          href="https://policies.google.com/privacy"
          style={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          politique de confidentialité de Google
        </a>
        .
      </p>

      <h2 style={h2}>5. Enfants</h2>
      <p>
        Broc ne demande ni compte, ni nom, ni adresse électronique. Les
        publicités décrites à la section 4, fournies par Google AdMob, sont
        soumises au même formulaire de consentement pour tous les joueurs, quel
        que soit leur âge déclaré.
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
        Broc requires no account or sign-up and does not directly collect any
        personal data. Your progress (money, collection, settings, save file)
        is stored <strong>locally</strong> on your device (system local
        storage) and is never uploaded to a server or shared. Only the
        optional ads (see section 4, “Advertising”) involve data collection by
        Google AdMob.
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

      <h2 style={h2}>3. No analytics tracking</h2>
      <p>
        The app contains no analytics tool and no social-media widget. Fonts,
        images and sounds are bundled with the app. Broc remains playable
        offline (except for watching ads or querying the time service); if the
        time service is unavailable, the app falls back to the device clock.
      </p>

      <h2 style={h2}>4. In-app purchases and advertising</h2>
      <p>This version has no in-app purchases.</p>
      <p>
        <strong>Advertising.</strong> The app displays rewarded ads, only when
        you choose to watch one for an in-game bonus. They are provided by
        Google AdMob. For this purpose, Google may collect device identifiers
        (including the advertising identifier, with your consent via the iOS
        “Allow app to track your activity?” prompt), your IP address, and
        advertising diagnostic data. On first launch, a consent form (GDPR)
        lets you accept or decline personalized ads; if declined,
        non-personalized ads are shown instead. This choice cannot currently
        be changed directly in the app; to withdraw it, delete and reinstall
        the app (the consent form will be shown again on first launch). Ads
        remain optional either way and only ever play at your own request.
        For details on Google’s practices in this area, see{" "}
        <a
          href="https://policies.google.com/privacy"
          style={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          Google’s privacy policy
        </a>
        .
      </p>

      <h2 style={h2}>5. Children</h2>
      <p>
        Broc asks for no account, name or email address. The ads described in
        section 4, provided by Google AdMob, are subject to the same consent
        form for every player, regardless of any stated age.
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

      <hr style={{ margin: "56px 0", border: "none", borderTop: "1px solid #cdbf9a" }} />

      {/* ====================== ESPAÑOL ====================== */}
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 30, marginBottom: 4 }}>
        Política de privacidad
      </h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Broc — última actualización: {MAJ}</p>

      <p>
        <strong>En resumen: tu progreso permanece en tu dispositivo.</strong> El
        juego realiza no obstante una petición de red limitada a un servicio de
        hora, descrita a continuación.
      </p>

      <h2 style={h2}>1. Datos tratados</h2>
      <p>
        Broc no requiere cuenta ni registro y no recopila directamente ningún
        dato personal. Tu progreso (dinero, colección, ajustes, partida
        guardada) se almacena <strong>localmente</strong> en tu dispositivo
        (almacenamiento local del sistema) y nunca se envía a un servidor ni se
        comparte. Solo los anuncios opcionales (ver sección 4, «Publicidad»)
        implican una recopilación de datos por parte de Google AdMob.
      </p>

      <h2 style={h2}>2. Servicio de hora</h2>
      <p>
        Para limitar la manipulación del reloj del dispositivo y calcular
        ciertos plazos del juego, Broc consulta el servicio de terceros{" "}
        <strong>timeapi.io</strong>. La petición solicita únicamente la hora
        UTC: Broc no envía ninguna partida guardada, ningún identificador de
        jugador ni información sobre tu progreso. Como en cualquier conexión a
        Internet, el proveedor del servicio puede no obstante recibir datos
        técnicos como tu dirección IP, la fecha de la petición e información de
        red.
      </p>

      <h2 style={h2}>3. Sin seguimiento analítico</h2>
      <p>
        La aplicación no contiene ninguna herramienta de medición de audiencia
        ni botones de redes sociales. Las fuentes, imágenes y sonidos están
        integrados en la aplicación. Broc se puede jugar sin conexión (salvo el
        visionado de anuncios y la consulta del servicio de hora); si el
        servicio de hora no está disponible, la aplicación utiliza el reloj del
        dispositivo.
      </p>

      <h2 style={h2}>4. Compras integradas y publicidad</h2>
      <p>Esta versión de la aplicación no ofrece ninguna compra integrada.</p>
      <p>
        <strong>Publicidad.</strong> La aplicación muestra anuncios
        recompensados, únicamente cuando eliges ver uno para obtener una
        bonificación en el juego. Los proporciona Google AdMob. Para ello,
        Google puede recopilar identificadores del dispositivo (incluido el
        identificador publicitario, con tu consentimiento mediante el aviso de
        iOS «¿Permitir que la app rastree tu actividad?»), tu dirección IP y
        datos de diagnóstico publicitario. En el primer arranque, un formulario
        de consentimiento (RGPD) te permite aceptar o rechazar los anuncios
        personalizados; en caso de rechazo, se muestran anuncios no
        personalizados. Esta elección no puede modificarse directamente en el
        juego por ahora; para retirarla, elimina y vuelve a instalar la
        aplicación (el formulario de consentimiento se mostrará de nuevo en el
        primer arranque). Los anuncios son en todo caso opcionales y solo se
        reproducen a petición tuya. Para más información sobre las prácticas de
        Google en la materia, consulta la{" "}
        <a
          href="https://policies.google.com/privacy"
          style={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          política de privacidad de Google
        </a>
        .
      </p>

      <h2 style={h2}>5. Menores</h2>
      <p>
        Broc no pide cuenta, nombre ni dirección de correo electrónico. Los
        anuncios descritos en la sección 4, proporcionados por Google AdMob,
        están sujetos al mismo formulario de consentimiento para todos los
        jugadores, sea cual sea la edad declarada.
      </p>

      <h2 style={h2}>6. Eliminación de tus datos</h2>
      <p>
        Todos los datos están en tu dispositivo. Puedes borrarlos en cualquier
        momento mediante «Reiniciar la partida» en los ajustes del juego, o
        desinstalando la aplicación.
      </p>

      <h2 style={h2}>7. Modificaciones</h2>
      <p>
        Esta política puede actualizarse; la fecha en la parte superior de la
        página indica la última versión.
      </p>

      <h2 style={h2}>8. Contacto</h2>
      <p>
        Editor: {EDITEUR}. Para cualquier pregunta:{" "}
        <a href={`mailto:${CONTACT}`} style={link}>
          {CONTACT}
        </a>
        .
      </p>

      <hr style={{ margin: "56px 0", border: "none", borderTop: "1px solid #cdbf9a" }} />

      {/* ====================== ΕΛΛΗΝΙΚΑ ====================== */}
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 30, marginBottom: 4 }}>
        Πολιτική απορρήτου
      </h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Broc — τελευταία ενημέρωση: {MAJ}</p>

      <p>
        <strong>Εν συντομία: η πρόοδός σας παραμένει στη συσκευή σας.</strong>{" "}
        Το παιχνίδι πραγματοποιεί ωστόσο ένα περιορισμένο αίτημα δικτύου προς
        μια υπηρεσία ώρας, όπως περιγράφεται παρακάτω.
      </p>

      <h2 style={h2}>1. Δεδομένα που επεξεργαζόμαστε</h2>
      <p>
        Το Broc δεν απαιτεί λογαριασμό ή εγγραφή και δεν συλλέγει άμεσα κανένα
        προσωπικό δεδομένο. Η πρόοδός σας (χρήματα, συλλογή, ρυθμίσεις,
        αποθηκευμένο παιχνίδι) αποθηκεύεται <strong>τοπικά</strong> στη συσκευή
        σας (τοπικός χώρος αποθήκευσης του συστήματος) και δεν αποστέλλεται
        ποτέ σε διακομιστή ούτε κοινοποιείται. Μόνο οι προαιρετικές διαφημίσεις
        (βλ. ενότητα 4, «Διαφημίσεις») συνεπάγονται συλλογή δεδομένων από την
        Google AdMob.
      </p>

      <h2 style={h2}>2. Υπηρεσία ώρας</h2>
      <p>
        Για να περιοριστεί η χειραγώγηση του ρολογιού της συσκευής και να
        υπολογιστούν ορισμένες προθεσμίες του παιχνιδιού, το Broc συμβουλεύεται
        την υπηρεσία τρίτων <strong>timeapi.io</strong>. Το αίτημα ζητά μόνο
        την ώρα UTC: το Broc δεν αποστέλλει κανένα αποθηκευμένο παιχνίδι,
        κανένα αναγνωριστικό παίκτη και καμία πληροφορία για την πρόοδό σας.
        Όπως σε κάθε σύνδεση στο Διαδίκτυο, ο πάροχος της υπηρεσίας ενδέχεται
        ωστόσο να λάβει τεχνικά δεδομένα όπως τη διεύθυνση IP σας, την
        ημερομηνία του αιτήματος και πληροφορίες δικτύου.
      </p>

      <h2 style={h2}>3. Χωρίς αναλυτική παρακολούθηση</h2>
      <p>
        Η εφαρμογή δεν περιέχει κανένα εργαλείο μέτρησης επισκεψιμότητας ούτε
        κουμπιά κοινωνικών δικτύων. Οι γραμματοσειρές, οι εικόνες και οι ήχοι
        είναι ενσωματωμένοι στην εφαρμογή. Το Broc παίζεται και εκτός σύνδεσης
        (εκτός από την προβολή διαφημίσεων και το αίτημα προς την υπηρεσία
        ώρας)· εάν η υπηρεσία ώρας δεν είναι διαθέσιμη, η εφαρμογή
        χρησιμοποιεί το ρολόι της συσκευής.
      </p>

      <h2 style={h2}>4. Αγορές εντός εφαρμογής και διαφημίσεις</h2>
      <p>Αυτή η έκδοση της εφαρμογής δεν προσφέρει καμία αγορά εντός εφαρμογής.</p>
      <p>
        <strong>Διαφημίσεις.</strong> Η εφαρμογή εμφανίζει διαφημίσεις με
        επιβράβευση, μόνο όταν επιλέγετε να παρακολουθήσετε μία για να λάβετε
        ένα μπόνους στο παιχνίδι. Παρέχονται από την Google AdMob. Για τον
        σκοπό αυτό, η Google ενδέχεται να συλλέξει αναγνωριστικά συσκευής
        (συμπεριλαμβανομένου του διαφημιστικού αναγνωριστικού, με τη
        συγκατάθεσή σας μέσω του μηνύματος iOS «Να επιτρέπεται στην εφαρμογή
        να παρακολουθεί τη δραστηριότητά σας;»), τη διεύθυνση IP σας και
        διαγνωστικά δεδομένα διαφήμισης. Κατά την πρώτη εκκίνηση, μια φόρμα
        συγκατάθεσης (ΓΚΠΔ) σάς επιτρέπει να αποδεχθείτε ή να απορρίψετε τις
        εξατομικευμένες διαφημίσεις· σε περίπτωση άρνησης, εμφανίζονται μη
        εξατομικευμένες διαφημίσεις. Αυτή η επιλογή δεν μπορεί προς το παρόν
        να τροποποιηθεί απευθείας μέσα στο παιχνίδι· για να την αποσύρετε,
        διαγράψτε και επανεγκαταστήστε την εφαρμογή (η φόρμα συγκατάθεσης θα
        εμφανιστεί ξανά κατά την πρώτη εκκίνηση). Οι διαφημίσεις παραμένουν
        σε κάθε περίπτωση προαιρετικές και προβάλλονται μόνο με δική σας
        πρωτοβουλία. Για περισσότερες πληροφορίες σχετικά με τις πρακτικές της
        Google, συμβουλευτείτε την{" "}
        <a
          href="https://policies.google.com/privacy"
          style={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          πολιτική απορρήτου της Google
        </a>
        .
      </p>

      <h2 style={h2}>5. Παιδιά</h2>
      <p>
        Το Broc δεν ζητά λογαριασμό, όνομα ή διεύθυνση ηλεκτρονικού
        ταχυδρομείου. Οι διαφημίσεις που περιγράφονται στην ενότητα 4,
        παρεχόμενες από την Google AdMob, υπόκεινται στην ίδια φόρμα
        συγκατάθεσης για όλους τους παίκτες, ανεξαρτήτως δηλωμένης ηλικίας.
      </p>

      <h2 style={h2}>6. Διαγραφή των δεδομένων σας</h2>
      <p>
        Όλα τα δεδομένα βρίσκονται στη συσκευή σας. Μπορείτε να τα διαγράψετε
        ανά πάσα στιγμή μέσω της επιλογής «Επαναφορά παιχνιδιού» στις ρυθμίσεις
        του παιχνιδιού, ή απεγκαθιστώντας την εφαρμογή.
      </p>

      <h2 style={h2}>7. Τροποποιήσεις</h2>
      <p>
        Αυτή η πολιτική ενδέχεται να ενημερωθεί· η ημερομηνία στην κορυφή της
        σελίδας υποδεικνύει την τελευταία έκδοση.
      </p>

      <h2 style={h2}>8. Επικοινωνία</h2>
      <p>
        Εκδότης: {EDITEUR}. Για κάθε ερώτηση:{" "}
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
