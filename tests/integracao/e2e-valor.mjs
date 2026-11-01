// Onda Valor: o Tumtum de hoje (fechar o dia vira página do livro e chama a
// outra pessoa), os cartões para compartilhar com a marca, o "Quero o livro
// impresso" e a contagem de uso (sem conteúdo) no servidor.
import pg from 'pg';
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const events = async kind => Number((await db.query('SELECT count(*)::int AS n FROM product_events WHERE kind = $1', [kind])).rows[0].n);
const before = { ritual: await events('ritual'), semana: await events('cartao_semana'), livro: await events('livro_impresso') };

const b = await launch();
const mae = await phone(b);
await quickAccount(mae, { name: 'Ana' });
const post = (page, path, body) => page.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);
const code = (await post(mae, '/api/family', { op: 'invite' })).code;
const pai = await phone(b);
await pai.goto(BASE);
await post(pai, '/api/auth/sign-up/email', { name: 'Caio', email: `caio${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(pai, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(pai, '/api/family', { op: 'join', code, role: 'pai' });

// ---- O aviso das 21h abre direto o Tumtum de hoje ----
await mae.goto(`${BASE}/?ritual=1`);
const ritual = mae.getByRole('dialog', { name: 'O Tumtum de hoje' });
await ritual.waitFor();
check(!mae.url().includes('ritual'), 'o link do aviso abre o Tumtum de hoje (e sai da URL)');
const fechar = ritual.getByRole('button', { name: 'Fechar o dia' });
check(await fechar.isDisabled(), 'sem humor nem frase, ainda não dá para fechar');
await ritual.getByRole('button', { name: 'Bem' }).click();
await ritual.getByLabel('Uma frase sobre hoje').fill('Ele mexeu muito depois do jantar');
await mae.screenshot({ path: `${OUT}valor-ritual.png` });
await fechar.click();
const carimbo = mae.getByRole('status').filter({ hasText: 'Entrou no livro' });
await carimbo.waitFor({ timeout: 10000 });
check(await carimbo.getByText('“Ele mexeu muito depois do jantar”').isVisible(), 'a frase do dia entra no livro');
const data = await mae.evaluate(async () => (await fetch('/api/data')).json());
const hoje = await mae.evaluate(() => new Date().toLocaleDateString('en-CA'));
check(data.journal.some(e => e.folder === 'dia' && e.body === 'Ele mexeu muito depois do jantar' && e.visibility === 'shared'), 'vira um registro do Dia a dia, para os dois');
check(data.checkins.some(c => c.mine && c.day === hoje && c.mood === 'bem'), 'e o humor do dia fica guardado');
check((await events('ritual')) === before.ritual + 1, 'o servidor conta um ritual (só o tipo, sem conteúdo)');
const row = (await db.query("SELECT * FROM product_events WHERE kind = 'ritual' ORDER BY id DESC LIMIT 1")).rows[0];
check(Object.keys(row).sort().join(',') === 'created_at,family_id,id,kind,user_id', 'a contagem não guarda nenhum conteúdo');

// ---- À noite, a outra pessoa vê "Ana fechou o dia. E o seu?" ----
const noite = new Date();
noite.setHours(20, 30, 0, 0);
await pai.clock.setFixedTime(noite);
await pai.goto(BASE);
const linha = pai.locator('section[aria-labelledby="hoje-titulo"]').getByRole('button', { name: /Ana fechou o dia\. E o seu\?/ });
await linha.waitFor();
check(await linha.getByText('“Ele mexeu muito depois do jantar”').isVisible(), 'à noite, o Para hoje mostra que a Ana fechou o dia, com a frase');
await pai.locator('section[aria-labelledby="hoje-titulo"]').screenshot({ path: `${OUT}valor-para-hoje.png` });
await linha.click();
const dele = pai.getByRole('dialog', { name: 'O Tumtum de hoje' });
check(await dele.getByText('Ana já fechou o dia').isVisible(), 'na folha, o que a Ana contou aparece primeiro');
await dele.getByLabel('Uma frase sobre hoje').fill('Montei o berço');
await dele.getByRole('button', { name: 'Fechar o dia' }).click();
await pai.getByRole('status').filter({ hasText: 'Entrou no livro' }).waitFor({ timeout: 10000 });
await pai.waitForTimeout(500);
check((await linha.count()) === 0, 'fechado o dia, o convite sai do Para hoje');

// ---- Compartilhar a semana: a imagem com a marca ----
await mae.goto(BASE);
await mae.evaluate(() => {
  navigator.canShare = () => false;
});
const baixou = mae.waitForEvent('download');
await mae.getByRole('button', { name: 'Compartilhar a semana' }).click();
const arquivo = await baixou;
check(/^tumtum-semana-22\.png$/.test(arquivo.suggestedFilename()), 'sem compartilhar do sistema, a imagem da semana é baixada');
await arquivo.saveAs(`${OUT}valor-cartao-semana.png`);
await mae.getByText('Imagem salva. É só postar').waitFor();
for (let i = 0; i < 20 && (await events('cartao_semana')) === before.semana; i++) await mae.waitForTimeout(200);
check((await events('cartao_semana')) === before.semana + 1, 'o servidor conta o cartão compartilhado');

// ---- O livro impresso: o interesse ----
await mae.getByRole('button', { name: /^Diário/ }).first().click();
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: 'Livro' }).click();
const quero = mae.getByRole('button', { name: 'Quero o livro impresso' });
await quero.waitFor();
await quero.scrollIntoViewIfNeeded();
await mae.locator('section[aria-labelledby="impresso-titulo"]').screenshot({ path: `${OUT}valor-livro-impresso.png` });
await quero.click();
await mae.getByText('Anotado! Vocês vão ser os primeiros a saber').waitFor();
for (let i = 0; i < 20 && (await events('livro_impresso')) === before.livro; i++) await mae.waitForTimeout(200);
check((await events('livro_impresso')) === before.livro + 1, '"Quero o livro impresso" conta o interesse');
await mae.reload();
await mae.getByRole('button', { name: /^Diário/ }).first().click();
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: 'Livro' }).click();
await mae.getByText('Anotado! Vocês vão ser os primeiros a saber').waitFor();
check(true, 'e fica anotado neste aparelho');

// ---- O som do tum-tum pode ser desligado ----
await mae.getByRole('button', { name: /^Abrir nosso espaço/ }).click();
const chave = mae.getByRole('switch', { name: 'Som do tum-tum' });
await chave.scrollIntoViewIfNeeded();
check(await chave.isChecked(), 'o som do tum-tum começa ligado');
await chave.click();
check((await mae.evaluate(() => localStorage.getItem('tumtum:som'))) === 'off' && !(await chave.isChecked()), 'e pode ser desligado em Nosso espaço');

await db.end();
await b.close();
finish();
