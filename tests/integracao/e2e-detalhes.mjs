// Detalhes em janela: tocar num registro abre tudo o que foi anotado, com Editar e Excluir.
import { check, finish, launch, OUT, phone, quickAccount , openCare } from './lib.mjs';

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
// Sintomas em dias diferentes, para o resumo mostrar as datas.
for (const [n, intensity] of [[-6, 2], [-3, 4], [-1, 3]]) await post({ op: 'createSymptom', week: 22, date: await inDays(n), name: 'Azia', intensity, category: 'Digestivo', notes: null, timeOfDay: 'noite' });
await p.reload();
const dlg = p.getByRole('dialog');
const tab = name => p.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();

// ---- Sintoma: detalhes, cuidado, editar, excluir (Cuidados → Sintomas) ----
await openCare(p, 'Sintomas');
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

// ---- Medição: editar (Cuidados → Peso e pressão) ----
await openCare(p, 'Peso e pressão');
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
await openCare(p, 'Sintomas');
await p.getByRole('button', { name: /Enjoo, forte: ver detalhes/ }).click();
await dlg.getByRole('button', { name: 'Excluir', exact: true }).click();
check(!(await dlg.isVisible()) && await p.getByText('Excluído: Enjoo').isVisible(), 'excluir fecha a janela e oferece desfazer');
await p.getByRole('button', { name: 'Desfazer' }).click();
check(await p.getByRole('button', { name: /Enjoo, forte: ver detalhes/ }).isVisible(), 'desfazer traz o sintoma de volta');

// ---- Tarefa: detalhes, editar, concluir ----
await tab('Agenda');
await p.getByRole('button', { name: /^Tarefas/ }).click();
await p.getByRole('button', { name: 'Montar o berço: ver detalhes' }).click();
check(await dlg.getByText('Comprar parafusos').isVisible() && await dlg.locator('span', { hasText: /\sPai$/ }).first().isVisible(), 'tarefa abre com observação e responsável');
await dlg.getByRole('button', { name: 'Editar' }).click();
await dlg.getByLabel('Tarefa').fill('Montar o berço e o trocador');
const lembrete = dlg.getByRole('group', { name: /^Lembrete/ });
check((await lembrete.getByRole('button', { name: 'Sem lembrete' }).getAttribute('aria-pressed')) === 'true', 'tarefa tem campo de lembrete (começa sem)');
await lembrete.getByRole('button', { name: 'Amanhã' }).click();
await dlg.getByRole('group', { name: 'Hora do lembrete' }).getByRole('button', { name: '19h' }).click();
check(await dlg.getByText(/avisa em \d\d\/\d\d, às 19h/).isVisible(), 'com lembrete: escolhe a hora (19h) e diz quando o celular avisa');
await dlg.getByRole('button', { name: 'Salvar alterações' }).click();
await dlg.getByRole('heading', { name: 'Montar o berço e o trocador' }).waitFor();
check(true, 'tarefa renomeada');
check(await dlg.getByText(/, às 19h$/).isVisible(), 'os detalhes mostram o dia e a hora do lembrete');
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
await p.getByRole('button', { name: 'Mês', exact: true }).click();
await p.getByRole('gridcell', { name: new RegExp(`^${day.label}(,|$)`) }).first().click();
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
await dlg.getByRole('button', { name: /Preparar a consulta/ }).click();
await p.locator('.print-area').waitFor({ timeout: 10000 }).catch(() => undefined);
check(!(await dlg.isVisible()) && (await p.locator('.print-area').isVisible()), '"Preparar a consulta" abre as dúvidas e o resumo da consulta');
const ddmm = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }, n);
const datas = p.locator('.print-area li', { hasText: 'Azia' }).locator('p', { hasText: 'Datas:' });
await datas.waitFor({ timeout: 10000 });
const linha = (await datas.textContent()) ?? '';
check(linha.includes(`${await ddmm(-6)} (2)`) && linha.includes(`${await ddmm(-1)} (3)`), `o resumo traz as datas de cada sintoma, com a intensidade (${linha})`);
await p.emulateMedia({ media: 'print' });
await p.screenshot({ path: `${OUT}resumo-impressao.png`, fullPage: true });
const altura = await p.locator('.print-area').evaluate(el => el.getBoundingClientRect().height);
check(altura < 1600, `impresso, o resumo fica enxuto (${Math.round(altura)}px)`);
await p.emulateMedia({ media: 'screen' });

await b.close();
finish();
