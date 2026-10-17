// Curtir e comentar entre o casal, e listas editáveis (mala e jornada), no celular.
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
const tab = (p, name) => p.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();

// ---- Mãe guarda um momento; pai manda abraço e comenta ----
await tab(mae, 'Diário');
await mae.getByRole('button', { name: 'Registrar', exact: true }).click();
await mae.getByRole('dialog').getByRole('button', { name: 'Momento' }).click();
await mae.getByLabel('O que aconteceu?').fill('Sentimos o bebê mexer pela primeira vez!');
await mae.getByRole('button', { name: /Guardar momento/ }).click();
await mae.waitForTimeout(1000);

await pai.reload();
await tab(pai, 'Diário');
await pai.getByRole('button', { name: 'Momento: ver detalhes' }).click();
const dlg = pai.getByRole('dialog');
await dlg.getByRole('button', { name: /^Abraço/ }).click();
await pai.waitForTimeout(600);
check((await dlg.getByRole('button', { name: /^Abraço/ }).getAttribute('aria-pressed')) === 'true', 'pai manda um abraço (fica marcado)');
await dlg.getByLabel('Escrever um comentário').fill('Que emoção! ❤️');
await dlg.getByRole('button', { name: 'Enviar comentário' }).click();
await dlg.getByText('Que emoção! ❤️').waitFor();
check(true, 'comentário do pai aparece na conversa');
await pai.screenshot({ path: `${OUT}social-momento.png` });
await pai.keyboard.press('Escape');

await mae.reload();
await tab(mae, 'Diário');
const row = mae.getByRole('button', { name: 'Momento: ver detalhes' });
check((await row.textContent()).includes('1'), 'na lista da mãe, o momento mostra a reação e o comentário');
await row.click();
const dm = mae.getByRole('dialog');
check(await dm.getByText('Que emoção! ❤️').isVisible(), 'mãe vê o comentário do pai');
check((await dm.getByRole('button', { name: /^Abraço/ }).textContent()).includes('1') && (await dm.getByRole('button', { name: /^Abraço/ }).getAttribute('aria-pressed')) === 'false', 'mãe vê "Abraço · 1" (do pai)');
check((await dm.getByRole('button', { name: 'Apagar comentário' }).count()) === 0, 'mãe não pode apagar o comentário do pai');
await mae.keyboard.press('Escape');

// ---- Mala editável ----
await tab(mae, 'Parto');
await mae.getByRole('button', { name: 'Mala', exact: true }).click();
await mae.getByRole('button', { name: 'Adicionar item' }).first().click();
await mae.getByLabel('Novo item').fill('Travesseiro de amamentação');
await mae.getByRole('button', { name: 'Adicionar', exact: true }).click();
await mae.getByText('Travesseiro de amamentação').waitFor();
check(await mae.getByText('de vocês').first().isVisible(), 'item próprio entra na mala, marcado "de vocês"');
await mae.getByRole('button', { name: 'Opções de "Chinelo e roupão"' }).click();
await mae.getByRole('button', { name: 'Não se aplica a nós' }).click();
await mae.waitForTimeout(600);
check(!(await mae.getByText('Chinelo e roupão').isVisible()), 'item da lista padrão some ao ocultar');
await mae.getByText(/^Item oculto/).waitFor({ state: 'hidden', timeout: 10000 });
await mae.getByText('Itens ocultos (1)').click();
await mae.screenshot({ path: `${OUT}social-mala.png`, fullPage: true });
await mae.getByRole('button', { name: 'Mostrar' }).click();
await mae.waitForTimeout(600);
check(await mae.getByText('Chinelo e roupão').isVisible(), '"Mostrar" traz o item de volta');
await mae.getByRole('button', { name: 'Opções de "Travesseiro de amamentação"' }).click();
await mae.getByRole('button', { name: 'Renomear' }).click();
await mae.getByLabel('Novo nome do item').fill('Travesseiro e almofada');
await mae.getByRole('button', { name: 'Salvar', exact: true }).click();
await mae.getByText('Travesseiro e almofada').waitFor();
check(true, 'item próprio renomeado');

// ---- Jornada: item próprio ----
await tab(mae, 'Cuidados');
await mae.getByRole('button', { name: 'Jornada', exact: true }).click();
await mae.getByText('Itens de vocês').scrollIntoViewIfNeeded();
const own = mae.locator('section', { hasText: 'Itens de vocês' });
await own.getByRole('button', { name: 'Adicionar item' }).click();
await own.getByLabel('Novo item').fill('Ecocardiograma fetal');
await own.getByLabel('Semana (opcional)').fill('24');
await own.getByRole('button', { name: 'Adicionar', exact: true }).click();
await own.getByText('Ecocardiograma fetal').waitFor();
check(await own.getByText('semana 24').isVisible(), 'item próprio na jornada, com a semana');
await own.getByRole('button', { name: 'Marcar "Ecocardiograma fetal" como feito' }).click();
await mae.waitForTimeout(800);
check((await own.getByRole('button', { name: 'Desmarcar "Ecocardiograma fetal"' }).count()) === 1, 'item próprio marcado como feito');
await mae.screenshot({ path: `${OUT}social-jornada.png`, fullPage: false });

await b.close();
finish();
