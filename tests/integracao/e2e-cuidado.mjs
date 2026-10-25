// Modo cuidado, para a perda gestacional: a mãe liga em "Nosso espaço"; o
// Início vira acolhimento (sem semana, presente ou contagem), o Parto sai do
// menu, o pai vê o mesmo, a família vê uma mensagem delicada no lugar do bebê
// e desligar devolve tudo como era.
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
const avo = await phone(b);
await avo.goto(BASE);
await post(avo, '/api/auth/sign-up/email', { name: 'Rosa', email: `rosa${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(avo, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(avo, '/api/family', { op: 'join', code: (await post(mae, '/api/family', { op: 'invite', kind: 'familia' })).code, relation: 'Avó' });
await mae.reload();
const menu = mae.locator('nav[aria-label="Seções"]').last();
await menu.getByRole('button', { name: /^Início/ }).waitFor();
check((await menu.getByRole('button', { name: /^Parto/ }).count()) === 1, 'antes, o Parto está no menu');

// ---- A Ajuda leva até o modo cuidado ----
await mae.getByRole('button', { name: 'Ajuda', exact: true }).click();
const ajuda = mae.getByRole('dialog', { name: 'Ajuda' });
await ajuda.getByLabel('Buscar na ajuda').fill('perdemos');
check(await ajuda.getByText(/Perdemos o bebê/).isVisible() && (await ajuda.getByText(/modo cuidado/).first().isVisible()), 'a Ajuda explica o modo cuidado');
await ajuda.getByRole('button', { name: 'Abrir Nosso espaço' }).click();

// ---- Ligar pede confirmação ----
const secao = mae.getByRole('region', { name: 'Modo cuidado' });
await secao.scrollIntoViewIfNeeded();
await secao.getByRole('button', { name: 'Passamos por uma perda' }).click();
check(await secao.getByText(/vale para vocês dois e para a família/).isVisible(), 'antes de ligar, explica e pede confirmação');
await mae.screenshot({ path: `${OUT}cuidado-ligar.png` });
await secao.getByRole('button', { name: 'Ligar o modo cuidado' }).click();
await secao.getByText(/^Ligado desde/).waitFor();
check(true, 'modo cuidado ligado');
await mae.keyboard.press('Escape');

// ---- O Início vira acolhimento ----
await mae.getByRole('heading', { name: 'Estamos aqui com vocês' }).waitFor();
check((await mae.getByRole('region', { name: 'Semana da gestação' }).count()) === 0 && (await mae.getByText('Descoberta de hoje').count()) === 0 && (await mae.getByText(/^Faltam/).count()) === 0, 'sem bebê da semana, descoberta ou contagem');
check((await menu.getByRole('button', { name: /^Parto/ }).count()) === 0, 'o Parto sai do menu');
check((await mae.getByText(/\d+ semanas/).count()) === 0, 'sem semana no cabeçalho');
await mae.waitForTimeout(400);
await mae.screenshot({ path: `${OUT}cuidado-inicio.png`, fullPage: true });
await mae.getByRole('button', { name: /Apoio para os dois/ }).click();
check(await mae.getByRole('link', { name: /CVV · 188/ }).isVisible(), 'apoio com o CVV 188');
await mae.getByRole('button', { name: /Cuidar do corpo agora/ }).click();
check(await mae.getByText(/sangramento forte/).isVisible(), 'sinais para procurar atendimento');
await mae.screenshot({ path: `${OUT}cuidado-apoio.png`, fullPage: true });

// Contar como está: confirma, sem a "resposta do bebê".
const humor = mae.locator('section[aria-labelledby="checkin-titulo"]');
await humor.getByRole('button', { name: 'Cansada' }).click();
const resposta = humor.getByRole('status');
await resposta.getByText(/Registrado/).waitFor();
check((await resposta.locator('svg[viewBox="4 22 192 176"]').count()) === 0, 'o humor confirma sem a resposta do bebê');

// Escrever uma carta abre o diário na pasta Cartas.
await mae.getByRole('button', { name: /Escrever uma carta/ }).click();
check((await mae.getByRole('dialog').getByRole('radio', { name: /Carta/ }).getAttribute('aria-checked')) === 'true', '"Escrever uma carta" abre o registro na pasta Cartas');
await mae.keyboard.press('Escape');

// ---- O pai vê o mesmo; a família, uma mensagem delicada ----
await pai.reload();
await pai.getByRole('heading', { name: 'Estamos aqui com vocês' }).waitFor();
check(true, 'o pai também vê o Início de acolhimento');
await avo.reload();
await avo.getByText('Um momento delicado').waitFor();
check((await avo.getByRole('button', { name: /abrir a jornada/ }).count()) === 0 && (await avo.getByText(/semanas/).count()) === 0, 'a família não vê a semana do bebê');
await avo.screenshot({ path: `${OUT}cuidado-familia.png` });

// ---- Modo escuro ----
await mae.emulateMedia({ colorScheme: 'dark' });
await mae.evaluate(() => window.scrollTo(0, 0));
await mae.waitForTimeout(300);
await mae.screenshot({ path: `${OUT}cuidado-inicio-escuro.png` });

// ---- Desligar devolve tudo ----
await mae.getByRole('button', { name: /Abrir nosso espaço/ }).click();
await secao.getByRole('button', { name: 'Desligar o modo cuidado' }).click();
await secao.getByRole('button', { name: 'Passamos por uma perda' }).waitFor();
await mae.keyboard.press('Escape');
await mae.getByRole('region', { name: 'Semana da gestação' }).waitFor();
check((await menu.getByRole('button', { name: /^Parto/ }).count()) === 1, 'desligado, o Início e o Parto voltam');

await b.close();
finish();
