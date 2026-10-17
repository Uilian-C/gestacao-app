// Listas editáveis, reações e comentários: o que cada pessoa pode fazer e ver.
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

// ---- Listas ----
check((await ana.call('/api/data', { op: 'addItem', list: 'mala', title: 'Travesseiro de amamentação', bagGroup: 'mae' })).status === 200, 'Ana põe um item próprio na mala');
check((await caio.call('/api/data', { op: 'addItem', list: 'prenatal', title: 'Ecocardiograma fetal', week: 24 })).status === 200, 'Caio põe um item próprio na jornada');
let d = await data(caio);
const bagItem = d.listItems.find(i => i.title === 'Travesseiro de amamentação');
check(bagItem && bagItem.list === 'mala' && bagItem.bag_group === 'mae' && bagItem.created_by === 'mae', 'Caio vê o item da Ana na mala');
check(d.listItems.some(i => i.title === 'Ecocardiograma fetal' && i.week === 24), 'item da jornada com a semana');
check((await data(bia)).listItems.length === 0, 'Bia (outra família) não vê os itens');
check((await bia.call('/api/data', { op: 'updateItem', id: bagItem.id, title: 'invasão' })).status === 404, 'Bia não edita o item');
check((await bia.call('/api/data', { op: 'deleteItem', id: bagItem.id })).status === 404, 'Bia não apaga o item');
check((await caio.call('/api/data', { op: 'updateItem', id: bagItem.id, title: 'Travesseiro e almofada' })).status === 200, 'Caio renomeia o item');
check((await ana.call('/api/data', { op: 'setCheck', list: 'mala', itemId: bagItem.id, done: true })).status === 200, 'item próprio pode ser marcado como separado');
check((await ana.call('/api/data', { op: 'hideItem', list: 'mala', itemId: 'chinelo', hidden: true })).status === 200, 'Ana oculta um item da lista padrão');
d = await data(caio);
check(d.listItems.find(i => i.id === bagItem.id).title === 'Travesseiro e almofada' && d.checks.some(c => c.item_id === bagItem.id), 'nome novo e marcado');
check(d.hiddenItems.some(h => h.list === 'mala' && h.item_id === 'chinelo'), 'item oculto vale para o espaço');
await ana.call('/api/data', { op: 'hideItem', list: 'mala', itemId: 'chinelo', hidden: false });
check(!(await data(ana)).hiddenItems.length, 'item volta a aparecer');
check((await ana.call('/api/data', { op: 'deleteItem', id: bagItem.id })).status === 200, 'Ana apaga o item');
d = await data(ana);
check(!d.listItems.some(i => i.id === bagItem.id) && !d.checks.some(c => c.item_id === bagItem.id), 'item e marcação somem juntos');

// ---- Reações ----
await ana.call('/api/data', { op: 'createEntry', date: '2026-10-15', body: 'Sentimos o bebê mexer', visibility: 'shared', remindOn: null });
await ana.call('/api/data', { op: 'createEntry', date: '2026-10-15', body: 'Segredo meu', visibility: 'private', remindOn: null });
d = await data(ana);
const shared = d.journal.find(e => e.visibility === 'shared'), secret = d.journal.find(e => e.visibility === 'private');
const react = (c, targetId, kind = 'abraco', on = true, targetType = 'entry') => c.call('/api/data', { op: 'react', targetType, targetId, kind, on });
check((await react(caio, shared.id)).status === 200, 'Caio manda um abraço no momento da Ana');
check((await react(caio, shared.id)).status === 200 && (await data(ana)).reactions.length === 1, 'abraço repetido não duplica');
check((await react(caio, secret.id)).status === 404, 'Caio não reage ao momento particular da Ana');
check((await react(bia, shared.id)).status === 404, 'Bia (outra família) não reage');
const rAna = (await data(ana)).reactions[0], rCaio = (await data(caio)).reactions[0];
check(rAna.kind === 'abraco' && rAna.author_role === 'pai' && rAna.mine === false && rCaio.mine === true, 'Ana vê o abraço do pai; para o Caio, é dele');
check((await react(ana, secret.id, 'forca')).status === 200, 'Ana reage ao próprio momento particular');
check((await data(caio)).reactions.length === 1, 'Caio não vê reações do momento particular');
await react(caio, shared.id, 'abraco', false);
check(!(await data(ana)).reactions.some(r => r.target_id === shared.id), 'tirar o abraço remove');

// ---- Comentários ----
const say = (c, targetId, body, targetType = 'entry') => c.call('/api/data', { op: 'comment', targetType, targetId, body });
check((await say(caio, shared.id, 'Que emoção!')).status === 200, 'Caio comenta no momento');
check((await say(caio, secret.id, 'invasão')).status === 404, 'Caio não comenta no particular');
check((await say(bia, shared.id, 'invasão')).status === 404, 'Bia não comenta');
check((await say(ana, secret.id, 'Nota só minha')).status === 200, 'Ana comenta no próprio particular');
const anaThreads = (await data(ana)).threads, caioThreads = (await data(caio)).threads;
check(anaThreads.length === 2 && caioThreads.length === 1 && caioThreads[0].body === 'Que emoção!', 'Caio não vê o comentário do momento particular');
const caioComment = caioThreads[0];
check((await ana.call('/api/data', { op: 'deleteComment', id: caioComment.id })).status === 404, 'Ana não apaga o comentário do Caio');
check((await caio.call('/api/data', { op: 'deleteComment', id: caioComment.id })).status === 200, 'Caio apaga o próprio comentário');

// ---- Exame e tarefa ----
const exam = (await ana.call('/api/exames', { op: 'create', kind: 'ultrassom', title: 'Morfológico', date: '2026-10-10', visibility: 'shared' })).data.id;
check((await react(caio, exam, 'festa', true, 'exam')).status === 200 && (await say(caio, exam, 'Lindo!', 'exam')).status === 200, 'Caio comemora e comenta o ultrassom');
await ana.call('/api/data', { op: 'createTask', week: 22, title: 'Montar o berço', assignee: 'pai', priority: 'Média', dueDate: '', notes: '' });
const task = (await data(ana)).tasks.find(t => t.task_title === 'Montar o berço');
check((await react(ana, task.id, 'festa', true, 'task')).status === 200, 'Ana comemora a tarefa');
check((await ana.call('/api/data', { op: 'comment', targetType: 'task', targetId: task.id, body: 'x' })).status === 400, 'tarefa não tem conversa (só comemorar)');

// ---- Apagar leva junto ----
await react(caio, shared.id);
await say(caio, shared.id, 'De novo');
await ana.call('/api/data', { op: 'deleteEntry', id: shared.id });
d = await data(ana);
check(!d.reactions.some(r => r.target_id === shared.id) && !d.threads.some(c => c.target_id === shared.id), 'apagar o momento apaga reações e conversa');
await ana.call('/api/exames', { op: 'delete', id: exam });
d = await data(caio);
check(!d.reactions.some(r => r.target_id === exam) && !d.threads.some(c => c.target_id === exam), 'apagar o exame apaga reações e conversa');
await ana.call('/api/data', { op: 'delete', kind: 'task', id: task.id });
check(!(await data(ana)).reactions.some(r => r.target_id === task.id), 'apagar a tarefa apaga a comemoração');

finish();
