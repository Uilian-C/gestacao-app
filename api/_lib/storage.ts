import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { del, get, list, put } from '@vercel/blob';

// Onde ficam as fotos e PDFs dos exames. Em produção, no Vercel Blob em modo
// privado: o arquivo não tem endereço público e só sai por /api/exames, que
// confere o login e o espaço. Em desenvolvimento e nos testes, numa pasta local
// (FILES_DIR). Os caminhos são sempre "familias/<espaço>/<arquivo>".

export interface StoredFile {
  body: ReadableStream<Uint8Array> | Uint8Array;
  contentType: string;
}

const localDir = () => (process.env.FILES_DIR ? resolve(process.env.FILES_DIR) : null);
// A Vercel conecta o Blob com um token (BLOB_READ_WRITE_TOKEN) ou pelo login do próprio projeto (BLOB_STORE_ID).
const blobReady = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export const storageReady = () => !!localDir() || blobReady();

function localPath(path: string) {
  const root = localDir()!;
  const full = resolve(root, path);
  if (!full.startsWith(root + '/')) throw new Error('Caminho fora da pasta de arquivos.');
  return full;
}

export async function putFile(path: string, bytes: Buffer, contentType: string) {
  if (localDir()) {
    const full = localPath(path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, bytes);
    await writeFile(`${full}.type`, contentType);
    return;
  }
  await put(path, bytes, { access: 'private', contentType, addRandomSuffix: false });
}

export async function getFile(path: string): Promise<StoredFile | null> {
  if (localDir()) {
    const full = localPath(path);
    try {
      const [body, contentType] = await Promise.all([readFile(full), readFile(`${full}.type`, 'utf8')]);
      return { body: new Uint8Array(body), contentType };
    } catch {
      return null;
    }
  }
  const found = await get(path, { access: 'private' });
  if (!found || found.statusCode !== 200) return null;
  return { body: found.stream, contentType: found.blob.contentType };
}

export async function deleteFiles(paths: string[]) {
  if (paths.length === 0) return;
  if (localDir()) {
    await Promise.all(paths.flatMap(p => [rm(localPath(p), { force: true }), rm(`${localPath(p)}.type`, { force: true })]));
    return;
  }
  await del(paths);
}

/** Apaga tudo o que um espaço guardou (ao excluir o espaço). */
export async function deleteFamilyFiles(familyId: string) {
  const prefix = `familias/${familyId}/`;
  if (localDir()) {
    await rm(join(localDir()!, prefix), { recursive: true, force: true });
    return;
  }
  if (!blobReady()) return;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    if (page.blobs.length) await del(page.blobs.map(b => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}
