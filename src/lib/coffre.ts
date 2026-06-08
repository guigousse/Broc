import { PLACES_PAR_TAILLE } from "@/types/game";
import type { TailleObjet } from "@/types/game";

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function bboxOverlap(a: BBox, b: BBox): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

export function placesUtilisees(items: ReadonlyArray<{ taille: TailleObjet }>): number {
  return items.reduce((acc, it) => acc + PLACES_PAR_TAILLE[it.taille], 0);
}

export function capaciteSuffit(
  placesActuelles: number,
  placesAjoutees: number,
  capaciteMax: number,
): boolean {
  return placesActuelles + placesAjoutees <= capaciteMax;
}

/**
 * Calcule les IDs des objets en collision dans le coffre (bbox-based).
 * Inclut aussi les objets qui sortent des bornes [0, 1] × [0, 1].
 * Renvoie un Set d'objet IDs à mettre en rouge.
 */
export function computeOverlaps(
  items: ReadonlyArray<{ id: string; posX: number; posY: number; scale: number }>,
): Set<string> {
  const sortants = new Set<string>();
  const bboxes = items.map((it) => ({
    id: it.id,
    bbox: {
      x: it.posX - it.scale / 2,
      y: it.posY - it.scale / 2,
      w: it.scale,
      h: it.scale,
    },
  }));
  // Hors-coffre
  for (const b of bboxes) {
    if (b.bbox.x < 0 || b.bbox.y < 0 || b.bbox.x + b.bbox.w > 1 || b.bbox.y + b.bbox.h > 1) {
      sortants.add(b.id);
    }
  }
  // Chevauchements deux à deux
  for (let i = 0; i < bboxes.length; i++) {
    for (let j = i + 1; j < bboxes.length; j++) {
      if (bboxOverlap(bboxes[i].bbox, bboxes[j].bbox)) {
        sortants.add(bboxes[i].id);
        sortants.add(bboxes[j].id);
      }
    }
  }
  return sortants;
}

/* --- Alpha mask --------------------------------------------------- */

/**
 * Cache des masques alpha : key = `${src}:${size}:${rotation}`.
 * Valeur = Uint8Array de longueur size*size (1 = opaque, 0 = transparent).
 */
const MASK_CACHE = new Map<string, Uint8Array>();

export interface Mask {
  bits: Uint8Array;
  size: number;
}

export function maskKey(src: string, size: number, rotation: number): string {
  return `${src}:${size}:${rotation}`;
}

export function getCachedMask(key: string): Uint8Array | undefined {
  return MASK_CACHE.get(key);
}

export function cacheMask(key: string, bits: Uint8Array): void {
  MASK_CACHE.set(key, bits);
}

/**
 * Calcule le masque alpha d'une image rendue à `size × size` avec rotation.
 * Renvoie une Uint8Array indexée [y*size + x].
 */
export async function buildAlphaMask(
  src: string,
  size: number,
  rotation: 0 | 90 | 180 | 270,
): Promise<Uint8Array> {
  const key = maskKey(src, size, rotation);
  const cached = getCachedMask(key);
  if (cached) return cached;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(size / 2, size / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  const bits = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    bits[i] = data[i * 4 + 3] > 16 ? 1 : 0; // alpha > 16/255 = opaque
  }
  cacheMask(key, bits);
  return bits;
}

/**
 * Teste si deux masques se chevauchent au moins sur un pixel.
 * `a` et `b` sont positionnés respectivement à (ax, ay) et (bx, by) dans
 * un référentiel commun, et de tailles `size`.
 */
export function masksCollide(
  a: Mask,
  ax: number,
  ay: number,
  b: Mask,
  bx: number,
  by: number,
): boolean {
  const x1 = Math.max(ax, bx);
  const y1 = Math.max(ay, by);
  const x2 = Math.min(ax + a.size, bx + b.size);
  const y2 = Math.min(ay + a.size, by + b.size);
  if (x2 <= x1 || y2 <= y1) return false;

  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const ai = (y - ay) * a.size + (x - ax);
      const bi = (y - by) * b.size + (x - bx);
      if (a.bits[ai] && b.bits[bi]) return true;
    }
  }
  return false;
}

/**
 * Teste si un masque sort des bornes [0, side) × [0, side).
 * `x`, `y` = coin haut-gauche du masque.
 */
export function maskOutOfBounds(
  mask: Mask,
  x: number,
  y: number,
  side: number,
): boolean {
  for (let py = 0; py < mask.size; py++) {
    for (let px = 0; px < mask.size; px++) {
      if (!mask.bits[py * mask.size + px]) continue;
      const wx = x + px;
      const wy = y + py;
      if (wx < 0 || wx >= side || wy < 0 || wy >= side) return true;
    }
  }
  return false;
}
