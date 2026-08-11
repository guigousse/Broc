use tauri::{command, AppHandle, Runtime};

use crate::{models::AdResult, AdmobExt, Result};

#[command]
pub(crate) async fn initialize<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.admob().initialize()
}

/// `emplacement` identifie l'écran appelant (cf. EMPLACEMENTS_PUB côté web) :
/// le natif en déduit le bloc AdMob à charger.
#[command]
pub(crate) async fn show_rewarded_ad<R: Runtime>(
    app: AppHandle<R>,
    emplacement: String,
) -> Result<AdResult> {
    app.admob().show_rewarded_ad(emplacement)
}
