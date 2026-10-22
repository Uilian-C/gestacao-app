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

// Enquanto não escolheram o nome, ele ganha destaque no Início.
await mae.getByRole('button', { name: 'Escolhendo o nome do bebê: abrir' }).waitFor({ timeout: 10000 });
check(true, 'no Início, "Qual vai ser o nome?" aparece logo abaixo do bebê');
await mae.screenshot({ path: `${OUT}nomes-inicio.png` });

await mae.getByRole('button', { name: /^Diário/ }).first().click();
const tabs = mae.getByRole('navigation', { name: 'Pastas do diário' });
check((await tabs.getByRole('button').count()) === 4, 'o Diário tem quatro lugares: Mural, Fichário, Livro e Celebrações');
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

// O fichário do nome: cada nome é uma ficha com o porquê, quem curtiu e a conversa (com data e hora).
await mae.getByRole('button', { name: /Qual vai ser o nome\? Ele vai para a capa/ }).click();
const nomes = mae.getByRole('dialog', { name: 'O nome do bebê' });
await nomes.waitFor();
check(await mae.evaluate(() => document.body.style.position === 'fixed'), 'a página de fundo fica parada enquanto o fichário do nome está aberto');
await nomes.getByRole('textbox', { name: 'Sugerir um nome' }).fill('helena');
await nomes.getByRole('textbox', { name: 'Por que esse nome?' }).fill('Era o nome da bisavó');
await nomes.getByRole('button', { name: 'Anotar', exact: true }).click();
await nomes.getByRole('button', { name: 'Ficha de Helena: abrir' }).waitFor();
await nomes.getByRole('textbox', { name: 'Sugerir um nome' }).fill('Alice');
await nomes.getByRole('button', { name: 'Anotar', exact: true }).click();
await nomes.getByRole('button', { name: 'Ficha de Alice: abrir' }).waitFor();
check(await nomes.getByRole('button', { name: 'Ficha de Helena: abrir' }).getByText(/você · hoje, \d{2}:\d{2}/).isVisible(), 'cada ficha mostra quem anotou, a data e a hora');
await mae.screenshot({ path: `${OUT}nomes.png` });

// Tirar uma ficha sempre pede confirmação.
await nomes.getByRole('button', { name: 'Ficha de Alice: abrir' }).click();
await nomes.getByRole('button', { name: 'Tirar esta ficha do fichário' }).click();
check(await nomes.getByText(/Tirar Alice do fichário\? O porquê e a conversa saem junto\./).isVisible(), 'tirar uma ficha pede confirmação');
await nomes.getByRole('button', { name: 'Manter' }).click();
await nomes.getByRole('button', { name: 'Tirar esta ficha do fichário' }).click();
await nomes.getByRole('button', { name: 'Tirar', exact: true }).click();
await nomes.getByRole('button', { name: 'Ficha de Helena: abrir' }).waitFor();
check((await nomes.getByRole('button', { name: 'Ficha de Alice: abrir' }).count()) === 0, 'e só sai depois de confirmar');

