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
check(await p.getByRole('button', { name: /O que vocês querem guardar hoje/ }).isVisible(), 'Diário abre no Mural');

// ---- Pelo Mural, a pasta acompanha o texto (nada vem marcado antes) ----
await p.getByRole('button', { name: /O que vocês querem guardar hoje/ }).click();
const novo = p.getByRole('dialog');
const pastas = novo.getByRole('radiogroup', { name: 'Pasta' });
check((await pastas.locator('[aria-checked="true"]').count()) === 0, 'pelo Mural, nenhuma pasta vem marcada antes de escrever');
const campo = novo.getByLabel('O que aconteceu?');
await campo.fill('Hoje me senti cansada, mas feliz');
check((await pastas.getByRole('radio', { name: /Dia a dia/ }).getAttribute('aria-checked')) === 'true' && (await novo.getByRole('button', { name: 'Guardar no dia a dia' }).isVisible()), 'um dia comum vai para o Dia a dia');
await campo.fill('Ouvimos o coração pela primeira vez');
check((await pastas.getByRole('radio', { name: /Momentos/ }).getAttribute('aria-checked')) === 'true' && (await novo.getByText(/Vai para Momentos pelo que você escreveu/).isVisible()), 'uma primeira vez vira Momento, e o formulário diz para onde vai');
await pastas.getByRole('radio', { name: /Ideias/ }).click();
await campo.fill('Hoje me senti cansada');
check((await pastas.getByRole('radio', { name: /Ideias/ }).getAttribute('aria-checked')) === 'true', 'tocar numa pasta fixa a escolha');
await p.screenshot({ path: `${OUT}mural-pasta-automatica.png` });
await p.keyboard.press('Escape');
await folders.getByRole('button', { name: /^Fichário/ }).click();
check((await p.getByText('O que vocês querem lembrar').count()) === 0 && (await p.getByRole('button', { name: 'Abrir a pasta Celebrações' }).isVisible()) && (await p.getByRole('button', { name: 'Abrir a pasta Humor' }).isVisible()), 'o Fichário vai direto às pastas, sem capa (Celebrações e Humor como pastas especiais)');
await p.screenshot({ path: `${OUT}fichario-capa.png`, fullPage: true });

// ---- Barriguinha: foto pelo formulário ----
await p.getByRole('button', { name: 'Abrir a pasta Barriguinha' }).click();
await p.getByRole('button', { name: 'Foto', exact: true }).click();
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
await p.getByRole('button', { name: 'Fichário', exact: true }).first().click();
await p.getByRole('button', { name: 'Abrir a pasta Cartas para o bebê' }).click();
await p.getByRole('button', { name: 'Escrever', exact: true }).click();
await dlg.getByLabel('O que aconteceu?').fill('Querido bebê, hoje você mexeu e o papai sentiu.');
await dlg.getByRole('button', { name: 'Guardar carta' }).click();
await dlg.waitFor({ state: 'hidden', timeout: 10000 });
check(await p.getByRole('button', { name: 'Carta: ver detalhes' }).isVisible(), 'carta aparece na pasta Cartas');
check(await p.getByRole('button', { name: /^Fichário/ }).first().isVisible(), 'a pasta tem o "voltar" para o Fichário');
// Dentro da pasta, ver por mês, semana ou trimestre (o grupo mais novo vem aberto).
await p.getByRole('group', { name: 'Agrupar por' }).getByRole('button', { name: 'Semana' }).click();
check(await p.getByRole('button', { name: /^Semana 22/ }).isVisible() && (await p.getByRole('button', { name: 'Carta: ver detalhes' }).isVisible()), 'na pasta, dá para ver por semana');
await p.getByRole('button', { name: /^Semana 22/ }).click();
check((await p.getByRole('button', { name: 'Carta: ver detalhes' }).count()) === 0, 'e recolher o grupo');
await p.getByRole('group', { name: 'Agrupar por' }).getByRole('button', { name: 'Trimestre' }).click();
check(await p.getByRole('button', { name: /^2º trimestre/ }).isVisible(), 'ou por trimestre');
await p.screenshot({ path: `${OUT}fichario-grupos.png` });

// ---- Mural: tudo junto, a foto grande ----
await folders.getByRole('button', { name: /^Mural/ }).click();
const bellyPost = p.getByRole('article', { name: /^Barriguinha de / });
check(await bellyPost.locator('span', { hasText: /^Semana 22$/ }).first().isVisible(), 'no Mural, a foto da barriga aparece grande, com a semana');
check(await p.getByRole('article', { name: /^Carta de / }).getByText(/papai sentiu/).isVisible(), 'a carta também está no Mural');
await p.screenshot({ path: `${OUT}mural.png`, fullPage: true });

// ---- Capa e Início ----
await folders.getByRole('button', { name: /^Fichário/ }).click();
check((await p.getByRole('button', { name: 'Abrir a pasta Barriguinha' }).textContent()).includes('1 registro'), 'capa mostra a pasta Barriguinha com 1 registro');
check((await p.getByRole('button', { name: /Últimos registros/ }).count()) === 0, 'sem "últimos registros" repetindo o Mural');

// ---- Mural: atalhos de pasta e marcadores de semana ----
await folders.getByRole('button', { name: /^Mural/ }).click();
check(await p.getByText(/^Semana 22/).first().isVisible(), 'o Mural separa por semana da gestação');
await p.getByRole('group', { name: 'Guardar direto numa pasta' }).getByRole('button', { name: /Carta/ }).click();
check((await dlg.getByRole('radio', { name: /Cartas/ }).getAttribute('aria-checked')) === 'true', 'um toque no atalho abre o formulário já na pasta');
await p.keyboard.press('Escape');
await b.close();
finish();
