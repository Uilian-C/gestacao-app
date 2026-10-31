import { HttpError } from './http.js';
import { VIDEO_CHUNK_BYTES, privateFileHeaders } from './files.js';
import { readBytes } from './storage.js';

// Tocar um vídeo guardado em pedaços. O navegador pede o vídeo aos trechos
// ("Range": bytes=início-fim) e cada resposta leva no máximo um pedaço, que
// cabe folgado no limite de resposta da Vercel. Sem "Range" (abrir o link ou
// baixar), os pedaços vão em sequência.

/** O trecho pedido em "bytes=início-fim" (ou "bytes=-n", os últimos n bytes), dentro do vídeo. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (m[1] === '' && m[2] === '')) return null;
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start >= size || start > end) throw new HttpError(416, 'Trecho fora do vídeo.');
  return { start, end };
}

const chunkOf = (path: string, i: number) => `${path}${i}`;

async function chunk(path: string, i: number) {
  const bytes = await readBytes(chunkOf(path, i));
  if (!bytes) throw new HttpError(404, 'Vídeo não encontrado.');
  return bytes;
}

export async function serveVideo(request: Request, file: { path: string; size: number; type: string }, name: string) {
  // MOV do iPhone toca como MP4 na maioria dos navegadores (o Chrome recusa "video/quicktime").
  const type = file.type === 'video/quicktime' ? 'video/mp4' : file.type;
  const headers = { ...privateFileHeaders(type, name), 'Accept-Ranges': 'bytes' };
  const range = parseRange(request.headers.get('range'), file.size);
  if (!range) {
    const total = Math.ceil(file.size / VIDEO_CHUNK_BYTES);
    let i = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (i >= total) return controller.close();
        controller.enqueue(new Uint8Array(await chunk(file.path, i++)));
      },
    });
    return new Response(body, { headers: { ...headers, 'Content-Length': String(file.size) } });
  }
  // Um pedaço por resposta: o navegador pede o resto em seguida.
  const index = Math.floor(range.start / VIDEO_CHUNK_BYTES);
  const end = Math.min(range.end, (index + 1) * VIDEO_CHUNK_BYTES - 1);
  const bytes = (await chunk(file.path, index)).subarray(range.start - index * VIDEO_CHUNK_BYTES, end - index * VIDEO_CHUNK_BYTES + 1);
  return new Response(new Uint8Array(bytes), {
    status: 206,
    headers: { ...headers, 'Content-Range': `bytes ${range.start}-${end}/${file.size}`, 'Content-Length': String(bytes.length) },
  });
}
