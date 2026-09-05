use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod error;
mod models;

#[cfg(mobile)]
mod mobile;
#[cfg(desktop)]
mod desktop;

#[cfg(mobile)]
use mobile::Admob;
#[cfg(desktop)]
use desktop::Admob;

pub use error::{Error, Result};
pub use models::{AdResult, OptionsConfidentialite};

/// Accès à l'état du plugin depuis les commandes.
pub trait AdmobExt<R: Runtime> {
    fn admob(&self) -> &Admob<R>;
}

impl<R: Runtime, T: Manager<R>> AdmobExt<R> for T {
    fn admob(&self) -> &Admob<R> {
        self.state::<Admob<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("admob")
        .invoke_handler(tauri::generate_handler![
            commands::initialize,
            commands::show_rewarded_ad,
            commands::privacy_options_required,
            commands::show_privacy_options
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            let admob = mobile::init(app, api)?;
            #[cfg(desktop)]
            let admob = desktop::init(app, api)?;
            app.manage(admob);
            Ok(())
        })
        .build()
}
