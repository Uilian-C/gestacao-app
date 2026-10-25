// Ajuda: o "Primeiros 7 dias" no "Para hoje" do Início (missões que se marcam sozinhas) e a Central de Ajuda com busca e "Ir para lá".
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p, { name: 'Ana' });
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).status, body);

// A missão do dia é uma linha do "Para hoje"; tocar nela abre o caminho inteiro.
const hoje = p.locator('section[aria-labelledby="hoje-titulo"]');
const row = hoje.getByRole('button', { name: /Primeiros 7 dias/ });
await row.waitFor();
check(await row.getByText('Primeiros 7 dias · 0 de 7').isVisible() && (await row.getByText('Chamar quem vai viver isso com você').isVisible()), 'quem começa vê a missão do dia 1 no "Para hoje"');
await row.click();
const card = p.getByRole('dialog').getByRole('region', { name: 'Primeiros 7 dias com o Tumtum' });
await card.waitFor();
check(await card.getByText('0 de 7').isVisible() && (await card.getByText(/Dia 1 · a missão de hoje/).isVisible()), 'a linha abre os 7 dias, com a missão de hoje');
await p.screenshot({ path: `${OUT}ajuda-7dias.png` });
await p.keyboard.press('Escape');

// As missões se marcam sozinhas quando a ação acontece.
const today = await p.evaluate(() => new Date().toLocaleDateString('en-CA'));
await post({ op: 'checkin', day: today, mood: 'bem' });
await post({ op: 'createEntry', date: today, body: 'Querido bebê, já te amamos.', visibility: 'shared', remindOn: null, folder: 'carta' });
await p.reload();
await row.getByText('Primeiros 7 dias · 2 de 7').waitFor();
check(true, 'o check-in e a carta já contam (2 de 7)');
await row.click();
await card.getByRole('button', { name: 'Ver os 7 dias' }).click();
check(await card.getByRole('list', { name: 'Os 7 dias' }).getByRole('button', { name: /Contar como você está hoje/ }).isDisabled(), 'a lista mostra o que já foi feito');
await p.screenshot({ path: `${OUT}ajuda-7dias-lista.png` });

// Abrir o livro cumpre o dia 7.
await card.getByRole('button', { name: /Abrir o livro de vocês/ }).click();
await p.getByRole('navigation', { name: 'Pastas do diário' }).waitFor();
await p.getByRole('button', { name: /^Início/ }).first().click();
await row.getByText('Primeiros 7 dias · 3 de 7').waitFor();
check(true, 'abrir o livro conta (3 de 7)');

// "Agora não" esconde a missão.
await hoje.getByRole('button', { name: 'Agora não' }).first().click();
await row.waitFor({ state: 'detached' });
check(true, '"Agora não" esconde os primeiros 7 dias');

// ---- Central de Ajuda ----
await p.getByRole('button', { name: 'Ajuda', exact: true }).click();
const ajuda = p.getByRole('dialog', { name: 'Ajuda' });
await ajuda.waitFor();
check((await ajuda.getByRole('region').count()) >= 7, 'a ajuda vem organizada por temas');
await p.screenshot({ path: `${OUT}ajuda-central.png` });
await ajuda.getByRole('button', { name: 'Errei a DUM. Como corrijo?' }).click();
check(await ajuda.getByText(/toque no lápis/).isVisible(), 'tocar na pergunta abre a resposta');
await ajuda.getByLabel('Buscar na ajuda').fill('cha de bebe');
check(await ajuda.getByText(/Como organizo o chá de bebê\?/).isVisible() && (await ajuda.getByText(/Errei a DUM/).count()) === 0, 'a busca encontra sem acentos e esconde o resto');
await p.screenshot({ path: `${OUT}ajuda-busca.png` });
await ajuda.getByRole('button', { name: 'Abrir as Celebrações' }).click();
await ajuda.waitFor({ state: 'detached' });
await p.getByText('Os encontros que vão fazer parte da história de vocês').waitFor();
check(true, '"Ir para lá" leva direto às Celebrações');

// A ajuda reabre os primeiros 7 dias.
await p.getByRole('button', { name: 'Ajuda', exact: true }).click();
await ajuda.getByRole('button', { name: /Primeiros 7 dias com o Tumtum/ }).click();
await row.waitFor();
check(await row.getByText('Primeiros 7 dias · 3 de 7').isVisible(), 'pela ajuda, os primeiros 7 dias voltam ao Início, com o que já foi feito');
check(await p.getByRole('dialog').getByRole('region', { name: 'Primeiros 7 dias com o Tumtum' }).isVisible(), 'e já abrem as missões (mesmo que o cartão do Início não apareça)');
await p.keyboard.press('Escape');

// As novidades das ondas estão na ajuda, e a Jornada do bebê abre direto.
await p.getByRole('button', { name: 'Ajuda', exact: true }).click();
await ajuda.getByLabel('Buscar na ajuda').fill('duas vozes');
check(await ajuda.getByText(/páginas a duas vozes/).isVisible(), 'a ajuda explica as páginas a duas vozes');
await ajuda.getByLabel('Buscar na ajuda').fill('jornada do bebe');
await ajuda.getByRole('button', { name: 'Abrir a Jornada do bebê' }).click();
await p.getByRole('dialog', { name: 'Jornada do bebê' }).waitFor();
check(true, '"Abrir a Jornada do bebê" abre a linha do crescimento');
await p.keyboard.press('Escape');

// Modo escuro.
const escuro = await phone(b, { colorScheme: 'dark' });
await escuro.context().addCookies(await p.context().cookies());
await escuro.goto(p.url());
await escuro.locator('section[aria-labelledby="hoje-titulo"]').getByRole('button', { name: /Primeiros 7 dias/ }).click();
await escuro.getByRole('region', { name: 'Primeiros 7 dias com o Tumtum' }).waitFor();
await escuro.screenshot({ path: `${OUT}ajuda-7dias-escuro.png` });
await escuro.keyboard.press('Escape');
await escuro.getByRole('button', { name: 'Ajuda', exact: true }).click();
await escuro.getByRole('dialog', { name: 'Ajuda' }).waitFor();
await escuro.screenshot({ path: `${OUT}ajuda-central-escuro.png` });

await b.close();
finish();
