// Agenda → Jornada no celular: planejado × realizado, agendar a partir da
// jornada, encaixe automático de um agendamento feito em Próximos, item feito
// quando a data passa e semanas ajustadas pelo casal.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
// DUM 22 semanas atrás: hoje é a semana 22 (morfológico 2º tri com a janela aberta).
const dum = new Date();
dum.setDate(dum.getDate() - 22 * 7 - 2);
await quickAccount(p, { dum: dum.toLocaleDateString('en-CA') });
const tab = name => p.getByRole('button', { name: new RegExp(`^${name}(\\s|$)`) }).first().click();
const iso = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const api = path => p.evaluate(async path => (await fetch(path)).json(), path);
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).status, body);
const row = name => p.getByRole('button', { name: new RegExp(`^${name}:`) });

// A vacina dTpa foi tomada ontem (agendamento ligado à jornada).
const yesterday = new Date(`${await iso(-1)}T10:00`).toISOString();
await post({ op: 'createConsultation', scheduledAt: yesterday, specialty: 'outra', professional: null, location: null, kind: 'vacina', title: 'Vacina dTpa', planItem: 'dtpa', attendees: null });
await p.reload();

// ---- A jornada mora na Agenda ----
await tab('Cuidados');
check((await p.getByRole('button', { name: /^Jornada/ }).count()) === 0, 'Cuidados não tem mais a Jornada');
await tab('Agenda');
await p.getByRole('button', { name: /^Jornada/ }).click();
const summary = p.getByRole('region', { name: 'Planejado e realizado' });
await summary.waitFor();
check(await summary.getByText('Jornada do pré-natal').isVisible(), 'Agenda → Jornada abre com o resumo');
check((await row('Ultrassom morfológico do 1º trimestre').textContent()).includes('A janela passou sem data'), 'item com a janela passada aparece como atrasado');
check((await row('Ultrassom morfológico do 2º trimestre').textContent()).includes('Janela aberta · sem data'), 'item com a janela aberta e sem data');
const dtpa = await row('Vacina dTpa').textContent();
check(dtpa.includes('feito') && dtpa.includes('Feito em'), 'agendamento que já passou deixa o item como feito, com a data');
check((await row('Curva glicêmica \\(TOTG 75 g\\)').textContent()).includes('sem. 24–28'), 'planejado mostra a janela de semanas e as datas');
await p.screenshot({ path: `${OUT}jornada-agenda.png`, fullPage: true });

// ---- Agendar a partir da jornada ----
await row('Curva glicêmica \\(TOTG 75 g\\)').click();
await p.getByRole('button', { name: 'Agendar', exact: true }).click();
check((await p.getByLabel('Qual exame?').inputValue()) === 'Curva glicêmica (TOTG 75 g)', 'agendar da jornada já traz o nome');
check((await p.getByLabel('Na jornada do pré-natal').inputValue()) === 'totg', 'e o item da jornada');
check((await p.getByLabel('Data', { exact: true }).inputValue()) !== '', 'e uma data dentro da janela');
await p.locator('form').getByRole('button', { name: 'Agendar', exact: true }).click();
await p.waitForTimeout(1200);
const totg = await row('Curva glicêmica \\(TOTG 75 g\\)').textContent();
check(totg.includes('agendado') && totg.includes('Agendado:'), 'o item passa a agendado, com a data');
check((await api('/api/data')).consultations.some(c => c.plan_item === 'totg' && c.kind === 'exame'), 'agendamento gravado ligado ao item');

// ---- Encaixe automático em Próximos ----
await p.getByRole('button', { name: /^Próximos/ }).click();
await p.getByRole('button', { name: 'Agendar', exact: true }).first().click();
await p.getByRole('group', { name: 'Tipo de agendamento' }).getByRole('button', { name: 'Ultrassom' }).click();
await p.getByLabel('Qual ultrassom?').fill('Ultrassom');
await p.getByLabel('Data', { exact: true }).fill(await iso(3));
check((await p.getByLabel('Na jornada do pré-natal').inputValue()) === 'morfo-2', 'ultrassom na semana 22 encaixa sozinho no morfológico do 2º tri');
check(await p.getByText(/Encaixado pelo nome e pela data/).isVisible(), 'o formulário diz que encaixou');
await p.screenshot({ path: `${OUT}jornada-encaixe.png`, fullPage: true });
await p.locator('form').getByRole('button', { name: 'Agendar', exact: true }).click();
await p.waitForTimeout(1200);
check((await api('/api/data')).consultations.some(c => c.plan_item === 'morfo-2'), 'ultrassom gravado com o item da jornada');
await p.getByRole('button', { name: /^Jornada/ }).click();
check((await row('Ultrassom morfológico do 2º trimestre').textContent()).includes('agendado'), 'a jornada mostra o morfológico como agendado');

// ---- Um nome que não é da jornada não encaixa ----
await p.getByRole('button', { name: /^Próximos/ }).click();
await p.getByRole('button', { name: 'Agendar', exact: true }).first().click();
await p.getByRole('group', { name: 'Tipo de agendamento' }).getByRole('button', { name: 'Exame' }).click();
await p.getByLabel('Qual exame?').fill('Ecocardiograma fetal');
await p.getByLabel('Data', { exact: true }).fill(await iso(3));
check((await p.getByLabel('Na jornada do pré-natal').inputValue()) === '', 'exame fora da lista fica fora da jornada');
await p.getByRole('button', { name: 'Cancelar' }).click();

// ---- Ajustar as semanas planejadas ----
await p.getByRole('button', { name: /^Jornada/ }).click();
await row('Vacina contra o VSR').click();
await p.getByRole('button', { name: 'Ajustar semanas' }).click();
await p.getByLabel('Da semana').selectOption('22');
await p.getByLabel('Até a semana').selectOption('30');
await p.getByRole('button', { name: 'Salvar', exact: true }).click();
await p.waitForTimeout(1000);
const vsr = await row('Vacina contra o VSR').textContent();
check(vsr.includes('ajustado') && vsr.includes('sem. 22–30') && vsr.includes('Janela aberta'), 'semanas ajustadas mudam o planejado (e a janela abre)');
check((await api('/api/data')).planWeeks.some(w => w.item_id === 'vsr' && w.from === 22 && w.to === 30), 'ajuste gravado (migração 019)');
await row('Vacina contra o VSR').click();
await p.getByRole('button', { name: 'Ajustar semanas' }).click();
await p.getByRole('button', { name: 'Voltar ao padrão' }).click();
await p.waitForTimeout(1000);
check((await row('Vacina contra o VSR').textContent()).includes('sem. 28–36'), '"Voltar ao padrão" devolve a janela de referência');

// ---- Início leva à jornada ----
await tab('Início');
const late = p.getByRole('button', { name: /itens? da jornada para conferir/ });
check((await late.textContent()).includes('Exames iniciais'), 'Início lembra os itens atrasados');
await late.click();
await summary.waitFor();
check(true, 'e leva para Agenda → Jornada');

await b.close();
finish();
