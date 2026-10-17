// Botão "+" de cada aba: a janela abre com os registros daquela aba, salva, fecha e o dado aparece no lugar certo.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p);
const dlg = p.getByRole('dialog');
const plus = p.getByRole('button', { name: 'Registrar', exact: true });
const tab = name => p.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
const modes = async () => (await dlg.getByRole('group', { name: 'Tipo de registro' }).getByRole('button').allTextContents()).join(',');

// Início: tudo o que dá para registrar
await plus.click();
check((await modes()) === 'Sintoma,Diário,Peso e pressão,Consulta,Tarefa,Exame', `Início oferece todos os registros (${await modes()})`);
await p.screenshot({ path: `${OUT}rapido-inicio.png` });
await dlg.getByLabel('O que ela está sentindo?').fill('Enjoo');
await dlg.getByRole('button', { name: '3: Moderado' }).click();
await dlg.getByRole('button', { name: /Salvar · semana/ }).click();
await p.waitForTimeout(1200);
check(!(await dlg.isVisible()), 'janela fecha após salvar sintoma');

// Cuidados → Saúde: sintoma e medição (os registros de saúde saíram do Diário)
await tab('Cuidados');
await p.getByRole('button', { name: 'Saúde', exact: true }).click();
await p.getByRole('button', { name: 'Sintomas', exact: true }).click();
await p.waitForTimeout(500);
check(await p.getByText('Enjoo').first().isVisible(), 'sintoma aparece nos gráficos de Saúde');
await plus.click();
check((await modes()) === 'Sintoma,Peso e pressão', 'Saúde oferece sintoma e medição');
await dlg.getByRole('button', { name: 'Peso e pressão' }).click();
await dlg.getByLabel('Peso (kg)').fill('64,5');
await dlg.getByRole('button', { name: /Registrar como/ }).click();
await p.waitForTimeout(1200);
check(!(await dlg.isVisible()), 'janela fecha após salvar peso');
await p.getByRole('button', { name: 'Medidas', exact: true }).click();
await p.waitForTimeout(500);
check((await p.getByText(/64[,.]5/).count()) > 0, 'peso aparece em Medidas');

// Diário: só o fichário, já na pasta aberta
await tab('Diário');
check((await p.getByText('Enjoo').count()) === 0, 'sintoma não aparece no Diário');
await p.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Ideias/ }).click();
await plus.click();
check((await dlg.getByRole('group', { name: 'Tipo de registro' }).count()) === 0, 'Diário abre direto o registro do fichário');
check((await dlg.getByRole('radio', { name: /Ideias/ }).getAttribute('aria-checked')) === 'true', 'registro abre na pasta que estava aberta');
await dlg.getByLabel('O que aconteceu?').fill('Nomes que gostamos: Helena, Theo');
await dlg.getByRole('button', { name: 'Guardar ideia' }).click();
await p.waitForTimeout(1200);
check(!(await dlg.isVisible()) && (await p.getByRole('button', { name: 'Ideia: ver detalhes' }).isVisible()), 'ideia aparece na pasta Ideias');

// Agenda: tarefa
await tab('Agenda');
await plus.click();
check((await modes()) === 'Tarefa,Consulta', 'Agenda oferece tarefa e consulta');
await dlg.getByLabel('Tarefa').fill('Montar o berço');
await dlg.getByRole('button', { name: 'Criar tarefa' }).click();
await p.waitForTimeout(1200);
check(!(await dlg.isVisible()), 'janela fecha após criar tarefa');
await p.getByRole('button', { name: /^Tarefas/ }).click();
check(await p.getByText('Montar o berço').first().isVisible(), 'tarefa aparece em Tarefas');

// Cuidados: consulta e exame; Esc fecha
await tab('Cuidados');
await p.getByRole('button', { name: /^Consultas/ }).click();
await plus.click();
check((await modes()) === 'Consulta,Exame', 'Cuidados oferece consulta e exame');
await p.screenshot({ path: `${OUT}rapido-cuidados.png` });
await p.keyboard.press('Escape');
check(!(await dlg.isVisible()), 'Esc fecha');

// Parto: os registros são os cronômetros, sem "+"
await tab('Parto');
check((await plus.count()) === 0, 'Parto não tem o botão +');
await b.close();
finish();
