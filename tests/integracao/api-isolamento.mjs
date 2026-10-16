// Isolamento entre famílias, consentimento, convites, permissões, momentos particulares e LGPD, direto na API.
// Precisa do banco recém-criado: usa o código de convite da família antiga (LEGACY_CODE).
import { BASE, check, client, finish } from './lib.mjs';

const LEGACY = process.env.LEGACY_CODE;
const stamp = Date.now();
const A = client(), B = client(), C = client(), anon = client();

check((await anon.call('/api/data')).status === 401, 'sem login: /api/data devolve 401');
check((await anon.call('/api/data', { op: 'saveDum', date: '2026-01-01' })).status === 401, 'sem login: gravar devolve 401');

check((await A.call('/api/auth/sign-up/email', { name: 'Ana', email: `ana${stamp}@ex.com`, password: 'senha-forte-1' })).status === 200, 'A cria conta');
check((await A.call('/api/family', { op: 'create', role: 'mae' })).status === 403, 'sem consentimento não cria espaço');
check((await A.call('/api/family')).data.consent.accepted === false, 'consentimento começa pendente');
check((await A.call('/api/family', { op: 'consent', version: '2000-01-01' })).status === 409, 'versão antiga dos termos é recusada');
check((await A.call('/api/family', { op: 'consent', version: '2026-10-16' })).status === 200, 'A aceita os termos');
check((await A.call('/api/data')).status === 403, 'A sem espaço: 403');
check((await A.call('/api/family', { op: 'join', code: LEGACY, role: 'mae' })).status === 200, 'A resgata o espaço atual com o código da migração');
const aData = (await A.call('/api/data')).data;
check(aData.symptoms.length >= 1 && aData.tasks.length >= 1, `A vê os dados antigos (${aData.symptoms.length} sintoma, ${aData.tasks.length} tarefa)`);
check((await B.call('/api/family', { op: 'join', code: LEGACY, role: 'pai' })).status === 401, 'B sem login não usa o código');

check((await B.call('/api/auth/sign-up/email', { name: 'Bia', email: `bia${stamp}@ex.com`, password: 'senha-forte-2' })).status === 200, 'B (outra família) cria conta');
await B.call('/api/family', { op: 'consent', version: '2026-10-16' });
check((await B.call('/api/family', { op: 'join', code: LEGACY, role: 'mae' })).status === 404, 'código já usado não vale de novo');
check((await B.call('/api/family', { op: 'create', role: 'mae' })).status === 200, 'B cria o próprio espaço');
const bData = (await B.call('/api/data')).data;
check(bData.symptoms.length === 0 && bData.tasks.length === 0 && bData.profile.dumDate === null, 'B não vê nada da família A');

const aSym = aData.symptoms[0].id, aTask = aData.tasks[0];
await B.call('/api/data', { op: 'delete', kind: 'symptom', id: aSym });
await B.call('/api/data', { op: 'toggleTask', id: aTask.id, done: !aTask.is_completed });
await B.call('/api/data', { op: 'answerQuestion', id: aSym, answer: 'x' });
check((await B.call('/api/data', { op: 'createComment', symptomId: aSym, text: 'invasão' })).status === 404, 'B não comenta sintoma da família A');
const aAfter = (await A.call('/api/data')).data;
check(aAfter.symptoms.some(s => s.id === aSym), 'B não consegue apagar sintoma da família A');
check(aAfter.tasks.find(t => t.id === aTask.id).is_completed === aTask.is_completed, 'B não consegue marcar tarefa da família A');
check(aAfter.comments.length === aData.comments.length, 'nenhum comentário entrou na família A');

check((await B.call('/api/data', { op: 'createSymptom', week: 10, date: '2026-10-16', name: 'Enjoo', intensity: 3, category: 'Digestivo', notes: '', timeOfDay: 'Manhã', created_by: 'pai' })).status === 200, 'B registra sintoma');
check((await A.call('/api/data')).data.symptoms.every(s => s.symptom_name !== 'Enjoo'), 'sintoma de B não aparece para A');
check((await B.call('/api/data')).data.symptoms[0].created_by === 'mae', 'autor vem do login (ignora created_by enviado)');

