// Onda 1B do desejo de voltar: a descoberta do dia com um convite para
// registrar, a semana nova que chega embrulhada (e abre com o coração) e o
// "Desde a última vez" quando se volta depois de algumas horas.
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

// ---- A descoberta do dia, com o convite para registrar ----
const descoberta = mae.getByRole('region', { name: 'Descoberta de hoje' });
await descoberta.waitFor();
check((await mae.getByRole('button', { name: /abrir o presente/ }).count()) === 0, 'na primeira visita, a semana não vem embrulhada');
check((await mae.getByText('Desde a última vez').count()) === 0, 'na primeira visita, sem "Desde a última vez"');
await descoberta.getByRole('button').click();
await dlg.waitFor();
check(await dlg.getByLabel('O que aconteceu?').isVisible(), 'o convite da descoberta abre o registro do diário');
await mae.keyboard.press('Escape');

// ---- Volta depois de três dias, com a semana virada e o pai tendo guardado uma lembrança ----
const iso = n => mae.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
await post(pai, '/api/data', { op: 'createEntry', date: await iso(0), body: 'Cantei para você hoje', visibility: 'shared', remindOn: null, folder: 'momento' });
await mae.evaluate(() => {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('tumtum:semana-aberta:')) localStorage.setItem(k, String(Number(localStorage.getItem(k)) - 1));
    if (k.startsWith('tumtum:inicio-visto:')) localStorage.setItem(k, new Date(Date.now() - 3 * 86400000).toISOString());
  }
});
await mae.reload();
const desde = mae.getByRole('status').filter({ hasText: 'Desde a última vez' });
await desde.waitFor({ timeout: 10000 });
check(/o bebê ganhou cerca de \d+ g/.test(await desde.textContent()) && (await desde.getByText('Caio guardou 1 lembrança').isVisible()), '"Desde a última vez" conta o quanto o bebê cresceu e o que o Caio guardou');
const presente = mae.getByRole('button', { name: 'A semana 22 chegou: abrir o presente' });
check((await presente.isVisible()) && (await mae.getByRole('heading', { name: 'Uma semana nova chegou' }).isVisible()), 'a semana nova chega embrulhada no lugar do bebê');
check((await mae.getByText('Descoberta de hoje').count()) === 0, 'embrulhada, a descoberta espera');
await mae.waitForTimeout(400);
await mae.screenshot({ path: `${OUT}presente-embrulhado.png` });

await presente.click();
await mae.getByText(/^Novidade da semana 22:/).waitFor({ timeout: 5000 });
check(await mae.getByRole('button', { name: /^Semana 22 de 40/ }).isVisible(), 'aberto, o bebê aparece');
await mae.waitForTimeout(1200);
await mae.screenshot({ path: `${OUT}presente-aberto.png` });

// ---- Tocar na linha leva ao Mural; ao voltar, ela já foi vista ----
await desde.getByRole('button', { name: /^Desde a última vez/ }).click();
await mae.getByText('Cantei para você hoje').first().waitFor();
check(true, '"Desde a última vez" leva ao Mural');
await mae.getByRole('button', { name: /^Início/ }).first().click();
check((await mae.getByText('Desde a última vez').count()) === 0, 'depois de vista, a linha some');
await mae.reload();
check((await mae.getByRole('button', { name: /abrir o presente/ }).count()) === 0 && (await mae.getByText('Desde a última vez').count()) === 0, 'o presente abre uma vez só por semana');
await mae.getByText('Descoberta de hoje').scrollIntoViewIfNeeded();
await mae.screenshot({ path: `${OUT}presente-descoberta.png` });

// ---- Modo escuro ----
await mae.emulateMedia({ colorScheme: 'dark' });
await mae.evaluate(() => {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('tumtum:semana-aberta:')) localStorage.setItem(k, String(Number(localStorage.getItem(k)) - 1));
    if (k.startsWith('tumtum:inicio-visto:')) localStorage.setItem(k, new Date(Date.now() - 86400000).toISOString());
  }
});
await mae.reload();
await mae.getByRole('button', { name: /abrir o presente/ }).waitFor();
await mae.waitForTimeout(400);
await mae.screenshot({ path: `${OUT}presente-embrulhado-escuro.png` });
await mae.getByRole('button', { name: /abrir o presente/ }).click();
await mae.getByText(/^Novidade da semana 22:/).waitFor();
await mae.waitForTimeout(1200);
await mae.screenshot({ path: `${OUT}presente-aberto-escuro.png` });

await b.close();
finish();
