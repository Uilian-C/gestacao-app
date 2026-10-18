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
await mae.getByLabel('O que aconteceu?').fill('Sentimos o bebê mexer pela primeira vez!');
await mae.getByRole('button', { name: /Guardar momento/ }).click();
await mae.waitForTimeout(1000);

await pai.reload();
await tab(pai, 'Diário');
// O Diário abre no Mural: o post da mãe, com abraço e comentário ali mesmo.
const postMae = pai.getByRole('article', { name: /^Momento de Ana/ });
check(await postMae.getByText('Sentimos o bebê mexer pela primeira vez!').isVisible(), 'pai vê o momento da mãe no Mural');
await postMae.getByRole('button', { name: 'Mandar um abraço' }).click();
await pai.waitForTimeout(600);
check((await postMae.getByRole('button', { name: 'Tirar o abraço' }).getAttribute('aria-pressed')) === 'true', 'pai manda um abraço pelo Mural (fica marcado)');
await postMae.getByLabel('Comentar').fill('Que emoção! ❤️');
await postMae.getByRole('button', { name: 'Enviar comentário' }).click();
await postMae.getByText('Que emoção! ❤️').waitFor();
check((await postMae.getByLabel('Comentar').inputValue()) === '', 'comentário do pai aparece no post e o campo limpa');
await pai.screenshot({ path: `${OUT}mural-pai.png`, fullPage: true });
const cor = page => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c-brand').trim().toLowerCase());
check((await cor(pai)) === '#3f51c6', 'para o pai, o Diário fica azul');
check((await cor(mae)) === '#c93d64', 'para a mãe, continua rosa');

await postMae.getByRole('button', { name: /^Momento de Ana: ver detalhes/ }).click();
const dlg = pai.getByRole('dialog');
check((await dlg.getByRole('button', { name: /^Abraço/ }).getAttribute('aria-pressed')) === 'true', 'nos detalhes, o abraço do pai está marcado');
check(await dlg.getByText('Que emoção! ❤️').isVisible(), 'e o comentário está na conversa');
await pai.screenshot({ path: `${OUT}social-momento.png` });
await pai.keyboard.press('Escape');

// ---- Foto de perfil: a mãe põe, o pai vê no Mural ----
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await mae.getByRole('button', { name: /Abrir nosso espaço/ }).click();
await mae.getByLabel('Escolher foto de perfil').setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: PNG });
await mae.getByRole('button', { name: 'Trocar foto' }).waitFor();
check(true, 'mãe põe a foto de perfil em "Nosso espaço"');
await mae.keyboard.press('Escape');
await pai.reload();
await tab(pai, 'Diário');
const avatar = pai.getByRole('article', { name: /^Momento de Ana/ }).locator('img[src*="perfil="]').first();
await avatar.waitFor();
check(await avatar.evaluate(img => img.complete && img.naturalWidth > 0), 'pai vê a foto da mãe no post do Mural');

await mae.reload();
await tab(mae, 'Diário');
const postNoMural = mae.getByRole('article', { name: /^Momento de Ana/ });
check(await postNoMural.getByText(/Abraço de pai/).isVisible(), 'no Mural da mãe: "Abraço de pai"');
check(await postNoMural.getByText('Que emoção! ❤️').isVisible(), 'e o comentário do pai');
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Fichário/ }).click();
const row = mae.getByRole('button', { name: 'Momento: ver detalhes' });
check((await row.textContent()).includes('1'), 'no Fichário, o momento mostra a reação e o comentário');
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
