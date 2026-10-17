// Exames com foto e PDF: quem vê cada arquivo, limites e o que some ao excluir.
// Os arquivos ficam na pasta local FILES_DIR (no lugar do Vercel Blob).
import { existsSync, readdirSync } from 'node:fs';
import { check, client, finish } from './lib.mjs';

const FILES_DIR = process.env.FILES_DIR;
const stamp = Date.now();
const ana = client(), caio = client(), bia = client(), anon = client();

// Uma foto PNG de 1x1 de verdade e um PDF mínimo.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n').toString('base64');

async function signUp(c, name, role, code) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
  return code ? c.call('/api/family', { op: 'join', code, role }) : c.call('/api/family', { op: 'create', role });
}

await signUp(ana, 'Ana', 'mae');
const invite = (await ana.call('/api/family', { op: 'invite' })).data.code;
await signUp(caio, 'Caio', 'pai', invite);
await signUp(bia, 'Bia', 'mae');
const files = () => (existsSync(FILES_DIR) ? readdirSync(FILES_DIR, { recursive: true }).filter(f => /\.(png|jpg|webp|pdf)$/.test(String(f))) : []);

// ---- Criar e enviar ----
const created = await ana.call('/api/exames', { op: 'create', kind: 'ultrassom', title: 'Morfológico', date: '2026-10-10', planItem: 'morfo-2', notes: 'Tudo bem com o bebê', visibility: 'shared' });
check(created.status === 200 && created.data.id, 'Ana cria o exame');
const examId = created.data.id;
const up = await ana.call('/api/exames', { op: 'addFile', examId, contentType: 'image/png', data: PNG });
check(up.status === 200 && up.data.id, 'Ana envia a foto');
const pdf = await caio.call('/api/exames', { op: 'addFile', examId, contentType: 'application/pdf', data: PDF });
check(pdf.status === 200, 'Caio (mesmo espaço) junta um PDF ao exame');
check(files().length === 2, 'os dois arquivos estão guardados');

const seen = (await caio.call('/api/data')).data.exams;
check(seen.length === 1 && seen[0].files.length === 2 && seen[0].plan_item === 'morfo-2' && seen[0].author_role === 'mae', 'Caio vê o exame, com os 2 arquivos e o item da jornada');
const photo = await caio.raw(`/api/exames?arquivo=${up.data.id}`);
check(photo.status === 200 && photo.headers.get('content-type') === 'image/png' && photo.bytes.equals(Buffer.from(PNG, 'base64')), 'Caio abre a foto (mesmos bytes)');
check(photo.headers.get('cache-control').startsWith('private') && photo.headers.get('x-content-type-options') === 'nosniff', 'foto sai com cache privado e sem adivinhar tipo');

// ---- Outra família e sem login ----
check((await bia.call('/api/data')).data.exams.length === 0, 'Bia (outra família) não vê o exame');
check((await bia.raw(`/api/exames?arquivo=${up.data.id}`)).status === 404, 'Bia não abre a foto nem sabendo o código');
check((await bia.call('/api/exames', { op: 'addFile', examId, contentType: 'image/png', data: PNG })).status === 404, 'Bia não envia arquivo para o exame de outra família');
check((await bia.call('/api/exames', { op: 'delete', id: examId })).status === 404, 'Bia não apaga o exame');
check((await bia.call('/api/exames', { op: 'deleteFile', id: up.data.id })).status === 404, 'Bia não apaga o arquivo');
check((await anon.raw(`/api/exames?arquivo=${up.data.id}`)).status === 401, 'sem login: 401');
check((await caio.raw('/api/exames?arquivo=../../etc/passwd')).status === 400, 'código de arquivo inválido é recusado');

// ---- Validação ----
check((await ana.call('/api/exames', { op: 'addFile', examId, contentType: 'image/jpeg', data: PDF })).status === 415, 'PDF disfarçado de foto é recusado');
check((await ana.call('/api/exames', { op: 'addFile', examId, contentType: 'text/html', data: PDF })).status === 400, 'tipo fora da lista é recusado');
const big = Buffer.alloc(3 * 1024 * 1024 + 10, 0x41);
big.write('%PDF-');
check((await ana.call('/api/exames', { op: 'addFile', examId, contentType: 'application/pdf', data: big.toString('base64') })).status >= 400, 'arquivo acima de 3 MB é recusado');
check((await ana.call('/api/exames', { op: 'create', kind: 'raio-x', title: '', date: 'ontem', visibility: 'shared' })).status === 400, 'dados inválidos são recusados');
check(files().length === 2, 'nada recusado foi guardado');

// ---- Exame particular ----
const priv = (await ana.call('/api/exames', { op: 'create', kind: 'exame', title: 'Sorologias', date: '2026-10-11', visibility: 'private' })).data.id;
const privFile = (await ana.call('/api/exames', { op: 'addFile', examId: priv, contentType: 'image/png', data: PNG })).data.id;
check((await ana.call('/api/data')).data.exams.length === 2, 'Ana vê os 2 exames');
check((await caio.call('/api/data')).data.exams.length === 1, 'Caio não vê o exame particular da Ana');
check((await caio.raw(`/api/exames?arquivo=${privFile}`)).status === 404, 'Caio não abre o arquivo particular');
check((await caio.call('/api/exames', { op: 'delete', id: priv })).status === 404, 'Caio não apaga o exame particular');
check((await ana.raw(`/api/exames?arquivo=${privFile}`)).status === 200, 'Ana abre o próprio arquivo particular');

// ---- Apagar ----
const del = await caio.call('/api/exames', { op: 'deleteFile', id: pdf.data.id });
check(del.status === 200 && del.data.data.exams[0].files.length === 1, 'apagar um arquivo devolve o exame atualizado');
check(files().length === 2, 'o PDF saiu da pasta (sobram a foto e o particular)');

// ---- LGPD ----
const exported = await ana.raw('/api/account');
const dump = JSON.parse(exported.bytes.toString());
check(dump.space.exams.length === 2 && dump.space.exams.some(e => e.title === 'Morfológico' && e.arquivos === 1), 'exportação da Ana lista os exames');
check((await ana.call('/api/account', { op: 'deleteAccount', confirm: 'EXCLUIR' })).status === 200, 'Ana exclui a conta');
check(files().length === 1, 'o arquivo particular da Ana sumiu; o compartilhado ficou');
const kept = (await caio.call('/api/data')).data.exams;
check(kept.length === 1 && kept[0].title === 'Morfológico', 'Caio continua com o exame compartilhado');
check((await caio.raw(`/api/exames?arquivo=${up.data.id}`)).status === 200, 'e ainda abre a foto');

const second = (await caio.call('/api/exames', { op: 'create', kind: 'exame', title: 'Hemograma', date: '2026-10-12', visibility: 'shared' })).data.id;
await caio.call('/api/exames', { op: 'addFile', examId: second, contentType: 'image/png', data: PNG });
check((await caio.call('/api/exames', { op: 'delete', id: second })).status === 200 && files().length === 1, 'apagar o exame apaga os arquivos dele');
check((await caio.call('/api/account', { op: 'deleteSpace', confirm: 'EXCLUIR' })).status === 200, 'Caio exclui o espaço');
check(files().length === 0, 'excluir o espaço apaga todos os arquivos dele');

finish();
