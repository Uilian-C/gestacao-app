// A escolha do nome do bebê (migrações 025 e 026): ideias, curtidas, a família dando palpite e a escolha do casal.
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client(), avo = client();
async function account(c, name) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase().replace(/\s/g, '')}${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
}
await account(ana, 'Ana');
await ana.call('/api/family', { op: 'create', role: 'mae' });
await ana.call('/api/data', { op: 'saveDum', date: '2026-05-15' });
await account(caio, 'Caio');
await caio.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite' })).data.code, role: 'pai' });
await account(avo, 'Rosa');
await avo.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite', kind: 'familia' })).data.code, relation: 'Avó' });
const data = async c => (await c.call('/api/data')).data;

check((await data(ana)).nameIdeas.length === 0 && (await data(ana)).babyName === null, 'começa sem nome e sem ideias');
check((await ana.call('/api/data', { op: 'addNameIdea', name: 'Helena' })).status === 200, 'Ana sugere Helena');
await caio.call('/api/data', { op: 'addNameIdea', name: 'Alice' });
await ana.call('/api/data', { op: 'addNameIdea', name: 'helena' });
let ideas = (await data(caio)).nameIdeas;
check(ideas.length === 2, 'o mesmo nome não entra duas vezes (maiúscula não importa)');
const helena = ideas.find(i => i.name === 'Helena');
check(helena.likes.length === 1 && helena.author_role === 'mae', 'quem sugere já curte o nome');
await caio.call('/api/data', { op: 'likeNameIdea', id: helena.id, on: true });

// A família dá palpite: sugere e curte; não escolhe nem tira a ideia dos outros.
const vistaAvo = await data(avo);
check(vistaAvo.nameIdeas.length === 2 && vistaAvo.babyName === null, 'a avó vê as ideias de nome');
check((await avo.call('/api/data', { op: 'addNameIdea', name: 'Cecília' })).status === 200, 'a avó sugere um nome');
check((await avo.call('/api/data', { op: 'likeNameIdea', id: helena.id, on: true })).status === 200, 'e curte a Helena');
check((await avo.call('/api/data', { op: 'deleteNameIdea', id: helena.id })).status === 404, 'mas não tira a ideia dos outros');
check((await avo.call('/api/data', { op: 'setBabyName', name: 'Cecília' })).status === 403, 'nem escolhe o nome (quem escolhe é o casal)');
ideas = (await data(ana)).nameIdeas;
check(ideas.find(i => i.name === 'Helena').likes.length === 3 && ideas.some(i => i.name === 'Cecília' && i.author_role === 'familia'), 'o casal vê as curtidas e a sugestão da avó');

// O casal escolhe; as ideias ficam como parte da história.
check((await ana.call('/api/data', { op: 'setBabyName', name: 'Helena' })).status === 200, 'Ana e Caio escolhem Helena');
check((await data(avo)).babyName === 'Helena', 'a avó vê o nome escolhido');
check((await data(caio)).nameIdeas.length === 3, 'e as ideias continuam guardadas');
const cecilia = ideas.find(i => i.name === 'Cecília');
check((await caio.call('/api/data', { op: 'deleteNameIdea', id: cecilia.id })).status === 200, 'o casal pode tirar qualquer ideia');

finish();
