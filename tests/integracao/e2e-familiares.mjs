// Familiares no celular: o casal convida a avó, posta para a família, e ela acompanha e comenta.
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
const tab = (p, name) => p.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();

// ---- A mãe convida a avó em "Nosso espaço" ----
await mae.reload();
await mae.getByRole('button', { name: /Abrir nosso espaço/ }).click();
const familia = mae.getByRole('region', { name: 'Família' });
check(await familia.getByText('5 vagas para familiares').isVisible(), '"Nosso espaço" mostra a família com 5 vagas');
check(!(await mae.getByRole('heading', { name: 'Convidar o(a) parceiro(a)' }).isVisible()), 'com o casal completo, não oferece convite para outro pai ou mãe');
await familia.getByRole('button', { name: 'Convidar alguém da família' }).click();
const link = (await familia.getByText(/\?convite=/).textContent()).trim();
check(link.startsWith(`${BASE}/?convite=`), 'gera o link de convite para a família');
await mae.screenshot({ path: `${OUT}familia-convite.png`, fullPage: true });
await mae.keyboard.press('Escape');

// ---- A avó abre o link, cria a conta e escolhe o parentesco ----
const avo = await phone(b);
await avo.goto(link);
await avo.getByText(/Você recebeu um convite/).waitFor();
await post(avo, '/api/auth/sign-up/email', { name: 'Rosa', email: `rosa${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(avo, '/api/family', { op: 'consent', version: '2026-10-16' });
await avo.reload();
await avo.getByText(/acompanhar a gestação de perto/).waitFor();
check(!(await avo.getByRole('group', { name: 'Seu papel' }).isVisible()), 'convite da família não pergunta se é mãe ou pai');
const entrar = avo.getByRole('button', { name: /Entrar no espaço/ });
check(await entrar.isDisabled(), 'sem o parentesco, ainda não entra');
await avo.getByRole('group', { name: 'Parentesco' }).getByRole('button', { name: 'Avó', exact: true }).click();
await avo.screenshot({ path: `${OUT}familia-entrada.png`, fullPage: true });
await entrar.click();
await avo.getByText('A gestação de Ana e Caio').waitFor();
check(await avo.getByText('Você acompanha como avó').isVisible(), 'a avó entra no Tumtum da família');
check(await avo.getByRole('region', { name: 'Semana do bebê' }).getByText(/semanas/).first().isVisible(), 'vê a semana do bebê');
check(await avo.getByText('Ainda não há posts para a família').isVisible(), 'o Mural da família começa vazio');
check((await avo.getByRole('button', { name: /^(Saúde|Agenda|Diário|Início)/ }).count()) === 0, 'sem as abas do casal (saúde, agenda, diário)');

// ---- A mãe posta para a família e um momento só do casal ----
await mae.reload();
await tab(mae, 'Diário');
const novo = async (texto, quem) => {
  await mae.getByRole('button', { name: 'Registrar', exact: true }).click();
  await mae.getByLabel('O que aconteceu?').fill(texto);
  await mae.getByRole('group', { name: 'Quem vê' }).getByRole('button', { name: quem }).click();
  await mae.getByRole('button', { name: /^Guardar/ }).click();
  await mae.waitForTimeout(1000);
};
await mae.getByRole('button', { name: 'Registrar', exact: true }).click();
check(await mae.getByRole('group', { name: 'Quem vê' }).getByRole('button', { name: 'Família' }).isVisible(), 'com familiares no espaço, o post pode ser para a família');
await mae.keyboard.press('Escape');
await novo('Ouvimos o coração do bebê!', 'Família');
await novo('Só entre nós dois', 'Nós dois');
const postFamilia = mae.getByRole('article', { name: /^Momento de Ana/ }).filter({ hasText: 'Ouvimos o coração' });
check(await postFamilia.getByText(/·\s*família$/).isVisible(), 'no Mural do casal, o post mostra que a família vê');

// ---- A avó vê, abraça e comenta ----
await avo.reload();
const doMural = avo.getByRole('article', { name: /^Momento de Ana/ });
await doMural.first().waitFor();
check((await doMural.count()) === 1 && (await doMural.getByText('Ouvimos o coração do bebê!').isVisible()), 'a avó vê só o post para a família');
await doMural.getByRole('button', { name: 'Mandar um abraço' }).click();
await avo.waitForTimeout(600);
await doMural.getByLabel('Comentar').fill('Que alegria! A vovó já ama você.');
await doMural.getByRole('button', { name: 'Enviar comentário' }).click();
await doMural.getByText('Que alegria!', { exact: false }).waitFor();
check(true, 'a avó manda abraço e comenta');
await avo.screenshot({ path: `${OUT}familia-mural.png`, fullPage: true });

// ---- O casal vê quem comentou ----
await pai.reload();
await tab(pai, 'Diário');
const visto = pai.getByRole('article', { name: /^Momento de Ana/ }).filter({ hasText: 'Ouvimos o coração' });
check(await visto.getByText('Rosa', { exact: true }).isVisible(), 'o pai vê o comentário com o nome da avó');
check(await visto.getByText(/de avó/).isVisible(), 'e o abraço dela');
await pai.screenshot({ path: `${OUT}familia-casal.png`, fullPage: true });

// ---- Perfil da avó ----
await avo.getByRole('button', { name: 'Seu perfil' }).click();
check(await avo.getByLabel('Você é').inputValue() === 'Avó', 'no perfil, o parentesco está lá para ajustar');
check(await avo.getByRole('button', { name: /Sair do espaço/ }).isVisible() && (await avo.getByRole('button', { name: /Excluir minha conta/ }).isVisible()), 'e dá para sair do espaço ou excluir a conta');
await avo.screenshot({ path: `${OUT}familia-perfil.png`, fullPage: true });
await avo.keyboard.press('Escape');

await b.close();
finish();
