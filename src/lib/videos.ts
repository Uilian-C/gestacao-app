import { api } from '../api';
import { FileProblem } from './examFiles';

// Vídeos (o ultrassom em vídeo, o primeiro chute...): vão como estão, sem
// reduzir, em pedaços de 2,5 MB, porque a Vercel aceita até 4,5 MB por
// chamada. Antes de enviar, o app tira uma imagem do vídeo (a capa), que
// aparece nas listas sem precisar carregar o vídeo.

export const VIDEO_CHUNK_BYTES = 2.5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const POSTER_SIDE = 480;

export interface PreparedVideo {
  file: File;
  /** A capa em JPG (base64, sem o prefixo "data:"). */
  poster: string;
  /** A capa para mostrar antes de enviar. */
  preview: string;
  name: string;
  size: number;
}

export const isVideoFile = (f: File) => f.type.startsWith('video/') || /\.(mp4|m4v|mov|webm)$/i.test(f.name);

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Um quadro do começo do vídeo; se o navegador não conseguir abrir, uma capa suave com o "play". */
async function grabFrame(file: File): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('tempo')), 6000);
      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };
      video.onseeked = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error('vídeo'));
      };
    });
    const scale = Math.min(1, POSTER_SIDE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  } catch {
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 480, 360);
    g.addColorStop(0, '#f6d9e4');
    g.addColorStop(1, '#ddd3f3');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 360);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(215, 145);
    ctx.lineTo(275, 180);
    ctx.lineTo(215, 215);
    ctx.fill();
  } finally {
    URL.revokeObjectURL(url);
  }
  return canvas;
}

export async function prepareVideo(file: File): Promise<PreparedVideo> {
  if (!isVideoFile(file)) throw new FileProblem(`"${file.name}" não é um vídeo.`);
  if (file.size > MAX_VIDEO_BYTES) throw new FileProblem(`O vídeo "${file.name}" passa de 100 MB. Corte um trecho menor no celular e tente de novo.`);
  const canvas = await grabFrame(file);
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.8));
  if (!blob) throw new FileProblem(`Não foi possível abrir "${file.name}".`);
  return { file, poster: await toBase64(blob), preview: URL.createObjectURL(blob), name: file.name, size: file.size };
}

/**
 * Envia o vídeo em pedaços (cada um com duas novas tentativas se a conexão
 * cair) e pede para juntar no registro ou no exame. Se der errado no meio,
 * os pedaços já enviados são apagados.
 */
export async function uploadVideo(target: 'entry' | 'exam', parentId: string, v: PreparedVideo, onProgress: (pct: number) => void) {
  const upload = crypto.randomUUID();
  const total = Math.ceil(v.size / VIDEO_CHUNK_BYTES);
  try {
    for (let i = 0; i < total; i++) {
      const data = await toBase64(v.file.slice(i * VIDEO_CHUNK_BYTES, (i + 1) * VIDEO_CHUNK_BYTES));
      for (let attempt = 0; ; attempt++) {
        try {
          await api.videos('part', { upload, index: i, data });
          break;
        } catch (err) {
          if (attempt >= 2 || (err instanceof Error && 'status' in err && (err as { status: number }).status < 500 && (err as { status: number }).status !== 0)) throw err;
        }
      }
      onProgress(Math.round(((i + 1) / total) * 100));
    }
    return await api.videos('finish', { upload, target, parentId, size: v.size, poster: v.poster });
  } catch (err) {
    api.videos('discard', { upload }).catch(() => undefined);
    throw err;
  }
}
