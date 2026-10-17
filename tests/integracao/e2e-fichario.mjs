// Diário como fichário, no celular: foto da barriga (reduzida no aparelho, com
// miniatura), carta para o bebê, pastas com contagem e a saúde fora do Diário.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p); // DUM 15/05/2026
const api = path => p.evaluate(async path => (await fetch(path)).json(), path);
const dlg = p.getByRole('dialog');
const plus = p.getByRole('button', { name: 'Registrar', exact: true });
const folders = p.getByRole('navigation', { name: 'Pastas do diário' });

// Uma "foto de celular" grande (3000 x 4000), desenhada no navegador.
const photo = Buffer.from(
  await p.evaluate(() => {
    const c = Object.assign(document.createElement('canvas'), { width: 3000, height: 4000 });
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 3000, 4000);
    grad.addColorStop(0, '#f3c1d0');
    grad.addColorStop(1, '#8a6cc9');
    g.fillStyle = grad;
    g.fillRect(0, 0, 3000, 4000);
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(1600, 2200, 800, 0, 7);
    g.fill();
    return c.toDataURL('image/png').split(',')[1];
  }),
  'base64',
);

await p.getByRole('button', { name: /^Diário/ }).first().click();
check(await p.getByText('O que vocês querem lembrar').isVisible(), 'Diário abre na capa do fichário');
check(await p.getByRole('button', { name: /Sintomas, peso e pressão/ }).isVisible(), 'capa aponta para onde foi a saúde');
await p.screenshot({ path: `${OUT}fichario-capa.png`, fullPage: true });

// ---- Barriguinha: foto pelo formulário ----
await folders.getByRole('button', { name: /^Barriguinha/ }).click();
await p.getByRole('button', { name: 'Foto desta semana' }).click();
check((await dlg.getByRole('radio', { name: /Barriguinha/ }).getAttribute('aria-checked')) === 'true', 'formulário abre na pasta Barriguinha');
check(await dlg.getByRole('button', { name: 'Guardar foto' }).isDisabled(), 'sem foto e sem legenda, não guarda');
await dlg.getByLabel('Escolher fotos').setInputFiles({ name: 'barriga.png', mimeType: 'image/png', buffer: photo });
await dlg.getByRole('button', { name: 'Tirar esta foto' }).waitFor({ timeout: 15000 });
check(await dlg.getByRole('button', { name: 'Guardar foto' }).isEnabled(), 'com a foto, já dá para guardar (legenda opcional)');
await p.screenshot({ path: `${OUT}fichario-form-barriga.png` });
await dlg.getByRole('button', { name: 'Guardar foto' }).click();
await dlg.waitFor({ state: 'hidden', timeout: 15000 });
const tile = p.getByRole('button', { name: /^Barriguinha na semana 22/ });
await tile.waitFor({ timeout: 10000 });
check(true, 'foto aparece na grade da semana 22');
const saved = (await api('/api/data')).journal.find(e => e.folder === 'barriga');
check(saved?.photos.length === 1 && saved.photos[0].thumb === true, 'registro guardado com 1 foto e miniatura');
const [full, mini] = await p.evaluate(async id => Promise.all([`/api/fotos?id=${id}`, `/api/fotos?id=${id}&mini=1`].map(async u => (await (await fetch(u)).arrayBuffer()).byteLength)), saved.photos[0].id);
check(full < 3 * 1024 * 1024 && mini < full / 3, `foto reduzida no celular (${Math.round(full / 1024)} KB) e miniatura leve (${Math.round(mini / 1024)} KB)`);
await p.screenshot({ path: `${OUT}fichario-barriga.png`, fullPage: true });

// Detalhe com a foto e tela cheia
await tile.click();
await dlg.getByRole('button', { name: 'Ver foto 1 em tela cheia' }).click();
const viewer = p.getByRole('dialog', { name: /Foto de Barriguinha/ });
check(await viewer.isVisible(), 'foto abre em tela cheia');
await viewer.getByRole('button', { name: 'Fechar' }).click();
await p.keyboard.press('Escape');

// ---- Carta para o bebê ----
await folders.getByRole('button', { name: /^Cartas/ }).click();
await p.getByRole('button', { name: 'Escrever uma carta' }).click();
await dlg.getByLabel('O que aconteceu?').fill('Querido bebê, hoje você mexeu e o papai sentiu.');
await dlg.getByRole('button', { name: 'Guardar carta' }).click();
await dlg.waitFor({ state: 'hidden', timeout: 10000 });
check(await p.getByRole('button', { name: 'Carta: ver detalhes' }).isVisible(), 'carta aparece na pasta Cartas');
check((await folders.getByRole('button', { name: /^Cartas/ }).textContent()).includes('1'), 'aba da pasta mostra a contagem');

// ---- Capa e Início ----
await folders.getByRole('button', { name: /^Fichário/ }).click();
check((await p.getByRole('button', { name: 'Abrir a pasta Barriguinha' }).textContent()).includes('1 registro'), 'capa mostra a pasta Barriguinha com 1 registro');
await p.getByRole('button', { name: /Sintomas, peso e pressão/ }).click();
check((await p.getByRole('button', { name: 'Saúde', exact: true }).getAttribute('aria-pressed')) === 'true' && (await p.getByText('Período').isVisible()), 'atalho leva para Cuidados → Saúde');
await b.close();
finish();
