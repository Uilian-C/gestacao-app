// Cuidados → Jornada no celular, pensada para quem nunca fez pré-natal: o que
// fazer agora, trimestres recolhíveis, pop-up de cada item (por que, como se
// preparar, planejado editável com o combinado da equipe, realizado com
// agendar e "já fizemos"), encaixe automático, links com a Agenda e "revisar
// com a equipe".
import { check, finish, launch, OUT, phone, quickAccount, openCare, openRecord } from './lib.mjs';

const b = await launch();
const p = await phone(b);
// DUM 22 semanas atrás: hoje é a semana 22 (morfológico do 2º tri com a janela aberta).
const dum = new Date();
dum.setDate(dum.getDate() - 22 * 7 - 2);
await quickAccount(p, { dum: dum.toLocaleDateString('en-CA') });
const tab = name => p.getByRole('button', { name: new RegExp(`^${name}(\\s|$)`) }).first().click();
const iso = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const api = path => p.evaluate(async path => (await fetch(path)).json(), path);
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).status, body);
const row = (name, status) => p.getByRole('button', { name: status ? `${name}: ${status}` : new RegExp(`^${name.replace(/[()]/g, '\\$&')}:`) }).first();
const dlg = p.getByRole('dialog');
const TOTG = 'Curva glicêmica (TOTG 75 g)';

// A vacina dTpa foi tomada ontem (agendamento ligado à jornada).
const yesterday = new Date(`${await iso(-1)}T10:00`).toISOString();
await post({ op: 'createConsultation', scheduledAt: yesterday, specialty: 'outra', professional: null, location: null, kind: 'vacina', title: 'Vacina dTpa', planItem: 'dtpa', attendees: null });
await p.reload();

// ---- A jornada mora em Cuidados (a Agenda fica com o que tem data) ----
await tab('Agenda');
check((await p.getByRole('button', { name: /^Jornada/ }).count()) === 0, 'a Agenda não tem mais a Jornada');
await openCare(p);
const card = p.getByRole('button', { name: /^Pré-natal/ });
check((await card.textContent()).includes('feitos') && (await card.textContent()).includes('para conversar na consulta'), 'Cuidados mostra o pré-natal numa linha: o andamento e o que levar para a consulta (sem "atrasado")');
await card.click();
check(await p.getByRole('button', { name: /^Ultrassom morfológico do 1º trimestre|^1ª consulta|^Exames iniciais/ }).first().isVisible(), 'ao abrir, os primeiros do que fazer agora');
await openCare(p, 'Jornada');
const summary = p.getByRole('region', { name: 'Resumo da jornada' });
await summary.waitFor();
check(await summary.getByText(/do que já era para ter começado está feito/).isVisible(), 'resumo com um número simples: feito do previsto');
const now = p.getByRole('region', { name: 'Para fazer agora' });
check(await now.getByRole('button', { name: 'Ultrassom morfológico do 1º trimestre: para a consulta' }).isVisible(), '"Para fazer agora" traz o que passou da janela, como assunto para a consulta');
check(await now.getByRole('button', { name: 'Ultrassom morfológico do 2º trimestre: fazer agora' }).isVisible(), 'e o que tem a janela aberta');
check(await now.getByRole('button', { name: 'Agendar Ultrassom morfológico do 2º trimestre' }).isVisible(), 'com o botão de agendar ao lado');
check((await row('Vacina dTpa', 'feito').textContent()).includes('Feito em'), 'agendamento que passou deixa o item como feito, com a data');
check(await summary.getByRole('img', { name: /^Semana 22 de 40/ }).isVisible(), 'a gestação nas quatro fases, com a semana de hoje');
await summary.getByText('Ver o planejado × feito ›').click();
check(await summary.getByRole('img', { name: /^Planejado e realizado por semana/ }).isVisible(), 'gráfico do planejado × realizado semana a semana, a um toque');

