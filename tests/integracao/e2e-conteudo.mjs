// Conteúdo do app no celular: quem administra (ADMIN_EMAILS) revisa os
// rascunhos, vê a prévia e publica; os casais veem só o publicado (mensagem do
// dia e leituras da semana) e não conseguem editar.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const dumFor = weeks => {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7 - 1);
  return d.toLocaleDateString('en-CA');
};

// ---- Conta de quem administra (o e-mail está em ADMIN_EMAILS nos testes) ----
const adm = await phone(b);
await adm.goto(BASE);
const call = (page, path, body) => page.evaluate(async ([path, body]) => { const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => null) }; }, [path, body]);
await call(adm, '/api/auth/sign-up/email', { name: 'Uil', email: 'admin@exemplo.com', password: 'senha-forte-1' });
await call(adm, '/api/family', { op: 'consent', version: '2026-10-16' });
await call(adm, '/api/family', { op: 'create', role: 'pai' });
await call(adm, '/api/data', { op: 'saveDum', date: dumFor(22) });
await adm.reload();
await adm.getByRole('region', { name: 'Semana da gestação' }).waitFor();
check((await adm.getByRole('region', { name: 'Mensagem do dia' }).count()) === 0, 'sem nada publicado, o Início não mostra a mensagem do dia');

await adm.getByRole('button', { name: /Abrir nosso espaço/ }).click();
await adm.getByRole('button', { name: /Conteúdo do app/ }).click();
const dlg = adm.getByRole('dialog');
await dlg.getByRole('button', { name: /^Rascunhos \(15\)/ }).waitFor({ timeout: 10000 });
check(true, 'os 15 textos iniciais chegam como rascunho para revisão');
await adm.screenshot({ path: `${OUT}conteudo-admin.png` });

// Leitura: prévia e publicar
await dlg.getByRole('button', { name: 'Editar: Os movimentos do bebê' }).click();
await dlg.getByRole('button', { name: 'Ver prévia' }).click();
check(await dlg.getByText(/Se os movimentos diminuírem/).isVisible(), 'a prévia mostra a leitura como o casal vai ver');
await adm.screenshot({ path: `${OUT}conteudo-previa.png` });
await dlg.getByRole('button', { name: 'Voltar a editar' }).click();
await dlg.getByRole('button', { name: 'Publicar', exact: true }).click();
await dlg.getByRole('button', { name: /^Publicados \(1\)/ }).waitFor();
check(true, 'leitura publicada');

// Mensagem: editar o texto e publicar
await dlg.getByRole('button', { name: /^Editar: Cada consulta, cada exame/ }).click();
await dlg.getByLabel('Mensagem').fill('Cada consulta, cada exame e cada abraço contam. Um dia de cada vez.');
await dlg.getByRole('button', { name: 'Publicar', exact: true }).click();
await dlg.getByRole('button', { name: /^Publicados \(2\)/ }).waitFor();
check(true, 'mensagem editada e publicada');
await dlg.getByRole('button', { name: 'Fechar' }).click();

// ---- Um casal comum vê o publicado ----
const casal = await phone(b);
await quickAccount(casal, { dum: dumFor(22) });
const msg = casal.getByRole('region', { name: 'Mensagem do dia' });
await msg.waitFor();
check((await msg.textContent()).includes('Um dia de cada vez.'), 'o casal vê a mensagem do dia publicada (com a edição)');
const reads = casal.getByRole('region', { name: /Leituras da semana/ });
check(await reads.getByRole('button', { name: /Os movimentos do bebê/ }).isVisible(), 'e a leitura da semana');
check((await reads.getByRole('button').count()) === 1, 'rascunhos não aparecem para o casal');
await reads.getByRole('button', { name: /Os movimentos do bebê/ }).click();
await casal.getByRole('dialog').getByText(/Se os movimentos diminuírem/).waitFor();
check(true, 'tocar abre a leitura inteira');
await casal.screenshot({ path: `${OUT}conteudo-leitura.png` });
await casal.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();
await casal.getByRole('button', { name: /Abrir nosso espaço/ }).click();
check((await casal.getByRole('button', { name: /Conteúdo do app/ }).count()) === 0, 'quem não administra não vê a administração');
const denied = await call(casal, '/api/conteudo', { op: 'delete', id: '00000000-0000-0000-0000-000000000000' });
check(denied.status === 403, 'e a API recusa edição de quem não administra');
const list = await casal.evaluate(async () => (await fetch('/api/conteudo')).json());
check(list.items.length === 2 && list.items.every(i => i.status === 'publicado') && list.admin === false, 'a API só entrega o publicado para os casais');

await b.close();
finish();
