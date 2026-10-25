// As primeiras vezes e a sequência gentil: o álbum no Fichário (com a
// descoberta já marcada), guardar "Ouvir o coração" vira uma página especial;
// quem volta depois de dias é recebido com carinho; dias seguidos contando um
// ao outro aparecem no humor e a semana inteira ganha um coração no livro.
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
const iso = n => mae.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const dlg = mae.getByRole('dialog');

// ---- O álbum das primeiras vezes ----
await mae.reload();
await mae.getByRole('button', { name: /^Diário/ }).first().click();
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Fichário/ }).click();
const pasta = mae.getByRole('button', { name: 'Abrir o álbum das primeiras vezes' });
check(await pasta.getByText(/^1 de 12/).isVisible(), 'o álbum começa com a descoberta marcada (1 de 12)');
await pasta.click();
await dlg.getByRole('list', { name: 'As primeiras vezes' }).waitFor();
await mae.screenshot({ path: `${OUT}primeiras-album.png` });
await dlg.getByRole('button', { name: 'Ouvir o coração: guardar' }).click();
await dlg.getByLabel('O que aconteceu?').waitFor();
check((await dlg.getByLabel('O que aconteceu?').inputValue()) === 'Ouvimos o coração pela primeira vez', 'guardar abre o diário já com o começo da frase');
await dlg.getByLabel('O que aconteceu?').fill('Ouvimos o coração pela primeira vez. Parecia um cavalinho!');
await dlg.getByRole('button', { name: /^Guardar|^Postar/ }).click();
const carimbo = mae.getByRole('status').filter({ hasText: 'Entrou no livro' });
await carimbo.waitFor();
check(await carimbo.getByText('Primeira vez: ouvir o coração · uma página especial no livro').isVisible(), 'o carimbo conta que é uma primeira vez');
await carimbo.waitFor({ state: 'hidden', timeout: 10000 });
check(await pasta.getByText(/^2 de 12/).isVisible(), 'o álbum passa para 2 de 12');
await pasta.click();
check(await dlg.getByRole('button', { name: 'Ouvir o coração: abrir a lembrança' }).isVisible(), 'a primeira vez guardada vira um cartão cheio, que abre a lembrança');
await mae.keyboard.press('Escape');
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Mural/ }).click();
check(await mae.getByText('Primeira vez · Ouvir o coração').first().isVisible(), 'no Mural, o selo de primeira vez');

// ---- Quem volta depois de dias: "Que bom ver você de novo" ----
for (let n = -10; n <= 0; n++) await post(mae, '/api/data', { op: 'checkin', day: await iso(n), mood: 'bem' });
for (let n = -10; n <= -4; n++) await post(pai, '/api/data', { op: 'checkin', day: await iso(n), mood: 'bem' });
await pai.reload();
const humorPai = pai.locator('section[aria-labelledby="checkin-titulo"]');
await humorPai.getByRole('button', { name: 'Bem', exact: true }).click();
await humorPai.getByText(/Que bom ver você de novo/).waitFor();
check(true, 'quem volta depois de dias é recebido com "Que bom ver você de novo"');

// ---- Dias seguidos e o coração no livro ----
for (let n = -3; n <= -1; n++) await post(pai, '/api/data', { op: 'checkin', day: await iso(n), mood: 'bem' });
await mae.getByRole('button', { name: /^Início/ }).first().click();
await mae.reload();
const humor = mae.locator('section[aria-labelledby="checkin-titulo"]');
await humor.getByText(/11 dias seguidos contando um para o outro/).waitFor();
check(true, 'o humor mostra os dias seguidos dos dois');
await humor.evaluate(el => el.scrollIntoView({ block: 'center' }));
await mae.waitForTimeout(300);
await mae.screenshot({ path: `${OUT}primeiras-sequencia.png` });
await mae.getByRole('button', { name: /^Diário/ }).first().click();
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Livro/ }).click();
await mae.getByRole('button', { name: /^Ler a página nova|^Continuar|^Abrir o livro/ }).first().click();
const coracao = mae.getByText('Uma semana inteira contando um ao outro como estavam.');
// O livro abre na página mais nova: procura para trás e, se não achar, para a frente.
for (const dir of ['Página anterior', 'Próxima página']) {
  const btn = mae.getByRole('button', { name: dir });
  for (let i = 0; i < 12 && !(await coracao.first().isVisible()) && (await btn.isEnabled()); i++) {
    await btn.click();
    await mae.waitForTimeout(450);
  }
}
check(await coracao.first().isVisible(), 'a semana inteira dos dois ganha o coração no livro');
await mae.screenshot({ path: `${OUT}primeiras-livro.png` });

await mae.emulateMedia({ colorScheme: 'dark' });
await mae.keyboard.press('Escape');
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Fichário/ }).click();
await pasta.click();
await mae.waitForTimeout(300);
await mae.screenshot({ path: `${OUT}primeiras-album-escuro.png` });

await b.close();
finish();
