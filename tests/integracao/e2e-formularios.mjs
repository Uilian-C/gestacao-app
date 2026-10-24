// Formulários: sintoma, medição, tarefa e diário com o dia escolhido (hoje,
// ontem ou outro dia); a semana segue o dia. Editar também troca o dia.
import { check, finish, launch, OUT, phone, quickAccount, DUM_22, openCare } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p); // DUM 15/05/2026
const dlg = p.getByRole('dialog');
const plus = p.getByRole('button', { name: 'Registrar', exact: true });
const api = () => p.evaluate(async () => (await fetch('/api/data')).json());
const iso = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const weekOf = d => p.evaluate(([d, dum]) => Math.floor((new Date(`${d}T00:00:00`) - new Date(`${dum}T00:00:00`)) / (7 * 86400000)), [d, DUM_22]);

// ---- Sintoma de ontem ----
await plus.click();
await dlg.getByLabel('O que ela está sentindo?').fill('Azia');
await dlg.getByRole('button', { name: '2: Leve' }).click();
check((await dlg.getByRole('button', { name: 'Hoje', exact: true }).getAttribute('aria-pressed')) === 'true', 'dia começa em "Hoje"');
await dlg.getByRole('button', { name: 'Ontem', exact: true }).click();
const yesterday = await iso(-1);
check(await dlg.getByText(`semana ${await weekOf(yesterday)}`).first().isVisible(), 'mostra a semana do dia escolhido');
await p.screenshot({ path: `${OUT}form-sintoma.png` });
await dlg.getByRole('button', { name: 'Salvar sintoma' }).click();
await dlg.waitFor({ state: 'hidden' });
let d = await api();
const azia = d.symptoms.find(s => s.symptom_name === 'Azia');
check(azia.log_date.slice(0, 10) === yesterday && azia.week_number === (await weekOf(yesterday)), 'sintoma guardado ontem, na semana de ontem');

// ---- Medição de outro dia ----
await plus.click();
await dlg.getByRole('group', { name: 'Tipo de registro' }).getByRole('button', { name: 'Peso e pressão' }).click();
check(await dlg.getByRole('button', { name: /Salvar medição/ }).isDisabled(), 'sem nenhum valor, não salva');
await dlg.getByLabel('Peso (kg)').fill('65,2');
await dlg.getByLabel('Pressão máxima').fill('118');
await dlg.getByLabel('Pressão mínima').fill('76');
const tenDaysAgo = await iso(-10);
await dlg.getByRole('button', { name: 'Outro dia' }).click();
check(await dlg.getByLabel('Escolher o dia').isVisible(), '"Outro dia" mostra o campo de data visível');
await dlg.getByLabel('Escolher o dia').fill(tenDaysAgo);
check(await dlg.getByRole('button', { name: new RegExp(tenDaysAgo.split('-').reverse().join('/')) }).or(dlg.getByText(tenDaysAgo.split('-').reverse().join('/'))).first().isVisible(), '"Outro dia" mostra a data escolhida');
await p.screenshot({ path: `${OUT}form-medicao.png` });
await dlg.getByRole('button', { name: /Salvar medição/ }).click();
await dlg.waitFor({ state: 'hidden' });
d = await api();
const metric = d.metrics.find(m => Number(m.weight_kg) === 65.2);
check(metric.recorded_at.slice(0, 10) === tenDaysAgo && metric.week_number === (await weekOf(tenDaysAgo)), 'medição guardada no dia escolhido, com a semana certa');
check(await p.evaluate(d => fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'createMetric', week: 30, date: d, weight: 70, systolic: null, diastolic: null }) }).then(r => r.status), await iso(5)) === 400, 'medição no futuro é recusada');

// ---- Editar troca o dia ----
await openCare(p, 'Peso e pressão');
await p.getByRole('button', { name: /Medição da semana/ }).first().click();
await dlg.getByRole('button', { name: 'Editar' }).click();
check((await dlg.getByLabel('Peso (kg)').inputValue()) === '65,2', 'editar abre com o peso');
await dlg.getByRole('button', { name: 'Anteontem', exact: true }).click();
await dlg.getByRole('button', { name: 'Salvar alterações' }).click();
await p.waitForTimeout(1200);
const twoDays = await iso(-2);
check((await api()).metrics.find(m => m.id === metric.id).recorded_at.slice(0, 10) === twoDays, 'editar a medição trocou o dia');
await p.keyboard.press('Escape');

// ---- Tarefa com prazo ----
await p.getByRole('button', { name: /^Agenda(\s|$)/ }).first().click();
await plus.click();
await dlg.getByRole('group', { name: 'Tipo de registro' }).getByRole('button', { name: 'Tarefa' }).click();
await dlg.getByLabel('Tarefa').fill('Lavar as roupinhas');
await dlg.getByRole('button', { name: 'Em 1 semana', exact: true }).click();
await p.screenshot({ path: `${OUT}form-tarefa.png` });
await dlg.getByRole('button', { name: 'Criar tarefa' }).click();
await dlg.waitFor({ state: 'hidden' });
const due = await iso(7);
const task = (await api()).tasks.find(t => t.task_title === 'Lavar as roupinhas');
check(task.due_date.slice(0, 10) === due && task.week_number === (await weekOf(due)), 'tarefa com prazo em 1 semana entra na semana do prazo');
await b.close();
finish();
