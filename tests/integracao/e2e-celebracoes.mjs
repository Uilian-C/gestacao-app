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
check(await espaco.getByRole('button', { name: /^Tarefas: 0 de 11/ }).isVisible(), 'o painel mostra as tarefas do roteiro');
check(await espaco.getByText('Faltam 7 dias').isVisible(), 'com a contagem até o dia');
check(await espaco.getByText(/Definir a data, o local e o estilo/).isVisible() && (await espaco.getByText('Para já ·').first().isVisible()), 'os passos que já passaram aparecem como "para já"');

const tarefas = espaco.getByRole('region', { name: 'Tarefas' });
await tarefas.getByRole('button', { name: /^Marcar como feita: Definir a data/ }).click();
await espaco.getByRole('button', { name: /^Tarefas: 1 de 11/ }).waitFor();
check(true, 'marca a primeira tarefa como feita');
// Abrir uma tarefa: só os ajustes (prazo, quem cuida, comentário), sem formulário de novo e sem "Guardar".
await tarefas.getByRole('button', { name: 'Escolher o tema e as cores: abrir' }).click();
check((await tarefas.getByRole('form').count()) === 0 && (await tarefas.getByRole('button', { name: 'Guardar' }).count()) === 0, 'abrir uma tarefa não abre o formulário inteiro');
await tarefas.getByRole('group', { name: 'Quem cuida' }).getByRole('button', { name: 'Pai' }).click();
await tarefas.getByRole('button', { name: 'Escolher o tema e as cores: fechar' }).getByText(/Pai/).waitFor();
check(true, 'quem cuida muda com um toque');
await tarefas.getByLabel('Comentário').fill('Ver com a Ju se dá para bolo de ursinho');
await tarefas.getByRole('button', { name: 'Salvar comentário' }).click();
await tarefas.getByRole('button', { name: 'Salvar comentário' }).waitFor({ state: 'detached' });
check(await tarefas.getByText(/bolo de ursinho/).first().isVisible(), 'e o comentário fica na ficha');

await espaco.getByRole('tab', { name: 'Fornecedores' }).click();
const fornecedores = espaco.getByRole('region', { name: 'Fornecedores' });
await fornecedores.getByRole('button', { name: 'Novo fornecedor' }).click();
const novoFornecedor = fornecedores.getByRole('form', { name: 'Novo fornecedor' });
await novoFornecedor.getByLabel('Fornecedor ou serviço').fill('Bolo da Ju');
await novoFornecedor.getByLabel('Contato').fill('11 99999-0000');
const valor = novoFornecedor.getByLabel('Valor');
await valor.pressSequentially('90000');
check((await valor.inputValue()).replace(/\s/g, ' ') === 'R$ 900,00', 'o valor do fornecedor vira moeda ao digitar');
await novoFornecedor.getByRole('button', { name: 'Adicionar' }).click();
await fornecedores.getByRole('button', { name: 'Bolo da Ju: abrir' }).click();
// A situação muda com um toque, sem formulário.
await fornecedores.getByRole('group', { name: 'Situação' }).getByRole('button', { name: 'Contratado' }).click();
const regua = espaco.getByRole('region', { name: 'Orçamento' });
await regua.getByText('90%').waitFor();
check(true, 'contratar com um toque já entra na régua do orçamento (90%)');
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
// O formulário novo fica à vista quando o teclado sobe (a tela encolhe).
await convidados.getByRole('button', { name: 'Novo convidado' }).click();
await mae.setViewportSize({ width: 390, height: 430 });
await mae.waitForTimeout(700);
const caixa = await convidados.getByRole('form', { name: 'Novo convidado' }).boundingBox();
check(caixa && caixa.y >= 0 && caixa.y + caixa.height <= 430, `com o teclado aberto, o formulário continua à vista (${Math.round(caixa?.y ?? -1)}–${Math.round((caixa?.y ?? 0) + (caixa?.height ?? 0))} de 430)`);
await mae.setViewportSize({ width: 390, height: 844 });
await convidados.getByRole('button', { name: 'Cancelar' }).click();
for (const [nome, pessoas] of [['Tia Lu', 2], ['Vó Rosa', 1], ['Bia', 1]]) {
  await convidados.getByRole('button', { name: 'Novo convidado' }).click();
  const novo = convidados.getByRole('form', { name: 'Novo convidado' });
  await novo.getByLabel('Nome (ou família)').fill(nome);
  for (let i = 1; i < pessoas; i++) await novo.getByRole('button', { name: 'Uma pessoa a mais' }).click();
  // Toque duplo no "Adicionar" não cria o convidado duas vezes.
  await novo.getByRole('button', { name: 'Adicionar' }).dblclick();
  await convidados.getByRole('button', { name: `${nome}: abrir` }).waitFor();
}
await mae.waitForTimeout(800);
check((await convidados.getByRole('button', { name: 'Tia Lu: abrir' }).count()) === 1, 'cada convidado entra uma vez só');
check(await espaco.getByRole('button', { name: /^Convidados: 0 de 4, confirmados · 4 sem resposta/ }).isVisible(), 'o painel conta 4 pessoas, sem duplicar');
await convidados.getByRole('button', { name: 'Tia Lu: abrir' }).click();
await convidados.getByRole('group', { name: 'Confirmação' }).getByRole('button', { name: 'Vai', exact: true }).click();
await espaco.getByRole('button', { name: /^Convidados: 2 de 4/ }).waitFor();
check(true, 'confirma a presença com um toque e o painel conta as pessoas');
await convidados.screenshot({ path: `${OUT}celebracao-ficha-aberta.png` });
check(await espaco.getByLabel('Calculadora de fraldas').isVisible(), 'a calculadora de fraldas divide os pacotes por tamanho');
await espaco.evaluate(el => el.scrollTo(0, 0));
await mae.screenshot({ path: `${OUT}celebracao-convidados.png`, fullPage: true });

// Apagar pede confirmação.
await convidados.getByRole('button', { name: 'Tia Lu: fechar' }).click();
await convidados.getByRole('button', { name: 'Bia: abrir' }).click();
await convidados.getByRole('button', { name: 'Apagar' }).click();
await convidados.getByRole('button', { name: 'Apagar', exact: true }).click();
await convidados.getByRole('button', { name: 'Bia: abrir' }).waitFor({ state: 'detached' });
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