// ---- Trimestres recolhíveis ----
const tri1 = p.getByRole('button', { name: /^1º trimestre · Formação/ });
check((await tri1.getAttribute('aria-expanded')) === 'false', 'trimestres que não são o atual começam recolhidos');
check((await p.getByRole('button', { name: /^2º trimestre · Crescimento/ }).getAttribute('aria-expanded')) === 'true', 'o trimestre atual começa aberto');
const group1 = p.getByRole('group', { name: '1º trimestre · Formação' });
await tri1.click();
check(await group1.getByRole('button', { name: /^1ª consulta de pré-natal:/ }).isVisible(), 'tocar abre o trimestre');
await tri1.click();
check((await group1.getByRole('button', { name: /^1ª consulta de pré-natal:/ }).count()) === 0, 'e tocar de novo recolhe');
await p.screenshot({ path: `${OUT}jornada-agenda.png`, fullPage: true });

// ---- Pop-up do item ----
await row(TOTG, 'em breve').click();
await dlg.waitFor();
check((await p.evaluate(() => document.body.style.position)) === 'fixed', 'com o pop-up aberto, a tela de fundo fica travada');
check(await dlg.getByText('Por que fazer').isVisible() && (await dlg.getByText(/Jejum de 8 horas/).isVisible()), 'pop-up explica por que fazer e como se preparar');
const planned = dlg.getByRole('region', { name: 'Planejado' });
check((await planned.textContent()).includes('Semanas 24 a 28'), 'planejado em semanas e datas reais');
await p.screenshot({ path: `${OUT}jornada-item.png`, fullPage: false });

// Agendar pelo pop-up
await dlg.getByRole('region', { name: 'Realizado' }).getByRole('button', { name: 'Agendar', exact: true }).click();
check((await dlg.getByLabel('Qual exame?').inputValue()) === TOTG, 'agendar já traz o nome');
check((await dlg.getByLabel('Na jornada do pré-natal').inputValue()) === 'totg', 'e o item da jornada');
await dlg.locator('form').getByRole('button', { name: 'Agendar', exact: true }).click();
await dlg.getByRole('region', { name: 'Realizado' }).getByText(/· agendado/).waitFor({ timeout: 10000 });
check(true, 'depois de agendar, o realizado mostra o agendamento');
check((await api('/api/data')).consultations.some(c => c.plan_item === 'totg' && c.kind === 'exame'), 'agendamento gravado ligado ao item');

// Editar o planejado com o combinado da equipe
await planned.getByRole('button', { name: 'Editar' }).click();
await dlg.getByLabel('Da semana').selectOption('22');
await dlg.getByLabel('Até a semana').selectOption('23');
await dlg.getByLabel('Combinado com a equipe').fill('A Dra. Ana pediu antes, com 22 semanas.');
await dlg.getByRole('button', { name: 'Salvar', exact: true }).click();
await planned.getByText('Combinado com a equipe').waitFor({ timeout: 10000 });
check((await planned.textContent()).includes('Semanas 22 a 23') && (await planned.textContent()).includes('Referência: semanas 24 a 28'), 'planejado ajustado, com a referência ao lado');
const saved = (await api('/api/data')).planWeeks.find(w => w.item_id === 'totg');
check(saved?.from === 22 && saved?.to === 23 && saved?.note === 'A Dra. Ana pediu antes, com 22 semanas.', 'semanas e combinado gravados (migrações 019 e 020)');
await p.screenshot({ path: `${OUT}jornada-editado.png`, fullPage: false });
await planned.getByRole('button', { name: 'Editar' }).click();
await dlg.getByRole('button', { name: 'Voltar à referência' }).click();
await p.waitForTimeout(1000);
check((await planned.textContent()).includes('Semanas 24 a 28') && !(await planned.textContent()).includes('Combinado'), '"Voltar à referência" desfaz o ajuste e a anotação');
await dlg.getByRole('button', { name: 'Fechar' }).click();