const inv = await A.call('/api/family', { op: 'invite' });
check(inv.status === 200 && inv.data.code.length === 10, `A gera convite (${inv.data.code})`);
check((await C.call('/api/auth/sign-up/email', { name: 'Caio', email: `caio${stamp}@ex.com`, password: 'senha-forte-3' })).status === 200, 'C (pai) cria conta');
await C.call('/api/family', { op: 'consent', version: '2026-10-16' });
const chk = await C.call('/api/family', { op: 'checkInvite', code: inv.data.code.toLowerCase() });
check(chk.data.valid && chk.data.inviter === 'Ana', 'C vê que o convite é da Ana (código sem diferenciar maiúsculas)');
check((await C.call('/api/family', { op: 'join', code: inv.data.code, role: 'pai' })).status === 200, 'C entra no espaço de A');
const cData = (await C.call('/api/data')).data;
check(cData.symptoms.length === aAfter.symptoms.length, 'C vê os mesmos dados de A');
await C.call('/api/data', { op: 'createTask', week: 22, title: 'Comprar fraldas', assignee: 'pai', priority: 'Média', dueDate: '', notes: '' });
const t = (await A.call('/api/data')).data.tasks.find(x => x.task_title === 'Comprar fraldas');
check(t && t.created_by === 'pai', 'tarefa criada pelo pai aparece para a mãe, como "pai"');
const fam = (await A.call('/api/family')).data.family;
check(fam.members.length === 2 && fam.members.map(m => m.role).join() === 'mae,pai', 'espaço de A tem mãe e pai');

check((await B.call('/api/family', { op: 'removeMember', userId: fam.members[1].userId })).status === 404, 'B não remove membro de outro espaço');
check((await B.call('/api/data', { op: 'saveDum', date: '2026-01-01' }, { origin: 'https://site-malicioso.com' })).status === 403, 'POST de outro site é bloqueado');
check((await B.call('/api/data', { op: 'createSymptom', week: 99, date: 'ontem', name: '', intensity: 9 })).status === 400, 'dados inválidos são recusados');
check((await A.call('/api/family', { op: 'join', code: inv.data.code, role: 'mae' })).status === 409, 'quem já tem espaço não entra em outro');

check((await A.call('/api/family')).data.family.members.length === 2, 'espaço de A continua com 2 pessoas');
check((await C.call('/api/family', { op: 'removeMember', userId: fam.members[0].userId })).status === 200, 'pai (C) pode remover a mãe: poderes iguais');
check((await A.call('/api/data')).status === 403, 'A removida perde o acesso na hora');
check((await C.call('/api/family', { op: 'removeMember', userId: fam.members[1].userId })).status === 409, 'último membro não pode sair (dados ficariam órfãos)');
// ---- Jornada e mala ----
check((await C.call('/api/data', { op: 'setCheck', list: 'prenatal', itemId: 'morfo-1', done: true })).status === 200, 'C marca exame como feito');
check((await C.call('/api/data', { op: 'setCheck', list: 'prenatal', itemId: 'morfo-1', done: true })).status === 200, 'marcar de novo não duplica');
check((await C.call('/api/data')).data.checks.filter(c => c.item_id === 'morfo-1').length === 1, 'aparece uma vez');
check((await B.call('/api/data')).data.checks.length === 0, 'B (outra família) não vê a lista');
check((await C.call('/api/data', { op: 'setCheck', list: 'outra', itemId: 'x', done: true })).status === 400, 'lista desconhecida é recusada');
check((await C.call('/api/data', { op: 'setCheck', list: 'mala', itemId: "x'; drop table", done: true })).status === 400, 'id inválido é recusado');
await C.call('/api/data', { op: 'setCheck', list: 'prenatal', itemId: 'morfo-1', done: false });
check((await C.call('/api/data')).data.checks.length === 0, 'desmarcar remove');
check((await C.call('/api/places?q=ab')).data.suggestions.length === 0, 'busca de endereço com menos de 3 letras não consulta');
check((await anon.call('/api/places?q=Avenida Paulista')).status === 401, 'busca de endereço exige login');

