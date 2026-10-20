// Familiares no espaço (migração 023): convite próprio, vagas, o que veem e o que podem fazer.
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client(), avo = client(), tio = client(), estranha = client();
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]).toString('base64');

async function account(c, name) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase().replace(/\s/g, '')}${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
}
await account(ana, 'Ana');
await ana.call('/api/family', { op: 'create', role: 'mae' });
await ana.call('/api/data', { op: 'saveDum', date: '2026-05-15' });
await account(caio, 'Caio');
await caio.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite' })).data.code, role: 'pai' });
const data = async c => (await c.call('/api/data')).data;

// ---- Convite e entrada ----
const start = (await ana.call('/api/family')).data.family;
check(start.slots === 5 && start.relatives.length === 0, 'o espaço começa com 5 vagas de familiares');
const inv = await ana.call('/api/family', { op: 'invite', kind: 'familia' });
check(inv.status === 200 && inv.data.code.length === 10, 'Ana gera convite para a família');
await account(avo, 'Rosa Maria');
const info = (await avo.call('/api/family', { op: 'checkInvite', code: inv.data.code })).data;
check(info.valid && info.kind === 'familia' && info.inviter === 'Ana', 'o convite diz que é para a família, da Ana');
check((await avo.call('/api/family', { op: 'join', code: inv.data.code, relation: 'Avó' })).status === 200, 'Rosa entra como avó');
const fam = (await ana.call('/api/family')).data.family;
check(fam.members.length === 2 && fam.relatives.length === 1 && fam.relatives[0].relation === 'Avó', 'o casal vê a avó na família, separada do casal');
const rosaId = fam.relatives[0].userId;
const avoFam = (await avo.call('/api/family')).data;
check(avoFam.family.role === 'familia', 'para a Rosa, o papel é familia');
check(avoFam.family.members.every(m => m.email === ''), 'familiar não recebe o e-mail do casal');
check(avoFam.data && avoFam.data.familyView === true && avoFam.data.profile.dumDate === '2026-05-15', 'familiar abre o app com a visão da família (com a data para a semana do bebê)');
check(!('symptoms' in avoFam.data) && !('exams' in avoFam.data) && !('consultations' in avoFam.data) && !('tasks' in avoFam.data), 'a visão da família não traz saúde, exames, agenda nem tarefas');

// ---- O que a família vê ----
const entry = (c, body, visibility, folder = 'momento') => c.call('/api/data', { op: 'createEntry', date: '2026-10-15', body, visibility, remindOn: null, folder });
const paraFamilia = (await entry(ana, 'Primeiro ultrassom!', 'family')).data.id;
const doCasal = (await entry(ana, 'Só nosso', 'shared')).data.id;
const meu = (await entry(caio, 'Só meu', 'private')).data.id;
const barriga = (await entry(ana, '', 'family', 'barriga')).data.id;
check((await ana.call('/api/fotos', { op: 'add', entryId: barriga, data: JPG })).status === 200, 'Ana põe a foto da barriga no post da família');
const doCasalFoto = (await ana.call('/api/fotos', { op: 'add', entryId: doCasal, data: JPG })).status;
check(doCasalFoto === 200, 'e uma foto no post só do casal');
await ana.call('/api/data', { op: 'createSymptom', week: 22, date: '2026-10-15', name: 'Enjoo', intensity: 3, category: 'Digestivo', notes: '', timeOfDay: 'Manhã' });

const view = await data(avo);
const ids = view.journal.map(e => e.id);
check(ids.includes(paraFamilia) && ids.includes(barriga), 'a avó vê os posts para a família');
check(!ids.includes(doCasal) && !ids.includes(meu), 'a avó não vê os posts só do casal nem os particulares');
const casal = await data(caio);
check(casal.journal.some(e => e.id === paraFamilia && e.visibility === 'family'), 'o casal continua vendo o post da família no Mural');
check(casal.symptoms.length === 1, 'o casal vê a saúde normalmente');

const fotoFamilia = view.journal.find(e => e.id === barriga).photos[0].id;
check((await avo.raw(`/api/fotos?id=${fotoFamilia}`)).status === 200, 'a avó abre a foto da barriguinha');
const fotoCasal = casal.journal.find(e => e.id === doCasal).photos[0].id;
check((await avo.raw(`/api/fotos?id=${fotoCasal}`)).status === 404, 'a avó não abre a foto do post só do casal');

