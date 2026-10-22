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
const capitulo = mae.getByRole('region', { name: 'Capítulo da semana' });
await capitulo.waitFor();
check(await capitulo.getByText('Capítulo 21', { exact: false }).first().isVisible(), 'o capítulo que acabou de fechar aparece no Mural');
check(
  await capitulo.getByText('Depois de uma semana quieta, vocês voltaram a guardar lembranças. Teve um momento daqueles que a gente não esquece, a primeira carta para o bebê, uma foto nova e abraços trocados.').isVisible(),
  'a semana contada como história, comparada com a anterior e sem números (nem o que é "Só eu")',
);
check(await capitulo.getByText('“Ouvimos o coração pela primeira vez!”').isVisible(), 'o título do capítulo é o momento mais abraçado, nas palavras deles');
check(await capitulo.getByText('“Querido bebê, já te amamos.”').isVisible() && (await capitulo.getByText('Para guardar desta semana').isVisible()), 'e outra lembrança em destaque');
check(await capitulo.getByRole('button', { name: 'Começar o capítulo 22' }).isVisible(), 'e o convite para o próximo capítulo');
check(await capitulo.getByText('O bebê na semana 21').isVisible() && (await capitulo.getByText(/Do tamanho de uma manga/).isVisible()), 'cada capítulo traz o bebê daquela semana');
check(await capitulo.getByText('A barriga ainda não apareceu no livro. Uma foto de lado já é um começo lindo.').isVisible(), 'e um convite gentil a partir do que falta no fichário');
await mae.screenshot({ path: `${OUT}livro-mural.png` });

await capitulo.getByRole('button', { name: 'Ver o livro' }).click();
const livro = mae.getByRole('list', { name: 'Capítulos' });
await livro.waitFor();
check(await mae.getByText('Um livro que cresce junto com o bebê').isVisible(), 'o livro se apresenta sem contagem');
check(await livro.getByRole('article', { name: 'Capítulo 22' }).getByText('sendo escrito', { exact: false }).isVisible(), 'o capítulo de hoje está sendo escrito');
check(await livro.getByText('“Contamos para a família”').isVisible(), 'cada capítulo leva o nome do seu momento');
check(await livro.getByText(/Capítulos 17 a 20/).isVisible() && (await livro.getByText(/Semanas quietas/).isVisible()), 'semanas sem registro viram uma linha só, sem cobrança');
await mae.screenshot({ path: `${OUT}livro.png`, fullPage: true });

// ---- O livro em PDF ----
await mae.getByRole('button', { name: 'Baixar o livro em PDF' }).click();
const pdf = mae.getByRole('dialog', { name: 'O livro para imprimir' });
await pdf.waitFor();
check(await pdf.getByRole('heading', { name: 'Ana', level: 1 }).isVisible(), 'o PDF abre com a capa do livro');
check(await pdf.getByText('Querido bebê, já te amamos.').isVisible() && (await pdf.getByText('Ouvimos o coração pela primeira vez! Choramos juntos.').isVisible()), 'com tudo o que escreveram, inteiro');
check((await pdf.getByText('Só meu').count()) === 0, 'sem o que é "Só eu"');
check(await pdf.getByRole('button', { name: 'Salvar em PDF' }).isVisible(), 'e o botão de salvar em PDF');
await mae.screenshot({ path: `${OUT}livro-pdf.png` });
await mae.emulateMedia({ media: 'print' });
await mae.pdf?.({ path: `${OUT}livro.pdf` }).catch(() => undefined);
await mae.emulateMedia({ media: 'screen' });
await pdf.getByRole('button', { name: 'Fechar' }).click();
check((await pdf.count()) === 0, 'e fecha');

await finish(b);
