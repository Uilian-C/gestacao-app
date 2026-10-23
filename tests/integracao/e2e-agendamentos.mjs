// Agendamentos no celular: ultrassom marcado vai para a Agenda; depois da data,
// "Guardar resultado" abre o formulário preenchido; resultados avulsos também
// entram no calendário.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p); // DUM 15/05/2026
const dlg = p.getByRole('dialog');
const tab = name => p.getByRole('button', { name: new RegExp(`^${name}(\\s|$)`) }).first().click();
const iso = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const yesterday = await iso(-1);
const api = path => p.evaluate(async path => (await fetch(path)).json(), path);

// Um exame já feito, sem agendamento (o caso do dia 13/10).
await p.evaluate(date => fetch('/api/exames', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'create', kind: 'exame', title: 'Hemograma', date, visibility: 'shared' }) }), await iso(-3));

// ---- Agendar um ultrassom (ontem) em Agenda → Próximos ----
await tab('Agenda');
await p.getByRole('button', { name: /^Próximos/ }).waitFor();
check((await p.getByRole('button', { name: /^Próximos/ }).getAttribute('aria-pressed')) === 'true', 'Agenda abre em Próximos, onde se agenda');
await p.getByRole('button', { name: 'Agendar', exact: true }).first().click();
await p.getByRole('group', { name: 'Tipo de agendamento' }).getByRole('button', { name: 'Ultrassom' }).click();
await p.getByRole('button', { name: 'Morfológico 2º tri' }).click();
check((await p.getByLabel('Qual ultrassom?').inputValue()) === 'Ultrassom morfológico do 2º trimestre', 'sugestão da jornada preenche o nome');
await p.getByLabel('Data', { exact: true }).fill(yesterday);
await p.getByLabel('Hora').fill('14:00');
await p.screenshot({ path: `${OUT}agendar-ultrassom.png`, fullPage: true });
await p.locator('form').getByRole('button', { name: 'Agendar', exact: true }).click();
await p.waitForTimeout(1200);
const saved = (await api('/api/data')).consultations.find(c => c.kind === 'ultrassom');
check(saved?.plan_item === 'morfo-2', 'ultrassom agendado com o item da jornada');
const missing = p.getByRole('region', { name: 'Falta guardar o resultado' });
check(await missing.getByText('Ultrassom morfológico do 2º trimestre').isVisible(), 'ultrassom de ontem aparece em "Falta guardar o resultado"');
check(await missing.getByRole('button', { name: 'Guardar resultado' }).isVisible(), 'depois da data, oferece "Guardar resultado"');
await p.screenshot({ path: `${OUT}agendados.png`, fullPage: true });

// ---- Início pede o resultado ----
await tab('Início');
check(await p.getByText(/Falta guardar 1 resultado: Ultrassom morfológico/).isVisible(), 'Início lembra de guardar o resultado, em "Para não esquecer"');

// ---- Agenda: o ultrassom e o hemograma no calendário ----
await tab('Agenda');
await p.getByRole('button', { name: 'Calendário', exact: true }).click();
await p.getByRole('button', { name: 'Mês', exact: true }).click();
await p.getByRole('gridcell').first().waitFor();
const dayLabel = d => p.evaluate(d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }); }, d);
const openDay = async d => {
  const label = await dayLabel(d);
  // A folha de um dia aberta cobre o calendário: fecha antes de tocar em outro.
  if (await p.getByRole('dialog').count()) await p.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();
  await p.getByRole('gridcell', { name: new RegExp(`^${label}(,|$)`) }).first().click();
  await p.waitForTimeout(400);
};
await openDay(yesterday);
check(await p.getByRole('button', { name: /Ultrassom morfológico do 2º trimestre/ }).first().isVisible(), 'ultrassom agendado aparece no dia, na Agenda');
await openDay(await iso(-3));
const hemo = p.getByRole('button', { name: /Hemograma/ }).first();
check(await hemo.isVisible(), 'resultado guardado sem agendamento aparece no dia do exame');
await p.screenshot({ path: `${OUT}agenda-resultado.png`, fullPage: true });
await hemo.click();
await p.waitForTimeout(600);
check((await p.getByRole('button', { name: /^Resultados/ }).getAttribute('aria-pressed')) === 'true' && (await dlg.getByRole('heading', { name: 'Hemograma' }).isVisible()), 'tocar no resultado abre o Hemograma em Cuidados → Resultados');
await p.keyboard.press('Escape');

// ---- Guardar o resultado a partir do agendamento ----
await tab('Agenda');
await p.getByRole('button', { name: /^Próximos/ }).click();
await p.getByRole('button', { name: 'Guardar resultado' }).first().click();
await p.waitForTimeout(600);
check((await p.getByLabel('Nome').inputValue()) === 'Ultrassom morfológico do 2º trimestre' && (await p.getByLabel('Data do exame').inputValue()) === yesterday, 'formulário já vem com nome e data do agendamento');
await p.getByRole('button', { name: /^Guardar/ }).last().click();
await p.waitForTimeout(1500);
const result = (await api('/api/data')).exams.find(e => e.title === 'Ultrassom morfológico do 2º trimestre');
check(result?.appointment_id === saved.id && result.plan_item === 'morfo-2', 'resultado ligado ao agendamento e à jornada');
await tab('Agenda');
await p.getByRole('button', { name: /^Próximos/ }).click();
check((await p.getByRole('region', { name: 'Falta guardar o resultado' }).count()) === 0, 'some de "Falta guardar o resultado"');
await p.getByText(/Já aconteceram/).click();
check(await p.getByText(/resultado guardado/).first().isVisible(), 'em "Já aconteceram", mostra "resultado guardado"');
await p.getByRole('button', { name: /Ultrassom morfológico do 2º trimestre/ }).first().click();
check(await dlg.getByRole('button', { name: 'Ver resultado' }).isVisible(), 'detalhe do agendamento oferece "Ver resultado"');
await p.keyboard.press('Escape');
await tab('Início');
check((await p.getByText(/Falta guardar/).count()) === 0, 'Início para de pedir o resultado');
await b.close();
finish();
