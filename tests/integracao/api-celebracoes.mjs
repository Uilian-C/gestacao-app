// Celebrações (migração 028): o casal organiza o chá de bebê, com roteiro de tarefas, fornecedores, convidados e ideias.
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client(), avo = client(), outra = client();
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
await account(outra, 'Bia');
await outra.call('/api/family', { op: 'create', role: 'mae' });
const data = async c => (await c.call('/api/data')).data;

check(Array.isArray((await data(ana)).celebrations) && (await data(ana)).celebrations.length === 0, 'começa sem celebrações');
check((await ana.call('/api/data', { op: 'createCelebration', kind: 'cha_bebe', title: 'Chá de bebê' })).status === 200, 'Ana cria o chá de bebê');
let [cha] = (await data(caio)).celebrations;
const tarefas = cha.items.filter(i => i.kind === 'tarefa');
check(cha.kind === 'cha_bebe' && tarefas.length === 11, 'nasce com o roteiro de tarefas');
check(tarefas.every(t => t.due_offset > 0 && t.assigned_to === 'casal' && !t.done), 'cada tarefa com "X dias antes", dos dois');

check((await caio.call('/api/data', { op: 'updateCelebration', id: cha.id, title: 'Chá da Helena', eventAt: '2026-12-12T15:00:00-03:00', location: 'Salão do prédio', theme: 'Ursinhos', colors: ['#f6c1cf', '#fbe6b6'], budget: 1500 })).status === 200, 'Caio marca a data, o lugar e o tema');
const fornecedor = { op: 'addCelebrationItem', celebrationId: cha.id, kind: 'fornecedor', title: 'Bolo da Dona Neide', contact: '11999990000', amount: 350, status: 'contratado' };
check((await ana.call('/api/data', fornecedor)).status === 200, 'Ana guarda um fornecedor');
await ana.call('/api/data', { op: 'addCelebrationItem', celebrationId: cha.id, kind: 'convidado', title: 'Tia Lu', people: 2, status: 'vai' });
await ana.call('/api/data', { op: 'addCelebrationItem', celebrationId: cha.id, kind: 'ideia', title: 'Varal de fotos da barriga' });
check((await ana.call('/api/data', { op: 'addCelebrationItem', celebrationId: cha.id, kind: 'convidado', title: 'X', status: 'pago' })).status === 400, 'situação fora da lista não entra');
[cha] = (await data(caio)).celebrations;
check(cha.title === 'Chá da Helena' && cha.theme === 'Ursinhos' && cha.colors.length === 2 && Number(cha.budget) === 1500, 'Caio vê o que mudou');
check(cha.items.some(i => i.kind === 'fornecedor' && Number(i.amount) === 350) && cha.items.some(i => i.kind === 'convidado' && i.people === 2), 'e as fichas do evento');

const primeira = cha.items.find(i => i.kind === 'tarefa');
check((await caio.call('/api/data', { op: 'updateCelebrationItem', id: primeira.id, title: primeira.title, dueOffset: primeira.due_offset, assignedTo: 'pai', done: true })).status === 200, 'Caio conclui uma tarefa e fica com ela');
[cha] = (await data(ana)).celebrations;
const feita = cha.items.find(i => i.id === primeira.id);
check(feita.done && feita.assigned_to === 'pai', 'Ana vê a tarefa feita');
check((await caio.call('/api/data', { op: 'updateCelebrationItem', id: primeira.id, title: primeira.title, status: 'vai' })).status === 400, 'tarefa não ganha situação de convidado');

// Por enquanto, só o casal organiza: a família não vê nem mexe.
check(!(await data(avo)).celebrations?.length, 'a família ainda não vê as celebrações');
check((await avo.call('/api/data', { op: 'addCelebrationItem', celebrationId: cha.id, kind: 'ideia', title: 'Palpite' })).status === 403, 'nem adiciona fichas');
// Outra família não alcança.
check((await outra.call('/api/data', { op: 'deleteCelebration', id: cha.id })).status === 404, 'outra família não apaga a celebração');
check((await outra.call('/api/data', { op: 'addCelebrationItem', celebrationId: cha.id, kind: 'ideia', title: 'x' })).status === 404, 'nem adiciona nela');

const ideia = cha.items.find(i => i.kind === 'ideia');
check((await ana.call('/api/data', { op: 'deleteCelebrationItem', id: ideia.id })).status === 200, 'apaga uma ficha');
check((await ana.call('/api/data', { op: 'deleteCelebration', id: cha.id })).status === 200, 'apaga a celebração');
check((await data(caio)).celebrations.length === 0, 'e as fichas vão junto');

finish();
