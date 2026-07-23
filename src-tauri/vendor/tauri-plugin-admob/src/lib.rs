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
use mobile::Admob;
#[cfg(not(target_os = "ios"))]
use desktop::Admob;

pub use error::{Error, Result};
pub use models::AdResult;

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
            commands::show_rewarded_ad
        ])
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            let admob = mobile::init(app, api)?;
            #[cfg(not(target_os = "ios"))]
            let admob = desktop::init(app, api)?;
            app.manage(admob);
            Ok(())
        })
        .build()
}
