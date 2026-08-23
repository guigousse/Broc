pub mod error;
pub mod fichiers;
pub mod models;

mod commands;

use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

pub use error::{Error, Result};
pub use models::Quoi;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("stockage")
        .invoke_handler(tauri::generate_handler![
            commands::lire_save,
            commands::ecrire_save,
            commands::espace_libre,
            commands::partager_fichier
        ])
        .build()
}