// A ficha aberta: o porquê, quem curtiu e a conversa.
await nomes.getByRole('button', { name: 'Ficha de Helena: abrir' }).click();
const ideia = nomes.getByRole('article', { name: 'Ficha de Helena' });
await ideia.waitFor();
check((await ideia.getByRole('button', { name: 'Descurtir Helena' }).getAttribute('aria-pressed')) === 'true' && (await ideia.getByText('“Era o nome da bisavó”').isVisible()), 'a ficha guarda o porquê, já curtida por quem anotou');
await ideia.getByRole('textbox', { name: 'Comentar sobre Helena' }).fill('Amo esse nome');
await ideia.getByRole('button', { name: 'Enviar' }).click();
await ideia.getByText('Amo esse nome').waitFor();
check(await ideia.getByText(/^Você · hoje, \d{2}:\d{2}$/).isVisible(), 'e a conversa, com data e hora de cada comentário');
await ideia.getByRole('button', { name: 'Apagar', exact: true }).click();
check(await ideia.getByText('Apagar este comentário?').isVisible(), 'apagar um comentário também pede confirmação');
await ideia.getByRole('button', { name: 'Manter' }).click();
await mae.screenshot({ path: `${OUT}nomes-ficha.png`, fullPage: true });
await ideia.getByRole('button', { name: 'Escolher Helena' }).click();
await ideia.getByRole('button', { name: 'É esse!' }).click();
const revelacao = mae.getByRole('dialog', { name: 'Nome escolhido' });
await revelacao.waitFor();
check(await revelacao.locator('.tt-revelacao-coracao').isVisible() && (await revelacao.getByText('Escolhido com amor').isVisible()), 'escolher o nome vira revelação, com a batida do Tumtum');
await mae.waitForTimeout(2600);
await mae.screenshot({ path: `${OUT}nomes-festa.png` });
await revelacao.getByRole('button', { name: 'Contar no Mural' }).click();
await revelacao.waitFor({ state: 'hidden' });
await nomes.getByText('O nome escolhido').waitFor();
check(await nomes.getByText('A história do nome').isVisible(), 'depois, o fichário vira a história do nome');
await mae.screenshot({ path: `${OUT}nomes-historia.png` });
await nomes.getByRole('button', { name: 'Voltar' }).click();
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
check(await aberto.getByText(/^Carta · \d{2}\/\d{2}\/\d{4}$/).isVisible(), 'cada registro com a data');
check(await aberto.getByText(/^Ninguém contou como estava nesta semana/).isVisible(), 'e o humor da semana (aqui, o convite para contar)');
check(await aberto.getByText(/página 4 de 6/).isVisible(), 'o rodapé diz em que página do livro vocês estão');
await mae.screenshot({ path: `${OUT}livro-pagina.png` });
await aberto.getByRole('button', { name: 'Próxima página' }).click();
check(await aberto.getByText(/Semana 22 · sendo escrita/).isVisible() && (await aberto.getByText(/^Momento · \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/).isVisible()), 'e a semana de hoje, sendo escrita, com o nome escolhido (e a hora do post)');
await aberto.getByRole('button', { name: 'Próxima página' }).click();
const paginaNome = aberto.getByRole('region', { name: 'A página do nome: Helena' });
check(await paginaNome.isVisible() && (await paginaNome.getByText('“Era o nome da bisavó”').isVisible()), 'a semana da escolha ganha a página do nome, com o porquê');
await mae.waitForTimeout(400);
await mae.screenshot({ path: `${OUT}livro-pagina-nome.png` });
// O sumário leva direto a uma semana.
await aberto.getByRole('button', { name: 'Sumário' }).click();
await aberto.getByRole('dialog', { name: 'Sumário do livro' }).getByRole('button', { name: /^Semana 16/ }).click();
check(await aberto.getByRole('heading', { name: '“Contamos para a família”' }).isVisible(), 'pelo sumário, pula para qualquer semana');
await aberto.getByRole('button', { name: 'Próxima página' }).click();
await aberto.getByRole('button', { name: 'Próxima página' }).click();
await aberto.getByRole('button', { name: 'Próxima página' }).click();
await aberto.getByRole('button', { name: 'Página anterior' }).click();
await aberto.getByRole('button', { name: 'Página anterior' }).click();
await aberto.getByRole('button', { name: 'Página anterior' }).click();
check(await aberto.getByText('Capítulo 4').first().isVisible(), 'voltando, chega ao capítulo anterior');
await aberto.getByRole('button', { name: 'Fechar o livro' }).click();
check(await mae.getByRole('button', { name: 'Continuar da semana 16' }).isVisible(), 'e o livro lembra onde vocês pararam');

// ---- Imprimir para o fichário: só as páginas escolhidas ----
await mae.evaluate(() => (window.print = () => undefined));
await mae.getByRole('button', { name: /Imprimir para o fichário/ }).click();
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
// No modo escuro do celular, o papel do livro continua claro e legível.
await mae.emulateMedia({ colorScheme: 'dark' });
const tinta = await pdf.getByRole('heading', { name: 'Helena', level: 1 }).evaluate(el => getComputedStyle(el).color);
check(tinta === 'rgb(43, 38, 34)', `no modo escuro, o papel continua claro com letra escura (${tinta})`);
await mae.emulateMedia({ colorScheme: 'light', media: 'print' });
await mae.pdf?.({ path: `${OUT}livro.pdf` }).catch(() => undefined);
await mae.emulateMedia({ media: 'screen' });
await pdf.getByRole('button', { name: 'Imprimir' }).click();
await pdf.getByRole('button', { name: 'Fechar' }).click();
await escolha.getByRole('button', { name: 'Fechar' }).click();
await mae.getByRole('button', { name: /Imprimir para o fichário/ }).click();
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
