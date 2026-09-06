use tauri::{command, AppHandle, Runtime};

use crate::{
    models::{AdResult, OptionsConfidentialite},
    AdmobExt, Result,
};

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

/// Vrai quand UMP exige un point d'entrée « options de confidentialité ».
#[command]
pub(crate) async fn privacy_options_required<R: Runtime>(
    app: AppHandle<R>,
) -> Result<OptionsConfidentialite> {
    app.admob().privacy_options_required()
}

/// Rouvre le formulaire de consentement UMP (options de confidentialité).
#[command]
pub(crate) async fn show_privacy_options<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.admob().show_privacy_options()
}