// ---- O que a família não pode ----
check((await avo.call('/api/exames')).status === 403 || (await avo.call('/api/exames', { op: 'create', kind: 'exame', title: 'x', date: '2026-10-10', planItem: null, notes: null, visibility: 'shared' })).status === 403, 'familiar não chega aos exames');
check((await avo.call('/api/data', { op: 'createSymptom', week: 22, date: '2026-10-15', name: 'x', intensity: 1, category: 'Físico', notes: '', timeOfDay: 'Manhã' })).status === 403, 'familiar não registra saúde');
check((await avo.call('/api/data', { op: 'createEntry', date: '2026-10-15', body: 'Oi', visibility: 'family', remindOn: null })).status === 403, 'familiar não posta no Mural');
check((await avo.call('/api/data', { op: 'saveDum', date: '2026-01-01' })).status === 403, 'familiar não muda a data da gestação');
check((await avo.call('/api/data', { op: 'checkin', day: '2026-10-15', mood: 'bem' })).status === 403, 'familiar não marca humor do casal');
check((await avo.call('/api/data', { op: 'react', targetType: 'entry', targetId: doCasal, kind: 'abraco', on: true })).status === 404, 'familiar não reage a post só do casal');
check((await avo.call('/api/data', { op: 'comment', targetType: 'entry', targetId: doCasal, body: 'oi' })).status === 404, 'familiar não comenta post só do casal');
check((await avo.call('/api/family', { op: 'invite', kind: 'familia' })).status === 403, 'familiar não convida ninguém');
check((await avo.call('/api/family', { op: 'removeMember', userId: fam.members[0].userId })).status === 403, 'familiar não remove o casal');
check((await avo.call('/api/fotos', { op: 'add', entryId: barriga, data: JPG })).status === 403, 'familiar não põe foto nos posts');
check((await avo.call('/api/account', { op: 'deleteSpace', confirm: 'EXCLUIR' })).status === 403, 'familiar não exclui o espaço');
const exp = (await avo.raw('/api/account')).bytes.toString();
check(!exp.includes('Enjoo') && !exp.includes('Primeiro ultrassom'), 'os dados baixados pela avó não trazem nada do casal');

// ---- Abraço e conversa ----
check((await avo.call('/api/data', { op: 'react', targetType: 'entry', targetId: paraFamilia, kind: 'abraco', on: true })).status === 200, 'a avó manda um abraço no post');
const c1 = await avo.call('/api/data', { op: 'comment', targetType: 'entry', targetId: paraFamilia, body: 'Que lindo! Já amo esse bebê.' });
check(c1.status === 200 && c1.data.data.threads.length === 1, 'a avó comenta (e recebe a visão da família atualizada)');
const seen = await data(ana);
const comentario = seen.threads.find(t => t.target_id === paraFamilia);
check(comentario && comentario.author_role === 'familia' && comentario.author_id === rosaId, 'o casal vê o comentário da avó, com quem escreveu');
check(seen.reactions.some(r => r.target_id === paraFamilia && r.author_role === 'familia'), 'e o abraço dela');
check((await caio.call('/api/data', { op: 'comment', targetType: 'entry', targetId: paraFamilia, body: 'Obrigado, vó!' })).status === 200, 'Caio responde');
check((await data(avo)).threads.length === 2, 'a avó vê a resposta do Caio');
check((await avo.call('/api/data', { op: 'deleteComment', id: comentario.id })).status === 200, 'a avó apaga o próprio comentário');
const doCaio = (await data(avo)).threads[0].id;
check((await avo.call('/api/data', { op: 'deleteComment', id: doCaio })).status === 404, 'mas não o do Caio');

let limited = false;
for (let i = 0; i < 21 && !limited; i++) limited = (await avo.call('/api/data', { op: 'comment', targetType: 'entry', targetId: paraFamilia, body: `oi ${i}` })).status === 429;
check(limited, 'comentários demais em uma hora são barrados');

// ---- Parentesco e vagas ----
check((await avo.call('/api/family', { op: 'setRelation', userId: rosaId, relation: 'Vovó' })).status === 200, 'a avó ajusta o próprio parentesco');
check((await ana.call('/api/family', { op: 'setRelation', userId: rosaId, relation: 'Avó materna' })).data.family.relatives[0].relation === 'Avó materna', 'o casal também ajusta');
check((await avo.call('/api/family', { op: 'setRole', role: 'mae' })).status === 403, 'familiar não vira mãe nem pai');

await account(tio, 'Tio Beto');
const casalInv = (await ana.call('/api/family', { op: 'invite' })).data.code;
check((await tio.call('/api/family', { op: 'join', code: casalInv, role: 'pai' })).status === 409, 'convite do casal não deixa entrar um terceiro pai ou mãe');
const famInvites = [];
for (let i = 0; i < 4; i++) famInvites.push((await caio.call('/api/family', { op: 'invite', kind: 'familia' })).data.code);
for (let i = 0; i < 4; i++) {
  const extra = client();
  await account(extra, `Prima ${i}`);
  await extra.call('/api/family', { op: 'join', code: famInvites[i], relation: 'Prima' });
}
check((await ana.call('/api/family')).data.family.relatives.length === 5, 'com 5 familiares, o espaço está cheio');
check((await ana.call('/api/family', { op: 'invite', kind: 'familia' })).status === 409, 'cheio: não gera mais convite para a família');

// ---- Saída ----
check((await ana.call('/api/family', { op: 'removeMember', userId: rosaId })).status === 200, 'Ana remove a avó');
check((await avo.call('/api/data')).status === 403, 'a avó perde o acesso na hora');
check((await data(ana)).threads.every(t => t.author_role !== 'familia' || t.author_id !== rosaId), 'os comentários dela saem junto');
await account(estranha, 'Estranha');
check((await estranha.call('/api/family', { op: 'join', code: inv.data.code, relation: 'Tia' })).status === 404, 'o convite da avó não vale de novo');

finish();
