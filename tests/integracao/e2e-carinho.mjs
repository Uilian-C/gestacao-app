// Onda 1 do desejo de voltar: o Registrar do Início começa no afeto, o humor
// ganha a resposta do bebê, a lembrança nova "entra no livro", o sintoma
// devolve uma dica e o padrão, e o menu do Diário bate quando o outro posta.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

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
await mae.reload();
const dlg = mae.getByRole('dialog');

// ---- O Registrar do Início abre no momento (afeto primeiro) ----
await mae.getByRole('button', { name: 'Registrar', exact: true }).click();
const first = dlg.getByRole('group', { name: 'Tipo de registro' }).getByRole('button').first();
check((await first.getAttribute('aria-label')).startsWith('Diário'), 'no Início, o Registrar oferece primeiro o momento (afeto primeiro)');
await first.click();

// ---- Guardar: "Entrou no livro" no lugar de um "Salvo" ----
await dlg.getByLabel('O que aconteceu?').fill('Ouvimos o coração pela primeira vez!');
await dlg.getByRole('button', { name: /^Guardar|^Postar/ }).click();
const carimbo = mae.getByRole('status').filter({ hasText: 'Entrou no livro' });
await carimbo.waitFor({ timeout: 10000 });
check(await carimbo.getByText('“Ouvimos o coração pela primeira vez!”').isVisible() && (await carimbo.getByText(/^Capítulo \d+ · /).isVisible()), 'a lembrança nova entra no livro, com o capítulo');
await mae.waitForTimeout(1200);
await mae.screenshot({ path: `${OUT}carinho-livro.png` });
await carimbo.getByRole('button', { name: 'Ver no livro' }).click();
await mae.getByRole('button', { name: /^Ler a página nova|^Continuar|^Abrir o livro/ }).waitFor();
check(true, '"Ver no livro" leva ao Livro');

// ---- O humor ganha a resposta do bebê ----
await mae.getByRole('button', { name: /^Início/ }).first().click();
const card = mae.locator('section[aria-labelledby="checkin-titulo"]');
await card.getByRole('button', { name: 'Cansada' }).click();
const resposta = card.getByRole('status');
await resposta.getByText('Registrado. Caio vai ver.').waitFor({ timeout: 10000 });
check(/descans|pausa|ajuda|cresc/i.test(await resposta.textContent()), 'depois do humor, o bebê responde com uma frase do dia');
await mae.waitForTimeout(1200);
await mae.screenshot({ path: `${OUT}carinho-humor.png` });

// ---- O sintoma devolve a dica e o padrão ----
const iso = n => mae.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
await post(mae, '/api/data', { op: 'createSymptom', week: 22, date: await iso(-2), name: 'Azia', intensity: 2, category: 'Digestivo', notes: '', timeOfDay: 'noite' });
await mae.reload();
await mae.getByRole('button', { name: /^Cuidados/ }).first().click();
await mae.getByRole('button', { name: 'Registrar', exact: true }).click();
await dlg.getByRole('button', { name: /^Sintoma:/ }).click();
await dlg.getByPlaceholder(/sentindo/).fill('Azia');
await dlg.getByRole('button', { name: /^3:/ }).click();
await dlg.getByRole('button', { name: /^Salvar sintoma/ }).click();
const eco = mae.getByRole('status').filter({ hasText: 'Azia · registrado' });
await eco.waitFor({ timeout: 10000 });
check(await eco.getByText(/Apareceu 2 vezes nesta semana/).isVisible() && (await eco.getByText(/jantar mais cedo/).isVisible()), 'o sintoma devolve o padrão da semana e o que costuma ajudar');
await mae.waitForTimeout(1200);
await mae.screenshot({ path: `${OUT}carinho-sintoma.png` });

// ---- O pai posta: o menu Diário da mãe bate ----
await post(pai, '/api/data', { op: 'createEntry', date: await iso(0), body: 'Senti você mexer!', visibility: 'shared', remindOn: null, folder: 'momento' });
await mae.getByRole('button', { name: /^Início/ }).first().click();
await mae.reload();
const menu = mae.locator('nav[aria-label="Seções"]').last();
await menu.locator('.tt-menu-batida').waitFor({ timeout: 10000 });
check((await menu.locator('.tt-menu-batida').count()) === 1 && (await menu.getByLabel('novidades').count()) === 1, 'o pai postou: o coração do menu Diário bate, com um pontinho');
await menu.screenshot({ path: `${OUT}carinho-menu.png` });
await menu.getByRole('button', { name: /^Diário/ }).click();
await mae.getByRole('button', { name: /^Início/ }).first().click();
check((await menu.locator('.tt-menu-batida').count()) === 0, 'depois de ver o Diário, o menu sossega');

await b.close();
finish();
