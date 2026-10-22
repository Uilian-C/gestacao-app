// "Como o bebê cresce" no Início e a confirmação de que o registro foi salvo.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
// DUM de 22 semanas atrás: a semana de hoje fica entre as fases 20 e 24.
const dum = new Date(Date.now() - (22 * 7 + 2) * 86_400_000).toISOString().slice(0, 10);
await quickAccount(mae, { name: 'Ana', dum });

// ---- Linha do crescimento ----
await mae.getByRole('button', { name: /Ver como o bebê cresce/ }).click();
const sheet = mae.getByRole('dialog', { name: 'Como o bebê cresce' });
await sheet.waitFor();
const linha = sheet.getByRole('list', { name: /Crescimento do bebê/ });
check((await linha.getByRole('listitem').count()) === 11, 'a linha tem as 10 fases e a semana de hoje');
const hoje = linha.getByRole('button', { name: /22 semanas/ });
check(await hoje.getByText('vocês estão aqui').isVisible(), 'a semana de hoje aparece em destaque');
check((await hoje.getAttribute('aria-expanded')) === 'true', 'e já abre mostrando o que acontece nela');
const fase = linha.getByRole('button', { name: /^32 semanas/ });
check(await fase.getByText('Cerca de 42,4 cm · 1,7 kg').isVisible(), 'cada fase mostra tamanho e peso médios');
await fase.click();
check(await fase.getByText(/Medido da cabeça aos pés/).isVisible(), 'tocar numa fase mostra o que acontece e como foi medido');
check(await sheet.getByText(/da cabeça ao bumbum/).first().isVisible(), 'o rodapé explica a diferença entre as medidas');
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
