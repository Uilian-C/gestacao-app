// Onda 3 (leveza): os toques leves (abraço, humor, curtir, marcar tarefa ou
// item) respondem só "ok", sem montar todos os dados; o que muda continua
// gravado e aparece na próxima leitura. As outras ações seguem devolvendo os dados.
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client();
async function account(c, name) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}l${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
}
await account(ana, 'Ana');
await ana.call('/api/family', { op: 'create', role: 'mae' });
await ana.call('/api/data', { op: 'saveDum', date: '2026-07-01' });
await account(caio, 'Caio');
await caio.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite' })).data.code, role: 'pai' });
const today = new Date().toLocaleDateString('en-CA');

const tamanho = r => JSON.stringify(r.data).length;
const pesado = await ana.call('/api/data', { op: 'createEntry', date: today, body: 'Ele mexeu', visibility: 'shared', remindOn: null, folder: 'momento' });
check(pesado.status === 200 && pesado.data.data?.journal?.length === 1, 'guardar um registro ainda devolve os dados (o app mostra o post novo)');
const entryId = pesado.data.data.journal[0].id;

for (const [op, body] of [['hug', { day: today }], ['checkin', { day: today, mood: 'bem' }], ['react', { targetType: 'entry', targetId: entryId, kind: 'abraco', on: true }]]) {
  const r = await caio.call('/api/data', { op, ...body });
  check(r.status === 200 && r.data.lite === true && r.data.data === undefined && tamanho(r) < 40, `${op}: a resposta é só "ok" (${tamanho(r)} bytes em vez de todos os dados)`);
}
await caio.call('/api/data', { op: 'createTask', week: 22, title: 'Montar o berço', assignee: 'pai', priority: 'Média', dueDate: null, notes: null });
const task = (await caio.call('/api/data')).data.tasks[0];
check((await caio.call('/api/data', { op: 'toggleTask', id: task.id, done: true })).data.lite === true, 'marcar a tarefa também é leve');

const d = (await ana.call('/api/data')).data;
check(d.hugs.some(h => !h.toMe === false || h.toMe) && d.checkins.some(c => !c.mine && c.mood === 'bem'), 'o abraço e o humor do Caio estão gravados e chegam para a Ana');
check(d.reactions.some(r => r.target_id === entryId), 'a reação também');
check(d.tasks.find(t => t.id === task.id).is_completed, 'e a tarefa marcada');

finish();
