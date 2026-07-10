#!/usr/bin/env python3
"""Nettoie les pixels isolés du canal alpha des images d'items.

Les îlots de pixels quasi invisibles faussent le masque de collision du
coffre (src/lib/coffre.ts considère opaque tout pixel alpha > 16), ce qui
crée des conflits de placement inexplicables.

Règle : une composante connexe est supprimée si elle est à la fois
  - petite (< 1 % de la surface de la composante principale), et
  - éloignée de toute composante conservée (> ~1,2 % de la largeur d'image).
La condition de distance protège les détails visibles légitimement détachés
(pampilles de lustre, lots d'outils, paires de boucles d'oreilles...).

Usage :
  python3 scripts/clean-item-pixels.py            # simulation (dry-run)
  python3 scripts/clean-item-pixels.py --apply    # modifie les fichiers
  python3 scripts/clean-item-pixels.py --apply public/items/xx.webp ...

Dépendances : pip install pillow numpy scipy
"""
import glob
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ITEMS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "items")


def plan_removal(alpha):
    """Masque booléen des pixels à supprimer, ou None si rien à faire."""
    h, w = alpha.shape
    lab, n = ndimage.label(alpha > 0, structure=np.ones((3, 3)))
    if n <= 1:
        return None
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    main_id = int(sizes.argmax())
    margin = max(4, round(w * 0.012))
    keep_ids = set(np.where(sizes >= sizes[main_id] * 0.01)[0].tolist())
    # Agglomère : toute petite composante proche d'une zone conservée est gardée.
    while True:
        keep = np.isin(lab, list(keep_ids))
        zone = ndimage.binary_dilation(keep, iterations=margin)
        ids = set(np.unique(lab[zone]).tolist()) - {0}
        if ids <= keep_ids:
            break
        keep_ids |= ids
    remove_ids = set(range(1, n + 1)) - keep_ids
    if not remove_ids:
        return None
    return np.isin(lab, list(remove_ids))


def main():
    args = [a for a in sys.argv[1:] if a != "--apply"]
    apply = "--apply" in sys.argv
    files = args or sorted(glob.glob(os.path.join(ITEMS_DIR, "*.webp")))

    modified = 0
    for f in files:
        arr = np.array(Image.open(f).convert("RGBA"))
        rm = plan_removal(arr[:, :, 3])
        if rm is None:
            continue
        modified += 1
        print(f"{os.path.basename(f)}: {int(rm.sum())} px isolés")
        if apply:
            arr[rm] = 0
            # alpha_quality par défaut = lossless ; RGB ré-encodé en q90
            # (proche de l'encodage d'origine des assets).
            Image.fromarray(arr).save(f, "WEBP", quality=90, method=6)

    label = "nettoyé(s)" if apply else "à nettoyer (relancer avec --apply)"
    print(f"\n{modified}/{len(files)} fichier(s) {label}")


if __name__ == "__main__":
    main()
