// Ondas 1 e 2 da revisão: o Início mais curto (o livro desta semana num cartão
// só, o compartilhar como ícone, sem a linha repetida do parceiro), o Diário em
// duas partes (Livro, com as pastas dentro, e Mural), as reações compactas, a
// ajuda no "Nosso espaço" e o tum-tum que se vê.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
await quickAccount(mae, { name: 'Ana' });
const post = (page, path, body) => page.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);
const code = (await post(mae, '/api/family', { op: 'invite' })).code;
const pai = await phone(b, { colorScheme: 'dark' });
await pai.goto(BASE);
await post(pai, '/api/auth/sign-up/email', { name: 'Caio', email: `caio${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(pai, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(pai, '/api/family', { op: 'join', code, role: 'pai' });
const today = await mae.evaluate(() => new Date().toLocaleDateString('en-CA'));
await post(mae, '/api/data', { op: 'createEntry', date: today, body: 'Hoje ele mexeu depois do almoço', visibility: 'shared', folder: 'momento' });
await post(pai, '/api/data', { op: 'checkin', day: today, mood: 'bem' });
await mae.reload();

// ---- Início ----
const topo = mae.getByRole('region', { name: 'Semana da gestação' });
await topo.waitFor();
check(await topo.getByRole('button', { name: 'Compartilhar a semana' }).isVisible(), 'compartilhar a semana vira um ícone ao lado dos dias');
check((await mae.getByText(/já passou por aqui hoje/).count()) === 0, 'sem a linha repetida "Caio já passou por aqui" (o humor do Caio já está no cartão)');
check((await mae.getByRole('region', { name: 'Descoberta de hoje' }).getByRole('button').count()) === 0, 'a descoberta do dia não traz mais um convite próprio');
const voces = mae.locator('section[aria-labelledby="voces-titulo"]');
await voces.scrollIntoViewIfNeeded();
check(await voces.getByRole('button', { name: /^A última lembrança: Hoje ele mexeu/ }).isVisible(), 'a última lembrança fica no cartão do livro');
const convite = voces.getByRole('button', { name: /^Barriguinha da semana|Contar como foi o dia|Escrever uma carta|Guardar um momento/ });
check((await convite.count()) >= 1, 'o convite do dia (escrever ou a foto da barriga) mora no mesmo cartão');
await mae.screenshot({ path: `${OUT}respirar-inicio-light.png`, fullPage: true });
await pai.reload();
await pai.getByRole('region', { name: 'Semana da gestação' }).waitFor();
await pai.waitForTimeout(500);
await pai.screenshot({ path: `${OUT}respirar-inicio-dark.png`, fullPage: true });

// ---- O tum-tum que se vê ----
const abraco = mae.getByRole('button', { name: /Mandar um abraço/ }).first();
await abraco.scrollIntoViewIfNeeded();
await abraco.click();
await mae.locator('[data-tumtum]').first().waitFor({ state: 'attached', timeout: 4000 });
await mae.waitForTimeout(180);
await mae.screenshot({ path: `${OUT}respirar-tumtum.png` });
check(true, 'o abraço faz o tum-tum aparecer onde a pessoa tocou');
await mae.locator('[data-tumtum]').first().waitFor({ state: 'detached', timeout: 4000 });
check(true, 'e ele some sozinho em menos de um segundo e meio');

// ---- Diário: Livro (com as pastas) e Mural ----
await mae.getByRole('navigation', { name: 'Seções' }).last().getByRole('button', { name: /^Diário/ }).click();
const partes = mae.getByRole('group', { name: 'Parte do diário' });
await partes.waitFor();
check((await partes.getByRole('button').count()) === 2 && (await partes.getByRole('button', { name: 'Fichário' }).count()) === 0, 'o Diário tem duas partes: Livro e Mural');
check((await partes.getByRole('button', { name: 'Mural' }).getAttribute('aria-pressed')) === 'true', 'logo depois de postar, o Diário abre no Mural (o post novo em destaque)');
await partes.getByRole('button', { name: 'Livro' }).click();
const pastas = mae.getByRole('region', { name: 'As pastas' });
check(await pastas.getByRole('button', { name: 'Abrir a pasta Momentos' }).isVisible(), 'as pastas do fichário moram dentro do livro');
check(await mae.getByText(/1 página escrita/).isVisible(), 'a capa conta as páginas escritas');
await mae.screenshot({ path: `${OUT}respirar-livro-light.png`, fullPage: true });
await pastas.getByRole('button', { name: 'Abrir a pasta Momentos' }).click();
await mae.getByRole('button', { name: 'Livro', exact: true }).last().click();
await pastas.waitFor();
check(true, 'voltar da pasta leva ao livro');
await partes.getByRole('button', { name: 'Mural' }).click();
const postMural = mae.getByRole('article').first();
await postMural.waitFor();
check(await postMural.getByRole('button', { name: 'Mandar um abraço' }).isVisible() && (await postMural.getByRole('button', { name: 'Comentar' }).isVisible()), 'no mural, abraço e comentário viram ícones');
check((await postMural.getByText('Abraço', { exact: true }).count()) === 0, 'sem as palavras "Abraço · Comentar" em cada post');
await mae.screenshot({ path: `${OUT}respirar-mural-light.png` });

// ---- Ajuda no "Nosso espaço" ----
await mae.getByRole('button', { name: /^Abrir nosso espaço/ }).click();
const ajuda = mae.getByRole('dialog').getByRole('button', { name: /^Ajuda/ });
await ajuda.waitFor();
await ajuda.click();
await mae.getByRole('dialog', { name: 'Ajuda' }).waitFor();
check(true, 'a ajuda também mora no "Nosso espaço"');

await b.close();
finish();
