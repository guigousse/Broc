use crate::error::Result;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};

/// Discriminant d'écriture, pour que deux écritures concurrentes n'utilisent
/// jamais le même fichier temporaire.
static COMPTEUR_ECRITURES: AtomicU64 = AtomicU64::new(0);

/// Nom de temporaire UNIQUE par écriture (revue finale I3).
///
/// Les commandes du plugin sont `async` et peuvent se chevaucher : cette
/// branche documente elle-même deux écritures concurrentes réelles (`pagehide`
/// et `visibilitychange→hidden` tous deux liés au flush dans GameContext, plus
/// le flush vitrine qui écrit un état DIFFÉRENT). Avec un nom déterministe,
/// deux écrivains font `File::create` sur le MÊME chemin — qui tronque —,
/// écrivent tous deux depuis l'offset 0, puis renomment : des charges utiles
/// de longueurs différentes laissent la queue de la plus longue derrière la
/// plus courte, et c'est ce JSON invalide qui atterrit sur le fichier faisant
/// autorité. Le `rename` est atomique contre un KILL, jamais contre un second
/// écrivain.
///
/// Pid + compteur monotone : suffisant, sans dépendance, et lisible dans un
/// conteneur qu'on inspecte à la main en recette.
fn nom_temporaire(nom: &str) -> String {
    let n = COMPTEUR_ECRITURES.fetch_add(1, Ordering::Relaxed);
    format!("{nom}.{}-{n}.tmp", std::process::id())
}

/// Écrit `contenu` dans `repertoire/nom` sans jamais laisser le fichier cible
/// à moitié écrit : tmp → sync_all → rename → fsync du répertoire.
pub fn ecrire_atomique(repertoire: &Path, nom: &str, contenu: &str) -> Result<()> {
    fs::create_dir_all(repertoire)?;
    let cible = repertoire.join(nom);
    let tmp = repertoire.join(nom_temporaire(nom));

    // Le temporaire portant désormais un nom unique, il n'est plus écrasé par
    // l'écriture suivante : c'est à CE code de ne rien laisser derrière lui en
    // cas d'échec. Sans ce ménage, un épisode de disque plein — où `sync_all`
    // échoue à chaque sauvegarde debouncée — joncherait de partiels le
    // stockage même que ce chantier cherche à désengorger. Seul un kill franc
    // entre la création et le renommage peut encore laisser un orphelin :
    // ~87 Ko, ignoré à la lecture, et le cas reste rare.
    let ecriture = (|| -> Result<()> {
        let mut f = File::create(&tmp)?;
        f.write_all(contenu.as_bytes())?;
        // C'EST ICI que ENOSPC remonte : write_all est tamponné et peut réussir
        // alors que le disque est plein. sync_all force l'écriture réelle.
        f.sync_all()?;
        Ok(())
    })();
    if let Err(e) = ecriture {
        let _ = fs::remove_file(&tmp);
        return Err(e);
    }

    if let Err(e) = fs::rename(&tmp, &cible) {
        let _ = fs::remove_file(&tmp);
        return Err(e.into());
    }

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

    /// Compte les temporaires restants, quel que soit leur nom : depuis que
    /// celui-ci est unique par écriture (revue finale I3), viser un chemin
    /// littéral ne prouverait plus rien.
    fn tmp_restants(d: &std::path::Path) -> usize {
        fs::read_dir(d)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().ends_with(".tmp"))
            .count()
    }

    #[test]
    fn l_ecriture_ne_laisse_aucun_tmp_derriere_elle() {
        let d = repertoire_neuf("sans-tmp");
        ecrire_atomique(&d, "slot-1.json", "a").unwrap();
        assert_eq!(tmp_restants(&d), 0);
        fs::remove_dir_all(&d).unwrap();
    }

    /// Corollaire du nom unique : plus personne n'écrase le temporaire de la
    /// tentative précédente, donc les ÉCHECS doivent faire leur ménage
    /// eux-mêmes. Sans quoi un épisode de disque plein — une écriture ratée
    /// par sauvegarde debouncée — joncherait de partiels le stockage que ce
    /// chantier cherche justement à désengorger.
    #[test]
    fn une_ecriture_en_echec_ne_laisse_pas_de_temporaire_derriere_elle() {
        let d = repertoire_neuf("echec-sans-tmp");
        // La cible est un répertoire : le renommage échouera à coup sûr.
        fs::create_dir_all(d.join("slot-1.json")).unwrap();
        assert!(ecrire_atomique(&d, "slot-1.json", "peu importe").is_err());
        assert_eq!(tmp_restants(&d), 0);
        fs::remove_dir_all(&d).unwrap();
    }

    /// Revue finale I3 : les commandes du plugin sont `async` et peuvent se
    /// chevaucher — cette branche documente elle-même deux écritures
    /// concurrentes réelles (`pagehide` et `visibilitychange→hidden` tous deux
    /// liés au flush dans GameContext, plus le flush vitrine qui écrit un état
    /// DIFFÉRENT). Avec un nom de `.tmp` déterministe, deux écrivains
    /// tronquent le même fichier et y écrivent depuis l'offset 0 : le plus
    /// court laisse derrière lui la queue du plus long, et c'est ce mélange
    /// qui est renommé sur le fichier faisant autorité. Le `rename` est
    /// atomique contre un KILL, pas contre un second écrivain.
    #[test]
    fn deux_ecritures_concurrentes_ne_melangent_jamais_leurs_octets() {
        let d = repertoire_neuf("concurrence");
        fs::create_dir_all(&d).unwrap();
        let court = "{\"jour\":1}".to_string();
        let long = format!("{{\"jour\":1,\"bourrage\":\"{}\"}}", "x".repeat(200_000));

        for tour in 0..40 {
            let (d1, d2) = (d.clone(), d.clone());
            let (c, l) = (court.clone(), long.clone());
            let t1 = std::thread::spawn(move || ecrire_atomique(&d1, "slot-1.json", &c));
            let t2 = std::thread::spawn(move || ecrire_atomique(&d2, "slot-1.json", &l));
            t1.join().unwrap().unwrap();
            t2.join().unwrap().unwrap();

            let lu = lire(&d, "slot-1.json").unwrap().unwrap();
            assert!(
                lu == court || lu == long,
                "tour {tour} : contenu mélangé ({} octets), ni l'un ni l'autre des \
                 deux états écrits",
                lu.len()
            );
        }

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
