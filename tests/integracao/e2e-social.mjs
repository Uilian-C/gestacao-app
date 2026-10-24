// Curtir e comentar entre o casal, e listas editáveis (mala e jornada), no celular.
import { BASE, check, finish, launch, OUT, phone, quickAccount, openCare } from './lib.mjs';

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

// ---- Mãe guarda um momento (marcando o pai); pai manda abraço e comenta ----
await mae.reload();
await tab(mae, 'Diário');
await mae.getByRole('button', { name: 'Registrar', exact: true }).click();
await mae.getByLabel('O que aconteceu?').fill('Sentimos o bebê mexer pela primeira vez!');
check(await mae.getByRole('button', { name: 'Câmera' }).isVisible() && (await mae.getByRole('button', { name: 'Galeria' }).isVisible()), 'formulário oferece câmera e galeria');
await mae.getByRole('button', { name: /Marcar Caio/ }).click();
check((await mae.getByLabel('O que aconteceu?').inputValue()) === 'Sentimos o bebê mexer pela primeira vez! @Caio ', '"Marcar Caio" põe @Caio no texto');
await mae.getByRole('button', { name: /Guardar momento/ }).click();
await mae.waitForTimeout(1000);

await pai.reload();
await tab(pai, 'Diário');
// O Diário abre no Mural: o post da mãe, com abraço e comentário ali mesmo.
const postMae = pai.getByRole('article', { name: /^Momento de Ana/ });
check(await postMae.getByText(/Sentimos o bebê mexer pela primeira vez!/).isVisible(), 'pai vê o momento da mãe no Mural');
check(await postMae.getByText('marcou você').isVisible() && (await postMae.locator('strong', { hasText: '@Caio' }).isVisible()), 'o post mostra que marcou o pai, com @Caio em destaque');
await postMae.getByRole('button', { name: 'Mandar um abraço' }).click();
await pai.waitForTimeout(600);
check((await postMae.getByRole('button', { name: 'Tirar o abraço' }).getAttribute('aria-pressed')) === 'true', 'pai manda um abraço pelo Mural (fica marcado)');
await postMae.getByLabel('Comentar').pressSequentially('Que emoção! ❤️ @A');
await postMae.getByRole('button', { name: 'Ana', exact: true }).click();
check((await postMae.getByLabel('Comentar').inputValue()) === 'Que emoção! ❤️ @Ana ', 'digitar "@A" sugere a Ana e completa');
await postMae.getByRole('button', { name: 'Enviar comentário' }).click();
await postMae.getByText(/Que emoção! ❤️/).waitFor();
check((await postMae.getByLabel('Comentar').inputValue()) === '', 'comentário do pai aparece no post e o campo limpa');
await pai.screenshot({ path: `${OUT}mural-pai.png`, fullPage: true });
const cor = page => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c-brand').trim().toLowerCase());
check((await cor(pai)) === '#3f51c6', 'para o pai, o Diário fica azul');
check((await cor(mae)) === '#c93d64', 'para a mãe, continua rosa');

await postMae.getByRole('button', { name: /^Momento de Ana: ver detalhes/ }).click();
const dlg = pai.getByRole('dialog');
check((await dlg.getByRole('button', { name: /^Abraço/ }).getAttribute('aria-pressed')) === 'true', 'nos detalhes, o abraço do pai está marcado');
check(await dlg.getByText(/Que emoção! ❤️/).isVisible(), 'e o comentário está na conversa');
await pai.screenshot({ path: `${OUT}social-momento.png` });
await pai.keyboard.press('Escape');

// ---- Foto de perfil: a mãe põe, o pai vê no Mural ----
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await mae.getByRole('button', { name: /Abrir nosso espaço/ }).click();
await mae.getByLabel('Escolher foto de perfil').setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: PNG });
await mae.getByText('Sua foto de perfil').waitFor();
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
check(await postNoMural.getByText(/Que emoção! ❤️/).isVisible(), 'e o comentário do pai');
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Fichário/ }).click();
const row = mae.getByRole('button', { name: 'Momento: ver detalhes' });
check((await row.textContent()).includes('1'), 'no Fichário, o momento mostra a reação e o comentário');
await row.click();
const dm = mae.getByRole('dialog');
check(await dm.getByText(/Que emoção! ❤️/).isVisible() && (await dm.locator('strong', { hasText: '@Ana' }).isVisible()), 'mãe vê o comentário do pai, com @Ana em destaque');
check((await dm.getByRole('button', { name: /^Abraço/ }).textContent()).includes('1') && (await dm.getByRole('button', { name: /^Abraço/ }).getAttribute('aria-pressed')) === 'false', 'mãe vê "Abraço · 1" (do pai)');
check((await dm.getByRole('button', { name: 'Apagar comentário' }).count()) === 0, 'mãe não pode apagar o comentário do pai');
await mae.keyboard.press('Escape');

