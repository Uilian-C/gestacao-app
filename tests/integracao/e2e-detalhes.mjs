// Detalhes em janela: tocar num registro abre tudo o que foi anotado, com Editar e Excluir.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p);
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).status, body);
const today = await p.evaluate(() => new Date().toLocaleDateString('en-CA'));
const inDays = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
await post({ op: 'createSymptom', week: 22, date: today, name: 'Enjoo', intensity: 3, category: 'Digestivo', notes: 'Pior de manhã', timeOfDay: 'manha' });
await post({ op: 'createMetric', week: 22, date: today, weight: 68.4, systolic: null, diastolic: null });
await post({ op: 'createEntry', date: today, body: 'Sentimos o bebê mexer', visibility: 'shared', remindOn: null });
await post({ op: 'createTask', week: 22, title: 'Montar o berço', assignee: 'pai', priority: 'Média', dueDate: await inDays(3), notes: 'Comprar parafusos' });
await post({ op: 'createConsultation', scheduledAt: `${await inDays(2)}T12:30:00Z`, specialty: 'obstetra', professional: 'Dra. Marina', location: null });
await p.reload();
const dlg = p.getByRole('dialog');
const tab = name => p.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();

// ---- Sintoma: detalhes, cuidado, editar, excluir (Cuidados → Saúde) ----
await tab('Cuidados');
await p.getByRole('button', { name: 'Saúde', exact: true }).click();
await p.getByRole('button', { name: /Enjoo, moderado: ver detalhes/ }).click();
await dlg.waitFor();
check(await dlg.getByRole('heading', { name: 'Enjoo' }).isVisible() && await dlg.getByText('Pior de manhã').isVisible(), 'sintoma abre com observação e detalhes');
await dlg.getByLabel(/Cuidado ou apoio/).fill('Biscoito de água e sal');
await dlg.getByRole('button', { name: 'Enviar' }).click();
await dlg.getByText('Biscoito de água e sal').waitFor();
check(true, 'cuidado enviado aparece na janela');
await p.screenshot({ path: `${OUT}detalhe-sintoma.png` });
await dlg.getByRole('button', { name: 'Editar' }).click();
await dlg.getByRole('button', { name: '4: Forte' }).click();
await dlg.getByRole('button', { name: 'Salvar alterações' }).click();
await dlg.getByRole('heading', { name: 'Enjoo' }).waitFor();
check(await dlg.getByText('Forte', { exact: true }).isVisible(), 'intensidade editada aparece na janela');
await p.keyboard.press('Escape');
check(await p.getByRole('button', { name: /Enjoo, forte: ver detalhes/ }).isVisible(), 'lista mostra o sintoma editado');

// ---- Medição: editar ----
await p.getByRole('button', { name: /Medição da semana/ }).click();
await dlg.getByRole('button', { name: 'Editar' }).click();
await dlg.getByLabel('Peso (kg)').fill('68,9');
await dlg.getByRole('button', { name: /Salvar alterações/ }).click();
await dlg.getByText('68,9 kg').waitFor();
check(true, 'peso editado');
await p.keyboard.press('Escape');

// ---- Momento: editar (Diário) ----
await tab('Diário');
await p.getByRole('button', { name: /^Momento de .*: ver detalhes/ }).first().click();
await dlg.getByRole('button', { name: 'Editar' }).click();
await dlg.getByLabel('O que aconteceu?').fill('Sentimos o bebê mexer pela primeira vez!');
await dlg.getByRole('button', { name: /Salvar alterações/ }).click();
await dlg.getByText('Sentimos o bebê mexer pela primeira vez!').waitFor();
await dlg.getByRole('button', { name: 'Editar' }).waitFor();
check(true, 'momento editado');
await p.screenshot({ path: `${OUT}detalhe-momento.png` });
await p.keyboard.press('Escape');
await dlg.waitFor({ state: 'hidden' });

// ---- Excluir pelo detalhe, com desfazer ----
await tab('Cuidados');
await p.getByRole('button', { name: /Enjoo, forte: ver detalhes/ }).click();
await dlg.getByRole('button', { name: 'Excluir', exact: true }).click();
check(!(await dlg.isVisible()) && await p.getByText('Excluído: Enjoo').isVisible(), 'excluir fecha a janela e oferece desfazer');
await p.getByRole('button', { name: 'Desfazer' }).click();
check(await p.getByRole('button', { name: /Enjoo, forte: ver detalhes/ }).isVisible(), 'desfazer traz o sintoma de volta');

// ---- Tarefa: detalhes, editar, concluir ----
await tab('Agenda');
await p.getByRole('button', { name: /^Tarefas/ }).click();
await p.getByRole('button', { name: 'Montar o berço: ver detalhes' }).click();
check(await dlg.getByText('Comprar parafusos').isVisible() && await dlg.getByText('Pai', { exact: true }).isVisible(), 'tarefa abre com observação e responsável');
await dlg.getByRole('button', { name: 'Editar' }).click();
await dlg.getByLabel('Tarefa').fill('Montar o berço e o trocador');
await dlg.getByRole('button', { name: 'Salvar alterações' }).click();
await dlg.getByRole('heading', { name: 'Montar o berço e o trocador' }).waitFor();
check(true, 'tarefa renomeada');
await p.screenshot({ path: `${OUT}detalhe-tarefa.png` });
await dlg.getByRole('button', { name: 'Marcar como feita' }).click();
await p.waitForTimeout(800);
check(!(await dlg.isVisible()), 'marcar como feita fecha a janela');
await p.getByRole('button', { name: 'Concluídas' }).click();
check(await p.getByRole('button', { name: 'Montar o berço e o trocador: ver detalhes' }).isVisible(), 'tarefa aparece nas concluídas');

// ---- Calendário: tocar na consulta abre os detalhes ----
await p.getByRole('button', { name: 'Calendário' }).click();
await p.waitForTimeout(400);
const day = await p.evaluate(() => {
  const d = new Date();
  const month = d.getMonth();
  d.setDate(d.getDate() + 2);
  return { label: d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }), nextMonth: d.getMonth() !== month };
});
if (day.nextMonth) await p.getByRole('button', { name: 'Próximo mês' }).click();
await p.getByRole('gridcell', { name: new RegExp(`^${day.label}`) }).or(p.getByRole('button', { name: new RegExp(`^${day.label}`) })).first().click();
await p.getByRole('button', { name: /Obstetra/ }).first().click();
check(await dlg.getByText('Dra. Marina').isVisible(), 'consulta abre pelo calendário');
await p.keyboard.press('Escape');

// ---- Consulta: editar e preparar resumo ----
await tab('Agenda');
await p.getByRole('button', { name: /^Próximos/ }).click();
await p.getByRole('button', { name: /^Consulta: Obstetra.*ver detalhes/ }).click();
await dlg.getByRole('button', { name: 'Editar' }).click();
await dlg.getByLabel('Profissional (opcional)').fill('Dra. Marina Lima');
await dlg.getByRole('button', { name: 'Salvar alterações' }).click();
await dlg.getByText('Dra. Marina Lima').waitFor();
check(true, 'consulta editada');
await p.screenshot({ path: `${OUT}detalhe-consulta.png` });
await dlg.getByRole('button', { name: /Preparar resumo/ }).click();
await p.locator('.print-area').waitFor({ timeout: 10000 }).catch(() => undefined);
check(!(await dlg.isVisible()) && (await p.locator('.print-area').isVisible()), '"Preparar resumo" abre o resumo da consulta');

await b.close();
finish();
