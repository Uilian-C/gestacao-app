// O livro impresso em pré-venda, no navegador: o cartão no Livro (com quantas
// páginas o livro já teria), montar em 5 passos (modelo, o que entra, capa,
// dedicatória, prévia), reservar, e a família avisando que quer presentear.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
await quickAccount(mae, { name: 'Ana' });
const post = (page, path, body) => page.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);
const iso = n => mae.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
// Uma foto de verdade (JPG) para a capa: um degradê rosado.
const jpg = await mae.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 600; c.height = 800;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 600, 800);
  grad.addColorStop(0, '#ffd6e2'); grad.addColorStop(1, '#b98ae6');
  g.fillStyle = grad; g.fillRect(0, 0, 600, 800);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(300, 420, 170, 0, Math.PI * 2); g.fill();
  return c.toDataURL('image/jpeg', 0.8).split(',')[1];
});
for (const [n, body, folder] of [[-14, 'Ouvimos o coração', 'momento'], [-7, 'Querido bebê, já te amamos', 'carta'], [-1, '', 'barriga'], [0, 'Ele mexeu muito hoje', 'momento']]) {
  const r = await post(mae, '/api/data', { op: 'createEntry', date: await iso(n), body, visibility: 'shared', remindOn: null, folder });
  if (folder === 'barriga') await post(mae, '/api/fotos', { op: 'add', entryId: r.id, data: jpg, thumb: jpg });
}
const code = (await post(mae, '/api/family', { op: 'invite', kind: 'familia' })).code;
const avo = await phone(b, { colorScheme: 'dark' });
await avo.goto(BASE);
await post(avo, '/api/auth/sign-up/email', { name: 'Rosa', email: `rosa${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(avo, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(avo, '/api/family', { op: 'join', code, relation: 'Avó' });

// ---- A família quer presentear ----
await avo.goto(BASE);
const presente = avo.getByRole('region', { name: /impresso/ });
await presente.getByRole('button', { name: /Quero presentear o livro/ }).click();
await presente.getByText(/já sabe que você quer presentear/).waitFor();
check(true, 'a avó avisa que quer presentear o livro');
await presente.scrollIntoViewIfNeeded();
await avo.screenshot({ path: `${OUT}livro-presente-dark.png` });

// ---- No Livro: o convite com as páginas ----
await mae.goto(`${BASE}/?aba=livro`);
const cartao = mae.getByRole('region', { name: 'O livro de vocês, impresso' });
await cartao.waitFor();
check(await cartao.getByText(/Ele já teria \d+ páginas/).isVisible(), 'o cartão conta quantas páginas o livro já teria');
check(await cartao.getByText(/Rosa quer presentear/).isVisible(), 'e mostra que a Rosa quer presentear');
await cartao.scrollIntoViewIfNeeded();
await mae.screenshot({ path: `${OUT}livro-impresso-cartao.png` });

// ---- Montar em 5 passos ----
await cartao.getByRole('button', { name: 'Montar o livro' }).click();
const folha = mae.getByRole('dialog', { name: 'O livro impresso' });
const modelo = folha.getByRole('region', { name: 'Modelo' });
await modelo.waitFor();
check((await modelo.getByRole('button').count()) === 3, 'três modelos: livreto, clássico e caixa');
await mae.screenshot({ path: `${OUT}livro-impresso-modelos.png` });
await modelo.getByRole('button', { name: /Caixa memória/ }).click();
await folha.getByRole('button', { name: /^Continuar/ }).click();
const entra = folha.getByRole('region', { name: 'O que entra' });
await entra.getByLabel('O humor de vocês, mês a mês').uncheck();
await folha.getByRole('button', { name: /^Continuar/ }).click();
const capa = folha.getByRole('region', { name: 'Capa' });
await capa.getByLabel('Título da capa').fill('A espera do nosso bebê');
await capa.getByRole('button', { name: 'Lilás' }).click();
check((await capa.getByRole('group', { name: 'Foto da capa' }).getByRole('button', { name: 'Usar esta foto na capa', pressed: true }).count()) === 1, 'a foto da barriga já vem na capa');
await mae.waitForTimeout(500);
await mae.screenshot({ path: `${OUT}livro-impresso-capa.png` });
await folha.getByRole('button', { name: /^Continuar/ }).click();
await folha.getByLabel(/Uma dedicatória/).fill('Para você, que ainda nem chegou e já mudou tudo.');
await folha.getByRole('button', { name: /^Continuar/ }).click();
const previa = folha.getByRole('region', { name: 'Prévia' });
check(await previa.getByText('Caixa memória · Capa dura em caixa').isVisible() && (await previa.getByText('R$ 349').isVisible()), 'a prévia mostra o modelo, as páginas e o preço de lançamento');
check(await previa.getByText(/Nada é cobrado agora/).isVisible(), 'e diz que nada é cobrado agora');
await mae.waitForTimeout(400);
await mae.screenshot({ path: `${OUT}livro-impresso-previa.png` });
await folha.getByRole('button', { name: 'Reservar meu livro' }).click();
await folha.getByRole('status', { name: 'Livro reservado' }).waitFor();
check(true, 'reservado!');
await mae.screenshot({ path: `${OUT}livro-impresso-reservado.png` });
await folha.getByRole('button', { name: 'Continuar' }).click();

const reservado = mae.getByRole('region', { name: /Caixa memória · \d+ páginas/ });
await reservado.waitFor();
check(await reservado.getByText(/R\$\s349 no preço de lançamento/).isVisible(), 'o Livro mostra a reserva com a capa escolhida');
const salvo = (await mae.evaluate(async () => (await fetch('/api/data')).json())).book.order;
check(salvo.model === 'caixa' && salvo.coverTone === 'lilas' && salvo.include.humor === false && !!salvo.coverPhoto, 'a reserva guardou o modelo, o tom, o que entra e a foto');
await reservado.scrollIntoViewIfNeeded();
await mae.screenshot({ path: `${OUT}livro-impresso-reserva.png` });

await b.close();
finish();
