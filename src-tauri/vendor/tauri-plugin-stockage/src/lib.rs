pub mod error;
pub mod fichiers;
pub mod models;

mod commands;

// `espace_libre` (Tâche 9), `partager_fichier` et `partage_disponible`
// (Tâche 10) varient par plateforme : le split mobile/desktop (identique
// dans l'esprit à tauri-plugin-iap et tauri-plugin-firebase) porte ces trois
// commandes — lire_save/ecrire_save restent des fonctions Rust directes
// dans commands.rs, inchangées. Seuls `espace_libre` et `partager_fichier`
// font un round-trip natif vers le Swift ; `partage_disponible` est une
// constante par plateforme (cf. mobile.rs), pas un appel.
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
            commands::partager_fichier,
            commands::partage_disponible
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
