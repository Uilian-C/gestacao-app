// A espera (migração 035): o plano do casal, o bolão (casal e família), o
// resultado guardado como surpresa para a outra pessoa abrir, e os nomes por
// sexo com a lista final.
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client(), avo = client();
async function account(c, name) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
}
await account(ana, 'Ana');
await ana.call('/api/family', { op: 'create', role: 'mae' });
await ana.call('/api/data', { op: 'saveDum', date: '2026-07-01' });
await account(caio, 'Caio');
await caio.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite' })).data.code, role: 'pai' });
await account(avo, 'Rosa');
await avo.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite', kind: 'familia' })).data.code, relation: 'Avó' });
const espera = async c => (await c.call('/api/data')).data.espera;

let e = await espera(ana);
check(e && e.plan === null && e.sex === null && e.guesses.length === 0, 'começa sem plano, sem resultado e sem palpites');

// O plano e o bolão.
check((await ana.call('/api/data', { op: 'setSexPlan', plan: 'descobrir', testDate: '2026-11-20' })).status === 200, 'Ana: vamos descobrir, no dia 20');
await ana.call('/api/data', { op: 'guessSex', guess: 'menina' });
await caio.call('/api/data', { op: 'guessSex', guess: 'menino' });
check((await avo.call('/api/data', { op: 'guessSex', guess: 'menina' })).status === 200, 'a avó dá o palpite dela');
e = await espera(caio);
check(e.plan === 'descobrir' && e.testDate === '2026-11-20' && e.guesses.length === 3, 'o casal vê o plano, a data e os três palpites');
check(e.guesses.find(g => g.mine).guess === 'menino', 'cada um vê qual é o seu palpite');
await caio.call('/api/data', { op: 'guessSex', guess: 'menina' });
check((await espera(caio)).guesses.filter(g => g.guess === 'menina').length === 3, 'dá para mudar o palpite');
check((await avo.call('/api/data', { op: 'setSex', sex: 'menina', secret: false })).status === 403, 'a família palpita, mas não registra o resultado');

// O resultado como surpresa: só quem guardou sabe, até a outra pessoa abrir.
check((await ana.call('/api/data', { op: 'setSex', sex: 'menina', secret: true })).status === 200, 'Ana guarda o resultado no envelope');
const anaVe = await espera(ana);
const caioVe = await espera(caio);
const avoVe = (await avo.call('/api/data')).data.espera;
check(anaVe.sex === 'menina' && anaVe.secretMine, 'Ana sabe (foi ela que guardou)');
check(caioVe.secret && caioVe.sex === null && !caioVe.secretMine, 'Caio vê só o envelope fechado, sem o resultado');
check(avoVe.sex === null, 'e a família também não vê antes da hora');
check((await ana.call('/api/data', { op: 'openSex' })).status === 404, 'quem guardou não abre o próprio envelope');
check((await caio.call('/api/data', { op: 'openSex' })).status === 200, 'Caio abre o envelope');
e = await espera(caio);
check(e.sex === 'menina' && !e.secret && e.knownAt, 'agora os dois sabem: é menina');
check((await avo.call('/api/data')).data.espera.sex === 'menina', 'e a família também');
check((await avo.call('/api/data', { op: 'guessSex', guess: 'menino' })).status === 409, 'com o resultado, o bolão fecha');

// Os nomes por sexo e a lista final.
await ana.call('/api/data', { op: 'addNameIdea', name: 'Helena', forSex: 'menina' });
await caio.call('/api/data', { op: 'addNameIdea', name: 'Theo', forSex: 'menino' });
await ana.call('/api/data', { op: 'addNameIdea', name: 'Alice' });
let ideas = (await caio.call('/api/data')).data.nameIdeas;
check(ideas.find(i => i.name === 'Helena').for_sex === 'menina' && ideas.find(i => i.name === 'Alice').for_sex === 'ambos', 'cada nome sabe para quem é');
const alice = ideas.find(i => i.name === 'Alice');
check((await caio.call('/api/data', { op: 'tagNameIdea', id: alice.id, forSex: 'menina', finalist: true })).status === 200, 'Caio põe Alice na lista final, para menina');
ideas = (await ana.call('/api/data')).data.nameIdeas;
check(ideas.find(i => i.name === 'Alice').finalist && ideas.find(i => i.name === 'Alice').for_sex === 'menina', 'a lista final é dos dois');
check((await avo.call('/api/data', { op: 'tagNameIdea', id: alice.id, finalist: false })).status === 403, 'a lista final é do casal');

// Desfazer: registraram errado.
check((await ana.call('/api/data', { op: 'setSex', sex: null, secret: false })).status === 200, 'dá para desfazer o resultado');
check((await espera(caio)).sex === null, 'e a espera volta');

finish();
