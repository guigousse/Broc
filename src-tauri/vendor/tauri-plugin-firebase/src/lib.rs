use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod error;
mod models;

#[cfg(target_os = "ios")]
mod mobile;
#[cfg(not(target_os = "ios"))]
mod desktop;

#[cfg(target_os = "ios")]
use mobile::Firebase;
#[cfg(not(target_os = "ios"))]
use desktop::Firebase;

pub use error::{Error, Result};
pub use models::Evenement;

/// Accès à l'état du plugin depuis les commandes.
pub trait FirebaseExt<R: Runtime> {
    fn firebase(&self) -> &Firebase<R>;
}

impl<R: Runtime, T: Manager<R>> FirebaseExt<R> for T {
    fn firebase(&self) -> &Firebase<R> {
        self.state::<Firebase<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("firebase")
        .invoke_handler(tauri::generate_handler![
            commands::initialize,
            commands::log_event,
            commands::set_user_property
        ])
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            let firebase = mobile::init(app, api)?;
            #[cfg(not(target_os = "ios"))]
            let firebase = desktop::init(app, api)?;
            app.manage(firebase);
            Ok(())
        })
        .build()
}
