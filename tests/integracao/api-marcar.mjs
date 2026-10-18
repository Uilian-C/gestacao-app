// Marcações: @Nome no diário e nas conversas, tarefa passada para a outra pessoa
// e "quem vai" na agenda (migração 016). Quem é marcado recebe um aviso próprio.
import { check, client, finish, PUSH, wait } from './lib.mjs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // o push falso usa certificado próprio
const stamp = Date.now();
const dev = async id => (await fetch(`${PUSH}/new?id=${id}${stamp}`)).json();
const inbox = async () => (await fetch(`${PUSH}/inbox`)).json();
const titles = async id => {
  await wait(300);
  return (await inbox()).filter(m => m.device === `${id}${stamp}`).map(m => m.payload.title);
};
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const A = client(), B = client();
await A.call('/api/auth/sign-up/email', { name: 'Ana Souza', email: `anam${stamp}@ex.com`, password: 'senha-forte-1' });
await A.call('/api/family', { op: 'consent', version: '2026-10-16' });
await A.call('/api/family', { op: 'create', role: 'mae' });
const code = (await A.call('/api/family', { op: 'invite' })).data.code;
await B.call('/api/auth/sign-up/email', { name: 'Bruno Lima', email: `brunom${stamp}@ex.com`, password: 'senha-forte-2' });
await B.call('/api/family', { op: 'consent', version: '2026-10-16' });
await B.call('/api/family', { op: 'join', code, role: 'pai' });
await A.call('/api/push', { op: 'subscribe', subscription: await dev('ma') });
await B.call('/api/push', { op: 'subscribe', subscription: await dev('mb') });
const novos = async (id, fn) => {
  const before = (await titles(id)).length;
  await fn();
  return (await titles(id)).slice(before);
};
const entry = (c, body, visibility = 'shared') => c.call('/api/data', { op: 'createEntry', date: today, body, visibility, remindOn: null, folder: 'momento' });

// ---- Diário ----
let got = await novos('mb', () => entry(A, 'Olha que lindo, @bruno!'));
check(got.length === 1 && got[0] === 'Ana marcou você no diário', 'marcado no diário: B recebe "Ana marcou você no diário" (e só esse aviso)');
got = await novos('mb', () => entry(A, 'Sem marcar ninguém'));
check(got.length === 1 && got[0] === 'Ana guardou um momento', 'sem marcação: o aviso de sempre');
got = await novos('mb', () => entry(A, '@Bruno segredo', 'private'));
check(got.length === 0, 'registro "só eu" não avisa ninguém, mesmo com @');
check((await novos('ma', () => entry(A, '@Ana eu mesma'))).length === 0, 'marcar a si mesma não avisa');

const sem = await entry(A, 'Primeira versão');
await wait(300);
const id = sem.data.id;
got = await novos('mb', () => A.call('/api/data', { op: 'updateEntry', id, body: 'Agora com @Bruno', visibility: 'shared', remindOn: null }));
check(got.length === 1 && got[0] === 'Ana marcou você no diário', 'editar e marcar avisa quem foi marcado agora');
got = await novos('mb', () => A.call('/api/data', { op: 'updateEntry', id, body: 'Agora com @Bruno, ajustado', visibility: 'shared', remindOn: null }));
check(got.length === 0, 'editar de novo sem marcação nova não avisa');

got = await novos('ma', () => B.call('/api/data', { op: 'comment', targetType: 'entry', targetId: id, body: '@Ána que demais' }));
check(got.length === 1 && got[0] === 'Bruno marcou você num comentário', 'comentário com @ (acento não importa): "Bruno marcou você num comentário"');

// ---- Tarefas ----
const task = (c, assignee) => c.call('/api/data', { op: 'createTask', week: 20, title: 'Montar o berço', assignee, priority: 'Média', dueDate: null, notes: null });
got = await novos('mb', () => task(A, 'pai'));
check(got.length === 1 && got[0] === 'Ana passou uma tarefa para você', 'tarefa para o pai: "Ana passou uma tarefa para você"');
got = await novos('mb', () => task(A, 'casal'));
check(got.length === 1 && got[0] === 'Ana criou uma tarefa', 'tarefa dos dois: o aviso de sempre');
const tasks = (await A.call('/api/data')).data.tasks;
const casal = tasks.find(t => t.assigned_to === 'casal');
const upd = (assignee, c = A) => c.call('/api/data', { op: 'updateTask', id: casal.id, title: casal.task_title, assignee, priority: 'Média', dueDate: null, notes: null });
got = await novos('mb', () => upd('pai'));
check(got.length === 1 && got[0] === 'Ana passou uma tarefa para você', 'passar a tarefa para o pai ao editar também avisa');
got = await novos('mb', () => upd('pai'));
check(got.length === 0, 'editar sem trocar quem cuida não avisa de novo');

// ---- Agenda: quem vai ----
check((await A.call('/api/data')).data.attendeesAvailable === true, 'com a migração 016, o app pergunta quem vai');
const at = new Date(Date.now() + 5 * 86400000).toISOString();
const appt = (attendees, kind = 'consulta') => A.call('/api/data', { op: 'createConsultation', scheduledAt: at, specialty: 'obstetra', professional: null, location: null, kind, title: kind === 'consulta' ? null : 'Hemograma', planItem: null, attendees });
got = await novos('mb', () => appt('casal'));
check(got.length === 1 && got[0] === 'Ana agendou uma consulta e quer você junto', 'consulta para os dois: B recebe "quer você junto"');
got = await novos('mb', () => appt('mae', 'exame'));
check(got.length === 1 && got[0] === 'Ana agendou um exame', 'exame só da mãe: o aviso de sempre');
const exame = (await A.call('/api/data')).data.consultations.find(c => c.kind === 'exame');
check(exame.attendees === 'mae', 'quem vai fica guardado');
const chama = attendees => A.call('/api/data', { op: 'updateConsultation', id: exame.id, scheduledAt: at, specialty: 'ultrassom', professional: null, location: null, kind: 'exame', title: 'Hemograma', planItem: null, attendees });
got = await novos('mb', () => chama('casal'));
check(got.length === 1 && got[0] === 'Ana chamou você para ir junto', 'chamar o pai ao editar: "Ana chamou você para ir junto"');
got = await novos('mb', () => chama('casal'));
check(got.length === 0, 'editar sem mudar quem vai não avisa');
check((await appt('avo')).status === 400, 'quem vai só aceita mãe, pai ou os dois');
const old = await A.call('/api/data', { op: 'createConsultation', scheduledAt: at, specialty: 'obstetra', professional: null, location: null });
check(old.status === 200 && (await A.call('/api/data')).data.consultations.some(c => c.attendees === null), 'app antigo (sem "quem vai") continua agendando');

finish();
