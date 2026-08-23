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
        };
        let mut st = s.serialize_struct("Error", 2)?;
        st.serialize_field("genre", genre)?;
        st.serialize_field("message", &self.to_string())?;
        st.end()
    }
}
