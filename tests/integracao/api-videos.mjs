// Vídeos no diário e nos exames: envio em pedaços, conferência no fim, tocar aos trechos e apagar.
import { existsSync, readdirSync } from 'node:fs';
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client(), avo = client();
const CHUNK = 2.5 * 1024 * 1024;

async function account(c, name) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
}
await account(ana, 'Ana');
await ana.call('/api/family', { op: 'create', role: 'mae' });
await ana.call('/api/data', { op: 'saveDum', date: '2026-05-15' });
await account(caio, 'Caio');
await caio.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite' })).data.code, role: 'pai' });
await account(avo, 'Rosa');
await avo.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite', kind: 'familia' })).data.code, relation: 'Avó' });

// Um "MP4" de 6 MB: o começo de um MP4 de verdade e bytes que mudam (para conferir cada trecho).
const video = Buffer.alloc(6 * 1024 * 1024);
for (let i = 0; i < video.length; i++) video[i] = (i * 31) % 251;
Buffer.from([0, 0, 0, 0x18, ...Buffer.from('ftypisom', 'latin1')]).copy(video);
const poster = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 7)]).toString('base64');
const parts = Math.ceil(video.length / CHUNK);
const send = (c, upload, i, bytes = video.subarray(i * CHUNK, (i + 1) * CHUNK)) => c.call('/api/videos', { op: 'part', upload, index: i, data: bytes.toString('base64') });

const entry = (await ana.call('/api/data', { op: 'createEntry', date: '2026-10-15', body: 'O primeiro ultrassom, em vídeo!', visibility: 'family', remindOn: null, folder: 'momento' })).data.id;

// ---- Envio ----
const up = crypto.randomUUID();
check((await send(ana, up, 0, Buffer.from('não é vídeo nenhum, é texto'))).status === 415, 'o primeiro pedaço já recusa o que não é vídeo');
for (let i = 0; i < parts - 1; i++) await send(ana, up, i);
const early = await ana.call('/api/videos', { op: 'finish', upload: up, target: 'entry', parentId: entry, size: video.length, poster });
check(early.status === 409, 'sem todos os pedaços, o vídeo não entra no registro');

const up2 = crypto.randomUUID();
for (let i = 0; i < parts; i++) await send(ana, up2, i);
check((await caio.call('/api/videos', { op: 'finish', upload: up2, target: 'entry', parentId: entry, size: video.length, poster })).status === 404, 'o Caio não junta vídeo no registro da Ana');
// O "juntar" recusado apaga os pedaços (nada fica solto): a Ana envia de novo.
for (let i = 0; i < parts; i++) await send(ana, up2, i);
// Reenviar um pedaço que já tinha chegado (a conexão caiu antes da resposta) não atrapalha.
check((await send(ana, up2, 0)).status === 200, 'reenviar um pedaço já enviado funciona');
const done = await ana.call('/api/videos', { op: 'finish', upload: up2, target: 'entry', parentId: entry, size: video.length, poster });
check(done.status === 200, 'com todos os pedaços, o vídeo entra no registro');
const photo = done.data.data.journal.find(e => e.id === entry).photos[0];
check(photo?.video === true && photo.thumb === true, 'o registro mostra que é vídeo, com capa');
check((await avo.call('/api/videos', { op: 'part', upload: crypto.randomUUID(), index: 0, data: video.subarray(0, 100).toString('base64') })).status === 403, 'familiar não envia vídeo');

// ---- Tocar aos trechos ----
const url = `/api/fotos?id=${photo.id}`;
const first = await ana.raw(url, { range: 'bytes=0-' });
check(first.status === 206 && first.bytes.length === CHUNK && first.headers.get('content-range') === `bytes 0-${CHUNK - 1}/${video.length}`, 'o navegador recebe o vídeo um pedaço por vez');
check(first.headers.get('content-type') === 'video/mp4' && first.headers.get('accept-ranges') === 'bytes', 'com o tipo e o aviso de que aceita trechos');
const middle = await ana.raw(url, { range: `bytes=${CHUNK - 10}-${CHUNK + 9}` });
check(middle.status === 206 && middle.bytes.equals(video.subarray(CHUNK - 10, CHUNK)), 'um trecho que cruza dois pedaços vem até o fim do primeiro');
const tail = await ana.raw(url, { range: `bytes=${video.length - 100}-` });
check(tail.status === 206 && tail.bytes.equals(video.subarray(video.length - 100)), 'o fim do vídeo vem certinho');
const whole = await caio.raw(url);
check(whole.status === 200 && whole.bytes.equals(video), 'sem trecho, o vídeo vem inteiro (e o Caio vê)');
const cover = await avo.raw(`${url}&mini=1`);
check(cover.status === 200 && cover.headers.get('content-type') === 'image/jpeg', 'a família vê a capa do vídeo do post para a família');
check((await ana.raw(url, { range: `bytes=${video.length}-` })).status === 416, 'trecho fora do vídeo é recusado');

// ---- Exame com vídeo ----
const exam = (await ana.call('/api/exames', { op: 'create', kind: 'ultrassom', title: 'Morfológico', date: '2026-10-20', visibility: 'shared' })).data.id;
const up3 = crypto.randomUUID();
const small = video.subarray(0, 300_000);
await send(caio, up3, 0, small);
const ex = await caio.call('/api/videos', { op: 'finish', upload: up3, target: 'exam', parentId: exam, size: small.length, poster });
check(ex.status === 200 && ex.data.id, 'o Caio junta o vídeo do ultrassom ao exame compartilhado');
const examFile = (await ana.call('/api/data')).data.exams.find(e => e.id === exam).files[0];
check(examFile.content_type === 'video/mp4' && examFile.size === small.length, 'o exame lista o vídeo');
check((await ana.raw(`/api/exames?arquivo=${examFile.id}`, { range: 'bytes=0-99' })).bytes.equals(small.subarray(0, 100)), 'o vídeo do exame toca aos trechos');
check((await ana.raw(`/api/exames?arquivo=${examFile.id}&capa=1`)).headers.get('content-type') === 'image/jpeg', 'e tem capa');
check((await avo.raw(`/api/exames?arquivo=${examFile.id}`)).status === 403, 'familiar não vê vídeo de exame');

// ---- Apagar ----
await ana.call('/api/exames', { op: 'deleteFile', id: examFile.id });
check((await ana.raw(`/api/exames?arquivo=${examFile.id}`)).status === 404, 'apagar o vídeo do exame tira o arquivo');
await ana.call('/api/data', { op: 'deleteEntry', id: entry });
check((await ana.raw(url)).status === 404, 'apagar o registro apaga o vídeo');
const left = existsSync(process.env.FILES_DIR) ? readdirSync(process.env.FILES_DIR, { recursive: true }).filter(f => /video-/.test(String(f))) : [];
const kept = [up, up2, up3].filter(u => left.some(f => String(f).includes(u)));
// O envio incompleto (recusado no fim) e os vídeos apagados não deixam pedaços.
check(kept.length === 0, 'nenhum pedaço de vídeo fica solto no armazenamento');

finish();
