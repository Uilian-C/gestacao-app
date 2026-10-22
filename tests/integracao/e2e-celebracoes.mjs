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
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /Celebrações/ }).click();
await mae.getByText('Os encontros que vão fazer parte da história de vocês').waitFor();
check(true, 'Diário → Celebrações');
await mae.getByRole('button', { name: 'Nova celebração' }).click();
await mae.getByRole('list', { name: 'Que celebração?' }).getByRole('button', { name: /Chá de bebê/ }).click();

const cha = mae.getByRole('dialog', { name: 'Chá de bebê' });
await cha.waitFor();
const form = cha.getByRole('form', { name: 'Detalhes da celebração' });
check(await form.isVisible(), 'abre direto nos detalhes, para marcar a data');
await form.getByLabel('Nome da celebração').fill('Chá da Helena');
await form.getByLabel('Data', { exact: true }).fill(day(40));
await form.getByLabel('Hora', { exact: true }).fill('15:00');
await form.getByLabel('Local', { exact: true }).fill('Salão do prédio');
await form.getByLabel('Tema', { exact: true }).fill('Ursinhos');
await form.getByRole('button', { name: /^Cor / }).first().click();
await form.getByLabel('Orçamento previsto').fill('1500');
await form.getByRole('button', { name: 'Guardar' }).click();
const espaco = mae.getByRole('dialog', { name: 'Chá da Helena' });
await espaco.getByText('Tema: Ursinhos').waitFor();
check(await espaco.getByText('0/11', { exact: true }).isVisible(), 'o roteiro de tarefas já vem pronto');
check(await espaco.getByText(/Faltam 40 dias/i).isVisible(), 'com a contagem até o dia');
await mae.screenshot({ path: `${OUT}celebracao-espaco.png` });

const tarefas = espaco.getByRole('region', { name: 'Tarefas' });
await tarefas.getByRole('button', { name: /^Marcar como feita: Definir a data/ }).click();
await espaco.getByText('1/11', { exact: true }).waitFor();
check(true, 'marca a primeira tarefa como feita');

await espaco.getByRole('tab', { name: 'Fornecedores' }).click();
const fornecedores = espaco.getByRole('region', { name: 'Fornecedores' });
await fornecedores.getByLabel('Fornecedor', { exact: true }).fill('Bolo da Ju');
await fornecedores.getByLabel('Valor', { exact: true }).fill('350');
await fornecedores.getByRole('button', { name: 'Adicionar fornecedor' }).click();
await fornecedores.getByText('Bolo da Ju').waitFor();
check(true, 'guarda um fornecedor com valor');

await espaco.getByRole('tab', { name: 'Convidados' }).click();
const convidados = espaco.getByRole('region', { name: 'Convidados' });
for (const nome of ['Tia Lu', 'Vó Rosa', 'Bia']) {
  await convidados.getByLabel('Convidado', { exact: true }).fill(nome);
  await convidados.getByRole('button', { name: 'Adicionar convidado' }).click();
  await convidados.getByText(nome, { exact: true }).waitFor();
}
check(await espaco.getByLabel('Calculadora de fraldas').isVisible(), 'a calculadora de fraldas divide os pacotes por tamanho');
await mae.screenshot({ path: `${OUT}celebracao-convidados.png`, fullPage: true });

await espaco.getByRole('button', { name: 'Voltar' }).click();
await mae.getByRole('list', { name: 'Celebrações' }).getByRole('button', { name: 'Chá da Helena: abrir' }).waitFor();
await mae.screenshot({ path: `${OUT}celebracao-lista.png` });

// No Início, a 60 dias ou menos, a contagem e o próximo passo.
await mae.getByRole('button', { name: /^Início/ }).first().click();
const teaser = mae.getByRole('button', { name: 'Chá da Helena: abrir' });
await teaser.waitFor({ timeout: 10000 });
check(await teaser.getByText(/Próximo passo: Escolher o tema/).isVisible(), 'o Início mostra o chá e o próximo passo');
await mae.screenshot({ path: `${OUT}celebracao-inicio.png` });
await teaser.click();
await mae.getByRole('dialog', { name: 'Chá da Helena' }).waitFor();
check(true, 'e abre o espaço do chá');
await mae.getByRole('dialog', { name: 'Chá da Helena' }).getByRole('button', { name: 'Voltar' }).click();

// Na Agenda, o dia da festa e os prazos.
await mae.getByRole('button', { name: /^Agenda/ }).first().click();
await mae.getByText('Chá da Helena').first().waitFor({ timeout: 10000 });
check(true, 'a Agenda mostra o chá e os prazos das tarefas');

await b.close();
finish();
