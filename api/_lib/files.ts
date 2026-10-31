import { query } from './db.js';

// Regras comuns aos arquivos guardados (fotos e PDFs dos exames, fotos do diário).

/** Tamanho máximo de cada arquivo. O app reduz as fotos antes de enviar; isto vale para PDFs. */
export const MAX_FILE_BYTES = 3 * 1024 * 1024;
/** Espaço total por família (exames e diário juntos, vídeos inclusive), para os custos de armazenamento não escaparem. */
export const FAMILY_QUOTA_BYTES = 1024 * 1024 * 1024;
export const QUOTA_MESSAGE = 'O espaço de arquivos de vocês está cheio. Apaguem fotos ou arquivos que não precisam mais.';

/** Confere o tipo pelo começo do arquivo, não pelo que o navegador diz. */
export const FILE_TYPES = {
  'image/jpeg': (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b: Buffer) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP',
  'application/pdf': (b: Buffer) => b.toString('latin1', 0, 5) === '%PDF-',
} as const;
export type FileType = keyof typeof FILE_TYPES;
export const EXTENSION: Record<FileType | VideoType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };

// ---- Vídeos (o ultrassom em vídeo, o primeiro chute...) ----
// A Vercel aceita até 4,5 MB por chamada, então o vídeo vai e volta em pedaços
// de 2,5 MB (em base64 cabem folgados). O tamanho do pedaço nunca muda: é com
// ele que se acha qual pedaço tem cada parte do vídeo.

export const VIDEO_CHUNK_BYTES = 2.5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];
export const isVideo = (type: string) => type.startsWith('video/');

/** Confere pelo começo do arquivo: MP4 e MOV (iPhone) têm "ftyp" logo no início; WebM, a marca do Matroska. */
export function sniffVideo(b: Buffer): VideoType | null {
  if (b.length >= 12 && b.toString('latin1', 4, 8) === 'ftyp') return b.toString('latin1', 8, 10) === 'qt' ? 'video/quicktime' : 'video/mp4';
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';
  return null;
}

/** Base64 que cabe em `bytes` depois de decodificado. */
export const base64Max = (bytes: number) => Math.ceil((bytes * 4) / 3) + 8;

/** Quanto a família já guardou, somando exames e diário (cada tabela só se a migração já rodou). */
export async function familyUsedBytes(familyId: string) {
  const used = (table: string) =>
    query<{ used: string }>(`SELECT COALESCE(SUM(size_bytes), 0)::text AS used FROM ${table} WHERE family_id = $1`, [familyId])
      .then(rows => Number(rows[0]?.used ?? 0))
      .catch(() => 0);
  const [exams, journal] = await Promise.all([used('exam_files'), used('journal_files')]);
  return exams + journal;
}

/** Cabeçalhos para entregar um arquivo guardado só para quem pediu. */
export function privateFileHeaders(type: string, name: string): Record<string, string> {
  return {
    'Content-Type': type,
    'Content-Disposition': `inline; filename="${name}.${EXTENSION[type as FileType | VideoType] ?? 'bin'}"`,
    // Só o navegador de quem pediu guarda uma cópia, e por pouco tempo.
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    // Fotos abertas sozinhas não executam nada. (Nos PDFs e vídeos isso desligaria o leitor do navegador.)
    ...(type === 'application/pdf' || isVideo(type) ? {} : { 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
  };
}
