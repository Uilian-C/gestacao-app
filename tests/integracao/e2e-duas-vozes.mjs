// Páginas a duas vozes e o horário dos avisos: a mãe guarda um momento; o pai
// abre pelo link do aviso (/?voz=id), completa com o que sentiu, e a segunda
// voz aparece no Mural, nos detalhes e no livro. Em Nosso espaço, cada um
// escolhe o melhor horário para as novidades.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
await quickAccount(mae, { name: 'Ana' });
const post = (page, path, body) => page.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);
const pai = await phone(b);
await pai.goto(BASE);
await post(pai, '/api/auth/sign-up/email', { name: 'Caio', email: `caio${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(pai, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(pai, '/api/family', { op: 'join', code: (await post(mae, '/api/family', { op: 'invite' })).code, role: 'pai' });
const today = await mae.evaluate(() => new Date().toLocaleDateString('en-CA'));
const { id } = await post(mae, '/api/data', { op: 'createEntry', date: today, body: 'Ouvimos o coração pela primeira vez', visibility: 'shared', remindOn: null, folder: 'momento' });
check(!!id, 'o momento novo volta com o id (o link do aviso usa)');

// ---- O pai abre pelo aviso e completa ----
await pai.goto(`${BASE}/?aba=diario&voz=${id}`);
const dlg = pai.getByRole('dialog');
const voz = dlg.getByRole('region', { name: 'A sua voz' });
await voz.waitFor();
check(await voz.getByText('Ana guardou este momento. E você, o que sentiu?').isVisible(), 'o link do aviso abre o momento no convite para completar');
await voz.getByLabel('O que você sentiu').fill('Eu chorei. Foi o som mais bonito que já ouvi.');
await pai.screenshot({ path: `${OUT}vozes-completar.png` });
await voz.getByRole('button', { name: 'Guardar a minha voz' }).click();
await dlg.getByText('Você completou').waitFor();
check(await dlg.getByText('Eu chorei. Foi o som mais bonito que já ouvi.').isVisible(), 'a segunda voz fica no momento');
check(!new URL(pai.url()).searchParams.has('voz'), 'o link some do endereço depois de usado');
await pai.keyboard.press('Escape');

// ---- A mãe vê as duas vozes no Mural e no livro ----
await mae.reload();
await mae.getByRole('button', { name: /^Diário/ }).first().click();
const card = mae.getByRole('article', { name: /Momento de Ana/ });
await card.getByText('Caio completou').waitFor();
check(await card.getByText(/Eu chorei/).isVisible(), 'no Mural, o momento mostra a voz do Caio');
await card.screenshot({ path: `${OUT}vozes-mural.png` });
const r = await mae.evaluate(async id => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'setVoice', id, body: 'Eu também' }) })).status, id);
check(r === 404, 'quem escreveu não completa o próprio momento');

// ---- O pai vê o convite nos momentos novos da mãe ----
await post(mae, '/api/data', { op: 'createEntry', date: today, body: 'Primeiro enxoval comprado', visibility: 'shared', remindOn: null, folder: 'momento' });
await pai.reload();
await pai.getByRole('button', { name: /^Diário/ }).first().click();
const novo = pai.getByRole('article', { name: /Momento de Ana/ }).filter({ hasText: 'Primeiro enxoval' });
check(await novo.getByRole('button', { name: 'Completar com o que você sentiu' }).isVisible(), 'no Mural, o momento da outra pessoa convida a completar');
await pai.screenshot({ path: `${OUT}vozes-convite.png` });
await pai.emulateMedia({ colorScheme: 'dark' });
await pai.waitForTimeout(300);
await pai.screenshot({ path: `${OUT}vozes-convite-escuro.png` });

// ---- O melhor horário para as novidades ----
await mae.getByRole('button', { name: /Abrir nosso espaço/ }).click();
const horario = mae.getByRole('group', { name: 'Melhor horário para as novidades' });
if (await horario.count()) {
  await horario.getByRole('button', { name: 'Noite' }).click();
  await mae.waitForTimeout(800);
  const saved = await mae.evaluate(async () => (await (await fetch('/api/push')).json()).bestTime);
  check(saved === 'noite', 'o horário escolhido fica guardado');
  await horario.scrollIntoViewIfNeeded();
  await mae.screenshot({ path: `${OUT}vozes-horario.png` });
} else {
  const saved = await post(mae, '/api/push', { op: 'bestTime', value: 'noite' });
  check(saved.bestTime === 'noite', 'o horário escolhido fica guardado (pela API: este navegador não mostra os avisos)');
}

await b.close();
finish();
