use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[cfg(target_os = "ios")]
    #[error(transparent)]
    PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
    #[error("Achats indisponibles sur cette plateforme")]
    UnsupportedPlatform,
}

impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
