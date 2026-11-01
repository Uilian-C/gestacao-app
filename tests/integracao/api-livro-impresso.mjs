// O livro impresso em pré-venda (migração 038): o casal reserva o modelo, o que
// entra, a capa e a dedicatória; o servidor recalcula o preço; a família avisa
// que quer presentear (e o casal fica sabendo); nada é cobrado.
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client(), avo = client(), outro = client();
async function account(c, name) {
  await c.call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}lv${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
}
await account(ana, 'Ana');
await ana.call('/api/family', { op: 'create', role: 'mae' });
await ana.call('/api/data', { op: 'saveDum', date: '2026-07-01' });
await account(caio, 'Caio');
await caio.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite' })).data.code, role: 'pai' });
await account(avo, 'Rosa');
await avo.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite', kind: 'familia' })).data.code, relation: 'Avó' });
const book = async c => (await c.call('/api/data')).data.book;

check(JSON.stringify(await book(ana)) === JSON.stringify({ order: null, gifts: [] }), 'começa sem reserva e sem presente');

const pedido = { model: 'classico', period: 'tudo', include: { cartas: true, barriga: true, primeiras: true, bolao: true, nomes: true, recados: true, humor: false }, coverTitle: 'O livro de Helena', coverTone: 'lilas', coverPhoto: null, dedication: 'Para você, que já mudou tudo.', pages: 80 };
check((await ana.call('/api/data', { op: 'reserveBook', ...pedido })).status === 200, 'Ana reserva o Clássico');
let b = await book(caio);
check(b.order?.model === 'classico' && b.order.coverTitle === 'O livro de Helena' && b.order.dedication === 'Para você, que já mudou tudo.', 'Caio vê a reserva, a capa e a dedicatória');
check(b.order.pages === 80 && b.order.priceCents === 22900 + 20 * 150, 'o preço é recalculado no servidor (base até 60 páginas + R$ 1,50 por página a mais)');

await ana.call('/api/data', { op: 'reserveBook', ...pedido, model: 'livreto', pages: 90 });
b = await book(ana);
check(b.order.model === 'livreto' && b.order.pages === 48 && b.order.priceCents === 11900, 'mudar para o livreto: até 48 páginas, preço fixo');

await account(outro, 'Zé');
await outro.call('/api/family', { op: 'create', role: 'mae' });
const fotoDeOutro = '00000000-0000-4000-8000-000000000000';
check((await ana.call('/api/data', { op: 'reserveBook', ...pedido, coverPhoto: fotoDeOutro })).status === 400, 'a foto da capa precisa ser deste espaço');
check((await avo.call('/api/data', { op: 'reserveBook', ...pedido })).status === 403, 'só o casal reserva');

// A família quer presentear.
check((await avo.call('/api/data', { op: 'giftBook', on: true })).status === 200, 'a avó avisa que quer presentear');
check((await book(avo)).gifts.some(g => g.mine && g.name === 'Rosa'), 'ela vê que está anotado');
check((await book(ana)).gifts.some(g => g.name === 'Rosa' && !g.mine), 'e o casal vê que a Rosa quer presentear');
await avo.call('/api/data', { op: 'giftBook', on: false });
check((await book(ana)).gifts.length === 0, 'dá para desfazer');

check((await caio.call('/api/data', { op: 'cancelBook' })).status === 200 && (await book(ana)).order === null, 'cancelar a reserva');

finish();
