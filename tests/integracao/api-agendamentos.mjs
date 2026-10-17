// Agendamentos de consulta, exame, ultrassom e vacina, e o resultado ligado ao agendamento.
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

// ---- Agendar ----
const base = { scheduledAt: '2026-10-13T17:00:00.000Z', specialty: 'ultrassom', professional: 'Clínica Imagem', location: null };
const created = await ana.call('/api/data', { op: 'createConsultation', ...base, kind: 'ultrassom', title: 'Ultrassom morfológico do 2º trimestre', planItem: 'morfo-2' });
check(created.status === 200, 'Ana agenda um ultrassom');
let d = await data(caio);
const usg = d.consultations.find(c => c.kind === 'ultrassom');
check(usg && usg.title === 'Ultrassom morfológico do 2º trimestre' && usg.plan_item === 'morfo-2', 'Caio vê o ultrassom com nome e item da jornada');
const legacy = await ana.call('/api/data', { op: 'createConsultation', scheduledAt: '2026-10-20T12:00:00.000Z', specialty: 'obstetra', professional: null, location: null });
check(legacy.status === 200 && (await data(ana)).consultations.find(c => c.specialty === 'obstetra').kind === 'consulta', 'sem tipo (app antigo), vira consulta');
check((await ana.call('/api/data', { op: 'createConsultation', ...base, kind: 'cirurgia' })).status === 400, 'tipo desconhecido é recusado');
await ana.call('/api/data', { op: 'updateConsultation', id: usg.id, ...base, professional: 'Clínica Nova' });
d = await data(ana);
check(d.consultations.find(c => c.id === usg.id).kind === 'ultrassom' && d.consultations.find(c => c.id === usg.id).professional_name === 'Clínica Nova', 'editar sem mandar o tipo mantém o tipo');
check((await bia.call('/api/data', { op: 'updateConsultation', id: usg.id, ...base, kind: 'vacina', title: 'x' })).status === 404, 'Bia (outra família) não edita');

// ---- Resultado ligado ao agendamento ----
check((await bia.call('/api/exames', { op: 'create', kind: 'ultrassom', title: 'x', date: '2026-10-13', visibility: 'shared', appointmentId: usg.id })).status === 404, 'Bia não liga resultado ao agendamento de outra família');
const exam = await caio.call('/api/exames', { op: 'create', kind: 'ultrassom', title: 'Morfológico', date: '2026-10-13', planItem: 'morfo-2', visibility: 'shared', appointmentId: usg.id });
check(exam.status === 200, 'Caio guarda o resultado do ultrassom agendado');
check((await data(ana)).exams.find(e => e.id === exam.data.id).appointment_id === usg.id, 'resultado volta ligado ao agendamento');
const loose = await ana.call('/api/exames', { op: 'create', kind: 'exame', title: 'Hemograma', date: '2026-10-10', visibility: 'shared' });
check((await data(ana)).exams.find(e => e.id === loose.data.id).appointment_id === null, 'resultado sem agendamento também vale');

// ---- Apagar o agendamento não apaga o resultado ----
await ana.call('/api/data', { op: 'delete', kind: 'consultation', id: usg.id });
d = await data(caio);
check(!d.consultations.some(c => c.id === usg.id) && d.exams.find(e => e.id === exam.data.id)?.appointment_id === null, 'apagar o agendamento mantém o resultado (sem a ligação)');

finish();
