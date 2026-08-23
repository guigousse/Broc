import { ecrireSave, lireSave, quoiDuSlot } from "./pontNatif";
// `import type` OBLIGATOIRE : `fichierGameRepository` importe ce module en
// retour (tâche 6, étape 4). Un import de valeur créerait un cycle à
// l'exécution ; l'import de type est effacé à la compilation.
import type { IndexFichier } from "./fichierGameRepository";
import { chargerIndex, cleBackup, cleSlot, revisionDe, type NumeroSlot } from "./slots";

const NUMEROS: readonly NumeroSlot[] = [1, 2, 3];

function lireMiroir(n: NumeroSlot): string | null {
  try {
    return window.localStorage.getItem(cleSlot(n));
  } catch {
    return null;
  }
}

/**
 * Copie les sauvegardes du miroir vers les fichiers, puis écrit l'index
 * fichier. Paranoïaque comme `tenterMigrationLegacy` : chaque copie est relue
 * PAR LE FICHIER et comparée par égalité de chaîne stricte — une relecture
 * localStorage ne prouverait rien, elle serait servie par la copie mémoire.
 *
 * Le moindre échec rend `false` sans rien détruire : le jeu continue sur le
 * miroir et on retentera au prochain lancement.
 *
 * Garde-fou (risque reporté par la tâche précédente) : `lireIndexFichier()`
 * confond « aucun index fichier » et « index présent mais illisible » — les
 * deux rendent `null`, et c'est cette absence qui déclenche cette migration
 * depuis `fichierGameRepository.load()`. Si l'index fichier est en réalité
 * CORROMPU (pas absent) alors que des fichiers de slots existent déjà et
 * sont sains — potentiellement plus récents que le miroir —, copier
 * aveuglément le miroir par-dessus les écraserait : exactement le dégât que
 * ce chantier corrige, provoqué par son propre chemin de réparation. On ne
 * peut pas distinguer ce cas d'une migration précédente restée inachevée
 * (auquel cas écraser avec le miroir courant serait sans risque). Dans le
 * doute, on n'écrase JAMAIS : la présence, ne serait-ce que d'un seul
 * fichier de slot déjà là — parmi ceux qu'on s'apprêtait à écrire — annule
 * TOUTE la migration, comme `tenterMigrationLegacy` refuse d'écraser une
 * clé slot 1 déjà présente. Ce précontrôle passe intégralement AVANT la
 * moindre écriture (deux boucles distinctes, jamais fusionnées) : sinon un
 * premier slot pourrait être écrit avant qu'un second slot ne déclenche
 * l'abandon, ce qui ne serait plus un no-op. Conséquence assumée : si une
 * migration précédente s'est arrêtée en cours de route (fichier du slot 1
 * déjà écrit, puis disque plein sur le slot 2 — ou même la relecture de
 * vérification du slot 1 qui échoue APRÈS une écriture réussie), on ne
 * retentera plus jamais automatiquement : le jeu reste sur le miroir
 * indéfiniment. C'est une perte de durabilité, jamais une perte de partie.
 */
export async function migrerVersFichiers(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const index = chargerIndex();

  // Ce qu'il y a à copier, décidé une fois pour toutes avant tout effet de
  // bord : seuls les slots occupés du miroir seront écrits.
  const aCopier = new Map<NumeroSlot, string>();
  for (const n of NUMEROS) {
    const brut = lireMiroir(n);
    if (brut !== null) aCopier.set(n, brut);
  }

  // Précontrôle : AUCUNE écriture avant d'avoir vérifié qu'aucun des slots
  // qu'on s'apprête à copier n'a déjà un fichier.
  for (const n of aCopier.keys()) {
    try {
      if ((await lireSave(quoiDuSlot(n))) !== null) return false;
    } catch {
      return false;
    }
  }

  const revisions: Record<NumeroSlot, number> = { 1: 0, 2: 0, 3: 0 };
  for (const [n, brut] of aCopier) {
    try {
      await ecrireSave(quoiDuSlot(n), brut);
      if ((await lireSave(quoiDuSlot(n))) !== brut) return false;
    } catch {
      return false;
    }
    revisions[n] = revisionDe(n);
  }

  const indexFichier: IndexFichier = { actif: index.actif, revisions };
  try {
    await ecrireSave("index", JSON.stringify(indexFichier));
  } catch {
    return false;
  }

  // Les fichiers sont en place et atomiques : le double-buffer du miroir n'a
  // plus de raison d'être. On ne touche JAMAIS aux clés de slot elles-mêmes.
  for (const n of NUMEROS) {
    try {
      window.localStorage.removeItem(cleBackup(n));
    } catch {
      // Copie orpheline mais inerte : plus personne ne la relit.
    }
  }

  return true;
}
