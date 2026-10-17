// Prepara fotos e PDFs de exames para enviar: fotos são reduzidas no próprio
// celular (uma foto de câmera tem 4 a 12 MB; reduzida fica com 300 a 800 KB e
// continua legível), PDFs vão como estão, até 3 MB.

export const MAX_FILE_BYTES = 3 * 1024 * 1024;
/** Lado maior da foto depois de reduzida: dá para ler um laudo inteiro. */
export const MAX_SIDE = 2000;

export interface PreparedFile {
  contentType: 'image/jpeg' | 'application/pdf';
  /** Conteúdo em base64, sem o prefixo "data:". */
  data: string;
  size: number;
  /** Miniatura local para mostrar antes de enviar (só fotos). */
  preview: string | null;
  name: string;
}

export class FileProblem extends Error {}

/** Tamanho final mantendo a proporção, sem passar de `max` no lado maior. */
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Alguns navegadores só abrem certos formatos (ex.: HEIC do iPhone) pelo <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function shrinkPhoto(file: File, maxSide = MAX_SIDE, maxBytes = MAX_FILE_BYTES): Promise<Blob> {
  let image: ImageBitmap | HTMLImageElement;
  try {
    image = await decode(file);
  } catch {
    throw new FileProblem(`Não foi possível abrir "${file.name}". Tente tirar a foto de novo ou enviar como JPG.`);
  }
  const { width, height } = fitWithin(image.width, image.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  // Fundo branco: PNG com transparência não vira preto no JPG.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  if ('close' in image) image.close();
  for (const quality of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && blob.size <= maxBytes) return blob;
  }
  throw new FileProblem(`A foto "${file.name}" ficou grande demais mesmo reduzida.`);
}

export async function prepareFile(file: File): Promise<PreparedFile> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    if (file.size > MAX_FILE_BYTES) throw new FileProblem(`O PDF "${file.name}" tem mais de 3 MB. Tire fotos das páginas ou salve o PDF em tamanho menor.`);
    return { contentType: 'application/pdf', data: await toBase64(file), size: file.size, preview: null, name: file.name };
  }
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new FileProblem(`"${file.name}" não é foto nem PDF.`);
  }
  const blob = await shrinkPhoto(file);
  return { contentType: 'image/jpeg', data: await toBase64(blob), size: blob.size, preview: URL.createObjectURL(blob), name: file.name };
}

export const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);

// ---- Fotos do diário ----
// Fotos de lembrança não precisam ser legíveis como um laudo: 1600 px no lado
// maior bastam para a tela cheia. Junto vai uma miniatura de 480 px para as listas.

export const PHOTO_SIDE = 1600;
export const THUMB_SIDE = 480;
const THUMB_BYTES = 200 * 1024;

export interface PreparedPhoto {
  data: string;
  thumb: string;
  /** Miniatura local para mostrar antes de enviar. */
  preview: string;
  name: string;
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new FileProblem(`"${file.name}" não é uma foto.`);
  }
  const photo = await shrinkPhoto(file, PHOTO_SIDE);
  const thumb = await shrinkPhoto(file, THUMB_SIDE, THUMB_BYTES);
  return { data: await toBase64(photo), thumb: await toBase64(thumb), preview: URL.createObjectURL(thumb), name: file.name };
}
