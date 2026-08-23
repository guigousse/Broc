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
 * Le moindre échec d'ÉCRITURE (disque plein, relecture qui ne correspond
 * pas) rend `false` sans rien détruire : le jeu continue sur le miroir et
 * on retentera au prochain lancement.
 *
 * Garde-fou (Ruling R8) : cette fonction n'est appelée par
 * `fichierGameRepository.load()` que lorsque l'index fichier est
 * GENUINEMENT absent (`lireSave("index")` a rendu `null` — un index présent
 * mais illisible ne déclenche jamais la migration, voir `load()`). Mais
 * même l'index absent confirmé, un fichier de slot peut déjà exister, et on
 * ne peut pas savoir pourquoi :
 *  - soit une migration précédente s'est arrêtée en cours de route (fichier
 *    déjà écrit lors d'une tentative interrompue) — l'écraser avec le
 *    miroir courant serait sans risque ;
 *  - soit un `save()` a réussi à écrire le fichier du slot puis a échoué à
 *    écrire l'index (`fichierGameRepository.save()`, étape 2) — auquel cas
 *    l'étape 3 (miroir) n'a JAMAIS eu lieu, et ce fichier est en réalité
 *    PLUS FRAIS que le miroir.
 * Ces deux cas sont indiscernables d'ici. On ne touche donc JAMAIS à un
 * fichier de slot déjà présent — mais, contrairement à un abandon global,
 * on continue de copier les AUTRES slots et d'écrire l'index, pour que la
 * migration finisse quand même par aboutir plutôt que de rester bloquée
 * indéfiniment. La révision inscrite pour un slot ignoré est celle du
 * miroir (`revisionDe(n)`, identique à celle d'un slot copié) : c'est ce
 * qui permet à un fichier plus frais que le miroir de gagner l'égalité de
 * l'arbitrage `revFichier >= revMiroir` dans `fichierGameRepository.load()`
 * au lieu de perdre face à un miroir qui n'a jamais vu la save qui a
 * produit ce fichier.
 *
 * Rend l'`IndexFichier` effectivement écrit (et relu à l'identique) en cas
 * de succès, `null` sinon — jamais un simple booléen : `fichierGameRepository
 * .load()` doit pouvoir poursuivre directement avec cet index sans jamais
 * avoir besoin de le relire une seconde fois (voir le commentaire sur
 * l'écriture de l'index ci-dessous).
 */
export async function migrerVersFichiers(): Promise<IndexFichier | null> {
  if (typeof window === "undefined") return null;

  const index = chargerIndex();

  // Ce qu'il y a à copier, décidé une fois pour toutes avant tout effet de
  // bord : seuls les slots occupés du miroir sont candidats.
  const aCopier = new Map<NumeroSlot, string>();
  for (const n of NUMEROS) {
    const brut = lireMiroir(n);
    if (brut !== null) aCopier.set(n, brut);
  }

  const revisions: Record<NumeroSlot, number> = { 1: 0, 2: 0, 3: 0 };
  for (const [n, brut] of aCopier) {
    let dejaPresent: string | null;
    try {
      dejaPresent = await lireSave(quoiDuSlot(n));
    } catch {
      return null;
    }

    if (dejaPresent === null) {
      try {
        await ecrireSave(quoiDuSlot(n), brut);
        if ((await lireSave(quoiDuSlot(n))) !== brut) return null;
      } catch {
        return null;
      }
    }
    // Copié ou laissé intact : dans les deux cas, la révision inscrite est
    // celle du miroir (voir le commentaire de tête).
    revisions[n] = revisionDe(n);
  }

  const indexFichier: IndexFichier = { actif: index.actif, revisions };
  const indexSerialise = JSON.stringify(indexFichier);
  try {
    await ecrireSave("index", indexSerialise);
    // Revue de tâche 6 (constat) : c'était la SEULE écriture de la fonction
    // qui n'était vérifiée par aucune relecture — chaque copie de slot l'est
    // déjà (ligne ci-dessus), mais l'index, non. Chemin atteignable : un
    // joueur sans AUCUNE save miroir (`aCopier` vide) ne fait alors QUE
    // cette écriture. Si `ecrireSave` résout sans que le fichier soit
    // effectivement retrouvable en relecture immédiate, rendre `true` (ou un
    // index non vérifié) ferait croire à `fichierGameRepository.load()` que
    // la migration a réussi ; son prochain lireIndexFichier() la retrouverait
    // `absent` malgré tout, et sans garde structurelle, on aurait bouclé
    // indéfiniment (absent → migre → absent → …) — le jeu ne s'affichant
    // jamais. Même règle que les slots, ici appliquée à l'index lui-même.
    if ((await lireSave("index")) !== indexSerialise) return null;
  } catch {
    return null;
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

  return indexFichier;
}
