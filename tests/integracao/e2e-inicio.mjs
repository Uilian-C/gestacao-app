// Início como painel do casal: o coração continua batendo, os marcos da
// gestação, "Vocês dois hoje" (check-in com confirmação e abraço), o próximo
// compromisso em destaque, as novidades do Mural e as tarefas de cada um.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
await quickAccount(mae, { name: 'Ana' });
const post = (p, path, body) => p.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);

// ---- Sozinha, sem nada marcado ----
await mae.getByText('Nada agendado por enquanto').waitFor({ timeout: 10000 });
check(true, 'sem agendamento: convite para agendar no lugar do destaque');
const eco = mae.locator('.tt-bebe-eco').first();
check((await eco.count()) === 1 && (await eco.evaluate(el => getComputedStyle(el).animationName)) !== 'none', 'o coração do bebê continua pulsando (eco animado)');
check(await mae.getByRole('button', { name: /Semana 22 de 40/ }).isVisible(), 'o bebê da semana no centro do Início');
check(await mae.getByText(/Dia \d+ de 280/).isVisible(), 'mostra o dia da gestação');
check(await mae.getByRole('progressbar', { name: 'Quanto da gestação já passou' }).isVisible(), 'barra da gestação com os trimestres');
check(await mae.getByText(/Próximo marco, em [56] semanas.*Começa o 3º trimestre/).isVisible(), 'próximo marco: o 3º trimestre, daqui a umas 6 semanas');
check(await mae.getByRole('heading', { name: 'Como você está hoje?' }).isVisible(), 'sem parceiro, o check-in pergunta só por ela');

