import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Broc",
  description:
    "Données locales et service d’heure utilisé par Broc.",
};

const MAJ = "20 août 2026";
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
        Broc ne demande aucun compte ni inscription. Votre progression
        (argent, collection, réglages, sauvegarde) est enregistrée{" "}
        <strong>localement</strong> sur votre appareil (stockage local du
        système) et n’est jamais envoyée sur un serveur ni partagée : le
        contenu de votre sauvegarde ne quitte jamais votre appareil. Sur
        iPhone, ce stockage local est inclus dans la sauvegarde système de
        l’appareil (iCloud ou ordinateur) : il s’agit d’un mécanisme
        d’Apple, propre au système, pas d’un envoi par le jeu. Deux
        fonctionnalités facultatives impliquent néanmoins une collecte de
        données par Google : les publicités (voir section 4, « Publicités »)
        et la mesure d’audience du jeu (voir section 5, « Mesure
        d’audience »), toutes deux conditionnées par le formulaire de
        consentement présenté au premier lancement.
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

      <h2 style={h2}>3. Ressources intégrées</h2>
      <p>
        Les polices, images et sons sont intégrés à l’application, sans
        chargement distant. L’application ne contient aucun bouton de réseau
        social. Le seul outil de mesure utilisé par Broc, Firebase Analytics,
        est décrit à la section 5, « Mesure d’audience ». Broc reste jouable
        hors ligne (hors visionnage de publicités et interrogation du service
        d’heure) ; si le service d’heure est indisponible, l’application
        utilise l’horloge de l’appareil.
      </p>

      <h2 style={h2}>4. Achats intégrés et publicités</h2>
      <p>
        <strong>Achat intégré.</strong> L’application propose un achat intégré
        unique et facultatif (« Énergie infinie »). Le paiement est traité
        exclusivement par Apple via l’App Store : Broc n’accède à aucune donnée
        bancaire et ne collecte aucune information de paiement. Le déblocage est
        enregistré localement sur votre appareil et reste associé à votre compte
        Apple, ce qui permet de le restaurer (« Restaurer les achats » dans les
        réglages) après une réinstallation ou un changement d’appareil. Les
        remboursements sont gérés par Apple selon ses conditions.
      </p>
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

      <h2 style={h2}>5. Mesure d’audience</h2>
      <p>
        Pour comprendre comment le jeu est joué et l’améliorer, Broc utilise
        Firebase Analytics, un service de Google. Cette mesure collecte des
        événements de jeu (progression, écrans consultés, publicités
        regardées), l’identifiant d’installation attribué par Firebase, le
        modèle de votre appareil, la version de son système d’exploitation et
        votre pays. Elle ne collecte ni votre nom, ni votre adresse e-mail, ni
        aucun identifiant de compte, ni le contenu de votre sauvegarde. Ces
        données sont conservées 14 mois. Comme pour les publicités (section
        4), la collecte est conditionnée au formulaire de consentement (RGPD)
        présenté au premier lancement : si vous le refusez, aucune donnée de
        mesure d’audience n’est envoyée, et cela ne retire rien au jeu. Pour en
        savoir plus sur les pratiques de Google en la matière, consultez la{" "}
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

      <h2 style={h2}>6. Enfants</h2>
      <p>
        Broc ne demande ni compte, ni nom, ni adresse électronique. Les
        publicités décrites à la section 4 et la mesure d’audience décrite à
        la section 5, toutes deux fournies par Google, sont soumises au même
        formulaire de consentement pour tous les joueurs, quel que soit leur
        âge déclaré.
      </p>

      <h2 style={h2}>7. Suppression de vos données</h2>
      <p>
        Toutes les données sont sur votre appareil. Vous pouvez les effacer à
        tout moment via « Réinitialiser la partie » dans les réglages du jeu, ou
        en désinstallant l’application.
      </p>

      <h2 style={h2}>8. Modifications</h2>
      <p>
        Cette politique pourra être mise à jour ; la date en haut de page
        indique la dernière version.
      </p>

      <h2 style={h2}>9. Contact</h2>
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
        Broc requires no account or sign-up. Your progress (money, collection,
        settings, save file) is stored <strong>locally</strong> on your device
        (system local storage) and is never uploaded to a server or shared:
        the contents of your save file never leave your device. On iPhone,
        this local storage is included in the device’s system backup
        (iCloud or computer): this is an Apple mechanism specific to the
        system, not something the game itself sends anywhere. Two optional
        features nevertheless involve data collection by Google: advertising
        (see section 4, “Advertising”) and game analytics (see section 5,
        “Analytics”), both conditioned on the consent form shown on first
        launch.
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

      <h2 style={h2}>3. Bundled resources</h2>
      <p>
        Fonts, images and sounds are bundled with the app, with no remote
        loading. The app contains no social-media widget. The only
        measurement tool Broc uses, Firebase Analytics, is described in
        section 5, “Analytics.” Broc remains playable offline (except for
        watching ads or querying the time service); if the time service is
        unavailable, the app falls back to the device clock.
      </p>

      <h2 style={h2}>4. In-app purchases and advertising</h2>
      <p>
        <strong>In-app purchase.</strong> The app offers a single, optional
        in-app purchase (“Unlimited energy”). Payment is processed exclusively
        by Apple through the App Store: Broc never accesses any banking data and
        collects no payment information. The unlock is stored locally on your
        device and remains linked to your Apple account, so it can be restored
        (“Restore purchases” in the settings) after reinstalling the app or
        switching devices. Refunds are handled by Apple under its terms.
      </p>
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

      <h2 style={h2}>5. Analytics</h2>
      <p>
        To understand how the game is played and to improve it, Broc uses
        Firebase Analytics, a Google service. This measurement collects
        gameplay events (progression, screens visited, ads watched), the
        installation identifier assigned by Firebase, your device model, its
        OS version, and your country. It does not collect your name, your
        email address, any account identifier, or the contents of your save
        file. This data is retained for 14 months. As with advertising
        (section 4), collection is conditioned on the consent form (GDPR)
        shown on first launch: if you decline it, no analytics data is sent,
        and nothing is taken away from the game. For details on Google’s
        practices in this area, see{" "}
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

      <h2 style={h2}>6. Children</h2>
      <p>
        Broc asks for no account, name or email address. The ads described in
        section 4 and the analytics described in section 5, both provided by
        Google, are subject to the same consent form for every player,
        regardless of any stated age.
      </p>

      <h2 style={h2}>7. Deleting your data</h2>
      <p>
        All data lives on your device. You can erase it at any time via “Reset
        game” in the in-game settings, or by uninstalling the app.
      </p>

      <h2 style={h2}>8. Changes</h2>
      <p>
        This policy may be updated; the date at the top of the page indicates the
        latest version.
      </p>

      <h2 style={h2}>9. Contact</h2>
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
        Broc no requiere cuenta ni registro. Tu progreso (dinero, colección,
        ajustes, partida guardada) se almacena <strong>localmente</strong> en
        tu dispositivo (almacenamiento local del sistema) y nunca se envía a
        un servidor ni se comparte: el contenido de tu partida guardada nunca
        sale de tu dispositivo. En iPhone, este almacenamiento local se
        incluye en la copia de seguridad del sistema del dispositivo (iCloud
        u ordenador): es un mecanismo propio de Apple, del sistema, no un
        envío por parte del juego. Dos funciones opcionales implican no
        obstante una recopilación de datos por parte de Google: la publicidad
        (ver
        sección 4, «Publicidad») y la medición de audiencia del juego (ver
        sección 5, «Medición de audiencia»), ambas condicionadas al
        formulario de consentimiento mostrado en el primer arranque.
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

      <h2 style={h2}>3. Recursos integrados</h2>
      <p>
        Las fuentes, imágenes y sonidos están integrados en la aplicación, sin
        carga remota. La aplicación no contiene ningún botón de redes
        sociales. La única herramienta de medición que utiliza Broc, Firebase
        Analytics, se describe en la sección 5, «Medición de audiencia». Broc
        se puede jugar sin conexión (salvo el visionado de anuncios y la
        consulta del servicio de hora); si el servicio de hora no está
        disponible, la aplicación utiliza el reloj del dispositivo.
      </p>

      <h2 style={h2}>4. Compras integradas y publicidad</h2>
      <p>
        <strong>Compra integrada.</strong> La aplicación ofrece una única compra
        integrada opcional («Energía infinita»). El pago lo procesa
        exclusivamente Apple a través del App Store: Broc no accede a ningún
        dato bancario ni recopila información de pago. El desbloqueo se guarda
        localmente en tu dispositivo y queda vinculado a tu cuenta de Apple, lo
        que permite restaurarlo («Restaurar compras» en los ajustes) tras
        reinstalar la aplicación o cambiar de dispositivo. Los reembolsos los
        gestiona Apple según sus condiciones.
      </p>
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

      <h2 style={h2}>5. Medición de audiencia</h2>
      <p>
        Para entender cómo se juega y mejorarlo, Broc utiliza Firebase
        Analytics, un servicio de Google. Esta medición recopila eventos de
        juego (progreso, pantallas visitadas, anuncios vistos), el
        identificador de instalación asignado por Firebase, el modelo de tu
        dispositivo, la versión de su sistema operativo y tu país. No
        recopila tu nombre, tu dirección de correo electrónico, ningún
        identificador de cuenta, ni el contenido de tu partida guardada.
        Estos datos se conservan durante 14 meses. Al igual que con la
        publicidad (sección 4), la recopilación está condicionada al
        formulario de consentimiento (RGPD) mostrado en el primer arranque:
        si lo rechazas, no se envía ningún dato de medición de audiencia, y
        esto no te quita nada en el juego. Para más información sobre las
        prácticas de Google en la materia, consulta la{" "}
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

      <h2 style={h2}>6. Menores</h2>
      <p>
        Broc no pide cuenta, nombre ni dirección de correo electrónico. Los
        anuncios descritos en la sección 4 y la medición de audiencia
        descrita en la sección 5 —ambos proporcionados por Google— están
        sujetos al mismo formulario de consentimiento para todos los
        jugadores, sea cual sea la edad declarada.
      </p>

      <h2 style={h2}>7. Eliminación de tus datos</h2>
      <p>
        Todos los datos están en tu dispositivo. Puedes borrarlos en cualquier
        momento mediante «Reiniciar la partida» en los ajustes del juego, o
        desinstalando la aplicación.
      </p>

      <h2 style={h2}>8. Modificaciones</h2>
      <p>
        Esta política puede actualizarse; la fecha en la parte superior de la
        página indica la última versión.
      </p>

      <h2 style={h2}>9. Contacto</h2>
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
        Το Broc δεν απαιτεί λογαριασμό ή εγγραφή. Η πρόοδός σας (χρήματα,
        συλλογή, ρυθμίσεις, αποθηκευμένο παιχνίδι) αποθηκεύεται{" "}
        <strong>τοπικά</strong> στη συσκευή σας (τοπικός χώρος αποθήκευσης
        του συστήματος) και δεν αποστέλλεται ποτέ σε διακομιστή ούτε
        κοινοποιείται: το περιεχόμενο του αποθηκευμένου παιχνιδιού σας δεν
        φεύγει ποτέ από τη συσκευή σας. Σε iPhone, αυτός ο τοπικός χώρος
        αποθήκευσης περιλαμβάνεται στο αντίγραφο ασφαλείας συστήματος της
        συσκευής (iCloud ή υπολογιστής): πρόκειται για μηχανισμό της Apple,
        δικό του συστήματος, όχι για αποστολή από το ίδιο το παιχνίδι. Δύο
        προαιρετικές λειτουργίες συνεπάγονται ωστόσο συλλογή δεδομένων από
        την Google: οι διαφημίσεις
        (βλ. ενότητα 4, «Διαφημίσεις») και η μέτρηση επισκεψιμότητας του
        παιχνιδιού (βλ. ενότητα 5, «Μέτρηση επισκεψιμότητας»), αμφότερες
        εξαρτώμενες από τη φόρμα συγκατάθεσης που εμφανίζεται κατά την πρώτη
        εκκίνηση.
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

      <h2 style={h2}>3. Ενσωματωμένοι πόροι</h2>
      <p>
        Οι γραμματοσειρές, οι εικόνες και οι ήχοι είναι ενσωματωμένοι στην
        εφαρμογή, χωρίς απομακρυσμένη φόρτωση. Η εφαρμογή δεν περιέχει κανένα
        κουμπί κοινωνικού δικτύου. Το μόνο εργαλείο μέτρησης που χρησιμοποιεί
        το Broc, το Firebase Analytics, περιγράφεται στην ενότητα 5, «Μέτρηση
        επισκεψιμότητας». Το Broc παίζεται και εκτός σύνδεσης (εκτός από την
        προβολή διαφημίσεων και το αίτημα προς την υπηρεσία ώρας)· εάν η
        υπηρεσία ώρας δεν είναι διαθέσιμη, η εφαρμογή χρησιμοποιεί το ρολόι
        της συσκευής.
      </p>

      <h2 style={h2}>4. Αγορές εντός εφαρμογής και διαφημίσεις</h2>
      <p>
        <strong>Αγορά εντός εφαρμογής.</strong> Η εφαρμογή προσφέρει μία
        μοναδική προαιρετική αγορά εντός εφαρμογής («Άπειρη ενέργεια»). Η
        πληρωμή διεκπεραιώνεται αποκλειστικά από την Apple μέσω του App Store:
        το Broc δεν έχει πρόσβαση σε τραπεζικά δεδομένα και δεν συλλέγει καμία
        πληροφορία πληρωμής. Το ξεκλείδωμα αποθηκεύεται τοπικά στη συσκευή σας
        και παραμένει συνδεδεμένο με τον λογαριασμό σας Apple, ώστε να μπορεί
        να επαναφερθεί («Επαναφορά αγορών» στις ρυθμίσεις) μετά από
        επανεγκατάσταση ή αλλαγή συσκευής. Οι επιστροφές χρημάτων
        διεκπεραιώνονται από την Apple σύμφωνα με τους όρους της.
      </p>
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

      <h2 style={h2}>5. Μέτρηση επισκεψιμότητας</h2>
      <p>
        Για να κατανοήσει πώς παίζεται το παιχνίδι και να το βελτιώσει, το
        Broc χρησιμοποιεί το Firebase Analytics, μια υπηρεσία της Google. Αυτή
        η μέτρηση συλλέγει συμβάντα παιχνιδιού (πρόοδος, οθόνες που
        επισκεφθήκατε, διαφημίσεις που παρακολουθήσατε), το αναγνωριστικό
        εγκατάστασης που αποδίδεται από το Firebase, το μοντέλο της συσκευής
        σας, την έκδοση του λειτουργικού συστήματός της και τη χώρα σας. Δεν
        συλλέγει το όνομά σας, τη διεύθυνση ηλεκτρονικού ταχυδρομείου σας,
        κανένα αναγνωριστικό λογαριασμού, ούτε το περιεχόμενο του
        αποθηκευμένου παιχνιδιού σας. Αυτά τα δεδομένα διατηρούνται για 14
        μήνες. Όπως και με τις διαφημίσεις (ενότητα 4), η συλλογή εξαρτάται
        από τη φόρμα συγκατάθεσης (ΓΚΠΔ) που εμφανίζεται κατά την πρώτη
        εκκίνηση: αν την απορρίψετε, δεν αποστέλλεται κανένα δεδομένο μέτρησης
        επισκεψιμότητας, και αυτό δεν αφαιρεί τίποτα από το παιχνίδι. Για
        περισσότερες πληροφορίες σχετικά με τις πρακτικές της Google,
        συμβουλευτείτε την{" "}
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

      <h2 style={h2}>6. Παιδιά</h2>
      <p>
        Το Broc δεν ζητά λογαριασμό, όνομα ή διεύθυνση ηλεκτρονικού
        ταχυδρομείου. Οι διαφημίσεις που περιγράφονται στην ενότητα 4 και η
        μέτρηση επισκεψιμότητας που περιγράφεται στην ενότητα 5, αμφότερες
        παρεχόμενες από την Google, υπόκεινται στην ίδια φόρμα συγκατάθεσης
        για όλους τους παίκτες, ανεξαρτήτως δηλωμένης ηλικίας.
      </p>

      <h2 style={h2}>7. Διαγραφή των δεδομένων σας</h2>
      <p>
        Όλα τα δεδομένα βρίσκονται στη συσκευή σας. Μπορείτε να τα διαγράψετε
        ανά πάσα στιγμή μέσω της επιλογής «Επαναφορά παιχνιδιού» στις ρυθμίσεις
        του παιχνιδιού, ή απεγκαθιστώντας την εφαρμογή.
      </p>

      <h2 style={h2}>8. Τροποποιήσεις</h2>
      <p>
        Αυτή η πολιτική ενδέχεται να ενημερωθεί· η ημερομηνία στην κορυφή της
        σελίδας υποδεικνύει την τελευταία έκδοση.
      </p>

      <h2 style={h2}>9. Επικοινωνία</h2>
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
