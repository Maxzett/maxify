// Fotos HEIC/HEIF (formato por defecto de la cámara del iPhone).
// El backend solo acepta JPEG, PNG o WebP y Sharp no puede leer HEIC, así que
// el navegador las convierte a JPG antes de subirlas. Safari (iPhone, iPad y
// Mac) sabe decodificar HEIC; Chrome y Firefox de escritorio no.

// Mismo lado máximo al que Sharp achica las imágenes en el backend.
const MAX_LADO = 1600;
// Una foto HEIC más grande que esto no viene de una cámara normal.
const MAX_HEIC_BYTES = 25 * 1024 * 1024;

export const TIPOS_ACEPTADOS = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

// Algunos navegadores no informan el tipo de un HEIC: se mira también la extensión.
export function esHeic(archivo: File): boolean {
  return /^image\/hei[cf]/.test(archivo.type) || /\.hei[cf]$/i.test(archivo.name);
}

// Devuelve el mismo archivo si no es HEIC, o un JPG equivalente si lo es.
// Si no se puede convertir, la Promise se rechaza con un mensaje para el usuario.
export async function prepararImagen(archivo: File): Promise<File> {
  if (!esHeic(archivo)) return archivo;
  if (archivo.size > MAX_HEIC_BYTES) throw new Error('La imagen es demasiado grande.');

  // createImageBitmap decodifica la imagen (y respeta la rotación del EXIF).
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    throw new Error('Tu navegador no puede leer fotos HEIC. Elegí una imagen JPG o PNG.');
  }

  // Se dibuja en un canvas achicada a 1600 px como máximo, sin deformarla.
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // toBlob avisa el resultado con un callback; la Promise permite esperarlo
  // con await (igual que upload_stream en el ImagenesService del backend).
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  );
  if (!blob) throw new Error('No se pudo convertir la imagen. Probá con otra.');

  const nombre = archivo.name.replace(/\.hei[cf]$/i, '') + '.jpg';
  return new File([blob], nombre, { type: 'image/jpeg' });
}
