// A espera no app: o cartão no Início muda com a jornada do casal; a folha
// cuida do plano, do bolão e do registro; o resultado guardado como surpresa
// vira um envelope para a outra pessoa abrir; a revelação vai para o livro;
// os cartões de compartilhar; e o caderno de nomes com a lista final.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b, { acceptDownloads: true });
await quickAccount(mae, { name: 'Ana' });
const post = (page, path, body) => page.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);
const code = (await post(mae, '/api/family', { op: 'invite' })).code;
const pai = await phone(b, { acceptDownloads: true, colorScheme: 'dark' });
await pai.goto(BASE);
await post(pai, '/api/auth/sign-up/email', { name: 'Caio', email: `caio${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(pai, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(pai, '/api/family', { op: 'join', code, role: 'pai' });
await mae.reload();

const voces = page => page.locator('section[aria-labelledby="voces-titulo"]');
// ---- A pergunta, no Início ----
const cartao = voces(mae).getByRole('button', { name: /^Menino ou menina\?: abrir/ });
await cartao.scrollIntoViewIfNeeded();
check(await cartao.getByText('Já sabem, vão descobrir ou vai ser surpresa?').isVisible(), 'no Início, a espera começa com a pergunta');
await voces(mae).screenshot({ path: `${OUT}espera-pergunta.png` });
await cartao.click();
const folha = mae.getByRole('dialog', { name: 'A espera' });
await folha.getByRole('button', { name: 'Vamos descobrir' }).click();
await folha.getByLabel('Dia do exame ou do ultrassom').fill(await mae.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toLocaleDateString('en-CA'); }));
await folha.getByRole('group', { name: 'Seu palpite' }).getByRole('button', { name: /Menina/ }).click();
await folha.getByRole('group', { name: 'Seu palpite' }).getByRole('button', { name: /Menina/ }).and(mae.locator('[aria-pressed="true"]')).waitFor();
check(true, 'Ana escolhe descobrir, marca o dia e dá o palpite: menina');
await mae.waitForTimeout(400);
await mae.screenshot({ path: `${OUT}espera-folha.png` });

// ---- O cartão de suspense ----
await folha.getByRole('button', { name: 'Compartilhar: menino ou menina?' }).click();
const share = mae.getByRole('dialog', { name: 'Compartilhar' });
await share.getByRole('img', { name: 'Prévia do cartão para compartilhar' }).waitFor();
let d = mae.waitForEvent('download');
await share.getByRole('button', { name: 'Salvar' }).click();
await (await d).saveAs(`${OUT}cartao-espera.png`);
check(true, 'o cartão "Menino ou menina?" sai para os stories');
await mae.keyboard.press('Escape').catch(() => {});
await mae.waitForTimeout(300);

// ---- O palpite do Caio, e a contagem no Início ----
await post(pai, '/api/data', { op: 'guessSex', guess: 'menino' });
await mae.goto(BASE);
const contagem = voces(mae).getByRole('button', { name: /^Faltam 5 dias para saber: abrir/ });
await contagem.scrollIntoViewIfNeeded();
check(await contagem.getByText('Mãe: menina').isVisible() && (await contagem.getByText('Pai: menino').isVisible()), 'o Início mostra a contagem para o exame e os palpites dos dois');
await voces(mae).screenshot({ path: `${OUT}espera-bolao.png` });

// ---- Ana descobre e guarda no envelope para o Caio ----
await contagem.click();
await folha.getByRole('button', { name: /Já descobriram\?/ }).click();
await folha.getByRole('group', { name: 'O resultado' }).getByRole('button', { name: 'Menina' }).click();
check(await folha.getByRole('checkbox').isChecked(), 'guardar como surpresa para o Caio já vem marcado');
await mae.screenshot({ path: `${OUT}espera-registro.png` });
await folha.getByRole('button', { name: 'Guardar no envelope' }).click();
await mae.getByText('Guardado no envelope para Caio 💌').waitFor();
check(true, 'Ana guarda o resultado no envelope');

// ---- O envelope do Caio ----
await pai.goto(BASE);
const envelope = voces(pai).getByRole('button', { name: 'Abrir a revelação: menino ou menina' });
await envelope.scrollIntoViewIfNeeded();
check(await envelope.getByText('Ana guardou: menino ou menina?').isVisible(), 'Caio vê o envelope no Início, sem saber o resultado');
await voces(pai).screenshot({ path: `${OUT}espera-envelope-card.png` });
await envelope.click();
const revelacao = pai.getByRole('dialog', { name: 'A revelação' });
await revelacao.getByRole('button', { name: 'Abrir o envelope' }).waitFor();
await pai.screenshot({ path: `${OUT}espera-envelope.png` });
await revelacao.getByRole('button', { name: 'Abrir o envelope' }).click();
await revelacao.getByText('É menina').waitFor();
check(await revelacao.getByText(/Acertaram o palpite: Ana/).isVisible(), 'aberto: é menina, e quem acertou o palpite');
await pai.waitForTimeout(3300);
await pai.screenshot({ path: `${OUT}espera-revelacao.png` });
d = pai.waitForEvent('download');
await revelacao.getByRole('button', { name: 'Compartilhar' }).click();
const shareP = pai.getByRole('dialog', { name: 'Compartilhar' });
await shareP.getByRole('img', { name: 'Prévia do cartão para compartilhar' }).waitFor();
await shareP.getByRole('button', { name: 'Salvar' }).click();
await (await d).saveAs(`${OUT}cartao-revelacao.png`);
await pai.keyboard.press('Escape');
await revelacao.getByRole('button', { name: 'Guardar no livro e no Mural' }).click();
await pai.getByText('Guardado no livro e no Mural').waitFor();
const dados = await pai.evaluate(async () => (await fetch('/api/data')).json());
check(dados.journal.some(e => e.first_time === 'sexo' && e.body.startsWith('É menina')), 'a revelação vira a primeira vez "Saber se é menino ou menina" no livro');
await revelacao.getByRole('button', { name: 'Continuar' }).click();

// ---- Os nomes: só os de menina, e a lista final ----
for (const [name, forSex] of [['Helena', 'menina'], ['Theo', 'menino'], ['Alice', 'ambos'], ['Cecília', 'menina']]) await post(mae, '/api/data', { op: 'addNameIdea', name, forSex });
await mae.goto(BASE);
const nomes = voces(mae).getByRole('button', { name: /É menina 💗: abrir/ });
await nomes.scrollIntoViewIfNeeded();
await nomes.click();
const caderno = mae.getByRole('dialog', { name: 'O nome do bebê' });
await caderno.getByRole('button', { name: 'Página de Helena: abrir' }).waitFor();
check((await caderno.getByRole('button', { name: 'Página de Theo: abrir' }).count()) === 0, 'sabendo que é menina, o caderno mostra só os nomes que valem');
for (const n of ['Helena', 'Alice', 'Cecília']) {
  await caderno.getByRole('button', { name: `Pôr ${n} na lista final` }).click();
  await caderno.getByRole('button', { name: `Tirar ${n} da lista final` }).waitFor();
}
const final = caderno.locator('section[aria-labelledby="lista-final"]');
check((await final.getByRole('listitem').count()) === 3, 'a lista final com três nomes');
await mae.screenshot({ path: `${OUT}espera-lista-final.png` });
d = mae.waitForEvent('download');
await final.getByRole('button', { name: 'Pedir palpites' }).click();
const shareN = mae.getByRole('dialog', { name: 'Compartilhar' });
await shareN.getByRole('img', { name: 'Prévia do cartão para compartilhar' }).waitFor();
await shareN.getByRole('button', { name: 'Salvar' }).click();
await (await d).saveAs(`${OUT}cartao-finalistas.png`);
check(true, '"Pedir palpites" leva a lista final para os stories');

await b.close();
finish();
