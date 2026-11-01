// Gêmeos no navegador: o casal marca "Gêmeos" na folha da espera, o bolão
// vira três times (no app e na página aberta), o Início mostra os dois bebês
// e, com o resultado, o caderno pede o nome de cada um.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b, { acceptDownloads: true });
await quickAccount(mae, { name: 'Ana' });
const post = (page, path, body) => page.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);
const code = (await post(mae, '/api/family', { op: 'invite' })).code;
const pai = await phone(b, { colorScheme: 'dark' });
await pai.goto(BASE);
await post(pai, '/api/auth/sign-up/email', { name: 'Caio', email: `caiog${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(pai, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(pai, '/api/family', { op: 'join', code, role: 'pai' });

// ---- São gêmeos ----
await mae.goto(`${BASE}/?espera=1`);
const folha = mae.getByRole('dialog', { name: 'A espera' });
await folha.getByRole('group', { name: 'Quantos bebês' }).getByRole('button', { name: 'Gêmeos 👶👶' }).click();
await folha.getByRole('button', { name: 'Vamos descobrir' }).click();
const palpite = folha.getByRole('group', { name: 'Seu palpite' });
await palpite.getByRole('button', { name: /Um casal/ }).waitFor();
check((await palpite.getByRole('button').count()) === 3, 'marcando gêmeos, o palpite tem três opções');
await palpite.getByRole('button', { name: /Um casal/ }).click();
await palpite.getByRole('button', { name: /Um casal/ }).and(mae.locator('[aria-pressed="true"]')).waitFor();
await post(pai, '/api/data', { op: 'guessSex', guess: 'meninos' });
check(true, 'Ana: um casal; Caio: dois meninos');

// ---- A página aberta, clara e escura ----
const token = (await post(mae, '/api/data', { op: 'bolaoLink' })).data.espera.bolaoToken;
for (const [scheme, name, guess] of [['light', 'Tia Bia', 'Duas meninas'], ['dark', 'Léo', 'Um casal']]) {
  const visita = await phone(b, { colorScheme: scheme });
  await visita.goto(`${BASE}/?palpite=${token}`);
  await visita.getByRole('heading', { name: 'Meninas, meninos ou um casal?' }).waitFor();
  check(await visita.getByText('São gêmeos! 👶👶').isVisible(), `${scheme}: a página aberta pergunta dos gêmeos`);
  await visita.getByLabel('Seu nome').fill(name);
  await visita.getByRole('button', { name: guess, exact: true }).click();
  await visita.getByRole('status', { name: 'Palpite registrado' }).waitFor();
  await visita.waitForTimeout(800);
  await visita.screenshot({ path: `${OUT}gemeos-pagina-${scheme}.png`, fullPage: true });
  check(true, `${scheme}: ${name} vota sem conta (${guess})`);
}

// ---- O placar de três times, claro e escuro ----
await mae.goto(`${BASE}/?espera=1`);
await folha.getByRole('list', { name: 'Time Casal' }).getByText('Léo').waitFor();
check(await folha.getByRole('img', { name: 'Placar: Time Meninas 1, Time Casal 2, Time Meninos 1' }).isVisible(), 'o placar da folha tem três times');
await mae.waitForTimeout(500);
await mae.screenshot({ path: `${OUT}gemeos-folha-light.png` });
// O plano já escolhido vira uma linha com "Mudar"; o placar vem primeiro.
const resumo = folha.getByRole('region', { name: 'Como vai ser a espera' });
check(await resumo.getByText(/Gêmeos · Vão descobrir/).isVisible(), 'com o plano escolhido, a configuração vira uma linha e o placar ganha destaque');
const placarY = (await folha.getByRole('heading', { name: 'O bolão' }).boundingBox()).y;
check(placarY < (await resumo.boundingBox()).y, 'o bolão aparece antes da configuração');
await resumo.getByRole('button', { name: 'Mudar' }).click();
check(await resumo.getByRole('note').getByText(/Quem já votou vê as mudanças/).isVisible(), 'ao mudar, o aviso de que quem votou vê as mudanças');
await resumo.getByRole('group', { name: 'Quantos bebês' }).getByRole('button', { name: 'Um bebê' }).click();
const confirma = resumo.getByRole('alertdialog', { name: 'Mudar a quantidade de bebês' });
await confirma.waitFor();
check(await confirma.getByText(/Os 4 palpites de agora ficam guardados/).isVisible(), 'trocar para um bebê pede confirmação e explica que os palpites ficam guardados');
await confirma.scrollIntoViewIfNeeded();
await mae.screenshot({ path: `${OUT}gemeos-mudar-light.png` });
await confirma.getByRole('button', { name: 'Cancelar' }).click();
check((await folha.getByRole('list', { name: 'Time Casal' }).getByText('Léo').count()) === 1, 'cancelando, nada muda');
await pai.goto(`${BASE}/?espera=1`);
await pai.getByRole('dialog', { name: 'A espera' }).getByRole('list', { name: 'Time Casal' }).waitFor();
await pai.waitForTimeout(500);
await pai.screenshot({ path: `${OUT}gemeos-folha-dark.png` });

// ---- O Início com os dois bebês ----
for (const [page, scheme] of [[mae, 'light'], [pai, 'dark']]) {
  await page.goto(BASE);
  await page.getByText(/Gêmeos · cada um do tamanho/).waitFor();
  await page.screenshot({ path: `${OUT}gemeos-inicio-${scheme}.png` });
}
check(true, 'o Início mostra os dois bebês e o tamanho de cada um');

// ---- É um casal: o nome de cada um ----
await post(mae, '/api/data', { op: 'setSex', sex: 'casal', secret: false });
await post(mae, '/api/data', { op: 'setBabyName', name: 'Helena' });
await mae.goto(BASE);
const voces = mae.locator('section[aria-labelledby="voces-titulo"]');
const cartao = voces.getByRole('button', { name: /É um casal/ });
await cartao.scrollIntoViewIfNeeded();
check(await cartao.isVisible(), 'o Início mostra "É um casal"');
check((await mae.getByRole('dialog', { name: 'Nome escolhido' }).count()) === 0, 'com um nome só, a revelação espera o nome do segundo bebê');
await voces.screenshot({ path: `${OUT}gemeos-casal-light.png` });
await mae.goto(`${BASE}/?espera=1`);
await mae.waitForTimeout(400);
await mae.screenshot({ path: `${OUT}gemeos-resultado-light.png` });
await mae.keyboard.press('Escape');

await post(mae, '/api/data', { op: 'setBabyName', name: 'Theo', which: 2 });
await pai.goto(BASE);
const nome = pai.getByRole('dialog', { name: 'Nome escolhido' });
await nome.getByText('Helena e Theo').first().waitFor();
await pai.waitForTimeout(3500);
await pai.screenshot({ path: `${OUT}gemeos-nomes-dark.png` });
check(true, 'com os dois nomes, a revelação chama os gêmeos de "Helena e Theo"');
await nome.getByRole('button', { name: 'Continuar' }).click();

await b.close();
finish();
