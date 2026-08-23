use crate::error::{Error, Result};
use crate::fichiers;
use crate::models::Quoi;
use tauri::{command, AppHandle, Manager, Runtime};

fn repertoire<R: Runtime>(app: &AppHandle<R>) -> Result<std::path::PathBuf> {
    app.path()
        .app_data_dir()
        .map_err(|e| Error::Io(e.to_string()))
}

#[command]
pub(crate) async fn lire_save<R: Runtime>(
    app: AppHandle<R>,
    quoi: Quoi,
) -> Result<Option<String>> {
    fichiers::lire(&repertoire(&app)?, quoi.nom_fichier())
}

#[command]
pub(crate) async fn ecrire_save<R: Runtime>(
    app: AppHandle<R>,
    quoi: Quoi,
    contenu: String,
) -> Result<()> {
    fichiers::ecrire_atomique(&repertoire(&app)?, quoi.nom_fichier(), &contenu)
}

// Souches : le Swift arrive aux tâches 10 et 11. `None` signifie « je ne sais
// pas », jamais un chiffre faux — un statvfs sous-estimerait l'espace en
// ignorant la place purgeable, et déclencherait l'avertissement à tort.
#[command]
pub(crate) async fn espace_libre<R: Runtime>(_app: AppHandle<R>) -> Result<Option<u64>> {
    Ok(None)
}

#[command]
pub(crate) async fn partager_fichier<R: Runtime>(
    _app: AppHandle<R>,
    _quoi: Quoi,
    _nom_lisible: String,
) -> Result<()> {
    Err(Error::Indisponible)
}
