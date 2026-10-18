// Foto de perfil (migração 015): só quem é do mesmo espaço vê; trocar apaga a
// antiga; sair do espaço ou excluir a conta apaga o arquivo.
import { existsSync, readdirSync } from 'node:fs';
import { check, client, finish } from './lib.mjs';

const FILES_DIR = process.env.FILES_DIR;
const stamp = Date.now();
const ana = client(), caio = client(), bia = client(), anon = client();

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3000, 5)]).toString('base64');
const JPG2 = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 9)]).toString('base64');
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const BIG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(400 * 1024, 1)]).toString('base64');

async function signUp(c, name, role, code) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}p${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
  return code ? c.call('/api/family', { op: 'join', code, role }) : c.call('/api/family', { op: 'create', role });
}
await signUp(ana, 'Ana', 'mae');
await signUp(caio, 'Caio', 'pai', (await ana.call('/api/family', { op: 'invite' })).data.code);
await signUp(bia, 'Bia', 'mae');
const perfis = () => (existsSync(FILES_DIR) ? readdirSync(FILES_DIR, { recursive: true }).filter(f => /perfil-.*\.jpg$/.test(String(f))) : []);
const before = perfis().length;
const family = async c => (await c.call('/api/family')).data.family;

const start = await family(ana);
check(start.members.every(m => m.photo === null), 'sem foto, ninguém tem "photo"');

const put = await ana.call('/api/fotos', { op: 'avatar', data: JPG });
const anaMe = put.data.family?.members.find(m => m.me);
check(put.status === 200 && typeof anaMe?.photo === 'string', 'Ana põe a foto de perfil e recebe o espaço atualizado');
check(perfis().length === before + 1, 'a foto vai para o armazenamento');
check((await ana.call('/api/fotos', { op: 'avatar', data: PNG })).status === 415, 'só JPG (o app converte antes)');
check((await ana.call('/api/fotos', { op: 'avatar', data: BIG })).status === 400, 'foto grande demais é recusada');

const anaId = anaMe.userId;
const seen = (await family(caio)).members.find(m => m.userId === anaId);
check(seen.photo === anaMe.photo, 'Caio vê que a Ana tem foto');
const got = await caio.raw(`/api/fotos?perfil=${anaId}&v=1`);
check(got.status === 200 && got.headers.get('content-type') === 'image/jpeg' && got.bytes.equals(Buffer.from(JPG, 'base64')), 'Caio abre a foto da Ana');
check(got.headers.get('cache-control').startsWith('private'), 'a foto sai com cache privado');
check((await bia.raw(`/api/fotos?perfil=${anaId}`)).status === 404, 'Bia (outro espaço) não vê a foto da Ana');
check((await anon.raw(`/api/fotos?perfil=${anaId}`)).status === 401, 'sem login: 401');

await new Promise(r => setTimeout(r, 20));
const swap = await ana.call('/api/fotos', { op: 'avatar', data: JPG2 });
check(swap.data.family.members.find(m => m.me).photo !== anaMe.photo, 'trocar a foto muda a versão (o app busca a nova)');
check(perfis().length === before + 1, 'trocar apaga a foto antiga');
check((await caio.raw(`/api/fotos?perfil=${anaId}`)).bytes.equals(Buffer.from(JPG2, 'base64')), 'Caio vê a foto nova');

const off = await ana.call('/api/fotos', { op: 'removeAvatar' });
check(off.status === 200 && off.data.family.members.find(m => m.me).photo === null && perfis().length === before, 'tirar a foto apaga o arquivo');
check((await caio.raw(`/api/fotos?perfil=${anaId}`)).status === 404, 'sem foto: 404');

// Sair do espaço leva a foto junto.
await caio.call('/api/fotos', { op: 'avatar', data: JPG });
check(perfis().length === before + 1, 'Caio põe foto');
const caioId = (await family(caio)).members.find(m => m.me).userId;
await caio.call('/api/family', { op: 'removeMember', userId: caioId });
check(perfis().length === before, 'Caio sai do espaço e a foto dele é apagada');

// Excluir a conta também.
await bia.call('/api/fotos', { op: 'avatar', data: JPG });
const bia2 = client();
await signUp(bia2, 'Duda', 'pai', (await bia.call('/api/family', { op: 'invite' })).data.code);
await bia2.call('/api/fotos', { op: 'avatar', data: JPG2 });
check(perfis().length === before + 2, 'Bia e Duda põem foto');
await bia2.call('/api/account', { op: 'deleteAccount', confirm: 'EXCLUIR' });
check(perfis().length === before + 1, 'Duda exclui a conta e a foto dela sai; a da Bia fica');

finish();