// ---- Parceiro, agenda, tarefas e diário ----
const code = (await post(mae, '/api/family', { op: 'invite' })).code;
const pai = await phone(b);
await pai.goto(BASE);
await post(pai, '/api/auth/sign-up/email', { name: 'Caio Souza', email: `caio${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(pai, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(pai, '/api/family', { op: 'join', code, role: 'pai' });
const iso = n => mae.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const at = async (n, t) => mae.evaluate(([d, t]) => new Date(`${d}T${t}:00`).toISOString(), [await iso(n), t]);
// O ultrassom é daqui a meia hora: é o próximo compromisso.
const soon = await mae.evaluate(() => new Date(Date.now() + 30 * 60000).toISOString());
await post(mae, '/api/data', { op: 'createConsultation', scheduledAt: soon, specialty: 'ultrassom', professional: 'Clínica Imagem', location: 'Av. Paulista, 1000, São Paulo', kind: 'ultrassom', title: 'Ultrassom morfológico', planItem: 'morfo-2', attendees: 'casal' });
await post(mae, '/api/data', { op: 'createConsultation', scheduledAt: await at(3, '09:00'), specialty: 'outra', professional: null, location: null, kind: 'vacina', title: 'Vacina dTpa' });
await post(mae, '/api/data', { op: 'createConsultation', scheduledAt: await at(20, '09:00'), specialty: 'obstetra', professional: null, location: null });
const task = (title, assignee, dueDate = null) => post(mae, '/api/data', { op: 'createTask', week: 22, title, assignee, priority: 'Média', dueDate, notes: null });
await task('Montar o berço', 'pai');
await task('Lista do enxoval', 'casal', await iso(5));
await task('Marcar a fisioterapia', 'mae', await iso(-2));
await post(pai, '/api/data', { op: 'createEntry', date: await iso(-1), body: 'Senti você mexer pela primeira vez, @Ana!', visibility: 'shared', remindOn: null, folder: 'momento' });
await mae.reload();

const hero = mae.getByRole('region', { name: 'Próximo compromisso' });
await hero.waitFor();
check(await hero.getByText(/^(Hoje|Amanhã), \d\d:\d\d$/).isVisible() && (await hero.getByText(/Ultrassom morfológico/).isVisible()), 'próximo compromisso em destaque: quando e o quê');
check(await hero.getByText('Vão Ana e Caio').isVisible(), 'com quem vai');
check(await hero.getByText('Av. Paulista, 1000, São Paulo').isVisible(), 'e o endereço com o caminho');
check((await mae.locator('section[aria-labelledby="hoje-titulo"]').getByText('Ultrassom morfológico').count()) === 0, 'o destaque não se repete em "Hoje"');
const week = mae.locator('section[aria-labelledby="semana-titulo"]');
check(await week.getByText('Vacina dTpa').isVisible() && (await week.getByText(/Obstetra/).count()) === 0, 'próximos 7 dias: a vacina, e não a consulta daqui a 20 dias');

const juntos = mae.locator('section[aria-labelledby="checkin-titulo"]');
const postCaio = juntos.getByRole('button', { name: /^Momento de Caio: abrir/ });
check(await postCaio.isVisible() && (await postCaio.getByText(/Senti você mexer/).isVisible()), '"Vocês dois hoje" traz o post do Caio no Mural');
check(await postCaio.getByText('marcou você').isVisible(), 'e mostra que ele marcou a Ana');
check(await juntos.getByRole('button', { name: 'Ver o mural' }).isVisible(), 'com o atalho "Ver o mural"');

const tasks = mae.locator('section[aria-labelledby="tarefas-casal"]');
check(await tasks.getByText(/Caio · 1/).isVisible() && (await tasks.getByText(/Ana · 1/).isVisible()) && (await tasks.getByText(/Os dois · 1/).isVisible()), 'tarefas: quantas faltam para cada um');
check(await tasks.getByText('1 atrasada').isVisible(), 'e quantas estão atrasadas');
const mine = tasks.getByRole('button', { name: /^Concluir/ });
check((await mine.count()) === 2 && (await mine.first().getAttribute('aria-label')) === 'Concluir "Marcar a fisioterapia"', 'suas próximas: a atrasada primeiro (sem a do Caio)');
await mine.first().click();
await tasks.getByText('Marcar a fisioterapia').waitFor({ state: 'hidden', timeout: 10000 });
check(await tasks.getByText(/Ana · 0/).isVisible(), 'concluir pelo Início tira da lista');
check(await mae.getByText('Para o pai', { exact: true }).isVisible() && (await mae.getByText('Seu corpo', { exact: true }).isVisible()), 'cartões da semana: corpo e dica para o pai');

// ---- Vocês dois hoje ----
const card = mae.locator('section[aria-labelledby="checkin-titulo"]');
check(await card.getByRole('heading', { name: 'Vocês dois hoje' }).isVisible() && (await card.getByText('Ainda não contou').isVisible()), 'com o parceiro: os dois lado a lado (Caio ainda não respondeu)');
await card.getByRole('button', { name: 'Cansada' }).click();
await card.getByRole('status').getByText('Registrado. Caio vai ver.').waitFor({ timeout: 10000 });
check((await card.getByRole('button', { name: 'Cansada' }).count()) === 0, 'depois do toque: "Registrado. Caio vai ver." e as opções fecham');
check(await card.getByText('Cansada', { exact: true }).isVisible(), 'o humor dela aparece no lado dela');
const share = card.getByRole('form', { name: 'Contar no Mural' });
check(await share.getByText('Quer contar no Mural para Caio?').isVisible(), 'depois do humor: pergunta se quer contar no Mural');
await share.getByLabel('Quer dizer mais alguma coisa?').fill('Dormi pouco essa noite.');
await share.getByRole('button', { name: 'Postar no Mural' }).click();
await card.getByText('Postado no Mural.').waitFor({ timeout: 10000 });
check(true, 'posta no Mural com um toque');
await card.getByRole('button', { name: 'Trocar' }).click();
check((await card.getByRole('button', { name: 'Cansada' }).getAttribute('aria-pressed')) === 'true', '"Trocar" reabre as opções com a resposta marcada');
await card.getByRole('button', { name: 'Cansada' }).click();
await mae.screenshot({ path: `${OUT}inicio-mae.png`, fullPage: true });

await pai.reload();
await pai.getByRole('button', { name: /^Diário/ }).first().click();
check(await pai.getByRole('article', { name: /^Dia a dia de Ana/ }).getByText('Hoje estou cansada. Dormi pouco essa noite.').isVisible(), 'o humor chega no Mural do pai, como dia a dia');
await pai.getByRole('button', { name: /^Início/ }).first().click();
const cardPai = pai.locator('section[aria-labelledby="checkin-titulo"]');
await cardPai.getByText('Cansada', { exact: true }).waitFor({ timeout: 10000 });
check(await cardPai.getByText(/Assuma uma tarefa da casa/).isVisible(), 'pai vê que a Ana está cansada e uma ideia de cuidado');
check(await cardPai.getByRole('button', { name: 'Cansado' }).isVisible(), 'para o pai, as opções ficam no masculino');
await cardPai.getByRole('button', { name: 'Mandar um abraço' }).click();
await cardPai.getByText('Abraço enviado para Ana').waitFor({ timeout: 10000 });
check(true, 'pai manda um abraço');
await cardPai.getByRole('button', { name: 'Ótimo' }).click();
await cardPai.getByText('Ana vai ver.').waitFor({ timeout: 10000 });
check(true, 'pai responde e vê "Ana vai ver."');
await pai.screenshot({ path: `${OUT}inicio-pai.png`, fullPage: true });

await mae.reload();
await card.getByText('Caio mandou um abraço para você hoje.').waitFor({ timeout: 10000 });
check(await card.getByText('Ótimo', { exact: true }).isVisible(), 'mãe recebe o abraço e vê "Caio: Ótimo"');
check(await mae.getByText(/Caio já passou por aqui hoje/).isVisible(), 'mãe vê que o Caio passou por aqui hoje');

// ---- Diário → Humor: a linha do humor, semana a semana (não é calendário) ----
await card.getByText('Registrado. Caio vai ver.').waitFor({ state: 'hidden', timeout: 10000 });
check(true, 'a confirmação some sozinha (não fica parada no cartão)');
await card.getByRole('button', { name: /ver o histórico/ }).click();
const linha = mae.getByRole('region', { name: 'Linha do humor' });
await linha.waitFor({ timeout: 10000 });
const semana = linha.getByRole('button', { name: /^Semana \d+ \(esta semana\)/ });
check((await semana.getAttribute('aria-expanded')) === 'true', '"Ver o histórico" abre o Diário → Humor, com esta semana aberta');
const dias = linha.getByRole('list', { name: 'Dias da semana' });
check(await dias.getByText('Ana: Cansada').isVisible() && (await dias.getByText('Caio: Ótimo').isVisible()), 'o dia de hoje mostra como cada um estava');
check(await dias.getByText('“Dormi pouco essa noite.”').isVisible(), 'e o recado que veio com o humor');
check((await dias.getByText(/Senti você mexer/).count()) === 0, 'outros posts do diário não entram no Humor');
const resumo = mae.getByRole('region', { name: 'Resumo das últimas 4 semanas' });
check(await resumo.getByText('Cansada: 1').isVisible() && (await resumo.getByText('Ótimo: 1').isVisible()), 'resumo das últimas 4 semanas por pessoa');
check((await mae.getByRole('grid').count()) === 0, 'o Diário não tem calendário (o calendário é o da Agenda)');
await mae.screenshot({ path: `${OUT}humor.png`, fullPage: true });

// ---- Agenda → Calendário: o humor aparece no dia, discreto ----
await mae.getByRole('button', { name: /^Agenda(\s|$)/ }).first().click();
await mae.getByRole('button', { name: 'Calendário' }).click();
const hojeCal = await mae.evaluate(() => new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }));
const celula = mae.getByRole('gridcell', { name: new RegExp(`^${hojeCal}.*humor: Ana cansada, Caio ótimo`) });
await celula.waitFor({ timeout: 10000 });
check(true, 'o calendário da Agenda mostra o humor dos dois no dia');
check(await mae.getByLabel('Humor do dia').getByText(/Ana, cansada/).isVisible(), 'e o detalhe do dia diz como vocês estavam');
await mae.screenshot({ path: `${OUT}agenda-humor.png`, fullPage: true });

// O post do humor da Ana também aparece no "Vocês dois hoje"; "Ver o mural" leva ao Mural.
await mae.getByRole('button', { name: /^Início/ }).first().click();
check(await juntos.getByRole('button', { name: /^Dia a dia de Ana: abrir/ }).isVisible(), 'o post do humor aparece no "Vocês dois hoje"');
await juntos.getByRole('button', { name: 'Ver o mural' }).click();
check(await mae.getByRole('button', { name: /O que vocês querem guardar hoje/ }).isVisible(), '"Ver o mural" abre o Mural');
await b.close();
finish();
