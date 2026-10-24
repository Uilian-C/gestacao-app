// Início no celular: a ordem dos cartões e a barriguinha da semana (convite
// para a foto, foto pelo próprio cartão e a faixa da evolução depois).
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p);
const dlg = p.getByRole('dialog');
const photo = Buffer.from(
  await p.evaluate(() => {
    const c = Object.assign(document.createElement('canvas'), { width: 900, height: 1200 });
    const g = c.getContext('2d');
    g.fillStyle = '#c9b3ea';
    g.fillRect(0, 0, 900, 1200);
    return c.toDataURL('image/png').split(',')[1];
  }),
  'base64',
);

const nesta = p.locator('section[aria-labelledby="nesta-semana"]');
await nesta.waitFor();
const card = nesta.getByRole('button', { name: /^Barriguinha da semana \d+/ });
const week = Number((await card.getAttribute('aria-label')).match(/semana (\d+)/)[1]);
check(week > 0, `cartão da barriguinha na semana ${week}, no carrossel "Nesta semana"`);
check(await card.getByText('Falta a foto desta semana').isVisible(), 'sem a foto da semana, o cartão convida a tirar');

// Ordem das 4 áreas: o bebê, o casal, "Para hoje" e o carrossel.
const order = await p.evaluate(() => {
  const at = sel => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : null; };
  return { bebe: at('[aria-label="Semana da gestação"]'), hoje: at('[aria-labelledby="hoje-titulo"]'), casal: at('[aria-labelledby="checkin-titulo"]'), nesta: at('#nesta-semana') };
});
check(order.bebe < order.casal && order.casal < order.hoje && order.hoje < order.nesta, 'bebê → casal → "Para hoje" → "Nesta semana"');

await card.click();
check((await dlg.getByRole('radio', { name: /Barriguinha/ }).getAttribute('aria-checked')) === 'true', 'o cartão abre o formulário na pasta Barriguinha');
await dlg.getByLabel('Escolher fotos').setInputFiles({ name: 'barriga.png', mimeType: 'image/png', buffer: photo });
await dlg.getByRole('button', { name: 'Tirar esta foto' }).waitFor({ timeout: 15000 });
await dlg.getByRole('button', { name: 'Guardar foto' }).click();
await dlg.waitFor({ state: 'hidden', timeout: 15000 });
await card.getByText('A foto desta semana está guardada').waitFor({ timeout: 10000 });
check(await card.locator('img').count() === 1, 'com a foto guardada, o cartão mostra a foto e conta a evolução');
await p.screenshot({ path: `${OUT}inicio-barriga.png`, fullPage: true });

await card.click();
await p.getByRole('list', { name: 'Fotos da barriga por semana' }).waitFor();
check(true, 'depois da foto, o cartão abre a pasta Barriguinha no Diário');

await b.close();
finish();