// ---- LGPD: exportar e excluir ----
const exp = await fetch(BASE + '/api/account', { headers: { cookie: '' } });
check(exp.status === 401, 'exportar sem login: 401');
const D = client();
await D.call('/api/auth/sign-up/email', { name: 'Dani', email: `dani${stamp}@ex.com`, password: 'senha-forte-4' });
await D.call('/api/family', { op: 'consent', version: '2026-10-16' });
await D.call('/api/family', { op: 'create', role: 'mae' });
await D.call('/api/data', { op: 'saveDum', date: '2026-05-01' });
await D.call('/api/data', { op: 'createSymptom', week: 20, date: '2026-10-16', name: 'Azia', intensity: 3, category: 'Digestivo', notes: null, timeOfDay: 'Noite' });
const E = client();
await E.call('/api/auth/sign-up/email', { name: 'Edu', email: `edu${stamp}@ex.com`, password: 'senha-forte-5' });
await E.call('/api/family', { op: 'consent', version: '2026-10-16' });
const invD = (await D.call('/api/family', { op: 'invite' })).data.code;
await E.call('/api/family', { op: 'join', code: invD, role: 'pai' });
// ---- Momentos: particular x compartilhado ----
check((await D.call('/api/data', { op: 'createEntry', date: '2026-10-16', body: 'SEGREDO-da-Dani', visibility: 'private', remindOn: '2026-10-31' })).status === 200, 'D guarda momento particular com lembrete');
check((await D.call('/api/data', { op: 'createEntry', date: '2026-10-16', body: 'Contamos no trabalho', visibility: 'shared', remindOn: null })).status === 200, 'D guarda momento compartilhado');
const dj = (await D.call('/api/data')).data.journal;
const ej = (await E.call('/api/data')).data.journal;
check(dj.length === 2 && dj.every(e => e.mine), 'D vê os dois momentos, marcados como dela');
check(ej.length === 1 && ej[0].body === 'Contamos no trabalho' && !ej[0].mine, 'E (mesmo espaço) só vê o compartilhado');
check(!JSON.stringify((await E.call('/api/account')).data).includes('SEGREDO'), 'exportação de E não traz o particular de D');
check((await E.call('/api/data', { op: 'deleteEntry', id: ej[0].id })).status === 404, 'E não apaga momento de D');
check((await B.call('/api/data')).data.journal.length === 0, 'outra família não vê nada');
check((await D.call('/api/data', { op: 'createEntry', date: 'ontem', body: '', visibility: 'publico' })).status === 400, 'momento inválido é recusado');
const dump = (await D.call('/api/account')).data;
check(dump.account.email.startsWith('dani') && dump.space.symptoms_log.length === 1 && dump.space.members.length === 2 && dump.consents.length === 1, 'exportação traz conta, consentimento, membros e registros');
check(!JSON.stringify(dump).includes(`ana${stamp}`), 'exportação não traz nada de outra família');
check((await D.call('/api/account', { op: 'deleteAccount', confirm: 'excluir' })).status === 400, 'exclusão exige digitar EXCLUIR');
check((await D.call('/api/account', { op: 'deleteAccount', confirm: 'EXCLUIR' })).status === 200, 'D exclui a conta');
check((await D.call('/api/family')).status === 401, 'conta excluída perde a sessão');
check((await D.call('/api/auth/sign-in/email', { email: `dani${stamp}@ex.com`, password: 'senha-forte-4' })).status !== 200, 'conta excluída não entra mais');
const eData = (await E.call('/api/data')).data;
check(eData.journal.length === 1, 'com D excluída, o compartilhado fica no espaço');
check(eData.symptoms.length === 1, 'com outra pessoa no espaço, os registros ficam para ela');
check((await E.call('/api/account', { op: 'deleteSpace', confirm: 'EXCLUIR' })).status === 200, 'E exclui o espaço');
check((await E.call('/api/family')).data.family === null, 'E continua com conta, sem espaço');
const left = (await fetch(BASE + '/api/config')).status;
check(left === 200, 'API segue no ar');
finish();
