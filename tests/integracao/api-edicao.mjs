// Edição de registros: cada espaço só edita os próprios; momentos, só quem escreveu.
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

const save = async (c, body) => (await c.call('/api/data', body)).data.data;
let d = await save(ana, { op: 'createTask', week: 22, title: 'Montar o berço', assignee: 'pai', priority: 'Média', dueDate: '', notes: '' });
d = await save(ana, { op: 'createSymptom', week: 22, date: '2026-10-16', name: 'Enjoo', intensity: 3, category: 'Digestivo', notes: '', timeOfDay: 'manha' });
d = await save(ana, { op: 'createMetric', week: 22, date: '2026-10-16', weight: 68.4, systolic: null, diastolic: null });
d = await save(ana, { op: 'createConsultation', scheduledAt: '2026-10-20T12:30:00Z', specialty: 'obstetra', professional: 'Dra. Marina', location: null });
d = await save(ana, { op: 'createEntry', date: '2026-10-15', body: 'Sentimos o bebê mexer', visibility: 'shared', remindOn: null });
const [task, sym, metric, cons, entry] = [d.tasks[0], d.symptoms[0], d.metrics[0], d.consultations[0], d.journal[0]];

const edits = [
  ['a tarefa', { op: 'updateTask', id: task.id, title: 'Montar o berço e o trocador', assignee: 'casal', priority: 'Alta', dueDate: '2026-10-25', notes: 'Parafusos extras' }],
  ['o sintoma', { op: 'updateSymptom', id: sym.id, name: 'Enjoo forte', intensity: 4, category: 'Digestivo', notes: 'Pior de manhã', timeOfDay: 'manha' }],
  ['a medição', { op: 'updateMetric', id: metric.id, weight: 68.9, systolic: 110, diastolic: 70 }],
  ['a consulta', { op: 'updateConsultation', id: cons.id, scheduledAt: '2026-10-21T13:00:00Z', specialty: 'obstetra', professional: 'Dra. Marina Lima', location: 'Av. Paulista, 1000' }],
  ['o momento', { op: 'updateEntry', id: entry.id, body: 'Sentimos o bebê mexer pela primeira vez!', visibility: 'shared', remindOn: '2026-11-01' }],
];

// Outra família não edita nada.
for (const [label, body] of edits) check((await bia.call('/api/data', body)).status === 404, `Bia (outra família) não edita ${label}`);
// Caio (mesmo espaço) edita tudo, menos o momento da Ana.
for (const [label, body] of edits.slice(0, 4)) check((await caio.call('/api/data', body)).status === 200, `Caio edita ${label} do espaço`);
check((await caio.call('/api/data', edits[4][1])).status === 404, 'Caio não edita o momento escrito pela Ana');
check((await ana.call('/api/data', edits[4][1])).status === 200, 'Ana edita o próprio momento');

const after = (await ana.call('/api/data')).data;
const t = after.tasks.find(x => x.id === task.id);
check(t.task_title === 'Montar o berço e o trocador' && t.assigned_to === 'casal' && t.priority === 'Alta' && t.due_date === '2026-10-25' && t.notes === 'Parafusos extras', 'tarefa salva com todos os campos novos');
check(t.created_by === 'mae', 'editar não muda quem criou');
const s = after.symptoms.find(x => x.id === sym.id);
check(s.symptom_name === 'Enjoo forte' && s.intensity === 4 && s.notes === 'Pior de manhã' && s.log_date === '2026-10-16', 'sintoma editado mantém a data');
const m = after.metrics.find(x => x.id === metric.id);
check(m.weight_kg === 68.9 && m.systolic_bp === 110 && m.diastolic_bp === 70, 'medição editada');
const c = after.consultations.find(x => x.id === cons.id);
check(c.professional_name === 'Dra. Marina Lima' && c.location === 'Av. Paulista, 1000' && Date.parse(c.scheduled_at) === Date.parse('2026-10-21T13:00:00Z'), 'consulta remarcada');
const e = after.journal.find(x => x.id === entry.id);
check(e.body === 'Sentimos o bebê mexer pela primeira vez!' && e.remind_on === '2026-11-01', 'momento editado com lembrete');

// Validação
check((await ana.call('/api/data', { op: 'updateMetric', id: metric.id, weight: null, systolic: null, diastolic: null })).status === 400, 'medição vazia é recusada');
check((await ana.call('/api/data', { op: 'updateSymptom', id: sym.id, name: '', intensity: 9, category: 'x' })).status === 400, 'sintoma inválido é recusado');
check((await ana.call('/api/data', { ...edits[0][1], id: '00000000-0000-0000-0000-000000000000' })).status === 404, 'tarefa que não existe: 404');

finish();
