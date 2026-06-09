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
  rotation: number,
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

/* --- Overlap pixel-perfect avec rotation continue ----------------- */

/**
 * Description d'un objet dans l'espace normalisé du coffre [0,1] × [0,1].
 * Le mask est le masque alpha base (orientation 0°), de taille maskSize × maskSize.
 */
export interface PixelItem {
  id: string;
  cx: number;       // 0..1
  cy: number;       // 0..1
  scale: number;    // taille relative au côté du coffre
  rot: number;      // degrés
  mask: Uint8Array; // longueur maskSize²
  maskSize: number;
}

/**
 * Teste si l'objet sort du coffre (un seul pixel opaque hors [0,1] suffit).
 */
export function pixelOutOfBounds(item: PixelItem): boolean {
  const N = item.maskSize;
  const rad = (item.rot * Math.PI) / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  // On itère sur le masque base et on transforme chaque pixel opaque vers le coffre.
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      if (!item.mask[py * N + px]) continue;
      const lx = (px + 0.5) / N - 0.5;
      const ly = (py + 0.5) / N - 0.5;
      const gx = item.cx + (lx * c - ly * s) * item.scale;
      const gy = item.cy + (lx * s + ly * c) * item.scale;
      if (gx < 0 || gx > 1 || gy < 0 || gy > 1) return true;
    }
  }
  return false;
}

/**
 * Teste le chevauchement pixel-perfect entre deux objets avec rotation libre.
 * On itère sur les pixels opaques de A, on les transforme vers le coffre,
 * puis on les ramène dans le référentiel local de B pour échantillonner son masque.
 */
export function pixelOverlap(a: PixelItem, b: PixelItem): boolean {
  // Élimination rapide par cercles englobants (rayon = scale * sqrt(2) / 2).
  const r2 = Math.SQRT2 / 2;
  const dx = a.cx - b.cx, dy = a.cy - b.cy;
  const dist = Math.hypot(dx, dy);
  if (dist > r2 * (a.scale + b.scale)) return false;

  const NA = a.maskSize, NB = b.maskSize;
  const aRad = (a.rot * Math.PI) / 180;
  const cA = Math.cos(aRad), sA = Math.sin(aRad);
  // Pour ramener une coord globale dans le repère local de B on applique -rot.
  const bRad = -(b.rot * Math.PI) / 180;
  const cB = Math.cos(bRad), sB = Math.sin(bRad);

  for (let py = 0; py < NA; py++) {
    for (let px = 0; px < NA; px++) {
      if (!a.mask[py * NA + px]) continue;
      const lAx = (px + 0.5) / NA - 0.5;
      const lAy = (py + 0.5) / NA - 0.5;
      const gx = a.cx + (lAx * cA - lAy * sA) * a.scale;
      const gy = a.cy + (lAx * sA + lAy * cA) * a.scale;
      // Vers le repère local de B
      const dxB = (gx - b.cx) / b.scale;
      const dyB = (gy - b.cy) / b.scale;
      const lBx = dxB * cB - dyB * sB + 0.5;
      const lBy = dxB * sB + dyB * cB + 0.5;
      if (lBx < 0 || lBx >= 1 || lBy < 0 || lBy >= 1) continue;
      const bx = Math.floor(lBx * NB);
      const by = Math.floor(lBy * NB);
      if (b.mask[by * NB + bx]) return true;
    }
  }
  return false;
}

/**
 * Calcule l'ensemble des IDs en conflit (chevauchements + hors-coffre) pixel-perfect.
 * Si `trunkMask` est fourni, la sortie de coffre s'évalue sur ce masque
 * (1 = pixel intérieur autorisé). Sinon, on retombe sur les bornes [0,1].
 */
export function computeOverlapsPixel(
  items: ReadonlyArray<PixelItem>,
  trunkMask?: TrunkMask | null,
): Set<string> {
  const out = new Set<string>();
  for (const it of items) {
    if (trunkMask) {
      if (pixelOutOfTrunk(it, trunkMask)) out.add(it.id);
    } else if (pixelOutOfBounds(it)) {
      out.add(it.id);
    }
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (pixelOverlap(items[i], items[j])) {
        out.add(items[i].id);
        out.add(items[j].id);
      }
    }
  }
  return out;
}

/* --- Masque du contenant du coffre -------------------------------- */

export interface TrunkMask {
  bits: Uint8Array; // longueur size*size, 1 = intérieur autorisé
  size: number;
}

const TRUNK_MASK_CACHE = new Map<string, TrunkMask>();

/**
 * Charge l'image `src` (WebP/PNG avec silhouette blanche), produit un masque
 * binaire à `size × size` (1 = pixel "blanc/intérieur", 0 = bordure ou
 * extérieur). Mis en cache par `src`+`size`+`zoom`.
 *
 * Si `zoom > 1`, on n'utilise que la zone centrale du source (cropping
 * synchronisé avec `background-size: ${100 * zoom}%` côté CSS).
 */
export async function buildTrunkMask(
  src: string,
  size: number,
  zoom = 1,
): Promise<TrunkMask> {
  const key = `${src}:${size}:${zoom}`;
  const cached = TRUNK_MASK_CACHE.get(key);
  if (cached) return cached;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (zoom === 1) {
    ctx.drawImage(img, 0, 0, size, size);
  } else {
    // Crop centré : on prélève une zone (1/zoom) du source et on l'étire à size.
    const srcW = img.naturalWidth / zoom;
    const srcH = img.naturalHeight / zoom;
    const srcX = (img.naturalWidth - srcW) / 2;
    const srcY = (img.naturalHeight - srcH) / 2;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, size, size);
  }
  const data = ctx.getImageData(0, 0, size, size).data;
  const bits = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    const luma = (r + g + b) / 3;
    bits[i] = a > 32 && luma > 200 ? 1 : 0;
  }
  const mask: TrunkMask = { bits, size };
  TRUNK_MASK_CACHE.set(key, mask);
  return mask;
}

export function getCachedTrunkMask(
  src: string,
  size: number,
  zoom = 1,
): TrunkMask | undefined {
  return TRUNK_MASK_CACHE.get(`${src}:${size}:${zoom}`);
}

/**
 * Teste si l'objet sort de l'intérieur du coffre défini par le `trunkMask`.
 * Itère sur les pixels opaques de l'item, projette en coords [0,1] et
 * échantillonne le masque.
 */
export function pixelOutOfTrunk(item: PixelItem, trunk: TrunkMask): boolean {
  const N = item.maskSize;
  const M = trunk.size;
  const rad = (item.rot * Math.PI) / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      if (!item.mask[py * N + px]) continue;
      const lx = (px + 0.5) / N - 0.5;
      const ly = (py + 0.5) / N - 0.5;
      const gx = item.cx + (lx * c - ly * s) * item.scale;
      const gy = item.cy + (lx * s + ly * c) * item.scale;
      if (gx < 0 || gx >= 1 || gy < 0 || gy >= 1) return true;
      const mx = Math.floor(gx * M);
      const my = Math.floor(gy * M);
      if (!trunk.bits[my * M + mx]) return true;
    }
  }
  return false;
}
