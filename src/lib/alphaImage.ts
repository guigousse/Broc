/**
 * Échantillonnage du canal alpha d'une image au point d'un tap.
 *
 * Sert aux dessins détourés dont la boîte englobante déborde largement la
 * silhouette (gramophone, tenancier du Bazar…) : un tap dans le vide du
 * rectangle ne doit pas compter comme un tap sur le dessin.
 *
 * Le webp est recopié UNE FOIS par image dans un canvas hors écran (mémoïsé en
 * WeakMap), puis chaque tap lit un pixel. Le résultat est `null` quand
 * l'échantillonnage est impossible (canvas indisponible, image pas chargée,
 * canvas « tainted »…) : c'est l'APPELANT qui choisit son fail-open — le
 * gramophone ferme, le tenancier ouvre.
 */
const contextes = new WeakMap<
  HTMLImageElement,
  CanvasRenderingContext2D | null
>();

/**
 * L'alpha (0..255) du pixel de `img` sous le point client (`clientX`,
 * `clientY`), ou `null` si l'échantillonnage est impossible. Un point hors du
 * rectangle de l'image vaut 0 : il est transparent par définition.
 *
 * L'image doit être affichée sans rognage ni `object-fit` déformant : la mise
 * à l'échelle suppose que son rect couvre exactement ses pixels naturels.
 */
export function alphaAuPoint(
  img: HTMLImageElement | null,
  clientX: number,
  clientY: number,
): number | null {
  if (!img || !img.complete || img.naturalWidth === 0) return null;

  let ctx = contextes.get(img);
  if (ctx === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    try {
      ctx?.drawImage(img, 0, 0);
    } catch {
      ctx = null;
    }
    contextes.set(img, ctx ?? null);
  }
  if (!ctx) return null;

  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const x = Math.floor(((clientX - rect.left) / rect.width) * img.naturalWidth);
  const y = Math.floor(
    ((clientY - rect.top) / rect.height) * img.naturalHeight,
  );
  if (x < 0 || y < 0 || x >= img.naturalWidth || y >= img.naturalHeight) {
    return 0;
  }
  try {
    return ctx.getImageData(x, y, 1, 1).data[3];
  } catch {
    return null;
  }
}
