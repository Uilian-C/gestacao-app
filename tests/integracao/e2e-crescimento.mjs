// O bebê no Início, a "Jornada do bebê" e a confirmação de que o registro foi salvo.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
// DUM de 22 semanas atrás: a semana de hoje fica entre as fases 20 e 24.
const dum = new Date(Date.now() - (22 * 7 + 2) * 86_400_000).toISOString().slice(0, 10);
await quickAccount(mae, { name: 'Ana', dum });

// Uma foto da barriga desta semana: ela aparece na fase certa da linha.
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]).toString('base64');
await mae.evaluate(async jpg => {
  const post = async (path, body) => (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
  const today = new Date().toISOString().slice(0, 10);
  const { id } = await post('/api/data', { op: 'createEntry', date: today, body: '', visibility: 'shared', remindOn: null, folder: 'barriga' });
  await post('/api/fotos', { op: 'add', entryId: id, data: jpg });
}, JPG);
await mae.reload();

// ---- Linha do crescimento ----
// ---- O bebê no Início ----
const topo = mae.getByRole('region', { name: 'Semana da gestação' });
await topo.getByRole('button', { name: /abrir a jornada do bebê/ }).waitFor();
check(await topo.getByRole('button', { name: 'Semana 22 de 40: abrir a jornada do bebê' }).isVisible(), 'o bebê é o centro do Início');
check((await topo.locator('.tt-bebe-eco').count()) === 1, 'e o coração dele pulsa');
check(await topo.getByRole('heading', { name: 'Os primeiros chutinhos' }).isVisible() && (await topo.getByText(/^22 semanas/).isVisible()), 'com a semana e o nome carinhoso da fase');
check(await topo.getByRole('button', { name: /Jornada do bebê.*Próxima fase em 2 semanas: já ouve a voz de vocês/ }).isVisible(), 'o atalho da jornada já conta quando vem a próxima fase');
check((await topo.getByRole('group', { name: 'Escolher semana' }).count()) === 0, 'sem a fileira de números das semanas');
await topo.getByRole('button', { name: 'Próxima semana' }).click();
check(await topo.getByText('Semana 23').isVisible() && (await topo.getByText(/espiando outra semana/).isVisible()) && (await topo.locator('.tt-bebe-eco').count()) === 0, 'as setinhas espiam outra semana (sem pulsar, porque não é hoje)');
await topo.getByRole('button', { name: 'Voltar para hoje' }).click();
check(await topo.getByText(/^22 semanas/).isVisible(), 'e voltam para hoje');
await mae.screenshot({ path: `${OUT}inicio-bebe.png` });

await topo.getByRole('button', { name: /^Jornada do bebê/ }).click();
const sheet = mae.getByRole('dialog', { name: 'Jornada do bebê' });
await sheet.waitFor();
const hoje = sheet.getByRole('region', { name: 'O bebê hoje' });
check(await hoje.getByText('O bebê de Ana').isVisible(), 'em cima, o bebê de quem espera');
check(await hoje.getByText('Os primeiros chutinhos').isVisible() && (await hoje.getByText('55% do caminho').isVisible()), 'com o nome carinhoso da fase e o caminho até o colo');
check(await hoje.getByText('faltam 18 semanas para o colo').isVisible(), 'e quanto falta');
const linha = sheet.getByRole('list', { name: /Crescimento do bebê/ });
check((await sheet.locator('.tt-bebe-eco').count()) === 2 && (await linha.locator('.tt-bebe-eco').count()) === 1, 'pulsam só o coração do topo e o da fase atual');
check((await linha.getByRole('listitem').filter({ hasText: 'Os primeiros chutinhos' }).locator('.tt-bebe-eco').count()) === 1, 'a fase que pulsa é a do bebê agora (20 semanas)');
check((await linha.getByRole('listitem').count()) === 11, 'a linha tem as 10 fases e o marcador de hoje');
check(await linha.getByText('Semana 22 · vocês estão aqui').isVisible(), 'a semana de hoje fica marcada entre as fases');
const fase = linha.getByRole('button', { name: /^32 semanas/ });
check(await fase.getByText('Ganhando dobrinhas').isVisible() && (await fase.getByText('Cerca de 42,4 cm · 1,7 kg').isVisible()), 'cada fase tem um nome carinhoso, tamanho e peso médios');
await fase.click();
check(await fase.getByText(/Medido da cabeça aos pés/).isVisible(), 'tocar numa fase mostra o que acontece e como foi medido');
check(await linha.getByRole('button', { name: 'A barriga de vocês na semana 22: ver' }).isVisible(), 'a foto da barriga do casal aparece na fase dela');
check(await sheet.getByText(/da cabeça ao bumbum/).first().isVisible(), 'o rodapé explica a diferença entre as medidas');
const tons = sheet.getByRole('radiogroup', { name: 'Tom do bebê' });
check((await tons.getByRole('radio', { name: /Neutro/ }).getAttribute('aria-checked')) === 'true', 'o bebê começa neutro, sem cor de pele');
await tons.getByRole('radio', { name: 'Pele tom 4' }).click();
await mae.waitForTimeout(800);
check((await tons.getByRole('radio', { name: 'Pele tom 4' }).getAttribute('aria-checked')) === 'true', 'o casal pode escolher um tom de pele');
const salvo = await mae.evaluate(async () => (await (await fetch('/api/data')).json()).babyTone);
check(salvo === 'tom4', 'e o tom fica salvo para o espaço');
await sheet.getByRole('region', { name: 'O bebê hoje' }).scrollIntoViewIfNeeded();
await mae.screenshot({ path: `${OUT}crescimento-topo.png` });
await linha.getByText('Semana 22 · vocês estão aqui').scrollIntoViewIfNeeded();
await mae.screenshot({ path: `${OUT}crescimento.png` });
await mae.keyboard.press('Escape');

// ---- Salvar: o botão mostra que está salvando e um aviso confirma ----
await mae.getByRole('button', { name: /^Diário/ }).first().click();
await mae.getByRole('button', { name: 'Registrar', exact: true }).click();
await mae.getByLabel('O que aconteceu?').fill('Escolhemos o nome!');
await mae.route('**/api/data', async route => {
  if (route.request().method() === 'POST') await new Promise(r => setTimeout(r, 800));
  await route.continue();
});
await mae.getByRole('button', { name: /Guardar momento/ }).click();
check(await mae.getByRole('button', { name: /Postando\.\.\./ }).isVisible(), 'enquanto salva, o botão diz "Postando..." e fica travado');
await mae.getByText('Postado no Mural').waitFor();
check(true, 'depois, o aviso confirma: "Postado no Mural"');
check(await mae.locator('article[data-fresh]').getByText('Escolhemos o nome!').isVisible(), 'o post novo aparece em destaque no Mural');
await mae.screenshot({ path: `${OUT}salvo.png` });

// ---- Sem conexão: o aviso fica e oferece tentar de novo ----
await mae.unroute('**/api/data');
await mae.route('**/api/data', route => (route.request().method() === 'POST' ? route.abort() : route.continue()));
await mae.getByRole('button', { name: /^Início/ }).first().click();
await mae.getByRole('group', { name: 'Como você está hoje' }).getByRole('button').nth(1).click();
const erro = mae.getByRole('button', { name: 'Tentar de novo' });
await erro.waitFor();
check(true, 'quando falha, o aviso oferece "Tentar de novo"');
await mae.unroute('**/api/data');
await erro.click();
check(await erro.isHidden(), 'tentar de novo some com o aviso e grava');

await b.close();
finish();
