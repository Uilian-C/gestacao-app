// Notificações de verdade, ponta a ponta: o servidor cifra e envia para o push falso, que decifra.
// Confere preferências, aviso ao parceiro, lembretes do dia, nada repetido e aparelho removido (410).
import { check, client, finish, PUSH, wait } from './lib.mjs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // o push falso usa certificado próprio
const stamp = Date.now();
const dev = async id => (await fetch(`${PUSH}/new?id=${id}${stamp}`)).json();
const inbox = async () => (await fetch(`${PUSH}/inbox`)).json();
const of = (list, id) => list.filter(m => m.device === `${id}${stamp}`).map(m => m.payload);
const ymd = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const today = ymd(new Date());
const dum = ymd(new Date(Date.now() - 24 * 7 * 86400000)); // completa 24 semanas hoje

const A = client(), B = client(), anon = client();
await A.call('/api/auth/sign-up/email', { name: 'Ana Souza', email: `ana${stamp}@ex.com`, password: 'senha-forte-1' });
await A.call('/api/family', { op: 'consent', version: '2026-10-16' });
await A.call('/api/family', { op: 'create', role: 'mae' });
await A.call('/api/data', { op: 'saveDum', date: dum });
const code = (await A.call('/api/family', { op: 'invite' })).data.code;
await B.call('/api/auth/sign-up/email', { name: 'Bruno Lima', email: `bruno${stamp}@ex.com`, password: 'senha-forte-2' });
await B.call('/api/family', { op: 'consent', version: '2026-10-16' });
check((await B.call('/api/family', { op: 'join', code, role: 'pai' })).status === 200, 'B entra no espaço de A');

check((await anon.call('/api/push')).status === 401, 'sem login: /api/push devolve 401');
const st = await A.call('/api/push');
check(st.status === 200 && st.data.publicKey.length > 40 && st.data.prefs.parceiro === true, 'chave pública gerada e preferências padrão ligadas');
check((await B.call('/api/push')).data.publicKey === st.data.publicKey, 'a mesma chave para todos (guardada no banco)');

check((await A.call('/api/push', { op: 'subscribe', subscription: await dev('a') })).status === 200, 'A ativa no aparelho');
check((await B.call('/api/push', { op: 'subscribe', subscription: await dev('b') })).status === 200, 'B ativa no aparelho');
check((await B.call('/api/push', { op: 'subscribe', subscription: await dev('gone-b') })).status === 200, 'B ativa num segundo aparelho (que depois some)');
check((await A.call('/api/push', { op: 'subscribe', subscription: { endpoint: 'x', keys: { p256dh: 'y'.repeat(20), auth: 'z'.repeat(10) } } })).status === 400, 'inscrição inválida é recusada');

check((await A.call('/api/push', { op: 'test' })).data?.sent === 1, 'teste chega no aparelho de A');
check((await A.call('/api/push', { op: 'test' })).status === 429, 'segundo teste no mesmo minuto é recusado');
await A.call('/api/data', { op: 'createSymptom', week: 24, date: today, name: 'Azia', intensity: 3, category: 'Físico', notes: null, timeOfDay: null });
await wait(300);
let box = await inbox();
check(of(box, 'a').length === 1 && of(box, 'a')[0].title.startsWith('Notificações do Tumtum'), 'A recebe só o teste (não é avisada do próprio registro)');
check(of(box, 'b').some(p => p.title === 'Ana registrou um sintoma' && p.url === '/?aba=saude' && !JSON.stringify(p).includes('Azia')), 'B é avisado do sintoma, sem o nome do sintoma na tela bloqueada');
check(!(await B.call('/api/push')).data.endpoints.some(e => e.includes('gone')), 'aparelho que sumiu (410) sai da lista');

await B.call('/api/push', { op: 'prefs', consultas: true, momentos: true, jornada: true, parceiro: false });
const before = of(await inbox(), 'b').length;
await A.call('/api/data', { op: 'createMetric', week: 24, date: today, weight: 64, systolic: null, diastolic: null });
await wait(300);
check(of(await inbox(), 'b').length === before, 'B desligou "parceiro": não recebe a medição');

// "Amanhã" no calendário de São Paulo (não no UTC: depois das 21h de Brasília o UTC já virou o dia).
const [ty, tm, td] = today.split('-').map(Number);
const tomorrowYmd = new Date(Date.UTC(ty, tm - 1, td + 1)).toISOString().slice(0, 10);
const tomorrow9 = new Date(`${tomorrowYmd}T09:30:00-03:00`); // 09:30 em São Paulo
await B.call('/api/data', { op: 'createConsultation', scheduledAt: tomorrow9.toISOString(), specialty: 'obstetra', professional: 'Dra. Ana', location: 'Clínica Bem Nascer' });
await A.call('/api/data', { op: 'createEntry', date: today, body: 'Contar para a família', visibility: 'private', remindOn: today });
await wait(300);
check(of(await inbox(), 'a').some(p => p.title === 'Bruno agendou uma consulta'), 'A é avisada da consulta que B agendou');

check((await anon.call('/api/lembretes')).status === 401, 'lembretes sem o segredo: 401');
check((await anon.call('/api/lembretes', undefined, { authorization: 'Bearer errado' })).status === 401, 'lembretes com segredo errado: 401');
const run1 = await anon.call('/api/lembretes', undefined, { authorization: 'Bearer segredo-de-teste' });
check(run1.status === 200, `lembretes rodam (${JSON.stringify(run1.data)})`);
await wait(300);
box = await inbox();
const a = of(box, 'a'), b = of(box, 'b');
check(a.some(p => p.title === 'Consulta amanhã às 09:30' && p.body === 'Dra. Ana · Clínica Bem Nascer'), 'A recebe a véspera da consulta');
check(b.some(p => p.title === 'Consulta amanhã às 09:30'), 'B também recebe a véspera');
check(a.some(p => p.title === 'Lembrete de hoje' && p.body === 'Contar para a família'), 'A recebe o lembrete do momento particular');
check(!b.some(p => p.title === 'Lembrete de hoje'), 'B não recebe o lembrete particular de A');
check(a.some(p => p.title === '24 semanas' && p.body.includes('Curva glicêmica')), 'semana nova com o que abre na jornada');
const count = box.length;
await anon.call('/api/lembretes', undefined, { authorization: 'Bearer segredo-de-teste' });
await wait(300);
check((await inbox()).length === count, 'rodar de novo no mesmo dia não repete nenhum aviso');

const dump = (await A.call('/api/account')).data;
check(dump.notifications?.devices.length === 1 && dump.notifications.prefs === null, 'exportação traz as notificações');
check((await A.call('/api/push', { op: 'unsubscribe', endpoint: `${PUSH}/push/a${stamp}` })).status === 200 && (await A.call('/api/push')).data.endpoints.length === 0, 'A desativa no aparelho');
finish();
