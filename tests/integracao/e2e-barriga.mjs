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

const card = p.getByRole('region', { name: 'Barriguinha da semana' });
await card.waitFor();
const week = Number((await card.textContent()).match(/semana (\d+)/)[1]);
check(week > 0, `cartão da barriguinha na semana ${week}`);
check(await card.getByRole('button', { name: 'Tirar foto' }).isVisible(), 'sem a foto da semana, o cartão convida a tirar');

// Ordem: o casal antes da agenda e das tarefas; o guia da semana mais embaixo.
const order = await p.evaluate(() => {
  const at = sel => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : null; };
  return { casal: at('[aria-labelledby="checkin-titulo"]'), barriga: at('[aria-label="Barriguinha da semana"]'), nesta: at('#nesta-semana') };
});
check(order.casal !== null && order.casal < order.barriga && order.barriga < order.nesta, 'cartão do casal → barriguinha → ... → "Nesta semana"');

await card.getByRole('button', { name: 'Tirar foto' }).click();
check((await dlg.getByRole('radio', { name: /Barriguinha/ }).getAttribute('aria-checked')) === 'true', 'o cartão abre o formulário na pasta Barriguinha');
await dlg.getByLabel('Escolher fotos').setInputFiles({ name: 'barriga.png', mimeType: 'image/png', buffer: photo });
await dlg.getByRole('button', { name: 'Tirar esta foto' }).waitFor({ timeout: 15000 });
await dlg.getByRole('button', { name: 'Guardar foto' }).click();
await dlg.waitFor({ state: 'hidden', timeout: 15000 });
await p.getByRole('button', { name: `Barriguinha na semana ${week}: ver` }).waitFor({ timeout: 10000 });
check((await card.getByRole('button', { name: 'Tirar foto' }).count()) === 0, 'com a foto guardada, o convite some e fica a faixa da evolução');
await p.screenshot({ path: `${OUT}inicio-barriga.png`, fullPage: true });

await card.getByRole('button', { name: /Ver a evolução/ }).click();
await p.getByRole('list', { name: 'Fotos da barriga por semana' }).waitFor();
check(true, '"Ver a evolução" abre a pasta Barriguinha no Diário');

await b.close();
finish();
