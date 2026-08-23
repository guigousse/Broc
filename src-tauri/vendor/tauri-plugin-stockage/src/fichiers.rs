use crate::error::Result;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

/// Écrit `contenu` dans `repertoire/nom` sans jamais laisser le fichier cible
/// à moitié écrit : tmp → sync_all → rename → fsync du répertoire.
pub fn ecrire_atomique(repertoire: &Path, nom: &str, contenu: &str) -> Result<()> {
    fs::create_dir_all(repertoire)?;
    let cible = repertoire.join(nom);
    let tmp = repertoire.join(format!("{nom}.tmp"));

    {
        let mut f = File::create(&tmp)?;
        f.write_all(contenu.as_bytes())?;
        // C'EST ICI que ENOSPC remonte : write_all est tamponné et peut réussir
        // alors que le disque est plein. sync_all force l'écriture réelle.
        f.sync_all()?;
    }

    fs::rename(&tmp, &cible)?;

    // Le renommage lui-même doit survivre à un kill : on synchronise le
    // répertoire. Best-effort — un échec ici ne compromet pas le contenu.
    if let Ok(d) = File::open(repertoire) {
        let _ = d.sync_all();
    }

    Ok(())
}

/// Rend `None` pour un fichier absent — un slot vide n'est pas une erreur.
pub fn lire(repertoire: &Path, nom: &str) -> Result<Option<String>> {
    match fs::read_to_string(repertoire.join(nom)) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn repertoire_neuf(cas: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!("broc-stockage-{cas}"));
        let _ = fs::remove_dir_all(&d);
        d
    }

    #[test]
    fn ce_qui_est_ecrit_se_relit() {
        let d = repertoire_neuf("relecture");
        ecrire_atomique(&d, "slot-1.json", "{\"jour\":34}").unwrap();
        assert_eq!(
            lire(&d, "slot-1.json").unwrap(),
            Some("{\"jour\":34}".to_string())
        );
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn un_fichier_absent_rend_none_et_non_une_erreur() {
        let d = repertoire_neuf("absent");
        fs::create_dir_all(&d).unwrap();
        assert_eq!(lire(&d, "slot-2.json").unwrap(), None);
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn l_ecriture_ne_laisse_aucun_tmp_derriere_elle() {
        let d = repertoire_neuf("sans-tmp");
        ecrire_atomique(&d, "slot-1.json", "a").unwrap();
        assert!(!d.join("slot-1.json.tmp").exists());
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn une_seconde_ecriture_remplace_la_premiere() {
        let d = repertoire_neuf("remplacement");
        ecrire_atomique(&d, "slot-1.json", "ancien").unwrap();
        ecrire_atomique(&d, "slot-1.json", "nouveau").unwrap();
        assert_eq!(lire(&d, "slot-1.json").unwrap(), Some("nouveau".to_string()));
        fs::remove_dir_all(&d).unwrap();
    }
}
