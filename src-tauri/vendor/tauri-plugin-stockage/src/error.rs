use serde::{ser::SerializeStruct, Serialize, Serializer};

pub type Result<T> = std::result::Result<T, Error>;

const ENOSPC: i32 = 28;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Disque plein")]
    DisquePlein,
    #[error("{0}")]
    Io(String),
    #[error("Indisponible sur cette plateforme")]
    Indisponible,
    // Échec de l'appel au plugin Swift (côté iOS uniquement) : plugin non
    // enregistré, réponse mal formée. Rangé sous le même genre "io" que les
    // erreurs de fichier — la couche TS n'a qu'un seul contrat à lire (cf.
    // commentaire de `Serialize` ci-dessous) et n'a pas besoin de distinguer
    // un fichier illisible d'un pont natif en panne.
    #[cfg(target_os = "ios")]
    #[error(transparent)]
    PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        if e.raw_os_error() == Some(ENOSPC) {
            Error::DisquePlein
        } else {
            Error::Io(e.to_string())
        }
    }
}

/// Sérialisée en objet discriminé — et non en chaîne comme `tauri-plugin-iap` —
/// parce que la couche TS doit brancher sur la cause, et que matcher un message
/// texte serait fragile en quatre langues.
impl Serialize for Error {
    fn serialize<S: Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        let genre = match self {
            Error::DisquePlein => "disque_plein",
            Error::Io(_) => "io",
            Error::Indisponible => "indisponible",
            #[cfg(target_os = "ios")]
            Error::PluginInvoke(_) => "io",
        };
        let mut st = s.serialize_struct("Error", 2)?;
        st.serialize_field("genre", genre)?;
        st.serialize_field("message", &self.to_string())?;
        st.end()
    }
}
