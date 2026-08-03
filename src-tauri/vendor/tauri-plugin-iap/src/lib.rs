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
use mobile::Iap;
#[cfg(not(target_os = "ios"))]
use desktop::Iap;

pub use error::{Error, Result};
pub use models::{AchatResult, EntitlementResult, PrixResult};

pub trait IapExt<R: Runtime> {
    fn iap(&self) -> &Iap<R>;
}

impl<R: Runtime, T: Manager<R>> IapExt<R> for T {
    fn iap(&self) -> &Iap<R> {
        self.state::<Iap<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("iap")
        .invoke_handler(tauri::generate_handler![
            commands::verifier_entitlement,
            commands::obtenir_prix,
            commands::acheter,
            commands::restaurer
        ])
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            let iap = mobile::init(app, api)?;
            #[cfg(not(target_os = "ios"))]
            let iap = desktop::init(app, api)?;
            app.manage(iap);
            Ok(())
        })
        .build()
}
