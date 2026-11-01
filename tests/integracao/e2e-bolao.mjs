// O bolão aberto e o envelope do chá no navegador: o casal manda o link, quem
// não tem conta vota pela página aberta, quem guarda o segredo fecha o
// envelope, o casal abre junto e quem votou vê se acertou.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b, { acceptDownloads: true });
await quickAccount(mae, { name: 'Ana' });
const post = (page, path, body) => page.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);
const code = (await post(mae, '/api/family', { op: 'invite' })).code;
const pai = await phone(b);
await pai.goto(BASE);
await post(pai, '/api/auth/sign-up/email', { name: 'Caio', email: `caio${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(pai, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(pai, '/api/family', { op: 'join', code, role: 'pai' });
await post(mae, '/api/data', { op: 'setSexPlan', plan: 'descobrir', testDate: null });
await post(mae, '/api/data', { op: 'guessSex', guess: 'menina' });

// O compartilhar do celular: guarda o texto que sairia no WhatsApp.
const capture = page => page.addInitScript(() => {
  window.__shared = [];
  navigator.share = async d => void window.__shared.push(d.text ?? d.url);
});
await capture(mae);
await mae.goto(`${BASE}/?espera=1`);
const folha = mae.getByRole('dialog', { name: 'A espera' });
await folha.getByRole('button', { name: 'Chamar mais gente' }).click();
const folhaShare = mae.getByRole('dialog', { name: 'Compartilhar' });
await folhaShare.getByRole('img', { name: 'Prévia do cartão para compartilhar' }).waitFor();
await mae.waitForTimeout(400);
await mae.screenshot({ path: `${OUT}bolao-chamar.png` });
await folhaShare.getByRole('button', { name: 'Mandar só o link' }).click();
await mae.waitForFunction(() => window.__shared.length > 0);
const texto = await mae.evaluate(() => window.__shared[0]);
const link = texto.match(/https?:\/\/\S+\/\?palpite=[\w-]+/)?.[0];
check(!!link && texto.startsWith('Menino ou menina? 💌 Entra no bolão de Ana e Caio'), '"Chamar mais gente" mostra o placar e manda o link do bolão');

// ---- Quem não tem o app vota ----
for (const scheme of ['light', 'dark']) {
  const visita = await phone(b, { colorScheme: scheme });
  await visita.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
  await visita.getByRole('heading', { name: 'Menino ou menina?' }).waitFor();
  check(await visita.getByText(/^Ana e Caio · semana \d+$/).isVisible(), `${scheme}: a página aberta mostra o casal e a semana, sem login`);
  await visita.screenshot({ path: `${OUT}bolao-pagina-${scheme}.png`, fullPage: true });
  if (scheme === 'light') {
    // Sem o nome, o voto não sai: o campo treme e avisa, e nada entra no placar.
    await visita.getByRole('button', { name: 'Time Menina', exact: true }).click();
    await visita.getByText('Escreva seu nome primeiro, para o casal saber que o palpite é seu.').waitFor();
    check((await visita.getByRole('status', { name: 'Palpite registrado' }).count()) === 0, 'sem o nome, o voto não sai e o campo avisa');
    await visita.screenshot({ path: `${OUT}bolao-sem-nome.png`, fullPage: true });
  }
  await visita.getByLabel('Seu nome').fill(scheme === 'light' ? 'Tia Bia' : 'Léo');
  await visita.getByRole('button', { name: scheme === 'light' ? 'Time Menina' : 'Time Menino', exact: true }).click();
  await visita.getByRole('status', { name: 'Palpite registrado' }).waitFor();
  check(await visita.getByText(`${scheme === 'light' ? 'Tia Bia' : 'Léo'}, você é do`).isVisible(), `${scheme}: o registro mostra o selo "Palpite registrado" com o nome`);
  await visita.waitForTimeout(800);
  check(true, `${scheme}: votou sem conta`);
  await visita.screenshot({ path: `${OUT}bolao-votou-${scheme}.png`, fullPage: true });
  if (scheme === 'dark') {
    // Sair do bolão (com confirmação) e voltar.
    await visita.getByRole('button', { name: 'Sair do bolão' }).click();
    await visita.getByRole('button', { name: 'Sim, sair do bolão' }).click();
    await visita.getByRole('heading', { name: 'Dê o seu palpite' }).waitFor();
    check((await visita.getByRole('list', { name: 'Time Menino' }).getByText('Léo').count()) === 0, 'quem sai do bolão some do placar');
    await visita.getByRole('button', { name: 'Time Menino', exact: true }).click();
    await visita.getByRole('status', { name: 'Palpite registrado' }).waitFor();
  }
  if (scheme === 'light') globalThis.bia = visita;
}
await mae.reload();
await mae.goto(`${BASE}/?espera=1`);
await folha.getByRole('list', { name: 'Time Menina' }).getByText('Tia Bia').waitFor();
check(await folha.getByRole('list', { name: 'Time Menino' }).getByText('Léo').isVisible(), 'o casal vê os dois times, com quem votou pelo link');
check(await folha.getByText(/Léo entrou para o Time Menino/).isVisible(), 'e quem entrou por último');
await mae.waitForTimeout(800);
await mae.screenshot({ path: `${OUT}bolao-folha.png` });
// O cartão do placar, com os times.
await folha.getByRole('button', { name: 'Chamar mais gente' }).click();
await folhaShare.getByRole('img', { name: 'Prévia do cartão para compartilhar' }).waitFor();
const dPlacar = mae.waitForEvent('download');
await folhaShare.getByRole('button', { name: 'Salvar' }).click();
await (await dPlacar).saveAs(`${OUT}cartao-placar.png`);
await folhaShare.waitFor({ state: 'hidden' });

// ---- O envelope do chá ----
await folha.getByRole('button', { name: /Já descobriram\?/ }).click();
await folha.getByRole('button', { name: 'Enviar o envelope do chá' }).click();
await mae.waitForFunction(() => window.__shared.some(t => t.includes('envelope=')));
const envelope = (await mae.evaluate(() => window.__shared.find(t => t.includes('envelope=')))).match(/https?:\/\/\S+\/\?envelope=[\w-]+/)?.[0];
check(!!envelope, 'o link do envelope sai para quem vai guardar o segredo');
const madrinha = await phone(b);
await madrinha.goto(envelope.replace(/^https?:\/\/[^/]+/, BASE));
await madrinha.getByRole('heading', { name: /Ana e Caio confiaram a você o segredo/ }).waitFor();
await madrinha.getByRole('button', { name: 'É menina' }).click();
await madrinha.getByRole('checkbox').check();
await madrinha.screenshot({ path: `${OUT}bolao-envelope-pagina.png`, fullPage: true });
await madrinha.getByRole('button', { name: 'Fechar o envelope' }).click();
await madrinha.getByRole('heading', { name: 'Envelope fechado 💌' }).waitFor();
check(true, 'quem guarda o segredo fecha o envelope');

// ---- O casal abre, junto ----
await mae.goto(BASE);
const card = mae.locator('section[aria-labelledby="voces-titulo"]').getByRole('button', { name: 'Abrir a revelação: menino ou menina' });
await card.scrollIntoViewIfNeeded();
check(await card.getByText('O envelope está guardado: menino ou menina?').isVisible(), 'no Início, o envelope do chá espera os dois');
await mae.locator('section[aria-labelledby="voces-titulo"]').screenshot({ path: `${OUT}bolao-envelope-card.png` });
await card.click();
const rev = mae.getByRole('dialog', { name: 'A revelação' });
await rev.getByRole('button', { name: 'Abrir o envelope' }).click();
await rev.getByText('É menina').waitFor();
check(await rev.getByText(/Acertaram o palpite: .*Tia Bia/).isVisible(), 'aberto no chá: é menina, e quem acertou (inclusive quem votou pelo link)');

// ---- Quem votou volta e vê se acertou ----
await globalThis.bia.reload();
await globalThis.bia.getByText('Tia Bia, você acertou o palpite! 🎉').waitFor();
await globalThis.bia.waitForTimeout(2800);
await globalThis.bia.screenshot({ path: `${OUT}bolao-acertou.png`, fullPage: true });
check(true, 'a Tia Bia abre o link de novo e vê que acertou');

// O formato antigo do link (/palpite/…) também abre.
const antigo = await phone(b);
await antigo.goto(`${BASE}/palpite/${link.split('palpite=')[1]}`);
await antigo.getByRole('heading', { name: 'É menina!' }).waitFor();
check(true, 'o link no formato /palpite/… também abre');

await b.close();
finish();
