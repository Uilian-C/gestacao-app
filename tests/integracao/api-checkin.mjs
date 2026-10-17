// Check-in do dia: cada um responde por si, a outra pessoa do espaço vê, e só a primeira resposta do dia avisa.
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client(), bia = client();
async function signUp(c, name, role, code) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
  return code ? c.call('/api/family', { op: 'join', code, role }) : c.call('/api/family', { op: 'create', role });
}
await signUp(ana, 'Ana', 'mae');
await signUp(caio, 'Caio', 'pai', (await ana.call('/api/family', { op: 'invite' })).data.code);
await signUp(bia, 'Bia', 'mae');
const data = async c => (await c.call('/api/data')).data;
const day = new Date().toLocaleDateString('en-CA');

check((await ana.call('/api/data', { op: 'checkin', day, mood: 'cansada' })).status === 200, 'Ana conta como está');
check((await ana.call('/api/data', { op: 'checkin', day, mood: 'triste' })).status === 400, 'humor fora da lista é recusado');
let d = await data(caio);
check(d.checkinAvailable === true && d.checkins.length === 1 && d.checkins[0].mood === 'cansada' && d.checkins[0].author_role === 'mae' && d.checkins[0].mine === false, 'Caio vê o check-in da Ana');
check((await data(bia)).checkins.length === 0, 'Bia (outra família) não vê');
await ana.call('/api/data', { op: 'checkin', day, mood: 'bem' });
d = await data(ana);
check(d.checkins.length === 1 && d.checkins[0].mood === 'bem' && d.checkins[0].mine, 'responder de novo no mesmo dia troca a resposta');
await caio.call('/api/data', { op: 'checkin', day, mood: 'otima' });
check((await data(ana)).checkins.length === 2, 'cada um tem o seu check-in');
await ana.call('/api/data', { op: 'checkin', day, mood: null });
check(!(await data(caio)).checkins.some(c => c.author_role === 'mae'), 'tirar a resposta apaga o check-in');
const exported = JSON.parse((await caio.raw('/api/account')).bytes.toString());
check(Array.isArray(exported.space.checkins) && exported.space.checkins.length === 1, 'a cópia dos dados traz os check-ins');

finish();
