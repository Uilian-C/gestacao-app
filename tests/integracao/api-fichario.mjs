// Fichário do diário: pastas, fotos e quem vê o quê. As fotos ficam na pasta local FILES_DIR.
import { existsSync, readdirSync } from 'node:fs';
import { check, client, finish } from './lib.mjs';

const FILES_DIR = process.env.FILES_DIR;
const stamp = Date.now();
const ana = client(), caio = client(), bia = client(), anon = client();

// Começo de JPG (o servidor confere o tipo pelos primeiros bytes) e um PNG, que não é aceito aqui.
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]).toString('base64');
const MINI = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 3)]).toString('base64');
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function signUp(c, name, role, code) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
  return code ? c.call('/api/family', { op: 'join', code, role }) : c.call('/api/family', { op: 'create', role });
}
await signUp(ana, 'Ana', 'mae');
await signUp(caio, 'Caio', 'pai', (await ana.call('/api/family', { op: 'invite' })).data.code);
await signUp(bia, 'Bia', 'mae');
const data = async c => (await c.call('/api/data')).data;
const files = () => (existsSync(FILES_DIR) ? readdirSync(FILES_DIR, { recursive: true }).filter(f => /\.jpg$/.test(String(f))) : []);
const before = files().length;

// ---- Pastas ----
const entry = (c, folder, body, visibility = 'shared') => c.call('/api/data', { op: 'createEntry', date: '2026-10-15', body, visibility, remindOn: null, folder });
const carta = await entry(ana, 'carta', 'Querido bebê, já te esperamos.');
check(carta.status === 200 && typeof carta.data.id === 'string', 'Ana escreve uma carta (e recebe o id do registro)');
const legado = await ana.call('/api/data', { op: 'createEntry', date: '2026-10-14', body: 'Sem pasta', visibility: 'shared', remindOn: null });
check(legado.status === 200 && (await data(ana)).journal.find(e => e.id === legado.data.id).folder === 'momento', 'sem pasta, o registro vai para "momento" (app antigo)');
check((await entry(ana, 'gaveta', 'x')).status === 400, 'pasta desconhecida é recusada');
check((await entry(ana, 'ideia', '')).status === 400, 'só a foto da barriga pode ficar sem texto');
const belly = await entry(ana, 'barriga', '');
check(belly.status === 200, 'foto da barriga pode ficar sem legenda');
await ana.call('/api/data', { op: 'updateEntry', id: carta.data.id, body: 'Querido bebê, já te esperamos muito.', visibility: 'shared', remindOn: null });
check((await data(caio)).journal.find(e => e.id === carta.data.id).folder === 'carta', 'editar sem mandar a pasta mantém a pasta (app antigo)');
await ana.call('/api/data', { op: 'updateEntry', id: legado.data.id, body: 'Ideia: quarto verde', visibility: 'shared', remindOn: null, folder: 'ideia' });
check((await data(caio)).journal.find(e => e.id === legado.data.id).folder === 'ideia', 'mudar de pasta ao editar');

// ---- Fotos ----
const add = (c, entryId, body = {}) => c.call('/api/fotos', { op: 'add', entryId, data: JPG, thumb: MINI, ...body });
check((await add(ana, belly.data.id)).status === 200, 'Ana põe a foto da barriga');
check((await add(caio, belly.data.id)).status === 404, 'Caio não põe foto no registro da Ana');
check((await add(bia, belly.data.id)).status === 404, 'Bia (outra família) não põe foto');
check((await add(ana, belly.data.id, { data: PNG })).status === 415, 'só JPG (o app converte antes de enviar)');
for (let i = 0; i < 3; i++) await add(ana, belly.data.id, { thumb: null });
check((await add(ana, belly.data.id)).status === 409, 'no máximo 4 fotos por registro');
check(files().length === before + 5, 'fotos e miniatura guardadas (1 com miniatura + 3 sem)');

const seen = (await data(caio)).journal.find(e => e.id === belly.data.id);
check(seen.photos.length === 4 && seen.photos[0].thumb === true && seen.photos[1].thumb === false, 'Caio vê as 4 fotos (a primeira com miniatura)');
const photoId = seen.photos[0].id;
const full = await caio.raw(`/api/fotos?id=${photoId}`);
check(full.status === 200 && full.headers.get('content-type') === 'image/jpeg' && full.bytes.equals(Buffer.from(JPG, 'base64')), 'Caio abre a foto');
const mini = await caio.raw(`/api/fotos?id=${photoId}&mini=1`);
check(mini.status === 200 && mini.bytes.equals(Buffer.from(MINI, 'base64')), 'a miniatura sai com mini=1');
check(full.headers.get('cache-control').startsWith('private') && full.headers.get('x-content-type-options') === 'nosniff', 'foto sai com cache privado e sem adivinhar tipo');
check((await bia.raw(`/api/fotos?id=${photoId}`)).status === 404, 'Bia não abre a foto nem sabendo o código');
check((await anon.raw(`/api/fotos?id=${photoId}`)).status === 401, 'sem login: 401');
check((await caio.raw('/api/fotos?id=../../etc/passwd')).status === 400, 'código de foto inválido é recusado');

// ---- Particular ----
const secret = await entry(ana, 'dia', 'Dia difícil, só pra mim', 'private');
await add(ana, secret.data.id);
const secretPhoto = (await data(ana)).journal.find(e => e.id === secret.data.id).photos[0].id;
check(!(await data(caio)).journal.some(e => e.id === secret.data.id), 'Caio não vê o registro particular');
check((await caio.raw(`/api/fotos?id=${secretPhoto}`)).status === 404, 'Caio não abre a foto do registro particular');

// ---- Apagar ----
check((await caio.call('/api/fotos', { op: 'delete', id: photoId })).status === 404, 'Caio não apaga foto da Ana');
check((await ana.call('/api/fotos', { op: 'delete', id: photoId })).status === 200, 'Ana apaga uma foto');
check(files().length === before + 5, 'a foto e a miniatura saem do armazenamento (e entrou a do particular)');
check((await ana.call('/api/data', { op: 'deleteEntry', id: belly.data.id })).status === 200, 'Ana apaga o registro da barriga');
check(files().length === before + 2, 'apagar o registro apaga as fotos dele (sobra a do particular, com miniatura)');

// ---- Exportar e excluir a conta ----
const exported = JSON.parse((await ana.raw('/api/account')).bytes.toString());
const cartaExport = exported.space.journal_entries.find(e => e.body.startsWith('Querido bebê'));
check(cartaExport?.pasta === 'carta' && cartaExport.fotos === 0, 'a cópia dos dados traz a pasta e quantas fotos');
check((await ana.call('/api/account', { op: 'deleteAccount', confirm: 'EXCLUIR' })).status === 200, 'Ana exclui a conta');
check(files().length === before, 'a foto do registro particular sai com a conta');
check((await data(caio)).journal.some(e => e.id === carta.data.id), 'a carta compartilhada fica no espaço');

finish();
