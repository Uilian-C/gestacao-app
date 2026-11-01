// Botão "+" de cada aba: a janela abre com os registros daquela aba, salva, fecha e o dado aparece no lugar certo.
import { openCare, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p);
const dlg = p.getByRole('dialog');
const plus = p.getByRole('button', { name: 'Registrar', exact: true });
const tab = name => p.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
// Cada opção diz o tipo no começo do nome ("Sintoma: como estou me sentindo").
const modes = async () => (await dlg.getByRole('group', { name: 'Tipo de registro' }).getByRole('button').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label').split(':')[0]))).join(',');

// Início: tudo o que dá para registrar
await plus.click();
check((await modes()) === 'Diário,Sintoma,Peso e pressão,Agendar,Tarefa,Resultado', `Início oferece todos os registros, o Diário primeiro (${await modes()})`);
check((await dlg.getByRole('heading', { name: 'O que vocês querem guardar?' }).count()) === 1, 'o Registrar começa por uma pergunta só: o que vocês querem guardar?');
await p.screenshot({ path: `${OUT}rapido-inicio.png` });

// Escrevendo do próprio jeito, o Tumtum sugere onde guardar e leva o texto junto.
await dlg.getByLabel('Conte com suas palavras').fill('estou muito enjoada nesta manhã');
const sugestao = dlg.getByRole('button', { name: 'Guardar como Sintoma' });
check((await sugestao.textContent()).includes('Enjoo'), 'a frase vira a sugestão "Guardar como: Como estou me sentindo · Enjoo"');
await p.screenshot({ path: `${OUT}rapido-sugestao.png` });
await p.emulateMedia({ colorScheme: 'dark' });
await p.screenshot({ path: `${OUT}rapido-sugestao-escuro.png` });
await p.emulateMedia({ colorScheme: 'light' });
await sugestao.click();
check((await dlg.getByLabel('O que ela está sentindo?').inputValue()) === 'estou muito enjoada nesta manhã' && (await dlg.getByText('Vai entrar como', { exact: false }).isVisible()), 'o formulário do sintoma abre com a frase, já reconhecida como Enjoo');
check((await dlg.getByRole('group', { name: 'Tipo de registro' }).count()) === 0, 'no formulário, só ele: nada de grade de tipos em cima');
await p.screenshot({ path: `${OUT}rapido-sintoma.png` });
await dlg.getByRole('button', { name: 'Trocar o tipo' }).click();
check((await dlg.getByRole('group', { name: 'Tipo de registro' }).count()) === 1, '"Trocar o tipo" volta para a pergunta');
await dlg.getByLabel('Conte com suas palavras').fill('ouvimos o coração pela primeira vez');
check((await dlg.getByRole('button', { name: 'Guardar como Diário' }).count()) === 1, 'uma lembrança vira sugestão de momento');
await dlg.getByLabel('Conte com suas palavras').fill('marquei o morfológico dia 12');
check((await dlg.getByRole('button', { name: 'Guardar como Agendar' }).count()) === 1, 'uma consulta marcada vai para a agenda');
await dlg.getByLabel('Conte com suas palavras').fill('');
await dlg.getByRole('group', { name: 'Tipo de registro' }).getByRole('button', { name: 'Sintoma' }).click();
await dlg.getByLabel('O que ela está sentindo?').fill('Enjoo');
await dlg.getByRole('button', { name: '3: Moderado' }).click();
await dlg.getByRole('button', { name: 'Salvar sintoma' }).click();
await p.waitForTimeout(1200);
check(!(await dlg.isVisible()), 'janela fecha após salvar sintoma');

// Cuidados → Sintomas: sintoma e medição (os registros de saúde saíram do Diário)
await openCare(p, 'Sintomas');
await p.waitForTimeout(500);
check(await p.getByText('Enjoo').first().isVisible(), 'sintoma aparece em Cuidados → Sintomas');
await plus.click();
check((await modes()) === 'Sintoma,Peso e pressão', 'Sintomas oferece sintoma e medição');
await dlg.getByRole('button', { name: 'Peso e pressão' }).click();
await dlg.getByLabel('Peso (kg)').fill('64,5');
await dlg.getByRole('button', { name: /Salvar medição/ }).click();
await p.waitForTimeout(1200);
check(!(await dlg.isVisible()), 'janela fecha após salvar peso');
await openCare(p, 'Peso e pressão');
await p.waitForTimeout(500);
check((await p.getByText(/64[,.]5/).count()) > 0, 'peso aparece em Peso e pressão');

// Diário: só o fichário, já na pasta aberta (depois que a devolutiva do sintoma some)
await p.getByRole('status').filter({ hasText: 'Enjoo · registrado' }).waitFor({ state: 'hidden', timeout: 15000 });
await tab('Diário');
check((await p.getByText('Enjoo').count()) === 0, 'sintoma não aparece no Diário');
await p.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Fichário/ }).click();
await p.getByRole('button', { name: 'Abrir a pasta Ideias e planos' }).click();
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
check((await modes()) === 'Agendar,Tarefa', 'Agenda oferece agendar e tarefa');
await dlg.getByRole('group', { name: 'Tipo de registro' }).getByRole('button', { name: 'Tarefa' }).click();
await dlg.getByLabel('Tarefa').fill('Montar o berço');
await dlg.getByRole('button', { name: 'Criar tarefa' }).click();
await p.waitForTimeout(1200);
check(!(await dlg.isVisible()), 'janela fecha após criar tarefa');
await p.getByRole('button', { name: /^Tarefas/ }).click();
check(await p.getByText('Montar o berço').first().isVisible(), 'tarefa aparece em Tarefas');

// Cuidados: consulta e exame; Esc fecha
await openCare(p);
await plus.click();
check((await modes()) === 'Sintoma,Peso e pressão,Resultado', 'Cuidados oferece sintoma, medição e resultado');
await p.screenshot({ path: `${OUT}rapido-cuidados.png` });
await p.keyboard.press('Escape');
check(!(await dlg.isVisible()), 'Esc fecha');

// Parto: os registros são os cronômetros, sem "+"
await tab('Parto');
check((await plus.count()) === 0, 'Parto não tem o botão +');
await b.close();
finish();
