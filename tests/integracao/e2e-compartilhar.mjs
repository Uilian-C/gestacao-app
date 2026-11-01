// Cartões com a cara do casal: a lembrança (a foto e a frase de quem
// escreveu), a primeira vez, a barriga ao lado da primeira foto, o trecho de
// carta e o nome escolhido. Cada um com a prévia, nos formatos stories e post,
// e contado no servidor sem conteúdo.
import pg from 'pg';
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const count = async kind => Number((await db.query('SELECT count(*)::int AS n FROM product_events WHERE kind = $1', [kind])).rows[0].n);

const b = await launch();
const mae = await phone(b, { acceptDownloads: true });
await quickAccount(mae, { name: 'Ana' });
const post = (path, body) => mae.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);
const dia = n => mae.evaluate(n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA'); }, n);
const foto = (a, c) => mae.evaluate(([a, c]) => { const k = document.createElement('canvas'); k.width = 600; k.height = 800; const g = k.getContext('2d'); const grd = g.createLinearGradient(0, 0, 600, 800); grd.addColorStop(0, a); grd.addColorStop(1, c); g.fillStyle = grd; g.fillRect(0, 0, 600, 800); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(320, 470, 150, 200, 0, 0, Math.PI * 2); g.fill(); return k.toDataURL('image/jpeg', 0.85).split(',')[1]; }, [a, c]);
const entry = async (body, extra = {}, cores = null) => {
  const { id } = await post('/api/data', { op: 'createEntry', date: await dia(extra.daysAgo ?? 0), body, visibility: 'shared', remindOn: null, folder: extra.folder ?? 'momento', ...(extra.firstTime ? { firstTime: extra.firstTime } : {}) });
  if (cores) await post('/api/fotos', { op: 'add', entryId: id, data: await foto(...cores) });
  return id;
};

const momento = await entry('Fomos ao parque e ele não parou de mexer. Comemos pastel e rimos à toa.', {}, ['#f6c7d6', '#c9b8f0']);
const chute = await entry('Sentimos você mexer pela primeira vez, na aula de yoga da mamãe!', { firstTime: 'chute', daysAgo: 2 });
await entry('', { folder: 'barriga', daysAgo: 56 }, ['#fde2cf', '#f6c7d6']);
const barriga = await entry('', { folder: 'barriga' }, ['#f6c7d6', '#e7c9f5']);
const carta = await entry('Filha, ainda nem te conheço e já sei o seu cheiro de tanto imaginar. Seu pai já fala com a barriga toda noite. Estamos te esperando com a casa cheia de amor.', { folder: 'carta', daysAgo: 1 });
await post('/api/data', { op: 'setBabyName', name: 'Helena' });

const antes = {};
for (const k of ['cartao_momento', 'cartao_primeira_vez', 'cartao_barriga', 'cartao_carta', 'cartao_nome']) antes[k] = await count(k);
await mae.evaluate(() => localStorage.setItem('tumtum-nome-revelado', 'Helena'));

/** Abre o registro (pelo link do aviso), toca em compartilhar e salva nos dois formatos. */
const compartilhar = async (id, botao, nome) => {
  await mae.goto(`${BASE}/?voz=${id}`);
  await mae.getByRole('button', { name: botao }).click();
  const folha = mae.getByRole('dialog', { name: 'Compartilhar' });
  const previa = folha.getByRole('img', { name: 'Prévia do cartão para compartilhar' });
  await previa.waitFor();
  await mae.waitForTimeout(300);
  await mae.screenshot({ path: `${OUT}compartilhar-${nome}-folha.png` });
  for (const formato of ['Post', 'Stories e status']) {
    await folha.getByRole('radio', { name: formato }).or(folha.getByRole('button', { name: formato })).first().click();
    await mae.waitForTimeout(400);
    await previa.waitFor();
    const d = mae.waitForEvent('download');
    await folha.getByRole('button', { name: 'Salvar' }).click();
    const arq = await d;
    await arq.saveAs(`${OUT}cartao-${nome}-${formato === 'Post' ? 'post' : 'stories'}.png`);
    if (formato === 'Post') {
      check(arq.suggestedFilename().endsWith('-post.png'), `${nome}: o post sai no formato 4:5`);
      await mae.getByRole('button', { name: botao }).click();
      await folha.getByRole('img', { name: 'Prévia do cartão para compartilhar' }).waitFor();
    }
  }
};

await compartilhar(momento, 'Compartilhar esta lembrança', 'lembranca');
check((await count('cartao_momento')) === antes.cartao_momento + 2, 'a lembrança compartilhada é contada (sem conteúdo)');
await compartilhar(chute, 'Compartilhar esta primeira vez', 'primeira-vez');
check((await count('cartao_primeira_vez')) === antes.cartao_primeira_vez + 2, 'a primeira vez tem o cartão dela');
await compartilhar(barriga, 'Compartilhar a barriguinha', 'barriga');
check((await count('cartao_barriga')) === antes.cartao_barriga + 2, 'a barriguinha sai ao lado da primeira foto');
await compartilhar(carta, 'Compartilhar um trecho', 'carta');
check((await count('cartao_carta')) === antes.cartao_carta + 2, 'o trecho da carta sai assinado');

// ---- O nome escolhido (pelo caderno de nomes) ----
await mae.goto(BASE);
await mae.getByRole('button', { name: 'Ajuda' }).click();
await mae.getByRole('searchbox', { name: 'Buscar na ajuda' }).fill('caderno de nomes');
await mae.getByText('Como funciona o caderno de nomes?').click();
await mae.getByRole('button', { name: 'Abrir o caderno de nomes' }).click();
await mae.getByText('O nome escolhido').waitFor();
await mae.getByRole('button', { name: 'Compartilhar', exact: true }).click();
const folhaNome = mae.getByRole('dialog', { name: 'Compartilhar' });
await folhaNome.getByRole('img', { name: 'Prévia do cartão para compartilhar' }).waitFor();
const dn = mae.waitForEvent('download');
await folhaNome.getByRole('button', { name: 'Salvar' }).click();
await (await dn).saveAs(`${OUT}cartao-nome-stories.png`);
check((await count('cartao_nome')) === antes.cartao_nome + 1, 'o nome escolhido vira cartão, por cima do caderno');

await db.end();
await b.close();
finish();
