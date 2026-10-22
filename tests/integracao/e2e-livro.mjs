// O livro de vocês: cada semana vira um capítulo contado como história.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
// Hoje é o 2º dia da semana 22: o capítulo 21 acabou de fechar.
const day = n => {
  const d = new Date(Date.now() - n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dum = day(22 * 7 + 1);
await quickAccount(mae, { name: 'Ana', dum });

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]).toString('base64');
await mae.evaluate(
  async ({ jpg, d3, d5, d40 }) => {
    const post = async (path, body) => (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
    const entry = body => post('/api/data', { op: 'createEntry', visibility: 'shared', remindOn: null, ...body });
    const a = await entry({ date: d3, body: 'Ouvimos o coração pela primeira vez! Choramos juntos.', folder: 'momento' });
    await post('/api/fotos', { op: 'add', entryId: a.id, data: jpg });
    await post('/api/data', { op: 'react', targetType: 'entry', targetId: a.id, kind: 'abraco', on: true });
    await entry({ date: d5, body: 'Querido bebê, já te amamos.', folder: 'carta' });
    await entry({ date: d5, body: 'Só meu', folder: 'dia', visibility: 'private' });
    await entry({ date: d40, body: 'Contamos para a família', folder: 'momento' });
  },
  { jpg: JPG, d3: day(3), d5: day(5), d40: day(40) },
);
await mae.reload();

await mae.getByRole('button', { name: /^Diário/ }).first().click();
const tabs = mae.getByRole('navigation', { name: 'Pastas do diário' });
check((await tabs.getByRole('button').count()) === 3, 'o Diário tem só três lugares: Mural, Fichário e Livro');
const capitulo = mae.getByRole('region', { name: 'Página da semana' });
await capitulo.waitFor();
check(await capitulo.getByText('Uma página nova no livro de vocês').isVisible(), 'a semana que acabou de fechar aparece no Mural como página nova do livro');
check(
  await capitulo.getByText('Depois de uma semana quieta, vocês voltaram a guardar lembranças. Teve um momento daqueles que a gente não esquece, a primeira carta para o bebê, uma foto nova e abraços trocados.').isVisible(),
  'a semana contada como história, comparada com a anterior e sem números (nem o que é "Só eu")',
);
check(await capitulo.getByText('“Ouvimos o coração pela primeira vez!”').isVisible(), 'o título da página é o momento mais abraçado, nas palavras deles');
check(await capitulo.getByText('O bebê na semana 21').isVisible() && (await capitulo.getByText(/Do tamanho de uma manga/).isVisible()), 'com o bebê daquela semana');
check(await capitulo.getByRole('button', { name: 'Começar a semana 22' }).isVisible(), 'e o convite para a próxima');
await mae.screenshot({ path: `${OUT}livro-mural.png` });

// ---- O livro: capítulos por mês ----
await capitulo.getByRole('button', { name: 'Ver o livro' }).click();
const livro = mae.getByRole('list', { name: 'Capítulos' });
await livro.waitFor();
check(await mae.getByText('Um dia vocês vão ler estas páginas juntos, com o bebê no colo.').isVisible(), 'o livro convida com afeto, sem contagem');
check(await livro.getByRole('button', { name: /^Capítulo 5: Os primeiros chutinhos/ }).isVisible() && (await livro.getByRole('button', { name: /^Capítulo 4: Ganhando forma/ }).isVisible()), 'cada mês é um capítulo');

// O nome do bebê vai para a capa e para o app todo.
await mae.getByRole('button', { name: /Já escolheram o nome/ }).click();
await mae.getByRole('textbox', { name: 'Nome do bebê' }).fill('Helena');
await mae.getByRole('button', { name: 'Guardar', exact: true }).click();
await mae.getByText('O livro de Helena').waitFor();
check(await mae.getByText('Um dia vocês vão ler estas páginas juntos, com Helena no colo.').isVisible(), 'com o nome escolhido, o livro passa a ser de Helena');
await mae.screenshot({ path: `${OUT}livro.png`, fullPage: true });

// Abrir um capítulo é abrir o livro: folhear página por página.
await livro.getByRole('button', { name: /^Capítulo 5/ }).click();
const aberto = mae.getByRole('dialog', { name: 'O livro de Helena' });
await aberto.waitFor();
check(await aberto.getByText('O quinto mês de Helena').isVisible(), 'o capítulo abre na sua abertura');
await mae.screenshot({ path: `${OUT}livro-aberto.png` });
await aberto.getByRole('button', { name: 'Próxima página' }).click();
check(await aberto.getByRole('heading', { name: '“Ouvimos o coração pela primeira vez!”' }).isVisible() && (await aberto.getByText('Querido bebê, já te amamos.').isVisible()), 'a página seguinte é a semana, com tudo o que escreveram');
await mae.screenshot({ path: `${OUT}livro-pagina.png` });
await aberto.getByRole('button', { name: 'Próxima página' }).click();
check(await aberto.getByText(/Semana 22 · sendo escrita/).isVisible(), 'e a semana de hoje, ainda sendo escrita');
await aberto.getByRole('button', { name: 'Página anterior' }).click();
await aberto.getByRole('button', { name: 'Página anterior' }).click();
await aberto.getByRole('button', { name: 'Página anterior' }).click();
check(await aberto.getByText('Capítulo 4').first().isVisible(), 'voltando, chega ao capítulo anterior');
await aberto.getByRole('button', { name: 'Fechar o livro' }).click();

// ---- Imprimir para o fichário: só as páginas escolhidas ----
await mae.evaluate(() => (window.print = () => undefined));
await mae.getByRole('button', { name: /Imprimir para o fichário de memórias/ }).click();
const escolha = mae.getByRole('dialog', { name: 'Imprimir para o fichário' });
await escolha.waitFor();
check((await escolha.getByRole('button', { name: /Semana 21/ }).getAttribute('aria-pressed')) === 'true' && (await escolha.getByRole('button', { name: /Semana 16/ }).getAttribute('aria-pressed')) === 'true', 'as páginas novas já vêm marcadas');
await escolha.getByRole('button', { name: /Semana 16/ }).click();
await mae.screenshot({ path: `${OUT}livro-escolha.png` });
await escolha.getByRole('button', { name: 'Montar as páginas' }).click();
const pdf = mae.getByRole('dialog', { name: 'Páginas para imprimir' });
await pdf.waitFor();
check(await pdf.getByRole('heading', { name: 'Helena', level: 1 }).isVisible() && (await pdf.getByText('contado por Ana').isVisible()), 'a capa leva o nome do bebê');
check(await pdf.getByText('Querido bebê, já te amamos.').isVisible() && (await pdf.getByText('Contamos para a família').count()) === 0, 'só as páginas escolhidas, com tudo o que escreveram');
check((await pdf.getByText('Só meu').count()) === 0, 'sem o que é "Só eu"');
await mae.emulateMedia({ media: 'print' });
await mae.pdf?.({ path: `${OUT}livro.pdf` }).catch(() => undefined);
await mae.emulateMedia({ media: 'screen' });
await pdf.getByRole('button', { name: 'Imprimir' }).click();
await pdf.getByRole('button', { name: 'Fechar' }).click();
await escolha.getByRole('button', { name: 'Fechar' }).click();
await mae.getByRole('button', { name: /Imprimir para o fichário de memórias/ }).click();
check((await escolha.getByRole('button', { name: /Semana 21/ }).getAttribute('aria-pressed')) === 'false' && (await escolha.getByRole('button', { name: /Semana 16/ }).getAttribute('aria-pressed')) === 'true', 'depois de imprimir, só o que falta vem marcado');
await escolha.getByRole('button', { name: 'Fechar' }).click();

// ---- No Início: o nome do bebê e o livro no coração ----
await mae.getByRole('button', { name: /^Início/ }).first().click();
const topo = mae.getByRole('region', { name: 'Semana da gestação' });
check(await topo.getByText('Helena', { exact: true }).isVisible(), 'o nome do bebê aparece no Início');
const chamada = topo.getByRole('button', { name: 'O livro de Helena: abrir' });
check(await chamada.isVisible() && (await chamada.getByText('Uma página nova foi escrita').isVisible()), 'e o livro chama no coração do Início');
await mae.screenshot({ path: `${OUT}livro-inicio.png` });
await chamada.click();
await livro.waitFor();
check(true, 'tocar leva ao livro');

await b.close();
finish();
