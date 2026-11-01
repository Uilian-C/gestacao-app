// Gêmeos (migração 037): o casal conta que são dois bebês; o bolão vira três
// times (duas meninas, um casal, dois meninos), no app e no link aberto; os
// palpites que não valem mais saem; e cada bebê tem o seu nome.
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client(), avo = client();
async function account(c, name) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}g${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
}
await account(ana, 'Ana');
await ana.call('/api/family', { op: 'create', role: 'mae' });
await ana.call('/api/data', { op: 'saveDum', date: '2026-07-01' });
await account(caio, 'Caio');
await caio.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite' })).data.code, role: 'pai' });
await account(avo, 'Rosa');
await avo.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite', kind: 'familia' })).data.code, relation: 'Avó' });
const data = async c => (await c.call('/api/data')).data;

check((await data(ana)).espera.babies === 1, 'começa com um bebê');
check((await ana.call('/api/data', { op: 'guessSex', guess: 'casal' })).status === 400, 'com um bebê, "casal" não é palpite');
await ana.call('/api/data', { op: 'guessSex', guess: 'menina' });
const token = (await ana.call('/api/data', { op: 'bolaoLink' })).data.data.espera.bolaoToken;
const bia = client();
await bia.call('/api/palpite', { op: 'vote', t: token, name: 'Bia', guess: 'menino' });

// São gêmeos.
check((await avo.call('/api/data', { op: 'setBabies', babies: 2 })).status === 403, 'só o casal conta que são gêmeos');
check((await caio.call('/api/data', { op: 'setBabies', babies: 2 })).status === 200, 'Caio conta: são gêmeos');
let e = (await data(ana)).espera;
check(e.babies === 2, 'os dois veem que são gêmeos');
check(e.guesses.length === 0 && e.publicVotes.length === 0, 'os palpites de um bebê só saem do placar');

check((await ana.call('/api/data', { op: 'guessSex', guess: 'menina' })).status === 400, 'para gêmeos, "menina" sozinha não é palpite');
check((await ana.call('/api/data', { op: 'guessSex', guess: 'casal' })).status === 200, 'Ana: um casal');
await caio.call('/api/data', { op: 'guessSex', guess: 'meninos' });
check((await avo.call('/api/data', { op: 'guessSex', guess: 'meninas' })).status === 200, 'a avó: duas meninas');

let v = (await bia.call(`/api/palpite?t=${token}`)).data;
check(v.twins === true && JSON.stringify(v.options) === JSON.stringify(['meninas', 'casal', 'meninos']), 'o link mostra as três opções dos gêmeos');
check(v.tally.casal === 1 && v.tally.meninos === 1 && v.tally.meninas === 1, 'e o placar de três times');
check((await bia.call('/api/palpite', { op: 'vote', t: token, name: 'Bia', guess: 'menino' })).status === 400, 'pelo link, "menino" sozinho não vale');
v = (await bia.call('/api/palpite', { op: 'vote', t: token, name: 'Bia', guess: 'casal' })).data;
check(v.mine?.guess === 'casal' && v.tally.casal === 2, 'Bia entra para o Time Casal');

// O resultado.
check((await ana.call('/api/data', { op: 'setSex', sex: 'menino', secret: false })).status === 400, 'o resultado também precisa ser dos gêmeos');
check((await ana.call('/api/data', { op: 'setSex', sex: 'casal', secret: false })).status === 200, 'é um casal!');
v = (await bia.call(`/api/palpite?t=${token}`)).data;
check(v.revealed === 'casal' && v.mine?.guess === 'casal', 'Bia vê que acertou');

// Os nomes dos dois.
check((await ana.call('/api/data', { op: 'setBabyName', name: 'Helena' })).status === 200, 'o primeiro nome: Helena');
check((await caio.call('/api/data', { op: 'setBabyName', name: 'Theo', which: 2 })).status === 200, 'o segundo: Theo');
const d = await data(avo);
check(d.babyName === 'Helena' && d.baby2Name === 'Theo', 'a família vê os dois nomes');

// Voltar para um bebê: o resultado de gêmeos sai, o bolão volta a ser de dois times.
await ana.call('/api/data', { op: 'setBabies', babies: 1 });
e = (await data(ana)).espera;
check(e.babies === 1 && e.sex === null && e.guesses.length === 0, 'voltar para um bebê limpa o que era dos gêmeos');
check(JSON.stringify((await bia.call(`/api/palpite?t=${token}`)).data.options) === JSON.stringify(['menina', 'menino']), 'e o link volta a menina ou menino');

finish();