// "Já fizemos", com o dia em que foi feito
await now.getByRole('button', { name: 'Ultrassom morfológico do 1º trimestre: para a consulta' }).click();
await dlg.getByRole('button', { name: 'Já fizemos' }).click();
const doneDay = await iso(-60);
await dlg.getByLabel('Dia em que fizeram').fill(doneDay);
await dlg.getByRole('button', { name: 'Confirmar' }).click();
await p.waitForTimeout(1000);
check((await api('/api/data')).checks.some(c => c.item_id === 'morfo-1' && c.done_at.slice(0, 10) === doneDay), '"Já fizemos" guarda o dia escolhido');
check((await dlg.getByText(/^Feito em /).count()) === 1, 'o pop-up passa a feito, com a data');
await dlg.getByRole('button', { name: 'Fechar' }).click();

// ---- Encaixe automático em Próximos ----
await tab('Agenda');
await p.getByRole('button', { name: /^Próximos/ }).click();
await openRecord(p, 'Agendar');
await p.getByRole('group', { name: 'Tipo de agendamento' }).getByRole('button', { name: 'Ultrassom' }).click();
await p.getByLabel('Qual ultrassom?').fill('Ultrassom');
await p.getByLabel('Data', { exact: true }).fill(await iso(3));
check((await p.getByLabel('Na jornada do pré-natal').inputValue()) === 'morfo-2', 'ultrassom na semana 22 encaixa sozinho no morfológico do 2º tri');
await p.locator('form').getByRole('button', { name: 'Agendar', exact: true }).click();
await p.waitForTimeout(1200);
check((await api('/api/data')).consultations.some(c => c.plan_item === 'morfo-2'), 'ultrassom gravado com o item da jornada');

// ---- Do agendamento para a jornada ----
await p.getByRole('button', { name: /Curva glicêmica/ }).first().click();
await dlg.getByRole('button', { name: /Faz parte da jornada do pré-natal/ }).click();
await dlg.getByRole('region', { name: 'Planejado' }).waitFor();
check((await dlg.getByRole('heading').first().textContent()) === TOTG, 'o agendamento leva ao item na jornada');
await dlg.getByRole('button', { name: 'Fechar' }).click();
check((await row('Ultrassom morfológico do 2º trimestre').textContent()).includes('Agendado:'), 'a jornada mostra o morfológico como agendado');

// ---- Consultas e revisar com a equipe ----
await summary.getByRole('button', { name: /Consultas de pré-natal/ }).click();
check(await dlg.getByRole('region', { name: 'Consultas do 3º trimestre' }).isVisible(), 'consultas: o calendário recomendado de cada fase');
// Planejar adiantado: a consulta da semana 32, ainda longe.
await dlg.getByRole('button', { name: 'Agendar a consulta da semana 32' }).click();
check((await dlg.getByLabel('Data', { exact: true }).inputValue()) > (await iso(60)), 'agendar uma consulta futura já traz a data daquela semana');
check(await dlg.getByText(/Semana 32 da gestação/).isVisible(), 'o formulário mostra a semana da gestação da data');
await dlg.locator('form').getByRole('button', { name: 'Agendar', exact: true }).click();
await dlg.getByRole('button', { name: 'Ver a consulta da semana 32' }).waitFor({ timeout: 10000 });
check(true, 'a consulta da semana 32 fica agendada no calendário');
await p.screenshot({ path: `${OUT}jornada-consultas.png`, fullPage: false });
await dlg.getByRole('button', { name: 'Fechar' }).click();
check((await p.evaluate(() => document.body.style.position)) === '', 'ao fechar, a tela de fundo volta ao normal');
await summary.getByRole('button', { name: 'Revisar com a equipe' }).click();
const plan = await dlg.locator('pre').textContent();
check(plan.includes('Plano do pré-natal · semana 22') && plan.includes('[x] Ultrassom morfológico do 1º trimestre'), '"Revisar com a equipe" monta o plano para levar à consulta');
await p.screenshot({ path: `${OUT}jornada-equipe.png`, fullPage: false });
await dlg.getByRole('button', { name: 'Fechar' }).click();

// ---- A jornada mora em Cuidados, não no "Para hoje" ----
await tab('Início');
check((await p.getByRole('button', { name: /itens? da jornada para conferir/ }).count()) === 0, 'a jornada não pesa no "Para hoje" do Início: ela mora em Cuidados');

await b.close();
finish();
