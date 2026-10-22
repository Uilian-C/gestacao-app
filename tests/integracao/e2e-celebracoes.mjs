// Celebrações: o casal planeja o chá de bebê no Diário, e ele aparece no Início (a partir de 60 dias) e na Agenda.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
const day = n => {
  const d = new Date(Date.now() + n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
await quickAccount(mae, { name: 'Ana', dum: day(-24 * 7) });

await mae.getByRole('button', { name: /^Diário/ }).first().click();
const pastas = mae.getByRole('navigation', { name: 'Pastas do diário' });
check((await pastas.getByRole('button', { name: 'Fichário', exact: true }).count()) === 1, 'a aba Fichário não mostra contagem');
await pastas.getByRole('button', { name: /Celebrações/ }).click();
await mae.getByText('Os encontros que vão fazer parte da história de vocês').waitFor();
check(true, 'Diário → Celebrações');
await mae.getByRole('button', { name: 'Nova celebração' }).click();
await mae.screenshot({ path: `${OUT}celebracao-tipos.png` });
await mae.getByRole('list', { name: 'Que celebração?' }).getByRole('button', { name: /Chá de bebê/ }).click();

const cha = mae.getByRole('dialog', { name: 'Chá de bebê' });
await cha.waitFor();
const form = cha.getByRole('form', { name: 'Detalhes da celebração' });
check(await form.isVisible(), 'abre direto nos detalhes, para marcar a data');
await form.getByLabel('Nome da celebração').fill('Chá da Helena');
// Marcado em cima da hora: vários passos do roteiro já "venceram".
await form.getByLabel('Data', { exact: true }).fill(day(7));
await form.getByLabel('Hora', { exact: true }).fill('15:00');
await form.getByLabel('Local', { exact: true }).fill('Salão do prédio');
await form.getByLabel('Tema', { exact: true }).fill('Ursinhos');
await form.getByRole('button', { name: /^Cor / }).first().click();
const orcamento = form.getByLabel('Orçamento previsto');
await orcamento.pressSequentially('100000');
check((await orcamento.inputValue()).replace(/\s/g, ' ') === 'R$ 1.000,00', `o valor vira moeda enquanto digita (${await orcamento.inputValue()})`);
await form.getByRole('button', { name: 'Guardar' }).click();
const espaco = mae.getByRole('dialog', { name: 'Chá da Helena' });
await espaco.getByText('Tema: Ursinhos').waitFor();
check(await espaco.getByRole('button', { name: /^Tarefas: 0\/11/ }).isVisible(), 'o painel mostra as tarefas do roteiro');
check(await espaco.getByText('Faltam 7 dias').isVisible(), 'com a contagem até o dia');
check(await espaco.getByText(/Definir a data, o local e o estilo/).isVisible() && (await espaco.getByText('Para já ·').first().isVisible()), 'os passos que já passaram aparecem como "para já"');

const tarefas = espaco.getByRole('region', { name: 'Tarefas' });
await tarefas.getByRole('button', { name: /^Marcar como feita: Definir a data/ }).click();
await espaco.getByRole('button', { name: /^Tarefas: 1\/11/ }).waitFor();
check(true, 'marca a primeira tarefa como feita');
// Editar uma tarefa: muda o nome e quem cuida.
await tarefas.getByRole('button', { name: 'Escolher o tema e as cores: editar' }).click();
const editarTarefa = tarefas.getByRole('form', { name: 'Editar tarefa' });
await editarTarefa.getByLabel('O que fazer').fill('Escolher o tema, as cores e o bolo');
await editarTarefa.getByRole('group', { name: 'Quem cuida' }).getByRole('button', { name: 'Pai' }).click();
await editarTarefa.getByRole('button', { name: 'Guardar' }).click();
await tarefas.getByRole('button', { name: 'Escolher o tema, as cores e o bolo: editar' }).waitFor();
check(await tarefas.getByText(/Pai/).first().isVisible(), 'edita a tarefa ali mesmo');

await espaco.getByRole('tab', { name: 'Fornecedores' }).click();
const fornecedores = espaco.getByRole('region', { name: 'Fornecedores' });
await fornecedores.getByRole('button', { name: 'Novo fornecedor' }).click();
const novoFornecedor = fornecedores.getByRole('form', { name: 'Novo fornecedor' });
await novoFornecedor.getByLabel('Fornecedor ou serviço').fill('Bolo da Ju');
await novoFornecedor.getByLabel('Contato').fill('11 99999-0000');
const valor = novoFornecedor.getByLabel('Valor');
await valor.pressSequentially('90000');
check((await valor.inputValue()).replace(/\s/g, ' ') === 'R$ 900,00', 'o valor do fornecedor também vira moeda ao digitar');
await novoFornecedor.getByRole('group', { name: 'Situação' }).getByRole('button', { name: 'Contratado' }).click();
await novoFornecedor.getByRole('button', { name: 'Adicionar' }).click();
await fornecedores.getByRole('button', { name: 'Bolo da Ju: editar' }).waitFor();
const regua = espaco.getByRole('region', { name: 'Orçamento' });
check(await regua.getByText('90%').isVisible(), 'a régua do orçamento mostra o percentual');
check(await regua.getByText(/Atenção: só R\$\s100 até o limite/).isVisible(), 'e avisa quando está perto do limite');
// Um segundo orçamento, ainda aberto, que estouraria o previsto.
await fornecedores.getByRole('button', { name: 'Novo fornecedor' }).click();
await fornecedores.getByRole('form', { name: 'Novo fornecedor' }).getByLabel('Fornecedor ou serviço').fill('Decoração');
await fornecedores.getByRole('form', { name: 'Novo fornecedor' }).getByLabel('Valor').pressSequentially('40000');
await fornecedores.getByRole('form', { name: 'Novo fornecedor' }).getByRole('button', { name: 'Adicionar' }).click();
await regua.getByText(/vai a 130% do previsto/).waitFor();
check(true, 'avisa quanto fica se fecharem os orçamentos abertos');
await espaco.evaluate(el => el.scrollTo(0, 0));
await mae.screenshot({ path: `${OUT}celebracao-painel.png` });

await espaco.getByRole('tab', { name: 'Convidados' }).click();
const convidados = espaco.getByRole('region', { name: 'Convidados' });
for (const [nome, pessoas] of [['Tia Lu', 2], ['Vó Rosa', 1], ['Bia', 1]]) {
  await convidados.getByRole('button', { name: 'Novo convidado' }).click();
  const novo = convidados.getByRole('form', { name: 'Novo convidado' });
  await novo.getByLabel('Nome (ou família)').fill(nome);
  for (let i = 1; i < pessoas; i++) await novo.getByRole('button', { name: 'Uma pessoa a mais' }).click();
  await novo.getByRole('button', { name: 'Adicionar' }).click();
  await convidados.getByRole('button', { name: `${nome}: editar` }).waitFor();
}
await convidados.getByRole('button', { name: 'Tia Lu: editar' }).click();
const tiaLu = convidados.getByRole('form', { name: 'Editar convidado' });
await tiaLu.getByRole('group', { name: 'Confirmação' }).getByRole('button', { name: 'Vai', exact: true }).click();
await tiaLu.getByRole('button', { name: 'Guardar' }).click();
await espaco.getByRole('button', { name: /^Convidados: 2\/4/ }).waitFor();
check(true, 'confirma a presença e o painel conta as pessoas');
check(await espaco.getByLabel('Calculadora de fraldas').isVisible(), 'a calculadora de fraldas divide os pacotes por tamanho');
await mae.screenshot({ path: `${OUT}celebracao-convidados.png`, fullPage: true });

// Apagar pede confirmação.
await convidados.getByRole('button', { name: 'Bia: editar' }).click();
const bia = convidados.getByRole('form', { name: 'Editar convidado' });
await bia.getByRole('button', { name: 'Apagar convidado' }).click();
await bia.getByRole('button', { name: 'Apagar', exact: true }).click();
await convidados.getByRole('button', { name: 'Bia: editar' }).waitFor({ state: 'detached' });
check(true, 'tira um convidado da lista, com confirmação');

await espaco.getByRole('button', { name: 'Voltar' }).click();
await mae.getByRole('list', { name: 'Celebrações' }).getByRole('button', { name: 'Chá da Helena: abrir' }).waitFor();
await mae.screenshot({ path: `${OUT}celebracao-lista.png` });

// No Início: o cartão com a contagem, e o Hoje sem os passos que já passaram.
await mae.getByRole('button', { name: /^Início/ }).first().click();
const teaser = mae.getByRole('button', { name: 'Chá da Helena: abrir' });
await teaser.waitFor({ timeout: 10000 });
check(await teaser.getByText(/Próximo passo:/).isVisible(), 'o Início mostra o chá e o próximo passo');
check((await mae.getByRole('button', { name: /Chá da Helena: .*: ver detalhes/ }).count()) === 0 || !(await mae.getByText('atrasada').count()), 'o Hoje não fica lotado de passos vencidos do chá');
check((await mae.getByText(/Chá da Helena · atrasada/).count()) === 0, 'nenhum passo do chá aparece como atrasado no Hoje');
await mae.screenshot({ path: `${OUT}celebracao-inicio.png` });

// Na Agenda, o dia da festa.
await mae.getByRole('button', { name: /^Agenda/ }).first().click();
await mae.getByText('Chá da Helena').first().waitFor({ timeout: 10000 });
check(true, 'a Agenda mostra o chá');

// O ícone do Parto, apagado e aceso, nos dois temas.
await mae.getByRole('button', { name: /^Parto/ }).first().click();
await mae.waitForTimeout(400);
await mae.locator('nav[aria-label="Seções"]').last().screenshot({ path: `${OUT}menu-parto.png` });
const escuro = await phone(b, { colorScheme: 'dark' });
await escuro.goto(mae.url());
await escuro.context().addCookies(await mae.context().cookies());
await escuro.reload();
await escuro.getByRole('button', { name: /^Parto/ }).first().click();
await escuro.waitForTimeout(400);
await escuro.locator('nav[aria-label="Seções"]').last().screenshot({ path: `${OUT}menu-parto-escuro.png` });
await escuro.getByRole('button', { name: /^Diário/ }).first().click();
await escuro.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /Celebrações/ }).click();
await escuro.getByRole('button', { name: 'Chá da Helena: abrir' }).click();
await escuro.getByRole('region', { name: 'Orçamento' }).waitFor();
await escuro.screenshot({ path: `${OUT}celebracao-escuro.png` });

await b.close();
finish();
