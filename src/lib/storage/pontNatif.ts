import { tauriDisponible } from "@/lib/plateforme";
import type { NumeroSlot } from "./slots";

export type Quoi = "index" | "slot_1" | "slot_2" | "slot_3";
export type GenreErreur = "disque_plein" | "io" | "indisponible";

export interface ErreurStockage {
  genre: GenreErreur;
  message: string;
}

export function quoiDuSlot(n: NumeroSlot): Quoi {
  return `slot_${n}` as Quoi;
}

const INDISPONIBLE: ErreurStockage = {
  genre: "indisponible",
  message: "Stockage natif indisponible",
};

/**
 * Le Rust sérialise ses erreurs en `{genre, message}`. Tout ce qui n'a pas cette
 * forme (panique, erreur de transport, plugin absent) est normalisé en `io`
 * plutôt que propagé tel quel : les appelants n'ont qu'un seul contrat à lire.
 */
function normaliser(e: unknown): ErreurStockage {
  if (typeof e === "object" && e !== null && "genre" in e) {
    const g = (e as { genre: unknown }).genre;
    if (g === "disque_plein" || g === "io" || g === "indisponible") {
      return e as ErreurStockage;
    }
  }
  return { genre: "io", message: String(e) };
}

async function appeler<T>(commande: string, args: Record<string, unknown>): Promise<T> {
  if (!tauriDisponible()) throw INDISPONIBLE;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return (await invoke(`plugin:stockage|${commande}`, args)) as T;
  } catch (e) {
    throw normaliser(e);
  }
}

export function lireSave(quoi: Quoi): Promise<string | null> {
  return appeler<string | null>("lire_save", { quoi });
}

export function ecrireSave(quoi: Quoi, contenu: string): Promise<void> {
  return appeler<void>("ecrire_save", { quoi, contenu });
}

export function espaceLibre(): Promise<number | null> {
  return appeler<number | null>("espace_libre", {});
}

export function partagerFichier(quoi: Quoi, nomLisible: string): Promise<void> {
  return appeler<void>("partager_fichier", { quoi, nomLisible });
}