// ---- Agenda: quem vai, com nome e foto ----
await tab(pai, 'Agenda');
await pai.getByRole('button', { name: 'Agendar' }).first().click();
const quem = pai.getByRole('group', { name: 'Quem vai' });
check((await quem.getByRole('button', { name: /Os dois/ }).getAttribute('aria-pressed')) === 'true', 'consulta nova: "Quem vai" começa em "os dois"');
check(await quem.getByRole('button', { name: /Ana/ }).isVisible() && (await quem.getByRole('button', { name: /Caio/ }).isVisible()), 'as opções têm o nome de cada um');
await pai.getByRole('button', { name: /Exame/ }).first().click();
check((await quem.getByRole('button', { name: /Ana/ }).getAttribute('aria-pressed')) === 'true', 'exame: começa na mãe (dá para trocar)');
const aviso = pai.getByRole('group', { name: 'Aviso a mais' });
check((await aviso.getByRole('button', { name: 'Só os de sempre' }).getAttribute('aria-pressed')) === 'true', 'agenda: lembrete a mais começa em "só os de sempre"');
await aviso.getByRole('button', { name: '1 h antes' }).click();
check(await pai.getByText(/e mais um 1 h antes/).isVisible(), 'escolher "1 h antes" explica os avisos');
await pai.screenshot({ path: `${OUT}quem-vai.png` });

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

// ---- Jornada: item próprio (Cuidados → Jornada) ----
await openCare(mae, 'Jornada');
await mae.getByRole('button', { name: /^A equipe pediu algo a mais\?/ }).click();
const own = mae.getByRole('region', { name: 'Itens de vocês' });
await own.scrollIntoViewIfNeeded();
await own.getByRole('button', { name: 'Adicionar item' }).click();
await own.getByLabel('Novo item').fill('Ecocardiograma fetal');
await own.getByLabel('Semana (opcional)').fill('24');
await own.getByRole('button', { name: 'Adicionar', exact: true }).click();
const tri2 = mae.getByRole('group', { name: '2º trimestre · Crescimento' });
const eco = tri2.getByRole('button', { name: /^Ecocardiograma fetal:/ });
await eco.waitFor();
check((await eco.textContent()).includes('A partir de'), 'item próprio entra na fase da semana escolhida, com a data');
await eco.click();
const sheet = mae.getByRole('dialog');
check((await sheet.getByRole('region', { name: 'Planejado' }).textContent()).includes('Semana 24'), 'item próprio com a semana planejada');
await sheet.getByRole('button', { name: 'Já fizemos' }).click();
await sheet.getByRole('button', { name: 'Confirmar' }).click();
await mae.waitForTimeout(800);
await sheet.getByRole('button', { name: 'Fechar' }).click();
check((await tri2.getByRole('button', { name: 'Ecocardiograma fetal: feito' }).count()) === 1, 'item próprio marcado como feito');
await mae.screenshot({ path: `${OUT}social-jornada.png`, fullPage: false });

// ---- Nome ----
await mae.getByRole('button', { name: /Abrir nosso espaço/ }).click();
await mae.getByRole('button', { name: 'Editar', exact: true }).click();
await mae.getByLabel('Seu nome').fill('Ana Clara');
await mae.getByRole('button', { name: 'Salvar', exact: true }).click();
await mae.getByText('Ana Clara', { exact: true }).first().waitFor({ timeout: 10000 });
check(true, 'mãe edita o próprio nome');
await mae.keyboard.press('Escape');
await pai.reload();
await pai.getByRole('button', { name: /Abrir nosso espaço/ }).click();
check(await pai.getByText('Ana Clara', { exact: true }).first().isVisible(), 'o pai vê o nome novo');
await pai.keyboard.press('Escape');
await b.close();
finish();
