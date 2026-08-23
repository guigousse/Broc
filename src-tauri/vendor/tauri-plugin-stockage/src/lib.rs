pub mod error;
pub mod fichiers;
pub mod models;

mod commands;

// Seule `espace_libre` a besoin de code natif : le split mobile/desktop
// (identique dans l'esprit à tauri-plugin-iap et tauri-plugin-firebase)
// ne porte donc QUE cette commande — lire_save/ecrire_save/partager_fichier
// restent des fonctions Rust directes dans commands.rs, inchangées.
#[cfg(target_os = "ios")]
mod mobile;
#[cfg(not(target_os = "ios"))]
mod desktop;

#[cfg(target_os = "ios")]
use mobile::Stockage;
#[cfg(not(target_os = "ios"))]
use desktop::Stockage;

use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime};

pub use error::{Error, Result};
pub use models::Quoi;

/// Accès à l'état géré du plugin (le pont vers le Swift iOS, ou son
/// équivalent no-op ailleurs) depuis les commandes.
pub(crate) trait StockageExt<R: Runtime> {
    fn stockage(&self) -> &Stockage<R>;
}

impl<R: Runtime, T: Manager<R>> StockageExt<R> for T {
    fn stockage(&self) -> &Stockage<R> {
        self.state::<Stockage<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("stockage")
        .invoke_handler(tauri::generate_handler![
            commands::lire_save,
            commands::ecrire_save,
            commands::espace_libre,
            commands::partager_fichier
        ])
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            let stockage = mobile::init(app, api)?;
            #[cfg(not(target_os = "ios"))]
            let stockage = desktop::init(app, api)?;
            app.manage(stockage);
            Ok(())
        })
        .build()
}
